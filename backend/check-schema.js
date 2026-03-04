const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('schistoguard.sqlite');

db.all("PRAGMA table_info(readings)", [], (err, rows) => {
  if (err) throw err;
  console.log('=== READINGS COLUMNS ===');
  console.log(JSON.stringify(rows, null, 2));
  
  db.all("PRAGMA table_info(alerts)", [], (err2, rows2) => {
    if (err2) throw err2;
    console.log('\n=== ALERTS COLUMNS ===');
    console.log(JSON.stringify(rows2, null, 2));
    db.close();
  });
});
