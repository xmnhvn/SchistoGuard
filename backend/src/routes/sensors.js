
const router = require("express").Router();
const classifyWater = require("../utils/classifyWater");
const db = require("../db");
const axios = require("axios");

// ESP32 connection for SMS
const ESP32_HOSTNAME = 'schistoguard-esp32.local';
const ESP32_IP_FALLBACK = '192.168.100.168';
let lastSMSTime = 0;
const SMS_COOLDOWN_MS = 300000; // 5 minutes between successful SMS

async function sendSMSViaESP32(message, alertMessages = []) {
  const now = Date.now();
  
  // Prevent SMS spam - cooldown after any attempt (success or fail)
  if (now - lastSMSTime < SMS_COOLDOWN_MS) {
    return; // Silent cooldown
  }

  try {
    // Try hostname first
    let url = `http://${ESP32_HOSTNAME}/api/sms`;
    try {
      await axios.post(url, { message }, { timeout: 5000 });
      // Show logs only on success
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      console.log(`⚠️ ALERT DETECTED [${timestamp}]:`, alertMessages.join(' | '));
      console.log('📱 Attempting to send SMS alert...');
      console.log(`   Message: ${message.substring(0, 50)}...`);
      console.log('✓ SMS sent via ESP32 (hostname)');
      lastSMSTime = now; // Start 5-minute cooldown
      return;
    } catch (err) {
      // Fallback to IP
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        url = `http://${ESP32_IP_FALLBACK}/api/sms`;
        await axios.post(url, { message }, { timeout: 5000 });
        // Show logs only on success
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        console.log(`⚠️ ALERT DETECTED [${timestamp}]:`, alertMessages.join(' | '));
        console.log('📱 Attempting to send SMS alert...');
        console.log(`   Message: ${message.substring(0, 50)}...`);
        console.log('✓ SMS sent via ESP32 (IP fallback)');
        lastSMSTime = now; // Start 5-minute cooldown
      } else {
        throw err;
      }
    }
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

  // Temperature alert (based on schistosomiasis risk)
  const status = classifyWater(data.temperature);
  const level = classifyLevel(status);
  if (level !== "safe") {
    const msg = level === "critical"
      ? "Temperature is in high schistosomiasis risk range (25-30°C)"
      : "Temperature is in possible schistosomiasis risk range";
    
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
        data.siteName || "Site 1",
        data.barangay || "Unknown",
        "-",
        null
      ]
    );
    
    alertMessages.push(`Temp: ${data.temperature.toFixed(1)}°C (${level === "critical" ? "High" : "Possible"} Risk)`);
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
        data.siteName || "Site 1",
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
        data.siteName || "Site 1",
        data.barangay || "Unknown",
        "-",
        null
      ]
    );
    alertMessages.push(`Turbidity: ${data.turbidity.toFixed(1)} NTU (Moderate - Possible Risk)`);
  }

  // pH alert (optimal for snails: 7.0-8.5)
  if (data.ph != null && data.ph >= 7.0 && data.ph <= 8.5) {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "critical",
        "pH level optimal for schistosome-transmitting snails (7.0-8.5)",
        "pH",
        data.ph,
        now.toISOString(),
        0,
        data.siteName || "Site 1",
        data.barangay || "Unknown",
        "-",
        null
      ]
    );
    alertMessages.push(`pH: ${data.ph.toFixed(1)} (High Risk)`);
  } else if (data.ph != null && ((data.ph >= 6.5 && data.ph < 7.0) || (data.ph > 8.5 && data.ph <= 9.0))) {
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
        data.siteName || "Site 1",
        data.barangay || "Unknown",
        "-",
        null
      ]
    );
    alertMessages.push(`pH: ${data.ph.toFixed(1)} (Possible Risk)`);
  }

  // Send SMS for ANY alerts (critical or warning)
  if (alertMessages.length > 0) {
    const smsMessage = `SchistoGuard ALERT!\n${alertMessages.join('\n')}\nAction Required!`;
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

  // Temperature
  const status = classifyWater(data.temperature);
  const level = classifyLevel(status);
  if (level !== "safe") {
    alertMessages.push(`Temp: ${data.temperature.toFixed(1)}°C (${level === "critical" ? "High" : "Possible"} Risk)`);
  }

  // Turbidity
  if (data.turbidity != null && data.turbidity < 5) {
    alertMessages.push(`Turbidity: ${data.turbidity.toFixed(1)} NTU (Clear Water - High Risk)`);
  } else if (data.turbidity != null && data.turbidity >= 5 && data.turbidity <= 15) {
    alertMessages.push(`Turbidity: ${data.turbidity.toFixed(1)} NTU (Moderate - Possible Risk)`);
  }

  // pH
  if (data.ph != null && data.ph >= 7.0 && data.ph <= 8.5) {
    alertMessages.push(`pH: ${data.ph.toFixed(1)} (High Risk)`);
  } else if (data.ph != null && ((data.ph >= 6.5 && data.ph < 7.0) || (data.ph > 8.5 && data.ph <= 9.0))) {
    alertMessages.push(`pH: ${data.ph.toFixed(1)} (Possible Risk)`);
  }

  // Log and send SMS if there are alerts
  if (alertMessages.length > 0) {
    const smsMessage = `SchistoGuard ALERT!\n${alertMessages.join('\n')}\nAction Required!`;
    sendSMSViaESP32(smsMessage, alertMessages);
  }
}


router.post("/", (req, res) => {
  const { turbidity, temperature, ph, device_ip } = req.body;
  const status = classifyWater(temperature);
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

module.exports = router;
