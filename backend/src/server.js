require('dotenv').config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");

// Try to load SQLite session store, fallback to memory store for Railway
let SQLiteStore = null;
try {
  SQLiteStore = require("connect-sqlite3")(session);
} catch (err) {
  console.log('sqlite3 not available, using memory-based session store (Railway production)');
}

const app = express();

// Environment variables
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'schistoguard-secret-key';
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration for cloud
const corsOptions = {
  origin: [
    FRONTEND_URL, 
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:5173',
    'https://schisto-guard.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(session({
  store: SQLiteStore ? new SQLiteStore({ db: 'sessions.sqlite', dir: './' }) : undefined,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: NODE_ENV === 'production' ? 'None' : 'Lax' // 'None' allows cross-site cookies in production
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
