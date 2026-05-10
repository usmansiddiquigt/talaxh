require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Supabase clients ──────────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const LISTING_BUCKET = 'listing-photos';

// Ensure the Storage bucket exists and is public at boot
async function ensureBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = (buckets || []).some(b => b.name === LISTING_BUCKET);
    if (!exists) {
      const { error } = await supabaseAdmin.storage.createBucket(LISTING_BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
      });
      if (error) console.error('Failed to create bucket:', error.message);
      else console.log(`✅ Created public bucket "${LISTING_BUCKET}"`);
    } else {
      // Make sure it's public (idempotent)
      await supabaseAdmin.storage.updateBucket(LISTING_BUCKET, { public: true });
    }
  } catch (e) {
    console.error('ensureBucket error:', e.message);
  }
}
ensureBucket();

// ── Notification helper ───────────────────────────────────────
async function notify(userId, type, title, body, data = {}) {
  if (!userId) return;
  try {
    await supabaseAdmin
      .from('notifications')
      .insert([{ user_id: userId, type, title, body, data }]);
  } catch (e) {
    console.error('[notify] failed:', e.message);
  }
}

// Returns true if a similar notification exists in the last `windowMs` ms.
async function recentNotificationExists(userId, type, dataMatch, windowMs = 3600_000) {
  const since = new Date(Date.now() - windowMs).toISOString();
  let q = supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', since);
  for (const [k, v] of Object.entries(dataMatch || {})) {
    q = q.eq(`data->>${k}`, String(v));
  }
  const { count } = await q;
  return (count || 0) > 0;
}

// ── Auth middleware ───────────────────────────────────────────
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(authHeader.split(' ')[1]);
      if (data?.user) req.user = data.user;
    } catch { /* ignore */ }
  }
  next();
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  req.user = data.user;
  next();
}

// ── Health ────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'Talaxh API running ✅' }));

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════

