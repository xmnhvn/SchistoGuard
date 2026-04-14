const router = require("express").Router();
const fs = require('fs');
const classifyWater = require("../utils/classifyWater");
const { validatePhoneNumber, formatPhoneNumber } = require("../utils/validatePhone");
const { calculateRiskLevel } = require("../utils/generateReport");
const db = require("../db");
const axios = require("axios");
const reverseGeocode = require("../utils/reverseGeocode");

// Generalized memory interval and global trackers
let AGGREGATE_INTERVAL_MS = 5 * 60 * 1000;
let GLOBAL_DEVICE_NAME = "Site Name";
const SMS_SUMMARY_DEFAULT_TIMES = ["08:00", "17:00"];
const SMS_SUMMARY_SETTINGS_KEY = "sms_summary_times";
const SMS_SUMMARY_LAST_SENT_KEY = "sms_summary_last_sent";
let SMS_SUMMARY_TIMES = [...SMS_SUMMARY_DEFAULT_TIMES];
let SMS_SUMMARY_LAST_SENT = {};
const SMS_SUMMARY_IN_FLIGHT = new Set();
const SMS_SUMMARY_CONNECTED_WINDOW_MS = 10000;
const SMS_SUMMARY_TIMEZONE = process.env.SMS_SUMMARY_TIMEZONE || 'Asia/Manila';
const SMS_TRANSPORT_MODE = (process.env.SMS_TRANSPORT_MODE || 'esp32-http').toLowerCase();
const SMS_RELAY_TOKEN = process.env.SMS_RELAY_TOKEN || '';
const SAME_SITE_DISTANCE_DEG = 0.0025;
const deviceSiteCache = new Map();

function hasRelayAuth(req) {
  if (!SMS_RELAY_TOKEN) return false;
  const token = (req.get('x-sms-relay-token') || '').trim();
  return token === SMS_RELAY_TOKEN;
}

function isFiniteCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNearbyCoordinate(a, b) {
  if (!a || !b) return false;
  if (!isFiniteCoordinate(a.lat) || !isFiniteCoordinate(a.lng)) return false;
  if (!isFiniteCoordinate(b.lat) || !isFiniteCoordinate(b.lng)) return false;

  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  const distance = Math.sqrt((dLat * dLat) + (dLng * dLng));
  return distance <= SAME_SITE_DISTANCE_DEG;
}

function normalizeSiteKey(address, fallback = "unknown-site") {
  const source = (address || fallback || "unknown-site").toString().trim().toLowerCase();
  return source
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "unknown-site";
}

function buildSiteIdentity(data) {
  const deviceId = (data.device_ip || data.deviceId || 'default-device').toString().trim();
  const address = (data.address || "").toString().trim() || null;
  const fallbackName = data.siteName || data.device_ip || GLOBAL_DEVICE_NAME || "Unknown Site";
  const currentCoords = {
    lat: isFiniteCoordinate(data.latitude) ? data.latitude : null,
    lng: isFiniteCoordinate(data.longitude) ? data.longitude : null,
  };

  const cached = deviceSiteCache.get(deviceId);
  if (
    cached &&
    isNearbyCoordinate(
      { lat: cached.latitude, lng: cached.longitude },
      { lat: currentCoords.lat, lng: currentCoords.lng }
    )
  ) {
    const stableIdentity = {
      siteName: cached.siteName,
      address: cached.address || address,
      siteKey: cached.siteKey
    };

    deviceSiteCache.set(deviceId, {
      siteKey: stableIdentity.siteKey,
      siteName: stableIdentity.siteName,
      address: stableIdentity.address,
      latitude: currentCoords.lat,
      longitude: currentCoords.lng,
    });

    return stableIdentity;
  }

  const siteName = address || fallbackName;
  const identity = {
    siteName,
    address,
    siteKey: normalizeSiteKey(siteName, fallbackName)
  };

  deviceSiteCache.set(deviceId, {
    siteKey: identity.siteKey,
    siteName: identity.siteName,
    address: identity.address,
    latitude: currentCoords.lat,
    longitude: currentCoords.lng,
  });

  return {
    siteName: identity.siteName,
    address: identity.address,
    siteKey: identity.siteKey
  };
}

function resolveResidentSiteName(siteIdentifier, callback) {
  const raw = (siteIdentifier || '').toString().trim();
  if (!raw) {
    return callback(new Error('siteName is required'));
  }

  db.get(
    `SELECT site_name, address
     FROM site_registry
     WHERE site_key = ? OR site_name = ? OR address = ?
     ORDER BY last_seen DESC
     LIMIT 1`,
    [raw, raw, raw],
    (err, row) => {
      if (err) return callback(err);

      const resolvedName = (
        (row && (row.site_name || row.address))
          ? (row.site_name || row.address)
          : raw
      ).toString().trim();

      callback(null, resolvedName || raw);
    }
  );
}

function upsertSiteRegistry(data, nowIso) {
  const identity = buildSiteIdentity(data);
  db.run(
    `INSERT INTO site_registry (site_key, site_name, address, latitude, longitude, first_seen, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (site_key)
     DO UPDATE SET
       site_name = COALESCE(site_registry.site_name, EXCLUDED.site_name),
       address = EXCLUDED.address,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       last_seen = EXCLUDED.last_seen`,
    [
      identity.siteKey,
      identity.siteName,
      identity.address,
      typeof data.latitude === 'number' ? data.latitude : null,
      typeof data.longitude === 'number' ? data.longitude : null,
      nowIso,
      nowIso
    ],
    (err) => {
      if (err) {
        console.error('[site_registry upsert error]', err.message, { identity });
      }
    }
  );

  return identity;
}

// Helper to load settings from DB
async function loadSettingsFromDB() {
  return new Promise((resolve) => {
    db.getSetting('aggregate_interval_ms', (err, interval) => {
      if (!err && interval) AGGREGATE_INTERVAL_MS = parseInt(interval, 10);
      db.getSetting('device_name', (err, name) => {
        if (!err && name) GLOBAL_DEVICE_NAME = name;
        resolve();
      });
    });
  });
}

