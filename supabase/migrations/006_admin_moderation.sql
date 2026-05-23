-- ============================================================
-- TalashApp – admin moderation system (Phase 1: schema + mobile)
-- Run AFTER 001, 003, 004, 005.
--
-- Adds:
--   1. listings.moderation_status / rejection_reason / reviewed_by / reviewed_at
--   2. profiles.is_admin / is_banned / banned_at / banned_reason
--   3. public.admin_activity_logs table + RLS
--   4. Revised RLS on listings: public sees only approved; sellers and
--      admins see all their own / everything
--   5. Banned users can't insert listings
--   6. Replaces the old listing_posted trigger with two new triggers:
--      - INSERT  → notify seller "pending review"
--      - UPDATE  → notify seller "approved" / "rejected (reason)"
--   7. Storage: admins can delete any listing-photo
--   8. promote_to_admin(email) RPC — call once in SQL editor to bootstrap
--      your first admin. Not exposed to the client.
-- ============================================================

-- ── 1. listings: moderation columns ───────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS listings_moderation_idx
  ON public.listings(moderation_status, created_at DESC);

-- Backfill: anything currently active is treated as already approved.
UPDATE public.listings
   SET moderation_status = 'approved',
       reviewed_at = NOW()
 WHERE moderation_status = 'pending'
   AND status = 'active';

-- ── 2. profiles: admin / ban flags ────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_reason  TEXT;

-- ── 3. admin activity log ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    UUID,
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_logs_recent_idx
  ON public.admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_logs_admin_idx
  ON public.admin_activity_logs(admin_id, created_at DESC);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_activity_logs'
      AND policyname = 'Admins can read activity logs'
  ) THEN
    CREATE POLICY "Admins can read activity logs"
      ON public.admin_activity_logs FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_activity_logs'
      AND policyname = 'Admins can write activity logs'
  ) THEN
    CREATE POLICY "Admins can write activity logs"
      ON public.admin_activity_logs FOR INSERT
      WITH CHECK (
        admin_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- ── 4. listings RLS: visibility ───────────────────────────────
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings'
      AND policyname = 'Listings visibility'
  ) THEN
    CREATE POLICY "Listings visibility"
      ON public.listings FOR SELECT
      USING (
        moderation_status = 'approved'
        OR seller_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings'
      AND policyname = 'Admins can update listings'
  ) THEN
    CREATE POLICY "Admins can update listings"
      ON public.listings FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings'
      AND policyname = 'Admins can delete listings'
  ) THEN
    CREATE POLICY "Admins can delete listings"
      ON public.listings FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- ── 5. listings RLS: banned users cannot insert ───────────────
DROP POLICY IF EXISTS "Users can insert own listings" ON public.listings;

CREATE POLICY "Non-banned users can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_banned = true)
  );

-- ── 6. profiles RLS: admins can update any profile (ban/unban) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
      ON public.profiles FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- ── 7. Replace old listing_posted trigger (from migration 005) ─
DROP TRIGGER IF EXISTS on_listing_inserted ON public.listings;
DROP FUNCTION IF EXISTS public.notify_listing_posted();

-- 7a. INSERT → notify seller "pending review"
CREATE OR REPLACE FUNCTION public.notify_listing_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.moderation_status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.seller_id,
      'listing_pending',
      'Your ad is pending review',
      '"' || NEW.title || '" will go live once an admin approves it.',
      jsonb_build_object('listing_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_inserted_pending ON public.listings;
CREATE TRIGGER on_listing_inserted_pending
  AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_listing_pending();

-- 7b. UPDATE of moderation_status → notify seller of decision
CREATE OR REPLACE FUNCTION public.notify_listing_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    IF NEW.moderation_status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.seller_id,
        'listing_approved',
        'Your ad has been approved',
        '"' || NEW.title || '" is now live on Talash.',
        jsonb_build_object('listing_id', NEW.id)
      );
    ELSIF NEW.moderation_status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.seller_id,
        'listing_rejected',
        'Your ad has been rejected',
        CASE
          WHEN NEW.rejection_reason IS NOT NULL AND length(trim(NEW.rejection_reason)) > 0
            THEN 'Reason: ' || NEW.rejection_reason
          ELSE 'Please review and resubmit.'
        END,
        jsonb_build_object('listing_id', NEW.id, 'rejection_reason', NEW.rejection_reason)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_moderation_updated ON public.listings;
CREATE TRIGGER on_listing_moderation_updated
  AFTER UPDATE OF moderation_status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_listing_moderation();

-- ── 8. Storage: admins can delete any listing-photo ───────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Listing photos: admins delete any'
  ) THEN
    CREATE POLICY "Listing photos: admins delete any"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'listing-photos'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- ── 9. Bootstrap helper: promote a user to admin ──────────────
-- Use from the Supabase SQL editor (NOT exposed to client):
--   SELECT public.promote_to_admin('you@example.com');
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid
    FROM auth.users
   WHERE lower(email) = lower(user_email)
   LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user with email %', user_email;
  END IF;

  UPDATE public.profiles SET is_admin = true WHERE id = uid;
  RETURN uid;
END;
$$;

-- Lock it down: nobody can call this from the client.
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(TEXT) FROM anon, authenticated;
