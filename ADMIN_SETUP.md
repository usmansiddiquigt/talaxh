# Admin moderation — Phase 1 setup

This is what got added in this session. It enables the moderation workflow in
the **mobile app** and prepares the database for the admin portal (Phase 2).
The portal itself (`/admin/` Vite + React) will be built in a follow-up.

---

## 1. Run the SQL migration

Supabase dashboard → SQL Editor → paste
[`supabase/migrations/006_admin_moderation.sql`](supabase/migrations/006_admin_moderation.sql)
and run it.

What it does:

- Adds `moderation_status`, `rejection_reason`, `reviewed_at`, `reviewed_by`
  to `listings`. Default for new rows: `'pending'`.
- Backfills every existing `status='active'` listing to
  `moderation_status='approved'` so nothing in your current app breaks.
- Adds `is_admin`, `is_banned`, `banned_at`, `banned_reason` to `profiles`.
- Creates `public.admin_activity_logs` (RLS-locked to admins).
- Replaces the listing SELECT policy: the public sees only approved listings;
  sellers and admins see everything they should.
- Blocks banned users from inserting new listings.
- Replaces the old `listing_posted` trigger with two new ones:
    - **INSERT** → seller gets a "pending review" notification.
    - **UPDATE of `moderation_status`** → seller gets `listing_approved` or
      `listing_rejected (reason)` notification.
- Adds a `promote_to_admin(email)` helper RPC, locked down so only the SQL
  editor (using the service-role key) can run it.

---

## 2. Promote yourself to admin

In the Supabase SQL editor, run:

```sql
SELECT public.promote_to_admin('your-email@example.com');
```

It returns your `auth.users.id`. Check it worked:

```sql
SELECT id, full_name, is_admin
  FROM public.profiles
 WHERE is_admin = true;
```

That's your first admin. Once the portal exists, admins-with-admin can promote
others from the UI. For now, every admin promotion goes through the SQL editor.

---

## 3. Verify the mobile app still works

Restart Expo (`r` in Metro, or `npx expo start --clear`) and on your phone:

1. **Existing listings still show on Home.** They were backfilled to
   `moderation_status='approved'`, so the Home feed is unchanged.
2. **Post a new listing.** After submitting you should see the alert:
   *"Submitted for review — your listing has been submitted and will appear on
   the Home feed once an admin approves it."*
3. **Open My Listings → Active tab.** The new listing appears with a yellow
   "Pending review" badge under it.
4. **The new listing is NOT visible on Home.** Browse Home from a logged-out
   tab — you shouldn't see your pending ad.
5. **Approve it manually from SQL** (until the portal exists):
   ```sql
   UPDATE public.listings
      SET moderation_status = 'approved', reviewed_at = NOW(), reviewed_by = (
        SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1
      )
    WHERE id = '<the-listing-id>';
   ```
   The seller should receive a `listing_approved` notification and the ad
   should now appear on Home.

6. **Reject one** to confirm the reason flows through:
   ```sql
   UPDATE public.listings
      SET moderation_status = 'rejected',
          rejection_reason = 'Photos are too blurry, please re-upload.',
          reviewed_at = NOW(),
          reviewed_by = (SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1)
    WHERE id = '<the-listing-id>';
   ```
   The seller should see a `listing_rejected` notification with the reason and
   a red "Rejected: …" badge in My Listings.

---

## 4. What's coming in Phase 2 (admin portal)

To be built in a follow-up session as a separate Vite + React app under
[`admin/`](admin/) in this repo:

- Supabase email/password login + check `profiles.is_admin` before letting
  anyone in.
- Dashboard with counts of pending / approved / rejected ads + total users.
- Pending queue: cards with photos, title, description, price, seller name,
  Approve / Reject (with optional reason) / View Full buttons.
- Search and filters (status, category, date).
- Ban / unban user.
- Delete listing (also deletes its storage objects via the policy added here).
- Activity log view (reads from `admin_activity_logs`).
- Deploys as a static SPA to Vercel/Netlify free tier.

---

## 5. Things to know about the new RLS

- **Performance:** every `SELECT` on `listings` evaluates `EXISTS (SELECT 1
  FROM profiles WHERE id = auth.uid() AND is_admin = true)`. That's a single
  PK lookup per query — totally fine in practice. If you ever notice it, you
  can promote `is_admin` into JWT custom claims and the policy becomes a
  literal claim check.
- **Sellers see their own un-approved listings.** That's how My Listings
  works. The visibility policy is `moderation_status='approved' OR
  seller_id=auth.uid() OR is_admin`.
- **Notifications use the same `notifications` table.** New types:
  `listing_pending`, `listing_approved`, `listing_rejected`. The existing
  NotificationsScreen rendering already falls back gracefully on unknown
  types — they'll show with a generic bell icon. You can add per-type icons
  later under `TYPE_META` in `screens/NotificationsScreen.js`.
