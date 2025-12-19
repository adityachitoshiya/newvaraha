-- QUICK FIX: Add missing columns to existing tables
-- Run this in Supabase SQL Editor if you're getting 500 errors

-- Add rating columns to product table (safe to run multiple times)
DO $$ 
BEGIN
    -- Add average_rating if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product' AND column_name = 'average_rating'
    ) THEN
        ALTER TABLE product ADD COLUMN average_rating DECIMAL(3,2) DEFAULT NULL;
    END IF;

    -- Add total_reviews if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product' AND column_name = 'total_reviews'
    ) THEN
        ALTER TABLE product ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;

    -- Add rating_distribution if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product' AND column_name = 'rating_distribution'
    ) THEN
        ALTER TABLE product ADD COLUMN rating_distribution TEXT DEFAULT '{}';
    END IF;
END $$;

-- Add helpful columns to review table
DO $$ 
BEGIN
    -- Add helpful_count if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'review' AND column_name = 'helpful_count'
    ) THEN
        ALTER TABLE review ADD COLUMN helpful_count INTEGER DEFAULT 0;
    END IF;

    -- Add verified_purchase if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'review' AND column_name = 'verified_purchase'
    ) THEN
        ALTER TABLE review ADD COLUMN verified_purchase BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Verify columns were added
SELECT 'product' as table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'product'
AND column_name IN ('average_rating', 'total_reviews', 'rating_distribution')
UNION ALL
SELECT 'review', column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'review'
AND column_name IN ('helpful_count', 'verified_purchase');
