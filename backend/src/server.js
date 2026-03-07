require('dotenv').config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

// Determine database type early
const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize session store based on database type
let sessionStore = undefined;

if (DB_TYPE === 'postgres') {
  // Production: Use PostgreSQL for session store
  try {
    const pgSession = require("connect-pg-simple")(session);
    const { Client } = require('pg');
    
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    pgClient.connect((err) => {
      if (err) {
        console.error('Session store database connection error:', err);
      } else {
        console.log('✓ PostgreSQL session store connected');
      }
    });
    
    sessionStore = new pgSession({
      pool: pgClient,
      tableName: 'session',
      createTableIfMissing: true
    });
    
    console.log('✓ Using PostgreSQL session store (persistent)');
  } catch (err) {
    console.error('⚠ PostgreSQL session store error:', err.message);
    console.log('  Falling back to memory-based session store');
  }
} else {
  // Development: Use SQLite for session store
  try {
    const SQLiteStore = require("connect-sqlite3")(session);
    sessionStore = new SQLiteStore({ db: 'sessions.sqlite', dir: './' });
    console.log('✓ Using SQLite session store (persistent)');
  } catch (err) {
    console.log('⚠ SQLite session store not available, using memory-based session store');
    console.log('  Note: For development, install connect-sqlite3: npm install connect-sqlite3');
    // Memory store will be used by default (no explicit store)
  }
}

const app = express();

// Environment variables
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'schistoguard-secret-key';

// CORS configuration for cloud
const corsOptions = {
  origin: [
    FRONTEND_URL, 
    'http://localhost:3000', 
    'https://schisto-guard.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'Lax' // Works for same-site requests (localhost:5173 -> localhost:3001)
  }
}));

// Auth routes (must come before sensors routes)
app.use("/api/auth", require("./routes/auth"));

// Sensors routes
app.use("/api/sensors", require("./routes/sensors"));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Database type: ${process.env.DB_TYPE || 'sqlite'}`);
});
