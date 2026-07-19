# Data storage

## JSON persistence and layout

The MVP deliberately uses local JSON/NDJSON rather than a database.

| Location | Content | Writer/owner |
|---|---|---|
| `data/users/<safe-user-id>.json` | User aggregate: profile, intake/Journey, sessions/executions, plans, progress, nutrition, membership, and history. | `userStore`; domain services perform updates. |
| `data/trainer-workspace.json` | Trainer/client assignment history and trainer notes. | `trainerWorkspaceStore`. |
| `data/ops/enforcement-overrides.json` | Versioned runtime enforcement overrides. | `enforcementStateStore`. |
| `data/ops/token-denylist.json` | Revoked token JTIs and expiry. | `tokenDenylistStore`. |
| `data/ops/admin-audit*.ndjson` | Rotated, integrity-linked administrative audit events. | `adminAuditLog`. |
| `data/ops/diagnostic-reports.ndjson` | Browser/route diagnostics. | `diagnosticStore`. |
| `data/ops/pilot-events.ndjson` | Sanitized pilot telemetry events. | Server append path. |
| `data/ops/pushup-challenge-results.json` | Challenge results. | `challengeService`. |
| `data/ops/exercise-templates.json` | Exercise template builder state. | `exerciseTemplateService`. |
| `public/exercise-db/**` and `data/exercise.json` | Version-controlled exercise reference/catalog data, not member transactional data. | Build tooling/deployment artifact. |
| `public/uploads/avatars/` | Optional avatar binary uploads. | Avatar upload route; feature flag controlled. |

Runtime directories are created at startup. User IDs are restricted to 1–128 letters, digits, dots, underscores, or hyphens, preventing directory traversal.

## Repository responsibilities and file lifecycle

`userStore` creates default aggregates, normalizes required collections, lists users for authorized directory views, and saves a whole aggregate. Services must load/update through it rather than addressing arbitrary paths. `trainerWorkspaceStore` owns assignment/note serialization and active-assignment queries. Operational stores own their own retention, append, rotation, or version checks.

A file is absent before first use, created on first write, read synchronously for a request, and retained until an operator archives/removes it. Assignment deletion is a status transition, not physical deletion. Backups must capture **all** `data/` and enabled uploads together while writes are quiesced.

## Atomic-write strategy

Trainer workspace and enforcement override writes serialize to a process-specific temporary file and rename it over the destination, making replacement atomic on a single filesystem. Audit/diagnostic/pilot logs append records. **Not every store is atomic:** `userStore`, token denylist, challenge, and exercise-template writers currently use direct synchronous overwrite. Therefore an OS/process failure during those writes can truncate data. Never describe the entire persistence layer as transactional.

## Current limitations

* Whole-file, synchronous reads/writes block the event loop and scale with aggregate size.
* There are no cross-file transactions, foreign keys, schema migrations, query indexes, record locks, or optimistic concurrency for most files.
* Multiple Node processes or hosts can lose updates and corrupt append/replace ordering; operate one writer process against local durable storage.
* Local ephemeral container disks can erase state on replacement; production requires a persistent volume and external backups.
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
