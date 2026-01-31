
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');
const port = new SerialPort({ path: 'COM6', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', async (line) => {
  // Log every line received from serial
  console.log('[SERIAL]', line);

  const trimmed = line.trim();
  if (trimmed.startsWith('SMS_SENT:')) {
    console.log('SMS sent:', trimmed.substring(9));
    return;
  }
  const parts = trimmed.split(',');
  // If GPS data is included (temp, turbidity, ph, lat, lng)
  if (parts.length === 5) {
    const temp = parseFloat(parts[0]);
    const turbidity = parseFloat(parts[1]);
    const ph = parseFloat(parts[2]);
    const lat = parseFloat(parts[3]);
    const lng = parseFloat(parts[4]);
    if (!isNaN(temp) && !isNaN(turbidity) && !isNaN(ph) && !isNaN(lat) && !isNaN(lng)) {
      try {
        await axios.post('http://localhost:3001/api/sensors', {
          temperature: temp,
          turbidity: turbidity,
          ph: ph,
          lat: lat,
          lng: lng
        });
        console.log('Posted temperature:', temp, 'turbidity:', turbidity, 'ph:', ph, 'lat:', lat, 'lng:', lng);
      } catch (err) {
        console.error('Failed to post:', err.message);
      }
    } else {
      console.log('Invalid numeric data:', line);
    }
  } else if (parts.length === 3) {
    // Fallback: old format (no GPS)
    const temp = parseFloat(parts[0]);
    const turbidity = parseFloat(parts[1]);
    const ph = parseFloat(parts[2]);
    if (!isNaN(temp) && !isNaN(turbidity) && !isNaN(ph)) {
      try {
        await axios.post('http://localhost:3001/api/sensors', {
          temperature: temp,
          turbidity: turbidity,
          ph: ph
        });
        console.log('Posted temperature:', temp, 'turbidity:', turbidity, 'ph:', ph);
      } catch (err) {
        console.error('Failed to post:', err.message);
      }
    } else {
      console.log('Invalid numeric data:', line);
    }
  } else {
    console.log('Unexpected serial data format:', line);
  }
});

port.on('error', (err) => {
  console.error('Serial port error:', err.message);
});

// Function to send current alerts to Arduino
async function sendAlertsToArduino() {
  try {
    const res = await axios.get('http://localhost:3001/api/sensors/alerts');
    const alerts = res.data.filter(a => !a.isAcknowledged);
    if (alerts.length === 0) return;
    let alertLines = alerts.map(a => {
      if (a.parameter === 'Turbidity') return `Turbidity: ${parseFloat(a.value)}`;
      if (a.parameter === 'pH') return `pH: ${parseFloat(a.value)}`;
      if (a.parameter === 'Temperature') return `Temperature: ${parseFloat(a.value)}`;
      return `${a.parameter}: ${a.value}`;
    });
    const batch = alertLines.join('\n');
    // Send each alert line as a separate line to Arduino
    port.write(batch + '\n');
    console.log('Sent alerts to Arduino (for SMS):', batch);
  } catch (err) {
    console.error('Failed to send alerts to Arduino:', err.message);
  }
}

// Example: send alerts every 10 seconds (customize as needed)
setInterval(sendAlertsToArduino, 10000);
