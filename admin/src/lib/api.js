// Admin API helpers. Every mutation logs to admin_activity_logs.

import { LISTING_BUCKET, supabase } from './supabase';

async function currentAdminId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

async function logAction(action, targetType, targetId, metadata = {}) {
  const adminId = await currentAdminId();
  if (!adminId) return;
  await supabase.from('admin_activity_logs').insert([{
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  }]);
}

// ─────────────────────────────────────────────────────────────
// Dashboard counts
// ─────────────────────────────────────────────────────────────

export async function fetchDashboardCounts() {
  const [pending, approved, rejected, users] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'pending'),
    supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'approved'),
    supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'rejected'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  return {
    pending:  pending.count  || 0,
    approved: approved.count || 0,
    rejected: rejected.count || 0,
    users:    users.count    || 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Listings
// ─────────────────────────────────────────────────────────────

const profileMap = (rows) => {
  const m = {};
  (rows || []).forEach((p) => { m[p.id] = p; });
  return m;
};

export async function fetchListings({ moderation, category, search, dateFrom, dateTo } = {}) {
  let q = supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (moderation && moderation !== 'all') q = q.eq('moderation_status', moderation);
  if (category   && category   !== 'all') q = q.eq('category', category);
  if (search)   q = q.ilike('title', `%${search}%`);
  if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo)   q = q.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const sellerIds = [...new Set((data || []).map(l => l.seller_id).filter(Boolean))];
  let pm = {};
  if (sellerIds.length) {
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, phone, is_banned').in('id', sellerIds);
    pm = profileMap(profiles);
  }
  return (data || []).map(l => ({ ...l, seller: pm[l.seller_id] || null }));
}

export async function fetchListingById(id) {
  const { data, error } = await supabase
    .from('listings').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  let seller = null;
  if (data.seller_id) {
    const { data: p } = await supabase
      .from('profiles').select('*').eq('id', data.seller_id).maybeSingle();
    seller = p || null;
  }
  return { ...data, seller };
}

export async function approveListing(listingId) {
  const adminId = await currentAdminId();
  const { error } = await supabase.from('listings').update({
    moderation_status: 'approved',
    rejection_reason: null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
  }).eq('id', listingId);
  if (error) throw new Error(error.message);
  await logAction('approve_listing', 'listing', listingId);
}

export async function rejectListing(listingId, reason) {
  const adminId = await currentAdminId();
  const { error } = await supabase.from('listings').update({
    moderation_status: 'rejected',
    rejection_reason: reason || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
  }).eq('id', listingId);
  if (error) throw new Error(error.message);
  await logAction('reject_listing', 'listing', listingId, { rejection_reason: reason || null });
}

export async function deleteListing(listingId) {
  // Fetch photos first so we can clear them from storage after delete.
  const { data: existing } = await supabase
    .from('listings').select('photos').eq('id', listingId).maybeSingle();

  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) throw new Error(error.message);

  // Storage cleanup is best-effort.
  const paths = (existing?.photos || [])
    .map(extractStoragePath)
    .filter(Boolean);
  if (paths.length) {
    try { await supabase.storage.from(LISTING_BUCKET).remove(paths); } catch { /* ignore */ }
  }

  await logAction('delete_listing', 'listing', listingId, { photos_removed: paths.length });
}

