# SchistoGuard Backend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (copy `.env.example` to `.env`):
```bash
cp .env.example .env
```

## Running the Backend

### Production Mode (Cloud - Railway)
```bash
npm start
```

Uses PostgreSQL database on Railway.

### Development Mode (with ESP32 Bridge)
```bash
npm run dev
```

Starts both the backend server and ESP32-to-backend bridge.

## ESP32 Bridge Configuration

The `esp32-to-backend.js` script polls sensor data from your local ESP32 device and sends it to the backend.

### Option A: Local Bridge → Cloud Backend (Recommended)
- ESP32 device on local network (192.168.x.x)
- Bridge script runs on your local machine
- Data sent to Railway cloud backend

**Configuration in `.env`:**
```bash
ESP32_BACKEND_URL=https://schistoguard-production.up.railway.app/api/sensors
ESP32_HOSTNAME=schistoguard-esp32.local
ESP32_IP_FALLBACK=192.168.100.168
```

### Option B: Local Bridge → Local Backend
For testing without internet:

```bash
ESP32_BACKEND_URL=http://localhost:3001/api/sensors
```

## Database

SchistoGuard now uses PostgreSQL only.

Set `DATABASE_URL` in `.env` to the Railway Postgres connection string.

## Environment Variables

See `.env.example` for all available configuration options.

### Reverse Geocoding Provider

Backend reverse geocoding uses BigDataCloud reverse-geocode-client.

No API key is required for basic usage.
