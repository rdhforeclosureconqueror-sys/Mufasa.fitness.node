# Data storage

## JSON persistence and layout

The MVP deliberately uses local JSON/NDJSON rather than a database.

| Location | Content | Writer/owner |
|---|---|---|
| `data/users/<safe-user-id>.json` | User aggregate: profile, intake/Journey, sessions/executions, plans, progress, nutrition, membership, and history. | `userStore`; domain services perform updates. |
| `data/trainer-workspace.json` | Trainer/client assignment history and trainer notes. | `trainerWorkspaceStore`. |
| `data/ops/enforcement-overrides.json` | Versioned runtime enforcement overrides. | `enforcementStateStore`. |
| `data/ops/token-denylist.json` | Revoked token JTIs and expiry. | `tokenDenylistStore`. |
| `data/ops/auth-credentials.json` | Salted password credentials, stable member IDs, and free account access tier. | `authCredentialStore`. |
| `data/ops/admin-audit*.ndjson` | Rotated, integrity-linked administrative audit events. | `adminAuditLog`. |
| `data/ops/diagnostic-reports.ndjson` | Browser/route diagnostics. | `diagnosticStore`. |
| `data/ops/pilot-events.ndjson` | Sanitized pilot telemetry events. | Server append path. |
| `data/ops/pushup-challenge-results.json` | Challenge results. | `challengeService`. |
| `data/ops/exercise-templates.json` | Exercise template builder state. | `exerciseTemplateService`. |
| `public/exercise-db/**` and `data/exercise.json` | Version-controlled exercise reference/catalog data, not member transactional data. | Build tooling/deployment artifact. |
| `public/uploads/avatars/` | Optional avatar binary uploads. | Avatar upload route; feature flag controlled. |

Runtime directories are created at startup. `POCKET_PT_DATA_DIR` relocates the complete `data/` tree, including operational stores, onto durable storage; it is mandatory when the normal production entry point starts. `POCKET_PT_AVATAR_UPLOAD_DIR` similarly relocates avatar binaries and is mandatory in production when that feature is enabled. User IDs are restricted to 1–128 letters, digits, dots, underscores, or hyphens, preventing directory traversal.

Run Club credentials use `<POCKET_PT_DATA_DIR>/ops/auth-credentials.json`. With the documented Render configuration (`POCKET_PT_DATA_DIR=/var/data/pocket-pt/data`), the exact production path is `/var/data/pocket-pt/data/ops/auth-credentials.json`, on the same mounted persistent disk as `users/<safe-user-id>.json` Greatness/member aggregates. A restart or redeploy reattaches that disk and preserves both files; a container-local `POCKET_PT_DATA_DIR` would be ephemeral and is not an acceptable production configuration.

## Repository responsibilities and file lifecycle

`userStore` creates default aggregates, normalizes required collections, lists users for authorized directory views, and saves a whole aggregate. Services must load/update through it rather than addressing arbitrary paths. `trainerWorkspaceStore` owns assignment/note serialization and active-assignment queries. Operational stores own their own retention, append, rotation, or version checks.

A file is absent before first use, created on first write, read synchronously for a request, and retained until an operator archives/removes it. Assignment deletion is a status transition, not physical deletion. Backups must capture **all** `data/` and enabled uploads together while writes are quiesced.

## Atomic-write strategy

Trainer workspace and enforcement override writes serialize to a process-specific temporary file and rename it over the destination, making replacement atomic on a single filesystem. Audit/diagnostic/pilot logs append records. **Not every store is atomic:** `userStore`, token denylist, challenge, and exercise-template writers currently use direct synchronous overwrite. Therefore an OS/process failure during those writes can truncate data. Never describe the entire persistence layer as transactional.

## Current limitations

* Whole-file, synchronous reads/writes block the event loop and scale with aggregate size.
* There are no cross-file transactions, foreign keys, schema migrations, query indexes, record locks, or optimistic concurrency for most files.
* Multiple Node processes or hosts can lose updates and corrupt append/replace ordering; operate one writer process against local durable storage.
* Local ephemeral container disks are discarded on replacement; production requires a persistent volume and external backups. The production startup guard prevents an unconfigured normal entry-point boot, but cannot prove that the configured path is backed by a real volume.
* Secrets and personal data rely on OS/volume access controls; application-level encryption at rest is not implemented.

## Backup and restore

