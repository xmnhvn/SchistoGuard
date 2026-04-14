const axios = require('axios');
require('dotenv').config();

// ESP32 connection settings - mDNS hostname with IP fallback
const ESP32_HOSTNAME = process.env.ESP32_HOSTNAME || 'schistoguard-esp32.local';
const ESP32_IP_FALLBACK = process.env.ESP32_IP_FALLBACK || '192.168.100.168';

// Backend URL - supports both cloud and local
const BACKEND_URL = process.env.ESP32_BACKEND_URL || 'https://schistoguard-production.up.railway.app/api/sensors';
const SITE_NAME = process.env.SITE_NAME || "Mang Jose's Fishpond";
const SMS_RELAY_TOKEN = process.env.SMS_RELAY_TOKEN || '';
const ENABLE_SMS_RELAY = String(process.env.ENABLE_SMS_RELAY || 'true').toLowerCase() === 'true';
const SMS_RELAY_POLL_INTERVAL = parseInt(process.env.SMS_RELAY_POLL_INTERVAL || '5000', 10);
const SMS_RELAY_BATCH_SIZE = parseInt(process.env.SMS_RELAY_BATCH_SIZE || '10', 10);

// Poll interval in milliseconds (2 seconds)
const POLL_INTERVAL = parseInt(process.env.ESP32_POLL_INTERVAL) || 2000;

const BACKEND_ROOT = BACKEND_URL.replace(/\/api\/sensors\/?$/, '');
const SMS_RELAY_PULL_URL = `${BACKEND_ROOT}/api/sensors/sms-relay/pull`;
const SMS_RELAY_ACK_URL = `${BACKEND_ROOT}/api/sensors/sms-relay/ack`;

let currentESP32URL = `http://${ESP32_HOSTNAME}/api/sensors`;
let useHostname = true;
let relayAuthWarningShown = false;

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
    
    const latitude = (typeof data.latitude === 'number' && Number.isFinite(data.latitude))
      ? data.latitude
      : null;
    const longitude = (typeof data.longitude === 'number' && Number.isFinite(data.longitude))
      ? data.longitude
      : null;

    // Prepare sensor data for backend
    const sensorData = {
      temperature: data.tempValid ? data.temperature : null,
      ph: data.phConnected ? data.pH : null,
      turbidity: data.turbConnected ? data.turbidity : null,
      device_ip: useHostname ? ESP32_HOSTNAME : ESP32_IP_FALLBACK,
      latitude,
      longitude,
      siteName: SITE_NAME
    };
    
    // Send to backend
    await axios.post(BACKEND_URL, sensorData);
    const gpsTag = latitude !== null && longitude !== null
      ? ` GPS=${latitude.toFixed(6)},${longitude.toFixed(6)}`
      : ' GPS=unavailable';
    console.log(`✓ Sensor data saved: T=${sensorData.temperature}°C pH=${sensorData.ph} Turb=${sensorData.turbidity}NTU${gpsTag}`);
    
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

async function sendSmsViaEsp32(phone, message) {
  let url = `http://${ESP32_HOSTNAME}/api/sms`;
  const payload = { phone, message };

  try {
    await axios.post(url, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: true };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      url = `http://${ESP32_IP_FALLBACK}/api/sms`;
      await axios.post(url, payload, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });
      return { success: true };
    }
    return { success: false, error: err.message || 'esp32-send-failed' };
  }
}

async function acknowledgeSmsJob(jobId, success, error) {
  if (!SMS_RELAY_TOKEN) return;

  try {
    await axios.post(
      SMS_RELAY_ACK_URL,
      { jobId, success, error: error || null },
      {
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'x-sms-relay-token': SMS_RELAY_TOKEN,
        },
      }
    );
  } catch (ackErr) {
    console.error(`✗ Failed to acknowledge SMS relay job ${jobId}:`, ackErr.message);
  }
}

async function pollSmsRelayQueue() {
  if (!ENABLE_SMS_RELAY) return;

  if (!SMS_RELAY_TOKEN) {
    if (!relayAuthWarningShown) {
      console.warn('⚠ SMS relay is enabled but SMS_RELAY_TOKEN is missing. Skipping relay polling.');
      relayAuthWarningShown = true;
    }
    return;
  }

  try {
    const response = await axios.post(
      SMS_RELAY_PULL_URL,
      { limit: SMS_RELAY_BATCH_SIZE },
      {
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'x-sms-relay-token': SMS_RELAY_TOKEN,
        },
      }
    );

    const jobs = Array.isArray(response.data?.jobs) ? response.data.jobs : [];
    if (!jobs.length) return;

    for (const job of jobs) {
      const result = await sendSmsViaEsp32(job.phone, job.message);
      await acknowledgeSmsJob(job.id, result.success, result.error || null);

      if (result.success) {
        console.log(`✓ SMS relay sent for job ${job.id} to ${job.phone}`);
      } else {
        console.error(`✗ SMS relay failed for job ${job.id} to ${job.phone}: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('✗ SMS relay poll error:', error.message);
  }
}

// Start polling
console.log(`Starting ESP32 sensor polling...`);
console.log(`Primary: http://${ESP32_HOSTNAME}/api/sensors`);
console.log(`Fallback: http://${ESP32_IP_FALLBACK}/api/sensors`);
console.log(`Sending data to backend at ${BACKEND_URL}`);
console.log(`Site name: ${SITE_NAME}`);
console.log(`Poll interval: ${POLL_INTERVAL}ms\n`);

if (ENABLE_SMS_RELAY) {
  console.log(`SMS relay queue polling enabled: ${SMS_RELAY_POLL_INTERVAL}ms (${SMS_RELAY_PULL_URL})`);
}

setInterval(fetchAndSaveSensorData, POLL_INTERVAL);
setInterval(pollSmsRelayQueue, SMS_RELAY_POLL_INTERVAL);

// Initial fetch
fetchAndSaveSensorData();
pollSmsRelayQueue();
