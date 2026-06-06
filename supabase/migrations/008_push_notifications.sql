-- ============================================================
-- TalashApp – push notifications via Expo Push Service
-- Run AFTER migrations 001–007.
--
-- Adds:
--   1. The pg_net extension (so Postgres can make HTTP requests).
--   2. public.push_tokens table — one row per device token per user.
--   3. RLS policy: users manage only their own tokens.
--   4. send_push_notification() trigger function — fires after a new
--      row in public.notifications, batches the user's tokens and posts
--      them to https://exp.host/--/api/v2/push/send.
--
-- After running this, every existing in-app notification (listing_pending,
-- listing_approved, listing_rejected, new_message, listing_viewed) will
-- also fire an OS push to every signed-in device of the recipient. No
-- per-screen code changes needed.
-- ============================================================

-- ── 1. pg_net (already in the `extensions` schema on Supabase) ─
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── 2. push_tokens table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,           -- ExponentPushToken[xxx...]
  platform      TEXT,                           -- 'ios' | 'android' | 'web'
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx
  ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_tokens'
      AND policyname = 'Users manage own push tokens'
  ) THEN
    CREATE POLICY "Users manage own push tokens"
      ON public.push_tokens FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 3. Trigger function: send push when a notification is inserted ──
CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  messages JSONB := '[]'::jsonb;
  tok RECORD;
BEGIN
  -- Build a batched message array for every device this user has registered.
  -- Expo's push API accepts up to 100 messages per request — fine for now.
  FOR tok IN
    SELECT token FROM public.push_tokens WHERE user_id = NEW.user_id
  LOOP
    messages := messages || jsonb_build_object(
      'to',       tok.token,
      'title',    NEW.title,
      'body',     NEW.body,
      'data',     COALESCE(NEW.data, '{}'::jsonb),
      'sound',    'default',
      'priority', 'high',
      'channelId','default'
    );
  END LOOP;

  IF jsonb_array_length(messages) = 0 THEN
    -- No registered devices for this user — nothing to push.
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP POST. pg_net queues the request asynchronously.
  PERFORM net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Accept',       'application/json'
               ),
    body    := messages
  );

  RETURN NEW;
END;
$$;

-- ── 4. Hook the trigger up to notifications inserts ──────────
DROP TRIGGER IF EXISTS notifications_send_push ON public.notifications;
CREATE TRIGGER notifications_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.send_push_notification();

-- ── (Optional) Inspect recent pg_net responses ───────────────
-- Useful for debugging: every call we make ends up in net._http_response.
--   SELECT id, status_code, content, created
--     FROM net._http_response
--    ORDER BY id DESC LIMIT 20;
