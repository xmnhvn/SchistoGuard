// SQLite database setup for SchistoGuard backend
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../schistoguard.sqlite'));

// Create tables if not exist
// readings: id, turbidity, temperature, ph, status, timestamp
// alerts: id, level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turbidity REAL,
    temperature REAL,
    ph REAL,
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
