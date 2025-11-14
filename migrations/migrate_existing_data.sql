-- Migration: Assign existing data to a default restaurant
-- Run this AFTER running add_subdomain_support.sql

-- 1. Create or get default restaurant
DO $$
DECLARE
  default_restaurant_id UUID;
  existing_restaurant_id UUID;
BEGIN
  -- Check if default restaurant exists
  SELECT id INTO existing_restaurant_id 
  FROM restaurants 
  WHERE subdomain = 'default' 
  LIMIT 1;

  IF existing_restaurant_id IS NULL THEN
    -- Create default restaurant
    INSERT INTO restaurants (name, subdomain, slug, settings, created_at, updated_at)
    VALUES ('Default Restaurant', 'default', 'default', '{}', NOW(), NOW())
    RETURNING id INTO default_restaurant_id;
  ELSE
    default_restaurant_id := existing_restaurant_id;
  END IF;

  -- 2. Update all existing data to use default restaurant
  -- Update waitlist entries without restaurant_id
  UPDATE waitlist_entries 
  SET restaurant_id = default_restaurant_id 
  WHERE restaurant_id IS NULL;

  -- Update reservations without restaurant_id
  UPDATE reservations 
  SET restaurant_id = default_restaurant_id 
  WHERE restaurant_id IS NULL;

  -- Update tables without restaurant_id
  UPDATE tables 
  SET restaurant_id = default_restaurant_id 
  WHERE restaurant_id IS NULL;

  -- Update time slots without restaurant_id
  UPDATE time_slots 
  SET restaurant_id = default_restaurant_id 
  WHERE restaurant_id IS NULL;

  RAISE NOTICE 'Migration completed. Default restaurant ID: %', default_restaurant_id;
END $$;

-- 3. Verify migration
SELECT 
  'waitlist_entries' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE restaurant_id IS NOT NULL) as with_restaurant_id
FROM waitlist_entries
UNION ALL
SELECT 
  'reservations',
  COUNT(*),
  COUNT(*) FILTER (WHERE restaurant_id IS NOT NULL)
FROM reservations
UNION ALL
SELECT 
  'tables',
  COUNT(*),
  COUNT(*) FILTER (WHERE restaurant_id IS NOT NULL)
FROM tables
UNION ALL
SELECT 
  'time_slots',
  COUNT(*),
  COUNT(*) FILTER (WHERE restaurant_id IS NOT NULL)
FROM time_slots;

