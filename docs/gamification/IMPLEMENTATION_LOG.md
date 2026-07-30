# Phase 1 Gamification Implementation Log

## Purpose

This file is the permanent, chronological engineering journal for Phase 1 gamification implementation. It records what was actually implemented, verified, deferred, and made available for review in each sprint. It is not a specification, backlog, or substitute for the approved design documents.

The authoritative Phase 1 specifications are:

- [Phase 1 Implementation Plan](PHASE_1_IMPLEMENTATION_PLAN.md)
- [Achievement System](ACHIEVEMENT_SYSTEM.md)
- [Event Model](EVENT_MODEL.md)
- [Points and XP](POINTS_AND_XP.md)
- [Badge Library](BADGE_LIBRARY.md)
- [Design Review](DESIGN_REVIEW.md)

If implementation exposes a conflict, ambiguity, or missing decision, stop implementation. Record the issue as deferred work, update and approve the applicable design document first, and only then resume implementation. The log records that decision and links to it; it does not make architecture.

## Recording implementation sprints

- Append one sprint entry in ascending sprint-number order. Never rewrite completed history except to correct an objective factual error; label and date any such correction.
- Create the entry when the sprint begins with status `In Progress`. Update it as work proceeds, and finalize it in the same change set as the sprint implementation.
- Describe only the work delivered by that sprint. Use repository-relative paths, exact test commands, relevant flags, migrations, operational steps, and commit or pull-request references when available.
- Keep each entry independently reviewable. A reader should be able to determine the change boundary, evidence of validation, residual risk, and safe rollback without consulting chat history.
- Use ISO 8601 dates (`YYYY-MM-DD`) in UTC. Use `TBD` only while a sprint is in progress; no completed entry may retain `TBD`.

## Status and completion

Use exactly one of these values:

- `Planned` — scope has been proposed but implementation has not started.
- `In Progress` — implementation or validation is under way.
- `Blocked` — work stopped because an approved design decision or external prerequisite is missing. State the blocker and its owner/reference.
- `Complete` — every acceptance criterion is satisfied, all required tests pass, the repository is deployable, rollback instructions are complete, and this log entry is finalized.
- `Rolled Back` — the sprint was reverted. Append the rollback date, reason, commands or commit references, data-handling outcome, and post-rollback validation; do not delete the original entry.

Checkboxes in **Acceptance Criteria** are the item-level completion record. A sprint is complete only when every required checkbox is checked and `Status` is `Complete`.

## Deferred work

Record every intentionally postponed item under **Deferred Work**, including why it is deferred, the sprint or prerequisite that should address it, and a link to an issue or approved design section when available. Deferred work is not silently carried into another sprint and does not become approved scope merely because it appears here. If there is none, write `None.`

Design gaps and conflicts must also identify the affected authoritative document and remain blocked until that document is updated and approved. Do not record an invented implementation choice as a workaround.

## Architectural decision references

The **Related Design Documents** section must link to the exact authoritative documents and headings governing the sprint. Reference a committed design amendment or decision record when a question is resolved. Summarize the implementation's conformance, but do not duplicate or reinterpret normative rules in this journal.

When a sprint requires a decision not present in the approved design, set its status to `Blocked`, describe the missing decision under **Deferred Work** and **Risks**, and stop affected implementation.

## Documenting implementation changes

Each sprint entry must:

1. State a narrow objective and exact scope, including explicit exclusions where useful.
2. List every modified and newly created file separately using repository-relative paths.
3. Describe database/storage, API, and UI changes, writing `None.` when a category is untouched.
4. List all new or changed tests and the behavior each protects.
5. Record exact validation commands and their results, including relevant manual or operational checks.
6. Identify introduced or remaining risks and their mitigations.
7. Record deferred work without implying that it was delivered.
8. Provide executable rollback instructions and explain how persisted data or immutable records are handled.
9. Define measurable acceptance criteria and mark them only after verification.

Avoid broad claims such as “tests pass” without commands and results. Do not include secrets, tokens, personal data, raw health data, or sensitive event payloads.

## Rollback records

Rollback instructions must identify the code/configuration reversal, feature-flag order, storage compatibility, and verification needed to prove existing domain workflows remain available. Prefer a specific revert commit or file/config steps. Immutable gamification events, ledgers, and awards must not be deleted or hand-edited; use the approved correction/revocation path when applicable. Restore backups only for physical corruption and document reconciliation afterward.

