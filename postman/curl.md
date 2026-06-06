# curl reference — TalashApp Supabase API

Every endpoint from the Postman collection as a copy-pasteable curl command.
Bash / zsh / Git Bash. For Windows `cmd.exe`, replace `\` line-continuations
with `^` and `'…'` quoting with `"…"`.

## Shell variables

Set these once per session:

```bash
export SUPABASE_URL="https://mokjsuqjlqyvggkowziv.supabase.co"
export ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2pzdXFqbHF5dmdna293eml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzIwNjcsImV4cCI6MjA4NTE0ODA2N30.4VlbRwwcFBTAOHdzOioHz9fWRi7WTp7iRSZDrJLor3w"
export ACCESS_TOKEN=""      # filled in after Sign In
export REFRESH_TOKEN=""
export USER_ID=""
```

PowerShell version:

```powershell
$env:SUPABASE_URL = "https://mokjsuqjlqyvggkowziv.supabase.co"
$env:ANON_KEY     = "eyJhbGci...4VlbRwwcFBTAOHdzOioHz9fWRi7WTp7iRSZDrJLor3w"
$env:ACCESS_TOKEN = ""
$env:USER_ID      = ""
```

The rest of this file uses bash syntax. Pipe through `jq` for readable JSON.

---

## Auth

### Sign Up

```bash
curl -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "strong-password-12+",
    "data": { "full_name": "New User", "phone": "+92 300 0000000" }
  }'
```

### Sign In (Login)

```bash
# Captures access_token, refresh_token, and user.id straight into shell vars.
resp=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"strong-password-12+"}')

export ACCESS_TOKEN=$(echo "$resp" | jq -r .access_token)
export REFRESH_TOKEN=$(echo "$resp" | jq -r .refresh_token)
export USER_ID=$(echo "$resp" | jq -r .user.id)
echo "Signed in as $USER_ID"
```

### Refresh Token

```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"
```

### Get Current User

```bash
curl "$SUPABASE_URL/auth/v1/user" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Forgot Password

```bash
curl -X POST "$SUPABASE_URL/auth/v1/recover?redirect_to=talaxh%3A%2F%2Freset-password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com"}'
```

### Update Password (signed-in user)

```bash
curl -X PUT "$SUPABASE_URL/auth/v1/user" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"new-strong-password-12+"}'
```

### Sign Out

```bash
curl -X POST "$SUPABASE_URL/auth/v1/logout" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Profiles

### Get My Profile

```bash
curl "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID&select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Get Profile By ID

```bash
SELLER_ID="SOME-UUID"
curl "$SUPABASE_URL/rest/v1/profiles?id=eq.$SELLER_ID&select=id,full_name,phone,avatar_url,location,created_at" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Update My Profile

```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "full_name": "Updated Name",
    "phone": "+92 300 0000001",
    "location": "Karachi",
    "bio": "Pet lover."
  }'
```

### Heartbeat (update last_seen_at)

```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"last_seen_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

---

## Listings

### List Approved Listings (Home feed)

```bash
curl "$SUPABASE_URL/rest/v1/listings?select=*&status=eq.active&moderation_status=eq.approved&order=created_at.desc&limit=20" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

With filters used by Home:

```bash
curl "$SUPABASE_URL/rest/v1/listings?select=*&status=eq.active&moderation_status=eq.approved&category=eq.dogs&city=ilike.*karachi*&price=gte.1000&price=lte.50000&title=ilike.*labrador*&order=created_at.desc&limit=20" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Get Listing By ID

```bash
LISTING_ID="SOME-UUID"
curl "$SUPABASE_URL/rest/v1/listings?id=eq.$LISTING_ID&select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### List My Listings

```bash
curl "$SUPABASE_URL/rest/v1/listings?seller_id=eq.$USER_ID&select=*&order=created_at.desc" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Create Listing

```bash
curl -X POST "$SUPABASE_URL/rest/v1/listings" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"seller_id\": \"$USER_ID\",
    \"title\": \"Labrador puppy for sale\",
    \"category\": \"dogs\",
    \"breed\": \"Labrador\",
    \"age_months\": 4,
    \"gender\": \"male\",
    \"color\": \"Golden\",
    \"price\": 25000,
    \"is_free\": false,
    \"is_adoption\": false,
    \"is_swap\": false,
    \"description\": \"Healthy, vaccinated.\",
    \"location\": \"DHA, Karachi\",
    \"city\": \"Karachi\",
    \"is_vaccinated\": true,
    \"photos\": [\"https://.../photo1.jpg\"],
    \"status\": \"active\"
  }"
```

