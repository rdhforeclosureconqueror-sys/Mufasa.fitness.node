# Implementation Log

## Sprint 5 — Operational Reliability & Administration (2026-07-30)

- Added a durable, asynchronous replay queue and single-consumer worker supporting full replay, user replay, projection rebuild, XP recalculation, and achievement recalculation jobs.
- Added duplicate suppression, automatic lock release, restart recovery, cancellation, future scheduling, persisted progress, checksummed replay history, and operational metrics.
- Added a durable policy registry with draft, validated, published, deprecated, and archived lifecycle states, immutable publication, validation gates, and effective-window overlap protection.
- Added authenticated internal operational routes for replay queueing, progress, history, cancellation, scheduling, policy administration, read-only integrity reporting, and metrics.
- Kept the complete operational control plane behind the independently disabled-by-default `GAMIFICATION_OPERATIONS` flag. Event capture and workout processing remain independent.
- Preserved authoritative event ordering: replay delegates to the deterministic Sprint 1–4 evaluator and only replaces disposable projections, awards, and derived ledger state.
- Added Sprint 5 tests for serialization, duplicate rejection, cancellation, progress, persistence, restart recovery, failure lock release, lifecycle publication safety, and feature flags.

### Deferred

- Distributed multi-process leasing, external metrics exporters, recurring cron expressions, UI, notifications, and member-facing APIs remain deferred. The durable single-consumer worker is scoped to one application deployment instance.

## Sprint 4 — Read Model & Observability (2026-07-30)

- Expanded the disposable projection with XP, level, achievement, streak, ledger, and projection-version read views.
- Added an internal, feature-flagged administrative read layer for profiles, XP, achievements, ledger inspection, policy inspection, replay diagnostics, integrity checks, metrics, simulation, deletion, and rebuilds.
- Added deterministic, isolated policy simulation and informational replay analytics covering throughput, caps, overlap suppression, failures, and checksums.
- Preserved the event stream as the sole source of truth; rebuild operations only replace projection state and integrity verification reports mismatches without repair.
- Added Sprint 4 tests for deterministic generation/rebuild, projection deletion, checksums, diagnostics, simulation isolation, validation, and disabled-by-default behavior.

### Deferred

- Member-facing APIs, UI, notifications, and external metrics export remain outside this infrastructure sprint.
