# SchistoGuard Cloud Deployment Guide

Deploy SchistoGuard backend to **Railway** and frontend to **Vercel** in 30 minutes.

---

## Prerequisites

- [Railway Account](https://railway.app) (free sign-up)
- [Vercel Account](https://vercel.com) (free sign-up)
- Git repository with SchistoGuard code already pushed to GitHub

---

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select your SchistoGuard repository
4. Choose the `backend` folder as the root directory
5. Click **"Deploy"**

### Step 2: Configure Environment Variables

In Railway dashboard → **Variables**:

```
NODE_ENV=production
DB_TYPE=postgres
SESSION_SECRET=your-super-secret-key-here-change-this
FRONTEND_URL=https://your-vercel-domain.vercel.app
PORT=3001
SITE_NAME=Mang Jose's Fishpond
ENABLE_ESP32_SMS=true
ESP32_HOSTNAME=schistoguard-esp32.local
ESP32_IP_FALLBACK=192.168.100.168
```

⚠️ **SESSION_SECRET:** Use a random strong string (e.g., `openssl rand -hex 32`)

### Step 3: Add PostgreSQL Database

In Railway dashboard:
1. Click **"+ Create New"** → **Postgres**
2. Wait for DB to be ready
3. Railway auto-populates `DATABASE_URL` - no extra config needed

### Step 4: Set Up Domain

1. Railway dashboard → **Settings**
2. Under "Domains", add custom domain or use Railway's auto-domain
3. Copy your backend URL (looks like: `https://schistoguard-backend.up.railway.app`)

### Step 5: Install Dependencies (if needed)

Railway auto-runs `npm install` and `npm start`.

If npm install fails:
- Check `package.json` is in the root  
- Ensure `pg` is in dependencies (already added in updated version)

**Expected output:** `✓ Connected to PostgreSQL on Railway`

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Select your SchistoGuard GitHub repository
4. In "Root Directory", select `frontend`
5. Click **"Deploy"**

### Step 2: Configure Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**:

```
VITE_API_BASE_URL=https://your-railway-backend-url.up.railway.app
```

Replace `your-railway-backend-url` with the actual Railway domain from Part 1.

### Step 3: Deploy

Vercel automatically redeploys when you push to GitHub. First deployment takes ~2 min.

You'll get a URL like: `https://schistoguard.vercel.app`

---

## Part 3: Update Backend Bridge Scripts (Optional)

If using `esp32-to-backend.js` or `serial-to-backend.js` on your local machine:

Update the backend URL:

```javascript
const BACKEND_URL = 'https://your-railway-backend-url.up.railway.app/api/sensors';
```

---

## Part 4: Test Everything

### Test Backend API

```bash
curl https://your-railway-backend-url.up.railway.app/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","role":"bhw"}'
```

### Test Frontend

1. Open your Vercel URL in browser
2. Try login (should call cloud backend)
3. Check browser DevTools → Network → Verify API calls go to Railway URL

### Test ESP32 to Cloud

1. Update ESP32 bridge script (if used) with Railway URL
2. Check sensor data flows to cloud database

---

## Common Issues & Fixes

### "DATABASE_URL not found"
**Fix:** Railway auto-sets this when PostgreSQL is provisioned. Wait 2 min and redeploy.

### "CORS error" when frontend calls backend
**Fix:** Update `FRONTEND_URL` in Railway variables to match your Vercel domain exactly.

### "Cannot reach backend" from ESP32
**Fix:** ESP32 WiFi scripts use `localhost` - update bridge script to Railway URL.

### High Railway billing
**Fix:** Free tier includes free monthly credit. Monitor usage in Railway dashboard.

---

## Environment Variable Reference

### Backend (.env for local, Railway Variables for cloud)

| Variable | Local | Cloud |
|----------|-------|-------|
| `DB_TYPE` | `sqlite` | `postgres` |
| `DATABASE_URL` | (unused) | Auto-set by Railway |
| `NODE_ENV` | `development` | `production` |
| `PORT` | `3001` | `3001` |
| `SESSION_SECRET` | auto | **Must set** |
| `FRONTEND_URL` | `http://localhost:5173` | `https://vercel-domain` |

### Frontend (.env.local for local, Vercel Variables for cloud)

| Variable | Local | Cloud |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `http://localhost:3001` | `https://railway-domain` |

---

## Monitoring & Logs

### Railway Logs
Dashboard → Logs tab. Watch for:
- ✓ `Connected to PostgreSQL`
- ✗ `Cannot reach ESP32` (normal if device offline)

### Vercel Logs
Vercel dashboard → Deployments → Click a deployment → Logs tab.

---

## Next Steps

After cloud deployment works:

1. **MQTT Integration** (optional): Add MQTT broker for real-time sensor updates
2. **Custom Domain**: Point your domain to Railway/Vercel
3. **SSL/HTTPS**: Railway/Vercel handle this automatically
4. **Backups**: Set up Railway automated backups for PostgreSQL
5. **Monitoring**: Set up Datadog or similar for uptime alerts

---

## Troubleshooting Checklist

- [ ] Backend deployed to Railway (check logs)
- [ ] PostgreSQL database provisioned
- [ ] `DATABASE_URL` in Railway variables
- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_BASE_URL` in Vercel variables matches Railway URL
- [ ] Login page loads
- [ ] API calls return 200/401 (not CORS error)
- [ ] Dashboard shows sensor data (if ESP32 configured)

**Stuck?** Check Railway/Vercel logs first—most issues logged there.
