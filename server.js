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
        firstAppearance TEXT,
        gender TEXT
      )`
    );

    const syncSeedData = () => {
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

      const upsert = database.prepare(
        `INSERT INTO characters
        (name, age, affiliation, power, powerClassification, firstAppearance, gender)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          age = excluded.age,
          affiliation = excluded.affiliation,
          power = excluded.power,
          powerClassification = excluded.powerClassification,
          firstAppearance = excluded.firstAppearance,
          gender = excluded.gender`
      );

      const names = [];
      seedData.forEach((character) => {
        if (!character || !character.name) return;
        names.push(character.name);
        upsert.run(
          character.name,
          character.age ?? null,
          character.affiliation ?? null,
          character.power ?? null,
          character.powerClassification ?? null,
          character.firstAppearance ?? null,
          character.gender ?? null
        );
      });

      upsert.finalize(() => {
        if (names.length === 0) {
          console.warn('Seed data is empty; skipping sync cleanup');
          return;
        }

        const placeholders = names.map(() => '?').join(', ');
        database.run(
          `DELETE FROM characters WHERE name NOT IN (${placeholders})`,
          names,
          (deleteErr) => {
            if (deleteErr) {
              console.error('SQLite cleanup failed:', deleteErr.message);
              return;
            }
            console.log(`Synced ${names.length} characters from characters.json`);
          }
        );
      });
    };

    // Ensure existing databases get the new column before seeding.
    database.all('PRAGMA table_info(characters)', (infoErr, rows) => {
      if (infoErr) {
        console.error('SQLite table_info failed:', infoErr.message);
        return;
      }
      const hasGender = Array.isArray(rows) && rows.some((col) => col && col.name === 'gender');
      if (!hasGender) {
        database.run('ALTER TABLE characters ADD COLUMN gender TEXT', (alterErr) => {
          if (alterErr) {
            console.error('SQLite alter table failed:', alterErr.message);
            return;
          }
          console.log('Added gender column to characters table');
          syncSeedData();
        });
      } else {
        syncSeedData();
      }
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

app.get('/api/characters/list', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not ready' });

  const gender = String(req.query.gender || '').trim();
  const powerClassification = String(req.query.powerClassification || '').trim();
  const affiliation = String(req.query.affiliation || '').trim();

  const where = [];
  const params = [];

  if (gender) {
    where.push('gender = ?');
    params.push(gender);
  }
  if (powerClassification) {
    where.push('powerClassification IS NOT NULL');
  }
  if (affiliation) {
    where.push('affiliation = ?');
    params.push(affiliation);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT id, name, gender, powerClassification, affiliation
    FROM characters
    ${whereSql}
    ORDER BY name
  `;

  const normalizeClassification = (value) => {
    const match = String(value || '').trim().match(/[A-Za-z]+/);
    return match ? match[0] : '';
  };

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    let results = rows || [];
    if (powerClassification) {
      results = results.filter(
        (row) => normalizeClassification(row.powerClassification) === powerClassification
      );
    }
    res.json(results);
  });
});

app.get('/api/characters/filters', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not ready' });

  const distinctSql = (column) =>
    `SELECT DISTINCT ${column} AS value FROM characters WHERE ${column} IS NOT NULL AND ${column} != '' ORDER BY ${column}`;

  const normalizeClassification = (value) => {
    const match = String(value || '').trim().match(/[A-Za-z]+/);
    return match ? match[0] : '';
  };

  db.all(distinctSql('gender'), (genderErr, genders) => {
    if (genderErr) return res.status(500).json({ error: genderErr.message });

    db.all(distinctSql('powerClassification'), (pcErr, classifications) => {
      if (pcErr) return res.status(500).json({ error: pcErr.message });

      db.all(distinctSql('affiliation'), (affErr, affiliations) => {
        if (affErr) return res.status(500).json({ error: affErr.message });

        const normalizedClassifications = Array.from(
          new Set(
            (classifications || [])
              .map((row) => normalizeClassification(row.value))
              .filter((value) => value)
          )
        ).sort((a, b) => a.localeCompare(b));

        res.json({
          genders: (genders || []).map((row) => row.value),
          powerClassifications: normalizedClassifications,
          affiliations: (affiliations || []).map((row) => row.value),
        });
      });
    });
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
