-- ============================================================
-- TalashApp – allow users to mark their own notifications read
-- Run AFTER migration 010.
--
-- Bug: public.notifications has RLS enabled with only a SELECT
-- policy (backend/migrations/004_notifications.sql). UPDATEs from
-- the app (markNotificationRead / markAllNotificationsRead) were
-- silently matching 0 rows, so read status never persisted and
-- the unread badge count never went down.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
      AND policyname = 'Users update own notifications'
  ) THEN
    CREATE POLICY "Users update own notifications"
      ON public.notifications FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
