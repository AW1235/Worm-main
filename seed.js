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
      firstAppearance TEXT
    )`
  );

  const stmt = db.prepare(
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
    console.log(`Seeded ${seedData.length} characters into ${dbPath}`);
    db.close();
  });
});
