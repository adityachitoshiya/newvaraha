# 🚨 QUICK FIX FOR 500 ERROR

## Problem
Getting `500 Internal Server Error` when creating products because new columns are missing in database.

## Solution
Run this SQL in **Supabase SQL Editor**:

```sql
-- Add missing columns to product table
ALTER TABLE product 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_distribution TEXT DEFAULT '{}';

-- Add missing columns to review table
ALTER TABLE review 
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT FALSE;

-- Verify columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('product', 'review')
AND column_name IN ('average_rating', 'total_reviews', 'rating_distribution', 'helpful_count', 'verified_purchase');
```

## Steps:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy-paste above SQL
4. Click "Run"
5. Try creating product again

## After Running:
Backend will automatically work! No need to restart.

✅ Backend is running on http://localhost:8000
✅ Check API docs: http://localhost:8000/docs
