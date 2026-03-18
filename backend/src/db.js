require('dotenv').config();
const path = require('path');

let sqlite3 = null;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (err) {
  console.log('Note: sqlite3 not available - will use PostgreSQL (Railway production mode)');
}

const DB_TYPE = process.env.DB_TYPE || (sqlite3 ? 'sqlite' : 'postgres');
let db = null;

if (DB_TYPE === 'postgres') {
  const { Client } = require('pg');
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for Postgres mode');
  }
  
  db = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  db.connect((err) => {
    if (err) {
      console.error('Database connection error:', err);
      process.exit(1);
    }
    console.log('✓ Connected to PostgreSQL on Railway');
    console.log('Database URL:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password
    
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
        CREATE TABLE IF NOT EXISTS raw_readings (
          id SERIAL PRIMARY KEY,
          turbidity REAL,
          temperature REAL,
          ph REAL,
          status TEXT,
          "timestamp" TEXT
        )
      `);
      
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='lastView') THEN
            ALTER TABLE users ADD COLUMN "lastView" TEXT DEFAULT 'dashboard';
          END IF;
        END $$;
      `);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS readings (
          id SERIAL PRIMARY KEY,
          turbidity REAL,
          temperature REAL,
          ph REAL,
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
  

  db = wrappedDb;
  
} else {
  if (!sqlite3) {
    throw new Error('DB_TYPE is explicitly set to "sqlite" but sqlite3 module is not installed. For local development, run: npm install sqlite3');
  }
  
  db = new sqlite3.Database(path.resolve(__dirname, '../schistoguard.sqlite'));
  
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('bhw', 'lgu')),
      organization TEXT NOT NULL,      lastView TEXT DEFAULT 'dashboard',      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS raw_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turbidity REAL,
      temperature REAL,
      ph REAL,
      status TEXT,
      timestamp TEXT
    )`);

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
      acknowledgedBy TEXT,
      acknowledgedAt TEXT
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

    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      period TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      generatedDate TEXT NOT NULL,
      generatedBy INTEGER,
      totalSites INTEGER,
      alertsGenerated INTEGER,
      avgTurbidity REAL,
      avgTemperature REAL,
      avgPh REAL,
      riskLevel TEXT,
      downloadUrl TEXT
    )`);

    db.all("PRAGMA table_info(residents)", (err, columns) => {
      if (err) {
        console.error("Error checking residents table:", err);
        return;
      }

      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('role')) {
        db.run("ALTER TABLE residents ADD COLUMN role TEXT DEFAULT 'resident'", (err) => {
          if (err) console.error("Error adding role column:", err);
          else console.log("✓ Added role column to residents table");
        });
      }

      if (!columnNames.includes('verified')) {
        db.run("ALTER TABLE residents ADD COLUMN verified INTEGER DEFAULT 0", (err) => {
          if (err) console.error("Error adding verified column:", err);
          else console.log("✓ Added verified column to residents table");
        });
      }

      if (!columnNames.includes('createdAt')) {
        db.run("ALTER TABLE residents ADD COLUMN createdAt TEXT", (err) => {
          if (err) console.error("Error adding createdAt column:", err);
          else console.log("✓ Added createdAt column to residents table");
        });
      }
    });
    
    db.all("PRAGMA table_info(users)", (err, columns) => {
      if (err) {
        console.error("Error checking users table:", err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('lastView')) {
        db.run("ALTER TABLE users ADD COLUMN lastView TEXT DEFAULT 'dashboard'", (err) => {
          if (err) console.error("Error adding lastView column:", err);
          else console.log("✓ Added lastView column to users table");
        });
      }
    });
  });
  
  console.log('✓ Using SQLite database locally');
}

module.exports = db;