// Helper to set interval in DB settings
async function saveIntervalToDB(ms) {
  return new Promise((resolve, reject) => {
    db.setSetting('aggregate_interval_ms', String(ms), (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

function getSettingValue(key) {
  return new Promise((resolve, reject) => {
    db.getSetting(key, (err, value) => {
      if (err) return reject(err);
      resolve(value);
    });
  });
}

function setSettingValue(key, value) {
  return new Promise((resolve, reject) => {
    db.setSetting(key, value, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function normalizeSmsTime(value) {
  const raw = (value || '').toString().trim();
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseSmsTimes(rawValue) {
  if (!rawValue) return [...SMS_SUMMARY_DEFAULT_TIMES];

  try {
    const parsed = JSON.parse(rawValue);
    const values = Array.isArray(parsed) ? parsed : [];
    const normalized = values
      .map(normalizeSmsTime)
      .filter(Boolean)
      .slice(0, 2);

    return normalized.length === 2 ? normalized : [...SMS_SUMMARY_DEFAULT_TIMES];
  } catch {
    return [...SMS_SUMMARY_DEFAULT_TIMES];
  }
}

function parseSmsLastSent(rawValue) {
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function getMinutesFromTime(timeValue) {
  const normalized = normalizeSmsTime(timeValue);
  if (!normalized) return null;

  const [hours, minutes] = normalized.split(':').map(Number);
  return (hours * 60) + minutes;
}

function buildDateAtTime(baseDate, timeValue) {
  const normalized = normalizeSmsTime(timeValue);
  if (!normalized) return null;

  const [hours, minutes] = normalized.split(':').map(Number);
  const nextDate = new Date(baseDate);
  nextDate.setSeconds(0, 0);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

function getNextScheduledSlotTime(now = new Date()) {
  const currentParts = getZonedDateTimeParts(now);
  const currentMinute = (currentParts.hour * 60) + currentParts.minute;
  const orderedTimes = [...SMS_SUMMARY_TIMES]
    .map((time) => ({ time, minutes: getMinutesFromTime(time) }))
    .filter((entry) => entry.minutes != null)
    .sort((left, right) => left.minutes - right.minutes);

  if (!orderedTimes.length) return null;

  const nextToday = orderedTimes.find((entry) => entry.minutes >= currentMinute);
  if (nextToday) return nextToday.time;

  return orderedTimes[0].time;
}

function getZonedDateTimeParts(date, timeZone = SMS_SUMMARY_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const readPart = (type) => Number(parts.find((entry) => entry.type === type)?.value || '0');
  return {
    year: readPart('year'),
    month: readPart('month'),
    day: readPart('day'),
    hour: readPart('hour'),
    minute: readPart('minute'),
    second: readPart('second'),
  };
}

function getTimezoneOffsetMs(date, timeZone = SMS_SUMMARY_TIMEZONE) {
  const zoned = getZonedDateTimeParts(date, timeZone);
  const zonedAsUtcMs = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
    0
  );
  return zonedAsUtcMs - date.getTime();
}

function buildDateAtTimeInZone(baseDate, timeValue, timeZone = SMS_SUMMARY_TIMEZONE) {
  const normalized = normalizeSmsTime(timeValue);
  if (!normalized) return null;

  const [hours, minutes] = normalized.split(':').map(Number);
  const zonedBase = getZonedDateTimeParts(baseDate, timeZone);
  const utcGuess = new Date(Date.UTC(zonedBase.year, zonedBase.month - 1, zonedBase.day, hours, minutes, 0, 0));
  const offset = getTimezoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

function addDaysInZone(baseDate, days, timeZone = SMS_SUMMARY_TIMEZONE) {
  const shifted = new Date(baseDate.getTime() + (days * 24 * 60 * 60 * 1000));
  const zoned = getZonedDateTimeParts(shifted, timeZone);
  const utcGuess = new Date(Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second, 0));
  const offset = getTimezoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

async function loadSmsSummarySettingsFromDB() {
  const timesValue = await getSettingValue(SMS_SUMMARY_SETTINGS_KEY);
  const lastSentValue = await getSettingValue(SMS_SUMMARY_LAST_SENT_KEY);

  SMS_SUMMARY_TIMES = parseSmsTimes(timesValue);
  SMS_SUMMARY_LAST_SENT = parseSmsLastSent(lastSentValue);
}

async function saveSmsSummarySettingsToDB(times, lastSent = {}) {
  await setSettingValue(SMS_SUMMARY_SETTINGS_KEY, JSON.stringify(times));
  await setSettingValue(SMS_SUMMARY_LAST_SENT_KEY, JSON.stringify(lastSent));
  SMS_SUMMARY_TIMES = [...times];
  SMS_SUMMARY_LAST_SENT = { ...lastSent };
}

async function markSmsSummarySent(slotTime, sentAtIso) {
  const updated = {
    ...SMS_SUMMARY_LAST_SENT,
    [slotTime]: sentAtIso,
  };

  await setSettingValue(SMS_SUMMARY_LAST_SENT_KEY, JSON.stringify(updated));
  SMS_SUMMARY_LAST_SENT = updated;
}

async function getCurrentSiteSnapshot() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT site_key, site_name, address
       FROM site_registry
       ORDER BY COALESCE(last_seen, first_seen) DESC, id DESC
       LIMIT 1`,
      [],
      (siteErr, siteRow) => {
        if (siteErr) return reject(siteErr);

        if (siteRow) {
          return resolve({
            siteKey: siteRow.site_key || null,
            siteName: siteRow.site_name || siteRow.address || GLOBAL_DEVICE_NAME,
            address: siteRow.address || null,
          });
        }

        db.get("SELECT value FROM settings WHERE key = ?", ["device_name"], (settingsErr, settingsRow) => {
          if (settingsErr) return reject(settingsErr);

          resolve({
            siteKey: null,
            siteName: (settingsRow && settingsRow.value) || GLOBAL_DEVICE_NAME,
            address: null,
          });
        });
      }
    );
  });
}

async function getActiveSiteSnapshots() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT site_key, site_name, address, last_seen
       FROM site_registry
       ORDER BY COALESCE(last_seen, first_seen) DESC, id DESC`,
      [],
      (err, rows) => {
        if (err) return reject(err);

        const now = Date.now();
        const activeSites = (rows || [])
          .filter((row) => {
            if (!row?.last_seen) return false;
            const lastSeenMs = new Date(row.last_seen).getTime();
            if (Number.isNaN(lastSeenMs)) return false;
            return Math.abs(now - lastSeenMs) < SMS_SUMMARY_CONNECTED_WINDOW_MS;
          })
          .map((row) => ({
            siteKey: row.site_key || null,
            siteName: row.site_name || row.address || GLOBAL_DEVICE_NAME,
            address: row.address || null,
            lastSeen: row.last_seen || null,
          }));

        resolve(activeSites);
      }
    );
  });
}

async function getSummaryStats(siteKey, startIso, endIso) {
  return new Promise((resolve, reject) => {
    const hasSiteFilter = typeof siteKey === 'string' && siteKey.trim().length > 0;
    const readingsQuery = hasSiteFilter
      ? `SELECT
          COUNT(*) as totalReadings,
          AVG(turbidity) as avgTurbidity,
          AVG(temperature) as avgTemperature,
          AVG(ph) as avgPh
         FROM readings
         WHERE site_key = ? AND timestamp BETWEEN ? AND ?`
      : `SELECT
          COUNT(*) as totalReadings,
          AVG(turbidity) as avgTurbidity,
          AVG(temperature) as avgTemperature,
          AVG(ph) as avgPh
         FROM readings
         WHERE timestamp BETWEEN ? AND ?`;
    const readingsParams = hasSiteFilter ? [siteKey, startIso, endIso] : [startIso, endIso];

    db.get(readingsQuery, readingsParams, (readingsErr, readingsRow) => {
      if (readingsErr) return reject(readingsErr);

      const alertsQuery = hasSiteFilter
        ? `SELECT
            COUNT(*) as totalAlerts,
            SUM(CASE WHEN level = 'critical' THEN 1 ELSE 0 END) as criticalAlerts,
            SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) as warningAlerts
           FROM alerts
           WHERE site_key = ? AND timestamp BETWEEN ? AND ?`
        : `SELECT
            COUNT(*) as totalAlerts,
            SUM(CASE WHEN level = 'critical' THEN 1 ELSE 0 END) as criticalAlerts,
            SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) as warningAlerts
           FROM alerts
           WHERE timestamp BETWEEN ? AND ?`;
      const alertsParams = hasSiteFilter ? [siteKey, startIso, endIso] : [startIso, endIso];

      db.get(alertsQuery, alertsParams, (alertsErr, alertsRow) => {
        if (alertsErr) return reject(alertsErr);

        const latestQuery = hasSiteFilter
          ? `SELECT turbidity, temperature, ph, status, timestamp
             FROM readings
             WHERE site_key = ? AND timestamp <= ?
             ORDER BY timestamp DESC
             LIMIT 1`
          : `SELECT turbidity, temperature, ph, status, timestamp
             FROM readings
             WHERE timestamp <= ?
             ORDER BY timestamp DESC
             LIMIT 1`;
        const latestParams = hasSiteFilter ? [siteKey, endIso] : [endIso];

        db.get(latestQuery, latestParams, (latestErr, latestRow) => {
          if (latestErr) return reject(latestErr);

          resolve({
            totalReadings: Number(readingsRow?.totalReadings || 0),
            avgTurbidity: readingsRow?.avgTurbidity != null ? Number(readingsRow.avgTurbidity) : null,
            avgTemperature: readingsRow?.avgTemperature != null ? Number(readingsRow.avgTemperature) : null,
            avgPh: readingsRow?.avgPh != null ? Number(readingsRow.avgPh) : null,
            totalAlerts: Number(alertsRow?.totalAlerts || 0),
            criticalAlerts: Number(alertsRow?.criticalAlerts || 0),
            warningAlerts: Number(alertsRow?.warningAlerts || 0),
            latestReading: latestRow || null,
          });
        });
      });
    });
  });
}

function buildSmsSummaryMessage({ siteName, startIso, endIso, stats, slotTime }) {
  const startLabel = new Date(startIso).toLocaleString('en-US', {
    timeZone: SMS_SUMMARY_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endLabel = new Date(endIso).toLocaleString('en-US', {
    timeZone: SMS_SUMMARY_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const riskValue =
    stats.avgTurbidity != null && stats.avgTemperature != null && stats.avgPh != null
      ? calculateRiskLevel(stats.avgTurbidity, stats.avgTemperature, stats.avgPh)
      : (stats.latestReading?.status || 'low-risk');

  const riskLabel = riskValue === 'high' || riskValue === 'high-risk'
    ? 'High Possible Risk'
    : riskValue === 'moderate' || riskValue === 'possible-risk'
      ? 'Moderate Risk'
      : 'Safe/Low Risk';

  const readingLine = stats.latestReading
    ? `Latest: T ${Number(stats.latestReading.temperature || 0).toFixed(1)} C | pH ${Number(stats.latestReading.ph || 0).toFixed(2)} | Turbidity ${Number(stats.latestReading.turbidity || 0).toFixed(1)} NTU`
    : 'Latest: No reading available in this window';

  const avgLine = stats.avgTurbidity != null && stats.avgTemperature != null && stats.avgPh != null
    ? `Averages: T ${stats.avgTemperature.toFixed(1)} C | pH ${stats.avgPh.toFixed(2)} | Turbidity ${stats.avgTurbidity.toFixed(1)} NTU`
    : 'Averages: No readings recorded for this window';

  const alertLine = `Alerts: ${stats.totalAlerts} total (${stats.criticalAlerts} critical, ${stats.warningAlerts} warning)`;
  const advice = riskLabel === 'High Possible Risk'
    ? 'Action: Verify on site immediately and monitor closely.'
    : riskLabel === 'Moderate Risk'
      ? 'Action: Continue monitoring and validate the readings.'
      : 'Action: Continue routine monitoring.';

  return [
    'SchistoGuard SMS Alert Summary',
    `Site: ${siteName}`,
    '',
    `Window: ${startLabel} - ${endLabel}`,
    `Overall Risk: ${riskLabel}`,
    '',
    avgLine,
    readingLine,
    '',
    alertLine,
    advice,
  ].join('\n');
}

async function sendScheduledSmsSummary(siteSnapshot, slotTime, options = {}) {
  const now = new Date();
  const slotMinutes = getMinutesFromTime(slotTime);
  if (slotMinutes == null) return { success: false, reason: 'invalid-slot-time' };

  const orderedTimes = [...SMS_SUMMARY_TIMES]
    .map((time) => ({ time, minutes: getMinutesFromTime(time) }))
    .filter((entry) => entry.minutes != null)
    .sort((left, right) => left.minutes - right.minutes);

  if (orderedTimes.length !== 2) return { success: false, reason: 'invalid-configured-times' };

  const currentIndex = orderedTimes.findIndex((entry) => entry.time === slotTime);
  if (currentIndex === -1) return { success: false, reason: 'slot-not-configured' };

  const previousEntry = currentIndex === 0 ? orderedTimes[orderedTimes.length - 1] : orderedTimes[currentIndex - 1];
  const startDate = buildDateAtTimeInZone(now, previousEntry.time);
  const endDate = buildDateAtTimeInZone(now, slotTime);
  if (!startDate || !endDate) return { success: false, reason: 'invalid-time-window' };
  if (previousEntry.minutes > slotMinutes || currentIndex === 0) {
    const adjusted = addDaysInZone(startDate, -1);
    startDate.setTime(adjusted.getTime());
  }

  const siteKey = siteSnapshot.siteKey || normalizeSiteKey(siteSnapshot.siteName || GLOBAL_DEVICE_NAME);
  const siteName = siteSnapshot.siteName || GLOBAL_DEVICE_NAME;
  const stats = await getSummaryStats(siteKey, startDate.toISOString(), endDate.toISOString());
  const message = buildSmsSummaryMessage({
    siteName,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    stats,
    slotTime,
  });

  let recipients = await new Promise((resolve, reject) => {
    db.all(
      "SELECT phone FROM residents WHERE siteName = ? OR siteName = ? ORDER BY CASE WHEN role='bhw' THEN 1 WHEN role='municipal_health_officer' THEN 2 ELSE 3 END",
      [siteName, siteSnapshot.address || siteName],
      (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []).map((row) => row.phone).filter(Boolean));
      }
    );
  });

  if (!recipients.length) {
    recipients = await new Promise((resolve, reject) => {
      db.all(
        "SELECT phone FROM residents ORDER BY CASE WHEN role='bhw' THEN 1 WHEN role='municipal_health_officer' THEN 2 ELSE 3 END",
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve((rows || []).map((row) => row.phone).filter(Boolean));
        }
      );
    });
  }

  if (!recipients.length) {
    console.log(`[sms-summary] No recipients found for ${siteName}; skipping ${slotTime} dispatch.`);
    return { success: false, reason: 'no-recipients' };
  }

  const dispatchResult = await sendSMSViaESP32(message, [
    `Summary slot: ${slotTime}`,
    `Site: ${siteName}`,
    `Risk: ${stats.avgTurbidity != null && stats.avgTemperature != null && stats.avgPh != null ? calculateRiskLevel(stats.avgTurbidity, stats.avgTemperature, stats.avgPh) : 'n/a'}`,
  ], recipients, options);

  if (dispatchResult?.sent > 0) {
    await markSmsSummarySent(`${siteKey}:${slotTime}`, now.toISOString());
    return {
      success: true,
      reason: null,
      sent: dispatchResult.sent,
      failed: dispatchResult.failed,
      total: dispatchResult.total,
      siteName,
      slotTime,
    };
  }

  console.warn(
    `[sms-summary] Not marking as sent for ${siteName} @ ${slotTime}. Reason: ${dispatchResult?.skippedReason || 'no successful SMS'}`
  );
  return {
    success: false,
    reason: dispatchResult?.skippedReason || 'no-successful-sms',
    sent: dispatchResult?.sent || 0,
    failed: dispatchResult?.failed || recipients.length,
    total: dispatchResult?.total || recipients.length,
    siteName,
    slotTime,
  };
}

async function checkSmsSummarySchedule() {
  const currentDate = new Date();
  const zonedNow = getZonedDateTimeParts(currentDate);
  const currentMinute = (zonedNow.hour * 60) + zonedNow.minute;
  const activeSites = await getActiveSiteSnapshots();
  const sitesToProcess = activeSites.length ? activeSites : [await getCurrentSiteSnapshot()].filter(Boolean);

  if (!sitesToProcess.length) return;

  for (const slotTime of SMS_SUMMARY_TIMES) {
    const slotMinutes = getMinutesFromTime(slotTime);
    if (slotMinutes == null || currentMinute !== slotMinutes) continue;

    for (const siteSnapshot of sitesToProcess) {
      const siteKey = siteSnapshot.siteKey || normalizeSiteKey(siteSnapshot.siteName || GLOBAL_DEVICE_NAME);
      const inflightKey = `${siteKey}:${slotTime}`;
      if (SMS_SUMMARY_IN_FLIGHT.has(inflightKey)) continue;

      const lastSentAt = SMS_SUMMARY_LAST_SENT[inflightKey];
      if (lastSentAt) {
        const lastSentDate = new Date(lastSentAt);
        const todaySlot = buildDateAtTimeInZone(currentDate, slotTime);
        if (todaySlot && lastSentDate.getTime() >= todaySlot.getTime()) {
          continue;
        }
      }

      try {
        SMS_SUMMARY_IN_FLIGHT.add(inflightKey);
        await sendScheduledSmsSummary(siteSnapshot, slotTime);
      } catch (error) {
        console.error(`[sms-summary] Failed for ${siteSnapshot.siteName} @ ${slotTime}:`, error.message);
      } finally {
        SMS_SUMMARY_IN_FLIGHT.delete(inflightKey);
      }
    }
  }
}

// API: Get current interval config
router.get('/interval-config', async (req, res) => {
  await loadSettingsFromDB();
  res.json({ intervalMs: AGGREGATE_INTERVAL_MS, deviceName: GLOBAL_DEVICE_NAME });
});

// API: Update interval config
router.post('/interval-config', (req, res) => {
  const { intervalMs, deviceName } = req.body;
  if (!intervalMs || typeof intervalMs !== 'number' || intervalMs < 1000) {
    return res.status(400).json({ error: 'Invalid intervalMs' });
  }

  const newName = (deviceName && deviceName.trim()) || GLOBAL_DEVICE_NAME || "Site Name";
  
  db.setSetting('aggregate_interval_ms', String(intervalMs), (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save interval' });
    
    db.setSetting('device_name', newName, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save device name' });
      
      AGGREGATE_INTERVAL_MS = intervalMs;
      GLOBAL_DEVICE_NAME = newName;
      res.json({ success: true, intervalMs, deviceName: GLOBAL_DEVICE_NAME });
    });
  });
});

router.get('/sms-summary-config', async (req, res) => {
  try {
    await loadSmsSummarySettingsFromDB();
    res.json({ success: true, times: SMS_SUMMARY_TIMES });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/sms-summary-config', async (req, res) => {
  try {
    const { times } = req.body;
    const normalizedTimes = Array.isArray(times)
      ? times.map(normalizeSmsTime).filter(Boolean).slice(0, 2)
      : [];

    if (normalizedTimes.length !== 2) {
      return res.status(400).json({ success: false, message: 'Two valid SMS times are required' });
    }

    await saveSmsSummarySettingsToDB(normalizedTimes, {});
    res.json({ success: true, times: normalizedTimes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/sms-summary-debug', async (req, res) => {
  try {
    await loadSmsSummarySettingsFromDB();
    const currentDate = new Date();
    const zonedNow = getZonedDateTimeParts(currentDate);
    const currentMinute = (zonedNow.hour * 60) + zonedNow.minute;
    const activeSites = await getActiveSiteSnapshots();
    const fallbackSite = await getCurrentSiteSnapshot();

    const recipientCounts = await new Promise((resolve, reject) => {
      db.query(
        `SELECT COALESCE("siteName", '') as site_name, COUNT(*) as total
         FROM residents
         GROUP BY COALESCE("siteName", '')
         ORDER BY total DESC`,
        [],
        (err, result) => {
          if (err) return reject(err);
          resolve(result?.rows || []);
        }
      );
    });

    res.json({
      success: true,
      timezone: SMS_SUMMARY_TIMEZONE,
      nowIso: currentDate.toISOString(),
      nowInTimezone: zonedNow,
      currentMinute,
      scheduleTimes: SMS_SUMMARY_TIMES,
      lastSent: SMS_SUMMARY_LAST_SENT,
      inFlight: Array.from(SMS_SUMMARY_IN_FLIGHT),
      activeSites,
      fallbackSite,
      recipientCounts,
      cooldownMsRemaining: Math.max(0, SMS_COOLDOWN_MS - (Date.now() - lastSMSTime)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/sms-relay/pull', async (req, res) => {
  if (!hasRelayAuth(req)) {
    return res.status(403).json({ success: false, message: 'Unauthorized relay request' });
  }

  const requestedLimit = Number(req.body?.limit || 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(25, Math.max(1, Math.floor(requestedLimit))) : 10;

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, phone, message, meta_json
         FROM sms_outbox
         WHERE status = 'pending'
         ORDER BY id ASC
         LIMIT ?`,
        [limit],
        (err, resultRows) => {
          if (err) return reject(err);
          resolve(resultRows || []);
        }
      );
    });

    if (!rows.length) {
      return res.json({ success: true, jobs: [] });
    }

    await Promise.all(
      rows.map((row) => new Promise((resolve) => {
        db.run(
          `UPDATE sms_outbox
           SET status = 'processing', updated_at = ?
           WHERE id = ? AND status = 'pending'`,
          [new Date().toISOString(), row.id],
          () => resolve()
        );
      }))
    );

    const jobs = rows.map((row) => ({
      id: row.id,
      phone: row.phone,
      message: row.message,
      meta: row.meta_json ? JSON.parse(row.meta_json) : null,
    }));

    return res.json({ success: true, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/sms-relay/ack', async (req, res) => {
  if (!hasRelayAuth(req)) {
    return res.status(403).json({ success: false, message: 'Unauthorized relay request' });
  }

  const jobId = Number(req.body?.jobId);
  const success = Boolean(req.body?.success);
  const errorMessage = (req.body?.error || '').toString().slice(0, 500);

  if (!Number.isFinite(jobId) || jobId <= 0) {
    return res.status(400).json({ success: false, message: 'jobId is required' });
  }

  const nowIso = new Date().toISOString();
  const status = success ? 'sent' : 'failed';

  try {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE sms_outbox
         SET status = ?,
             attempts = attempts + 1,
             last_error = ?,
             updated_at = ?,
             sent_at = CASE WHEN ? = 'sent' THEN ? ELSE sent_at END
         WHERE id = ?`,
        [status, success ? null : errorMessage || 'relay-send-failed', nowIso, status, nowIso, jobId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/sms-summary-trigger', async (req, res) => {
  try {
    await loadSmsSummarySettingsFromDB();

    const requestedSlot = normalizeSmsTime(req.body?.slotTime);
    const slotTime = requestedSlot || getNextScheduledSlotTime(new Date());
    if (!slotTime) {
      return res.status(400).json({ success: false, message: 'No valid slotTime available' });
    }

    const requestedSiteKey = (req.body?.siteKey || '').toString().trim();
    let siteSnapshot = null;

    if (requestedSiteKey) {
      siteSnapshot = await new Promise((resolve, reject) => {
        db.get(
          `SELECT site_key, site_name, address
           FROM site_registry
           WHERE site_key = ?
           ORDER BY COALESCE(last_seen, first_seen) DESC, id DESC
           LIMIT 1`,
          [requestedSiteKey],
          (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(null);
            resolve({
              siteKey: row.site_key || null,
              siteName: row.site_name || row.address || GLOBAL_DEVICE_NAME,
              address: row.address || null,
            });
          }
        );
      });
    }

    if (!siteSnapshot) {
      siteSnapshot = await getCurrentSiteSnapshot();
    }

    if (!siteSnapshot) {
      return res.status(404).json({ success: false, message: 'No site snapshot available' });
    }

    const result = await sendScheduledSmsSummary(siteSnapshot, slotTime, { bypassCooldown: true });
    res.json({ success: Boolean(result?.success), slotTime, siteSnapshot, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ESP32 connection for SMS
const ESP32_HOSTNAME = 'schistoguard-esp32.local';
const ESP32_IP_FALLBACK = '192.168.100.168';
let lastSMSTime = 0;
const SMS_COOLDOWN_MS = 300000; // 5 minutes between successful SMS

async function sendSMSViaESP32(message, alertMessages = [], phoneNumbers = [], options = {}) {
  const now = Date.now();
  const bypassCooldown = Boolean(options && options.bypassCooldown);

  if (SMS_TRANSPORT_MODE === 'relay-queue') {
    const nowIso = new Date().toISOString();
    let queued = 0;

    for (const phone of phoneNumbers) {
      const meta = {
        alertMessages,
        queuedAt: nowIso,
      };

      await new Promise((resolve) => {
        db.run(
          `INSERT INTO sms_outbox (phone, message, meta_json, status, attempts, last_error, created_at, updated_at, sent_at)
           VALUES (?, ?, ?, 'pending', 0, NULL, ?, ?, NULL)`,
          [phone, message, JSON.stringify(meta), nowIso, nowIso],
          (err) => {
            if (!err) queued += 1;
            resolve();
          }
        );
      });
    }

    return {
      sent: queued,
      failed: Math.max(0, phoneNumbers.length - queued),
      total: phoneNumbers.length,
      skippedReason: queued > 0 ? null : 'queue-insert-failed',
      queued: true,
    };
  }
  
  // Prevent SMS spam - cooldown after any attempt (success or fail)
  if (!bypassCooldown && now - lastSMSTime < SMS_COOLDOWN_MS) {
    return { sent: 0, failed: 0, total: phoneNumbers?.length || 0, skippedReason: 'cooldown' };
  }

  // If no phone numbers provided, skip
  if (!phoneNumbers || phoneNumbers.length === 0) {
    return { sent: 0, failed: 0, total: 0, skippedReason: 'no-recipients' };
  }

  try {
    let sent = 0;
    let failed = 0;

    // Send to all phone numbers in PARALLEL
    const smsPromises = phoneNumbers.map(async (phone) => {
      try {
        // Try hostname first
        let url = `http://${ESP32_HOSTNAME}/api/sms`;
        const payload = { message, phone };
        
        try {
          await axios.post(url, payload, { 
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
          });
          sent++;
        } catch (err) {
          // Fallback to IP
          if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
            url = `http://${ESP32_IP_FALLBACK}/api/sms`;
            await axios.post(url, payload, { 
              timeout: 5000,
              headers: { 'Content-Type': 'application/json' }
            });
            sent++;
          } else {
            throw err;
          }
        }
      } catch (error) {
        failed++;
      }
    });

    // Wait for all SMS to complete simultaneously
    await Promise.all(smsPromises);

    // Show logs after all numbers attempted
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`📱 SMS dispatch [${timestamp}]:`, alertMessages.join(' | '));
    console.log('📱 Attempting to send SMS...');
    console.log(`   Message: ${message.substring(0, 50)}...`);
    console.log(`✓ SMS sent to ${sent}/${phoneNumbers.length} recipients (SIMULTANEOUS)`);
    
    if (failed > 0) {
      console.error(`✗ Failed to send to ${failed} recipients`);
    }

    lastSMSTime = now; // Start 5-minute cooldown
    return { sent, failed, total: phoneNumbers.length, skippedReason: null };
  } catch (error) {
    // Show failure logs once
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`📱 SMS dispatch [${timestamp}]:`, alertMessages.join(' | '));
    console.log('📱 Attempting to send SMS...');
    console.log(`   Message: ${message.substring(0, 50)}...`);
    console.error('✗ Failed to send SMS:', error.message);
    lastSMSTime = now; // Start 5-minute cooldown even on failure
    return { sent: 0, failed: phoneNumbers.length, total: phoneNumbers.length, skippedReason: 'dispatch-error' };
  }
}

router.post("/alerts/:id/acknowledge", (req, res) => {
  const { id } = req.params;
  const { acknowledgedBy } = req.body;
  const now = new Date().toISOString();
  db.run(
    "UPDATE alerts SET isAcknowledged = 1, acknowledgedBy = ?, acknowledgedAt = ? WHERE id = ?",
    [acknowledgedBy || null, now, id],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (this.changes === 0) return res.status(404).json({ success: false, message: "Alert not found" });
      db.get("SELECT * FROM alerts WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, alert: row });
      });
    }
  );
});

let latestData = null;

// (Variables hoisted upwards)
// Load initial settings on startup
loadSettingsFromDB().then(() => {
  console.log('✓ Initial sensor settings loaded from DB:', { AGGREGATE_INTERVAL_MS, GLOBAL_DEVICE_NAME });
  
  // Also check file for backwards compatibility if needed
  try {
    const configPath = require('path').resolve(__dirname, '../../interval-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config && config.intervalMs && !AGGREGATE_INTERVAL_MS) AGGREGATE_INTERVAL_MS = config.intervalMs;
      if (config && config.deviceName && GLOBAL_DEVICE_NAME === "Site Name") GLOBAL_DEVICE_NAME = config.deviceName;
    }
  } catch (e) { /* ignore */ }
});

loadSmsSummarySettingsFromDB().then(() => {
  console.log('✓ Initial SMS summary schedule loaded from DB:', SMS_SUMMARY_TIMES);
});

setInterval(() => {
  checkSmsSummarySchedule();
}, 30000);

setInterval(() => {
  if (!latestData) return;
  const now = new Date();
  const dataTimestamp = new Date(latestData.timestamp).getTime();
  const nowMs = now.getTime();
  // Only proceed if data is fresh (device connected, <10s old)
  if (Math.abs(nowMs - dataTimestamp) >= 10000) {
    console.warn('[readings] Skipped: data too old or device not connected', { now: now.toISOString(), dataTimestamp, latestData });
    return;
  }

  // --- Auto-reload interval config from DB every cycle ---
  let intervalMs = AGGREGATE_INTERVAL_MS;
  db.getSetting('aggregate_interval_ms', (err, value) => {
    if (!err && value) intervalMs = parseInt(value, 10);
  });

  // Always log to raw_readings (per event/second), now with GPS
  const siteIdentity = upsertSiteRegistry(latestData, now.toISOString());
  db.run(
    "INSERT INTO raw_readings (turbidity, temperature, ph, status, latitude, longitude, address, site_key, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      latestData.turbidity,
      latestData.temperature,
      latestData.ph,
      latestData.status,
      typeof latestData.latitude === 'number' ? latestData.latitude : null,
      typeof latestData.longitude === 'number' ? latestData.longitude : null,
      latestData.address || null,
      siteIdentity.siteKey,
      now.toISOString()
    ],
    function (err) {
      if (err) {
        console.error('[raw_readings insert error]', err.message, { latestData });
      } else {
        console.log('[raw_readings] Inserted:', latestData);
      }
      // No alert generation here!
    }
  );
  // Aggregate/copy to readings table based on interval
  db.get("SELECT timestamp FROM readings WHERE site_key = ? ORDER BY timestamp DESC LIMIT 1", [siteIdentity.siteKey], (err, row) => {
    if (err) return;
    let shouldLog = false;
    if (!row) {
      shouldLog = true;
    } else if (row) {
      const last = new Date(row.timestamp);
      if (now.getTime() - last.getTime() >= intervalMs) {
        shouldLog = true;
      }
    }
    if (shouldLog) {
      db.run(
        "INSERT INTO readings (turbidity, temperature, ph, status, latitude, longitude, address, site_key, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          latestData.turbidity,
          latestData.temperature,
          latestData.ph,
          latestData.status,
          typeof latestData.latitude === 'number' ? latestData.latitude : null,
          typeof latestData.longitude === 'number' ? latestData.longitude : null,
          latestData.address || null,
          siteIdentity.siteKey,
          now.toISOString()
        ],
        function (err) {
          if (err) {
            console.error('[readings insert error]', err.message, { latestData });
          } else {
            console.log('[readings] Inserted:', latestData);
            generateAlertsFromData(latestData, now);
          }
        }
      );
      // ...existing code...
    }
  });
}, 1000);

function generateAlertsFromData(data, now = new Date()) {
  let alertMessages = [];
  const identity = buildSiteIdentity(data);

  ["Temperature", "pH", "Turbidity"].forEach((parameter) => {
    const level = classifyParameterRisk(parameter, data);
    if (level === "safe") return;

    const value = formatAlertValue(parameter, data);
    const message = buildAlertMessage(parameter, level);

    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy, address, site_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        level,
        message,
        parameter,
        value,
        now.toISOString(),
        0,
        identity.siteName,
        data.barangay || "Unknown",
        "-",
        null,
        identity.address,
        identity.siteKey
      ],
      (err) => { if (err) console.error('alerts insert error:', err); }
    );

    alertMessages.push(buildSmsLine(parameter, value, level));
  });

  // SMS is now schedule-based. Alerts remain stored for dashboard/reporting.
}

function classifyLevel(status) {
  if (status === "high-risk") return "critical";
  if (status === "possible-risk") return "warning";
  return "safe";
}

function classifyParameterRisk(parameter, data) {
  if (parameter === "Temperature") {
    if (data.temperature == null) return "safe";
    if (data.temperature >= 22 && data.temperature <= 30) return "critical";
    if ((data.temperature >= 20 && data.temperature < 22) || (data.temperature > 30 && data.temperature <= 35)) return "warning";
    return "safe";
  }

  if (parameter === "pH") {
    if (data.ph == null) return "safe";
    if (data.ph >= 6.5 && data.ph <= 8.0) return "critical";
    if ((data.ph >= 6.0 && data.ph < 6.5) || (data.ph > 8.0 && data.ph <= 8.5)) return "warning";
    return "safe";
  }

  if (parameter === "Turbidity") {
    if (data.turbidity == null) return "safe";
    if (data.turbidity < 5) return "critical";
    if (data.turbidity >= 5 && data.turbidity <= 15) return "warning";
    return "safe";
  }

  return "safe";
}

function formatAlertValue(parameter, data) {
  if (parameter === "Temperature") return `${Number(data.temperature).toFixed(1)} °C`;
  if (parameter === "pH") return `${Number(data.ph).toFixed(2)}`;
  if (parameter === "Turbidity") return `${Number(data.turbidity).toFixed(1)} NTU`;
  return "-";
}

function buildAlertMessage(parameter, level) {
  if (level === "critical") {
    return `High possible risk: ${parameter} is within the early-warning range for possible schistosomiasis risk. Please verify on site.`;
  }
  return `Moderate possible risk: ${parameter} is showing an early-warning signal. Please continue monitoring and validate the reading.`;
}

function buildSmsLine(parameter, value, level) {
  const levelText = level === "critical" ? "High Possible Risk" : "Moderate Possible Risk";
  return `${parameter}: ${value} (${levelText})`;
}

// Check alerts immediately (not wait for 5-minute save)
function checkAndAlertImmediate(data) {
  let alertMessages = [];
  const identity = buildSiteIdentity(data);

  ["Temperature", "pH", "Turbidity"].forEach((parameter) => {
    const level = classifyParameterRisk(parameter, data);
    if (level === "safe") return;
    const value = formatAlertValue(parameter, data);
    alertMessages.push(buildSmsLine(parameter, value, level));
  });

  // SMS is now schedule-based. Alerts remain stored for dashboard/reporting.
}


router.post("/", async (req, res) => {
  const { turbidity, temperature, ph, device_ip, latitude, longitude } = req.body;
  const status = classifyWater(temperature, ph, turbidity);
  let address = null;
  if (typeof latitude === 'number' && typeof longitude === 'number' && latitude !== null && longitude !== null) {
    try {
      address = await Promise.race([
        reverseGeocode(latitude, longitude),
        new Promise((resolve) => setTimeout(() => resolve(null), 2500))
      ]);
    } catch {
      address = null;
    }
  }
  latestData = {
    turbidity,
    temperature,
    ph,
    device_ip,
    latitude,
    longitude,
    address,
    siteKey: normalizeSiteKey(address || device_ip || GLOBAL_DEVICE_NAME),
    status,
    timestamp: new Date()
  };

  console.log("Received:", latestData);
  console.log(`✓ ESP32 connected - IP: ${device_ip}`);
  
  // Check for alerts on every reading (not just every 5 minutes)
  checkAndAlertImmediate(latestData);
  
  res.json({
    success: true,
    status,
    address
  });
});

router.get("/latest", (req, res) => {
  const sendDisconnectedWithLastLocation = () => {
    console.log('[API /latest] Triggered fallback: querying raw_readings for last GPS location...');
    db.get(
      "SELECT latitude, longitude, address, timestamp, site_key FROM raw_readings WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY timestamp DESC LIMIT 1",
      [],
      (dbErr, row) => {
        if (dbErr) {
          console.error('[API /latest] Failed to load last GPS location from DB:', dbErr.message);
          return res.json({ deviceConnected: false, siteName: GLOBAL_DEVICE_NAME });
        }

        console.log('[API /latest] Fallback query result:', row || 'NO ROW FOUND');

        if (row) {
          console.log('[API /latest] Returning disconnected with fallback coords:', { lat: row.latitude, lng: row.longitude, ts: row.timestamp });
          return res.json({
            deviceConnected: false,
            siteName: GLOBAL_DEVICE_NAME,
            siteKey: row.site_key || null,
            latitude: row.latitude,
            longitude: row.longitude,
            address: row.address || null,
            timestamp: row.timestamp || null,
          });
        }

        console.log('[API /latest] No GPS location found in raw_readings, returning bare disconnected status');
        return res.json({ deviceConnected: false, siteName: GLOBAL_DEVICE_NAME });
      }
    );
  };

  if (latestData) {
    // Consider device disconnected if last data is older than 10 seconds
    const now = Date.now();
    const ts = new Date(latestData.timestamp).getTime();
    const diffMs = Math.abs(now - ts);
    console.log('[API /latest] latestData fresh check: now=' + new Date(now).toISOString() + ' | ts=' + new Date(ts).toISOString() + ' | diffMs=' + diffMs + ' | threshold=10000ms | isFresh=' + (diffMs < 10000));

    if (Math.abs(now - ts) < 10000) {
      console.log('[API /latest] Data is fresh, returning as connected');
      res.json({
        ...latestData,
        siteName: GLOBAL_DEVICE_NAME,
        siteKey: latestData.siteKey || null,
        deviceConnected: true,
        timestamp: latestData.timestamp instanceof Date ? latestData.timestamp.toISOString() : latestData.timestamp,
        address: latestData.address || null
      });
    } else {
      console.warn('[API /latest] Device considered disconnected: data too old');
      sendDisconnectedWithLastLocation();
    }
  } else {
    console.warn('[API /latest] No latestData available, device considered disconnected');
    sendDisconnectedWithLastLocation();
  }
});

router.get("/history", (req, res) => {
  const site = (req.query.site || req.query.siteKey || req.query.address || '').toString().trim();
  const siteKey = site ? normalizeSiteKey(site) : null;
  const query = siteKey
    ? "SELECT * FROM readings WHERE site_key = ? ORDER BY timestamp DESC LIMIT 288"
    : "SELECT * FROM readings ORDER BY timestamp DESC LIMIT 288";
  const params = siteKey ? [siteKey] : [];

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.reverse());
  });
});

router.get("/alerts", (req, res) => {
  const site = (req.query.site || req.query.siteKey || req.query.address || '').toString().trim();
  const siteKey = site ? normalizeSiteKey(site) : null;
  const query = siteKey
    ? "SELECT * FROM alerts WHERE site_key = ? ORDER BY timestamp DESC LIMIT 100"
    : "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 100";
  const params = siteKey ? [siteKey] : [];

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/sites', (req, res) => {
  db.all(
    `SELECT site_key, site_name, address, latitude, longitude, first_seen, last_seen
     FROM site_registry
     ORDER BY last_seen DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

router.put('/sites/:siteKey', (req, res) => {
  const { siteKey } = req.params;
  const { siteName } = req.body;
  const trimmedSiteName = (siteName || '').toString().trim();

  if (!trimmedSiteName) {
    return res.status(400).json({ error: 'siteName is required' });
  }

  db.run(
    `UPDATE site_registry
     SET site_name = ?
     WHERE site_key = ?`,
    [trimmedSiteName, siteKey],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }

      db.setSetting('device_name', trimmedSiteName, (settingErr) => {
        if (settingErr) return res.status(500).json({ error: settingErr.message });

        GLOBAL_DEVICE_NAME = trimmedSiteName;

        db.get(
          `SELECT site_key, site_name, address, latitude, longitude, first_seen, last_seen
           FROM site_registry
           WHERE site_key = ?`,
          [siteKey],
          (selectErr, row) => {
            if (selectErr) return res.status(500).json({ error: selectErr.message });
            res.json({ success: true, deviceName: trimmedSiteName, site: row });
          }
        );
      });
    }
  );
});

// CSV upload endpoint for residents
router.post("/upload-csv", (req, res) => {
  const { siteName, csv } = req.body;
  
  if (!siteName || !csv) {
    return res.status(400).json({ error: "siteName and csv are required" });
  }

  resolveResidentSiteName(siteName, (resolveErr, resolvedSiteName) => {
    if (resolveErr) {
      return res.status(400).json({ error: resolveErr.message || 'Invalid siteName' });
    }

    // Parse CSV - expects format: name,phone
    // Note: CSV uploads always create residents. Municipal Health Officer and BHW roles must be set manually in UI.
    const lines = csv.trim().split('\n');
    const residents = [];

    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      const [name, phone] = parts;

      if (name && phone) {
        // Validate phone number
        if (!validatePhoneNumber(phone)) {
          continue; // Skip invalid phone numbers
        }
        // Format phone number
        const formattedPhone = formatPhoneNumber(phone);

        // CSV uploads always create residents; Municipal Health Officer/BHW must be set manually
        residents.push({ name, phone: formattedPhone, role: 'resident' });
      }
    }

    if (residents.length === 0) {
      return res.status(400).json({ error: "No valid residents found in CSV" });
    }

    // Insert or update residents (prevent duplicates)
    let inserted = 0;
    let updated = 0;
    let failed = 0;

    residents.forEach(({ name, phone, role }) => {
      // Check if resident with same siteName and phone exists
      db.get(
        "SELECT id FROM residents WHERE siteName = ? AND phone = ?",
        [resolvedSiteName, phone],
        (err, existingResident) => {
          if (err) {
            failed++;
          } else if (existingResident) {
            // Update existing resident
            db.run(
              "UPDATE residents SET name = ?, role = ? WHERE id = ?",
              [name, role, existingResident.id],
              (err) => {
                if (err) failed++;
                else updated++;

                // Respond after all operations complete
                if (inserted + updated + failed === residents.length) {
                  res.json({
                    success: true,
                    inserted,
                    updated,
                    failed,
                    message: `${inserted} new residents added, ${updated} updated`
                  });
                }
              }
            );
          } else {
            // Insert new resident
            db.run(
              "INSERT INTO residents (siteName, name, phone, role) VALUES (?, ?, ?, ?)",
              [resolvedSiteName, name, phone, role],
              (err) => {
                if (err) {
                  failed++;
                } else {
                  inserted++;
                }

                // Respond after all operations complete
                if (inserted + updated + failed === residents.length) {
                  res.json({
                    success: true,
                    inserted,
                    updated,
                    failed,
                    message: `${inserted} new residents added, ${updated} updated`
                  });
                }
              }
            );
          }
        }
      );
    });
  });
});

// Get residents for a site
router.get("/residents/:siteName", (req, res) => {
  const { siteName } = req.params;
  db.all(
    "SELECT id, siteName, name, phone, role, createdAt FROM residents WHERE siteName = ? ORDER BY role, name",
    [siteName],
    (err, rows) => {
      if (err) {
        console.error("Error fetching residents:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows || []);
    }
  );
});

// ===== RESIDENT CRUD ENDPOINTS =====

// POST - Add a new resident (prevent duplicates)
router.post("/residents", (req, res) => {
  const { siteName, name, phone, role = "resident" } = req.body;
  
  if (!siteName || !name || !phone) {
    return res.status(400).json({ error: "siteName, name, and phone are required" });
  }
  
  // Validate phone number
  if (!validatePhoneNumber(phone)) {
    return res.status(400).json({ error: "Invalid Philippine phone number format" });
  }
  
  const formattedPhone = formatPhoneNumber(phone);
  const validRoles = ["resident", "bhw", "municipal_health_officer"];
  const finalRole = validRoles.includes(role) ? role : "resident";

  resolveResidentSiteName(siteName, (resolveErr, resolvedSiteName) => {
    if (resolveErr) {
      return res.status(400).json({ error: resolveErr.message || 'Invalid siteName' });
    }

    // Check if resident with same siteName and phone already exists
    db.get(
      "SELECT id FROM residents WHERE siteName = ? AND phone = ?",
      [resolvedSiteName, formattedPhone],
      (err, existingResident) => {
        if (err) return res.status(500).json({ error: err.message });

        if (existingResident) {
          // Update existing resident
          db.run(
            "UPDATE residents SET name = ?, role = ? WHERE id = ?",
            [name, finalRole, existingResident.id],
            function(err) {
              if (err) return res.status(500).json({ error: err.message });
              res.json({
                id: existingResident.id,
                siteName: resolvedSiteName,
                name,
                phone: formattedPhone,
                role: finalRole,
                message: "Resident updated (duplicate prevented)"
              });
            }
          );
        } else {
          // Create new resident
          db.run(
            "INSERT INTO residents (siteName, name, phone, role) VALUES (?, ?, ?, ?)",
            [resolvedSiteName, name, formattedPhone, finalRole],
            function(err) {
              if (err) return res.status(500).json({ error: err.message });
              res.status(201).json({
                id: this.lastID,
                siteName: resolvedSiteName,
                name,
                phone: formattedPhone,
                role: finalRole,
                message: "Resident added"
              });
            }
          );
        }
      }
    );
  });
});

// PUT - Update a resident
router.put("/residents/:id", (req, res) => {
  const { id } = req.params;
  const { name, phone, role } = req.body;
  
  if (!name && !phone && role === undefined) {
    return res.status(400).json({ error: "At least one field to update is required" });
  }
  
  // Get current resident
  db.get("SELECT * FROM residents WHERE id = ?", [id], (err, resident) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!resident) return res.status(404).json({ error: "Resident not found" });
    
    const newName = name || resident.name;
    const newPhone = phone ? formatPhoneNumber(phone) : resident.phone;
    const validRoles = ["resident", "bhw", "municipal_health_officer"];
    const newRole = role ? (validRoles.includes(role) ? role : resident.role) : resident.role;
    
    // Validate phone if updated
    if (phone && !validatePhoneNumber(phone)) {
      return res.status(400).json({ error: "Invalid Philippine phone number format" });
    }
    
    db.run(
      "UPDATE residents SET name = ?, phone = ?, role = ? WHERE id = ?",
      [newName, newPhone, newRole, id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          id,
          name: newName,
          phone: newPhone,
          role: newRole,
          message: "Resident updated successfully"
        });
      }
    );
  });
});

// DELETE - Delete a resident
router.delete("/residents/:id", (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM residents WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Resident not found" });
    res.json({ success: true, message: "Resident deleted successfully" });
  });
});

// GET - Get residents by role
router.get("/residents-by-role/:role", (req, res) => {
  const { role } = req.params;
  const validRoles = ["resident", "bhw", "municipal_health_officer"];
  
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(", ")}` });
  }
  
  db.all("SELECT id, siteName, name, phone, role FROM residents WHERE role = ?", [role], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// GET - Get all residents across all sites with role filter
router.get("/residents", (req, res) => {
  const { siteName, role } = req.query;
  
  console.log("GET /residents - siteName:", siteName, "role:", role);
  
  let query = "SELECT id, siteName, name, phone, role, createdAt FROM residents WHERE 1=1";
  const params = [];
  
  const runQuery = (resolvedSiteName) => {
    if (resolvedSiteName) {
      query += " AND siteName = ?";
      params.push(resolvedSiteName);
    }

    if (role) {
      const validRoles = ["resident", "bhw", "municipal_health_officer"];
      if (!validRoles.includes(role)) {
        console.log("Invalid role:", role);
        return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(", ")}` });
      }
      query += " AND role = ?";
      params.push(role);
    }

    query += " ORDER BY siteName, role, name";

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log("Residents found:", rows ? rows.length : 0);
      res.json(rows || []);
    });
  };

  if (siteName) {
    return resolveResidentSiteName(siteName, (resolveErr, resolvedSiteName) => {
      if (resolveErr) {
        return res.status(400).json({ error: resolveErr.message || 'Invalid siteName' });
      }
      runQuery(resolvedSiteName);
    });
  }

  runQuery(null);
});

module.exports = router;