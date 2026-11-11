-- Owner-only launch evidence for the first kit. The protected Admin API applies
-- this idempotent table after authorisation. No checkout or entitlement is created.
CREATE TABLE IF NOT EXISTS product_launch_checks (
  product_id TEXT NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing' CHECK(status IN ('missing','working','verified','blocked')),
  evidence_note TEXT NOT NULL DEFAULT '',
  evidence_url TEXT NOT NULL DEFAULT '',
  decision_note TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(product_id, check_key)
);
