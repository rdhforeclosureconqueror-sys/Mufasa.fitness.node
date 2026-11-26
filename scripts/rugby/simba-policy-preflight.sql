\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
DO $guard$
BEGIN
 IF current_database() <> 'simba_db_jda4' THEN RAISE EXCEPTION 'Wrong database'; END IF;
 IF current_setting('transaction_read_only') <> 'on' THEN RAISE EXCEPTION 'Read-only guard failed'; END IF;
 IF NOT has_database_privilege(current_user,current_database(),'CREATE') THEN RAISE EXCEPTION 'Migration privilege missing'; END IF;
 IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='rugby_intelligence') THEN RAISE EXCEPTION 'Rugby schema already exists'; END IF;
END
$guard$;
ROLLBACK;
SELECT 'Read-only preflight passed' AS result;
