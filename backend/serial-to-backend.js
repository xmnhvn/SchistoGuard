
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

let port = null;  // Initialize port variable

// Function to send current alerts to Arduino
async function sendAlertsToArduino() {
  try {
    if (!port || !port.isOpen) {
      // Port not ready, skip this cycle
      return;
    }
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

// Initialize SerialPort connection to Arduino (for SMS alerts)
async function initSerialPort() {
  try {
    const ports = await SerialPort.list();
    console.log('Available serial ports:', ports);
    
    // Try to find Arduino on common ports
    const arduinoPort = ports.find(p => p.path.includes('COM') || p.path.includes('ttyUSB') || p.path.includes('ttyACM'));
    
    if (!arduinoPort) {
      console.warn('⚠ No Arduino serial port found. SMS alerts will be disabled.');
      console.warn('  Available ports:', ports.map(p => p.path).join(', '));
      return;
    }
    
    port = new SerialPort({ path: arduinoPort.path, baudRate: 9600 });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    
    port.on('open', () => {
      console.log(`✓ Arduino serial port opened on ${arduinoPort.path}`);
    });
    
    parser.on('data', (data) => {
      console.log('Received from Arduino:', data);
    });
    
    port.on('error', (err) => {
      console.error('Serial port error:', err.message);
    });
  } catch (err) {
    console.error('Failed to initialize serial port:', err.message);
  }
}

initSerialPort();
