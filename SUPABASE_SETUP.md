# Supabase migration — setup & rollout

This app now talks **directly** to Supabase from the React Native client. The
Express server in `backend/` is no longer used at runtime and can be removed
once the steps below are verified.

---

## 1. Install the new dependencies

```sh
npm install
# or, equivalently:
npx expo install @supabase/supabase-js react-native-url-polyfill
```

The two packages added to `package.json`:

| Package                       | Why                                                   |
| ----------------------------- | ----------------------------------------------------- |
| `@supabase/supabase-js`       | Talks to Supabase Auth / Postgres / Storage           |
| `react-native-url-polyfill`   | Polyfills `URL` so supabase-js works on Hermes / RN   |

`@react-native-async-storage/async-storage` was already a dep — it stores the
auth session.

---

## 2. Run the SQL migration

Open the Supabase dashboard → **SQL Editor** → New query, paste the contents of
[`supabase/migrations/005_direct_client_access.sql`](supabase/migrations/005_direct_client_access.sql),
and run it.

That migration assumes migrations `001/003/004` from `backend/migrations/` have
already been applied. If they have not, run those first in the same order.

It adds:

- `profiles.last_seen_at` column
- `INSERT` RLS policy on `profiles`
- A trigger on `auth.users` that auto-inserts a profile row at signup
- `UPDATE` RLS policy on `messages` so recipients can mark
  `delivered_at` / `read_at`
- Triggers that create `listing_posted` and `new_message` notifications
  (replaces the manual inserts the Express server used to do)
- An `increment_listing_views(p_listing_id)` RPC for view-count bumps
- Storage policies on the `listing-photos` bucket: public read, and
  `${uid}/...` write/delete for authenticated users

---

## 3. Verify the Storage bucket exists

Supabase dashboard → **Storage** → confirm a bucket named `listing-photos`
exists and is marked **public**. If not, create it (public, 10 MB limit).

The Express server used to auto-create it on boot. Without that server, the
bucket has to be present in the dashboard before users post listings.

---

## 4. Configure `.env`

`.env` already contains your Supabase project URL and anon key:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SUPABASE_RESET_REDIRECT=talaxh://reset-password
```

After editing `.env`, restart Expo with the cache flag:

```sh
npx expo start --clear
```

`EXPO_PUBLIC_*` vars are read at bundle time, not runtime.

---

## 5. Sanity-check on a device

Install on a physical device (no LAN required anymore):

```sh
npx expo start
```

Test the golden paths:

1. Sign up a new user → confirm a row appears in `auth.users` **and**
   `public.profiles` (the trigger should fire automatically)
2. Log out, log back in → session persists across an app restart
3. Post a listing with one photo → appears on the Home feed; image loads
4. Send a message → recipient sees a `new_message` notification
5. Favorite / unfavorite a listing
6. Forgot Password → reset email arrives and the link opens the app

---

## 6. Tear down the old Express server

Once everything works:

- Delete the `backend/` directory.
- Remove the legacy `EXPO_PUBLIC_API_URL` variable from any Expo dashboard
  / EAS secret store you might have set.
- Stop any hosted instance of `server.js` (Render / Railway / etc.).

---

## 7. Securing environment variables in React Native

A few facts about `EXPO_PUBLIC_*`:

- They are **inlined into the JS bundle** at build time. Anyone with a copy
  of your shipped app can read them with a disassembler.
- That's fine for **public** values like a Supabase URL or anon key — those
  are guarded by Row Level Security on the server.
- It is **not** fine for secrets: API keys with elevated rights, signing
  keys, the Supabase **service-role** key, third-party admin keys, etc.
- Any value you put in an `EXPO_PUBLIC_*` var is effectively public; treat it
  as such.

Rules of thumb:

| Value                                   | Where it lives                                           |
| --------------------------------------- | -------------------------------------------------------- |
| Supabase URL                            | `EXPO_PUBLIC_SUPABASE_URL` in `.env`                     |
| Supabase **anon** key                   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`                |
| Supabase **service-role** key           | NEVER in the app; only on a server / Edge Function       |
| Third-party API keys with write scope   | Behind a Supabase Edge Function the app calls            |
| Signing keys, OAuth client secrets      | Edge Function or external server only                    |

Operational hygiene:

- `.env` is now in `.gitignore`. Use `.env.example` as the committed template.
- For CI / EAS builds, set the same `EXPO_PUBLIC_*` vars as **EAS Secrets** in
  `eas.json` or via `eas secret:create`.
- Different environments (dev / staging / prod) → different Supabase projects.
  Switch them by switching `.env` files.

---

## 8. Rotate the leaked service-role key

The previous `backend/.env` contained `SUPABASE_SERVICE_ROLE_KEY`. Since that
file was shared during the migration session, rotate it now:

1. Supabase dashboard → **Settings → API → Project API keys**
2. Click **Reset** next to the service-role key.
3. Any deployed Express server that used it will need the new value (you can
   skip this if you're deleting `backend/` per step 6).

---

## 9. Production deployment notes

A few things you'll want before shipping to real users:

- **Email confirmation.** The old server bypassed it (`email_confirm: true`)
  via the admin API. The new direct-client `signUp` triggers Supabase's
  configured email-confirmation flow. Decide whether to:
    - Disable email confirmations under **Authentication → Providers → Email**
      (no friction, but anyone can sign up with someone else's email), or
    - Keep confirmations on and tell users to check their email after signup
      (the SignupScreen alert already hints at this).
- **SMTP.** Supabase's built-in SMTP is rate-limited and not for production.
  Configure your own SMTP under **Authentication → Email Templates** before
  going live, otherwise password-reset / confirmation emails won't be reliable.
- **Deep-link scheme.** `app.json` needs a `scheme` (you have `talaxh`) and
  the password-reset redirect URL must be added to the **Auth → URL
  Configuration → Redirect URLs** allow-list in the Supabase dashboard.
- **Row Level Security.** Re-read all RLS policies before launch. The current
  policies were designed for client-direct access — never temporarily
  loosen them to "fix" a bug; fix the policy or the query instead.
- **Storage costs.** `listing-photos` is public and unlimited. For real-world
  use, set a per-listing photo cap (already 6 in the UI) and add a Postgres
  trigger that deletes a listing's photos when its row is deleted, otherwise
  storage will grow forever.
- **EAS builds.** When you build with EAS, run `eas secret:create` for each
  `EXPO_PUBLIC_*` value or commit `.env.production` (and reference it via
  `expo build`'s env config). Never bake the service-role key into a build.
- **Realtime (future).** You can replace the 5-second poll in
  `ConversationScreen` with Supabase Realtime channels on the `messages`
  table for instant updates. Out of scope for this migration; the poll works.

---

## What was changed in this migration

```
.env                                         # EXPO_PUBLIC_API_URL → Supabase URL/anon key
.env.example                                 # new — template for teammates
.gitignore                                   # now ignores .env
package.json                                 # +@supabase/supabase-js, +react-native-url-polyfill

lib/supabase.js                              # new — Supabase client + AsyncStorage
lib/api.js                                   # new — every screen calls this

context/AuthContext.js                       # uses supabase.auth.onAuthStateChange
supabase/migrations/005_direct_client_access.sql  # new SQL migration

screens/*.js   (14 screens)                  # fetch(${API_URL}/...) → api.<helper>()

backend/                                     # unchanged — deletable after step 5 passes
```
