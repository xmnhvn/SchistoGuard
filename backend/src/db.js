
require('dotenv').config();
const bcrypt = require('bcryptjs');

const { Client } = require('pg');
const connectionString = process.env.DATABASE_URL;
const PROTECTED_ACCOUNT_EMAIL = (process.env.PROTECTED_ACCOUNT_EMAIL || '').trim().toLowerCase();
const PROTECTED_ACCOUNT_PASSWORD = process.env.PROTECTED_ACCOUNT_PASSWORD || '';
const PROTECTED_ACCOUNT_FIRST_NAME = process.env.PROTECTED_ACCOUNT_FIRST_NAME || 'Default';
const PROTECTED_ACCOUNT_LAST_NAME = process.env.PROTECTED_ACCOUNT_LAST_NAME || 'Admin';
const PROTECTED_ACCOUNT_ORGANIZATION = process.env.PROTECTED_ACCOUNT_ORGANIZATION || 'SchistoGuard';

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
        "profilePhoto" TEXT,
        role TEXT NOT NULL CHECK(role IN ('admin', 'bhw', 'municipal_health_officer')),
        organization TEXT NOT NULL,
        "isProtected" BOOLEAN DEFAULT FALSE,
        "failedLoginAttempts" INTEGER DEFAULT 0,
        "lockUntil" BIGINT DEFAULT 0,
        "lastView" TEXT DEFAULT 'dashboard',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isProtected" BOOLEAN DEFAULT FALSE');
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0');
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "lockUntil" BIGINT DEFAULT 0');
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "profilePhoto" TEXT');
    await db.query("UPDATE users SET role = 'municipal_health_officer' WHERE role = 'lgu'");
    await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    await db.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'bhw', 'municipal_health_officer'))");


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
        site_key TEXT,
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
        site_key TEXT,
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
        site_key TEXT,
        "acknowledgedBy" TEXT,
        "acknowledgedAt" TEXT
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS site_registry (
        id SERIAL PRIMARY KEY,
        site_key TEXT UNIQUE NOT NULL,
        site_name TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        first_seen TEXT,
        last_seen TEXT
      )
    `);
    await db.query('ALTER TABLE site_registry ADD COLUMN IF NOT EXISTS site_name TEXT');
    await db.query('ALTER TABLE alerts ADD COLUMN IF NOT EXISTS address TEXT');
    await db.query('ALTER TABLE raw_readings ADD COLUMN IF NOT EXISTS site_key TEXT');
    await db.query('ALTER TABLE readings ADD COLUMN IF NOT EXISTS site_key TEXT');
    await db.query('ALTER TABLE alerts ADD COLUMN IF NOT EXISTS site_key TEXT');
    await db.query('ALTER TABLE site_registry ADD COLUMN IF NOT EXISTS address TEXT');
    await db.query('ALTER TABLE site_registry ADD COLUMN IF NOT EXISTS latitude REAL');
    await db.query('ALTER TABLE site_registry ADD COLUMN IF NOT EXISTS longitude REAL');
    await db.query('ALTER TABLE site_registry ADD COLUMN IF NOT EXISTS first_seen TEXT');
    await db.query('ALTER TABLE site_registry ADD COLUMN IF NOT EXISTS last_seen TEXT');
    await db.query(`
      CREATE OR REPLACE FUNCTION prevent_site_registry_coord_update()
      RETURNS trigger AS $$
      BEGIN
        IF OLD.latitude IS NOT NULL AND NEW.latitude IS DISTINCT FROM OLD.latitude THEN
          NEW.latitude := OLD.latitude;
        END IF;

        IF OLD.longitude IS NOT NULL AND NEW.longitude IS DISTINCT FROM OLD.longitude THEN
          NEW.longitude := OLD.longitude;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await db.query('DROP TRIGGER IF EXISTS trg_lock_site_registry_coords ON site_registry');
    await db.query(`
      CREATE TRIGGER trg_lock_site_registry_coords
      BEFORE UPDATE ON site_registry
      FOR EACH ROW
      EXECUTE FUNCTION prevent_site_registry_coord_update()
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_raw_readings_site_key_ts ON raw_readings (site_key, "timestamp" DESC)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_readings_site_key_ts ON readings (site_key, "timestamp" DESC)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_alerts_site_key_ts ON alerts (site_key, "timestamp" DESC)');
    await db.query(`
      CREATE TABLE IF NOT EXISTS residents (
        id SERIAL PRIMARY KEY,
        "siteName" TEXT,
        name TEXT,
        phone TEXT,
        role TEXT DEFAULT 'resident',
        barangay TEXT,
        "designationDetail" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query('ALTER TABLE residents DROP COLUMN IF EXISTS verified');
    await db.query('ALTER TABLE residents ADD COLUMN IF NOT EXISTS barangay TEXT');
    await db.query('ALTER TABLE residents ADD COLUMN IF NOT EXISTS "designationDetail" TEXT');
    await db.query("UPDATE residents SET role = 'municipal_health_officer' WHERE role = 'lgu'");
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
        "siteKey" TEXT,
        "siteName" TEXT,
        address TEXT,
        "downloadUrl" TEXT
      )
    `);
    await db.query('ALTER TABLE reports ADD COLUMN IF NOT EXISTS "siteKey" TEXT');
    await db.query('ALTER TABLE reports ADD COLUMN IF NOT EXISTS "siteName" TEXT');
    await db.query('ALTER TABLE reports ADD COLUMN IF NOT EXISTS address TEXT');

    await db.query(`
      CREATE TABLE IF NOT EXISTS sms_outbox (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        meta_json TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sent_at TEXT
      )
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_sms_outbox_status_id ON sms_outbox (status, id)');

    // Backfill legacy reports that were created before site snapshot fields existed.
    const settingsResult = await db.query("SELECT value FROM settings WHERE key = 'device_name' LIMIT 1");
    const registryResult = await db.query(`
      SELECT site_name, address
      FROM site_registry
      ORDER BY COALESCE(last_seen, first_seen) DESC, id DESC
      LIMIT 1
    `);
    const fallbackSiteName =
      settingsResult.rows[0]?.value ||
      registryResult.rows[0]?.site_name ||
      'System Summary Report';
    const fallbackAddress = registryResult.rows[0]?.address || null;
    await db.query(
      `UPDATE reports
       SET "siteName" = COALESCE("siteName", $1),
           address = COALESCE(address, $2)
       WHERE "siteName" IS NULL OR address IS NULL`,
      [fallbackSiteName, fallbackAddress]
    );

    await ensureProtectedDefaultAccount();
    console.log('✓ PostgreSQL tables initialized');
  } catch (err) {
    console.error('Error initializing tables:', err);
  }
};

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

