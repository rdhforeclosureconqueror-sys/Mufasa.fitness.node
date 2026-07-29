# Legacy Integration Playbook — Master Index

**Status:** planning complete; implementation not started
**Authority:** the current Mufasa Node application is always the production source of truth. `public/new/` is an immutable source library, never a runtime, deployment target, package boundary, or alternate backend.

## Purpose and decision record

The discovery audit found reusable coaching prose, workout concepts, progression chains, gamification seeds, and small MediaPipe-derived research datasets alongside a broken legacy Python/Express application. The permanent decision is to extract **assets**, not revive that application. Never import its routers, SQLite service, Firebase stub, Docker files, dependency freezes, HTML, or Python batch scripts into production.

Read [the yoga system audit](../../YOGA_SYSTEM_AUDIT.md) for evidence, counts, security findings, and the original architecture trace. The task referenced `LEGACY_ASSET_INTEGRATION_ANALYSIS.md`, but that file is not present in this checkout as of 2026-07-29; add a link here if it is restored. This playbook is independently actionable and does not invent findings from the missing report.

## Quick answer: what, where, and when

| Order | Domain | Value extracted | Production destination | Gate |
|---:|---|---|---|---|
| 0 | Governance | Provenance, licenses, review ownership, canonical IDs | `docs/`, versioned data schemas, review workflow | Owner/legal/professional decisions |
| 1 | Gamification | Actions, badges, criteria, tiers | New `src/gamification/`, persistence, authenticated APIs, existing feature pages | Event contract and migration approved |
| 2 | Workout intelligence | Lego blocks, movement taxonomy, OHSA observations, universal cues | Existing `src/services/generatedWorkoutService.js`, exercise-generation sources/rules, workout runtimes | Trainer-reviewed normalized rules |
| 3A | Yoga content | Pose names/content concepts; research data only as evidence | New current-platform yoga content/API/UI | Licensed reviewed content and canonical taxonomy |
| 3B | Gymnastics content | Foundations and high-level progression edges | New current-platform skill graph/API/UI | Qualified gymnastics safety review |
| Later | Movement intelligence | Normalized measurements and approved cue rules | Existing MoveNet capability architecture and shared cue service | Representative data and golden tests |

Phases are sequential at their **contracts**, not necessarily at every UI task: Phase 2 may start only after Phase 1's event vocabulary is stable; Phase 3 uses Phase 1 achievements and Phase 2 movement/cue IDs. Pose scoring is not part of Phase 3 content launch and remains separately gated.

## Document map

| Document | Use it when | Owns |
|---|---|---|
| [01 Legacy Asset Registry](01_LEGACY_ASSET_REGISTRY.md) | Looking up any legacy asset | Source→destination mapping, phase, effort, review/status |
| [02 Phase 1 — Gamification](02_PHASE_1_GAMIFICATION.md) | Building the first integration | Event ledger, points, badges, tiers, streaks, migration/tests/rollback |
| [03 Phase 2 — Workout Intelligence](03_PHASE_2_WORKOUT_INTELLIGENCE.md) | Extending deterministic workouts | Block assembly, ordering, timing, substitutions, progression, observations |
| [04 Phase 3 — Yoga and Gymnastics](04_PHASE_3_YOGA_AND_GYMNASTICS.md) | Adding content domains | Libraries, curricula, skill graphs, safety and platform integration |
| [05 Coaching Cue Library](05_COACHING_CUE_LIBRARY.md) | Any feature emits coaching | Shared schema, resolution, approval, reuse boundaries |
| [06 Movement Reference Data](06_MOVEMENT_REFERENCE_DATA.md) | Evaluating CSV/landmark uses | Capability matrix and data prerequisites |
| [07 Future Ideas](07_FUTURE_IDEAS.md) | Capturing non-roadmap ideas | Explicitly unscheduled parking lot |

## Dependency graph

```text
Governance/provenance + canonical ID policy
             |
             v
Phase 1 event contract -> achievement engine -> all feature emitters
             |
             v
Phase 2 movement/block schemas -> shared cue IDs -> deterministic builder
             |
             +--------------------+
             v                    v
Phase 3 Yoga content         Phase 3 Gymnastics content
             |                    |
             +---- achievement + workout integration ----+
                                                          |
                                          separately gated movement assessment
```

## Permanent implementation rules

1. Preserve `public/new/` byte-for-byte until an archive manifest and owner-approved retention decision exist.
2. Copy and normalize through idempotent import tools; production must never read legacy paths.
3. Use current authentication, authorization, response envelopes, persistence configuration, security middleware, frontend conventions, and test harness.
4. No raw SQL interpolation, separate Express server, separate Firebase client, legacy SQLite database, Python subprocess, or Ma'at dependency is introduced by this plan.
5. Content and rule records carry provenance, schema version, content version, approval status, reviewer, and effective dates.
6. Generated artifacts are reproducible from reviewed canonical sources; runtime artifacts are not hand-edited.
7. Movement output is an observation, never diagnosis. Unusable confidence returns “cannot assess.”
8. Gamification rewards safe consistency and verified completion—not pain, extreme range, dangerous difficulty, or sensor confidence alone.
9. Every phase ships behind a default-off capability flag with a reversible migration and predeclared acceptance gates.

## Completion status

| Deliverable | Status |
|---|---|
| Discovery inventory and dataset audit | Complete in `YOGA_SYSTEM_AUDIT.md` |
| Legacy application disposition | Complete: do not revive |
| Permanent asset registry | Complete as a planning baseline |
| Phase 1 blueprint | Complete; not implemented |
| Phase 2 blueprint | Complete; not implemented |
| Phase 3 blueprint | Complete; not implemented |
| Shared cue and movement-data designs | Complete; not implemented |
| Owner/professional/legal decisions | Blocked pending owners; see each phase's gates |
| Production code, migrations, normalized data, UI | Not started by design |

## How to begin later

Start with the Phase 1 “preflight decisions,” create an implementation issue for each work package, verify cited current files have not drifted, and update the registry status in the same pull request as each delivered asset. If architecture has changed, revise destinations—never force old paths into the current system.
