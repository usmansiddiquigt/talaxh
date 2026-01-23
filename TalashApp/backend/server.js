require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

//const EXPORT_API_URL = process.env.EXPORT_API_URL; // <-- your PC IP

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Test route
app.get('/', (req, res) => res.send('Talaxh API running ✅'));

// Signup route
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
    // check email exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    if (existing.length) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [fullName, email, phone || null, password_hash],
    );

    return res.status(201).json({
      message: 'User created',
      user: { id: result.insertId, fullName, email, phone: phone || null },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, full_name, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      message: 'Login successful',
      user: { id: user.id, fullName: user.full_name, email: user.email },
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
    const [rows] = await pool.execute(
      'SELECT id, email FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    // For security, we still return success even if user doesn't exist
    if (!rows.length) {
      return res.json({
        message: 'If the email exists, a reset link has been sent.',
      });
    }

    const user = rows[0];

    // generate token
    const token = crypto.randomBytes(32).toString('hex');
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const expiresSQL = expires.toISOString().slice(0, 19).replace('T', ' ');

    // remove old tokens for this user (optional)
    await pool.execute('DELETE FROM password_resets WHERE user_id = ?', [
      user.id,
    ]);

    // store token hash
    await pool.execute(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, token_hash, expiresSQL],
    );

    // DEMO: return token in response (don’t do this in production)
    return res.json({
      message: 'Reset link generated (demo).',
      resetToken: token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
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
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    const [rows] = await pool.execute(
      `SELECT pr.user_id
       FROM password_resets pr
       WHERE pr.token_hash = ?
       AND pr.expires_at > UTC_TIMESTAMP()
       LIMIT 1`,
      [token_hash],
    );

    if (!rows.length) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const userId = rows[0].user_id;
    const password_hash = await bcrypt.hash(newPassword, 10);

    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [
      password_hash,
      userId,
    ]);

    await pool.execute('DELETE FROM password_resets WHERE user_id = ?', [
      userId,
    ]);

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});
