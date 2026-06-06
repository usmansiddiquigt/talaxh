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

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { navigationRef } from './navigation';
import { supabase } from './supabase';

// How a notification looks when it arrives while the app is in the foreground.
// (Background/killed-state delivery is handled entirely by the OS.)
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
 * Returns the token string or null if anything went wrong (e.g. user
 * denied permission, running on a simulator, no auth session).
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    // Simulators and the web preview can't receive real pushes.
    return null;
  }

  // Android requires a channel before any notification can show.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2C097F',
    });
  }

  // Request OS permission. On Android < 13 it's auto-granted.
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const next = await Notifications.requestPermissionsAsync();
    status = next.status;
  }
  if (status !== 'granted') {
    return null;
  }

  // Get the Expo push token. Requires a projectId — we read it from
  // app.json's extra.eas.projectId block (it's already there for EAS Build).
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.warn('[push] No projectId in app.json → cannot get Expo push token.');
    return null;
  }

  let token;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    token = res.data;
  } catch (err) {
    console.warn('[push] getExpoPushTokenAsync failed:', err?.message);
    return null;
  }

  // Persist for the current user. Service-side trigger reads this table.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return token;

  const { error } = await supabase
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
  if (error) {
    console.warn('[push] failed to save token:', error.message);
  }

  return token;
}

/**
 * Subscribe to push events. Call once near app root; returns an unsubscribe
 * function. Two events we care about:
 *
 *   - addNotificationResponseReceivedListener: fires when the user TAPS
 *     a notification (background or killed state). We deep-link from here.
 *   - addNotificationReceivedListener: fires when a push arrives while the
 *     app is in the foreground — the OS won't show its own banner because
 *     the app is alive, but the setNotificationHandler() above tells expo
 *     to show one anyway.
 *
 * We also check getLastNotificationResponseAsync() once at start-up so
 * that if the app was launched from a tapped notification (killed state),
 * we still route correctly.
 */
export function setupPushListeners() {
  // Killed-state launch: did the user tap a notification to open the app?
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleNotificationTap(response);
  });

  const tapSub = Notifications.addNotificationResponseReceivedListener(handleNotificationTap);
  const recvSub = Notifications.addNotificationReceivedListener(() => {
    // Hook for future analytics / unread-badge bumps. The banner itself
    // shows because of setNotificationHandler() above.
  });

  return () => {
    tapSub.remove();
    recvSub.remove();
  };
}

// Route a tapped notification to the right screen using its `data` payload.
// The payload mirrors what the DB notifications.data column already stores
// for each notification type (see migrations 005 / 006 / 007).
function handleNotificationTap(response) {
  const data = response?.notification?.request?.content?.data || {};
  if (!navigationRef.isReady()) {
    // Navigator hasn't mounted yet — try again on the next tick.
    setTimeout(() => handleNotificationTap(response), 200);
    return;
  }

  if (data.conversation_id) {
    navigationRef.navigate('Conversation', { conversationId: data.conversation_id });
  } else if (data.listing_id) {
    navigationRef.navigate('PetDetail', { listingId: data.listing_id });
  }
  // Add more mappings here as new notification types appear.
}

/**
 * Wipe the current device's token on sign-out. Optional but tidy:
 * stops the server from pushing to a phone that's no longer signed in
 * as that user.
 */
export async function unregisterPushToken() {
  if (!Device.isDevice) return;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;
  if (!projectId) return;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (data) await supabase.from('push_tokens').delete().eq('token', data);
  } catch { /* ignore */ }
}
