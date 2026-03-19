const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'worm_character.db');
const seedPath = path.join(__dirname, 'public', 'characters.json');

if (!fs.existsSync(seedPath)) {
  console.error('Seed file not found:', seedPath);
  process.exit(1);
}

let seedData = [];
try {
  seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
} catch (err) {
  console.error('Seed JSON parse failed:', err.message);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite connection failed:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(
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

  const upsert = db.prepare(
    `INSERT INTO characters
    (name, age, affiliation, power, powerClassification, firstAppearance, gender)
    VALUES (?, ?, ?, ?, ?, ?)
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
      db.close();
      return;
    }

    const placeholders = names.map(() => '?').join(', ');
    db.run(
      `DELETE FROM characters WHERE name NOT IN (${placeholders})`,
      names,
      (deleteErr) => {
        if (deleteErr) {
          console.error('SQLite cleanup failed:', deleteErr.message);
        } else {
          console.log(`Synced ${names.length} characters into ${dbPath}`);
        }
        db.close();
      }
    );
  });
});
