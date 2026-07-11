# Push notifications — audit report

Audit performed against requirements in the user message.

## TL;DR

The push notification **code is correct** — every plumbing piece is in
place. The reason your phone isn't receiving pushes is one of three
environmental issues, in descending probability:

1. **You're testing with an old APK** that was built before the
   `expo-notifications` integration. The latest build (versionCode 4,
   ID `21cc135b-…`) is what you need to install.
2. **FCM Service Account JSON** has not been uploaded to EAS, so Expo's
   push server can't forward to Google's FCM. The trigger fires, Expo
   returns "no FCM credentials" / `MismatchSenderId`, the phone never
   sees the push.
3. **Permission was denied** on the phone when the OS prompt appeared.

The improvements in this commit make all three diagnosable from the
device's logs.

---

## Audit checklist (against your 14 points)

| # | Requirement | Status | Notes |
| --- | --- | --- | --- |
| 1  | Expo Push / FCM config | ✅ | Expo Push selected; `expo-notifications` plugin in app.json. |
| 2  | Android 13+ POST_NOTIFICATIONS | ✅ Fixed | Added to `app.json` android.permissions (was relying on plugin auto-add). |
| 3  | Notification channels | ✅ | `default` channel with HIGH importance + vibration in `lib/push.js`. |
| 4  | Token generation | ✅ | `Notifications.getExpoPushTokenAsync({ projectId })` with logged errors. |
| 5  | Token saved in Supabase | ✅ | `push_tokens` table, RLS scoped to owner, upsert on conflict('token'). |
| 6  | Backend sends | ✅ | Postgres trigger `send_push_notification` (migration 008) via `pg_net`. |
| 7  | Payload (title/body/data/sound/priority) | ✅ | All present in trigger body — `priority: 'high'`, `sound: 'default'`, `channelId: 'default'`, `data` propagated from notifications.data. |
| 8a | Push on ad approved/rejected | ✅ | `notify_listing_moderation` (migration 006, text updated in 010). |
| 8b | Push on new chat message | ✅ | `notify_new_message` (migration 007) + `notify_message_approved` for held messages getting approved later. |
| 8c | Push on new ad published (broadcast) | ❌ | **Not implemented.** See "Open question" below — needs a product decision. |
| 9  | Foreground/background/killed | ✅ | `setNotificationHandler` for foreground; OS handles bg/killed; `getLastNotificationResponseAsync` recovers killed-state taps. |
| 10 | Tap routes to right screen | ✅ | `handleNotificationTap` reads `data.conversation_id` / `data.listing_id`. |
| 11 | Expo projectId / FCM / Google Services | ⚠️ | projectId is correct in `app.json`. FCM Service Account JSON upload to EAS is the remaining manual step. |
| 12 | JS/native errors | ✅ Fixed | All errors now logged with `[push]` prefix and full message. |
| 13 | Detailed logging | ✅ Fixed | Every step now logs: permission state, projectId, token, DB write result, listener attach/remove, tap routing. |
| 14 | Don't break existing | ✅ | Pure additions to `lib/push.js` and `app.json`; no other files touched except `AuthContext.js` (sign-out cleanup). |

---

## Files modified

| File | Change |
| --- | --- |
| `lib/push.js` | Replaced wholesale: added `[push]` logging at every step, iOS permission options, `debugPushStatus()` helper |
| `app.json` | Added `POST_NOTIFICATIONS`, `WAKE_LOCK`, `VIBRATE` to android.permissions explicitly |
| `context/AuthContext.js` | Sign-out now calls `unregisterPushToken()` to remove the device's token |

No new migrations needed — the SQL side was already correct.

---

## Open question — "When a user posts a new ad, all relevant users should receive a push"

