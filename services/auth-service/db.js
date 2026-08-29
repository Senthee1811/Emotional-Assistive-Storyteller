const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'users_app.db');
const db = new sqlite3.Database(DB_PATH);

// Initialize Tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'child',
      child_name TEXT DEFAULT 'Little Reader',
      stories_read INTEGER DEFAULT 0,
      avg_fluency REAL DEFAULT 90.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      story_id TEXT,
      story_title TEXT,
      emotion TEXT,
      duration_seconds INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS emotion_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      emotion TEXT,
      confidence REAL,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Seed default demo user if not exists
  db.get(`SELECT id FROM users WHERE email = ?`, ['parent@example.com'], (err, row) => {
    if (!err && !row) {
      db.run(
        `INSERT INTO users (id, username, email, password, role, child_name, stories_read, avg_fluency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['usr-demo-001', 'demo_parent', 'parent@example.com', 'password123', 'parent', 'Alex Explorer', 3, 94.5]
      );
      console.log('🌱 [DB] Default demo user seeded.');
    }
  });
});

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

module.exports = {
  db,
  async createUser({ id, username, email, password, role, child_name }) {
    await runQuery(
      `INSERT INTO users (id, username, email, password, role, child_name, stories_read, avg_fluency)
       VALUES (?, ?, ?, ?, ?, ?, 0, 90.0)`,
      [id, username, email, password, role || 'child', child_name || username]
    );
    return this.getUserById(id);
  },

  async findUserByEmailOrUsername(identifier) {
    return getQuery(
      `SELECT * FROM users WHERE email = ? OR username = ?`,
      [identifier, identifier]
    );
  },

  async getUserById(id) {
    return getQuery(`SELECT id, username, email, role, child_name, stories_read, avg_fluency, created_at FROM users WHERE id = ?`, [id]);
  },

  async getAllUsers() {
    return allQuery(`SELECT id, username, email, role, child_name, stories_read, avg_fluency, created_at FROM users ORDER BY created_at DESC`);
  },

  async recordReadingProgress(userId, { story_id, story_title, emotion, duration_seconds }) {
    const historyId = `hist-${Date.now()}`;
    await runQuery(
      `INSERT INTO reading_history (id, user_id, story_id, story_title, emotion, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [historyId, userId, story_id, story_title, emotion, duration_seconds || 60]
    );
    await runQuery(
      `UPDATE users SET stories_read = stories_read + 1 WHERE id = ?`,
      [userId]
    );
    return { id: historyId, status: 'recorded' };
  },

  async getUserHistory(userId) {
    return allQuery(`SELECT * FROM reading_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`, [userId]);
  }
};
