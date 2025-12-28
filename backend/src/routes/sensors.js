const router = require("express").Router();
const classifyWater = require("../utils/classifyWater");

let latestData = null;
let alerts = [];
let readings = [];

// Timer-based 5-min logging
setInterval(() => {
  if (!latestData) return;
  const now = new Date();
  const rounded = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), Math.floor(now.getMinutes() / 5) * 5, 0, 0);
  // Only store if not already stored for this 5-min slot
  if (!readings.length || new Date(readings[readings.length-1].timestamp).getTime() !== rounded.getTime()) {
    readings.push({
      ...latestData,
      timestamp: rounded.toISOString()
    });
    // Keep only last 288 readings (24h at 5min interval)
    if (readings.length > 288) readings = readings.slice(readings.length - 288);
  }
}, 300000); // 5 minutes

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

  // Always generate alert for every reading in possible-risk or high-risk
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
      value: temperature + "°C",
      timestamp: new Date().toISOString(),
      isAcknowledged: false,
      siteName: "Site 1", // You can update this as needed
      barangay: "Unknown", // You can update this as needed
      duration: "-",
      acknowledgedBy: null
    };
    alerts.unshift(alert);
    // Keep only last 50 alerts
    if (alerts.length > 50) alerts = alerts.slice(0, 50);
  }

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