app.post('/auth/register', async (req, res) => {
  const { fullName, email, phone, password, confirmPassword } = req.body;
  if (!fullName || !email || !password || !confirmPassword)
    return res.status(400).json({ message: 'Missing required fields' });
  if (password.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  if (password !== confirmPassword)
    return res.status(400).json({ message: 'Passwords do not match' });

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (error) return res.status(400).json({ message: error.message });

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .insert([{ id: data.user.id, full_name: fullName, phone: phone || null }]);
    if (profileErr) return res.status(400).json({ message: profileErr.message });

    return res.status(201).json({
      message: 'User created ✅',
      user: { id: data.user.id, fullName, email, phone: phone || null },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Missing email or password' });

  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ message: error.message });

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, avatar_url, phone, location')
      .eq('id', data.user.id)
      .single();

    return res.json({
      message: 'Login successful ✅',
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: profile?.full_name || '',
        avatarUrl: profile?.avatar_url || null,
        phone: profile?.phone || '',
        location: profile?.location || '',
      },
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const redirectTo = process.env.SUPABASE_RESET_REDIRECT || 'talaxh://reset-password';
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return res.status(400).json({ message: error.message });
    return res.json({ message: 'If the email exists, a reset link has been sent ✅' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin-triggered reset: set any user's password directly. Guarded by
// ADMIN_RESET_KEY in the server's .env; do NOT expose this to the client.
app.post('/auth/admin-reset-password', async (req, res) => {
  if (!process.env.ADMIN_RESET_KEY) {
    return res.status(503).json({ message: 'ADMIN_RESET_KEY not configured on server' });
  }
  if (req.headers['x-admin-key'] !== process.env.ADMIN_RESET_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { email, newPassword } = req.body || {};
  if (!email || !newPassword)
    return res.status(400).json({ message: 'email and newPassword are required' });
  if (newPassword.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });

  try {
    // Locate user by email (paginated)
    let userId = null;
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return res.status(500).json({ message: error.message });
      const match = (data?.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (match) { userId = match.id; break; }
      if (!data?.users?.length || data.users.length < 1000) break;
      page++;
    }
    if (!userId) return res.status(404).json({ message: 'No user with that email' });

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      userId, { password: newPassword },
    );
    if (updErr) return res.status(400).json({ message: updErr.message });

    return res.json({ message: 'Password reset ✅', userId });
  } catch (err) {
    console.error('[admin-reset-password] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Self-service password change for the signed-in user.
app.post('/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  if (!currentPassword || !newPassword || !confirmPassword)
    return res.status(400).json({ message: 'All fields are required' });
  if (newPassword.length < 8)
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: 'Passwords do not match' });
  if (newPassword === currentPassword)
    return res.status(400).json({ message: 'New password must differ from current' });

  try {
    // Verify current password
    const { error: signInErr } = await supabaseAnon.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    });
    if (signInErr) return res.status(401).json({ message: 'Current password is incorrect' });

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id, { password: newPassword },
    );
    if (updErr) return res.status(400).json({ message: updErr.message });

    return res.json({ message: 'Password changed successfully ✅' });
  } catch (err) {
    console.error('[change-password] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/auth/reset-password', async (req, res) => {
  const { access_token, newPassword, confirmPassword } = req.body;
  if (!access_token || !newPassword || !confirmPassword)
    return res.status(400).json({ message: 'Missing fields' });
  if (newPassword.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: 'Passwords do not match' });

  try {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(access_token);
    if (userErr || !userData?.user)
      return res.status(401).json({ message: 'Invalid or expired access token' });

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id, { password: newPassword },
    );
    if (updErr) return res.status(400).json({ message: updErr.message });

    return res.json({ message: 'Password reset successful ✅' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════════════════════════

app.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return res.status(404).json({ message: 'Profile not found' });

    const { data: listings } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('seller_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    return res.json({ profile, listings: listings || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, avatar_url, phone, location')
      .eq('id', req.user.id)
      .single();
    return res.json({
      user: {
        id:        req.user.id,
        email:     req.user.email,
        fullName:  profile?.full_name || '',
        avatarUrl: profile?.avatar_url || null,
        phone:     profile?.phone || '',
        location:  profile?.location || '',
      },
    });
  } catch (err) {
    console.error('[GET /me] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/me/heartbeat', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', req.user.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('heartbeat error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.put('/profile', requireAuth, async (req, res) => {
  const { fullName, phone, location, bio, avatarUrl } = req.body;
  try {
    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (location !== undefined) updates.location = location;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) return res.status(400).json({ message: error.message });

    return res.json({ message: 'Profile updated ✅', profile: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  LISTINGS
// ══════════════════════════════════════════════════════════════

app.get('/listings', async (req, res) => {
  const { category, search, minPrice, maxPrice, city, sort = 'newest', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query = supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .range(offset, offset + Number(limit) - 1);

    if (category && category !== 'all') query = query.eq('category', category);
    if (city) query = query.ilike('city', `%${city}%`);
    if (minPrice) query = query.gte('price', Number(minPrice));
    if (maxPrice) query = query.lte('price', Number(maxPrice));
    if (search) query = query.ilike('title', `%${search}%`);

    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    else if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price', { ascending: false });

    const { data, error, count } = await query;
    if (error) return res.status(400).json({ message: error.message });

    // Attach seller profiles manually (no FK constraint needed)
    const sellerIds = [...new Set((data || []).map(l => l.seller_id).filter(Boolean))];
    let profileMap = {};
    if (sellerIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', sellerIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }

    const listings = (data || []).map(l => ({
      ...l,
      profiles: profileMap[l.seller_id] || null,
    }));

    return res.json({ listings, total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/listings/:id', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ message: 'Listing not found' });

    // Attach seller profile manually
    let profile = null;
    if (data.seller_id) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone, created_at, last_seen_at, is_email_verified, is_phone_verified')
        .eq('id', data.seller_id)
        .single();
      profile = p || { id: data.seller_id };

      // Backfill from auth.users if profile is missing fields
      if (!profile.created_at || !profile.full_name) {
        try {
          const { data: au } = await supabaseAdmin.auth.admin.getUserById(data.seller_id);
          const u = au?.user;
          if (u) {
            if (!profile.created_at) profile.created_at = u.created_at;
            if (!profile.full_name) {
              profile.full_name =
                u.user_metadata?.full_name ||
                (u.email || '').split('@')[0] ||
                'Seller';
            }
          }
        } catch { /* ignore */ }
      }
    }

    // Increment view count
    await supabaseAdmin
      .from('listings')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', req.params.id);

    // Notify the seller that someone viewed their listing — only when:
    // - viewer is signed in
    // - viewer is not the seller themselves
    // - we haven't notified about this same (viewer, listing) in the last hour
    if (req.user && req.user.id !== data.seller_id) {
      try {
        const recent = await recentNotificationExists(
          data.seller_id,
          'listing_viewed',
          { listing_id: req.params.id, viewer_id: req.user.id },
          3600_000,
        );
        if (!recent) {
          const { data: viewerProfile } = await supabaseAdmin
            .from('profiles').select('full_name').eq('id', req.user.id).single();
          const viewerName = viewerProfile?.full_name || 'Someone';
          notify(data.seller_id, 'listing_viewed',
            `${viewerName} viewed your listing`,
            `Your ad "${data.title}" was viewed.`,
            { listing_id: req.params.id, viewer_id: req.user.id });
        }
      } catch { /* ignore */ }
    }

    return res.json({ ...data, profiles: profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/listings', requireAuth, upload.array('photos', 6), async (req, res) => {
  try {
    const body = req.body;
    const photoUrls = [];
    const uploadErrors = [];

    console.log(`[POST /listings] user=${req.user.id} files=${req.files?.length || 0}`);

    // Upload photos to Supabase Storage
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const safeName = (file.originalname || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${req.user.id}/${Date.now()}_${safeName}`;
        console.log(`  → uploading ${fileName} (${file.size} bytes, ${file.mimetype})`);
        const { error: uploadErr } = await supabaseAdmin.storage
          .from(LISTING_BUCKET)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype || 'image/jpeg',
            upsert: false,
          });

        if (uploadErr) {
          console.error(`  ✗ Photo upload failed (${fileName}):`, uploadErr.message);
          uploadErrors.push(uploadErr.message);
          continue;
        }
        const { data: urlData } = supabaseAdmin.storage
          .from(LISTING_BUCKET)
          .getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          console.log(`  ✓ uploaded → ${urlData.publicUrl}`);
          photoUrls.push(urlData.publicUrl);
        } else {
          console.error(`  ✗ no publicUrl returned for ${fileName}`);
          uploadErrors.push(`no publicUrl for ${fileName}`);
        }
      }
    }

    // Handle JSON photos array (base64 or URLs from client)
    if (body.photos && typeof body.photos === 'string') {
      const parsed = JSON.parse(body.photos);
      if (Array.isArray(parsed)) photoUrls.push(...parsed);
    }

    const listing = {
      seller_id: req.user.id,
      title: body.title,
      category: body.category,
      breed: body.breed || null,
      age_months: body.age_months ? Number(body.age_months) : null,
      gender: body.gender || 'unknown',
      color: body.color || null,
      price: body.price ? Number(body.price) : null,
      is_free: body.is_free === 'true' || body.is_free === true,
      is_adoption: body.is_adoption === 'true' || body.is_adoption === true,
      is_swap: body.is_swap === 'true' || body.is_swap === true,
      description: body.description || null,
      location: body.location || null,
      city: body.city || null,
      is_vaccinated: body.is_vaccinated === 'true' || body.is_vaccinated === true,
      is_microchipped: body.is_microchipped === 'true' || body.is_microchipped === true,
      is_neutered: body.is_neutered === 'true' || body.is_neutered === true,
      is_kc_registered: body.is_kc_registered === 'true' || body.is_kc_registered === true,
      is_vet_checked: body.is_vet_checked === 'true' || body.is_vet_checked === true,
      photos: photoUrls,
      status: body.status || 'active',
    };

    const { data, error } = await supabaseAdmin
      .from('listings')
      .insert([listing])
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });
    console.log(`[POST /listings] inserted ${data.id} with ${photoUrls.length} photo(s)`);

    // Notify the seller that their ad is live (unless saving as draft)
    if (data.status === 'active') {
      notify(req.user.id, 'listing_posted',
        'Your ad has been posted successfully',
        `"${data.title}" is now live on Talash.`,
        { listing_id: data.id });
    }

    return res.status(201).json({
      message: 'Listing created ✅',
      listing: data,
      uploadErrors: uploadErrors.length ? uploadErrors : undefined,
    });
  } catch (err) {
    console.error('[POST /listings] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.put('/listings/:id', requireAuth, upload.array('photos', 6), async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('listings')
      .select('seller_id, photos')
      .eq('id', req.params.id)
      .single();

    if (fetchErr) return res.status(404).json({ message: 'Listing not found' });
    if (existing.seller_id !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const body = req.body;
    const photoUrls = existing.photos || [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const safeName = (file.originalname || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${req.user.id}/${Date.now()}_${safeName}`;
        const { error: uploadErr } = await supabaseAdmin.storage
          .from(LISTING_BUCKET)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype || 'image/jpeg',
            upsert: false,
          });
        if (uploadErr) {
          console.error('Photo upload failed:', uploadErr.message);
          continue;
        }
        const { data: urlData } = supabaseAdmin.storage
          .from(LISTING_BUCKET)
          .getPublicUrl(fileName);
        if (urlData?.publicUrl) photoUrls.push(urlData.publicUrl);
      }
    }

    const updates = { updated_at: new Date().toISOString() };
    const fields = ['title','category','breed','gender','color','description','location','city'];
    fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    if (body.age_months !== undefined) updates.age_months = Number(body.age_months);
    if (body.price !== undefined) updates.price = Number(body.price);
    ['is_free','is_adoption','is_swap','is_vaccinated','is_microchipped','is_neutered','is_kc_registered','is_vet_checked'].forEach(f => {
      if (body[f] !== undefined) updates[f] = body[f] === 'true' || body[f] === true;
    });
    if (photoUrls.length > 0) updates.photos = photoUrls;

    const { data, error } = await supabaseAdmin
      .from('listings')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ message: 'Listing updated ✅', listing: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/listings/:id', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('listings')
      .select('seller_id')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ message: 'Listing not found' });
    if (existing.seller_id !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const { error } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ message: 'Listing deleted ✅' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/listings/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!['active', 'sold', 'draft'].includes(status))
    return res.status(400).json({ message: 'Invalid status' });

  try {
    const { data: existing } = await supabaseAdmin
      .from('listings')
      .select('seller_id')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ message: 'Listing not found' });
    if (existing.seller_id !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ message: 'Status updated ✅', listing: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// My own listings
app.get('/my-listings', requireAuth, async (req, res) => {
  const { status } = req.query;
  try {
    let query = supabaseAdmin
      .from('listings')
      .select('*')
      .eq('seller_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(400).json({ message: error.message });
    return res.json({ listings: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  FAVORITES
// ══════════════════════════════════════════════════════════════

app.get('/favorites', requireAuth, async (req, res) => {
  try {
    const { data: favData, error } = await supabaseAdmin
      .from('favorites')
      .select('id, created_at, listing_id')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const listingIds = [...new Set((favData || []).map(f => f.listing_id).filter(Boolean))];
    let listingMap = {};
    if (listingIds.length) {
      const { data: listings } = await supabaseAdmin
        .from('listings')
        .select('*')
        .in('id', listingIds);
      (listings || []).forEach(l => { listingMap[l.id] = l; });
    }

    const favorites = (favData || []).map(f => ({
      id: f.id,
      created_at: f.created_at,
      listing: listingMap[f.listing_id] || null,
    }));

    return res.json({ favorites });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/favorites/:listingId', requireAuth, async (req, res) => {
  const { listingId } = req.params;
  try {
    // Toggle: check if already favorited
    const { data: existing } = await supabaseAdmin
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('listing_id', listingId)
      .single();

    if (existing) {
      await supabaseAdmin.from('favorites').delete().eq('id', existing.id);
      return res.json({ favorited: false, message: 'Removed from favorites' });
    } else {
      await supabaseAdmin
        .from('favorites')
        .insert([{ user_id: req.user.id, listing_id: listingId }]);
      return res.json({ favorited: true, message: 'Added to favorites ✅' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/favorites/:listingId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('listing_id', req.params.listingId);

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

app.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return res.status(400).json({ message: error.message });
    return res.json({ notifications: data || [] });
  } catch (err) {
    console.error('[GET /notifications] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const { count } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    return res.json({ count: count || 0 });
  } catch (err) {
    console.error('[unread-count] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[mark read] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[read-all] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  MESSAGING
// ══════════════════════════════════════════════════════════════

app.get('/conversations', requireAuth, async (req, res) => {
  try {
    const { data: convData, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    // Mark all undelivered messages addressed to me as delivered.
    // Loading the chat list = device is online.
    const myConvIds = (convData || []).map(c => c.id);
    if (myConvIds.length) {
      await supabaseAdmin
        .from('messages')
        .update({ delivered_at: new Date().toISOString() })
        .in('conversation_id', myConvIds)
        .neq('sender_id', req.user.id)
        .is('delivered_at', null);
    }

    // Collect IDs for batch lookups
    const userIds = [...new Set([
      ...(convData || []).map(c => c.buyer_id),
      ...(convData || []).map(c => c.seller_id),
    ].filter(Boolean))];

    const listingIds = [...new Set((convData || []).map(c => c.listing_id).filter(Boolean))];

    // Batch fetch profiles and listings
    let profileMap = {}, listingMap = {};
    if (userIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles').select('id, full_name').in('id', userIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    if (listingIds.length) {
      const { data: listings } = await supabaseAdmin
        .from('listings').select('id, title, photos, price, is_free, is_adoption').in('id', listingIds);
      (listings || []).forEach(l => { listingMap[l.id] = l; });
    }

    // Attach last message + unread count to each conversation
    const withLastMessage = await Promise.all(
      (convData || []).map(async (conv) => {
        const { data: msgs } = await supabaseAdmin
          .from('messages')
          .select('body, created_at, sender_id, is_read')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count: unread } = await supabaseAdmin
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', req.user.id);

        return {
          ...conv,
          listing: listingMap[conv.listing_id] || null,
          buyer: profileMap[conv.buyer_id] ? { id: conv.buyer_id, full_name: profileMap[conv.buyer_id].full_name } : null,
          seller: profileMap[conv.seller_id] ? { id: conv.seller_id, full_name: profileMap[conv.seller_id].full_name } : null,
          lastMessage: msgs?.[0] || null,
          unreadCount: unread || 0,
        };
      }),
    );

    return res.json({ conversations: withLastMessage });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    // Verify participant
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', req.params.id)
      .single();

    if (!conv || (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id))
      return res.status(403).json({ message: 'Not authorized' });

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ message: error.message });

    // Mark inbound messages delivered (if not yet) and read (always when viewing).
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('messages')
      .update({ delivered_at: now })
      .eq('conversation_id', req.params.id)
      .neq('sender_id', req.user.id)
      .is('delivered_at', null);
    await supabaseAdmin
      .from('messages')
      .update({ is_read: true, read_at: now })
      .eq('conversation_id', req.params.id)
      .neq('sender_id', req.user.id)
      .is('read_at', null);

    return res.json({ messages: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/conversations', requireAuth, async (req, res) => {
  const { listingId, initialMessage } = req.body;
  if (!listingId) return res.status(400).json({ message: 'listingId is required' });

  try {
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('seller_id, title')
      .eq('id', listingId)
      .single();

    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.seller_id === req.user.id)
      return res.status(400).json({ message: 'You cannot message yourself' });

    // Get or create conversation
    let { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('listing_id', listingId)
      .eq('buyer_id', req.user.id)
      .single();

    if (!conv) {
      const { data: newConv, error } = await supabaseAdmin
        .from('conversations')
        .insert([{ listing_id: listingId, buyer_id: req.user.id, seller_id: listing.seller_id }])
        .select()
        .single();
      if (error) return res.status(400).json({ message: error.message });
      conv = newConv;
    }

    // Send initial message if provided
    if (initialMessage) {
      await supabaseAdmin
        .from('messages')
        .insert([{ conversation_id: conv.id, sender_id: req.user.id, body: initialMessage }]);
    }

    return res.status(201).json({ conversation: conv });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  const { body: msgBody } = req.body;
  if (!msgBody?.trim()) return res.status(400).json({ message: 'Message body is required' });

  try {
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', req.params.id)
      .single();

    if (!conv || (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id))
      return res.status(403).json({ message: 'Not authorized' });

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{ conversation_id: req.params.id, sender_id: req.user.id, body: msgBody.trim() }])
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });

    // Notify the recipient that they have a new message
    const recipientId = conv.buyer_id === req.user.id ? conv.seller_id : conv.buyer_id;
    if (recipientId) {
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles').select('full_name').eq('id', req.user.id).single();
      const senderName = senderProfile?.full_name || 'Someone';
      const preview = msgBody.trim().slice(0, 80);
      notify(recipientId, 'new_message',
        `New message from ${senderName}`,
        preview,
        { conversation_id: req.params.id, sender_id: req.user.id });
    }

    return res.status(201).json({ message: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── 404 fallback ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log(`Talaxh API running on port ${process.env.PORT || 5000}`);
});
