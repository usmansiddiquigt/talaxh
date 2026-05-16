// Centralized API surface — every screen talks to Supabase through this.
// Return shapes mirror the old Express responses so screen code stays small.

import { LISTING_BUCKET, supabase } from './supabase';

const profileMap = (rows) => {
  const m = {};
  (rows || []).forEach((p) => { m[p.id] = p; });
  return m;
};

const mapUserFromAuth = (authUser, profile) => ({
  id: authUser.id,
  email: authUser.email,
  fullName: profile?.full_name || authUser.user_metadata?.full_name || '',
  avatarUrl: profile?.avatar_url || null,
  phone: profile?.phone || authUser.user_metadata?.phone || '',
  location: profile?.location || '',
});

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

export async function register({ fullName, email, phone, password, confirmPassword }) {
  if (!fullName || !email || !password || !confirmPassword)
    throw new Error('Missing required fields');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (password !== confirmPassword) throw new Error('Passwords do not match');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone || null },
    },
  });
  if (error) throw new Error(error.message);
  return { user: data.user, session: data.session };
}

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  const profile = await getMyProfile(data.user.id);
  return { user: mapUserFromAuth(data.user, profile), session: data.session };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function sendPasswordReset(email) {
  if (!email) throw new Error('Email is required');
  const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_RESET_REDIRECT || 'talaxh://reset-password';
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword || !newPassword || !confirmPassword)
    throw new Error('All fields are required');
  if (newPassword.length < 8)
    throw new Error('New password must be at least 8 characters');
  if (newPassword !== confirmPassword)
    throw new Error('Passwords do not match');
  if (newPassword === currentPassword)
    throw new Error('New password must differ from current');

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not signed in');

  // Verify current password by re-signing-in with it.
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInErr) throw new Error('Current password is incorrect');

  const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updErr) throw new Error(updErr.message);
}

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────

async function getMyProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, phone, location')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export async function fetchMe() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not signed in');
  const profile = await getMyProfile(user.id);
  return mapUserFromAuth(user, profile);
}

export async function updateProfile({ fullName, phone, location, bio, avatarUrl }) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not signed in');

  const updates = { updated_at: new Date().toISOString() };
  if (fullName  !== undefined) updates.full_name  = fullName;
  if (phone     !== undefined) updates.phone      = phone;
  if (location  !== undefined) updates.location   = location;
  if (bio       !== undefined) updates.bio        = bio;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function heartbeat() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id);
}

export async function fetchSellerProfile(sellerId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sellerId)
    .maybeSingle();
  if (error || !profile) throw new Error('Profile not found');

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return { profile, listings: listings || [] };
}

// ─────────────────────────────────────────────────────────────
// LISTINGS
// ─────────────────────────────────────────────────────────────

export async function fetchListings({
  category, search, minPrice, maxPrice, city, sort = 'newest', page = 1, limit = 20,
} = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  let q = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .range(offset, offset + Number(limit) - 1);

  if (category && category !== 'all') q = q.eq('category', category);
  if (city)     q = q.ilike('city', `%${city}%`);
  if (minPrice) q = q.gte('price', Number(minPrice));
  if (maxPrice) q = q.lte('price', Number(maxPrice));
  if (search)   q = q.ilike('title', `%${search}%`);

  if (sort === 'price_asc')  q = q.order('price', { ascending: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false });
  else q = q.order('created_at', { ascending: false });

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  // Attach seller profiles (no FK relationship between listings.seller_id and profiles)
  const sellerIds = [...new Set((data || []).map(l => l.seller_id).filter(Boolean))];
  let pm = {};
  if (sellerIds.length) {
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name').in('id', sellerIds);
    pm = profileMap(profiles);
  }

  const listings = (data || []).map(l => ({ ...l, profiles: pm[l.seller_id] || null }));
  return { listings, total: count || 0, page: Number(page), limit: Number(limit) };
}