### Update Listing

```bash
LISTING_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/listings?id=eq.$LISTING_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"title":"Updated title","price":30000}'
```

### Mark Listing Sold

```bash
LISTING_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/listings?id=eq.$LISTING_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"sold"}'
```

### Delete Listing

```bash
LISTING_ID="SOME-UUID"
curl -X DELETE "$SUPABASE_URL/rest/v1/listings?id=eq.$LISTING_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Increment Listing Views (RPC)

```bash
LISTING_ID="SOME-UUID"
curl -X POST "$SUPABASE_URL/rest/v1/rpc/increment_listing_views" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"p_listing_id\":\"$LISTING_ID\"}"
```

---

## Favorites

### List My Favorites

```bash
curl "$SUPABASE_URL/rest/v1/favorites?user_id=eq.$USER_ID&select=id,created_at,listing_id&order=created_at.desc" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Add Favorite

```bash
LISTING_ID="SOME-UUID"
curl -X POST "$SUPABASE_URL/rest/v1/favorites" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"listing_id\":\"$LISTING_ID\"}"
```

### Remove Favorite

```bash
LISTING_ID="SOME-UUID"
curl -X DELETE "$SUPABASE_URL/rest/v1/favorites?user_id=eq.$USER_ID&listing_id=eq.$LISTING_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Conversations & Messages

### List My Conversations

```bash
curl "$SUPABASE_URL/rest/v1/conversations?or=(buyer_id.eq.$USER_ID,seller_id.eq.$USER_ID)&select=*&order=created_at.desc" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Create Conversation

```bash
LISTING_ID="SOME-UUID"
SELLER_ID="SELLER-UUID"
curl -X POST "$SUPABASE_URL/rest/v1/conversations" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"listing_id\":\"$LISTING_ID\",\"buyer_id\":\"$USER_ID\",\"seller_id\":\"$SELLER_ID\"}"
```

### List Messages In Conversation

```bash
CONV_ID="SOME-UUID"
curl "$SUPABASE_URL/rest/v1/messages?conversation_id=eq.$CONV_ID&select=*&order=created_at.asc" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Send Message

```bash
CONV_ID="SOME-UUID"
curl -X POST "$SUPABASE_URL/rest/v1/messages" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"conversation_id\": \"$CONV_ID\",
    \"sender_id\": \"$USER_ID\",
    \"body\": \"Is this still available?\"
  }"
```

### Mark Messages Delivered

```bash
CONV_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/messages?conversation_id=eq.$CONV_ID&sender_id=neq.$USER_ID&delivered_at=is.null" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"delivered_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

### Mark Messages Read

```bash
CONV_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/messages?conversation_id=eq.$CONV_ID&sender_id=neq.$USER_ID&read_at=is.null" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"is_read\":true,\"read_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

---

## Notifications

### List Notifications

```bash
curl "$SUPABASE_URL/rest/v1/notifications?user_id=eq.$USER_ID&select=*&order=created_at.desc&limit=100" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Unread Count

```bash
# The count comes back in the Content-Range response header — use -i to see it.
curl -i "$SUPABASE_URL/rest/v1/notifications?user_id=eq.$USER_ID&is_read=eq.false&select=id" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Prefer: count=exact" \
  -H "Range-Unit: items" \
  -H "Range: 0-0"
```

### Mark One Read

```bash
NOTIF_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/notifications?id=eq.$NOTIF_ID&user_id=eq.$USER_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"is_read\":true,\"read_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

### Mark All Read

```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/notifications?user_id=eq.$USER_ID&is_read=eq.false" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"is_read\":true,\"read_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

---

## Storage — listing-photos bucket

### Upload Photo

```bash
# Path MUST start with $USER_ID/ to satisfy the storage RLS policy.
curl -X POST "$SUPABASE_URL/storage/v1/object/listing-photos/$USER_ID/$(date +%s).jpg" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: image/jpeg" \
  -H "x-upsert: false" \
  --data-binary "@/path/to/photo.jpg"
```

### Get Public URL (no auth)

```bash
# Just GET it — no apikey or token needed for the public bucket.
curl -O "$SUPABASE_URL/storage/v1/object/public/listing-photos/$USER_ID/photo.jpg"
```

