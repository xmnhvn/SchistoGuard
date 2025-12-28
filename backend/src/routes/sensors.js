const router = require("express").Router();
const classifyWater = require("../utils/classifyWater");

let latestData = null;
let alerts = [];

function classifyLevel(status) {
  if (status === "high-risk") return "critical";
  if (status === "possible-risk") return "warning";
  return "safe";
}

router.post("/", (req, res) => {
  const { turbidity, temperature } = req.body;

  const status = classifyWater(temperature); // classify by temperature
  latestData = {
    turbidity,
    temperature,
    status,
    timestamp: new Date()
  };

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

router.get("/latest", (req, res) => {
  res.json(latestData);
});

// New endpoint: get alerts (temperature only)
router.get("/alerts", (req, res) => {
  res.json(alerts);
});

module.exports = router;
