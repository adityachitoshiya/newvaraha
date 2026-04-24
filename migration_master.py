"""
🔧 Master Migration Script for Varaha Jewels
==============================================
Creates all missing tables and adds all missing columns.
Safe to run multiple times — skips anything that already exists.

Run with: python backend/migration_master.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from sqlalchemy import text, inspect
from sqlmodel import SQLModel, create_engine, Session

# Import ALL models so SQLModel metadata knows about them
from models import (
    Category, Product, Order, AdminUser, PaymentGateway, Notification,
    Customer, Review, Coupon, VisitorLog, HeroSlide, CreatorVideo,
    StoreSettings, ActiveVisitor, Promotion, Cart, CartItem, Wishlist,
    Address, ProductVariant, Inventory, OrderReturn, MetalRates,
    SystemSetting, FlashPincode, BlockedRegion, VerificationCode
)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not set. Please set it in your .env file.")
    sys.exit(1)

engine = create_engine(DATABASE_URL.replace("postgres://", "postgresql://", 1))


# ============================================================
# Column definitions for each table
# Format: "table_name": [("column_name", "SQL_TYPE", "DEFAULT")]
# ============================================================

TABLE_COLUMNS = {
    "category": [
        ("name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("display_name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("gender", "VARCHAR", ""),
        ("description", "TEXT", ""),
        ("is_active", "BOOLEAN", "DEFAULT TRUE"),
        ("sort_order", "INTEGER", "DEFAULT 0"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "product": [
        ("name", "VARCHAR", "NOT NULL"),
        ("slug", "VARCHAR", ""),
        ("description", "TEXT", ""),
        ("price", "FLOAT", ""),
        ("mrp", "FLOAT", ""),
        ("stock", "INTEGER", ""),
        ("category", "VARCHAR", ""),
        ("metal", "VARCHAR", ""),
        ("carat", "VARCHAR", ""),
        ("stones", "VARCHAR", ""),
        ("polish", "VARCHAR", ""),
        ("premium", "BOOLEAN", "DEFAULT FALSE"),
        ("tag", "VARCHAR", ""),
        ("style", "VARCHAR", ""),
        ("image", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("additional_images", "TEXT", "DEFAULT '[]'"),
        ("average_rating", "FLOAT", ""),
        ("total_reviews", "INTEGER", "DEFAULT 0"),
        ("rating_distribution", "TEXT", "DEFAULT '{}'"),
        ("gender", "VARCHAR", ""),
        ("collection", "VARCHAR", ""),
        ("product_type", "VARCHAR", ""),
        ("colour", "VARCHAR", ""),
        ("is_spotlight", "BOOLEAN", "DEFAULT FALSE"),
        ("is_mega_deal", "BOOLEAN", "DEFAULT FALSE"),
    ],
    "order": [
        ("customer_name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("email", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("phone", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("address", "TEXT", "NOT NULL DEFAULT ''"),
        ("city", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("pincode", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("total_amount", "FLOAT", "NOT NULL DEFAULT 0"),
        ("status", "VARCHAR", "DEFAULT 'pending'"),
        ("email_status", "VARCHAR", "DEFAULT 'pending'"),
        ("payment_method", "VARCHAR", "DEFAULT 'cod'"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
        ("items_json", "TEXT", "NOT NULL DEFAULT '[]'"),
        ("status_history", "TEXT", "DEFAULT '[]'"),
        ("order_id", "VARCHAR", ""),
        ("shipping_id", "VARCHAR", ""),
        ("awb_number", "VARCHAR", ""),
        ("courier_name", "VARCHAR", ""),
        ("tracking_data", "TEXT", ""),
        ("user_id", "UUID", ""),
        ("label_url", "TEXT", ""),
        ("manifest_url", "TEXT", ""),
        ("original_amount", "FLOAT", ""),
        ("discount_amount", "FLOAT", "DEFAULT 0.0"),
        ("state", "VARCHAR", ""),
        ("hsn_code", "VARCHAR", "DEFAULT '7117'"),
        ("taxable_value", "FLOAT", "DEFAULT 0.0"),
        ("cgst_amount", "FLOAT", "DEFAULT 0.0"),
        ("sgst_amount", "FLOAT", "DEFAULT 0.0"),
        ("igst_amount", "FLOAT", "DEFAULT 0.0"),
    ],
    "adminuser": [
        ("username", "VARCHAR", "NOT NULL"),
        ("hashed_password", "VARCHAR", "NOT NULL"),
    ],
    "paymentgateway": [
        ("name", "VARCHAR", "NOT NULL"),
        ("provider", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("is_active", "BOOLEAN", "DEFAULT FALSE"),
        ("credentials_json", "TEXT", "DEFAULT '{}'"),
    ],
    "notification": [
        ("message", "TEXT", "NOT NULL DEFAULT ''"),
        ("is_read", "BOOLEAN", "DEFAULT FALSE"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
        ("user_id", "UUID", ""),
    ],
    "customer": [
        ("full_name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("email", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("phone", "VARCHAR", ""),
        ("hashed_password", "VARCHAR", ""),
        ("provider", "VARCHAR", "DEFAULT 'email'"),
        ("telegram_id", "VARCHAR", ""),
        ("supabase_uid", "VARCHAR", ""),
        ("firebase_uid", "VARCHAR", ""),
        ("is_active", "BOOLEAN", "DEFAULT TRUE"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "review": [
        ("product_id", "VARCHAR", "NOT NULL"),
        ("customer_name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("rating", "INTEGER", "NOT NULL DEFAULT 5"),
        ("comment", "TEXT", "NOT NULL DEFAULT ''"),
        ("media_urls", "TEXT", "DEFAULT '[]'"),
        ("helpful_count", "INTEGER", "DEFAULT 0"),
        ("verified_purchase", "BOOLEAN", "DEFAULT FALSE"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "coupon": [
        ("code", "VARCHAR", "NOT NULL"),
        ("discount_type", "VARCHAR", "NOT NULL DEFAULT 'percentage'"),
        ("discount_value", "FLOAT", "NOT NULL DEFAULT 0"),
        ("min_order_amount", "FLOAT", ""),
        ("max_discount", "FLOAT", ""),
        ("payment_method_restriction", "VARCHAR", "DEFAULT 'none'"),
        ("is_active", "BOOLEAN", "DEFAULT TRUE"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "visitorlog": [
        ("ip_hash", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("path", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("timestamp", "TIMESTAMP", "DEFAULT NOW()"),
        ("date", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("city", "VARCHAR", ""),
        ("state", "VARCHAR", ""),
        ("country", "VARCHAR", ""),
    ],
    "heroslide": [
        ("image", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("mobile_image", "VARCHAR", ""),
        ("title", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("subtitle", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("link_text", "VARCHAR", "DEFAULT 'Explore Collections'"),
        ("link_url", "VARCHAR", "DEFAULT '/collections/all'"),
        ("secondary_link_text", "VARCHAR", "DEFAULT 'Our Heritage'"),
        ("secondary_link_url", "VARCHAR", "DEFAULT '/heritage'"),
        ("\"order\"", "INTEGER", "DEFAULT 0"),
    ],
    "creatorvideo": [
        ("name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("handle", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("platform", "VARCHAR", "NOT NULL DEFAULT 'instagram'"),
        ("followers", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("video_url", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("product_name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("is_verified", "BOOLEAN", "DEFAULT TRUE"),
    ],
    "storesettings": [
        ("store_name", "VARCHAR", "DEFAULT 'Varaha Jewels'"),
        ("support_email", "VARCHAR", "DEFAULT 'support@varahajewels.com'"),
        ("currency_symbol", "VARCHAR", "DEFAULT '₹'"),
        ("announcement_text", "VARCHAR", "DEFAULT 'Grand Launch In:'"),
        ("announcement_date", "VARCHAR", "DEFAULT '2026-02-12T00:00:00'"),
        ("show_announcement", "BOOLEAN", "DEFAULT TRUE"),
        ("announcement_bar_json", "TEXT", "DEFAULT '[]'"),
        ("delivery_free_threshold", "FLOAT", "DEFAULT 1000.0"),
        ("logo_url", "VARCHAR", "DEFAULT '/varaha-assets/logo.png'"),
        ("show_full_page_countdown", "BOOLEAN", "DEFAULT TRUE"),
        ("is_maintenance_mode", "BOOLEAN", "DEFAULT FALSE"),
        ("spotlight_source", "VARCHAR", "DEFAULT 'featured'"),
        ("rapidshyp_enabled", "VARCHAR", "DEFAULT 'false'"),
        ("heritage_video_desktop", "TEXT", ""),
        ("heritage_video_mobile", "TEXT", ""),
        ("ciplx_video_desktop", "TEXT", ""),
        ("ciplx_video_mobile", "TEXT", ""),
        ("ciplx_images_json", "TEXT", "DEFAULT '[]'"),
        ("ciplx_music_url", "TEXT", ""),
        ("ciplx_music_volume", "FLOAT", "DEFAULT 0.4"),
        ("gstin", "VARCHAR", ""),
        ("favicon_url", "VARCHAR", "DEFAULT '/favicon-circle.png'"),
        ("mega_deal_enabled", "BOOLEAN", "DEFAULT TRUE"),
        ("mega_deal_discount_percent", "INTEGER", "DEFAULT 10"),
        ("mega_deal_label", "VARCHAR", "DEFAULT 'MEGA DEAL'"),
        ("bank_offers_json", "TEXT", "DEFAULT '[]'"),
        ("prepaid_discount_enabled", "BOOLEAN", "DEFAULT TRUE"),
        ("prepaid_discount_percent", "INTEGER", "DEFAULT 5"),
        ("minimum_product_price_for_free_shipping", "FLOAT", "DEFAULT 99.0"),
        ("mandatory_shipping_charge", "FLOAT", "DEFAULT 50.0"),
        ("heritage_cards_json", "TEXT", "DEFAULT '[]'"),
        ("testimonials_json", "TEXT", "DEFAULT '[]'"),
    ],
    "activevisitor": [
        ("last_seen", "TIMESTAMP", "DEFAULT NOW()"),
        ("path", "VARCHAR", "NOT NULL DEFAULT '/'"),
    ],
    "promotion": [
        ("title", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("highlight", "VARCHAR", ""),
        ("subtitle", "VARCHAR", ""),
        ("icon", "VARCHAR", "DEFAULT 'discount'"),
        ("icon_url", "VARCHAR", ""),
        ("coupon_code", "VARCHAR", ""),
        ("discount_type", "VARCHAR", "DEFAULT 'percentage'"),
        ("discount_value", "FLOAT", "DEFAULT 0"),
        ("min_cart_value", "FLOAT", ""),
        ("payment_method_restriction", "VARCHAR", "DEFAULT 'none'"),
        ("category_restriction", "VARCHAR", ""),
        ("is_active", "BOOLEAN", "DEFAULT TRUE"),
        ("sort_order", "INTEGER", "DEFAULT 0"),
        ("crea ted_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "cart": [
        ("customer_id", "INTEGER", "NOT NULL"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
        ("updated_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "cartitem": [
        ("cart_id", "INTEGER", "NOT NULL"),
        ("product_id", "VARCHAR", "NOT NULL"),
        ("quantity", "INTEGER", "DEFAULT 1"),
        ("variant_sku", "VARCHAR", ""),
        ("added_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "wishlist": [
        ("customer_id", "INTEGER", "NOT NULL"),
        ("product_id", "VARCHAR", "NOT NULL"),
        ("added_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "address": [
        ("customer_id", "INTEGER", "NOT NULL"),
        ("label", "VARCHAR", "NOT NULL DEFAULT 'Home'"),
        ("full_name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("phone", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("address_line1", "TEXT", "NOT NULL DEFAULT ''"),
        ("address_line2", "TEXT", ""),
        ("city", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("state", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("pincode", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("country", "VARCHAR", "DEFAULT 'India'"),
        ("is_default", "BOOLEAN", "DEFAULT FALSE"),
        ("address_type", "VARCHAR", "DEFAULT 'both'"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
        ("updated_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "productvariant": [
        ("product_id", "VARCHAR", "NOT NULL"),
        ("sku", "VARCHAR", "NOT NULL"),
        ("name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("price", "FLOAT", ""),
        ("stock", "INTEGER", "DEFAULT 0"),
        ("attributes", "TEXT", "DEFAULT '{}'"),
        ("is_available", "BOOLEAN", "DEFAULT TRUE"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "inventory": [
        ("variant_id", "INTEGER", ""),
        ("product_id", "VARCHAR", ""),
        ("stock", "INTEGER", "DEFAULT 0"),
        ("reserved", "INTEGER", "DEFAULT 0"),
        ("available", "INTEGER", "DEFAULT 0"),
        ("low_stock_threshold", "INTEGER", "DEFAULT 5"),
        ("updated_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "orderreturn": [
        ("order_id", "VARCHAR", "NOT NULL"),
        ("customer_id", "INTEGER", "NOT NULL"),
        ("reason", "TEXT", "NOT NULL DEFAULT ''"),
        ("description", "TEXT", ""),
        ("status", "VARCHAR", "DEFAULT 'pending'"),
        ("refund_amount", "FLOAT", "NOT NULL DEFAULT 0"),
        ("refund_method", "VARCHAR", "DEFAULT 'original'"),
        ("return_items", "TEXT", "DEFAULT '[]'"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
        ("processed_at", "TIMESTAMP", ""),
        ("admin_notes", "TEXT", ""),
        ("tracking_number", "VARCHAR", ""),
        ("shipment_id", "VARCHAR", ""),
        ("label_url", "TEXT", ""),
    ],
    "metalrates": [
        ("gold_rate", "FLOAT", "DEFAULT 124040.0"),
        ("silver_rate", "FLOAT", "DEFAULT 208900.0"),
        ("updated_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "systemsetting": [
        ("value", "TEXT", "NOT NULL DEFAULT ''"),
        ("description", "TEXT", ""),
        ("updated_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "flashpincode": [
        ("pincode", "VARCHAR", "NOT NULL"),
        ("area_name", "VARCHAR", ""),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "blockedregion": [
        ("region_code", "VARCHAR", "NOT NULL"),
        ("region_name", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("is_blocked", "BOOLEAN", "DEFAULT FALSE"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
    ],
    "verificationcode": [
        ("code", "VARCHAR", "NOT NULL DEFAULT ''"),
        ("expires_at", "TIMESTAMP", "NOT NULL DEFAULT NOW()"),
        ("created_at", "TIMESTAMP", "DEFAULT NOW()"),
        ("attempts", "INTEGER", "DEFAULT 0"),
    ],
}


def get_existing_tables(conn):
    """Get all existing table names from the database."""
    inspector = inspect(conn)
    return set(inspector.get_table_names())


def get_existing_columns(conn, table_name):
    """Get all existing column names for a table."""
    inspector = inspect(conn)
    try:
        columns = inspector.get_columns(table_name)
        return {col["name"] for col in columns}
    except Exception:
        return set()


def migrate():
    print("=" * 60)
    print("🔧 Varaha Jewels — Master Migration")
    print("=" * 60)

    # Step 1: Create all missing tables via SQLModel metadata
    print("\n📦 Step 1: Creating missing tables...")
    SQLModel.metadata.create_all(engine)
    print("   ✅ All tables ensured via SQLModel.metadata.create_all()")

    # Step 2: Add missing columns to existing tables
    print("\n🔩 Step 2: Adding missing columns...")
    
    with engine.connect() as conn:
        existing_tables = get_existing_tables(conn)
        
        added_count = 0
        skipped_count = 0
        error_count = 0
        
        for table_name, columns in TABLE_COLUMNS.items():
            if table_name not in existing_tables:
                print(f"\n   ⚠️  Table '{table_name}' not found (should have been created in Step 1)")
                continue
            
            existing_cols = get_existing_columns(conn, table_name)
            
            for col_name, col_type, col_default in columns:
                # Clean column name (remove quotes for comparison)
                clean_col_name = col_name.strip('"')
                
                if clean_col_name in existing_cols:
                    skipped_count += 1
                    continue
                
                # Build ALTER TABLE statement
                default_clause = f" {col_default}" if col_default else ""
                
                # For NOT NULL columns without DEFAULT, we need to handle carefully
                # Remove NOT NULL for ALTER TABLE ADD COLUMN on existing tables with data
                alter_default = col_default
                if "NOT NULL" in alter_default and "DEFAULT" not in alter_default:
                    # Can't add NOT NULL without default on existing rows
                    if col_type == "VARCHAR":
                        alter_default = "DEFAULT ''"
                    elif col_type in ("INTEGER", "FLOAT"):
                        alter_default = "DEFAULT 0"
                    elif col_type == "TIMESTAMP":
                        alter_default = "DEFAULT NOW()"
                    elif col_type == "TEXT":
                        alter_default = "DEFAULT ''"
                    else:
                        alter_default = ""
                
                sql = f'ALTER TABLE "{table_name}" ADD COLUMN {col_name} {col_type} {alter_default}'.strip()
                
                try:
                    conn.execute(text(sql))
                    print(f"   ✅ {table_name}.{clean_col_name} ({col_type})")
                    added_count += 1
                except Exception as e:
                    err = str(e).lower()
                    if "already exists" in err or "duplicate column" in err:
                        skipped_count += 1
                    else:
                        print(f"   ❌ {table_name}.{clean_col_name}: {e}")
                        error_count += 1
        
        conn.commit()
    
    # Summary
    print("\n" + "=" * 60)
    print(f"📊 Migration Summary:")
    print(f"   ✅ Columns added:   {added_count}")
    print(f"   ⏭️  Columns skipped: {skipped_count} (already exist)")
    if error_count:
        print(f"   ❌ Errors:          {error_count}")
    print("=" * 60)
    print("✅ Master migration complete!\n")


if __name__ == "__main__":
    migrate()
