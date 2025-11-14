-- Add novaref_id column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS novaref_id TEXT;

-- Add comment to document the field
COMMENT ON COLUMN restaurants.novaref_id IS 'Nova reference ID for external API integration';

