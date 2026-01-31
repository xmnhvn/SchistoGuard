
const router = require("express").Router();
const classifyWater = require("../utils/classifyWater");
const db = require("../db");

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

  const status = classifyWater(data.temperature);
  const level = classifyLevel(status);
  if (level !== "safe") {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        level,
        level === "critical"
          ? "Temperature is in high schistosomiasis risk range"
          : "Temperature is in possible schistosomiasis risk range",
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
  }

  if (data.turbidity < 1 || data.turbidity > 5) {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.turbidity > 5 ? "critical" : "warning",
        data.turbidity > 5 ? "Turbidity is too high" : "Turbidity is too low",
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
  }

  if (data.ph < 6.5 || data.ph > 8.5) {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "critical",
        data.ph < 6.5 ? "pH level is too low" : "pH level is too high",
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
  } else if ((data.ph >= 6.5 && data.ph < 7.0) || (data.ph > 8.0 && data.ph <= 8.5)) {
    db.run(
      `INSERT INTO alerts (level, message, parameter, value, timestamp, isAcknowledged, siteName, barangay, duration, acknowledgedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "warning",
        data.ph < 7.0 ? "pH level is slightly low" : "pH level is slightly high",
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
  }
}

function classifyLevel(status) {
  if (status === "high-risk") return "critical";
  if (status === "possible-risk") return "warning";
  return "safe";
}


router.post("/", (req, res) => {
  const { turbidity, temperature, ph, lat, lng } = req.body;
  const status = classifyWater(temperature);
  latestData = {
    turbidity,
    temperature,
    ph,
    lat,
    lng,
    status,
    timestamp: new Date()
  };

  console.log("Received:", latestData);
  // Immediately push current alerts to Arduino for SMS
  try {
    const serialBackend = require("../../serial-to-backend.js");
    if (serialBackend && typeof serialBackend.sendAlertsToArduino === 'function') {
      serialBackend.sendAlertsToArduino();
    }
  } catch (e) {
    console.error("Failed to trigger alert push to Arduino:", e.message);
  }
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
