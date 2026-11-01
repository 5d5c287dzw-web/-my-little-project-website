-- My Little Project: Phase 2 starter schema for Cloudflare D1
-- Apply only to a development D1 database first.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 category TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('prototype','available','retired')),
 description TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS project_revisions (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 revision TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(project_id, revision)
);
CREATE TABLE IF NOT EXISTS parts (
 id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('replacement','upgrade','enclosure','component')),
 status TEXT NOT NULL CHECK(status IN ('concept','testing','available','retired')),
 description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS part_compatibility (
 part_id TEXT NOT NULL REFERENCES parts(id), revision_id TEXT NOT NULL REFERENCES project_revisions(id),
 PRIMARY KEY(part_id,revision_id)
);
CREATE TABLE IF NOT EXISTS resources (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 revision_id TEXT REFERENCES project_revisions(id),
 title TEXT NOT NULL, resource_type TEXT NOT NULL CHECK(resource_type IN ('guide','video','firmware','print','wiring','other')),
 storage_key TEXT, visibility TEXT NOT NULL DEFAULT 'owner' CHECK(visibility IN ('public','owner')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 licence TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Never store passwords here. subject_id must come from a verified identity provider.
CREATE TABLE IF NOT EXISTS customers (
 subject_id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS purchases (
 id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(subject_id),
 project_id TEXT NOT NULL REFERENCES projects(id),
 stripe_checkout_session_id TEXT UNIQUE,
 payment_status TEXT NOT NULL CHECK(payment_status IN ('pending','paid','refunded','disputed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS purchases_by_customer ON purchases(customer_id,payment_status);
CREATE TABLE IF NOT EXISTS build_progress (
 customer_id TEXT NOT NULL REFERENCES customers(subject_id),
 project_id TEXT NOT NULL REFERENCES projects(id),
 stage_id TEXT NOT NULL, completed INTEGER NOT NULL CHECK(completed IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(customer_id,project_id,stage_id)
);
-- Entitlements must only be issued server-side after a verified Stripe webhook or manual admin approval.
CREATE TABLE IF NOT EXISTS entitlements (
 customer_id TEXT NOT NULL REFERENCES customers(subject_id),
 project_id TEXT NOT NULL REFERENCES projects(id),
 source TEXT NOT NULL CHECK(source IN ('purchase','manual')),
 source_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revoked_at TEXT,
 PRIMARY KEY(customer_id,project_id,source_id)
);
