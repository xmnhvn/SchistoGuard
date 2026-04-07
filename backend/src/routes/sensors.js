const router = require("express").Router();
const fs = require('fs');
const classifyWater = require("../utils/classifyWater");
const { validatePhoneNumber, formatPhoneNumber } = require("../utils/validatePhone");
const db = require("../db");
const axios = require("axios");
const reverseGeocode = require("../utils/reverseGeocode");

// Generalized memory interval and global trackers
let AGGREGATE_INTERVAL_MS = 5 * 60 * 1000;
let GLOBAL_DEVICE_NAME = "Site Name";

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

  const newName = deviceName || "Site Name";
  
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

// ESP32 connection for SMS
const ESP32_HOSTNAME = 'schistoguard-esp32.local';
const ESP32_IP_FALLBACK = '192.168.100.168';
let lastSMSTime = 0;
const SMS_COOLDOWN_MS = 300000; // 5 minutes between successful SMS

async function sendSMSViaESP32(message, alertMessages = [], phoneNumbers = []) {
  const now = Date.now();
  
  // Prevent SMS spam - cooldown after any attempt (success or fail)
  if (now - lastSMSTime < SMS_COOLDOWN_MS) {
    return; // Silent cooldown
  }

  // If no phone numbers provided, skip
  if (!phoneNumbers || phoneNumbers.length === 0) {
    return;
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
    console.log(`⚠️ ALERT DETECTED [${timestamp}]:`, alertMessages.join(' | '));
    console.log('📱 Attempting to send SMS alert...');
    console.log(`   Message: ${message.substring(0, 50)}...`);
    console.log(`✓ SMS sent to ${sent}/${phoneNumbers.length} recipients (SIMULTANEOUS)`);
    
    if (failed > 0) {
      console.error(`✗ Failed to send to ${failed} recipients`);
    }

    lastSMSTime = now; // Start 5-minute cooldown
  } catch (error) {
    // Show failure logs once
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`⚠️ ALERT DETECTED [${timestamp}]:`, alertMessages.join(' | '));
    console.log('📱 Attempting to send SMS alert...');
    console.log(`   Message: ${message.substring(0, 50)}...`);
    console.error('✗ Failed to send SMS:', error.message);
    lastSMSTime = now; // Start 5-minute cooldown even on failure
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

let firstLogged = false;

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
  db.run(
    "INSERT INTO raw_readings (turbidity, temperature, ph, status, latitude, longitude, address, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      latestData.turbidity,
      latestData.temperature,
      latestData.ph,
      latestData.status,
      typeof latestData.latitude === 'number' ? latestData.latitude : null,
      typeof latestData.longitude === 'number' ? latestData.longitude : null,
      latestData.address || null,
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
  db.get("SELECT timestamp FROM readings ORDER BY timestamp DESC LIMIT 1", [], (err, row) => {
    if (err) return;
    let shouldLog = false;
    if (!firstLogged && !row) {
      shouldLog = true;
      firstLogged = true;
    } else if (row) {
      const last = new Date(row.timestamp);
      if (now.getTime() - last.getTime() >= intervalMs) {
        shouldLog = true;
      }
    }
    if (shouldLog) {
      db.run(
        "INSERT INTO readings (turbidity, temperature, ph, status, latitude, longitude, address, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          latestData.turbidity,
          latestData.temperature,
          latestData.ph,
          latestData.status,
          typeof latestData.latitude === 'number' ? latestData.latitude : null,
          typeof latestData.longitude === 'number' ? latestData.longitude : null,
          latestData.address || null,
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

  // Overall water quality risk classification (all three parameters)
  const status = classifyWater(data.temperature, data.ph, data.turbidity);
  const level = classifyLevel(status);
  // Track which parameters already have an alert
  const alertedParams = new Set();
  if (level !== "safe") {
    // Build parameter summary for alert
    const params = [];
    if (data.temperature != null && data.temperature >= 25 && data.temperature <= 30) params.push("Temperature");
    if (data.ph != null && data.ph >= 6.5 && data.ph <= 8.0) params.push("pH");
    if (data.turbidity != null && data.turbidity < 5) params.push("Turbidity");
    // Insert one alert per parameter
    params.forEach(param => {
      let msg = level === "critical"
        ? `Water conditions support schistosomiasis transmission. Risk detected in: ${param}`
        : `Possible schistosomiasis risk. Monitor water quality closely. Contributing parameter: ${param}`;
      let value = "";
      if (param === "Temperature") value = data.temperature + "°C";
      if (param === "pH") value = data.ph;
      if (param === "Turbidity") value = data.turbidity + " NTU";
      db.run(
        `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          level,
          msg,
          param,
          value,
          now.toISOString(),
          0,
          data.siteName || GLOBAL_DEVICE_NAME,
          data.barangay || "Unknown",
          "-",
          null
        ],
        (err) => { if (err) console.error('alerts insert error:', err); }
      );
      alertedParams.add(param);
      alertMessages.push(`${param}: ${value} (${level === "critical" ? "High" : "Possible"} Risk)`);
    });
  }

  // Turbidity alert (clear water = higher schisto risk)
  if (data.turbidity != null && data.turbidity < 5 && !alertedParams.has("Turbidity")) {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "critical",
        "Clear water detected - Higher schistosomiasis risk (slow/stagnant water)",
        "Turbidity",
        data.turbidity + " NTU",
        now.toISOString(),
        0,
        data.siteName || GLOBAL_DEVICE_NAME,
        data.barangay || "Unknown",
        "-",
        null
      ],
      (err) => { if (err) console.error('alerts insert error:', err); }
    );
    alertMessages.push(`Turbidity: ${data.turbidity.toFixed(1)} NTU (Clear Water - High Risk)`);
  } else if (data.turbidity != null && data.turbidity >= 5 && data.turbidity <= 15 && !alertedParams.has("Turbidity")) {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "warning",
        "Moderate water clarity - Possible schisto habitat",
        "Turbidity",
        data.turbidity + " NTU",
        now.toISOString(),
        0,
        data.siteName || GLOBAL_DEVICE_NAME,
        data.barangay || "Unknown",
        "-",
        null
      ],
      (err) => { if (err) console.error('alerts insert error:', err); }
    );
    alertMessages.push(`Turbidity: ${data.turbidity.toFixed(1)} NTU (Moderate - Possible Risk)`);
  }

  // pH alert (optimal for snails: 6.5-8.0 per WHO/DOH)
  if (data.ph != null && data.ph >= 6.5 && data.ph <= 8.0 && !alertedParams.has("pH")) {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "critical",
        "pH level optimal for schistosome-transmitting snails (6.5-8.0)",
        "pH",
        data.ph,
        now.toISOString(),
        0,
        data.siteName || GLOBAL_DEVICE_NAME,
        data.barangay || "Unknown",
        "-",
        null
      ],
      (err) => { if (err) console.error('alerts insert error:', err); }
    );
    alertMessages.push(`pH: ${data.ph.toFixed(1)} (High Risk)`);
  } else if (data.ph != null && ((data.ph >= 6.0 && data.ph < 6.5) || (data.ph > 8.0 && data.ph <= 8.5)) && !alertedParams.has("pH")) {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "warning",
        "pH level allows snail survival - Possible schisto risk",
        "pH",
        data.ph,
        now.toISOString(),
        0,
        data.siteName || GLOBAL_DEVICE_NAME,
        data.barangay || "Unknown",
        "-",
        null
      ],
      (err) => { if (err) console.error('alerts insert error:', err); }
    );
    alertMessages.push(`pH: ${data.ph.toFixed(1)} (Possible Risk)`);
  }

  // Send SMS for ANY alerts (critical or warning)
  if (alertMessages.length > 0) {
    const timestamp = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const smsMessage = `SchistoGuard ALERT!\n[Recorded: ${timestamp}]\n\n${alertMessages.join('\n')}\n\nAction Required!`;
    sendSMSViaESP32(smsMessage);
  }
}

function classifyLevel(status) {
  if (status === "high-risk") return "critical";
  if (status === "possible-risk") return "warning";
  return "safe";
}

// Check alerts immediately (not wait for 5-minute save)
function checkAndAlertImmediate(data) {
  let alertMessages = [];

  // Overall water quality risk classification (all three parameters)
  const status = classifyWater(data.temperature, data.ph, data.turbidity);
  const level = classifyLevel(status);
  
  // Add individual parameter alerts with details
  if (data.temperature != null) {
    if (data.temperature >= 25 && data.temperature <= 30) {
      alertMessages.push(`🌡️ Temperature: ${data.temperature.toFixed(1)}°C (HIGH RISK - Optimal for snails)`);
    } else if ((data.temperature >= 20 && data.temperature < 25) || (data.temperature > 30 && data.temperature <= 32)) {
      alertMessages.push(`🌡️ Temperature: ${data.temperature.toFixed(1)}°C (Possible Risk)`);
    }
  }

  // Turbidity
  if (data.turbidity != null) {
    if (data.turbidity < 5) {
      alertMessages.push(`💧 Turbidity: ${data.turbidity.toFixed(1)} NTU (HIGH RISK - Clear/Stagnant Water)`);
    } else if (data.turbidity >= 5 && data.turbidity <= 15) {
      alertMessages.push(`💧 Turbidity: ${data.turbidity.toFixed(1)} NTU (Possible Risk)`);
    }
  }

  // pH
  if (data.ph != null) {
    if (data.ph >= 6.5 && data.ph <= 8.0) {
      alertMessages.push(`⚗️ pH: ${data.ph.toFixed(1)} (HIGH RISK - Optimal for snails)`);
    } else if ((data.ph >= 6.0 && data.ph < 6.5) || (data.ph > 8.0 && data.ph <= 8.5)) {
      alertMessages.push(`⚗️ pH: ${data.ph.toFixed(1)} (Possible Risk)`);
    }
  }

  // Send SMS for ANY alerts (critical or warning) ONLY if device is connected (last data < 10s)
  if (alertMessages.length > 0) {
    const now = Date.now();
    const ts = new Date(data.timestamp).getTime();
    if (Math.abs(now - ts) < 10000) {
      console.log('🔍 Alert detected, looking for residents for site:', data.siteName || GLOBAL_DEVICE_NAME);
      const nowDate = new Date();
      const dateStr = nowDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      const timeStr = nowDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const timestamp = `${dateStr}, ${timeStr}`;
      const smsMessage = `SchistoGuard ALERT!\n[${timestamp}]\n\n${alertMessages.join('\n')}\n\nAction Required!`;
      // Get resident phone numbers for this site - prioritize BHWs and LGUs
      const siteName = data.siteName || GLOBAL_DEVICE_NAME;
      db.all(
        "SELECT phone, role FROM residents WHERE siteName = ? ORDER BY CASE WHEN role='bhw' THEN 1 WHEN role='lgu' THEN 2 ELSE 3 END",
        [siteName],
        (err, rows) => {
          if (err) {
            console.error("❌ Error fetching residents:", err.message);
            return;
          }
          if (!rows || rows.length === 0) {
            console.log(`⚠️ No residents found for site: "${siteName}"`);
            return;
          }
          // Send to all residents (BHWs + LGUs + residents)
          const phoneNumbers = rows.map(r => r.phone).filter(p => p);
          const roles = [...new Set(rows.map(r => r.role))];
          console.log(`✓ Found ${rows.length} alert recipients for site: "${siteName}"`);
          console.log(`   Roles: ${roles.join(', ').toUpperCase()}`);
          sendSMSViaESP32(smsMessage, alertMessages, phoneNumbers);
        }
      );
    } else {
      console.log('Device not connected: SMS alert not sent.');
    }
  }
}


router.post("/", async (req, res) => {
  const { turbidity, temperature, ph, device_ip, latitude, longitude } = req.body;
  const status = classifyWater(temperature, ph, turbidity);
  let address = null;
  if (typeof latitude === 'number' && typeof longitude === 'number' && latitude !== null && longitude !== null) {
    address = await reverseGeocode(latitude, longitude);
  }
  latestData = {
    turbidity,
    temperature,
    ph,
    device_ip,
    latitude,
    longitude,
    address,
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
      "SELECT latitude, longitude, address, timestamp FROM raw_readings WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY timestamp DESC LIMIT 1",
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
  db.all("SELECT * FROM readings ORDER BY timestamp DESC LIMIT 288", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.reverse());
  });
});

router.get("/alerts", (req, res) => {
  db.all("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 100", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CSV upload endpoint for residents
router.post("/upload-csv", (req, res) => {
  const { siteName, csv } = req.body;
  
  if (!siteName || !csv) {
    return res.status(400).json({ error: "siteName and csv are required" });
  }

  // Parse CSV - expects format: name,phone
  // Note: CSV uploads always create residents. LGU and BHW roles must be set manually in UI.
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
      
      // CSV uploads always create residents; LGU/BHW must be set manually
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
      [siteName, phone],
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
            [siteName, name, phone, role],
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
  const validRoles = ["resident", "bhw", "lgu"];
  const finalRole = validRoles.includes(role) ? role : "resident";
  
  // Check if resident with same siteName and phone already exists
  db.get(
    "SELECT id FROM residents WHERE siteName = ? AND phone = ?",
    [siteName, formattedPhone],
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
              siteName,
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
          [siteName, name, formattedPhone, finalRole],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({
              id: this.lastID,
              siteName,
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
    const validRoles = ["resident", "bhw", "lgu"];
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
  const validRoles = ["resident", "bhw", "lgu"];
  
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
  
  if (siteName) {
    query += " AND siteName = ?";
    params.push(siteName);
  }
  
  if (role) {
    const validRoles = ["resident", "bhw", "lgu"];
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
});

module.exports = router;