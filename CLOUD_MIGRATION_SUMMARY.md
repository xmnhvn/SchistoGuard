# SchistoGuard Cloud Migration - Summary

Your codebase is now **cloud-ready** for Railway (backend) + Vercel (frontend) deployment.

---

## ✅ What Was Done

### 1. Backend Updates (Express + Node.js)

**File: `backend/src/db.js`**
- ✓ Added support for PostgreSQL (Railway database)
- ✓ Maintains SQLite fallback for local development
- ✓ Automatic table initialization for both databases

**File: `backend/src/server.js`**
- ✓ Added environment variable support (PORT, FRONTEND_URL, SESSION_SECRET)
- ✓ Improved CORS configuration for cloud deployment
- ✓ Production-ready session cookies (secure flag in prod)

**File: `backend/package.json`**
- ✓ Added `pg` dependency for PostgreSQL support
- ✓ Added `dotenv` for environment variables

**File: `backend/.env.example`**
- ✓ Created template for local development

### 2. Frontend Updates (React + Vite)

**File: `frontend/src/utils/api.ts` (NEW)**
- ✓ Created API utility with dynamic base URL
- ✓ Supports both `apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()`
- ✓ Uses `VITE_API_BASE_URL` environment variable

**File: `frontend/.env.example` (NEW)**
- ✓ Template for environment configuration

### 3. Documentation & Guides

**Comprehensive guides created:**
- `DEPLOYMENT_GUIDE.md` - Complete railway/Vercel walkthrough (30 min)
- `RAILWAY_SETUP.md` - Detailed Railway backend deployment
- `VERCEL_SETUP.md` - Detailed Vercel frontend deployment
- `DEPLOYMENT_CHECKLIST.md` - Quick checklist for deployment
- `UPDATE_BRIDGE_SCRIPTS.md` - How to update ESP32 bridge for cloud

---

## 📋 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   SCHistoGuard Cloud                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend (Vercel)          Backend (Railway)            │
│  ─────────────────         ──────────────────            │
│  schistoguard.vercel.app   schistoguard-backend.        │
│                            up.railway.app                │
│                                                           │
│  React + Vite              Express.js + Node.js         │
│  VITE_API_BASE_URL ──────→ PORT 3001                    │
│  (auto-deploys from Git)   (auto-deploys from Git)      │
│                                                           │
│                    Database (Railway)                    │
│                    ─────────────────                     │
│                    PostgreSQL                            │
│                    (auto-provisioned)                    │
│                                                           │
│  Local Scripts              ESP32 Sensors                │
│  ──────────────             ─────────────               │
│  esp32-to-backend.js  ←──── WiFi → Local Network       │
│  serial-to-backend.js                                   │
│  (run on your PC)                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Next: Deploy to Cloud

**Follow deployment checklist (30 minutes):**

1. **Railway Backend:**
   - Deploy from GitHub
   - Add PostgreSQL database
   - Set environment variables
   - Get backend URL

2. **Vercel Frontend:**
   - Deploy from GitHub
   - Set `VITE_API_BASE_URL` to Railway URL
   - Redeploy with variables
   - Get frontend URL

3. **Update Bridge Scripts:**
   - Change `localhost:3001` → Railway URL
   - Test with curl first
   - Run locally on your PC

4. **Test Full Flow:**
   - Open Vercel frontend
   - Verify API calls go to Railway
   - Check sensor data flows to database

**See: `DEPLOYMENT_CHECKLIST.md` for step-by-step**

---

## 📊 Cost Estimate (Monthly)

| Service | Free Tier | Typical Cost |
|---------|-----------|--------------|
| **Railway Backend** | $5 credit/mo | $0-5/mo |
| **Railway Database** | Included in $5 | $0-2/mo |
| **Vercel Frontend** | 100 GB bandwidth | $0 (usually) |
| **Custom Domain** | Optional | $0-15/yr |
| **ESP32/Sensors** | Not hosted | $0 (your hardware) |
| **MQTT Broker** | (future) | $0-10/mo |
| **Total** | | **$0-10/month** |

