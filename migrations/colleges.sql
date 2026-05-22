CREATE TABLE IF NOT EXISTS colleges_list (
  id INTEGER PRIMARY KEY,
  college_name TEXT NOT NULL UNIQUE,
  district TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS processed_submissions (
  submission_id TEXT PRIMARY KEY,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stats (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT OR IGNORE INTO stats (key, value) VALUES ('global_total', 0);

CREATE INDEX IF NOT EXISTS idx_colleges_votes
  ON colleges_list (vote_count DESC, id ASC);
