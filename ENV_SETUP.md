# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the `nova-queue-vite` directory with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Nova Payment Configuration
VITE_NOVA_API_KEY=your_nova_api_key
VITE_NOVA_MERCHANT_ID=your_nova_merchant_id

# Base Domain Configuration
# This is CRITICAL for subdomain detection to work properly
VITE_BASE_DOMAIN=localhost

# Default Subdomain (for development without subdomain)
VITE_DEFAULT_SUBDOMAIN=default
```

## Setting VITE_BASE_DOMAIN

The `VITE_BASE_DOMAIN` variable should match your deployment domain:

### Local Development
```bash
VITE_BASE_DOMAIN=localhost
```

### Netlify Deployment
```bash
VITE_BASE_DOMAIN=nova-reserve.netlify.app
```

### Vercel Deployment
```bash
VITE_BASE_DOMAIN=nova-reserve.vercel.app
```

### Custom Domain
```bash
VITE_BASE_DOMAIN=yourdomain.com
```

## How It Works

### Without Subdomain
- URL: `https://nova-reserve.netlify.app/admin`
- Subdomain detected: `null` (matches base domain)
- Admin accessible via `/admin` path

### With Subdomain
- URL: `https://joes-pizza.nova-reserve.netlify.app/dashboard`
- Subdomain detected: `joes-pizza`
- Loads restaurant data for "joes-pizza"

### Admin Subdomain
- URL: `https://admin.nova-reserve.netlify.app/admin`
- Subdomain detected: `admin`
- Admin accessible (no restaurant context needed)

## Netlify Environment Variables

To set environment variables in Netlify:

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add the variable:
   - Key: `VITE_BASE_DOMAIN`
   - Value: `nova-reserve.netlify.app` (or your site name)

**Important**: After adding environment variables, you need to trigger a new deployment for them to take effect.

## Vercel Environment Variables

To set environment variables in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the variable:
   - Name: `VITE_BASE_DOMAIN`
   - Value: `nova-reserve.vercel.app` (or your site name)

## Testing

### Local Testing
1. Set `VITE_BASE_DOMAIN=localhost` in your `.env`
2. Add entries to `/etc/hosts`:
   ```
   127.0.0.1 admin.localhost
   127.0.0.1 joes-pizza.localhost
   ```
3. Visit `http://localhost:5173/admin` ✅
4. Visit `http://admin.localhost:5173/admin` ✅
5. Visit `http://joes-pizza.localhost:5173/reserve` ✅

### Production Testing
1. Set `VITE_BASE_DOMAIN=nova-reserve.netlify.app` in Netlify
2. Deploy your app
3. Visit `https://nova-reserve.netlify.app/admin` ✅
4. Visit `https://admin.nova-reserve.netlify.app/admin` ✅
5. Visit `https://joes-pizza.nova-reserve.netlify.app/reserve` ✅

