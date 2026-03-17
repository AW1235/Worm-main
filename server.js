// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const serveStatic = require('serve-static')
const PORT = 3000;
app.use(express.static('public'));

app.use(serveStatic('public/ftp', { index: ['index.html', 'style.css', 'powers.html', ] }))

// HTML form
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

function sum(a, b) {
  return a+ b;
}

module.exports = sum;

let db = null;

function connectDb() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'worm_character.db');
  const database = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('SQLite connection failed:', err.message);
      return;
    }
    console.log(`SQLite connected: ${dbPath}`);
  });

  database.serialize(() => {
    database.run(
      `CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        age INTEGER,
        affiliation TEXT,
        power TEXT,
        powerClassification TEXT,
        firstAppearance TEXT
      )`
    );

    const seedPath = path.join(__dirname, 'public', 'characters.json');
    if (!fs.existsSync(seedPath)) {
      console.warn('Seed file not found:', seedPath);
      return;
    }

    let seedData = [];
    try {
      seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    } catch (parseErr) {
      console.error('Seed JSON parse failed:', parseErr.message);
      return;
    }

    const stmt = database.prepare(
      `INSERT OR IGNORE INTO characters
      (name, age, affiliation, power, powerClassification, firstAppearance)
      VALUES (?, ?, ?, ?, ?, ?)`
    );

    seedData.forEach((character) => {
      stmt.run(
        character.name || null,
        character.age || null,
        character.affiliation || null,
        character.power || null,
        character.powerClassification || null,
        character.firstAppearance || null
      );
    });

    stmt.finalize(() => {
      console.log(`Seeded ${seedData.length} characters (insert or ignore)`);
    });
  });

  return database;
}

app.get('/api/characters', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not ready' });

  const search = String(req.query.search || '').trim();
  const like = `%${search}%`;
  const sql = search
    ? 'SELECT id, name FROM characters WHERE name LIKE ? ORDER BY name LIMIT 50'
    : 'SELECT id, name FROM characters ORDER BY name LIMIT 50';
  const params = search ? [like] : [];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/characters/by-name', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not ready' });

  const name = String(req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Missing name parameter' });

  db.get('SELECT * FROM characters WHERE name = ?', [name], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Character not found' });
    res.json(row);
  });
});

app.get('/api/characters/:id', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not ready' });

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

  db.get('SELECT * FROM characters WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Character not found' });
    res.json(row);
  });
});

// Only start the server when running this file directly (not during tests)
if (require.main === module) {
  db = connectDb();

  // Server Listen to this PORT
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
