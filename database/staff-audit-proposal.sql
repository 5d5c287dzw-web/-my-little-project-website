-- Development-only proposal: apply only after reviewing access and retention policy.
CREATE TABLE IF NOT EXISTS staff_audit_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_clerk_user_id TEXT NOT NULL,
 action TEXT NOT NULL,
 target_type TEXT NOT NULL,
 target_id TEXT,
 result TEXT NOT NULL CHECK(result IN ('success','denied','failure')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_audit_created_at ON staff_audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_audit_actor ON staff_audit_events(actor_clerk_user_id,created_at);
-- Never log bearer tokens, passwords, customer addresses or supplier secrets.
-- Audit writes for sensitive mutations should be performed server-side.
