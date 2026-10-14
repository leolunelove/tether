CREATE TABLE IF NOT EXISTS voice_cleanup (prefix TEXT PRIMARY KEY NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS action_limits (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
