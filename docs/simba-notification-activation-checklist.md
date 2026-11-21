# Simba notification activation — controlled operator checklist

**Status: NOT ACTIVATED.** This document is a runbook, not permission to execute production SQL. The existing Simba PostgreSQL instance is the only approved database. Never target GarveyDB or Universal Case OS.

## Preconditions and evidence
1. Capture current frontend/backend live deploy commit, Simba database identifier, owner, schema inventory, and a verified recovery/backup point. Record who approved the maintenance window and database writes.
2. Inspect `business_os_notifications` schema existence and existing object names. Stop if the schema exists with unexpected objects or if backup/recovery is not verified.
3. Identify a **new, dedicated LOGIN role** with its own secret. Never use Simba's owner credentials in the notification runtime. Review role memberships and inherited privileges; `search_path` alone is not isolation.
4. Prepare rollback: restore prior service configuration/deploy immediately if activation fails; stop the notification worker and revoke dedicated role access before investigating. Do **not** drop shared database, `public` schema, or unrelated objects. Preserve audit/notification records; any destructive rollback requires a separate backup/restore decision.

## Explicitly gated activation sequence
1. With separate production database-change approval, execute `createSimbaNotificationSchemaMigration({pool}).migrate({approved:true})` through an authorized migration connection. This is a transactional, additive operation; it must not be run merely by importing the module.
2. Provision the dedicated LOGIN role using the database administrator's approved secret-management process. Review the generated `notificationRuntimeGrantSQL(role)` before applying it; grants must target **only** `business_os_notifications`.
3. Review inherited memberships, database CONNECT, public schema CREATE, and public table/sequence access. Stop on unexpected privilege inheritance. Explicitly revoke excess privileges through a separately reviewed DBA change.
4. Run `createSimbaNotificationActivationPreflight({pool}).inspect({runtimeRole})` using an authorized inspector connection. Require `READY_FOR_MANUAL_DENIAL_TEST`.
5. Connect **as the dedicated runtime role** with `createSimbaNotificationPoolConfig` and run `createSimbaNotificationPublicDenialCheck({pool}).inspect({expectedRole})`. Require `PUBLIC_ACCESS_DENIED` and nonzero public object inventory. A privileged inspector connection is not valid for this test.
6. Independently verify application reads/writes are limited to the notification schema, exercise a non-sending canary, confirm no unexpected Simba public changes, and only then separately approve provider dispatch and production endpoint routing.
7. Monitor delivery outcomes, idempotency, audit logs, and error rates. Any unknown provider outcome must enter reconciliation, not automatic resend.

## Stop conditions
- Schema or role missing; unexpected schema objects; privilege or identity mismatch; unsafe search path; failed denial test; CI/deploy regression; unverified backup; any unapproved public-schema write.
- Never interpret a green CI test or a successful Render deployment as proof that production DB migration, grants, role isolation, or notification sending is live.

## Evidence to record
Approval reference; pre-change backup identifier; migration transaction result; schema/table inventory; role name (never secret); grant audit; preflight output; denial output; non-sending canary; frontend/backend deployment IDs; rollback decision; operator and timestamp.
