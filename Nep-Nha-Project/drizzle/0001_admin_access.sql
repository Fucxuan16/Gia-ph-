CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX admin_sessions_expiry ON admin_sessions (expires_at);
--> statement-breakpoint
CREATE TABLE admin_login_limits (
  visitor_key TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX admin_login_limits_expiry ON admin_login_limits (expires_at);
