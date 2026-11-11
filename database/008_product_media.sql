-- Compact, single-image prototype records. Run after 003 and 007 if applying manually.
-- Admin writes create the table idempotently in an existing D1 deployment.
CREATE TABLE IF NOT EXISTS shop_media (
 target_type TEXT NOT NULL CHECK(target_type IN ('product','bom')),
 target_id TEXT NOT NULL,
 product_id TEXT NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
 image_data BLOB NOT NULL,
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 alt_text TEXT NOT NULL DEFAULT '',
 caption TEXT NOT NULL DEFAULT '',
 is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(target_type,target_id)
);
CREATE INDEX IF NOT EXISTS idx_shop_media_product ON shop_media(product_id,target_type);
