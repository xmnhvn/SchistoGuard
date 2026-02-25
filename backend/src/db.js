const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../schistoguard.sqlite'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turbidity REAL,
    temperature REAL,
    ph REAL,
    lat REAL,
    lng REAL,
    status TEXT,
    timestamp TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT,
    message TEXT,
    parameter TEXT,
    value TEXT,
    timestamp TEXT,
    isAcknowledged INTEGER,
    siteName TEXT,
    barangay TEXT,
    duration TEXT,
    acknowledgedBy TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS residents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    siteName TEXT,
    name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'resident',
    verified INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration: Add missing columns to residents table if they don't exist
  db.all("PRAGMA table_info(residents)", (err, columns) => {
    if (err) {
      console.error("Error checking residents table:", err);
      return;
    }

    const columnNames = columns.map(col => col.name);
    
    // Add role column if missing
    if (!columnNames.includes('role')) {
      db.run("ALTER TABLE residents ADD COLUMN role TEXT DEFAULT 'resident'", (err) => {
        if (err) console.error("Error adding role column:", err);
        else console.log("✓ Added role column to residents table");
      });
    }

    // Add verified column if missing
    if (!columnNames.includes('verified')) {
      db.run("ALTER TABLE residents ADD COLUMN verified INTEGER DEFAULT 0", (err) => {
        if (err) console.error("Error adding verified column:", err);
        else console.log("✓ Added verified column to residents table");
      });
    }

    // Add createdAt column if missing
    if (!columnNames.includes('createdAt')) {
      db.run("ALTER TABLE residents ADD COLUMN createdAt TEXT", (err) => {
        if (err) console.error("Error adding createdAt column:", err);
        else console.log("✓ Added createdAt column to residents table");
      });
    }
  });
});

module.exports = db;
