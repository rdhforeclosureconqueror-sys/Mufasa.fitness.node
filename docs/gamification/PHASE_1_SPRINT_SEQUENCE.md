# Phase 1 Gamification — Recommended Sprint Sequence

**Status:** Recommended implementation sequence; no production implementation is included.

**Authority:** This sequence decomposes the approved Phase 1 specifications into independently reviewable increments. If it conflicts with an authoritative specification, the specification governs. Every sprint must update [the implementation log](IMPLEMENTATION_LOG.md) and leave the current Mufasa Node/Express application stable, testable, deployable, and backward compatible.

## Sequencing rationale and entry gate

The eight requested capability groups are retained, but storage, feature flags, safe seed validation, and one shadow event path precede all reward behavior. This makes later engines depend on immutable, deduplicated evidence rather than creating parallel ingestion paths. Read projections and notifications precede browser integration so the frontend remains a server-authoritative consumer. Administrative correction tools follow the user path because they depend on stable ledger and award contracts. Analytics and balancing come last, after every operational signal exists, but foundational health counters begin in Sprint 1.

The [Design Review's implementation-blocking questions](DESIGN_REVIEW.md#blocking-before-implementation) remain explicit entry gates. Before affected production code begins, approved specifications must resolve the atomicity contract, minimum launch event vocabulary, correction flow, read consistency, economy limits, and launch catalogue. If any answer is absent or conflicting, stop, record the blocker in the implementation log, amend and approve the design first, and do not invent a local solution. Rollout-only decisions may remain deferred until their named rollout gate, but no affected feature may be enabled before approval.

File lists below are forecasts, not permission to create parallel systems. During implementation, prefer the existing service/repository and `public/` structures; record exact paths in the implementation log.

## Sprint 1 — Foundation and Event Infrastructure

### Objective

Establish disabled-by-default feature flags, registered event contracts and minimization validation, immutable/deduplicated event persistence, cursor/checkpoint foundations, safe definition seed validation, observability, and one shadow `workout.completed` adapter that cannot affect the authoritative workout response.

### Estimated complexity

**High.** Persistence atomicity, concurrency, restart recovery, privacy filtering, and post-commit isolation are foundational and failure-sensitive.

### Dependencies

- Approved answers for atomicity, minimum launch vocabulary, and the correction representation relevant to stored evidence.
- Existing `server.js` composition, session service, repository atomic-write conventions, configuration patterns, and request correlation context.
- Reviewed seed provenance and publication rules; all runtime reward/evaluation/read flags remain off.

### Files expected to change

- `server.js`
- `src/services/sessionService.js`
- `src/config/` (existing configuration module where flags belong)
- `src/gamification/eventTypes.js`
- `src/gamification/validators.js`
- `src/gamification/eventService.js`
- `src/repositories/gamificationEventStore.js`
- `src/repositories/gamificationDefinitionStore.js`
- `data/gamification/*.json`
- `scripts/` validation or seed-normalization utilities
- `test/` event, persistence, and session-integration tests
- `docs/gamification/IMPLEMENTATION_LOG.md`

### Tests expected

- Table-driven envelope/type/version validation, payload allow-listing, numeric/string bounds, privacy redaction, and unknown-version quarantine.
- Idempotency and concurrent duplicate recording; append-only behavior; deterministic cursor resume.
- Atomic write, restart, partial-write/corruption quarantine, backup recovery, and bounded-read tests.
- Authoritative workout success emits once only after commit; failed/no-op writes emit none; capture failure never changes domain success.
- Flags-off regression and existing full test suite.

### Rollback strategy

Disable the workout source flag and global event capture, then revert the adapter and foundation code. Leave expand-only stores dormant and retain immutable shadow events for audit; restore a backup only for physical corruption and reconcile committed sessions afterward. Verify workout completion with all gamification dependencies unavailable.

### Definition of Done

- Blocking design decisions needed by this sprint are approved and referenced.
- Every gamification flag defaults off and existing behavior is unchanged with flags off.
- One accepted workout produces exactly one minimized shadow event after commit, including across retries/restarts.
- Invalid/unknown events are rejected or quarantined without exposing sensitive payloads.
- Store recovery and observability checks pass; the full suite passes; the log is complete; the repository is deployable.

## Sprint 2 — Achievement Engine

### Objective

Implement deterministic, version-aware achievement rule evaluation over immutable events, append-only award/revocation records, aggregate and streak projection primitives, replay idempotency, and invisible shadow outcomes.

### Estimated complexity

**High.** Effective-time version selection, repeatability, derived-event loop prevention, corrections, and deterministic replay require extensive boundary testing.

### Dependencies

- Sprint 1 event contracts, durable cursor, definition provider, and event store.
- Approved correction/revocation policy, read consistency checkpoint semantics relevant to projections, and reviewed initial achievement catalogue.
- Achievement rule language and lifecycle defined by `ACHIEVEMENT_SYSTEM.md`.

### Files expected to change

- `src/gamification/achievementEvaluator.js`
- `src/gamification/policyService.js`
- `src/gamification/streakProjector.js`
- `src/gamification/projectionService.js`
- `src/repositories/gamificationAwardStore.js`
- `src/repositories/gamificationProjectionStore.js`
- `src/repositories/gamificationDefinitionStore.js`
- `data/gamification/achievements.json`
- `data/gamification/achievement-rules.json`
- `data/gamification/streak-definitions.json`
- `test/` evaluator, award, streak, correction, and replay tests
- `docs/gamification/IMPLEMENTATION_LOG.md`

### Tests expected

- AND/OR, count, sum, distinct count, streak, personal-improvement, hidden, tiered, repeat-period, and revoked-definition rules.
- Effective intervals and definition versions; unknown/unpublished definitions do not award.
- Duplicate delivery/replay produces no duplicate award; derived-event graph is acyclic.
- UTC/user-local day, DST, leap day, timezone change, late event, grace day, and correction boundaries.
- Revocation is append-only and projection rebuilds produce identical checksums.

### Rollback strategy

Disable evaluation while retaining event capture in shadow mode. Revert evaluator/projector code but preserve immutable events and invisible award records; use approved revocations rather than deletion for incorrect outcomes. Rebuild disposable projections from the last verified cursor after repair.

### Definition of Done

- Evaluation is deterministic, retryable, version-correct, and invisible behind disabled read/notification flags.
- Awards trace to source events and exact rule versions; corrections append revocations.
- Duplicate live delivery and full replay add no awards; two clean rebuilds have identical checksums.
- Boundary, failure-injection, existing, and full-suite tests pass; the log is complete; deployment remains safe with evaluation off.

## Sprint 3 — XP and Level Engine

### Objective

Add versioned reward-policy evaluation, append-only integer XP/point ledgers, caps and overlap controls, compensating reversals, deterministic balances, lifetime levels, and eligible titles without exposing rewards to users yet.

### Estimated complexity

**High.** Financial-style conservation, concurrency, cap enforcement, effective policy versions, and economy simulation require precise accounting.

### Dependencies

- Sprint 2 evaluation/effect idempotency and projection rebuilds.
- Approved initial economy limits, policy version, overlap groups, target distribution, theoretical maximum issuance, titles, and rollback thresholds.
- No seasonal reset, marketplace, cosmetic entitlement, or transfer behavior without a separate approved decision.

### Files expected to change

- `src/gamification/policyService.js`
- `src/gamification/levelService.js`
- `src/gamification/projectionService.js`
- `src/repositories/gamificationLedgerStore.js`
- `src/repositories/gamificationProjectionStore.js`
- `data/gamification/action-policies.json`
- `data/gamification/levels.json`
- `data/gamification/titles.json`
- `scripts/` economy validation/simulation utilities
- `test/` ledger, policy, level, title, reversal, and simulation tests
- `docs/gamification/IMPLEMENTATION_LOG.md`

### Tests expected

- Integer-only effects, safe ranges, per-source/daily/aggregate caps, overlap groups, and provisional/rejected/revoked evidence.
- Unique effect keys under concurrent duplicate evaluation and replay.
- Reversal conservation and audit traceability; balances derive only from ledger entries.
- Exact level boundaries, monotonic curve, maximum level behavior, and title eligibility/selection constraints.
- Representative economy simulation and two deterministic projection rebuilds.

### Rollback strategy

Disable evaluation before reverting policies/engine code. Keep event and ledger records immutable, append approved compensating entries for any incorrect issued value, and rebuild projections. Because read APIs remain disabled, no client contract changes are required.

### Definition of Done

- Every XP/point effect is an integer, idempotent, capped, and traceable to an event and published policy version.
- Ledger conservation, reversal, concurrency, replay, level, and economy thresholds pass.
- Deferred economies remain absent and point balances have no spend/transfer path.
- The full suite passes, implementation log is updated, and flags can leave the engine dormant in a deployable release.

## Sprint 4 — Badge Engine and Launch Catalogue

### Objective

Publish the small reviewed Phase 1 badge/achievement catalogue, validate cross-definition references and lifecycle metadata, connect qualifying achievement awards to badge projections, and keep inactive/future definitions non-awardable.

### Estimated complexity

**Medium.** Engine primitives exist, but catalogue governance, tier consistency, hidden metadata, saturation controls, and provenance validation need careful review.

### Dependencies

- Sprints 2–3 award, policy, and projection contracts.
- Approved hard launch-catalogue budget, owners, tier spacing, safety/privacy/accessibility review, retirement criteria, and seed import review.
- `BADGE_LIBRARY.md`; future yoga/gymnastics entries remain draft/inactive.

### Files expected to change

- `data/gamification/badge-catalog.json`
- `data/gamification/achievements.json`
- `data/gamification/achievement-rules.json`
- `src/gamification/achievementEvaluator.js`
- `src/gamification/projectionService.js`
- `src/repositories/gamificationDefinitionStore.js`
- `scripts/` catalogue validation/import utilities
- `test/` catalogue, provenance, lifecycle, and badge-award tests
- `docs/gamification/IMPLEMENTATION_LOG.md`

### Tests expected

- Unique IDs, valid references, semantic versions/effective intervals, lifecycle states, tier order, source checksums, and maximum catalogue size.
- Disabled, retired, draft, hidden, future, and unsupported legacy definitions behave as specified.
- Badge award idempotency, tier progression, no duplicate/circular rewards, and replay parity.
- Safe/localizable metadata and accessible text requirements; hidden criteria are not placed in safe public projections.

### Rollback strategy

Disable evaluation, retire or disable the affected unpublished definitions through the approved lifecycle, and revert catalogue/validation code. Never delete already published definition versions or awards; revoke incorrect awards through the approved correction path and rebuild projections.

### Definition of Done

- Only approved, published launch definitions can award; inactive future and quarantined legacy items cannot.
- Catalogue budget, provenance, reference, lifecycle, safety, privacy, accessibility, and saturation checks pass.
- Awards remain deterministic and traceable through replay/rebuild.
- The full suite passes, the log is updated, and public read/notification flags remain off.

## Sprint 5 — Notifications and User Progress APIs

### Objective

Expose authenticated, projection-only progress reads and preferences, then implement a deduplicated optional notification queue with independent flags, cooldown/bundling controls, privacy redaction, and graceful stale/unavailable states.

### Estimated complexity

**High.** Authentication isolation, pagination, consistency semantics, hidden-data redaction, and notification fatigue controls affect user trust.

### Dependencies

- Sprints 2–4 stable projections, ledger, awards, catalogue, and checksums.
- Approved read freshness/stale-state promise and safe field exposure.
- Notification budget approval is required before notifications are enabled; implementation may ship disabled beforehand.

### Files expected to change

- `server.js`
- `src/gamification/projectionService.js`
- `src/gamification/` notification/preference service modules, if no existing service can be extended
- `src/repositories/gamificationProjectionStore.js`
- Existing user-preference repository/service where appropriate
- `src/services/memberHomeService.js`
- `src/validation/` gamification query/preference validators
- `test/` API, privacy, notification, and member-home tests
- `docs/gamification/IMPLEMENTATION_LOG.md`

### Tests expected

- Authentication, membership, cross-user isolation, response envelopes, projection timestamps/catalogue versions, opaque cursor pagination, capped limits, and invalid queries.
- Ledger/event privacy redaction, hidden-achievement behavior, and disabled/delayed/unavailable projection responses.
- Optimistic preference versions and notification mute/motion controls.
- Notification deduplication, one-visible-at-a-time contract, bundling, cooldowns, retry, and independent failure isolation.
- Existing member-home behavior and core domain writes survive all gamification failures.

### Rollback strategy

Disable notifications first and read APIs second; revert route composition and member-home composition while leaving evaluation and immutable records intact. Clients must retain graceful unavailable behavior. Rebuild projections only if their contract changed incorrectly.

### Definition of Done

- Authenticated users can read only their safe, projection-based state; no award/event ingestion endpoint exists.
- Consistency and stale/unavailable behavior match the approved design; all lists are bounded and paginated.
- Notification failure never blocks a domain action or award, and visibility can be disabled independently.
- Security, privacy, API, failure, existing, and full-suite tests pass; the log and rollback record are complete.

## Sprint 6 — Frontend Integration

### Objective

Integrate server-authored progress into the active `public/` frontend: member-home summary, achievement details/catalogue, preferences, and a rate-limited accessible unlock queue with truthful loading, empty, stale, unavailable, and error states.

### Estimated complexity

**Medium–High.** Multiple UI states, accessibility, responsive layouts, and non-blocking integration with existing success flows require browser coverage.

### Dependencies

- Sprint 5 stable read/preference/notification contracts.
- Approved UI copy and safe evidence exposure; leaderboards remain excluded unless their separate privacy/moderation gates are approved.
- Existing active `public/` runtime and design system; no alternate or legacy frontend.

### Files expected to change

- Existing active files under `public/` for member home and contextual success flows
- Reusable progress/API/rendering modules under the existing `public/` structure
- Existing styles and accessible component patterns under `public/`
- Browser/contract tests under `test/`
- `docs/gamification/IMPLEMENTATION_LOG.md`

### Tests expected

- Loading, empty, delayed/stale, unavailable, partial, and error-state rendering.
- Server values render without client reward calculations; hidden criteria stay hidden.
- Keyboard navigation, screen-reader names/status announcements, focus management, contrast, responsive layout, localization readiness, and reduced motion.
- Unlock queue deduplication/rate limiting and notification mute; core action success never waits for refresh/toast.
- Flags-off and existing frontend workflow regression tests.

### Rollback strategy

Disable notifications and frontend/read flags, remove or revert optional UI mounts, and retain APIs and immutable backend state dormant. Verify all pre-existing pages and action-success flows without gamification responses.

### Definition of Done

- Optional progress UI consumes server projections only and degrades without blocking any current workflow.
- Required user states and accessibility checks pass; copy is non-punitive and does not encourage unsafe behavior.
- No legacy runtime/frontend is revived and no browser path can grant value.
- Browser/contract/full-suite tests pass, required screenshots are captured for review, and the log is finalized.

## Sprint 7 — Admin and Moderation Tools

### Objective

Add current-platform, admin-only operational commands for definition validation/shadow comparison, projection rebuild, reconciliation/backfill dry-run, dead-letter inspection, and approved reversal/revocation, with existing authorization and tamper-evident audit patterns.

### Estimated complexity

**High.** Privileged correction and replay operations can affect member-visible state and require strict authorization, auditability, resumability, and dry-run safety.

### Dependencies

- Stable event, award, ledger, projection, and definition contracts from Sprints 1–5.
- A separately approved administrative authorization/audit design, correction roles, backfill boundary, operator ownership, and member-visible correction policy.
- Existing authorization and admin audit services; do not create a parallel admin runtime.

### Files expected to change

- Existing admin composition/routes in `server.js` or current admin modules
- `src/gamification/` replay, reconciliation, correction, and definition-publication services
- `src/lib/authorization.js`
- `src/lib/adminAuditLog.js`
- Gamification repositories for bounded admin reads/checkpoints
- `scripts/` admin commands where the approved design selects CLI operations
- `test/` authorization, audit, replay, backfill, correction, and interruption-recovery tests
- `docs/gamification/IMPLEMENTATION_LOG.md`

### Tests expected

- Deny-by-default authorization, role boundaries, cross-user targeting protection, reason/approval requirements, rate limits, and audit-chain integrity.
- Dry-run makes no writes; live operations are resumable/idempotent and retain exact definition/cursor provenance.
- Reversal conservation, award revocation, member-visible explanation, bounded targeted replay, and deterministic rebuild.
- Backfill boundary/reliability enforcement, interruption recovery, reconciliation variance, and no raw sensitive payloads in logs/dead letters.

### Rollback strategy

Disable admin operations and evaluation/read visibility as impact requires, revert command/route surfaces, and preserve audit/event/ledger/award history. Resume or compensate interrupted operations only through approved runbooks; never hand-edit stores. Verify ordinary member and domain flows remain available.

### Definition of Done

- Only approved operators can execute narrowly scoped, audited, dry-run-first operations.
- Correction, reversal, replay, rebuild, reconciliation, and backfill behavior is deterministic and recoverable.
- No administrative publication/correction endpoint ships without its approved design.
- Security/audit/failure/full-suite tests pass, an operational rollback drill is recorded, and the log is complete.

## Sprint 8 — Analytics, Monitoring, and Balancing

### Objective

Complete privacy-safe operational metrics, dashboards/checks, economy and catalogue balancing reports, quantitative rollout gates, alerts, runbooks, and staged enablement controls without adding reward authority to analytics.

### Estimated complexity

**Medium–High.** Instrumentation is technically straightforward, but representative simulation, privacy-safe aggregation, alert thresholds, and rollout rehearsal require cross-functional approval.

### Dependencies

- Signals emitted by all prior sprints.
- Approved duplicate/reconciliation SLOs, quantitative rollout gates, named operators, notification thresholds, economy rollback thresholds, and privacy classification.
- Representative non-sensitive or synthetic simulation data and current monitoring/audit facilities.

### Files expected to change

- Gamification observability hooks under `src/gamification/`
- Existing health/diagnostic/control-plane modules under `src/lib/`
- `scripts/` reconciliation, economy simulation, projection-checksum, and rollout verification tools
- `docs/operations/runbook.md`
- `docs/release/release-checklist.md`
- `test/` metrics privacy, threshold, alert, checksum, and rollout-gate tests
- `docs/gamification/IMPLEMENTATION_LOG.md`

### Tests expected

- Counts, cursor lag, duplicate rate, failure/dead-letter counts, source variance, cap hits, projection checksums, and economy distributions are accurate and contain no user payloads.
- Alert threshold/pass-pause-rollback logic, disabled-component health, and bounded metric cardinality.
- Repeat economy simulation, catalogue saturation indicators, two clean rebuild checksums, and shadow/source reconciliation.
- Staff/cohort flag transitions, rollback drill, and existing production health checks.

### Rollback strategy

Disable rollout flags in order: notifications/UI, read APIs, evaluation, then affected capture sources. Revert dashboards/alerts independently if they are noisy, while preserving underlying immutable records. Use compensating entries/revocations for incorrect issued value, rebuild projections from a verified cursor, and verify core workflows with every gamification component unavailable.

### Definition of Done

- Named owners and approved numeric thresholds exist for every rollout, pause, and rollback gate.
- Privacy-safe monitoring detects lag, duplication, divergence, failures, inflation, saturation, and notification fatigue.
- Economy/catalogue reports meet approved thresholds and staged rollout/rollback procedures are rehearsed and recorded.
- All automated and operational checks pass, the repository remains deployable at every flag state, and the implementation log is complete.

## Cross-sprint constraints

Every sprint must preserve these conditions:

1. The current Mufasa Node/Express platform is the only runtime and production authority.
2. Existing services commit and validate domain actions; gamification observes accepted facts after commit and cannot fail those actions.
3. Clients never author trusted events or rewards.
4. Immutable evidence and append-only accounting are corrected through approved compensating records, not edits or deletion.
5. New behavior is modular, disabled-by-default until its gate is approved, backward compatible, and removable through flags.
6. The full existing test suite plus sprint-specific tests pass before completion.
7. `IMPLEMENTATION_LOG.md` is finalized in the sprint change set with exact files, validation, risks, deferrals, rollback, and acceptance evidence.
