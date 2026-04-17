const db = require('./src/db.js');
db.all("SELECT DISTINCT ON (site_key) site_key, temperature, turbidity, ph, timestamp FROM raw_readings WHERE site_key IS NOT NULL ORDER BY site_key, timestamp DESC;", [], (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
});
