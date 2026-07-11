// Push notifications via Expo Push Service.
//
// Flow:
//   1. App calls registerForPushNotifications() once after sign-in.
//   2. We ask the OS for permission, get an ExponentPushToken[...] string,
//      and upsert it into the `push_tokens` table.
//   3. The Postgres trigger send_push_notification() (migration 008) fires
//      whenever a row is inserted into `notifications` — it calls Expo's
//      push API for every token belonging to that user.
//   4. The OS delivers the push. When the user taps it,
//      handleNotificationTap() routes them to the right screen.
//
// Every step logs via `log(...)` so you can `adb logcat -s ReactNativeJS`
// (or watch Metro) to see exactly where the chain breaks.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { navigationRef } from './navigation';
import { supabase } from './supabase';

const log = (...args) => console.log('[push]', ...args);
const warn = (...args) => console.warn('[push]', ...args);

// Foreground handler: how a notification looks when it arrives while the app
// is open. (Background/killed delivery is handled entirely by the OS.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Ask for permission, fetch an Expo push token, store it on the user's row.
 * Safe to call multiple times — the upsert keeps a single row per token.
 *
 * Returns the token string or null if anything went wrong.
 */
export async function registerForPushNotifications() {
  log('register: start', { platform: Platform.OS, isDevice: Device.isDevice });

  if (!Device.isDevice) {
    warn('register: skipping — simulators and the web preview cannot receive real pushes');
    return null;
  }

  // Android channel — must exist before any notification can render with our
  // chosen importance / vibration / color. Channels do NOT need permission.
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2C097F',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      log('register: android channel "default" ready');
    } catch (err) {
      warn('register: failed to create channel:', err?.message);
    }
  }

  // Permission. On iOS the OS shows its own prompt and the answer is final
  // (user can only change it from Settings afterwards). On Android 13+ this
  // shows the runtime POST_NOTIFICATIONS dialog; older Android auto-grants.
  const existing = await Notifications.getPermissionsAsync();
  log('register: existing permission =', existing.status);

  let status = existing.status;
  if (status !== 'granted') {
    log('register: requesting permission…');
    const next = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        // No critical alerts — those need a special Apple entitlement.
      },
    });
    status = next.status;
    log('register: permission after request =', status);
  }

  if (status !== 'granted') {
    warn('register: user denied or blocked notification permission — bailing');
    return null;
  }

  // Project ID — required by Expo to mint a token. Lives in app.json under
  // extra.eas.projectId; EAS Build also writes it to Constants.easConfig.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  log('register: projectId =', projectId);
  if (!projectId) {
    warn('register: no projectId — token cannot be minted. Fix app.json extra.eas.projectId.');
    return null;
  }

  let token;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    token = res.data;
    log('register: got token =', token);
  } catch (err) {
    warn('register: getExpoPushTokenAsync failed:', err?.message, err);
    return null;
  }

  // Persist for the current user. The send_push_notification trigger reads
  // this table to find devices to push to.
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    warn('register: failed to read current user:', authErr.message);
    return token;
  }
  if (!user) {
    warn('register: no signed-in user — token NOT saved to DB');
    return token;
  }

  const { error: upsertErr } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform: Platform.OS,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );
  if (upsertErr) {
    warn('register: upsert into push_tokens failed:', upsertErr.message);
    return token;
  }
  log('register: token saved to push_tokens for user', user.id);

  return token;
}

/**
 * Subscribe to push events. Call once near app root; returns an unsubscribe
 * function.
 */
export function setupPushListeners() {
  log('listeners: attaching');

  // Killed-state launch: did the user tap a notification to open the app?
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      log('listeners: app cold-launched via notification tap');
      handleNotificationTap(response);
    }
  });

  const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
    log('listeners: notification TAPPED', response?.notification?.request?.content?.data);
    handleNotificationTap(response);
  });

  const recvSub = Notifications.addNotificationReceivedListener((notification) => {
    log('listeners: notification RECEIVED (foreground)', {
      title: notification.request.content.title,
      body:  notification.request.content.body,
      data:  notification.request.content.data,
    });
  });

  return () => {
    log('listeners: removing');
    tapSub.remove();
    recvSub.remove();
  };
}

// Route a tapped notification to the right screen using its `data` payload.
function handleNotificationTap(response) {
  const data = response?.notification?.request?.content?.data || {};
  if (!navigationRef.isReady()) {
    log('tap: navigator not ready yet, retrying in 200ms');
    setTimeout(() => handleNotificationTap(response), 200);
    return;
  }

  if (data.conversation_id) {
    log('tap: → Conversation', data.conversation_id);
    navigationRef.navigate('Conversation', { conversationId: data.conversation_id });
  } else if (data.listing_id) {
    log('tap: → PetDetail', data.listing_id);
    navigationRef.navigate('PetDetail', { listingId: data.listing_id });
  } else {
    log('tap: no recognized data payload, no navigation', data);
  }
}

/**
 * Wipe the current device's token on sign-out. Optional but tidy.
 */
export async function unregisterPushToken() {
  if (!Device.isDevice) return;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;
  if (!projectId) return;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (data) {
      const { error } = await supabase.from('push_tokens').delete().eq('token', data);
      if (error) warn('unregister: delete failed:', error.message);
      else log('unregister: token removed');
    }
  } catch (err) {
    warn('unregister: error:', err?.message);
  }
}

/**
 * Manual diagnostic. Call from a screen (e.g. an "About" or hidden dev menu)
 * and watch the Metro/logcat output to see the full state of the push system.
 *
 *   import { debugPushStatus } from '../lib/push';
 *   <Button title="Debug Push" onPress={debugPushStatus} />
 */
export async function debugPushStatus() {
  const lines = [];
  const push = (s) => { lines.push(s); console.log('[push:debug]', s); };

  push(`platform = ${Platform.OS}`);
  push(`isDevice = ${Device.isDevice}`);
  push(`appOwnership = ${Constants.appOwnership}`);  // 'standalone' (APK) | 'expo' (Expo Go) | null
  push(`projectId = ${Constants.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId}`);

  const perm = await Notifications.getPermissionsAsync();
  push(`permission = ${perm.status}`);
  push(`permission detail = ${JSON.stringify(perm)}`);

  if (Platform.OS === 'android') {
    const channels = await Notifications.getNotificationChannelsAsync();
    push(`channels = ${channels.map(c => c.id).join(',') || '(none)'}`);
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    const tok = await Notifications.getExpoPushTokenAsync({ projectId });
    push(`token = ${tok.data}`);
  } catch (err) {
    push(`token error: ${err?.message}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  push(`signed-in user = ${user?.id || '(none)'}`);

  if (user) {
    const { data: rows, error } = await supabase
      .from('push_tokens').select('platform, last_seen_at').eq('user_id', user.id);
    if (error) push(`db lookup error: ${error.message}`);
    else push(`db rows for this user = ${rows?.length ?? 0}`);
  }

  return lines.join('\n');
}
