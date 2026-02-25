
const router = require("express").Router();
const classifyWater = require("../utils/classifyWater");
const db = require("../db");
const axios = require("axios");

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
  db.run(
    "UPDATE alerts SET isAcknowledged = 1, acknowledgedBy = ? WHERE id = ?",
    [acknowledgedBy || null, id],
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

let firstLogged = false;
setInterval(() => {
  if (!latestData) return;
  const now = new Date();
  db.get("SELECT timestamp FROM readings ORDER BY timestamp DESC LIMIT 1", [], (err, row) => {
    if (err) return;
    let shouldLog = false;
    if (!firstLogged && !row) {
      shouldLog = true;
      firstLogged = true;
    } else if (row) {
      const last = new Date(row.timestamp);
      if (now.getTime() - last.getTime() >= 5 * 60 * 1000) {
        shouldLog = true;
      }
    }
    if (shouldLog) {
      db.run(
        "INSERT INTO readings (turbidity, temperature, ph, status, timestamp) VALUES (?, ?, ?, ?, ?)",
        [latestData.turbidity, latestData.temperature, latestData.ph, latestData.status, now.toISOString()],
        function (err) {
          if (!err) generateAlertsFromData(latestData, now);
        }
      );
      db.all("SELECT id FROM readings ORDER BY timestamp", [], (err, rows) => {
        if (!err && rows.length > 288) {
          const toDelete = rows.slice(0, rows.length - 288);
          toDelete.forEach(r => db.run("DELETE FROM readings WHERE id = ?", [r.id]));
        }
      });
    }
  });
}, 1000);

function generateAlertsFromData(data, now = new Date()) {
  let alertMessages = [];

  // Overall water quality risk classification (all three parameters)
  const status = classifyWater(data.temperature, data.ph, data.turbidity);
  const level = classifyLevel(status);
  if (level !== "safe") {
    // Build parameter summary for alert
    const params = [];
    if (data.temperature != null && data.temperature >= 25 && data.temperature <= 30) params.push("Temperature");
    if (data.ph != null && data.ph >= 6.5 && data.ph <= 8.0) params.push("pH");
    if (data.turbidity != null && data.turbidity < 5) params.push("Turbidity");
    
    const msg = level === "critical"
      ? `Water conditions support schistosomiasis transmission. Risk detected in: ${params.length > 0 ? params.join(', ') : 'water quality'}`
      : `Possible schistosomiasis risk. Monitor water quality closely. Contributing parameters: ${params.length > 0 ? params.join(', ') : 'water conditions'}`;
    
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        level,
        msg,
        "Temperature",
        data.temperature + "°C",
        now.toISOString(),
        0,
        data.siteName || "Mang Jose's Fishpond",
        data.barangay || "Unknown",
        "-",
        null
      ]
    );
    
    alertMessages.push(`Temp: ${data.temperature.toFixed(1)} Degree Celsius (${level === "critical" ? "High" : "Possible"} Risk)`);
  }

  // Turbidity alert (clear water = higher schisto risk)
  if (data.turbidity != null && data.turbidity < 5) {
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
        data.siteName || "Mang Jose's Fishpond",
        data.barangay || "Unknown",
        "-",
        null
      ]
    );
    alertMessages.push(`Turbidity: ${data.turbidity.toFixed(1)} NTU (Clear Water - High Risk)`);
  } else if (data.turbidity != null && data.turbidity >= 5 && data.turbidity <= 15) {
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
        data.siteName || "Mang Jose's Fishpond",
        data.barangay || "Unknown",
        "-",
        null
      ]
    );
    alertMessages.push(`Turbidity: ${data.turbidity.toFixed(1)} NTU (Moderate - Possible Risk)`);
  }

  // pH alert (optimal for snails: 6.5-8.0 per WHO/DOH)
  if (data.ph != null && data.ph >= 6.5 && data.ph <= 8.0) {
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
        data.siteName || "Mang Jose's Fishpond",
        data.barangay || "Unknown",
        "-",
        null
      ]
    );
    alertMessages.push(`pH: ${data.ph.toFixed(1)} (High Risk)`);
  } else if (data.ph != null && ((data.ph >= 6.0 && data.ph < 6.5) || (data.ph > 8.0 && data.ph <= 8.5))) {
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
        data.siteName || "Mang Jose's Fishpond",
        data.barangay || "Unknown",
        "-",
        null
      ]
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

  // Send SMS for ANY alerts (critical or warning)
  if (alertMessages.length > 0) {
    console.log('🔍 Alert detected, looking for residents for site:', data.siteName || "Mang Jose's Fishpond");
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const timestamp = `${dateStr}, ${timeStr}`;
    const smsMessage = `SchistoGuard ALERT!\n[${timestamp}]\n\n${alertMessages.join('\n')}\n\nAction Required!`;
    
    // Get resident phone numbers for this site
    const siteName = data.siteName || "Mang Jose's Fishpond";
    db.all("SELECT DISTINCT phone FROM residents WHERE siteName = ?", [siteName], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching residents:", err.message);
        return;
      }
      
      if (!rows || rows.length === 0) {
        console.log(`⚠️ No residents found for site: "${siteName}"`);
        return;
      }
      
      console.log(`✓ Found ${rows.length} residents for site: "${siteName}"`);
      const phoneNumbers = rows.map(r => r.phone).filter(p => p);
      sendSMSViaESP32(smsMessage, alertMessages, phoneNumbers);
    });
  }
}


router.post("/", (req, res) => {
  const { turbidity, temperature, ph, device_ip } = req.body;
  const status = classifyWater(temperature, ph, turbidity);
  latestData = {
    turbidity,
    temperature,
    ph,
    device_ip,
    status,
    timestamp: new Date()
  };

  console.log("Received:", latestData);
  console.log(`✓ ESP32 connected - IP: ${device_ip}`);
  
  // Check for alerts on every reading (not just every 5 minutes)
  checkAndAlertImmediate(latestData);
  
  res.json({
    success: true,
    status
  });
});

router.get("/latest", (req, res) => {
  if (latestData) {
    res.json({
      ...latestData,
      timestamp: latestData.timestamp instanceof Date ? latestData.timestamp.toISOString() : latestData.timestamp
    });
  } else {
    db.get("SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1", [], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || null);
    });
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

  // Parse CSV - expects format: name,phone (one per line)
  const lines = csv.trim().split('\n');
  const residents = [];

  for (const line of lines) {
    const [name, phone] = line.split(',').map(s => s.trim());
    if (name && phone) {
      residents.push({ name, phone });
    }
  }

  if (residents.length === 0) {
    return res.status(400).json({ error: "No valid residents found in CSV" });
  }

  // Delete existing residents for this site
  db.run("DELETE FROM residents WHERE siteName = ?", [siteName], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Insert new residents
    let inserted = 0;
    let failed = 0;

    residents.forEach(({ name, phone }) => {
      db.run(
        "INSERT INTO residents (siteName, name, phone) VALUES (?, ?, ?)",
        [siteName, name, phone],
        (err) => {
          if (err) {
            failed++;
          } else {
            inserted++;
          }

          // Respond after all inserts complete
          if (inserted + failed === residents.length) {
            res.json({
              success: true,
              inserted,
              failed,
              message: `Uploaded ${inserted} residents for site: ${siteName}`
            });
          }
        }
      );
    });
  });
});

// Get residents for a site
router.get("/residents/:siteName", (req, res) => {
  const { siteName } = req.params;
  db.all("SELECT id, name, phone FROM residents WHERE siteName = ?", [siteName], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

module.exports = router;
