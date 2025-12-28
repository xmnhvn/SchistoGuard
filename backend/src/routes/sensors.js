
const router = require("express").Router();
const classifyWater = require("../utils/classifyWater");

// Acknowledge an alert by id
router.post("/alerts/:id/acknowledge", (req, res) => {
  const { id } = req.params;
  const { acknowledgedBy } = req.body;
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    alert.isAcknowledged = true;
    if (acknowledgedBy) alert.acknowledgedBy = acknowledgedBy;
    return res.json({ success: true, alert });
  } else {
    return res.status(404).json({ success: false, message: "Alert not found" });
  }
});

let latestData = null;
let alerts = [];
let readings = [];

// Timer-based 5-min logging
let firstLogged = false;
setInterval(() => {
  if (!latestData) return;
  const now = new Date();
  if (!firstLogged) {
    readings.push({ ...latestData, timestamp: now.toISOString() });
    // --- ALERT GENERATION ON FIRST LOG ---
    generateAlertsFromData(latestData);
    firstLogged = true;
    return;
  }
  // Only store if at least 5 minutes have passed since last record
  if (readings.length > 0) {
    const last = new Date(readings[readings.length-1].timestamp);
    if (now.getTime() - last.getTime() >= 5 * 60 * 1000) {
      readings.push({ ...latestData, timestamp: now.toISOString() });
      // --- ALERT GENERATION EVERY 5 MINUTES ---
      generateAlertsFromData(latestData);
      if (readings.length > 288) readings = readings.slice(readings.length - 288);
    }
  }
}, 1000); // check every second for more accurate first log

// Helper function to generate alerts for all parameters
function generateAlertsFromData(data) {

  // Temperature alert
  const status = classifyWater(data.temperature);
  const level = classifyLevel(status);
  if (level !== "safe") {
    const alert = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      level,
      message:
        level === "critical"
          ? "Temperature is in high schistosomiasis risk range"
          : "Temperature is in possible schistosomiasis risk range",
      parameter: "Temperature",
      value: data.temperature + "°C",
      timestamp: new Date().toISOString(),
      isAcknowledged: false,
      siteName: data.siteName || "Site 1",
      barangay: data.barangay || "Unknown",
      duration: "-",
      acknowledgedBy: null
    };
    alerts.unshift(alert);
  }
  // Turbidity alert
  if (data.turbidity < 1 || data.turbidity > 5) {
    const turbAlert = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      level: (data.turbidity > 5 ? "critical" : "warning"),
      message: data.turbidity > 5 ? "Turbidity is too high" : "Turbidity is too low",
      parameter: "Turbidity",
      value: data.turbidity + " NTU",
      timestamp: new Date().toISOString(),
      isAcknowledged: false,
      siteName: data.siteName || "Site 1",
      barangay: data.barangay || "Unknown",
      duration: "-",
      acknowledgedBy: null
    };
    alerts.unshift(turbAlert);
  }
  // pH alert (critical and warning)
  if (data.ph < 6.5 || data.ph > 8.5) {
    const phAlert = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      level: "critical",
      message: data.ph < 6.5 ? "pH level is too low" : "pH level is too high",
      parameter: "pH",
      value: data.ph,
      timestamp: new Date().toISOString(),
      isAcknowledged: false,
      siteName: data.siteName || "Site 1",
      barangay: data.barangay || "Unknown",
      duration: "-",
      acknowledgedBy: null
    };
    alerts.unshift(phAlert);
  } else if ((data.ph >= 6.5 && data.ph < 7.0) || (data.ph > 8.0 && data.ph <= 8.5)) {
    const phWarning = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      level: "warning",
      message: data.ph < 7.0 ? "pH level is slightly low" : "pH level is slightly high",
      parameter: "pH",
      value: data.ph,
      timestamp: new Date().toISOString(),
      isAcknowledged: false,
      siteName: data.siteName || "Site 1",
      barangay: data.barangay || "Unknown",
      duration: "-",
      acknowledgedBy: null
    };
    alerts.unshift(phWarning);
  }
  // Do not remove alerts by count; keep all until acknowledged
}

function classifyLevel(status) {
  if (status === "high-risk") return "critical";
  if (status === "possible-risk") return "warning";
  return "safe";
}


router.post("/", (req, res) => {
  const { turbidity, temperature, ph } = req.body;

  const status = classifyWater(temperature); // classify by temperature
  latestData = {
    turbidity,
    temperature,
    ph,
    status,
    timestamp: new Date()
  };

  // No more time series logging here; handled by timer above

  // No alert generation here; handled by timer above

  console.log("Received:", latestData);

  res.json({
    success: true,
    status
  });
});


// Get the latest reading
router.get("/latest", (req, res) => {
  res.json(latestData);
});

// Get all readings for the last 24 hours (5-min interval)
router.get("/history", (req, res) => {
  res.json(readings);
});

// New endpoint: get alerts (temperature only)
router.get("/alerts", (req, res) => {
  res.json(alerts);
});

module.exports = router;
