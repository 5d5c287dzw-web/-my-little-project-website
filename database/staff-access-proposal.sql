-- Apply only to the development D1 database. No user receives admin automatically.
CREATE TABLE IF NOT EXISTS staff_access (
 clerk_user_id TEXT PRIMARY KEY,
 role TEXT NOT NULL CHECK(role IN ('admin','creator')),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 granted_by TEXT NOT NULL
);
-- Administrator access must be granted manually from a trusted operator console
-- after verifying the exact Clerk user ID and enabling MFA in Clerk.
-- Example, DO NOT run without replacing values and verifying identity:
-- INSERT INTO staff_access(clerk_user_id,role,enabled,granted_by)
-- VALUES ('user_REPLACE_WITH_VERIFIED_ID','admin',1,'trusted_operator');
