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

// ── Auth middleware ───────────────────────────────────────────
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
      .select(`
        *,
        profiles:seller_id ( full_name, avatar_url, location )
      `, { count: 'exact' })
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

    return res.json({ listings: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/listings/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select(`
        *,
        profiles:seller_id ( id, full_name, avatar_url, location, created_at, is_phone_verified, is_email_verified )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ message: 'Listing not found' });

    // Increment view count
    await supabaseAdmin
      .from('listings')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', req.params.id);

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/listings', requireAuth, upload.array('photos', 6), async (req, res) => {
  try {
    const body = req.body;
    const photoUrls = [];

    // Upload photos to Supabase Storage
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `${req.user.id}/${Date.now()}_${file.originalname}`;
        const { error: uploadErr } = await supabaseAdmin.storage
          .from('listing-photos')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage
            .from('listing-photos')
            .getPublicUrl(fileName);
          photoUrls.push(urlData.publicUrl);
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
    return res.status(201).json({ message: 'Listing created ✅', listing: data });
  } catch (err) {
    console.error(err);
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
        const fileName = `${req.user.id}/${Date.now()}_${file.originalname}`;
        const { error: uploadErr } = await supabaseAdmin.storage
          .from('listing-photos')
          .upload(fileName, file.buffer, { contentType: file.mimetype });
        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage
            .from('listing-photos')
            .getPublicUrl(fileName);
          photoUrls.push(urlData.publicUrl);
        }
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
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .select(`
        id, created_at,
        listing:listing_id (
          *,
          profiles:seller_id ( full_name, avatar_url )
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ favorites: data || [] });
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
//  MESSAGING
// ══════════════════════════════════════════════════════════════

app.get('/conversations', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        listing:listing_id ( id, title, photos, price, is_free, is_adoption ),
        buyer:buyer_id ( id, full_name:profiles(full_name), avatar_url:profiles(avatar_url) ),
        seller:seller_id ( id, full_name:profiles(full_name), avatar_url:profiles(avatar_url) )
      `)
      .or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    // Attach last message to each conversation
    const withLastMessage = await Promise.all(
      (data || []).map(async (conv) => {
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

        return { ...conv, lastMessage: msgs?.[0] || null, unreadCount: unread || 0 };
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

    // Mark messages as read
    await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', req.params.id)
      .neq('sender_id', req.user.id);

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
