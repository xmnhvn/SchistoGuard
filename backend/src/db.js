require('dotenv').config();
const path = require('path');

// Try to load sqlite3, but don't fail if it's not installed (Railway uses only PostgreSQL)
let sqlite3 = null;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (err) {
  console.log('Note: sqlite3 not available - will use PostgreSQL (Railway production mode)');
}

// Determine which database to use
// Smart default: if sqlite3 is not available, default to postgres (Railway)
const DB_TYPE = process.env.DB_TYPE || (sqlite3 ? 'sqlite' : 'postgres');
let db = null;

if (DB_TYPE === 'postgres') {
  // Production: Postgres on Railway
  const { Client } = require('pg');
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for Postgres mode');
  }
  
  db = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Railway uses SSL
  });
  
  db.connect((err) => {
    if (err) {
      console.error('Database connection error:', err);
      process.exit(1);
    }
    console.log('✓ Connected to PostgreSQL on Railway');
  });
  
  // Initialize Postgres tables
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
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS readings (
          id SERIAL PRIMARY KEY,
          turbidity REAL,
          temperature REAL,
          ph REAL,
          lat REAL,
          lng REAL,
          status TEXT,
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
          "acknowledgedBy" TEXT
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
      
      console.log('✓ PostgreSQL tables initialized');
    } catch (err) {
      console.error('Error initializing tables:', err);
    }
  };
  
  initPostgresTables();
  
  // Wrap PostgreSQL client to provide SQLite-compatible callback interface
  const wrappedDb = {
    // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc. and quote camelCase columns
    _convertQuery: function(query) {
      let paramIndex = 1;
      
      // First, replace ? with $1, $2, etc.
      let converted = query.replace(/\?/g, () => `$${paramIndex++}`);
      
      // Quote camelCase column names in INSERT/UPDATE statements
      // Pattern: word boundaries followed by lowercase (for camelCase words)
      // This matches things like firstName, lastName, createdAt, etc.
      converted = converted.replace(/\b([a-z]+[A-Z][a-zA-Z]*)\b/g, '"$1"');
      
      return converted;
    },
    
    // Get single row - mimics db.get() from SQLite
    get: function(query, params, callback) {
      if (!callback) {
        callback = params;
        params = [];
      }
      
      const convertedQuery = this._convertQuery(query);
      db.query(convertedQuery, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result.rows[0]); // Return first row or undefined
      });
    },
    
    // Get all rows - mimics db.all() from SQLite
    all: function(query, params, callback) {
      if (!callback) {
        callback = params;
        params = [];
      }
      
      const convertedQuery = this._convertQuery(query);
      db.query(convertedQuery, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result.rows); // Return all rows
      });
    },
    
    // Run query (insert/update/delete) - mimics db.run() from SQLite
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
    
    // Direct query access for custom queries
    query: db.query.bind(db)
  };
  
  // Use the wrapped version as db
  db = wrappedDb;
  
} else {
  // Development: SQLite locally
  if (!sqlite3) {
    throw new Error('DB_TYPE is explicitly set to "sqlite" but sqlite3 module is not installed. For local development, run: npm install sqlite3');
  }
  
  db = new sqlite3.Database(path.resolve(__dirname, '../schistoguard.sqlite'));
  
  db.serialize(() => {
    // Users table for authentication (BHW and LGU only)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('bhw', 'lgu')),
      organization TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

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
  
  console.log('✓ Using SQLite database locally');
}

// Export the database with a unified interface
module.exports = db;
