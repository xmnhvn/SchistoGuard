# Railway Deployment Setup (Detailed)

Step-by-step walkthrough for deploying SchistoGuard backend to Railway.

---

## What You Get (Free Tier)

- $5 free monthly credit (usually covers small project)
- PostgreSQL database
- Node.js backend hosting
- Automatic SSL/HTTPS
- Auto-scaling (if traffic grows)

---

## Full Step-by-Step

### 1. Sign Up to Railway

1. Visit [railway.app](https://railway.app)
2. Click **"Login"** → **"GitHub"** (easier than email)
3. Authorize Railway to access your GitHub repos

### 2. Connect Your GitHub Repository

1. In Railway, click **"New Project"**
2. Select **"Deploy from GitHub"**
3. Find and select your SchistoGuard repo
4. Authorize if prompted

### 3. Configure the Build

1. After selecting repo, you'll see a "Configure" screen
2. Under **"Root Directory"**, enter: `SchistoGuard/backend`
   - (This tells Railway where your package.json is)
3. Leave other defaults as-is
4. Click **"Deploy"**

Railroad will now:
- Clone your repo
- Run `npm install` (installs dependencies)
- Run `npm start` (starts the server)

### 4. Wait for Build to Complete

In the **"Deployments"** tab:
- 🟡 "Queued" → Waiting to build
- 🟠 "Building" → Installing dependencies
- 🟢 "Success" → Backend is live!

Takes about 2-5 minutes. Watch logs for errors:

```
✓ npm install complete
✓ Starting application
✓ Backend running on http://localhost:3001
```

### 5. Add PostgreSQL Database

In your Railway project:
1. Click **"+ Create"** or **"+ Add Service"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway spins up a database
4. Click into PostgreSQL → **"Variables"**
5. Copy the `DATABASE_URL` (looks like):
   ```
   postgresql://user:password@host:port/schistoguard
   ```

### 6. Set Environment Variables

In your Railway project:
1. Click the **Node.js (backend)** service
2. Go to **"Variables"** tab
3. Click **"+ Add Variable"** for each:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Tells app it's on cloud |
| `DB_TYPE` | `postgres` | Use cloud database |
| `PORT` | `3001` | Listen port |
| `SESSION_SECRET` | `your-random-secret` | Generate strong key! |
| `FRONTEND_URL` | `https://your-vercel-url.vercel.app` | Add after Vercel deploy |
| `SITE_NAME` | `Mang Jose's Fishpond` | Default site name |

⚠️ **For SESSION_SECRET**, generate a random string:

**Windows PowerShell:**
```powershell
$randomKey = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -Count 32 | ForEach-Object { [char]$_ }) -join ''))
Write-Host $randomKey
```

**Mac/Linux:**
```bash
openssl rand -hex 32
```

Or use a random generator: [1password.com/password-generator](https://1password.com/password-generator/)

### 7. Database Connection

Railway **automatically** sets `DATABASE_URL` when PostgreSQL is created.  
You don't need to manually add it—it's already available in Node.js as `process.env.DATABASE_URL`.

Check it's there:
1. Click **PostgreSQL** service
2. Go to **"Variables"** tab
3. Should see `DATABASE_URL` auto-populated

If missing, use the "Generate" button.

### 8. Get Your Backend URL

1. Click the **Node.js** service
2. In the top section, find **"Domains"**
3. It shows a Railway-generated URL like:
   ```
   https://schistoguard-backend.up.railway.app
   ```

Copy this URL—you'll need it for:
- Vercel `VITE_API_BASE_URL`
- ESP32 bridge scripts
- Frontend tests

### 9. Test the Backend

Test the API is reachable:

```bash
curl https://schistoguard-backend.up.railway.app/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test","role":"bhw"}'
```

Expected: `{"success":false,"message":"Invalid email or password"}` (means API works!)

If you get **CORS error**, you'll fix it in Vercel setup.

---

## Monitoring & Logs

### View Real-Time Logs

1. Click Node.js service → **"Logs"** tab
2. Filter by:
   - **Level:** All, Errors, Warnings
   - **Source:** application, runtime, build

### Key Logs to Watch

| Log | Meaning |
|-----|---------|
| `✓ Connected to PostgreSQL on Railway` | Database connected ✓ |
| `Cannot reach ESP32` | ESP32 offline (okay if not powered) |
| `TypeError: db.query is not a function` | Postgres connection failed |
| `ECONNREFUSED` | Backend crashed |

### Redeploy After Changes

Push to GitHub → Railway auto-rebuilds.

Or **manually redeploy** from Railway dashboard:
1. Deployments tab
2. Click the latest deployment
3. Click **"Redeploy"**

---

## Cost Estimate

### Free Tier (Usually Sufficient)

- **$5/month** free credit
- Covers: 1 small Node.js app + 1 PostgreSQL database
- Limits: ~50,000 API requests/month, 5GB storage

### If You Exceed Free Tier

- Pay-as-you-go: typically $0.10 per GB of compute/month
- Database: $0.20 per GB of storage/month
- Total for small production: ~$5-15/month

### Save Money

1. Use Railway free tier as long as possible
2. Monitor usage in **Billing** tab
3. Enable "Sleep on Inactivity" (if not always-on needed)

---

## Next: Vercel Frontend Deployment

After Railway backend is live, proceed to [DEPLOYMENT_GUIDE.md - Part 2: Deploy Frontend to Vercel](./DEPLOYMENT_GUIDE.md#part-2-deploy-frontend-to-vercel)

---

## Troubleshooting Railway Deployment

| Problem | Solution |
|---------|----------|
| Build fails with "npm: command not found" | Ensure `package.json` exists in `SchistoGuard/backend` |
| "DATABASE_URL is undefined" | Wait 2 min after PostgreSQL creation, then redeploy |
| Backend crashes after deploy | Check `package.json` `start` script is correct |
| Cannot see logs | Click **Node.js service** → **Logs** tab (not Project logs) |
| Changes not appearing | Push to GitHub and wait for auto-deploy, or click **Redeploy** |

---

## References

- [Railway Docs - Getting Started](https://docs.railway.app)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgres)
