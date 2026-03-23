
require('dotenv').config();

const { Client } = require('pg');
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for Postgres mode');
}

const db = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('✓ Connected to PostgreSQL on Railway');
  console.log('Database URL:', connectionString.replace(/:[^:@]+@/, ':****@'));
  db.query('SELECT COUNT(*) as count FROM users', (err, result) => {
    if (err) {
      console.error('Error querying users table:', err);
    } else {
      console.log('Users in database:', result.rows[0]?.count || 0);
    }
  });
});

const initPostgresTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('bhw', 'lgu')),
        organization TEXT NOT NULL,
        "lastView" TEXT DEFAULT 'dashboard',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS raw_readings (
        id SERIAL PRIMARY KEY,
        turbidity REAL,
        temperature REAL,
        ph REAL,
        status TEXT,
        latitude REAL,
        longitude REAL,
        address TEXT,
        "timestamp" TEXT
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS readings (
        id SERIAL PRIMARY KEY,
        turbidity REAL,
        temperature REAL,
        ph REAL,
        status TEXT,
        latitude REAL,
        longitude REAL,
        address TEXT,
        "timestamp" TEXT
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        level TEXT,
        message TEXT,
        parameter TEXT,
        value TEXT,
        "timestamp" TEXT,
        "isAcknowledged" INTEGER,
        "siteName" TEXT,
        barangay TEXT,
        duration TEXT,
        "acknowledgedBy" TEXT,
        "acknowledgedAt" TEXT
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS residents (
        id SERIAL PRIMARY KEY,
        "siteName" TEXT,
        name TEXT,
        phone TEXT,
        role TEXT DEFAULT 'resident',
        verified INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        period TEXT NOT NULL,
        "startDate" TEXT NOT NULL,
        "endDate" TEXT NOT NULL,
        "generatedDate" TEXT NOT NULL,
        "generatedBy" INTEGER,
        "totalSites" INTEGER,
        "alertsGenerated" INTEGER,
        "avgTurbidity" REAL,
        "avgTemperature" REAL,
        "avgPh" REAL,
        "riskLevel" TEXT,
        "downloadUrl" TEXT
      )
    `);
    console.log('✓ PostgreSQL tables initialized');
  } catch (err) {
    console.error('Error initializing tables:', err);
  }
};

initPostgresTables();

const wrappedDb = {
  _convertQuery: function(query) {
    let paramIndex = 1;
    let converted = query.replace(/\?/g, () => `$${paramIndex++}`);
    converted = converted.replace(/\b([a-z]+[A-Z][a-zA-Z]*)\b/g, '"$1"');
    console.log('Query conversion - Original:', query);
    console.log('Query conversion - Converted:', converted);
    return converted;
  },
  get: function(query, params, callback) {
    if (!callback) {
      callback = params;
      params = [];
    }
    const convertedQuery = this._convertQuery(query);
    db.query(convertedQuery, params, (err, result) => {
      if (err) return callback(err);
      callback(null, result.rows[0]);
    });
  },
  all: function(query, params, callback) {
    if (!callback) {
      callback = params;
      params = [];
    }
    const convertedQuery = this._convertQuery(query);
    db.query(convertedQuery, params, (err, result) => {
      if (err) return callback(err);
      callback(null, result.rows);
    });
  },
  run: function(query, params, callback) {
    if (!callback) {
      callback = params;
      params = [];
    }
    const convertedQuery = this._convertQuery(query);
    db.query(convertedQuery, params, (err, result) => {
      if (err) return callback(err);
      callback(null, { lastID: result.rows[0]?.id, changes: result.rowCount });
    });
  },
  query: db.query.bind(db)
};

module.exports = wrappedDb;
// --- Settings helpers ---
wrappedDb.getSetting = function(key, callback) {
  this.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
    if (err) return callback(err);
    callback(null, row ? row.value : null);
  });
};

wrappedDb.setSetting = function(key, value, callback) {
  this.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value', [key, value], callback);
};
