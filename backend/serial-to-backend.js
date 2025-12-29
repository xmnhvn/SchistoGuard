const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');
const port = new SerialPort({ path: 'COM6', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', async (line) => {
  const parts = line.trim().split(',');
  if (parts.length === 3) {
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
