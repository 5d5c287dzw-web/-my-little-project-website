-- Run against mlp-workshop-dev D1 in the Preview environment before testing /api/customer.
-- Clerk subject is the only identity source; never trust a user ID supplied by the browser.
CREATE TABLE IF NOT EXISTS workshop_customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workshop_customers_clerk_user_id ON workshop_customers(clerk_user_id);
