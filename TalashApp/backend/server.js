require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase clients
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// Test route
app.get('/', (req, res) => res.json({ message: 'Talaxh API running ✅' }));

/**
 * SIGNUP
 * Body: { fullName, email, phone, password, confirmPassword }
 */
app.post('/auth/register', async (req, res) => {
  const { fullName, email, phone, password, confirmPassword } = req.body;

  if (!fullName || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: 'Password must be at least 8 characters' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    // Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // login immediately
    });

    if (error) return res.status(400).json({ message: error.message });

    const user = data.user;

    // Insert extra fields in profiles
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .insert([{ id: user.id, full_name: fullName, phone: phone || null }]);

    if (profileErr)
      return res.status(400).json({ message: profileErr.message });

    return res.status(201).json({
      message: 'User created ✅',
      user: { id: user.id, fullName, email, phone: phone || null },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * LOGIN
 * Body: { email, password }
 */
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ message: error.message });

    return res.json({
      message: 'Login successful ✅',
      user: { id: data.user.id, email: data.user.email },
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * FORGOT PASSWORD
 * Body: { email }
 */
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const redirectTo =
      process.env.SUPABASE_RESET_REDIRECT || 'talaxh://reset-password';

    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) return res.status(400).json({ message: error.message });

    return res.json({
      message: 'If the email exists, a reset link has been sent ✅',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * RESET PASSWORD
 * Body: { access_token, newPassword, confirmPassword }
 */
app.post('/auth/reset-password', async (req, res) => {
  const { access_token, newPassword, confirmPassword } = req.body;

  if (!access_token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ message: 'Password must be at least 8 characters' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    // 1) Get user from the token
    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(access_token);
    if (userErr || !userData?.user) {
      return res
        .status(401)
        .json({ message: 'Invalid or expired access token' });
    }

    // 2) Admin update password
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password: newPassword },
    );
    if (updErr) return res.status(400).json({ message: updErr.message });

    return res.json({ message: 'Password reset successful ✅' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// JSON 404 so frontend never gets HTML
app.use((req, res) => {
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
