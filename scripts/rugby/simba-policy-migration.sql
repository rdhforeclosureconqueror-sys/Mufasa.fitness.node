\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $guard$
BEGIN
 IF current_database() <> 'simba_db_jda4' THEN RAISE EXCEPTION 'Wrong database'; END IF;
END
$guard$;
SELECT pg_advisory_xact_lock(1381320537, 2);
CREATE SCHEMA IF NOT EXISTS rugby_intelligence;
REVOKE ALL ON SCHEMA rugby_intelligence FROM PUBLIC;
CREATE TABLE IF NOT EXISTS rugby_intelligence.rugby_beast_mode_policy_versions (
 version integer PRIMARY KEY CHECK (version >= 1),
 policy jsonb NOT NULL,
 actor text NOT NULL CHECK (length(actor) > 0),
 reason text NOT NULL CHECK (length(reason) > 0),
 published_at timestamptz,
 CHECK ((version = 1 AND published_at IS NULL) OR (version > 1 AND published_at IS NOT NULL))
);
REVOKE ALL ON TABLE rugby_intelligence.rugby_beast_mode_policy_versions FROM PUBLIC;
COMMIT;
SELECT to_regclass('rugby_intelligence.rugby_beast_mode_policy_versions') AS verified_table;
