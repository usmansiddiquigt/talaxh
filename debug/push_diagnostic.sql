-- ============================================================
-- Push notifications — complete server-side diagnostic
-- Run this entire script in Supabase SQL Editor.
-- Each block prints a labeled result. Walk down from top
-- to bottom — the FIRST block that prints unexpected output
-- is where your push pipeline is broken.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. pg_net extension installed?
-- Expected: 1 row with the version number.
-- If empty: migration 008 didn't run, or pg_net was disabled.
-- ────────────────────────────────────────────────────────────
SELECT '01. pg_net extension' AS check, extname, extversion
  FROM pg_extension
 WHERE extname = 'pg_net';

-- ────────────────────────────────────────────────────────────
-- 2. push_tokens table exists?
-- Expected: 1 row.
-- ────────────────────────────────────────────────────────────
SELECT '02. push_tokens table' AS check,
       table_schema, table_name
  FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name = 'push_tokens';

-- ────────────────────────────────────────────────────────────
-- 3. push_tokens has the right columns?
-- Expected: 6 rows (id, user_id, token, platform, last_seen_at, created_at).
-- ────────────────────────────────────────────────────────────
SELECT '03. push_tokens columns' AS check,
       column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'push_tokens'
 ORDER BY ordinal_position;

-- ────────────────────────────────────────────────────────────
-- 4. The send_push_notification trigger function exists?
-- Expected: 1 row.
-- ────────────────────────────────────────────────────────────
SELECT '04. send_push_notification function' AS check,
       proname, prosecdef AS is_security_definer
  FROM pg_proc
 WHERE proname = 'send_push_notification';

-- ────────────────────────────────────────────────────────────
-- 5. The trigger is attached to notifications table?
-- Expected: 1 row, tgenabled = 'O' (enabled).
-- ────────────────────────────────────────────────────────────
SELECT '05. trigger on notifications' AS check,
       tgname, tgenabled, tgtype
  FROM pg_trigger
 WHERE tgrelid = 'public.notifications'::regclass
   AND tgname = 'notifications_send_push';

-- ────────────────────────────────────────────────────────────
-- 6. How many push tokens currently exist?
-- Expected: at least 1 if anyone has signed in on a real device
-- with a push-enabled APK.
-- If 0: client side hasn't registered. The APK on the phone
-- either doesn't have push code or permission was denied.
-- ────────────────────────────────────────────────────────────
SELECT '06. token count' AS check,
       count(*) AS total_tokens,
       count(*) FILTER (WHERE platform = 'android') AS android_tokens,
       count(*) FILTER (WHERE platform = 'ios')     AS ios_tokens,
       max(last_seen_at) AS most_recent
  FROM public.push_tokens;

-- ────────────────────────────────────────────────────────────
-- 7. Show the actual tokens (truncated for safety).
-- ────────────────────────────────────────────────────────────
SELECT '07. tokens' AS check,
       user_id, platform, last_seen_at,
       left(token, 25) || '…]' AS token_preview
  FROM public.push_tokens
 ORDER BY last_seen_at DESC
 LIMIT 10;

-- ────────────────────────────────────────────────────────────
-- 8. How many notification rows exist? Recent ones?
-- Expected: at least a few rows from your testing.
-- If 0: nothing has inserted notifications, so the trigger
-- never had a chance to fire.
-- ────────────────────────────────────────────────────────────
SELECT '08. notification count' AS check,
       count(*) AS total_notifs,
       count(*) FILTER (WHERE created_at > now() - interval '1 hour')  AS last_hour,
       count(*) FILTER (WHERE created_at > now() - interval '1 day')   AS last_day,
       max(created_at) AS most_recent
  FROM public.notifications;

-- ────────────────────────────────────────────────────────────
-- 9. Show the 10 most recent notifications.
-- These should match what you've been doing in the app
-- (approving ads, sending messages, etc.).
-- ────────────────────────────────────────────────────────────
SELECT '09. recent notifications' AS check,
       type, title, user_id, created_at
  FROM public.notifications
 ORDER BY created_at DESC
 LIMIT 10;

-- ────────────────────────────────────────────────────────────
-- 10. CRITICAL: what did pg_net actually do?
-- Each row here = one HTTP request the trigger sent to Expo.
-- status_code = 200 + content has "ok" → Expo accepted it
-- status_code = 200 + content has "error" → Expo rejected the
--   token (look at "message" field — most common: DeviceNotRegistered,
--   MismatchSenderId, InvalidCredentials)
-- status_code != 200 → network / pg_net itself broke
-- empty result → trigger NEVER fired (or fired but bailed due to
--   no tokens for that user)
-- ────────────────────────────────────────────────────────────
SELECT '10. pg_net responses' AS check,
       id, status_code, created,
       left(content::text, 500) AS content_preview
  FROM net._http_response
 ORDER BY id DESC
 LIMIT 10;

-- ────────────────────────────────────────────────────────────
-- 11. Cross-check: for the LATEST notification, was a push
-- attempted? This joins notifications with pg_net responses
-- by time proximity (within 5 seconds).
-- ────────────────────────────────────────────────────────────
WITH latest_notifs AS (
  SELECT n.id, n.user_id, n.type, n.title, n.created_at,
         (SELECT count(*) FROM public.push_tokens WHERE user_id = n.user_id) AS tokens_for_user
    FROM public.notifications n
   ORDER BY n.created_at DESC
   LIMIT 5
)
SELECT '11. recent notif → push attempt' AS check,
       n.created_at AS notif_at,
       n.type,
       n.tokens_for_user,
       r.status_code AS http_status,
       left(r.content::text, 200) AS expo_response
  FROM latest_notifs n
  LEFT JOIN net._http_response r
    ON r.created BETWEEN n.created_at - interval '5 seconds'
                     AND n.created_at + interval '10 seconds'
 ORDER BY n.created_at DESC;

-- ────────────────────────────────────────────────────────────
-- 12. Function source — last resort to confirm the function
-- body is what we expect (not somehow replaced).
-- Look for 'exp.host/--/api/v2/push/send' in the output.
-- ────────────────────────────────────────────────────────────
SELECT '12. function body sanity' AS check,
       left(pg_get_functiondef(oid), 800) AS function_def
  FROM pg_proc
 WHERE proname = 'send_push_notification';
