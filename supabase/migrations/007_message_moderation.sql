-- ============================================================
-- TalashApp – message moderation (keyword scanning + admin review)
-- Run AFTER migrations 001–006.
--
-- Adds:
--   1. blocked_keywords table + RLS (admins manage; anyone authed can read
--      so the trigger's SECURITY DEFINER doesn't matter, but we still lock
--      writes to admins).
--   2. messages columns: moderation_status, matched_keywords,
--      reviewed_by, reviewed_at, rejection_reason.
--   3. BEFORE INSERT trigger on messages that scans the body against the
--      keyword list. Match → moderation_status='under_review';
--      otherwise → 'approved'.
--   4. Updated messages SELECT RLS: recipients only see approved;
--      senders see their own (any status); admins see all.
--   5. Updated notify_new_message trigger so notifications only fire on
--      approved messages, and a new AFTER UPDATE trigger that fires the
--      notification once an admin approves a held message.
--   6. admin_activity_logs gets new action types via the portal:
--      'approve_message', 'reject_message', 'add_keyword',
--      'remove_keyword' (no schema change — just convention).
-- ============================================================

-- ── 1. blocked_keywords ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocked_keywords (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword     TEXT NOT NULL UNIQUE,                  -- stored lowercase
  category    TEXT,                                  -- 'contact' | 'social' | 'abuse' | 'scam' | NULL
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blocked_keywords ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blocked_keywords'
      AND policyname = 'Admins read keywords'
  ) THEN
    -- Only admins need to read this directly; the trigger uses SECURITY DEFINER.
    CREATE POLICY "Admins read keywords"
      ON public.blocked_keywords FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blocked_keywords'
      AND policyname = 'Admins write keywords'
  ) THEN
    CREATE POLICY "Admins write keywords"
      ON public.blocked_keywords FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- Normalize incoming keywords to lowercase + trim so the trigger's lookup
-- is deterministic.
CREATE OR REPLACE FUNCTION public.normalize_keyword()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.keyword := lower(trim(NEW.keyword));
  IF length(NEW.keyword) = 0 THEN
    RAISE EXCEPTION 'keyword cannot be empty';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_keyword_trigger ON public.blocked_keywords;
CREATE TRIGGER normalize_keyword_trigger
  BEFORE INSERT OR UPDATE ON public.blocked_keywords
  FOR EACH ROW EXECUTE FUNCTION public.normalize_keyword();

-- ── 2. messages: moderation columns ──────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('approved', 'under_review', 'rejected')),
  ADD COLUMN IF NOT EXISTS matched_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_moderation_idx
  ON public.messages(moderation_status, created_at DESC);

-- ── 3. BEFORE INSERT scan trigger ────────────────────────────
-- Uses SECURITY DEFINER so the scan can read blocked_keywords even though
-- senders aren't admins.
CREATE OR REPLACE FUNCTION public.moderate_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched TEXT[] := ARRAY[]::TEXT[];
  kw      RECORD;
  body_l  TEXT;
BEGIN
  body_l := lower(coalesce(NEW.body, ''));

  FOR kw IN SELECT keyword FROM public.blocked_keywords LOOP
    IF body_l LIKE '%' || kw.keyword || '%' THEN
      matched := array_append(matched, kw.keyword);
    END IF;
  END LOOP;

  IF array_length(matched, 1) IS NOT NULL THEN
    NEW.moderation_status := 'under_review';
    NEW.matched_keywords  := matched;
  ELSE
    NEW.moderation_status := 'approved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS moderate_message_before_insert ON public.messages;
CREATE TRIGGER moderate_message_before_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.moderate_message();

-- ── 4. messages SELECT policy: recipient sees approved only ──
-- Replace the existing select policy from migration 001.
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;

CREATE POLICY "Messages visibility"
  ON public.messages FOR SELECT
  USING (
    -- Senders always see their own messages (any status)
    sender_id = auth.uid()
    OR
    -- Recipients see only approved messages
    (
      moderation_status = 'approved'
      AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
      )
    )
    OR
    -- Admins see everything
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can update messages (to approve/reject held ones).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
      AND policyname = 'Admins can update messages'
  ) THEN
    CREATE POLICY "Admins can update messages"
      ON public.messages FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
      AND policyname = 'Admins can delete messages'
  ) THEN
    CREATE POLICY "Admins can delete messages"
      ON public.messages FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- ── 5. Updated notify_new_message: only fire on approved ─────
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name  TEXT;
BEGIN
  -- Skip held / rejected messages; the post-approval trigger handles those.
  IF NEW.moderation_status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT CASE
           WHEN c.buyer_id = NEW.sender_id THEN c.seller_id
           ELSE c.buyer_id
         END
    INTO recipient_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

  IF recipient_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Someone') INTO sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    recipient_id, 'new_message',
    'New message from ' || COALESCE(sender_name, 'Someone'),
    LEFT(NEW.body, 80),
    jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END;
$$;

-- 5b. AFTER UPDATE trigger: when admin approves a held message,
-- fire the same notification the recipient would have received.
CREATE OR REPLACE FUNCTION public.notify_message_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name  TEXT;
BEGIN
  IF OLD.moderation_status = 'approved' THEN RETURN NEW; END IF;
  IF NEW.moderation_status <> 'approved' THEN RETURN NEW; END IF;

  SELECT CASE
           WHEN c.buyer_id = NEW.sender_id THEN c.seller_id
           ELSE c.buyer_id
         END
    INTO recipient_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

  IF recipient_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Someone') INTO sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    recipient_id, 'new_message',
    'New message from ' || COALESCE(sender_name, 'Someone'),
    LEFT(NEW.body, 80),
    jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_message_approved_trigger ON public.messages;
CREATE TRIGGER notify_message_approved_trigger
  AFTER UPDATE OF moderation_status ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_approved();

-- ── 6. Seed a few sensible defaults (idempotent) ─────────────
-- Comment this block out if you want the keyword list to start empty.
INSERT INTO public.blocked_keywords (keyword, category) VALUES
  ('whatsapp',    'social'),
  ('instagram',   'social'),
  ('telegram',    'social'),
  ('snapchat',    'social'),
  ('call me',     'contact'),
  ('contact me',  'contact'),
  ('my number',   'contact'),
  ('http://',     'link'),
  ('https://',    'link'),
  ('www.',        'link')
ON CONFLICT (keyword) DO NOTHING;
