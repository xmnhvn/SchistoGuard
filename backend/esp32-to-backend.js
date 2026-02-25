const axios = require('axios');

// ESP32 connection settings - mDNS hostname with IP fallback
const ESP32_HOSTNAME = 'schistoguard-esp32.local';
const ESP32_IP_FALLBACK = '192.168.100.168';
const BACKEND_URL = 'http://localhost:3001/api/sensors';
const SITE_NAME = process.env.SITE_NAME || "Mang Jose's Fishpond"; // Default site name

// Poll interval in milliseconds (2 seconds)
const POLL_INTERVAL = 2000;

let currentESP32URL = `http://${ESP32_HOSTNAME}/api/sensors`;
let useHostname = true;

async function fetchAndSaveSensorData() {
  try {
    // Try fetching from current URL (hostname or IP)
    const response = await axios.get(currentESP32URL, { timeout: 5000 });
    const data = response.data;
    
    // If using IP fallback and this succeeds, log it once
    if (!useHostname) {
      console.log(`ℹ Using IP fallback: ${ESP32_IP_FALLBACK}`);
      useHostname = false; // Stay on IP
    }
    
    // Prepare sensor data for backend
    const sensorData = {
      temperature: data.tempValid ? data.temperature : null,
      ph: data.phConnected ? data.pH : null,
      turbidity: data.turbConnected ? data.turbidity : null,
      device_ip: useHostname ? ESP32_HOSTNAME : ESP32_IP_FALLBACK,
      siteName: SITE_NAME
    };
    
    // Send to backend
    await axios.post(BACKEND_URL, sensorData);
    console.log(`✓ Sensor data saved: T=${sensorData.temperature}°C pH=${sensorData.ph} Turb=${sensorData.turbidity}NTU`);
    
  } catch (error) {
    // If hostname fails, try IP fallback
    if (useHostname && (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ETIMEDOUT')) {
      console.log(`⚠ Hostname ${ESP32_HOSTNAME} not found, switching to IP fallback...`);
      useHostname = false;
      currentESP32URL = `http://${ESP32_IP_FALLBACK}/api/sensors`;
      // Retry immediately with IP
      return fetchAndSaveSensorData();
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error(`✗ Cannot reach ESP32 at ${currentESP32URL} - Check WiFi connection`);
    } else {
      console.error(`✗ Error fetching/saving sensor data:`, error.message);
    }
  }
}

// Start polling
console.log(`Starting ESP32 sensor polling...`);
console.log(`Primary: http://${ESP32_HOSTNAME}/api/sensors`);
console.log(`Fallback: http://${ESP32_IP_FALLBACK}/api/sensors`);
console.log(`Sending data to backend at ${BACKEND_URL}`);
console.log(`Site name: ${SITE_NAME}`);
console.log(`Poll interval: ${POLL_INTERVAL}ms\n`);

setInterval(fetchAndSaveSensorData, POLL_INTERVAL);

// Initial fetch
fetchAndSaveSensorData();
