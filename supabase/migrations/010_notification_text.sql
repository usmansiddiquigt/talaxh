-- ============================================================
-- TalashApp – update listing approve/reject notification text
-- Run AFTER migration 006 (it replaces the function defined there).
--
-- New text:
--   Approve → title "Ad Approved", body "Your ad has been approved successfully"
--   Reject  → title "Ad Rejected", body "Your ad has been rejected by admin"
--             (rejection reason still appended on a second line if provided)
-- ============================================================

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
        'Ad Approved',
        'Your ad has been approved successfully',
        jsonb_build_object('listing_id', NEW.id, 'title', NEW.title)
      );
    ELSIF NEW.moderation_status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.seller_id,
        'listing_rejected',
        'Ad Rejected',
        CASE
          WHEN NEW.rejection_reason IS NOT NULL AND length(trim(NEW.rejection_reason)) > 0
            THEN 'Your ad has been rejected by admin' || E'\n' || 'Reason: ' || NEW.rejection_reason
          ELSE 'Your ad has been rejected by admin'
        END,
        jsonb_build_object('listing_id', NEW.id, 'title', NEW.title, 'rejection_reason', NEW.rejection_reason)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
