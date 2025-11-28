# Netlify Deployment Checklist

## Critical: Set Environment Variable

**This MUST be done for path-based URLs to work!**

### Step 1: Add VITE_BASE_DOMAIN in Netlify

1. Go to https://app.netlify.com/sites/nova-reserve/configuration/env
2. Click **Add a variable** or **Add**
3. Enter:
   - **Key**: `VITE_BASE_DOMAIN`
   - **Value**: `nova-reserve.netlify.app`
   - **Scopes**: Select all (Production, Deploy Previews, Branch deploys)
4. Click **Create variable** or **Save**

### Step 2: Redeploy

**IMPORTANT**: Environment variables only take effect after a new deployment!

Option A - Clear cache and redeploy:
1. Go to https://app.netlify.com/sites/nova-reserve/deploys
2. Click **Trigger deploy** → **Clear cache and deploy site**

Option B - Push a new commit:
```bash
git add .
git commit -m "Update environment configuration"
git push
```

### Step 3: Verify

After deployment completes, open browser console and check logs:

1. Visit: `https://nova-reserve.netlify.app/713df1ae-84f5-45b0-b5c7-c8084a647197/dashboard/reservations`

2. Open DevTools Console (F12)

3. Look for logs:
   ```
   [Restaurant Context] Path parts: ["713df1ae-84f5-45b0-b5c7-c8084a647197", "dashboard", "reservations"]
   [Restaurant Context] Detected novaref_id from path: 713df1ae-84f5-45b0-b5c7-c8084a647197
   [Restaurant Context] Loading restaurant by novaref_id: 713df1ae-84f5-45b0-b5c7-c8084a647197
   [Restaurant Context] Successfully loaded restaurant: [Restaurant Name]
   ```

4. Check Network tab - Should see:
   ```
   GET /rest/v1/restaurants?select=*&novaref_id=eq.713df1ae-84f5-45b0-b5c7-c8084a647197
   Status: 200 OK
   ```

### Common Issues

#### Issue: Still seeing `subdomain=eq.nova-reserve`
**Cause**: Environment variable not set or old deployment cached

**Fix**:
1. Verify environment variable is set correctly
2. Trigger a **Clear cache and deploy**
3. Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

#### Issue: Console shows no logs
**Cause**: Old deployment still active

**Fix**:
1. Check deployment status in Netlify dashboard
2. Wait for new deployment to complete
3. Clear browser cache

#### Issue: UUID not detected
**Check**: Console should show path parts. If the UUID is not in first position, routing might be incorrect.

## Test All URL Patterns

After deployment, test these URLs:

✅ Base domain + path:
- `https://nova-reserve.netlify.app/admin`
- `https://nova-reserve.netlify.app/713df1ae-84f5-45b0-b5c7-c8084a647197/reserve`
- `https://nova-reserve.netlify.app/713df1ae-84f5-45b0-b5c7-c8084a647197/dashboard/reservations?embed=true`

✅ Admin subdomain:
- `https://admin.nova-reserve.netlify.app/admin`

✅ Restaurant subdomain (if configured):
- `https://joes-pizza.nova-reserve.netlify.app/reserve`

## Current Configuration

```bash
VITE_BASE_DOMAIN=nova-reserve.netlify.app
```

This tells the app:
- `nova-reserve.netlify.app` = base domain (no subdomain)
- `admin.nova-reserve.netlify.app` = admin subdomain
- `anything-else.nova-reserve.netlify.app` = restaurant subdomain
- Path with UUID = use novaref_id (works on any domain)

