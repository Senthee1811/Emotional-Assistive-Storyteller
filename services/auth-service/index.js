const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'emotional-child-reader-secret-key-2026';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    port: Number(PORT),
    database: 'SQLite (Persistent users_app.db)',
    timestamp: new Date().toISOString()
  });
});

// Register User
const handleRegister = async (req, res) => {
  try {
    const { username, email, password, role, child_name } = req.body;
    if (!password || (!email && !username)) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const effectiveEmail = email || `${username}@example.com`;
    const effectiveUsername = username || email.split('@')[0];

    const existing = await db.findUserByEmailOrUsername(effectiveEmail) || await db.findUserByEmailOrUsername(effectiveUsername);
    if (existing) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const userId = `usr-${Date.now()}`;
    const newUser = await db.createUser({
      id: userId,
      username: effectiveUsername,
      email: effectiveEmail,
      password,
      role: role || 'child',
      child_name: child_name || effectiveUsername
    });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'Account registered successfully',
      user: newUser,
      token
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Database registration error', details: err.message });
  }
};

// Login User
const handleLogin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier (email/username) and password are required' });
    }

    const user = await db.findUserByEmailOrUsername(identifier);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      child_name: user.child_name,
      stories_read: user.stories_read,
      avg_fluency: user.avg_fluency
    };

    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      status: 'success',
      message: 'Logged in successfully',
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Database login error', details: err.message });
  }
};

// Get Current User Profile
const handleMe = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Get All Users (Real-time Live API)
const handleGetUsers = async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json({ total: users.length, users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users', details: err.message });
  }
};

// Record Reading Progress
const handleRecordProgress = async (req, res) => {
  try {
    const { userId, story_id, story_title, emotion, duration_seconds } = req.body;
    if (!userId || !story_id) {
      return res.status(400).json({ error: 'userId and story_id are required' });
    }

    const result = await db.recordReadingProgress(userId, {
      story_id,
      story_title: story_title || 'Story',
      emotion: emotion || 'happy',
      duration_seconds: duration_seconds || 60
    });

    res.json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record progress', details: err.message });
  }
};

// User Reading History
const handleGetHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await db.getUserHistory(userId);
    res.json({ userId, history, count: history.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve history', details: err.message });
  }
};

// Bind routes (both root and /api/auth prefixed)
app.post('/register', handleRegister);
app.post('/api/auth/register', handleRegister);

app.post('/login', handleLogin);
app.post('/api/auth/login', handleLogin);

app.get('/me', handleMe);
app.get('/api/auth/me', handleMe);

app.get('/users', handleGetUsers);
app.get('/api/auth/users', handleGetUsers);

app.post('/progress', handleRecordProgress);
app.post('/api/auth/progress', handleRecordProgress);

app.get('/history/:userId', handleGetHistory);
app.get('/api/auth/history/:userId', handleGetHistory);

app.listen(PORT, () => {
  console.log(`🚀 [auth-service] Running on port ${PORT} with persistent SQLite`);
});

module.exports = app;