// A photo URL looks like https://<project>.supabase.co/storage/v1/object/public/listing-photos/<uid>/<file>
// We need to pull the bit after "listing-photos/".
function extractStoragePath(url) {
  if (!url) return null;
  const marker = `/${LISTING_BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? url.slice(i + marker.length) : null;
}

// ─────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────

export async function fetchUsers({ search } = {}) {
  let q = supabase
    .from('profiles')
    .select('id, full_name, phone, location, is_admin, is_banned, banned_at, banned_reason, last_seen_at, last_sign_in_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (search) q = q.ilike('full_name', `%${search}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function banUser(userId, reason) {
  const { error } = await supabase.from('profiles').update({
    is_banned: true,
    banned_at: new Date().toISOString(),
    banned_reason: reason || null,
  }).eq('id', userId);
  if (error) throw new Error(error.message);
  await logAction('ban_user', 'user', userId, { reason: reason || null });
}

export async function unbanUser(userId) {
  const { error } = await supabase.from('profiles').update({
    is_banned: false,
    banned_at: null,
    banned_reason: null,
  }).eq('id', userId);
  if (error) throw new Error(error.message);
  await logAction('unban_user', 'user', userId);
}

export async function promoteToAdmin(userId) {
  const { error } = await supabase.from('profiles')
    .update({ is_admin: true }).eq('id', userId);
  if (error) throw new Error(error.message);
  await logAction('promote_admin', 'user', userId);
}

export async function demoteAdmin(userId) {
  const { error } = await supabase.from('profiles')
    .update({ is_admin: false }).eq('id', userId);
  if (error) throw new Error(error.message);
  await logAction('demote_admin', 'user', userId);
}

// ─────────────────────────────────────────────────────────────
// Blocked keywords
// ─────────────────────────────────────────────────────────────

export async function fetchKeywords() {
  const { data, error } = await supabase
    .from('blocked_keywords')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addKeyword({ keyword, category, notes }) {
  const adminId = await currentAdminId();
  const { data, error } = await supabase.from('blocked_keywords')
    .insert([{ keyword, category: category || null, notes: notes || null, created_by: adminId }])
    .select().single();
  if (error) throw new Error(error.message);
  await logAction('add_keyword', 'keyword', data.id, { keyword: data.keyword });
  return data;
}

export async function updateKeyword(id, { keyword, category, notes }) {
  const patch = {};
  if (keyword  !== undefined) patch.keyword  = keyword;
  if (category !== undefined) patch.category = category || null;
  if (notes    !== undefined) patch.notes    = notes    || null;
  const { data, error } = await supabase.from('blocked_keywords')
    .update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  await logAction('edit_keyword', 'keyword', id, patch);
  return data;
}

export async function removeKeyword(id) {
  const { data: existing } = await supabase.from('blocked_keywords')
    .select('keyword').eq('id', id).maybeSingle();
  const { error } = await supabase.from('blocked_keywords').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await logAction('remove_keyword', 'keyword', id, { keyword: existing?.keyword });
}

// ─────────────────────────────────────────────────────────────
// Held messages
// ─────────────────────────────────────────────────────────────

export async function fetchHeldMessages({ status = 'under_review' } = {}) {
  let q = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status && status !== 'all') q = q.eq('moderation_status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const senderIds = [...new Set((data || []).map(m => m.sender_id).filter(Boolean))];
  const convIds   = [...new Set((data || []).map(m => m.conversation_id).filter(Boolean))];

  let pm = {}, cm = {};
  if (senderIds.length) {
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, is_banned').in('id', senderIds);
    pm = profileMap(profiles);
  }
  if (convIds.length) {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, listing_id, buyer_id, seller_id')
      .in('id', convIds);
    (convs || []).forEach(c => { cm[c.id] = c; });
  }
  return (data || []).map(m => ({
    ...m,
    sender: pm[m.sender_id] || null,
    conversation: cm[m.conversation_id] || null,
  }));
}

export async function approveMessage(messageId) {
  const adminId = await currentAdminId();
  const { error } = await supabase.from('messages').update({
    moderation_status: 'approved',
    rejection_reason: null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
  }).eq('id', messageId);
  if (error) throw new Error(error.message);
  await logAction('approve_message', 'message', messageId);
}

export async function rejectMessage(messageId, reason) {
  const adminId = await currentAdminId();
  const { error } = await supabase.from('messages').update({
    moderation_status: 'rejected',
    rejection_reason: reason || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
  }).eq('id', messageId);
  if (error) throw new Error(error.message);
  await logAction('reject_message', 'message', messageId, { rejection_reason: reason || null });
}

export async function fetchHeldCount() {
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('moderation_status', 'under_review');
  return count || 0;
}

// ─────────────────────────────────────────────────────────────
// Activity log
// ─────────────────────────────────────────────────────────────

export async function fetchActivityLogs({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const adminIds = [...new Set((data || []).map(l => l.admin_id).filter(Boolean))];
  let pm = {};
  if (adminIds.length) {
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name').in('id', adminIds);
    pm = profileMap(profiles);
  }
  return (data || []).map(l => ({ ...l, admin: pm[l.admin_id] || null }));
}
