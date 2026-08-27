const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'emotional-child-reader-secret-key-2026';

app.use(cors());
app.use(express.json());

// In-memory isolated user store for Auth Service
const users = [
  {
    id: 'usr-001',
    username: 'demo_parent',
    email: 'parent@example.com',
    password: 'password123',
    child_name: 'Alex'
  }
];

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', port: Number(PORT) });
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password, child_name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    username: username || email.split('@')[0],
    email,
    password,
    child_name: child_name || 'Little Reader'
  };
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, email: newUser.email, child_name: newUser.child_name }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ status: 'success', user: { id: newUser.id, email: newUser.email, child_name: newUser.child_name }, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, child_name: user.child_name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ status: 'success', user: { id: user.id, email: user.email, child_name: user.child_name }, token });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(PORT, () => {
  console.log(`[auth-service] Running on port ${PORT}`);
});

module.exports = app;
