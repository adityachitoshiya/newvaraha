-- Database Migration for New Features
-- Run this SQL in Supabase SQL Editor
-- Date: 19 December 2025

-- 1. Add new columns to existing tables
ALTER TABLE product ADD COLUMN IF NOT EXISTS average_rating FLOAT DEFAULT NULL;
ALTER TABLE product ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE product ADD COLUMN IF NOT EXISTS rating_distribution TEXT DEFAULT '{}';

ALTER TABLE review ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE review ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT FALSE;

-- 2. Create Wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist(product_id);

-- 3. Create Address table
CREATE TABLE IF NOT EXISTS address (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    is_default BOOLEAN DEFAULT FALSE,
    address_type TEXT DEFAULT 'both',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_address_customer ON address(customer_id);
CREATE INDEX IF NOT EXISTS idx_address_default ON address(is_default);

-- 4. Create ProductVariant table
CREATE TABLE IF NOT EXISTS productvariant (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price FLOAT,
    stock INTEGER DEFAULT 0,
    attributes TEXT DEFAULT '{}',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_product ON productvariant(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_sku ON productvariant(sku);

-- 5. Create Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    variant_id INTEGER REFERENCES productvariant(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES product(id) ON DELETE CASCADE,
    stock INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0,
    available INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);

-- 6. Create OrderReturn table
CREATE TABLE IF NOT EXISTS orderreturn (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES "order"(order_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    refund_amount FLOAT NOT NULL,
    refund_method TEXT DEFAULT 'original',
    return_items TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    admin_notes TEXT,
    tracking_number TEXT
);

CREATE INDEX IF NOT EXISTS idx_return_order ON orderreturn(order_id);
CREATE INDEX IF NOT EXISTS idx_return_customer ON orderreturn(customer_id);
CREATE INDEX IF NOT EXISTS idx_return_status ON orderreturn(status);

-- 7. Add trigger to update address updated_at timestamp
CREATE OR REPLACE FUNCTION update_address_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER address_update_timestamp
    BEFORE UPDATE ON address
    FOR EACH ROW
    EXECUTE FUNCTION update_address_timestamp();

-- 8. Add trigger to update inventory updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.available = NEW.stock - NEW.reserved;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_update_timestamp
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully! ✅';
    RAISE NOTICE 'New tables created: wishlist, address, productvariant, inventory, orderreturn';
    RAISE NOTICE 'Product and Review tables updated with new columns';
END $$;