For small testing/demo: **completely free**  
For small production: **$5-15/month**

---

## 🔒 Security Checklist

Before going live:

- [ ] `SESSION_SECRET` is strong random string (not "schistoguard-secret-key")
- [ ] `NODE_ENV=production` on Railway
- [ ] `FRONTEND_URL` matches your Vercel domain
- [ ] CORS whitelist only includes your domain
- [ ] No hardcoded passwords in Git
- [ ] Use `.env` locally, environment variables on cloud
- [ ] Enable HTTPS (automatic on Railway/Vercel)

---

## 📱 Future Enhancements

### Phase 2: MQTT Integration (optional)
- Add real-time sensor streaming
- Less bandwidth than HTTP polling
- Requires MQTT broker setup

### Phase 3: OTA Firmware Updates
- Update ESP32 firmware from cloud
- No manual USB flashing
- Requires secure update pipeline

### Phase 4: Advanced Monitoring
- Uptime monitoring (UptimeRobot)
- Database backups (Railway automated)
- Log aggregation (LogRocket/Datadog)
- Performance monitoring

### Phase 5: Scaling
- Multiple regions (if global)
- Load balancing
- Database read replicas
- CDN optimization

---

## 📚 Key Files Modified/Created

```
SchistoGuard/
├── backend/
│   ├── src/
│   │   ├── server.js ..................... [UPDATED] Added env vars
│   │   └── db.js ......................... [UPDATED] Postgres + SQLite
│   ├── package.json ...................... [UPDATED] Added pg
│   └── .env.example ...................... [NEW] Template
├── frontend/
│   ├── src/
│   │   └── utils/api.ts .................. [NEW] Dynamic API URL
│   └── .env.example ...................... [NEW] Template
├── DEPLOYMENT_GUIDE.md ................... [NEW] 30-min walkthrough
├── RAILWAY_SETUP.md ...................... [NEW] Detailed Railway guide
├── VERCEL_SETUP.md ....................... [NEW] Detailed Vercel guide
├── DEPLOYMENT_CHECKLIST.md ............... [NEW] Quick checklist
└── UPDATE_BRIDGE_SCRIPTS.md .............. [NEW] ESP32 scripts update
```

---

## ⚡ Quick Commands

**After cloud deployment:**

```bash
# Test backend API
curl https://schistoguard-backend.up.railway.app/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","role":"bhw"}'

# Update local bridge script
nano backend/esp32-to-backend.js
# Change BACKEND_URL to Railway URL
# Save and run:
node backend/esp32-to-backend.js

# Push changes to trigger Vercel redeploy
git add .
git commit -m "Update for cloud deployment"
git push origin main
# Vercel auto-rebuilds!
```

---

## 🆘 Common Issues

### "CORS error" on frontend
→ Check `FRONTEND_URL` in Railway matches Vercel URL

### "Cannot reach backend" from bridge script
→ Update script URL to Railway domain (https://, not http://)

### "API returns 404"
→ Verify endpoint path is correct (e.g., `/api/auth/login`)

### Frontend loads but data doesn't appear
→ Check `VITE_API_BASE_URL` in Vercel settings

**For more issues:** See troubleshooting sections in `RAILWAY_SETUP.md` and `VERCEL_SETUP.md`

---

## 📞 Support References

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **PostgreSQL Help:** https://www.postgresql.org/docs/
- **Express.js Guide:** https://expressjs.com/
- **Vite Guide:** https://vitejs.dev/

---

## ✨ You're Ready!

Your SchistoGuard backend + frontend are now cloud-ready.

**Next steps:**
1. Read `DEPLOYMENT_CHECKLIST.md`
2. Follow the 30-minute deployment process
3. Test on Railway + Vercel
4. Share with your team!

Good luck! 🎉
