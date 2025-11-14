-- Migration: Add subdomain support for multi-tenant restaurants
-- Run this in your Supabase SQL editor

-- 1. Add subdomain column to restaurants table (if not exists)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- 2. Create index on subdomain for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_subdomain ON restaurants(subdomain);

-- 3. Create user_restaurants junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- 4. Create index on user_restaurants for faster queries
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);

-- 5. Add owner_id to restaurants table (if not exists)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Create index on owner_id
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);

-- 7. Migration: Set subdomain for existing restaurants based on slug
-- This assumes existing restaurants have a slug field
UPDATE restaurants 
SET subdomain = slug 
WHERE subdomain IS NULL AND slug IS NOT NULL;

-- 8. If no slug exists, create a default subdomain for existing restaurant
-- Adjust this based on your existing data
DO $$
DECLARE
  default_restaurant_id UUID;
BEGIN
  -- Get the first restaurant or create a default one
  SELECT id INTO default_restaurant_id FROM restaurants LIMIT 1;
  
  IF default_restaurant_id IS NULL THEN
    -- Create a default restaurant if none exists
    INSERT INTO restaurants (name, subdomain, settings, created_at, updated_at)
    VALUES ('Default Restaurant', 'default', '{}', NOW(), NOW())
    RETURNING id INTO default_restaurant_id;
  END IF;
  
  -- Set subdomain for any restaurant without one
  UPDATE restaurants 
  SET subdomain = 'default-' || id::TEXT
  WHERE subdomain IS NULL;
END $$;

-- 9. Enable RLS (Row Level Security) on user_restaurants if needed
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for user_restaurants
-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Users can view own restaurant associations" ON user_restaurants;
DROP POLICY IF EXISTS "Users can view associated restaurants" ON restaurants;

-- Policy: Users can view their own restaurant associations
CREATE POLICY "Users can view own restaurant associations"
  ON user_restaurants FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view restaurants they're associated with
CREATE POLICY "Users can view associated restaurants"
  ON restaurants FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE restaurant_id = restaurants.id AND user_id = auth.uid()
    )
  );

