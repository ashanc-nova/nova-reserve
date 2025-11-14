# Subdomain-Based Multi-Tenant Setup Guide

This guide explains how to set up and use the subdomain-based multi-tenant restaurant system.

## Database Setup

1. **Run the migration SQL**:
   - Open your Supabase SQL Editor
   - Run the SQL from `migrations/add_subdomain_support.sql`
   - This will:
     - Add `subdomain` column to `restaurants` table
     - Create `user_restaurants` junction table
     - Add `owner_id` to restaurants
     - Set up RLS policies

2. **Create a default restaurant** (if needed):
   ```sql
   INSERT INTO restaurants (name, subdomain, slug, settings, created_at, updated_at)
   VALUES ('Default Restaurant', 'default', 'default', '{}', NOW(), NOW());
   ```

## Local Development Setup

### Option 1: Using /etc/hosts (Recommended)

1. **Edit your hosts file**:
   ```bash
   sudo nano /etc/hosts
   ```

2. **Add entries**:
   ```
   127.0.0.1 localhost
   127.0.0.1 admin.localhost
   127.0.0.1 joes-pizza.localhost
   127.0.0.1 marios-italian.localhost
   ```

3. **Access the app**:
   - Admin Panel: `http://admin.localhost:5173/admin`
   - Restaurant Dashboard: `http://joes-pizza.localhost:5173/dashboard/waitlist`
   - Guest Reservation: `http://joes-pizza.localhost:5173/reserve`

### Option 2: Using Vite Proxy (Alternative)

Update `vite.config.js` to handle subdomains (more complex, not recommended for local dev).

## Environment Variables

Add to your `.env` file:
```env
VITE_DEFAULT_SUBDOMAIN=default
```

This is used as a fallback when no subdomain is detected (useful for development).

## Creating Restaurants

1. **Access Admin Panel**:
   - Go to `http://admin.localhost:5173/admin` (or `http://localhost:5173/admin` if no subdomain setup)

2. **Create Restaurant**:
   - Click "Create Restaurant"
   - Fill in:
     - **Name**: Restaurant name
     - **Subdomain**: Unique subdomain (e.g., `joes-pizza`)
     - Other optional fields

3. **Access Restaurant**:
   - Manager Dashboard: `http://joes-pizza.localhost:5173/dashboard/waitlist`
   - Guest Reservation: `http://joes-pizza.localhost:5173/reserve`

## Subdomain Rules

- **Format**: Lowercase letters, numbers, and hyphens only
- **Length**: 3-63 characters
- **Reserved**: `admin`, `www`, `api`, `app`, `mail`, `ftp`, `localhost`, `test`, `staging`, `dev`
- **Must start/end** with alphanumeric character

## Production Deployment

1. **DNS Setup**:
   - Add wildcard DNS record: `*.novaqueue.com` → your server IP
   - Or use a reverse proxy (nginx/Cloudflare) to route subdomains

2. **Server Configuration**:
   - Configure your server to handle subdomain routing
   - Extract subdomain from `Host` header
   - Route to your application

3. **Environment**:
   - Set `VITE_DEFAULT_SUBDOMAIN` in production (optional, for fallback)

## URL Structure

- **Admin Panel**: `admin.novaqueue.com/admin` or `novaqueue.com/admin`
- **Restaurant Dashboard**: `{subdomain}.novaqueue.com/dashboard/waitlist`
- **Guest Reservation**: `{subdomain}.novaqueue.com/reserve`

## User-Restaurant Management

Users can be associated with multiple restaurants through the `user_restaurants` table:
- **owner**: Full control
- **manager**: Can manage operations
- **staff**: Limited access (future feature)

## Troubleshooting

1. **"Restaurant not found" error**:
   - Check that subdomain exists in database
   - Verify subdomain format is correct
   - Check browser console for errors

2. **Subdomain not detected**:
   - Verify hosts file entries (local dev)
   - Check DNS configuration (production)
   - Ensure subdomain is set in database

3. **Admin panel not accessible**:
   - Access via `admin.localhost:5173/admin` or `localhost:5173/admin`
   - Check that you're not on a restaurant subdomain

