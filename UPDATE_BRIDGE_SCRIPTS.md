# Updating ESP32 Scripts for Cloud Backend

After deploying backend to Railway, update your local bridge scripts to send data to the cloud.

---

## Why Update?

Currently, your scripts assume backend runs on `localhost:3001`:
```javascript
const BACKEND_URL = 'http://localhost:3001/api/sensors';
```

When backend moves to Railway, this breaks. Both scripts need updating.

---

## Step 1: Get Your Railway URL

From Railway dashboard:
- Node.js service → Domains section
- Copy the full URL (e.g., `https://schistoguard-backend.up.railway.app`)

---

## Step 2: Update esp32-to-backend.js

Open `backend/esp32-to-backend.js`:

**Find this line:**
```javascript
const BACKEND_URL = 'http://localhost:3001/api/sensors';
```

**Replace with:**
```javascript
const BACKEND_URL = 'https://schistoguard-backend.up.railway.app/api/sensors';
// ^ Use your Railway URL from Step 1
```

**Also update these (optional, for resilience):**
```javascript
const ESP32_HOSTNAME = 'schistoguard-esp32.local'; // Stays same
const SITE_NAME = process.env.SITE_NAME || "Mang Jose's Fishpond"; // Stays same
```

**Save and test locally first:**
```bash
cd backend
npm install axios  # if not already installed
node esp32-to-backend.js
```

Expected output:
```
Starting ESP32 sensor polling...
Primary: http://schistoguard-esp32.local/api/sensors
Fallback: http://192.168.100.168/api/sensors
Sending data to backend at https://schistoguard-backend.up.railway.app/api/sensors
```

---

## Step 3: Update serial-to-backend.js

Open `backend/serial-to-backend.js`:

**Find this line:**
```javascript
const res = await axios.get('http://localhost:3001/api/sensors/alerts');
```

**Replace with:**
```javascript
const res = await axios.get('https://schistoguard-backend.up.railway.app/api/sensors/alerts');
```

**Find:**
```javascript
await axios.post('http://localhost:3001/api/sensors/alerts');
```

**Replace with (if this call exists):**
```javascript
await axios.post('https://schistoguard-backend.up.railway.app/api/sensors/alerts');
```

**Save and test:**
```bash
cd backend
node serial-to-backend.js
```

Expected output (if Arduino connected):
```
✓ Arduino serial port opened on COM3
```

---

## Step 4: Deploy Updated Scripts

You have two options:

### Option A: Run Locally (Recommended for Now)

Keep running scripts on your PC/server:
```bash
cd backend
npm run dev
```

This way:
- ✓ You control when scripts run
- ✓ Easy to debug
- ✓ No additional hosting cost
- ✗ Requires PC to be always-on

### Option B: Deploy to Railway (Advanced)

If you want 24/7 data collection without keeping PC on:
1. Create separate Railway service for the poll script
2. Set environment variables
3. Railway runs it continuously
4. (Future enhancement—skip for now)

---

## Troubleshooting

### "Cannot reach https://schistoguard-backend.up.railway.app"

1. Verify Railway backend is running (check Logs in Railway dashboard)
2. Test with curl first:
   ```bash
   curl https://schistoguard-backend.up.railway.app/api/sensors \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"temperature":25,"ph":7,"turbidity":10}'
   ```
3. If curl fails, Railway backend has an issue
4. If curl works, check script syntax

### "CORS error" when bridge sends data

→ This is from browser/frontend, not the backend.  
Bridge scripts don't have CORS issues (they do server-to-server calls).

### "Data not appearing in dashboard"

1. Check bridge script logs for errors
2. Verify backend is receiving data:
   - Railway dashboard → Logs
   - Look for `✓ Sensor data saved`
3. Check frontend is pulling latest data:
   - Vercel URL → DevTools → Network
   - Check `/api/sensors/latest` calls

---

## Summary of Changes

| File | Old URL | New URL |
|------|---------|---------|
| `esp32-to-backend.js` | `http://localhost:3001/api/sensors` | `https://your-railroad.up.railway.app/api/sensors` |
| `serial-to-backend.js` | `http://localhost:3001/api/sensors/alerts` | `https://your-railway.up.railway.app/api/sensors/alerts` |

---

## Testing Full Data Flow

After updating scripts:

1. **Start bridge script:**
   ```bash
   node backend/esp32-to-backend.js
   ```
   (Keep running in separate terminal)

2. **Check Railway logs:**
   - Dashboard → Logs → Should see `✓ Sensor data saved`

3. **Check frontend:**
   - Open `https://schistoguard.vercel.app`
   - Go to Dashboard
   - Should see sensor readings updating

4. **End-to-end flow:**
   ```
   ESP32 → Local Script → Railway Backend → Railway DB → Vercel Frontend
   ```

---

## Next: Future 24/7 Polling

If you want scripts to run constantly without your PC:
- Option 1: Deploy poll script to Railway (see Railway docs)
- Option 2: Use MQTT broker + subscribe server-side (more scalable)
- Option 3: Upgrade ESP32 firmware to POST directly to cloud (no bridge needed)

For now, keep scripts local and running on your PC/server.

---

## Summary

✓ Update bridge script URLs to Railway domain  
✓ Test with curl first  
✓ Run scripts locally on your PC  
✓ Monitor Railway logs for data flow  
✓ Verify on Vercel frontend  

Done! Your cloud deployment is now live.
