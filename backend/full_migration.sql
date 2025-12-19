-- 1. Add user_id column to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Optional: Add foreign key constraint (if Supabase auth schema is visible/accessible)
-- ALTER TABLE "Order" ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- 3. Enable Row Level Security
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy: Users can VIEW their own orders
-- Drop if exists to avoid errors on re-run
DROP POLICY IF EXISTS "Users can view own orders" ON "Order";
CREATE POLICY "Users can view own orders" 
ON "Order" FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Create Policy: Users can INSERT their own orders
DROP POLICY IF EXISTS "Users can insert own orders" ON "Order";
CREATE POLICY "Users can insert own orders" 
ON "Order" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6. Create Policy: Admin can view all orders (Optional, if you have admin roles)
-- For now, we assume service_role key bypasses RLS, which the backend might use if needed.
-- But usually backend uses 'authenticated' role.
-- If the backend uses a Service Role Key, it bypasses RLS automatically.
