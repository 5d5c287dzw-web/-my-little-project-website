-- My Little Project: proposed dropship fulfilment data model.
-- Design-only migration: DO NOT apply until checkout, supplier credentials and payment flow are reviewed.
-- Prices stored in minor currency units (pence). Supplier data is private.
CREATE TABLE IF NOT EXISTS fulfilment_suppliers (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0,
 supports_blind_shipping INTEGER NOT NULL DEFAULT 0,
 supports_complete_kit INTEGER NOT NULL DEFAULT 0,
 supports_tracking INTEGER NOT NULL DEFAULT 0,
 order_integration TEXT NOT NULL DEFAULT 'manual',
 return_policy_url TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS fulfilment_offers (
 id TEXT PRIMARY KEY, kit_id TEXT NOT NULL, supplier_id TEXT NOT NULL REFERENCES fulfilment_suppliers(id),
 supplier_sku TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'GBP',
 kit_cost_pence INTEGER NOT NULL CHECK(kit_cost_pence>=0),
 shipping_cost_pence INTEGER NOT NULL CHECK(shipping_cost_pence>=0),
 handling_cost_pence INTEGER NOT NULL DEFAULT 0 CHECK(handling_cost_pence>=0),
 vat_treatment TEXT NOT NULL DEFAULT 'review_required',
 stock_status TEXT NOT NULL DEFAULT 'unknown',
 delivery_min_days INTEGER, delivery_max_days INTEGER,
 packaging_description TEXT, last_checked_at TEXT,
 approved INTEGER NOT NULL DEFAULT 0,
 UNIQUE(supplier_id,supplier_sku)
);
CREATE TABLE IF NOT EXISTS fulfilment_orders (
 id TEXT PRIMARY KEY, payment_provider TEXT NOT NULL, payment_reference TEXT NOT NULL UNIQUE,
 kit_id TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
 customer_reference TEXT NOT NULL,
 selected_offer_id TEXT NOT NULL REFERENCES fulfilment_offers(id),
 supplier_id TEXT NOT NULL REFERENCES fulfilment_suppliers(id),
 supplier_name_snapshot TEXT NOT NULL,
 supplier_sku_snapshot TEXT NOT NULL,
 customer_price_pence INTEGER NOT NULL,
 supplier_landed_cost_pence INTEGER NOT NULL,
 currency TEXT NOT NULL DEFAULT 'GBP',
 status TEXT NOT NULL DEFAULT 'awaiting_payment',
 supplier_order_reference TEXT UNIQUE,
 tracking_reference TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Address/PII storage, retention, access controls and supplier transmission
-- must be designed before activation. Never put supplier API keys in D1.
