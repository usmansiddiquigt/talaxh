# Postman collection — TalashApp Supabase API

This folder contains a Postman collection for every HTTP endpoint the
TalashApp mobile app and admin portal hit. **There is no custom backend** —
the app talks directly to Supabase, so this collection is a one-to-one
mapping of what `lib/api.js` (mobile) and `admin/src/lib/api.js` (portal)
execute under the hood.

## Files

| File | What it is |
| --- | --- |
| `TalashApp.postman_collection.json`  | The collection — folders for Auth, Profiles, Listings, Favorites, Conversations/Messages, Notifications, Storage, and the four Admin areas (Moderation, Messages Moderation, Keywords, Users, Activity Logs). |
| `TalashApp.postman_environment.json` | The environment — `supabase_url`, `anon_key`, and runtime slots for `access_token`, `refresh_token`, `user_id`. |

## Import

1. Open Postman → **Import** (top left) → drop both JSON files.
2. Top-right environment dropdown → pick **TalashApp – Supabase**.
3. Open **Auth → Sign In (Login)**, edit the body with a real user's email +
   password, click **Send**. The test script auto-fills `access_token`,
   `refresh_token`, and `user_id` into the environment.
4. Every other request now sends the right `apikey` + `Authorization`
   headers automatically.

## What's happening under the hood

The Supabase JS SDK is a thin wrapper around three HTTP APIs, all served
from the same domain:

| API | Base path | Used for |
| --- | --- | --- |
| **Auth**       | `/auth/v1`    | sign up / sign in / refresh / password reset / get current user |
| **PostgREST**  | `/rest/v1`    | every table query (SELECT/INSERT/UPDATE/DELETE) + RPC calls    |
| **Storage**    | `/storage/v1` | photo uploads + reads + deletes against the `listing-photos` bucket |

Both layers require an `apikey` header on every request. The anon key is
*public* — it's bundled into the mobile app and the admin portal — and is
only useful when combined with a JWT bearer token. **Row Level Security**
on every table is what actually keeps unauthorised callers out.

## PostgREST filter cheatsheet

The query parameter syntax is unusual but everywhere in this collection.
Quick reference:

| You want | Query |
| --- | --- |
| Equals          | `?column=eq.value`         |
| Not equals      | `?column=neq.value`        |
| Greater than    | `?column=gt.value`         |
| `>=` / `<=`     | `?column=gte.value` / `lte.value` |
| `LIKE` (case-insensitive) | `?column=ilike.*needle*`  |
| `IS NULL`       | `?column=is.null`          |
| `IN (a, b, c)`  | `?column=in.(a,b,c)`       |
| `OR` between filters | `?or=(a.eq.1,b.eq.2)` |
| Select columns  | `?select=id,name,created_at` |
| Order           | `?order=created_at.desc`    |
| Limit / offset  | `?limit=20&offset=40`       |
| Get exact row count | header `Prefer: count=exact` (count comes back in `Content-Range`) |
| Get inserted row back | header `Prefer: return=representation` |

Full docs: https://postgrest.org/en/stable/api.html

## Admin-only requests

Anything under the `Admin – ...` folders requires the bearer token to belong
to a user with `profiles.is_admin = true`. If a non-admin runs them, the
request **doesn't error** — PostgREST returns an empty array (the RLS
visibility policy filters those rows out). So `[]` from an admin-only
endpoint is your signal that the token isn't admin.

Bootstrap an admin once via the Supabase SQL editor:

```sql
SELECT public.promote_to_admin('your-email@example.com');
```

## Storage uploads from Postman

To use the **Storage → Upload Photo (binary)** request:

1. Open the request → **Body** tab.
2. Mode is already set to **binary** (`file`).
3. Click **Select File** and pick a local JPG/PNG.
4. Edit the URL path: change `UNIQUE-FILENAME.jpg` to whatever you want.
   Keep the `{{user_id}}/` prefix — RLS requires the first folder segment
   to match `auth.uid()`.
5. **Send**. The response is empty on success (201). The public URL is
   `{{supabase_url}}/storage/v1/object/public/listing-photos/{{user_id}}/UNIQUE-FILENAME.jpg`.

## Tokens expire

Supabase access tokens last ~1 hour. When you start getting `401 invalid
JWT`, hit **Auth → Refresh Token**. The test script there auto-rotates
`access_token` and `refresh_token` in the environment.

## What's intentionally NOT in this collection

- **Realtime websocket** subscriptions (`/realtime/v1/...`) — that's not
  HTTP, so not Postman territory.
- **Admin Auth API** (e.g. `auth.admin.createUser`) — those require the
  service-role key, which is server-only. Don't put that key in Postman if
  you share the workspace.
- **Edge Functions** — the project has none.

If you add any of those later, this collection can grow to cover them.
