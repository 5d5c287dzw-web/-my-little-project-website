-- My Little Project customer ownership schema (development migration).
-- Apply manually to mlp-workshop-dev only after reviewing existing schema.
-- Clerk subject is the sole external identity key. Never use an email as authorisation.
CREATE TABLE IF NOT EXISTS customers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 clerk_user_id TEXT NOT NULL UNIQUE CHECK(length(clerk_user_id) > 5),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS customer_project_entitlements (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 project_id TEXT NOT NULL REFERENCES projects(id),
 source TEXT NOT NULL CHECK(source IN ('purchase','manual','gift')),
 source_reference TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 revoked_at TEXT,
 UNIQUE(customer_id, project_id, source, source_reference)
);
CREATE INDEX IF NOT EXISTS idx_entitlements_customer_active
 ON customer_project_entitlements(customer_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_entitlements_project
 ON customer_project_entitlements(project_id);
-- Do not seed entitlements: ownership must be verified from a trusted source.
