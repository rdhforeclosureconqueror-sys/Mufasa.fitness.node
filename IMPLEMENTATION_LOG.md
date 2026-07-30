# Implementation Log

## Sprint 5 — Operational Reliability & Administration (2026-07-30)

- Added a durable, asynchronous replay queue and single-consumer worker supporting full replay, user replay, projection rebuild, XP recalculation, and achievement recalculation jobs.
- Added duplicate suppression, automatic lock release, restart recovery, cancellation, future scheduling, persisted progress, checksummed replay history, and operational metrics.
- Added a durable policy registry with draft, validated, published, deprecated, and archived lifecycle states, immutable publication, validation gates, and effective-window overlap protection.
- Added authenticated internal operational routes for replay queueing, progress, history, cancellation, scheduling, policy administration, read-only integrity reporting, and metrics.
- Kept the complete operational control plane behind the independently disabled-by-default `GAMIFICATION_OPERATIONS` flag. Event capture and workout processing remain independent.
- Preserved authoritative event ordering: replay delegates to the deterministic Sprint 1–4 evaluator and only replaces disposable projections, awards, and derived ledger state.
- Added Sprint 5 tests for serialization, duplicate rejection, cancellation, progress, persistence, restart recovery, failure lock release, lifecycle publication safety, and feature flags.
- Production hardening added shared-volume transaction locks, cross-instance worker leases, heartbeat renewal, fencing tokens, revisioned checksummed snapshots, backup recovery, atomic `fsync` persistence, policy activation as the live evaluator source, tamper-evident audit events, a dedicated mutation permission, readiness monitoring, migration tooling, and a deployment/recovery runbook.

### Deferred

- Application-level launch infrastructure is complete for a shared POSIX durable volume. Deployment remains responsible for mounting the same volume on every worker instance, securing administrator credentials, collecting the internal metrics endpoint, and configuring alerts. UI, notifications, and member-facing APIs remain outside this backend infrastructure sprint.

## Sprint 4 — Read Model & Observability (2026-07-30)

- Expanded the disposable projection with XP, level, achievement, streak, ledger, and projection-version read views.
- Added an internal, feature-flagged administrative read layer for profiles, XP, achievements, ledger inspection, policy inspection, replay diagnostics, integrity checks, metrics, simulation, deletion, and rebuilds.
- Added deterministic, isolated policy simulation and informational replay analytics covering throughput, caps, overlap suppression, failures, and checksums.
- Preserved the event stream as the sole source of truth; rebuild operations only replace projection state and integrity verification reports mismatches without repair.
- Added Sprint 4 tests for deterministic generation/rebuild, projection deletion, checksums, diagnostics, simulation isolation, validation, and disabled-by-default behavior.

### Deferred

- Member-facing APIs, UI, notifications, and external metrics export remain outside this infrastructure sprint.

## 2026-07-30 — Yoga and Movement Intelligence V1

Added a shared deterministic MoveNet landmark engine, versioned 10-pose/eight-session Yoga catalogue, member Yoga UI, authoritative derived session persistence, post-commit Yoga gamification event/XP policy, and read-only AI Coach Yoga context. Legacy MediaPipe assets remain quarantined as reference-only; no raw video or landmarks are persisted.