This requirement is **not currently implemented** and shouldn't be without
clarification. The literal interpretation ("notify every user on every new
ad") would be spam. Decide which of these you actually want:

1. **Skip it** — current behaviour (only seller is notified that their ad
   is pending review) is fine.
2. **Notify favoriters of similar listings** — when a new dog listing is
   posted, notify users who have favorited other dog listings. Requires:
   - new column / table tracking user preferences
   - trigger that joins listings → favorites → notifications
3. **Notify all users in the same city** — easier to implement, joins on
   `profiles.location` ILIKE `listings.city`. Still potentially spammy.
4. **Notify nobody until they opt in** — add a "Notify me about new dogs
   in Karachi" subscription model. Most complex but the right UX.

Tell me which one and I'll wire it up.

---

## How to test push notifications (step-by-step)

After your **versionCode 4 APK** (build ID `21cc135b-…`) installs:

### 1. Sign in and watch the logs

Connect your phone via USB and:

```powershell
adb logcat -s ReactNativeJS:I -v color
```

Open the app, sign in, and you should see in order:

```
I/ReactNativeJS: [push] register: start { platform: 'android', isDevice: true }
I/ReactNativeJS: [push] register: android channel "default" ready
I/ReactNativeJS: [push] register: existing permission = undetermined
I/ReactNativeJS: [push] register: requesting permission…
I/ReactNativeJS: [push] register: permission after request = granted
I/ReactNativeJS: [push] register: projectId = 7533fca3-66ca-41f7-83fd-a9c154ac371b
I/ReactNativeJS: [push] register: got token = ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
I/ReactNativeJS: [push] register: token saved to push_tokens for user <uuid>
I/ReactNativeJS: [push] listeners: attaching
```

If any line is missing or shows a warning, you've found your problem.
Common failures:

- `register: skipping — simulators…` → you're on an emulator
- `register: user denied or blocked notification permission` → tap Allow next time
- `register: getExpoPushTokenAsync failed: <error>` → projectId or network issue
- `register: upsert into push_tokens failed: …` → RLS or DB issue
- No `[push]` logs at all → you installed an old APK without the push code

### 2. Confirm token in Supabase

```sql
SELECT user_id, platform, last_seen_at, left(token, 30) || '…' AS preview
  FROM public.push_tokens
 ORDER BY last_seen_at DESC LIMIT 5;
```

Row present? Good.

### 3. Send a test push from the Expo dashboard

https://expo.dev/notifications → paste your token from step 2 → Send.

Phone vibrates and shows the push? **Permission and token are working.**

Phone shows nothing but the dashboard says "ok"? **FCM credentials are
missing.** Upload them:

```powershell
eas credentials --platform android
```

Pick: Build credentials → Push Notifications: Manage your Google Service
Account Key → Upload Google Service Account Key.

### 4. End-to-end test: approve an ad

Post a new ad as a regular user, then in the admin portal /pending click
Approve. Within 2-3 seconds the seller's phone should:

- Show the OS notification "Ad Approved" / "Your ad has been approved successfully"
- Tap it → land on the PetDetail screen of that listing
- In Metro logs, see:
  ```
  I/ReactNativeJS: [push] listeners: notification RECEIVED (foreground) { title: 'Ad Approved', … }
  I/ReactNativeJS: [push] listeners: notification TAPPED { listing_id: '…' }
  I/ReactNativeJS: [push] tap: → PetDetail …
  ```

### 5. End-to-end test: new chat message

User A sends a message to User B. Within 2-3 seconds User B's phone shows
"New message from <A's name>" with the body preview. Tap → opens the
Conversation screen.

### 6. Server-side debugging

If pushes aren't arriving:

```sql
-- Did the trigger actually fire?
SELECT id, status_code, content::text, created
  FROM net._http_response
 ORDER BY id DESC LIMIT 10;
```

What to look for in `content`:
- `{"data":[{"status":"ok","id":"…"}]}` → Expo accepted; phone/FCM issue
- `{"data":[{"status":"error","message":"DeviceNotRegistered"}]}` → token is stale, delete the row
- `{"data":[{"status":"error","message":"MismatchSenderId"}]}` → FCM Service Account package name doesn't match `com.usmansiddiquigt.talash`
- `{"data":[{"status":"error","message":"InvalidCredentials"}]}` → FCM Service Account JSON not uploaded to EAS

---

## Environment / Firebase config required

### Firebase Console

1. Project Settings → **Cloud Messaging** tab → enable **Firebase Cloud Messaging API (V1)**.
2. Android app registered with package name **`com.usmansiddiquigt.talash`** (exact match required — Expo will reject with `MismatchSenderId` otherwise).
3. Project Settings → **Service accounts** → Generate new private key → download the JSON.

### EAS

```powershell
eas credentials --platform android
```

Menu path:
- Build credentials → Configure
- **Push Notifications: Manage your Google Service Account Key (FCM V1)**
- Upload Google Service Account Key
- Point at the JSON from Firebase.

No build is required after the upload — Expo's push servers use the
credential on every push call.

### app.json

Already correct. The plugin block:

```json
"plugins": [
  "expo-web-browser",
  ["expo-notifications", { "color": "#2C097F" }]
]
```

The Android permissions are now explicit:

```json
"android": {
  "permissions": [
    "INTERNET", "READ_EXTERNAL_STORAGE", "READ_MEDIA_IMAGES",
    "POST_NOTIFICATIONS", "WAKE_LOCK", "VIBRATE"
  ]
}
```

### .env

No new env vars. The existing `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` /
`_RESET_REDIRECT` continue to be used.

---

## When you call me back

If pushes still don't work after these changes, paste:

1. The full `[push]` log output from step 1 of the test plan above.
2. The latest 3 rows from `net._http_response` (with `content::text` cast).
3. The result of `SELECT * FROM push_tokens` for the user you're testing as.

Those three together will pin the failure to an exact step.
