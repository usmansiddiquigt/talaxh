-- ============================================================
-- TalashApp – mirror auth.users.last_sign_in_at into public.profiles
-- Run AFTER migrations 001–008.
--
-- Why: auth.users is in the `auth` schema and isn't accessible to PostgREST
-- under RLS. By mirroring `last_sign_in_at` into public.profiles we can
-- read it from the admin portal (and anywhere else) like any other column.
--
-- How: Supabase's GoTrue updates auth.users.last_sign_in_at on every
-- successful sign-in. A trigger on auth.users fires whenever that column
-- changes and copies the new value into public.profiles.
-- ============================================================

-- ── 1. Column ─────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_last_sign_in_idx
  ON public.profiles(last_sign_in_at DESC);

-- ── 2. Backfill from auth.users ───────────────────────────────
UPDATE public.profiles p
   SET last_sign_in_at = u.last_sign_in_at
  FROM auth.users u
 WHERE p.id = u.id
   AND p.last_sign_in_at IS NULL;

-- ── 3. Keep-in-sync trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_last_sign_in_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when the value actually changed (guards against
  -- pointless writes on unrelated auth.users updates).
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
       SET last_sign_in_at = NEW.last_sign_in_at
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_last_sign_in_at();
