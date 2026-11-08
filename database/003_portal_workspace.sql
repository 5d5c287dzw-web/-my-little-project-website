-- Apply to a dedicated D1 database bound as DB to the Pages environment.
-- This migration stores drafts and preview catalogue records. It does not create checkout or payments.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staff_access (
  clerk_user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('admin','creator')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  granted_by TEXT NOT NULL
);
-- Grant roles only through a trusted operator console after verifying the Clerk subject.

CREATE TABLE IF NOT EXISTS shop_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category_id TEXT REFERENCES shop_categories(id),
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  kit_stage TEXT NOT NULL DEFAULT 'concept' CHECK(kit_stage IN ('concept','prototype','testing','ready')),
  visibility TEXT NOT NULL DEFAULT 'hidden' CHECK(visibility IN ('hidden','preview')),
  price_pence INTEGER CHECK(price_pence IS NULL OR price_pence >= 0),
  price_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(price_confirmed IN (0,1)),
  supplier_strategy TEXT NOT NULL DEFAULT 'undecided' CHECK(supplier_strategy IN ('undecided','stock','drop_ship','hybrid')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shop_products_visibility ON shop_products(visibility,kit_stage);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('email','website','social','other')),
  status TEXT NOT NULL DEFAULT 'idea' CHECK(status IN ('idea','draft','review','scheduled','complete')),
  audience TEXT NOT NULL DEFAULT '',
  brief TEXT NOT NULL DEFAULT '',
  scheduled_for TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creator_projects (
  id TEXT PRIMARY KEY,
  owner_clerk_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category_id TEXT REFERENCES shop_categories(id),
  summary TEXT NOT NULL DEFAULT '',
  concept TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','changes_requested','approved_internal')),
  admin_feedback TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_creator_projects_owner ON creator_projects(owner_clerk_user_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_creator_projects_review ON creator_projects(status,updated_at);

CREATE TABLE IF NOT EXISTS creator_resources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES creator_projects(id) ON DELETE CASCADE,
  owner_clerk_user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('guide','video_plan','print_plan','bom_note')),
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready_for_review')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_creator_resources_owner ON creator_resources(owner_clerk_user_id,project_id);

CREATE TABLE IF NOT EXISTS staff_audit_events (
  id TEXT PRIMARY KEY,
  actor_clerk_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_audit_created ON staff_audit_events(created_at);

INSERT OR IGNORE INTO shop_categories(id,slug,name,description,sort_order) VALUES
 ('cat-electronics','electronics-coding','Electronics & Coding','Circuits, displays and hands-on discovery',10),
 ('cat-robotics','robotics-rc','Robotics & RC','Build moving machines and take control',20),
 ('cat-bundles','build-together-bundles','Build-together bundles','Larger shared builds and sets',30);

-- Initial records are internal drafts. Existing static prototype pages stay public as before.
INSERT OR IGNORE INTO shop_products(id,slug,title,category_id,summary,description,kit_stage,visibility) VALUES
 ('LP-001','little-flight-radar','Little Flight Radar','cat-electronics','Build a round-screen aircraft tracker.','An ADS-B discovery build in development.','prototype','hidden'),
 ('LP-031','little-rc-buggy','Little RC Buggy','cat-robotics','Build and drive a small RC buggy.','A solder-free family build being prototyped.','prototype','hidden'),
 ('LP-036','build-and-race-twin-pack','Build & Race Twin Pack','cat-bundles','Two buggy builds for making and racing together.','A larger bundle concept based on Little RC Buggy.','concept','hidden');
