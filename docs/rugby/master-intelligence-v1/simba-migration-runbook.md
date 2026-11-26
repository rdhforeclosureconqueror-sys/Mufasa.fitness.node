# Simba Rugby production migration runbook — PR 1420

## Before execution
- Confirm Render Simba instance dpg-d8o7kajeo5us73dtfdn0-a and database simba_db_jda4 using trusted dashboard metadata. Verify external TLS hostname and CA; do not disable certificate verification.
- DBA verifies backup and restore capability, and confirms schema and table are absent or exactly match the approved migration. If unexpected objects exist, stop and investigate.
- Configure GitHub environment rugby-simba-production restricted to main with required reviewer where supported. Store RUGBY_SIMBA_MIGRATION_URL only as an environment secret, with an authorized temporary migration identity. Ensure connection URI enforces verify-full, not a weaker sslmode. Never log the URI.
- Run Rugby Simba migration on main with confirmation MIGRATE_RUGBY_SIMBA after review and approval. No automatic deploy-time DDL.
- Verify schema/table, constraints, ownership and ACLs independently. Provision dedicated runtime LOGIN separately, with USAGE on rugby_intelligence and SELECT/INSERT on the policy table only. Verify no unrelated data access, no UPDATE/DELETE/TRUNCATE, no inherited privileged roles. Use separate runtime secret and explicit search path. Do not enable application writes before these checks.

## Recovery
Before COMMIT any SQL failure rolls back the transaction. If execution is interrupted or verification fails, inspect database state before retrying; do not assume a failed workflow implies rollback.
After COMMIT a Git revert does not reverse DDL. Affected objects: rugby_intelligence schema, rugby_beast_mode_policy_versions table and their PUBLIC ACLs. Stop policy writes, revoke dedicated runtime access if provisioned, disable policy routing and redeploy reviewed prior application version. Preserve all policy versions and audit history; no automatic DROP, DELETE or privilege restoration. DBA inspects schema, ACLs and data, compares to preflight backup and applies a separately reviewed forward correction. If restore is necessary, restore to an isolated database first and reconcile subsequent writes before any production recovery. Record operator decision and verification. Rotate/remove temporary migration credential after execution. Existing Simba schemas are not migration targets.

## Evidence
Rehearsal run 45772767772 and recovery regression run 45772767590 passed at caf696b554db6bb721584adc9b846142b9e0650f. Production execution, environment protections, backup and owner acceptance remain unverified.