export async function fetchListingById(listingId) {
  const { data, error } = await supabase
    .from('listings').select('*').eq('id', listingId).single();
  if (error) throw new Error('Listing not found');

  let profile = null;
  if (data.seller_id) {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, full_name, phone, created_at, last_seen_at, is_email_verified, is_phone_verified')
      .eq('id', data.seller_id)
      .maybeSingle();
    profile = p || { id: data.seller_id };
  }

  // Best-effort view counter bump via RPC (bypasses the seller-only UPDATE policy).
  supabase.rpc('increment_listing_views', { p_listing_id: listingId }).then(() => {}, () => {});

  return { ...data, profiles: profile };
}

export async function fetchMyListings(status) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  let q = supabase
    .from('listings').select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteListing(listingId) {
  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) throw new Error(error.message);
}

export async function setListingStatus(listingId, status) {
  if (!['active', 'sold', 'draft'].includes(status))
    throw new Error('Invalid status');
  const { data, error } = await supabase
    .from('listings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * @param {Object} fields                  listing column values
 * @param {Array<{uri,name,type}>} photoFiles  local files to upload
 * @returns {Promise<Object>}              the inserted listing row
 */
export async function createListing(fields, photoFiles = []) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const photoUrls = await uploadListingPhotos(user.id, photoFiles);

  const row = normalizeListingFields(fields);
  row.seller_id = user.id;
  row.photos = photoUrls;

  const { data, error } = await supabase
    .from('listings').insert([row]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateListing(listingId, fields, photoFiles = []) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: existing, error: fetchErr } = await supabase
    .from('listings').select('seller_id, photos').eq('id', listingId).single();
  if (fetchErr) throw new Error('Listing not found');
  if (existing.seller_id !== user.id) throw new Error('Not authorized');

  const photoUrls = [...(existing.photos || [])];
  if (photoFiles.length) {
    photoUrls.push(...(await uploadListingPhotos(user.id, photoFiles)));
  }

  const updates = { ...normalizeListingFields(fields, /*partial*/ true),
                    updated_at: new Date().toISOString() };
  if (photoUrls.length) updates.photos = photoUrls;

  const { data, error } = await supabase
    .from('listings').update(updates).eq('id', listingId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

function normalizeListingFields(body, partial = false) {
  const out = {};
  const copyIfPresent = (k, transform = (v) => v) => {
    if (body[k] !== undefined && body[k] !== null) out[k] = transform(body[k]);
  };

  copyIfPresent('title');
  copyIfPresent('category');
  copyIfPresent('breed');
  copyIfPresent('gender');
  copyIfPresent('color');
  copyIfPresent('description');
  copyIfPresent('location');
  copyIfPresent('city');
  copyIfPresent('status');

  if (body.age_months !== undefined && body.age_months !== null)
    out.age_months = body.age_months === '' ? null : Number(body.age_months);
  if (body.price !== undefined && body.price !== null)
    out.price = body.price === '' ? null : Number(body.price);

  const bools = ['is_free','is_adoption','is_swap','is_vaccinated','is_microchipped',
                 'is_neutered','is_kc_registered','is_vet_checked'];
  bools.forEach(k => {
    if (body[k] !== undefined && body[k] !== null) {
      out[k] = body[k] === true || body[k] === 'true';
    }
  });

  if (!partial) {
    // Sensible defaults on create
    if (out.gender === undefined) out.gender = 'unknown';
    if (out.status === undefined) out.status = 'active';
  }
  return out;
}

// Upload an array of local image files into the user's folder. Returns public URLs.
async function uploadListingPhotos(userId, files) {
  const urls = [];
  for (const file of files) {
    if (!file?.uri) continue;
    if (typeof file === 'string') { urls.push(file); continue; } // already-uploaded URL

    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const contentType = file.type || (ext === 'png' ? 'image/png' : 'image/jpeg');

    // Pull the local file as an ArrayBuffer; supported on RN 0.72+.
    const res = await fetch(file.uri);
    const arrayBuffer = await res.arrayBuffer();

    const { error } = await supabase.storage
      .from(LISTING_BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) {
      console.warn('[uploadListingPhotos] failed', path, error.message);
      continue;
    }
    const { data: pub } = supabase.storage.from(LISTING_BUCKET).getPublicUrl(path);
    if (pub?.publicUrl) urls.push(pub.publicUrl);
  }
  return urls;
}

// ─────────────────────────────────────────────────────────────
// FAVORITES
// ─────────────────────────────────────────────────────────────

export async function fetchFavorites() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: favs, error } = await supabase
    .from('favorites')
    .select('id, created_at, listing_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const ids = [...new Set((favs || []).map(f => f.listing_id).filter(Boolean))];
  let lm = {};
  if (ids.length) {
    const { data: listings } = await supabase
      .from('listings').select('*').in('id', ids);
    (listings || []).forEach(l => { lm[l.id] = l; });
  }
  return (favs || []).map(f => ({
    id: f.id, created_at: f.created_at, listing: lm[f.listing_id] || null,
  }));
}

export async function toggleFavorite(listingId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: existing } = await supabase
    .from('favorites').select('id')
    .eq('user_id', user.id).eq('listing_id', listingId).maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
    return { favorited: false };
  }
  const { error } = await supabase
    .from('favorites').insert([{ user_id: user.id, listing_id: listingId }]);
  if (error) throw new Error(error.message);
  return { favorited: true };
}

