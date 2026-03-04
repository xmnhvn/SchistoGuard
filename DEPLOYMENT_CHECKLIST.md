# SchistoGuard Cloud Deployment Checklist

Complete this checklist to deploy SchistoGuard to Railway (backend) + Vercel (frontend).

**Estimated Time: 30 minutes**

---

## Pre-Deployment (5 min)

- [ ] Code pushed to GitHub in `SchistoGuard` repository
- [ ] `SchistoGuard/backend/package.json` exists
- [ ] `SchistoGuard/frontend/vite.config.ts` exists
- [ ] Updated backend files with env var support (already done ✓)
- [ ] Updated frontend with API utility (already done ✓)

---

## Railway Setup (10 min)

### Create & Deploy Backend

- [ ] Go to [railway.app](https://railway.app)
- [ ] Sign up with GitHub
- [ ] Click **"New Project"** → **"Deploy from GitHub"**
- [ ] Select SchistoGuard repo, set root to `SchistoGuard/backend`
- [ ] Click **"Deploy"** and wait 2-5 min for build

### Configure Database & Variables

- [ ] Add **PostgreSQL** database to project
- [ ] Copy `DATABASE_URL` from PostgreSQL variables (auto-generated)
- [ ] In Node.js service, go to **Variables**
- [ ] Add these variables:
  - `NODE_ENV` = `production`
  - `DB_TYPE` = `postgres`
  - `SESSION_SECRET` = `[generate random string]` ← important!
  - `PORT` = `3001`
  - `SITE_NAME` = `Mang Jose's Fishpond`
  - `ENABLE_ESP32_SMS` = `true`
  - `FRONTEND_URL` = `[will fill after Vercel]`

### Test Backend

- [ ] Copy Railway backend URL (e.g., `https://schistoguard-backend.up.railway.app`)
- [ ] Test with curl:
  ```bash
  curl https://your-railway-url/api/auth/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test","role":"bhw"}'
  ```
- [ ] Expect: API responds (may say invalid credentials, that's OK)

---

## Vercel Setup (10 min)

### Create & Deploy Frontend

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign up with GitHub
- [ ] Click **"Add New"** → **"Project"**
- [ ] Select SchistoGuard repo, set root to `SchistoGuard/frontend`
- [ ] Click **"Deploy"**

### Configure Environment Variables

- [ ] Go to **Settings** → **Environment Variables**
- [ ] Add:
  - `VITE_API_BASE_URL` = `https://your-railway-url.up.railway.app`
  - (Use the full Railway URL from above, include `https://`)

### Redeploy with Variables

- [ ] Go to **Deployments** tab
- [ ] Click latest deployment → click **"..."** → **"Redeploy"**
- [ ] Wait for build (1-2 min)

### Get Frontend URL

- [ ] Copy Vercel URL (e.g., `https://schistoguard.vercel.app`)
- [ ] This is your live frontend URL

---

## Final Integration (5 min)

### Update Railway with Frontend URL

- [ ] Go back to Railway dashboard
- [ ] Click Node.js service → **Variables**
- [ ] Update `FRONTEND_URL` = `https://your-vercel-url.vercel.app`
- [ ] Save → Railway auto-restarts

### Test Full Stack

- [ ] Open Vercel URL in browser
- [ ] You should see login page
- [ ] Open **DevTools** → **Network** tab
- [ ] Try submitting login form
- [ ] Verify API calls go to Railway URL (not localhost)
- [ ] Check **Console** for any errors

---

## Optional: Update ESP32 Scripts (if using)

If you have local scripts polling ESP32:

- [ ] Edit `backend/esp32-to-backend.js`
- [ ] Change `BACKEND_URL` to:
  ```javascript
  const BACKEND_URL = 'https://your-railway-url.up.railway.app/api/sensors';
  ```
- [ ] Edit `backend/serial-to-backend.js`
- [ ] Change backend URL to same Railway URL

---

## Troubleshooting Quick Fixes

### "CORS error" when frontend calls backend
→ Check `FRONTEND_URL` in Railway matches Vercel URL exactly

### "API returns 404"
→ Verify `VITE_API_BASE_URL` in Vercel includes full URL (https://...)

### Database won't connect
→ Wait 2 min after PostgreSQL creation, then redeploy backend

### Frontend shows old version
→ Hard refresh (Ctrl+Shift+R) and clear browser cache

### Build fails
→ Check build logs in Vercel/Railway dashboard for specific error

---

## What's Next?

After deployment is stable:

1. **Set up backups:** Railway → PostgreSQL → enable automatic backups
2. **Custom domain:** Point your own domain to Vercel (Settings → Domains)
3. **MQTT integration:** (Optional) Add real-time sensor updates via MQTT
4. **Monitoring:** Set up simple uptime monitoring (e.g., UptimeRobot)
5. **Scaling:** As users grow, upgrade Railway plan if needed

---

## Keep These URLs Safe

```
🌐 Frontend URL: https://schistoguard.vercel.app
⚙️ Backend API URL: https://schistoguard-backend.up.railway.app
🔑 SESSION_SECRET: [keep secure, don't share]
```

---

## Support Resources

- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- PostgreSQL on Railway: https://docs.railway.app/databases/postgres

**Script them!** Save your URLs somewhere safe for future reference.
