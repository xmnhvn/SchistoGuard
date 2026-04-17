require('dotenv').config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const path = require("path");

const NODE_ENV = process.env.NODE_ENV || 'development';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. SchistoGuard now uses PostgreSQL only.');
}

// PostgreSQL session store is required so reads and writes stay on the cloud database.
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require('pg');

const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

sessionPool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Session store pool connection error:', err);
    process.exit(1);
  }

  console.log('✓ PostgreSQL session store pool connected');
});

const sessionStore = new pgSession({
  pool: sessionPool,
  tableName: 'session',
  createTableIfMissing: true
});

console.log('✓ Using PostgreSQL session store only');

const app = express();

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET;
const ENABLE_SELF_SIGNUP = String(process.env.ENABLE_SELF_SIGNUP || 'false').toLowerCase() === 'true';
const PROTECTED_ACCOUNT_EMAIL = (process.env.PROTECTED_ACCOUNT_EMAIL || '').trim();
const PROTECTED_ACCOUNT_PASSWORD = process.env.PROTECTED_ACCOUNT_PASSWORD || '';

if (NODE_ENV === 'production') {
  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required in production');
  }

  if (SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }
}

if (NODE_ENV !== 'production' && !SESSION_SECRET) {
  console.warn('⚠ SESSION_SECRET is not set. Using development fallback secret.');
}

if (!ENABLE_SELF_SIGNUP && (!PROTECTED_ACCOUNT_EMAIL || !PROTECTED_ACCOUNT_PASSWORD)) {
  throw new Error('Self-signup is disabled, so PROTECTED_ACCOUNT_EMAIL and PROTECTED_ACCOUNT_PASSWORD are required');
}

const effectiveSessionSecret = SESSION_SECRET || 'dev-only-secret-change-me';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  }
});

// CORS configuration for cloud
const corsOptions = {
  origin: [
    FRONTEND_URL, 
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://schistoguard.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(helmet({
  // Keep CSP disabled for now to avoid breaking existing frontend assets.
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use('/api/auth/login', loginLimiter);

// Railway/Render/other proxies need this so secure cookies are set correctly.
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  store: sessionStore,
  secret: effectiveSessionSecret,
  proxy: NODE_ENV === 'production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    // Cloud frontend (Vercel) -> cloud backend (Railway) is cross-site.
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

const csrfExemptRoutes = new Set([
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/session',
  '/api/auth/csrf-token'
]);

app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  const isStateChanging = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

  if (!isStateChanging) return next();
  if (csrfExemptRoutes.has(req.path)) return next();

  // Apply CSRF validation only for authenticated browser sessions.
  if (!req.session || !req.session.userId) return next();

  const csrfHeader = req.get('x-csrf-token');
  const csrfToken = req.session.csrfToken;

  if (!csrfHeader || !csrfToken || csrfHeader !== csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  next();
});

// Auth routes (must come before sensors routes)
app.use("/api/auth", require("./routes/auth"));

// Sensors routes
app.use("/api/sensors", require("./routes/sensors"));

// Reports routes
app.use("/api/reports", require("./routes/reports"));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log('Database type: postgres-only');
});
