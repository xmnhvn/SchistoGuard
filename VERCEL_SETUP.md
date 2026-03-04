# Vercel Deployment Setup (Detailed)

Step-by-step walkthrough for deploying SchistoGuard frontend to Vercel.

---

## What You Get (Free Tier)

- Unlimited projects
- Unlimited deployments
- Global CDN (fast delivery)
- Automatic HTTPS/SSL
- GitHub integration (auto-deploy on push)
- 100 GB of bandwidth/month (usually more than enough)

---

## Full Step-by-Step

### 1. Sign Up to Vercel

1. Visit [vercel.com](https://vercel.com)
2. Click **"Sign Up"** → **"GitHub"** (easiest method)
3. Authorize Vercel to access your GitHub repos

### 2. Create Project

1. Click **"Add New..."** → **"Project"**
2. Select your SchistoGuard GitHub repository
3. Click **"Import"**

### 3. Configure Root Directory

On the setup screen:
- **Framework Preset:** select **"Vite"**
- **Root Directory:** click and select `SchistoGuard/frontend`
- Leave other settings default
- Click **"Deploy"**

Vercel will:
- Detect Vite config
- Run `npm install`
- Run `npm run build`
- Deploy to CDN

Takes 1-3 minutes.

### 4. Set Environment Variables

While deploying, you need to tell frontend where the backend is:

1. Go to Vercel dashboard
2. Click your SchistoGuard project
3. Go to **"Settings"** → **"Environment Variables"**
4. Click **"Add New"**

Add this variable:

```
Name:  VITE_API_BASE_URL
Value: https://your-railway-backend-url.up.railway.app
```

⚠️ Replace `your-railway-backend-url` with your actual Railway domain!

Example:
```
VITE_API_BASE_URL=https://schistoguard-backend.up.railway.app
```

### 5. Trigger Redeploy

After setting variables, you need to redeploy so frontend uses the new variable:

1. Go to **"Deployments"** tab
2. Find the latest deployment
3. Click the **"..."** menu → **"Redeploy"**
4. Confirm

Vercel rebuilds with the new `VITE_API_BASE_URL`.

### 6. Get Your Frontend URL

After successful deployment:
1. Go to **"Deployments"** tab
2. Click the deployment status (green checkmark)
3. You'll see your live URL, like:
   ```
   https://schistoguard.vercel.app
   ```

Copy this URL—you'll need it for:
- Updating Railway `FRONTEND_URL` variable
- Sharing with users
- Testing

### 7. Test the Frontend

1. Open your Vercel URL in a browser
2. You should see the SchistoGuard login page
3. Try logging in (if you have a test user in local DB)
4. Check browser **DevTools** → **Network** tab
5. Verify API calls go to your Railway backend URL (not localhost!)

### 8. Update Railway with Frontend URL

Now that you have your Vercel domain, go back to Railway:

1. Log into [railway.app](https://railway.app)
2. Open your SchistoGuard project
3. Click **Node.js** service → **Variables**
4. Find `FRONTEND_URL` and update it:
   ```
   FRONTEND_URL=https://schistoguard.vercel.app
   ```
5. Save changes → Railway auto-restarts the backend

---

## Auto-Deploy from GitHub

**Every time you push to GitHub**, Vercel automatically redeploys:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Vercel will:
1. Detect the push
2. Build new version
3. Deploy to CDN
4. Send you an email when done

No manual intervention needed!

---

## Monitoring & Logs

### View Build Logs

1. Vercel dashboard → **Deployments** tab
2. Click any deployment
3. Click **"Build Logs"** to see what happened during build

### Common Build Issues

| Error | Fix |
|-------|-----|
| `VITE_API_BASE_URL is undefined` | Add variable in Settings → Environment Variables |
| `npm: command not found` | Ensure Node.js version set to 18+ in Settings |
| `Module not found` | Run `npm install` locally to verify dependencies |

### Production Issues

If frontend builds but doesn't work:
1. Open browser **DevTools** → **Console**
2. Look for errors (usually API connectivity issues)
3. Check **Network** tab → see where API calls go
4. Verify `VITE_API_BASE_URL` matches Railway domain exactly

---

## Custom Domain

(Optional) Point your own domain to Vercel:

1. Vercel dashboard → **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `schistoguard.com`)
4. Follow DNS setup instructions for your domain registrar

---

## Cost Estimate

### Free Tier (Usually Sufficient)

- **Unlimited** projects and deployments
- **100 GB** bandwidth/month (usually enough for small teams)
- **Fair Use** pricing (prevents abuse)

### If You Exceed

- **Edge Requests:** $1.00 per 100,000 requests
- **Environmental Overwrites:** $0.00 (free)
- Rarely exceeded for development/small production

Small app costs: **$0** (free tier covers ~90% of projects)

---

## Troubleshooting Vercel Deployment

| Problem | Solution |
|---------|----------|
| "VITE_API_BASE_URL is not defined" | Add it to Environment Variables in Settings |
| Frontend builds but API calls fail | Verify VITE_API_BASE_URL in Settings matches Railway URL exactly |
| Login page shows but can't submit | Check CORS in Railway (FRONTEND_URL should match Vercel domain) |
| Old version still showing | Hard refresh (Ctrl+Shift+R) or clear CloudFlare cache |
| Build fails "Root directory not found" | Ensure you selected `SchistoGuard/frontend` as root |

---

## Next: Test Everything

After frontend and backend are deployed:

1. **Test Backend API:**
   ```bash
   curl https://your-railway-url/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test","role":"bhw"}'
   ```

2. **Test Frontend:**
   - Open Vercel URL in browser
   - DevTools → Network tab
   - Try login
   - Verify API calls go to Railway (not localhost)

3. **Test Data Flow:**
   - If ESP32 configured, update bridge script with Railway URL
   - Verify sensor data flows to cloud database

---

## References

- [Vercel Docs - Framework Guides](https://vercel.com/docs)
- [Vite + Vercel](https://vercel.com/docs/frameworks/vite)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)
- [Custom Domains on Vercel](https://vercel.com/docs/concepts/projects/domains)
