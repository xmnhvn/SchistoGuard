// This script reads temperature from Arduino Serial and posts to backend
// Requirements: npm install serialport axios

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

// Change this to your Arduino COM port (e.g., 'COM3' on Windows)
const port = new SerialPort({ path: 'COM6', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', async (line) => {
  const temp = parseFloat(line);
  if (!isNaN(temp)) {
    try {
      await axios.post('http://localhost:3001/api/sensors', {
        temperature: temp,
        turbidity: null // or 0 if you want
      });
      console.log('Posted temperature:', temp);
    } catch (err) {
      console.error('Failed to post:', err.message);
    }
  } else {
    console.log('Non-numeric serial data:', line);
  }
});

port.on('error', (err) => {
  console.error('Serial port error:', err.message);
});
