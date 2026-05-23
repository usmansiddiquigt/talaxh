# Talash Admin Portal

Vite + React + Tailwind v4 admin portal for moderating Talash listings.
Talks directly to the same Supabase project as the mobile app — no separate backend.

## Prereqs

- Node 18+
- Supabase migration `006_admin_moderation.sql` already run.
- At least one user promoted to admin (see [../ADMIN_SETUP.md](../ADMIN_SETUP.md)).

## Run locally

```sh
cd admin
npm install
npm run dev
```

Opens at http://localhost:5173. Sign in with the email/password of an admin account.

## What's inside

```
admin/
├── package.json
├── vite.config.js
├── index.html
├── .env                            # VITE_SUPABASE_URL + ANON_KEY
└── src/
    ├── main.jsx
    ├── App.jsx                     # router
    ├── index.css                   # @import "tailwindcss"
    ├── lib/
    │   ├── supabase.js             # Supabase client
    │   ├── api.js                  # ALL admin mutations (logs to admin_activity_logs)
    │   └── format.js               # date/price helpers
    ├── contexts/
    │   └── AuthContext.jsx         # is_admin-gated session
    ├── components/
    │   ├── Layout.jsx              # sidebar + mobile top nav
    │   ├── ProtectedRoute.jsx      # redirects non-admins to /login
    │   ├── StatCard.jsx
    │   ├── ListingCard.jsx
    │   └── RejectModal.jsx
    └── routes/
        ├── Login.jsx
        ├── Dashboard.jsx           # counts + recent activity
        ├── PendingQueue.jsx        # approve/reject/delete the queue
        ├── AllListings.jsx         # filters by status, category, date, search
        ├── ListingDetail.jsx       # full ad view
        ├── Users.jsx               # ban / unban / promote / demote
        └── ActivityLogs.jsx        # last 200 admin actions
```

## How admin access works

1. Anyone can submit the login form — it just calls Supabase Auth.
2. After login, `AuthContext` reads the user's `profiles` row.
3. If `is_admin !== true`, the user is **immediately signed out** and shown
   *"This account is not an administrator."*
4. The `ProtectedRoute` wrapper guards every page except `/login`.

So promoting a user to admin gives them portal access. Demoting (or
`is_banned = true` — same RLS effect on writes) removes it.

## How mutations are protected

Every admin action goes through the Supabase RLS policies added in
`supabase/migrations/006_admin_moderation.sql`:

| Action                      | Allowed by RLS                                              |
| --------------------------- | ----------------------------------------------------------- |
| Approve / reject listing    | `Admins can update listings` policy                         |
| Delete listing              | `Admins can delete listings` policy + storage delete policy |
| Ban / unban user            | `Admins can update any profile` policy                      |
| Promote / demote admin      | Same as above                                               |
| Read activity log           | `Admins can read activity logs` policy                      |
| Write activity log          | `Admins can write activity logs` policy                     |

Nothing in the portal calls a server-side endpoint — all access control lives
in Postgres, which is the right model for a Supabase app.

Every mutation is logged to `admin_activity_logs` via `lib/api.js → logAction()`.

## Build for deployment

```sh
npm run build
```

Outputs a static SPA to `admin/dist/`. Drop that folder on any static host:

- **Vercel** — `vercel --prod` from the `admin/` folder. Add the two env vars
  in the project settings (Settings → Environment Variables).
- **Netlify** — drag-and-drop `dist/`, or connect the repo with
  `Base directory: admin`, `Build command: npm run build`,
  `Publish directory: admin/dist`.
- **Cloudflare Pages** — same as Netlify.

For SPA routing, configure a fallback: any unknown path → `/index.html`.
On Vercel that's automatic. On Netlify add `admin/public/_redirects`:

```
/*  /index.html  200
```

(You'd add that file in `admin/public/` if you go the Netlify route. I left
it out by default since Vercel doesn't need it.)

## Env vars

The portal reads these from `admin/.env`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

The **same** anon key the mobile app uses. RLS is what's keeping non-admins
out — the anon key by itself has no admin powers.

## Things not built (yet)

- **Realtime queue updates.** The pending queue currently refreshes only
  when you click Refresh or revisit the page. To make it live, add a
  Supabase Realtime subscription on the `listings` table inside `PendingQueue`:
  ```js
  useEffect(() => {
    const ch = supabase.channel('pending-listings')
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'listings',
            filter: 'moderation_status=eq.pending' },
          () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);
  ```
- **Auth: admin password reset / SSO.** Admins reset passwords the same way
  any user does (via the mobile app's forgot-password flow or the Supabase
  dashboard).
- **Pagination.** Listings/users are capped at 200 per query. If you grow
  beyond that, add `range()` and a "Load more" button to the routes.
- **Bulk actions.** Approve / reject multiple at once. Easy follow-up.
- **Image moderation tools.** Currently photos are shown inline; if you need
  per-photo deletion or NSFW flagging, that's a follow-up.
