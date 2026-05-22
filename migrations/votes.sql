CREATE TABLE IF NOT EXISTS votes_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL UNIQUE,
  college_id INTEGER NOT NULL,
  voter_token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_votes_college_created
  ON votes_log (college_id, created_at DESC);

CREATE TABLE IF NOT EXISTS used_turnstile_tokens (
  token_hash TEXT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