Stop or drain the single process, copy `data/` and enabled `public/uploads/avatars/` with metadata, checksum and encrypt the archive, then restart. To restore, stop the service, preserve the damaged tree, extract a matched archive to the configured application paths, verify ownership/permissions and JSON parseability, start one process, check `/health`, and exercise a test identity. Detailed commands are in the [runbook](../operations/runbook.md).

## Future SQLite/PostgreSQL migration path (not implemented)

1. Freeze and version JSON schemas; add repository contract tests and stable entity IDs/timestamps.
2. Map aggregates to users, intakes, plans, executions, nutrition, assignments, notes, audit, and operational tables with constraints and indexes.
3. Introduce database-backed repository implementations behind existing service interfaces.
4. Build an idempotent offline importer with checksums, rejection reporting, counts, and referential validation.
5. Rehearse backup/restore and compare read models in a staging copy; optionally dual-read for verification (avoid unsafe uncoordinated dual-write).
6. Quiesce writes, take a final backup, import the delta, switch configuration, validate, and retain JSON read-only for rollback.
7. Use SQLite for a single-node transitional deployment or PostgreSQL for concurrent processes, managed backups, and stronger operations.

No migration or persistence replacement is part of this documentation phase.

## Firebase member-cloud pilot contract (design only; not enabled)

This is a proposed additive integration. Existing Render bearer-token auth, member IDs, JSON records, and avatar upload endpoints remain authoritative until an independently reviewed cutover. The Firebase project `fitnessmvp-9923c` is not yet approved for production writes: Storage test-mode rules expired, Firestore/Auth state is unverified, and billing is disabled.

### Safe rollout gates

1. **Inventory and identity:** confirm existing `requireAuth` middleware and stable member ID. Only the server may derive a member's storage prefix from a validated session. Never accept a client-supplied owner ID or Firebase object path as authority.
2. **Backend-only adapter:** implement behind `FIREBASE_MEMBER_CLOUD_ENABLED=false` (default). No browser Firebase credentials or Firebase Admin private keys in source control. Use least-privilege runtime credentials and a single configured bucket. Firebase Admin SDK bypasses Storage Security Rules: enforce member authorization, file type/size, and object ownership in the backend even if bucket rules are restrictive.
3. **Object naming:** use an internal immutable member identifier and server-generated random object ID, e.g. `members/<internal-member-id>/avatars/<object-id>`. Persist only non-sensitive metadata and an immutable object reference. Avoid names, email addresses, or assessment contents in paths.
4. **First pilot:** synthetic avatars only, with bounded MIME/size, malware/content handling policy, private objects, short-lived authorized retrieval, and explicit upload confirmation. Existing `/api/avatar/upload` contract stays unchanged; do not switch reads or writes on globally.
5. **Failure handling:** if Firebase fails, return a clear retriable error and leave the existing authoritative record unchanged; no silent success, orphan references, or unsafe fallback that exposes another member's data. Capture first-failure diagnostics without secrets or personal file contents.
6. **Tests before enabling:** unauthenticated access denied; member A cannot access B's objects; invalid MIME, oversize and traversal inputs rejected; interrupted uploads cleaned up; retries idempotent; deletion and restore checked; mobile and desktop cross-device retrieval tested; existing avatar route regression tests pass.
7. **Operational gate:** verify actual bucket, Firestore availability, quotas, Google Cloud billing prerequisites, budget alerts, retention, backups and deletion policy. A Firebase project connection alone does not establish storage readiness.
8. **Release:** stage with synthetic accounts, review PR and CI, fix failures, merge, deploy with flag OFF, verify live unchanged, then separately approve a limited opt-in pilot. Preserve rollback to existing storage until recovery is proven.

### Data placement

- **Existing JSON store (authoritative initially):** identity, credentials, member aggregate, workouts, nutrition, assessments, billing, and permissions.
- **Cloud Storage (pilot only):** private avatar binary objects; later consider optimized media with quotas and lifecycle rules.
- **Firestore (future, not required for first avatar pilot):** structured metadata and indexed member memory after separate database and security verification. Never store bulk media in Firestore.

### Release evidence checklist

Record: baseline commit, changed files, automated tests and results, security review, PR link, merge SHA, deployment identifier, live smoke-test results, flag state, rollback plan, and remaining blockers. Do not report production completion based only on a merged design document.
