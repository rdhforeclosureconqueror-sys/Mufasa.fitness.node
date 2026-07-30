# Gamification Production Operations

## Deployment topology

All application instances must mount the same POSIX-compatible durable volume at `POCKET_PT_DATA_DIR`. The replay store uses atomic directory acquisition for cross-process transactions, checksummed and revisioned snapshots, a last-known-good backup, `fsync`, worker leases, out-of-event-loop heartbeat subprocesses, and fencing tokens. Do not enable workers on hosts that do not share this volume.

Enable `GAMIFICATION_EVENT_CAPTURE`, `GAMIFICATION_EVALUATION`, `GAMIFICATION_READ_API`, and `GAMIFICATION_OPERATIONS` only after the migration and preflight checks succeed. Rolling deployments are supported: an interrupted lease is claimed after expiry, and fencing prevents its prior owner from committing a terminal job update.

## Migration and rollback

Run `npm run ops:migrate-gamification` first. It is a read-only dry run. Run `npm run ops:migrate-gamification -- --apply` once against the mounted production volume to migrate a Sprint 5 schema-1 replay file to the checksummed schema-2 envelope. Back up `POCKET_PT_DATA_DIR` before applying.

To roll back application code, first set `GAMIFICATION_OPERATIONS=false` on every instance and wait for the active lease to finish or expire. The schema-2 operational files may remain in place because source events and projection contracts are unchanged. Restore the `.bak` replay snapshot only when checksum validation reports primary corruption.

## Monitoring and alerts

Poll `GET /internal/gamification/operations/readiness` and `GET /internal/gamification/operations/metrics` with an authenticated administrator identity. Alert on readiness failure, a lease older than its expiry, queue depth growth, replay failures, integrity failures, policy validation failures, or sustained throughput reduction. Audit policy and replay mutations through the existing tamper-evident administrator audit chain.

## Recovery runbook

1. Disable `GAMIFICATION_OPERATIONS` across all instances to stop new claims.
2. Preserve the replay store, its `.bak`, policy registry, event store, audit logs, projections, awards, and ledger for diagnosis.
3. Verify the event store and audit checksums. Never edit or repair source events.
4. If only a disposable projection is invalid, re-enable one worker instance and enqueue a projection rebuild.
5. If a job owner crashed, allow its lease to expire; do not manually rewrite job state.
6. Re-enable all instances only after readiness and integrity reporting are healthy.

Policy simulation and integrity reporting remain write-free with respect to source events. Integrity failures must be investigated and never trigger silent repair.
