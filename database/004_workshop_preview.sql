-- Owner-only Workshop preview. This stores demo stage markers, not purchases,
-- customer entitlements, order history or downloadable resource permissions.
-- The protected Workshop API applies this idempotent table definition on first use.
CREATE TABLE IF NOT EXISTS workshop_preview_progress (
  clerk_user_id TEXT NOT NULL,
  project_id TEXT NOT NULL CHECK(project_id = 'LP-031'),
  completed_stages TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(clerk_user_id, project_id)
);