export async function removeFavorite(listingId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('favorites').delete()
    .eq('user_id', user.id).eq('listing_id', listingId);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

export async function fetchNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('notifications').select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchUnreadNotificationCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
  return count || 0;
}

export async function markNotificationRead(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id);
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('is_read', false);
}

// ─────────────────────────────────────────────────────────────
// MESSAGING
// ─────────────────────────────────────────────────────────────

export async function fetchConversations() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: conv, error } = await supabase
    .from('conversations').select('*')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const convIds = (conv || []).map(c => c.id);
  if (convIds.length) {
    // Mark inbound messages "delivered" because the user is online.
    await supabase
      .from('messages')
      .update({ delivered_at: new Date().toISOString() })
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .is('delivered_at', null);
  }

  const userIds    = [...new Set((conv || []).flatMap(c => [c.buyer_id, c.seller_id]).filter(Boolean))];
  const listingIds = [...new Set((conv || []).map(c => c.listing_id).filter(Boolean))];

  let pm = {}, lm = {};
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name').in('id', userIds);
    pm = profileMap(profiles);
  }
  if (listingIds.length) {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, photos, price, is_free, is_adoption')
      .in('id', listingIds);
    (listings || []).forEach(l => { lm[l.id] = l; });
  }

  const withLast = await Promise.all((conv || []).map(async (c) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('body, created_at, sender_id, is_read')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const { count: unread } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', c.id)
      .eq('is_read', false)
      .neq('sender_id', user.id);
    return {
      ...c,
      listing: lm[c.listing_id] || null,
      buyer:   pm[c.buyer_id]   ? { id: c.buyer_id,  full_name: pm[c.buyer_id].full_name }  : null,
      seller:  pm[c.seller_id]  ? { id: c.seller_id, full_name: pm[c.seller_id].full_name } : null,
      lastMessage: msgs?.[0] || null,
      unreadCount: unread || 0,
    };
  }));

  return withLast;
}

export async function fetchMessages(conversationId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('messages').select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  // Mark inbound messages as delivered and read.
  const now = new Date().toISOString();
  await supabase
    .from('messages')
    .update({ delivered_at: now })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('delivered_at', null);
  await supabase
    .from('messages')
    .update({ is_read: true, read_at: now })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  return data || [];
}

export async function getOrCreateConversation(listingId, initialMessage) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: listing } = await supabase
    .from('listings').select('seller_id, title').eq('id', listingId).maybeSingle();
  if (!listing) throw new Error('Listing not found');
  if (listing.seller_id === user.id) throw new Error('You cannot message yourself');

  let { data: conv } = await supabase
    .from('conversations').select('*')
    .eq('listing_id', listingId).eq('buyer_id', user.id).maybeSingle();

  if (!conv) {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert([{ listing_id: listingId, buyer_id: user.id, seller_id: listing.seller_id }])
      .select().single();
    if (error) throw new Error(error.message);
    conv = newConv;
  }

  if (initialMessage) {
    await sendMessage(conv.id, initialMessage);
  }
  return conv;
}

export async function sendMessage(conversationId, body) {
  const text = (body || '').trim();
  if (!text) throw new Error('Message body is required');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('messages')
    .insert([{ conversation_id: conversationId, sender_id: user.id, body: text }])
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}
