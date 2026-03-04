require('dotenv').config();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

const sqlitePath = path.resolve(__dirname, 'schistoguard.sqlite');

function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function sqliteGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Set it in backend/.env before running migration.');
  }

  const sqliteDb = new sqlite3.Database(sqlitePath);
  const pg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pg.connect();

    const sqliteReadingsCountRow = await sqliteGet(sqliteDb, 'SELECT COUNT(*) as c FROM readings');
    const sqliteAlertsCountRow = await sqliteGet(sqliteDb, 'SELECT COUNT(*) as c FROM alerts');

    const pgBeforeReadings = await pg.query('SELECT COUNT(*)::int as c FROM readings');
    const pgBeforeAlerts = await pg.query('SELECT COUNT(*)::int as c FROM alerts');

    console.log('Source SQLite counts:');
    console.log(`- readings: ${sqliteReadingsCountRow?.c || 0}`);
    console.log(`- alerts: ${sqliteAlertsCountRow?.c || 0}`);
    console.log('Target PostgreSQL counts BEFORE:');
    console.log(`- readings: ${pgBeforeReadings.rows[0].c}`);
    console.log(`- alerts: ${pgBeforeAlerts.rows[0].c}`);

    const sqliteReadings = await sqliteAll(
      sqliteDb,
      'SELECT id, turbidity, temperature, ph, status, timestamp FROM readings ORDER BY id ASC'
    );
    const sqliteAlerts = await sqliteAll(
      sqliteDb,
      'SELECT id, level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy FROM alerts ORDER BY id ASC'
    );

    await pg.query('BEGIN');

    let insertedReadings = 0;
    for (const row of sqliteReadings) {
      const result = await pg.query(
        `INSERT INTO readings (id, turbidity, temperature, ph, status, "timestamp")
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.turbidity,
          row.temperature,
          row.ph,
          row.status,
          row.timestamp
        ]
      );
      insertedReadings += result.rowCount;
    }

    let insertedAlerts = 0;
    for (const row of sqliteAlerts) {
      const result = await pg.query(
        `INSERT INTO alerts (id, level, message, parameter, value, "timestamp", "isAcknowledged", "siteName", barangay, duration, "acknowledgedBy")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.level,
          row.message,
          row.parameter,
          row.value,
          row.timestamp,
          row.isAcknowledged,
          row.siteName,
          row.barangay,
          row.duration,
          row.acknowledgedBy
        ]
      );
      insertedAlerts += result.rowCount;
    }

    await pg.query(
      `SELECT setval(
         pg_get_serial_sequence('readings', 'id'),
         COALESCE((SELECT MAX(id) FROM readings), 1),
         true
       )`
    );

    await pg.query(
      `SELECT setval(
         pg_get_serial_sequence('alerts', 'id'),
         COALESCE((SELECT MAX(id) FROM alerts), 1),
         true
       )`
    );

    await pg.query('COMMIT');

    const pgAfterReadings = await pg.query('SELECT COUNT(*)::int as c FROM readings');
    const pgAfterAlerts = await pg.query('SELECT COUNT(*)::int as c FROM alerts');

    console.log('Migration complete.');
    console.log(`- inserted readings: ${insertedReadings}`);
    console.log(`- inserted alerts: ${insertedAlerts}`);
    console.log('Target PostgreSQL counts AFTER:');
    console.log(`- readings: ${pgAfterReadings.rows[0].c}`);
    console.log(`- alerts: ${pgAfterAlerts.rows[0].c}`);
  } catch (error) {
    try {
      await pg.query('ROLLBACK');
    } catch (_) {}
    console.error('Migration failed:', error.message);
    console.error('Full error:', error);
    process.exitCode = 1;
  } finally {
    sqliteDb.close();
    await pg.end();
  }
}

run();
