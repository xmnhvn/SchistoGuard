const router = require("express").Router();
const classifyWater = require("../utils/classifyWater");

let latestData = null;

router.post("/", (req, res) => {
  const { turbidity, temperature } = req.body;

  const status = classifyWater(turbidity);

  latestData = {
    turbidity,
    temperature,
    status,
    timestamp: new Date()
  };

  console.log("Received:", latestData);

  res.json({
    success: true,
    status
  });
});

router.get("/latest", (req, res) => {
  res.json(latestData);
});

module.exports = router;
