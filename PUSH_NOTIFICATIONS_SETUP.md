# Push notifications — beginner guide

Push notifications wake your app even when it's closed. This project uses the
**Expo Push Service**, which under the hood talks to FCM on Android and APNs
on iOS. From your code's perspective, it's a single API.

There is **no separate server**. A Postgres trigger reads from your existing
`notifications` table and posts to Expo's push endpoint via `pg_net`.

---

## How the whole thing works

```
                                ┌─────────────────────────────────────┐
                                │      Mobile app (your phone)        │
                                │                                     │
                                │  1. signs in                        │
                                │  2. asks OS for push permission     │
                                │  3. gets ExponentPushToken[xxx]     │
                                │  4. upserts it into push_tokens     │
                                └────────────────┬────────────────────┘
                                                 │
                                                 ▼
                                ┌─────────────────────────────────────┐
                                │  Supabase (your existing project)   │
                                │                                     │
                                │  public.push_tokens   ◄─────────────┤
                                │  public.notifications               │
                                │       │                             │
                                │       │ AFTER INSERT trigger        │
                                │       ▼                             │
                                │  send_push_notification()           │
                                │       │                             │
                                │       │  net.http_post()            │
                                └───────┼─────────────────────────────┘
                                        ▼
                                ┌─────────────────────────────────────┐
                                │  Expo Push Service                  │
                                │  https://exp.host/--/api/v2/push/send │
                                └───────┬─────────────────────────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
                  ┌──────────────┐           ┌──────────────┐
                  │     FCM      │           │     APNs     │
                  │   (Android)  │           │     (iOS)    │
                  └──────┬───────┘           └──────┬───────┘
                         ▼                          ▼
                  ┌─────────────────────────────────────┐
                  │  User's phone shows notification    │
                  └─────────────────────────────────────┘
```

Every existing notification type already works automatically:
`listing_pending`, `listing_approved`, `listing_rejected`, `new_message`,
`listing_viewed`. You don't have to touch the screens or `lib/api.js` — the
trigger fires for every row inserted into the `notifications` table.

---

## What got added in this commit

| File | Purpose |
| --- | --- |
| [package.json](package.json) | New deps: `expo-notifications`, `expo-device` |
| [app.json](app.json) | `expo-notifications` plugin block |
| [lib/navigation.js](lib/navigation.js) | Single `navigationRef` so the push handler can navigate |
| [lib/push.js](lib/push.js) | `registerForPushNotifications()` + listeners + tap-to-route |
| [App.js](App.js) | `<PushBootstrap />` calls register after sign-in and wires the listeners |
| [supabase/migrations/008_push_notifications.sql](supabase/migrations/008_push_notifications.sql) | `push_tokens` table + the `send_push_notification` trigger |

---

## Step-by-step setup

### 1. Install deps (done)

```sh
npx expo install expo-notifications expo-device
```

Already run — `package.json` has them.

### 2. Run the SQL migration

Supabase dashboard → SQL editor → paste contents of
[`supabase/migrations/008_push_notifications.sql`](supabase/migrations/008_push_notifications.sql) → Run.

It enables `pg_net`, creates `push_tokens`, and attaches the trigger.

### 3. Configure FCM for your Android build

Push tokens come from Expo, but the **actual delivery** on Android still goes
through Firebase Cloud Messaging. You need to give Expo your Firebase
credentials so it can talk to FCM on your behalf.

1. Go to https://console.firebase.google.com → **Add project** (or reuse an
   existing one).
2. Add an Android app with package name **`com.usmansiddiquigt.talash`** (must
   match `app.json` → `android.package`).
3. Download the `google-services.json` Firebase gives you. Save it as
   `google-services.json` at the repo root.
4. In Firebase Console → Project Settings → **Cloud Messaging** → enable
   "Firebase Cloud Messaging API (V1)".
5. Under "Service accounts", click **Generate new private key** → download the
   JSON.
6. Upload it to EAS:
   ```sh
   eas credentials --platform android
   # Pick: "Push Notifications: Manage your Google Service Account Key"
   # → "Upload a Service Account JSON" → point at the file from step 5.
   ```

That's it for Android. The next EAS build will include `google-services.json`
automatically because we reference it from `app.json` if needed.

### 4. (Optional) Configure APNs for iOS

If you're shipping iOS too, repeat the credential flow with an APNs auth key
from your Apple Developer account:

```sh
eas credentials --platform ios
# → "Push Notifications" → upload the .p8 key + Key ID + Team ID.
```

You can skip this if you're Android-only for now.

### 5. Build a development client (or production APK)

**Expo Go cannot receive push notifications.** Period. (Since SDK 49.) To test
on your phone you need either a dev client or a production build:

```sh
# Either: production APK (slower iterate, but ship-ready)
npx eas build -p android --profile preview

# Or: development client (fast iterate, internal only)
npx eas build -p android --profile development
```

When the build finishes, install the APK and run:

```sh
npx expo start --dev-client    # only if you built the dev profile
```

The dev client connects to your Metro bundler the same way Expo Go does.

### 6. Sign in on a real device

The first time you sign in, you'll see the OS permission prompt. After you
accept, the app calls `registerForPushNotifications()` → gets a token from
Expo → upserts it into `push_tokens`. Confirm it landed:

```sql
SELECT user_id, platform, last_seen_at, left(token, 30) || '…' AS token_preview
  FROM public.push_tokens
 ORDER BY last_seen_at DESC
 LIMIT 10;
```

You should see your row.

---

## Testing a push

