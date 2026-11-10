-- Owner-preview links for each product's Git source, documentation and video.
-- The private APIs apply this idempotent definition after authorization.
-- These links are not included in the public catalogue response.
CREATE TABLE IF NOT EXISTS shop_product_links (
  product_id TEXT PRIMARY KEY REFERENCES shop_products(id) ON DELETE CASCADE,
  repository_url TEXT NOT NULL DEFAULT '',
  documentation_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