async function ensureProtectedDefaultAccount() {
  if (!PROTECTED_ACCOUNT_EMAIL || !PROTECTED_ACCOUNT_PASSWORD) {
    console.warn('⚠ Protected default account is not configured. Set PROTECTED_ACCOUNT_EMAIL and PROTECTED_ACCOUNT_PASSWORD to enable it.');
    return;
  }

  if (!strongPasswordRegex.test(PROTECTED_ACCOUNT_PASSWORD)) {
    console.warn('⚠ PROTECTED_ACCOUNT_PASSWORD does not meet strong password policy. Skipping protected account auto-create.');
    return;
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [PROTECTED_ACCOUNT_EMAIL]);
  if (existing.rows.length > 0) {
    await db.query('UPDATE users SET "isProtected" = TRUE, role = $2 WHERE email = $1', [PROTECTED_ACCOUNT_EMAIL, 'admin']);
    console.log('✓ Protected default account already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(PROTECTED_ACCOUNT_PASSWORD, 10);
  await db.query(
    `INSERT INTO users (email, password, "firstName", "lastName", role, organization, "isProtected")
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      PROTECTED_ACCOUNT_EMAIL,
      hashedPassword,
      PROTECTED_ACCOUNT_FIRST_NAME,
      PROTECTED_ACCOUNT_LAST_NAME,
      'admin',
      PROTECTED_ACCOUNT_ORGANIZATION,
      true
    ]
  );

  console.log('✓ Protected default account created');
}

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
