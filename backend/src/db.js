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
});

module.exports = db;