### From the Expo dashboard (no SQL)

1. Open https://expo.dev/notifications.
2. Paste your token (you can console.log it from `registerForPushNotifications`
   or grab it from the table above).
3. Fill in title / body → Send → watch your phone.

### By inserting a real notification

```sql
INSERT INTO public.notifications (user_id, type, title, body, data)
VALUES (
  '<your-user-id>',                       -- find via auth.users
  'listing_approved',
  'Your ad has been approved',
  '"Test push" is now live on Talash.',
  jsonb_build_object('listing_id', '11111111-1111-1111-1111-111111111111')
);
```

Two things should happen:

- A notification row appears in your in-app Notifications screen (existing
  behaviour, RLS-filtered to your user).
- Your phone vibrates and shows the push (new behaviour, via the trigger).

If you tap the push, the app opens `PetDetail` with the `listing_id` from the
`data` payload. That routing lives in `lib/push.js → handleNotificationTap`.

---

## Debugging when something doesn't fire

Most of these check the same chain top-to-bottom:

1. **Did the trigger run?**
   ```sql
   SELECT id, status_code, content, created
     FROM net._http_response
    ORDER BY id DESC LIMIT 10;
   ```
   `status_code = 200` and `content` returns `{"data":[{"status":"ok",...}]}`
   means Expo accepted the request. Anything else → look at `content`.

2. **Does the user have any tokens?**
   ```sql
   SELECT * FROM public.push_tokens WHERE user_id = '<your-user-id>';
   ```
   If empty → permissions weren't granted, you're on a simulator, or the
   `getExpoPushTokenAsync` call failed (check Metro logs for warnings tagged
   `[push]`).

3. **Did Expo report a `DeviceNotRegistered` error?** That means the user
   uninstalled the app or revoked permission. Delete the token:
   ```sql
   DELETE FROM public.push_tokens WHERE token = 'ExponentPushToken[...]';
   ```
   You can automate this later — see "Best practices" below.

4. **Are you running in Expo Go?** It won't work. Switch to a dev or
   production build.

5. **Phone in Do Not Disturb / Battery Saver?** OS will silently drop the
   push. Disable both during testing.

---

## How the four notification states behave

| App state           | Who shows the notification        | Tap behaviour |
| ------------------- | --------------------------------- | ------------- |
| **Foreground**      | `expo-notifications` shows it via `setNotificationHandler` in `lib/push.js`. | Tap routes via `addNotificationResponseReceivedListener`. |
| **Background**      | OS shows it on its own (system tray, lockscreen). | Tap brings app forward, listener fires, routing happens. |
| **Killed**          | OS shows it on its own. | Tap launches the app from scratch; `getLastNotificationResponseAsync()` (also called at startup in `lib/push.js`) handles routing. |
| **Permission denied** | Nothing shows. The token is never created. The in-app notification still appears in the Notifications screen because that's a separate read of the DB. |

---

## Best practices for production

1. **Clean up dead tokens.** Schedule a daily job (cron, Edge Function, or
   a Postgres cron via `pg_cron`) that reads `net._http_response`, looks for
   `DeviceNotRegistered` errors, and deletes the matching tokens. Stops you
   from blasting Expo with stale requests.

2. **Don't push for every event.** For chatty actions (e.g. message bursts)
   batch on the server side or rate-limit in the trigger. Example: skip the
   push if the same user already received one in the last 30 seconds.

3. **Make pushes idempotent.** The Expo Push receipt API lets you check
   delivery status hours later. Store the `receipt_id` from Expo's response
   if you need delivery confirmation.

4. **Give users a kill switch.** Wire a toggle in your existing
   `NotificationPreferencesScreen` that calls
   `await supabase.from('push_tokens').delete().eq('token', myToken)`. They
   keep the in-app notifications, lose the OS pushes.

5. **Respect platform UX.**
   - Don't ask for permission at app launch. Ask when the user does something
     that implies they want updates (posts an ad, opens the messages tab).
   - On iOS, the user can only be asked **once**. After a deny, they have to
     enable it from Settings. Plan the prompt.

6. **Encrypt or omit sensitive data.** Push payloads can be read by the OS,
   the carrier, and any other process on the phone with notification access.
   Send `data: { conversation_id }` and let the app fetch the message body
   from Supabase on tap, rather than including the body text. (We currently
   include `body` for UX — fine for non-sensitive content but worth knowing.)

7. **Test the killed-state path on a physical device.** This is the most
   commonly broken path. Force-stop the app, send a push, tap it — you should
   land on the right screen, not the home screen.

8. **Production EAS builds need versionCode bumps.** You already know this
   from the APK section. Same here: each new APK needs a higher
   `android.versionCode` in `app.json`.

9. **Monitor `net._http_response` size.** It grows. If you do high volume,
   add a periodic `DELETE FROM net._http_response WHERE created < now() - interval '7 days'`
   via `pg_cron` or a Supabase cron.

10. **Web pushes are a separate fight.** This setup only covers iOS/Android.
    If you ever expose a web build, you'll need a service worker and a
    different token type (web push API). Not in scope here.

---

## What did NOT change

- Your existing in-app notifications screen and `notifications` table are
  unchanged. Pushes are an ADDITIVE layer.
- `lib/api.js` is unchanged — you don't send pushes from screens.
- The admin portal is unchanged — admin actions still insert into
  `notifications` via the existing triggers (006/007), and now those
  inserts also trigger pushes.
- iOS / web behaviour is gated. iOS works once you upload an APNs key. Web
  is unaffected (no token created, no error).