If rollback is executed later, append the outcome to the original sprint entry and change its status to `Rolled Back`. Include what triggered rollback, who/what authorized it, timestamps, affected versions, data disposition, and the exact checks that passed after rollback.

## How future developers should use this log

Before starting a sprint, read the authoritative specifications and all earlier log entries that touch the same modules or stores. Copy the template below, assign the next sprint number, fill the known fields, and keep the entry current throughout implementation. Before requesting review, reconcile the file lists against the actual diff, run the recorded validation, complete the rollback procedure, resolve or explicitly defer every scoped item, and update the status.

Append new entries below the template. Do not place future sprint plans in this file; planning belongs in the implementation plan or an approved companion planning document.

---

# Sprint

**Sprint Number:**

**Objective:**

**Status:** `Planned | In Progress | Blocked | Complete | Rolled Back`

**Dates:** `YYYY-MM-DD` to `YYYY-MM-DD`

**Related Design Documents:**

- [Document — exact section](relative-path.md#section-anchor)

---

## Scope

Exactly what this sprint implements, plus any important exclusions.

## Files Modified

- `path/to/existing-file`

## New Files

- `path/to/new-file`

## Database / Storage Changes

None.

## API Changes

None.

## UI Changes

None.

## Tests Added

- `path/to/test-file` — behavior covered.

## Validation

- `exact command` — result and relevant evidence.

## Risks

- Known risk and mitigation.

## Deferred Work

None.

## Rollback

Exact code/configuration/data steps to revert this sprint, followed by exact post-rollback validation commands.

## Acceptance Criteria

- [ ] Required observable outcome.
- [ ] All required automated tests pass.
- [ ] Existing domain workflows remain stable with gamification disabled or unavailable.
- [ ] Rollback instructions are complete and verified as appropriate.
- [ ] This implementation-log entry matches the final diff and validation results.

---

# Sprint 1 — Foundation and Event Infrastructure

**Sprint Number:** 1

**Objective:** Establish the disabled-by-default, server-authoritative event foundation and a shadow `workout.completed` adapter. No rewards or user-visible behavior are included.

**Status:** `Complete`

**Dates:** `2026-07-30` to `2026-07-30`

**Related Design Documents:**

- [Phase 1 Implementation Plan — Architectural fit](PHASE_1_IMPLEMENTATION_PLAN.md#2-architectural-fit)
- [Phase 1 Implementation Plan — Event capture, persistence, and flags](PHASE_1_IMPLEMENTATION_PLAN.md#7-backend-changes)
- [Event Model — Canonical envelope](EVENT_MODEL.md#2-canonical-envelope)
- [Event Model — Versioning and compatibility](EVENT_MODEL.md#4-versioning-and-compatibility)
- [Event Model — Event store schema](EVENT_MODEL.md#9-event-store-schema)
- [Phase 1 Sprint Sequence — Sprint 1](PHASE_1_SPRINT_SEQUENCE.md#sprint-1--foundation-and-event-infrastructure)

---

## Scope

Implemented versioned event registration and minimization validation, append-only/deduplicated atomic JSON persistence, bounded cursor reads, backup recovery, safe quarantine metadata, observability counters, independent flags, definition-envelope validation, and one post-commit shadow `workout.completed` adapter. Explicitly excluded XP, points, badges, achievements, levels, notifications, read APIs, evaluation, and UI.

## Files Modified

- `.env.example`
- `server.js`
- `src/services/sessionService.js`
- `docs/gamification/IMPLEMENTATION_LOG.md`

## New Files

- `src/config/gamification.js`
- `src/gamification/eventTypes.js`
- `src/gamification/validators.js`
- `src/gamification/eventService.js`
- `src/repositories/gamificationEventStore.js`
- `src/repositories/gamificationDefinitionStore.js`
- `test/gamification-event-infrastructure.test.js`
- `test/gamification-session-integration.test.js`

## Database / Storage Changes

- When both capture flags are explicitly enabled, the existing `POCKET_PT_DATA_DIR` contains `gamification/events.json`, its prior-snapshot `.bak`, and safe `.quarantine.ndjson` metadata as needed. No new database or alternate runtime was introduced.
- Store snapshots are versioned and written with temporary-file write, file `fsync`, atomic rename, and directory `fsync`. The prior valid snapshot is retained for recovery.

## API Changes

None. Existing session response bodies and status codes are unchanged. Request correlation IDs are passed internally to event capture.

## UI Changes

None.

## Architecture Decisions

- Reused `server.js`, `sessionService`, `POCKET_PT_DATA_DIR`, and the repository/service composition pattern; no parallel domain authority was created.
- Capture runs only after `userStore.updateUser` returns successfully. Capture exceptions are converted to privacy-safe operational logs and never alter the committed session response.
- `(subjectUserId, idempotencyKey)` is the deduplication boundary. The first immutable event and cursor win; retries return `duplicate`.
- Unknown contracts and invalid input produce metadata-only quarantine entries. Event payloads and validation details are not copied into quarantine or operational failure logs.
- All flags default off. Global capture and the workout source flag must both be true before the adapter is composed. Evaluation and every later-sprint surface remain off and unimplemented.

## Tests Added

- `test/gamification-event-infrastructure.test.js` — flag defaults; registered envelope minimization and immutability; unknown-version, unsafe-field, enum, and future-skew rejection; deduplication; restart/cursor behavior; bounded reads; backup recovery; safe quarantine; observability; and safe definition-envelope validation.
- `test/gamification-session-integration.test.js` — authoritative commit ordering, exactly-once adapter invocation for accepted completion, no emission for failed/no-op completion, correlation propagation, and domain-success isolation during capture failure.

## Validation

- `node --test test/gamification-event-infrastructure.test.js test/gamification-session-integration.test.js` — passed: 9 tests, 0 failures.
- `npm run lint` — passed: repository self-check completed successfully.
- `npm test` — passed: 710 tests, 0 failures.
- `git diff --check` — passed: no whitespace errors.

## Risks

- The versioned JSON snapshot store is appropriate for the current single-process persistence convention but is not a multi-process transaction coordinator. Deployment must retain one writer per data directory; a future current-platform datastore migration can preserve the repository interface.
- Best-effort capture cannot make a session commit and event append one physical transaction. The approved reconciliation/outbox work remains deferred; domain success is intentionally prioritized and capture failures are observable.
- Backup recovery restores the last prior complete snapshot, so an event from the damaged latest snapshot can require later reconciliation. Immutable source sessions remain authoritative.

## Deferred Work

- Sprint 2: evaluation, achievement rules, awards, projections, and replay effects.
- Later approved sprints: XP/points, badges, levels, read APIs, notifications, UI, additional source adapters, reconciliation/outbox tooling, backfill, and admin operations.
- Legacy seed normalization/publication is not performed in this sprint. The definition store only establishes safe version/lifecycle envelope validation; no definition can award or is loaded into an evaluator.
- Correction/invalidation processing is not emitted by this sole completion adapter and remains within the approved later correction/replay work.

## Rollback

1. Set `GAMIFICATION_SOURCE_WORKOUT_COMPLETED=false` and `GAMIFICATION_EVENT_CAPTURE=false`, then restart the existing Node process. Leave all evaluation/read/notification flags false.
2. Revert the Sprint 1 commit to remove adapter composition and foundation modules.
3. Retain `POCKET_PT_DATA_DIR/gamification/` as dormant immutable shadow evidence; do not delete or hand-edit it. Restore `.bak` only for physical corruption and record reconciliation needs.
4. Run `node --test test/session-api.test.js test/persistence-restart.test.js` and `npm test` to verify authoritative workflows with gamification unavailable.

## Acceptance Criteria

- [x] Every gamification flag defaults off and no later-sprint feature is enabled or implemented.
- [x] A successful authoritative workout completion can produce one minimized versioned event only after commit; retry/no-op and failed writes produce none.
- [x] Event persistence is immutable through its public interface, deduplicated, bounded, cursor-addressable, restart-safe, and recoverable from the prior atomic snapshot.
- [x] Invalid and unknown contracts are rejected and quarantined with safe metadata only.
- [x] Capture failure cannot alter successful domain responses and emits privacy-safe observable failure data.
- [x] All required automated tests pass.
- [x] Existing domain workflows remain stable with gamification disabled or unavailable.
- [x] Rollback instructions are complete and preserve dormant immutable records.
- [x] This implementation-log entry matches the final diff and validation results.

---

# Sprint 2 — Achievement Engine

**Sprint Number:** 2

**Objective:** Deliver deterministic event consumption, achievement and progress evaluation, append-only badge/XP outcomes and corrections, level projections, and full replay behind disabled-by-default visibility flags.

**Status:** `Complete`

**Dates:** `2026-07-30` to `2026-07-30`

**Related Design Documents:**

- [Sprint 2 Approved Architecture Decisions](SPRINT_2_APPROVED_DECISIONS.md)
- [Phase 1 Sprint Sequence — Sprint 2](PHASE_1_SPRINT_SEQUENCE.md#sprint-2--achievement-engine)
- [Achievement System — Achievement definition architecture](ACHIEVEMENT_SYSTEM.md#5-achievement-definition-architecture)
- [Achievement System — Evaluation and event relationships](ACHIEVEMENT_SYSTEM.md#7-evaluation-and-event-relationships)
- [Achievement System — XP architecture](ACHIEVEMENT_SYSTEM.md#9-xp-architecture)
- [Achievement System — Levels](ACHIEVEMENT_SYSTEM.md#12-levels)
- [Achievement System — Corrections, revocation, and appeals](ACHIEVEMENT_SYSTEM.md#21-corrections-revocation-and-appeals)
- [Event Model — Derived events and loops](EVENT_MODEL.md#6-derived-events-and-loops)
- [Points and XP — Level curve](POINTS_AND_XP.md#3-level-curve)

---

## Scope

Sprint 2 was initially stopped at its design entry gate. It resumed after the correction, replay, catalogue, and reduced Phase 1 scope decisions were approved and recorded in `SPRINT_2_APPROVED_DECISIONS.md`.

Implemented a disabled-by-default shadow achievement engine over the Sprint 1 `workout.completed` source: Catalogue Version 1 with 24 reviewed workout achievements, typed deterministic rules, effective-time and verification filtering, append-only achievement/badge awards, integer lifetime-XP effects, append-only correction revocations and equal-and-opposite XP reversals, reviewed level thresholds, disposable progress projections, stable checksums, bounded-page full replay, deterministic IDs/keys, restart idempotency, and runtime composition after successful event capture. Read APIs, notifications, and UI remain disabled and absent, so outcomes are invisible.

Explicitly excluded prestige, seasons, points/spending, marketplace behavior, cosmetic entitlements, trading, gifting, guilds, leaderboards, loot/random rewards, premium rewards, snapshots, checkpoints, and advanced replay optimization. Non-workout achievements remain deferred until their authoritative domain event adapters exist.

## Files Modified

- `server.js`
- `src/gamification/eventTypes.js`
- `src/gamification/validators.js`
- `docs/gamification/IMPLEMENTATION_LOG.md`

## New Files

- `data/gamification/achievements.json`
- `data/gamification/levels.json`
- `docs/gamification/SPRINT_2_APPROVED_DECISIONS.md`
- `src/gamification/achievementEvaluator.js`
- `src/gamification/achievementService.js`
- `src/gamification/levelService.js`
- `src/gamification/policyService.js`
- `src/gamification/projectionService.js`
- `src/gamification/streakProjector.js`
- `src/repositories/gamificationAwardStore.js`
- `src/repositories/gamificationLedgerStore.js`
- `src/repositories/gamificationProjectionStore.js`
- `test/gamification-achievement-engine.test.js`

## Database / Storage Changes

When event capture and evaluation are both explicitly enabled, Sprint 2 adds `gamification/awards.json`, `gamification/xp-ledger.json`, and `gamification/projections.json` beneath `POCKET_PT_DATA_DIR`. Awards/revocations and XP effects/reversals are append-only and uniquely keyed. Projections are disposable atomic replacements and may be deleted and recreated through full event replay. No snapshot or evaluation-checkpoint store was added.

The existing event store accepts the versioned `workout.revoked` compensating contract. It references the immutable original event, retains an allow-listed correction reason, and never edits or deletes source evidence.

## API Changes

None. No read, event-ingestion, award, correction, or administrative endpoint was added.

## UI Changes

None. Read and notification flags remain off and Sprint 2 outcomes are invisible.

## Architecture Decisions Applied

- Current domain commits and the Sprint 1 immutable event stream remain authoritative; evaluation is composed only after successful event capture and remains isolated by the existing post-commit adapter boundary.
- `GAMIFICATION_EVALUATION` remains false by default and requires event capture to be enabled. Startup replay failure is logged with a safe code and does not prevent the existing application from starting.
- Definitions select exact event/schema and verification contracts at event occurrence time. Rule evaluation is bounded, declarative, and rejects unknown operators or unsafe thresholds; it executes no dynamic code.
- Award, revocation, XP, and reversal keys are deterministic. Repeated live delivery, restart, and replay append no duplicate value.
- Corrections append a `workout.revoked` event, award revocation, and equal-and-opposite XP reversal. Original events and outcomes remain intact.
- Projection deletion followed by complete bounded-page replay rebuilds progress, active/revoked state, XP, current level, highest historical level, and the same deterministic checksum without snapshots or checkpoints.
- Catalogue Version 1 contains only achievements supported by the sole authoritative Sprint 1 event. New domain families can be added through versioned event contracts and definitions without changing evaluator/store architecture.

## Tests Added

- `test/gamification-achievement-engine.test.js` — validates the 24-item catalogue and reviewed 50-level curve; rejects unsafe definitions; covers count, sum, distinct-count, AND, OR, percentage-improvement, streak, effective interval, verification, hidden, and tier behavior; proves occurrence-order determinism, award/XP replay idempotency, projection deletion/rebuild parity, append-only correction/reversal conservation, revoked projections, bounded multi-page replay, and exact level boundaries.
- Existing Sprint 1 tests additionally cover disabled flags, immutable/deduplicated event persistence, safe validation/quarantine, authoritative post-commit capture, and domain-success isolation.

## Validation

- `node --test test/gamification-achievement-engine.test.js test/gamification-event-infrastructure.test.js test/gamification-session-integration.test.js` — passed: 15 tests, 0 failures.
- `npm run lint` — passed: repository self-check completed successfully.
- `npm test` — passed: 716 tests, 0 failures.
- `git diff --check` — passed: no whitespace errors.

## Risks

- File repositories follow the current single-process `POCKET_PT_DATA_DIR` convention and are not multi-process transaction coordinators. Unique keys make partial evaluation retry-safe, but deployments must retain one writer per data directory.
- Full replay is intentionally simple and scans the complete event stream in bounded pages. This is the approved Phase 1 tradeoff; snapshots or checkpoints should be considered only after measured replay performance requires them.
- Catalogue Version 1 is workout-only because Sprint 1 exposes only `workout.completed`. This avoids browser-authored or fabricated evidence but temporarily limits catalogue breadth.
- UTC is the deterministic fallback for workout streaks because no authoritative timezone-history adapter exists yet. User-local streak definitions must remain unpublished until that source contract is added and tested.
- Evaluation is synchronous after capture in the current single-process runtime. Domain success remains isolated by the post-commit adapter, but replay latency should be monitored before enabling evaluation for a large event history.

## Deferred Work

- Add walking, running, trail, daily-step, nutrition, AI-coach, and profile achievements only after their authoritative services emit approved, minimized, versioned events.
- User-local timezone history, grace-day/recovery streak policies, and corresponding DST/timezone-change fixtures remain deferred until an authoritative timezone contract exists. Catalogue V1 publishes UTC workout streaks only.
- Sprint 3 or the next approved increment should review base-action XP policy, caps, overlap groups, and expanded ledger behavior. Sprint 2 issues only fixed achievement XP and implements no points economy.
- Read APIs, notifications, frontend presentation, catalogue/badge artwork, administrative correction commands, backfill, reconciliation tooling, rollout analytics, and additional event sources remain assigned to later sprints.
- All explicit future-phase exclusions in the approved Sprint 2 decision record remain absent.

## Rollback

1. Set `GAMIFICATION_EVALUATION=false` and restart the current Node process. Leave event capture enabled if continued Sprint 1 shadow evidence is desired; otherwise disable `GAMIFICATION_SOURCE_WORKOUT_COMPLETED` and then `GAMIFICATION_EVENT_CAPTURE`.
2. Revert the Sprint 2 implementation commit. Do not delete or hand-edit `events.json`, `awards.json`, or `xp-ledger.json`; retain them as dormant immutable audit history.
3. `projections.json` may be deleted because it is disposable. If Sprint 2 is restored, enable evaluation and allow full replay to rebuild it.
4. Keep read APIs and notifications disabled throughout rollback; no client contract change is required.
5. Run `node --test test/gamification-event-infrastructure.test.js test/gamification-session-integration.test.js`, `npm run lint`, and `npm test` to verify the Sprint 1 foundation and existing domain workflows.

## Acceptance Criteria

- [x] Approved Sprint 2 architecture decisions are recorded and applied without reopening or redesigning them.
- [x] Catalogue Version 1 is bounded, versioned, published, validated, and uses only authoritative Sprint 1 evidence.
- [x] Evaluation and progress are deterministic, effective-time aware, verification aware, bounded, and disabled by default.
- [x] Awards and badge references trace to exact definitions and source evidence; XP uses integer append-only effects.
- [x] Corrections preserve immutable history and append award revocations plus equal-and-opposite XP reversals.
- [x] Duplicate live delivery, restart, and full replay add no award or XP value.
- [x] Projection deletion and two clean replays produce identical checksums without snapshots or checkpoints.
- [x] Current and historical levels derive from the reviewed Version 1 threshold table.
- [x] Read APIs, notifications, UI, and all named future-phase systems remain absent or disabled.
- [x] Targeted, lint, full-suite, and whitespace validation pass.
- [x] Existing domain workflows remain stable with evaluation disabled or unavailable.
- [x] Rollback instructions preserve immutable audit records and restore Sprint 1 behavior.
- [x] This implementation-log entry matches the final diff and validation results.
---

# Sprint 3 — XP & Level Policy

**Sprint Number:** 3
**Objective:** Add deterministic, versioned base-action XP, caps, overlap decisions, strict append-only accounting, correction reversals, and replay-stable level progression without changing Sprint 2 event contracts.
**Status:** `Complete`
**Dates:** `2026-07-30` to `2026-07-30`

## Executive Summary

Sprint 3 adds a data-driven XP policy layer to the existing achievement replay. Policy Version `1.0.0` awards the approved 100 base XP for a verified `workout.completed`, capped at 100 XP per UTC day for both its workout category and exact source. Every evaluated source receives an immutable ledger decision, including zero-delta entries with an explicit cap or overlap reason. Achievement XP remains unchanged and additive. Full replay derives lifetime XP and levels by summing the immutable ledger, and corrections append exact base-XP and achievement-XP reversals.

The engine accepts future event sources, categories, effective policy versions, caps, and overlap groups through validated policy data. No new event contract, event payload, endpoint, UI, notification, snapshot, checkpoint, or replay shortcut was introduced. All behavior remains behind the existing disabled-by-default event-capture and evaluation flags.

## Architecture Decisions Applied

- The Sprint 2 event model and immutable source log remain unchanged. Only verified, registered source events can enter runtime through the existing validator; the generic XP evaluator does not expand ingestion authority.
- Policy selection uses canonical event `occurredAt` against non-overlapping effective intervals. UTC is the only Phase 1 day boundary, preventing machine-locale and replay-time drift.
- XP amounts, category caps, source caps, overlap membership, overlap identity, and winner strategy are configuration. Business logic contains no reward amount.
- Overlap Version 1 uses the earliest `(occurredAt, eventId)` event for a subject and configured activity identity. Later duplicates remain represented by zero-delta `overlap_group_skipped` entries.
- Caps issue whole fixed awards or a zero-delta decision; they never partially issue a base award. Source caps are evaluated independently before category caps, and counters reset on UTC date boundaries.
- Ledger effect keys and entry IDs are deterministic. Duplicate identical appends are no-ops; conflicting reuse is rejected. Reversals must be unique, equal-and-opposite, same-subject, same-kind, and linked to a non-reversal original.
- Existing Sprint 2 ledger files remain readable. New writes add the expanded `reason` field, while legacy achievement entries are accepted during load for backward compatibility.
- Level projection continues to use cumulative lifetime XP and the reviewed Version 1 50-level threshold document. Projection deletion followed by complete bounded-page replay remains authoritative.

## Files Added

- `data/gamification/xp-policy.json` — published Version 1 base-action policy, UTC category/source caps, and overlap policy.
- `src/gamification/xpPolicyService.js` — policy validation, effective-version resolution, deterministic ordering, cap accounting, overlap decisions, and ledger decision generation.
- `test/gamification-xp-policy.test.js` — Sprint 3 policy, ledger, correction, replay, and level validation.

## Files Modified

- `server.js` — validates and composes the XP policy service only when the existing evaluation feature is enabled.
- `src/gamification/achievementService.js` — appends deterministic base-XP decisions and corrections during full replay and supplies explicit reasons for achievement ledger effects.
- `src/repositories/gamificationLedgerStore.js` — validates expanded entries, immutable duplicate identity, and correction linkage while retaining legacy-file compatibility.
- `docs/gamification/IMPLEMENTATION_LOG.md` — records the completed Sprint 3 implementation and operational guidance.

## Tests Added

`test/gamification-xp-policy.test.js` covers configured base awards; independent source and category daily caps; UTC reset boundaries; overlap groups; stable ordering; effective policy versions; malformed and overlapping policy rejection; provisional and unknown source exclusion; required ledger fields; duplicate/conflicting effects; invalid, recursive, unequal, and duplicate reversals; multiple replay cycles; projection deletion/rebuild; correction conservation; level recalculation; exact level boundaries; and invalid level curves.

Existing Sprint 1 and Sprint 2 suites continue to validate invalid event quarantine, unchanged event contracts, disabled flags, post-commit failure isolation, achievement determinism, revocations, restart persistence, and bounded full replay.

## Validation Results

- `node --test test/gamification-xp-policy.test.js test/gamification-achievement-engine.test.js` — passed: 13 tests, 0 failures.
- `npm run lint` — passed: repository self-check completed successfully.
- `npm test` — passed: see committed delivery report.
- `git diff --check` — passed: no whitespace errors.
- `git status --short --branch` — reviewed before the Sprint 3 commit.

## Risks

- Phase 1 file stores retain the approved single-writer limitation. Logical uniqueness and atomic replacement are not a substitute for a multi-process transaction coordinator.
- UTC daily boundaries are deterministic but not user-local. A versioned timezone-history source is required before publishing local-day caps.
- Overlap quality depends on authoritative adapters sharing the configured identity. New activity sources must document and test a stable cross-source identity before joining an overlap group.
- Whole-award caps can leave unused room below a cap. This is intentional and deterministic; changing to partial awards would require a future policy version and economy review.
- Full replay remains intentionally linear and unoptimized. Growth should be measured before proposing any separately approved snapshot/checkpoint design.

## Deferred Work

- Walking, running, trail, nutrition, and AI-coach runtime awards remain deferred until their authoritative adapters and unchanged-event-model follow-on contracts are approved. The policy engine is ready for those configured sources.
- User-local daily caps, weekly/lifetime caps, seasonal XP, points, read APIs, notifications, UI, operator tooling, reconciliation reports, and policy simulation remain out of scope.
- Policy migration/governance workflows and administrative publication signatures should be designed before non-development policy updates are delegated.

## Rollback Strategy

1. Set `GAMIFICATION_EVALUATION=false` and restart. Existing workout completion remains authoritative and unaffected; optionally retain Sprint 1 event capture.
2. Revert the single Sprint 3 commit. Do not delete or edit event, award, or XP ledger history. Preserve Version 1 base entries as dormant audit evidence.
3. Projections are disposable and may be removed. Restoring Sprint 2 and replaying rebuilds its achievement/level view from retained compatible records.
4. If base-XP entries were produced in an enabled environment, do not expose a Sprint 2 projection until an operator-approved reconciliation confirms the intended rollback accounting boundary.
5. Run the Sprint 1/Sprint 2 gamification tests, `npm run lint`, and `npm test` before completing rollback.

## Recommended Next Sprint

Begin a controlled read-model and observability sprint: reconciliation reports, policy simulation against de-identified event fixtures, cap/overlap metrics, and authenticated internal inspection of immutable outcomes. Keep member-facing APIs, notifications, and UI disabled until economy and privacy review approves exposure.

## Acceptance Criteria

- [x] Base XP is policy-configured, versioned, integer-only, and selected by event occurrence time.
- [x] Category daily caps, exact-source daily caps, and overlap groups create explicit immutable decisions.
- [x] Ledger effects contain source event, delta, policy version, reason, timestamp, and correction linkage.
- [x] Corrections use unique equal-and-opposite append-only reversals; original entries never change.
- [x] Lifetime XP and reviewed levels reproduce after projection deletion and repeated full replay.
- [x] Existing achievements, revocations, event contracts, feature defaults, and workout failure isolation remain compatible.
- [x] Invalid policies, events, ledger entries, conflicts, and reversal linkages are covered by validation and tests.
- [x] No UI, notifications, snapshots, checkpoints, or replay shortcuts were added.
