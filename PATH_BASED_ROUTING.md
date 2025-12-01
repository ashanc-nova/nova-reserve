# Path-Based Routing Implementation

## Overview

The application has been updated from subdomain-based routing to path-based routing. Instead of using subdomains like `bill.domain.com`, restaurants are now accessed via paths like `domain.com/bill`.

## URL Structure

### Restaurant Slug-Based URLs

**Format**: `domain.com/:restaurant_slug/...`

**Examples**:
- Guest reservation: `https://nova-reserve.netlify.app/bill/reserve`
- Dashboard: `https://nova-reserve.netlify.app/bill/dashboard/reservations`
- Settings: `https://nova-reserve.netlify.app/bill/dashboard/settings/reservations`
- Payment: `https://nova-reserve.netlify.app/bill/payment/123`
- Confirmation: `https://nova-reserve.netlify.app/bill/reserve/confirm/123`

### NovaRef ID-Based URLs (UUID)

**Format**: `domain.com/:novaref_id/...`

**Examples**:
- Dashboard: `https://nova-reserve.netlify.app/713df1ae-84f5-45b0-b5c7-c8084a647197/dashboard/reservations`
- With embed: `https://nova-reserve.netlify.app/713df1ae-84f5-45b0-b5c7-c8084a647197/dashboard/reservations?embed=true`

### Admin URLs

**Format**: `domain.com/admin`

**Example**:
- Admin panel: `https://nova-reserve.netlify.app/admin`

## How It Works

### 1. Restaurant Detection Priority

The system detects restaurants in this order:

1. **NovaRef ID** (UUID in path): `/:uuid/...`
   - Loads restaurant by `novaref_id` column
   
2. **Restaurant Slug** (in path): `/:slug/...`
   - Loads restaurant by `slug` column
   
3. **Admin Path**: `/admin`
   - No restaurant context needed

### 2. Route Structure

All routes are defined in `main.tsx`:

```typescript
// Admin routes
{ path: '/admin', element: <AdminPanel /> }

// Restaurant slug routes
{ path: '/:restaurant_slug/dashboard/reservations', element: <Shell><ReservationsPage /></Shell> }
{ path: '/:restaurant_slug/reserve', element: <GuestReservationPage /> }
{ path: '/:restaurant_slug/payment/:reservationId', element: <PaymentPage /> }
// ... etc
```

### 3. Restaurant Context

The `RestaurantProvider` (in `restaurant-context.tsx`) automatically:
1. Extracts the slug or novaref_id from the URL path
2. Queries Supabase for the restaurant
3. Provides restaurant context to all child components

### 4. Navigation

Navigation components dynamically construct URLs:
- Header, DashboardMobileNav: Extract restaurant prefix from current URL
- Guest pages (Payment, Confirmation): Include restaurant prefix in redirects
- RestaurantGuard: Redirects to `/admin` when restaurant not found

## Key Files Changed

### Core Routing & Detection
- `src/lib/subdomain-utils.ts` - Restaurant slug detection from path
- `src/lib/restaurant-context.tsx` - Load restaurant by slug or novaref_id
- `src/main.tsx` - Route definitions with `:restaurant_slug` parameter

### Navigation Components
- `src/components/layout/Header.tsx` - Dynamic navigation links
- `src/components/dashboard/DashboardMobileNav.tsx` - Mobile navigation
- `src/components/RestaurantGuard.tsx` - Error page redirect

### Guest Pages
- `src/pages/GuestReservationPage.tsx` - Payment redirect with prefix
- `src/pages/PaymentPage.tsx` - Success/failure URLs with prefix
- `src/pages/PaymentFailedPage.tsx` - Retry/restart navigation
- `src/pages/ReservationConfirmationPage.tsx` - "Make another" navigation

## Database Requirements

### Restaurant Table Schema

The `restaurants` table needs these columns:
- `id` (UUID, primary key)
- `slug` (text, unique) - Used for path-based routing
- `novaref_id` (UUID, unique) - Alternative identifier
- `name` (text) - Restaurant name
- Other fields...

### Creating a Restaurant

When creating a restaurant, ensure both `slug` and `novaref_id` are set:

```sql
INSERT INTO restaurants (id, name, slug, novaref_id, ...)
VALUES (
  uuid_generate_v4(),
  'Bills Diner',
  'bill', -- lowercase, alphanumeric, hyphens only
  uuid_generate_v4(),
  ...
);
```

## Validation Rules for Slugs

Restaurant slugs must:
- Be 3-63 characters long
- Contain only lowercase letters, numbers, and hyphens
- Start and end with alphanumeric characters
- Not be reserved words: `admin`, `api`, `reserve`, `payment`, `dashboard`, `settings`

## Migration from Subdomain-Based

### Before (Subdomain-Based)
```
https://bill.nova-reserve.netlify.app/reserve
https://bill.nova-reserve.netlify.app/dashboard/reservations
```

### After (Path-Based)
```
https://nova-reserve.netlify.app/bill/reserve
https://nova-reserve.netlify.app/bill/dashboard/reservations
```

### Why the Change?

1. **Simplified Deployment**: No need for wildcard DNS or SSL certificates
2. **Works Everywhere**: Compatible with all hosting providers (Netlify, Vercel, etc.)
3. **No Environment Variables**: Doesn't require `VITE_BASE_DOMAIN` configuration
4. **Easier Testing**: Test multiple restaurants on localhost without `/etc/hosts` entries
5. **Better for Embedded Views**: iframes work seamlessly with query parameters

## Testing

### Local Development

1. Start dev server: `npm run dev`
2. Test restaurant access:
   - `http://localhost:5173/bill/reserve`
   - `http://localhost:5173/bill/dashboard/reservations?embed=true`
3. Test admin: `http://localhost:5173/admin`
4. Test novaref_id: `http://localhost:5173/713df1ae-84f5-45b0-b5c7-c8084a647197/reserve`

### Production Testing

After deployment:
1. Admin panel: `https://nova-reserve.netlify.app/admin`
2. Restaurant by slug: `https://nova-reserve.netlify.app/bill/reserve`
3. Restaurant by novaref_id: `https://nova-reserve.netlify.app/713df1ae-84f5-45b0-b5c7-c8084a647197/dashboard/reservations?embed=true`

## Console Logging

The implementation includes detailed console logs for debugging:

```
[Restaurant Context] Path parts: ["bill", "dashboard", "reservations"]
[Restaurant Context] No novaref_id in path, checking restaurant slug: bill
[Restaurant Context] Loading restaurant by slug: bill
[Restaurant Context] Successfully loaded restaurant: Bills Diner
```

Check browser console (F12) to see restaurant loading status.

## Backwards Compatibility

The system still supports novaref_id-based URLs, so existing shared links using UUIDs will continue to work:

✅ `https://domain.com/713df1ae-.../dashboard/reservations?embed=true` (still works)
✅ `https://domain.com/bill/dashboard/reservations?embed=true` (new format)

## Next Steps

1. Update any external links or bookmarks to use new path-based format
2. Test all restaurant pages with actual restaurant slugs
3. Verify embedded views work correctly
4. Update any documentation or help guides with new URL format

