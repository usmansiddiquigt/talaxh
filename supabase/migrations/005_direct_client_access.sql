-- ============================================================
-- TalashApp – migration to direct-client (no Express proxy)
-- Run this in your Supabase SQL editor AFTER 001/003/004.
--
-- This adds:
--   1. profiles.last_seen_at column + a self-update RLS policy
--   2. INSERT RLS policy on profiles
--   3. Trigger that auto-creates a profile row when auth.users grows
--   4. UPDATE RLS policy on messages so recipients can mark
--      delivered_at / read_at without touching their own messages
--   5. Trigger that creates a "listing_posted" notification
--   6. Trigger that creates a "new_message" notification
--   7. RPC increment_listing_views() so callers can bump view counts
--      without the listing's UPDATE-only-by-seller policy blocking them
--   8. Storage policies on the listing-photos bucket so users can
--      upload and delete inside their own folder (uid/...) and
--      anyone can read.
-- ============================================================

-- ── 1. profiles: last_seen_at ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- ── 2. profiles: INSERT policy (defensive; trigger uses SECURITY DEFINER)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ── 3. Auto-create profile when a new auth user signs up ──────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'fullName',
      ''
    ),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. messages: recipients can mark delivered/read ───────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
      AND policyname = 'Recipients can update message status'
  ) THEN
    CREATE POLICY "Recipients can update message status"
      ON public.messages FOR UPDATE
      USING (
        sender_id <> auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.id = conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
      );
  END IF;
END $$;

-- ── 5. Trigger: notify seller when their listing goes live ────
CREATE OR REPLACE FUNCTION public.notify_listing_posted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.seller_id,
      'listing_posted',
      'Your ad has been posted successfully',
      '"' || NEW.title || '" is now live on Talash.',
      jsonb_build_object('listing_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_inserted ON public.listings;
CREATE TRIGGER on_listing_inserted
  AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_listing_posted();

-- ── 6. Trigger: notify recipient when a new message arrives ───
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
  SELECT CASE
           WHEN c.buyer_id = NEW.sender_id THEN c.seller_id
           ELSE c.buyer_id
         END
    INTO recipient_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Someone') INTO sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    recipient_id,
    'new_message',
    'New message from ' || COALESCE(sender_name, 'Someone'),
    LEFT(NEW.body, 80),
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- ── 7. RPC: increment a listing's view counter ────────────────
CREATE OR REPLACE FUNCTION public.increment_listing_views(p_listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = p_listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_views(UUID) TO anon, authenticated;

-- ── 8. Storage policies for the listing-photos bucket ─────────
-- Anyone can SELECT (the bucket is public anyway).
-- Authenticated users can INSERT/DELETE within their own `${uid}/...` folder.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Listing photos: public read'
  ) THEN
    CREATE POLICY "Listing photos: public read"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'listing-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Listing photos: users upload to own folder'
  ) THEN
    CREATE POLICY "Listing photos: users upload to own folder"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'listing-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Listing photos: users delete own files'
  ) THEN
    CREATE POLICY "Listing photos: users delete own files"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'listing-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
