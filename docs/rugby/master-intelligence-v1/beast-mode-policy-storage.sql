-- Proposed migration only. Do not execute until database target and privileges are reviewed.
CREATE TABLE rugby_beast_mode_policy_versions (
 version integer PRIMARY KEY CHECK (version >= 1),
 policy jsonb NOT NULL,
 actor text NOT NULL CHECK (length(actor) > 0),
 reason text NOT NULL CHECK (length(reason) > 0),
 published_at timestamptz,
 CHECK ((version = 1 AND published_at IS NULL) OR (version > 1 AND published_at IS NOT NULL))
);
-- Runtime role must receive SELECT and INSERT only; no UPDATE, DELETE or TRUNCATE.
