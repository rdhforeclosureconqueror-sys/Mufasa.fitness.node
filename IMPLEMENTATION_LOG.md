# Implementation Log

## Sprint 4 — Read Model & Observability (2026-07-30)

- Expanded the disposable projection with XP, level, achievement, streak, ledger, and projection-version read views.
- Added an internal, feature-flagged administrative read layer for profiles, XP, achievements, ledger inspection, policy inspection, replay diagnostics, integrity checks, metrics, simulation, deletion, and rebuilds.
- Added deterministic, isolated policy simulation and informational replay analytics covering throughput, caps, overlap suppression, failures, and checksums.
- Preserved the event stream as the sole source of truth; rebuild operations only replace projection state and integrity verification reports mismatches without repair.
- Added Sprint 4 tests for deterministic generation/rebuild, projection deletion, checksums, diagnostics, simulation isolation, validation, and disabled-by-default behavior.

### Deferred

- Member-facing APIs, UI, notifications, and external metrics export remain outside this infrastructure sprint.
