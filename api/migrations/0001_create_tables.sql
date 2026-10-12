-- Votes and answer releases of the course labs.
CREATE TABLE IF NOT EXISTS votes (
  tutorial TEXT NOT NULL,
  question_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tutorial, question_id, voter_id)
);

CREATE INDEX IF NOT EXISTS votes_by_voter ON votes (tutorial, voter_id);

-- One row per question, so that the frequent state requests read few rows.
CREATE TABLE IF NOT EXISTS vote_totals (
  tutorial TEXT NOT NULL,
  question_id TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tutorial, question_id)
);

CREATE TABLE IF NOT EXISTS releases (
  tutorial TEXT NOT NULL,
  question_id TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tutorial, question_id)
);
