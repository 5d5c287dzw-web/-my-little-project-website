-- Private sourcing records for each shop product. This table is also created
-- idempotently by the admin API after staff authentication.
CREATE TABLE IF NOT EXISTS shop_product_bom_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL DEFAULT '',
  manufacturer_part_number TEXT NOT NULL DEFAULT '',
  supplier_name TEXT NOT NULL DEFAULT '',
  supplier_part_number TEXT NOT NULL DEFAULT '',
  supplier_url TEXT NOT NULL DEFAULT '',
  kit_role TEXT NOT NULL DEFAULT 'core' CHECK(kit_role IN ('core','optional','alternative')),
  quantity_per_kit INTEGER NOT NULL DEFAULT 1 CHECK(quantity_per_kit BETWEEN 1 AND 1000),
  pack_quantity INTEGER NOT NULL DEFAULT 1 CHECK(pack_quantity BETWEEN 1 AND 10000),
  buy_price_pence INTEGER CHECK(buy_price_pence IS NULL OR buy_price_pence BETWEEN 0 AND 100000000),
  price_evidence TEXT NOT NULL DEFAULT 'estimate' CHECK(price_evidence IN ('estimate','listing','cart','quote','invoice')),
  evidence_note TEXT NOT NULL DEFAULT '',
  checked_at TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT 'unknown' CHECK(availability IN ('unknown','in_stock','low_stock','backorder','out_of_stock','discontinued')),
  lead_time_days INTEGER CHECK(lead_time_days IS NULL OR lead_time_days BETWEEN 0 AND 365),
  sourcing_status TEXT NOT NULL DEFAULT 'research' CHECK(sourcing_status IN ('research','candidate','ordered','tested','approved','rejected')),
  product_revision TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shop_product_bom_product ON shop_product_bom_items(product_id,sort_order,part_name);