### Delete Photo

```bash
curl -X DELETE "$SUPABASE_URL/storage/v1/object/listing-photos/$USER_ID/photo.jpg" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Admin — Listings Moderation

> Requires the bearer token to belong to a user with `profiles.is_admin = true`.

### Pending Queue

```bash
curl "$SUPABASE_URL/rest/v1/listings?moderation_status=eq.pending&select=*&order=created_at.desc" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Approve Listing

```bash
LISTING_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/listings?id=eq.$LISTING_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"moderation_status\":\"approved\",
    \"rejection_reason\":null,
    \"reviewed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reviewed_by\":\"$USER_ID\"
  }"
```

### Reject Listing

```bash
LISTING_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/listings?id=eq.$LISTING_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"moderation_status\":\"rejected\",
    \"rejection_reason\":\"Photos are too blurry.\",
    \"reviewed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reviewed_by\":\"$USER_ID\"
  }"
```

---

## Admin — Messages Moderation

### List Held Messages

```bash
curl "$SUPABASE_URL/rest/v1/messages?moderation_status=eq.under_review&select=*&order=created_at.desc&limit=200" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Approve Message

```bash
MSG_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/messages?id=eq.$MSG_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"moderation_status\":\"approved\",
    \"rejection_reason\":null,
    \"reviewed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reviewed_by\":\"$USER_ID\"
  }"
```

### Reject Message

```bash
MSG_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/messages?id=eq.$MSG_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"moderation_status\":\"rejected\",
    \"rejection_reason\":\"Contains contact info.\",
    \"reviewed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reviewed_by\":\"$USER_ID\"
  }"
```

---

## Admin — Blocked Keywords

### List Keywords

```bash
curl "$SUPABASE_URL/rest/v1/blocked_keywords?select=*&order=created_at.desc" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Add Keyword

```bash
curl -X POST "$SUPABASE_URL/rest/v1/blocked_keywords" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"keyword\":\"telegram\",\"category\":\"social\",\"created_by\":\"$USER_ID\"}"
```

### Update Keyword

```bash
KW_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/blocked_keywords?id=eq.$KW_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"contact","notes":"Updated reason"}'
```

### Delete Keyword

```bash
KW_ID="SOME-UUID"
curl -X DELETE "$SUPABASE_URL/rest/v1/blocked_keywords?id=eq.$KW_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Admin — Users

### List Users

```bash
curl "$SUPABASE_URL/rest/v1/profiles?select=id,full_name,phone,location,is_admin,is_banned,banned_at,last_seen_at,created_at&order=created_at.desc&limit=200" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Ban User

```bash
TARGET_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$TARGET_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"is_banned\":true,
    \"banned_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"banned_reason\":\"Spamming external contact info\"
  }"
```

### Unban User

```bash
TARGET_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$TARGET_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_banned":false,"banned_at":null,"banned_reason":null}'
```

### Promote To Admin

```bash
TARGET_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$TARGET_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_admin":true}'
```

### Demote Admin

```bash
TARGET_ID="SOME-UUID"
curl -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$TARGET_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_admin":false}'
```

---

## Admin — Activity Logs

### List Activity Logs

```bash
curl "$SUPABASE_URL/rest/v1/admin_activity_logs?select=*&order=created_at.desc&limit=200" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Write Activity Log

```bash
TARGET_ID="SOME-UUID"
curl -X POST "$SUPABASE_URL/rest/v1/admin_activity_logs" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"admin_id\":\"$USER_ID\",
    \"action\":\"approve_listing\",
    \"target_type\":\"listing\",
    \"target_id\":\"$TARGET_ID\",
    \"metadata\":{}
  }"
```

---

## Tips

- Add `-i` to any command to see response headers (useful for `Content-Range`
  on count queries).
- Pipe responses through `jq` for readable output: `… | jq`.
- For `404 jwt expired`, run **Refresh Token** above (or sign in again).
- For `401 invalid jwt`, the access token is wrong or missing — re-export it.
- For `403 new row violates row-level security policy`, the RLS rule rejected
  your insert/update. Common causes:
    - Token not admin when calling admin endpoints
    - `seller_id` / `user_id` in the body doesn't match `auth.uid()`
    - You're banned (`profiles.is_banned = true`)
- An empty `[]` response from an admin endpoint means RLS filtered everything
  out — usually because the token isn't admin.
