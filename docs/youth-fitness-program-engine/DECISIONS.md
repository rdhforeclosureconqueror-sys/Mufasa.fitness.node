# Youth Fitness Program Engine Decision Log

Decisions in this file are architectural constraints. Reversal requires an explicit dated decision entry explaining the migration and safety impact; it must not happen silently.

## Accepted decisions

### YF-ADR-001 — Program-first domain

- **Status:** Accepted
- **Decision:** `YouthFitnessProgram` is the primary aggregate. Sessions are planned and finalized only within a program phase and week; no public youth `generateWorkout()` concept is authoritative.
- **Reason:** The product promises a stable developmental journey, not disconnected daily workouts.

### YF-ADR-002 — Three-system boundary

- **Status:** Accepted
- **Decision:** Pocket PT owns fitness delivery/tracking; the Youth Fitness Brain owns constrained programming decisions; The Leader Within owns leadership curriculum, cohorts, reflections, and facilitator workflows.
- **Integration boundary:** The Leader Within receives only an opaque assignment reference and minimal completion status/event.

### YF-ADR-003 — Reuse canonical Pocket PT identity

- **Status:** Accepted
- **Decision:** Do not add a second participant master. Youth fitness records attach server-side to the authenticated Pocket PT subject through an opaque participant reference resolver.
- **Security consequence:** Browser-supplied ownership IDs are never authoritative.

### YF-ADR-004 — Separate youth engine namespace

- **Status:** Accepted
- **Decision:** Add youth-specific code under `src/youth-fitness/` (with internal modules for profiles, rules/evidence, registries, planning, readiness, memory, adaptation, safety, and progress). Reuse lower-level services through adapters; do not mutate the current general/adult program engine into a mixed policy engine.
- **Reason:** Current templates allow adult goals, advanced levels, barbells, and prescriptions that violate youth hard boundaries.

### YF-ADR-005 — Approved activity universe

- **Status:** Accepted
- **Decision:** Youth planners may select only active, administrator-approved, versioned exercises and movement games. Generated names or exercises are forbidden.

### YF-ADR-006 — Provenance from inception

- **Status:** Accepted
- **Decision:** Major rules carry one of `EVIDENCE_CONSENSUS`, `VALIDATED_TEST_PROTOCOL`, `RESEARCH_SUPPORTED`, `CONSERVATIVE_PROGRAM_POLICY`, or `COACH_CONFIGURABLE`, plus evidence links and review metadata.
- **Claim boundary:** Conservative policy must never be presented as scientific consensus.

### YF-ADR-007 — Stable roadmap, adaptive execution

- **Status:** Accepted
- **Decision:** Program phases, weekly objectives, and broad session objectives remain stable; eligible activity variations and dose are finalized using readiness, recent stress, results, and competency.

### YF-ADR-008 — Safety validator is a final veto

- **Status:** Accepted
- **Decision:** A youth session cannot leave the engine unless the final validator accepts age, approvals, level eligibility, workload, impact, recent stress, readiness/pain handling, instructions, stop rules, balance, and recovery. Repeated generation failure escalates; it never returns an invalid session.

### YF-ADR-009 — Separate outcome domains

- **Status:** Accepted
- **Decision:** Performance, movement competency, consistency, and engagement remain separate. Version 1 has no global proprietary fitness score and movement observation makes no anatomical or medical diagnosis.

### YF-ADR-010 — Existing program engine remains non-youth

- **Status:** Accepted
- **Decision:** `src/program-engine/` remains the current general program authority until a deliberate integration phase. Its deterministic IDs, scheduling, persistence, analytics, and exercise-intelligence relationships are candidates for adapter reuse, but its templates and progression are not youth policy.

### YF-ADR-011 — Incremental persistence transition

- **Status:** Accepted
- **Decision:** Phase 0 adds no tables or runtime storage. Before production youth writes, define repository interfaces compatible with the current JSON `userStore`, then select durable production storage and migration/rollback procedures. Do not embed a growing longitudinal youth aggregate directly into a second identity record.

### YF-ADR-012 — No Phase 0 production changes

- **Status:** Accepted
- **Decision:** Phase 0 is documentation and audit only. Evidence models begin in Phase 1; registries begin in Phase 2; profile and planning code follow the phase ledger.

### YF-ADR-013 — Mandatory dual-axis evidence labeling

- **Status:** Accepted (Phase 1)
- **Decision:** Important youth fitness rules require an evidence class and a separate claim strength. Conservative program policy is always labeled `PROGRAM_POLICY` and must not be presented as scientific certainty.

### YF-ADR-014 — Bidirectional source claim boundaries

- **Status:** Accepted (Phase 1)
- **Decision:** Every evidence source must state both what it `supports` and what it `does_not_establish`. A rule link cannot erase the negative boundary or imply causal, diagnostic, universal-threshold, or guaranteed-result support.

### YF-ADR-015 — Reference fixtures before production schema

- **Status:** Accepted (Phase 1)
- **Decision:** Phase 1 uses validated, immutable code fixtures for rules and evidence. This is safer than selecting a production schema before the repository's persistence, audit, retention, and rollback strategy is decided. A later migration must preserve IDs, versions, links, and review metadata.

### YF-ADR-016 — Phase 1 has no planning authority

- **Status:** Accepted (Phase 1)
- **Decision:** Phase 1 builds documentation, models, provenance, seed references, and validation only. It does not build or expose program, workout, or session generation.

### YF-ADR-017 — Unified validated activity graph, separate projections

- **Status:** Accepted (Phase 2)
- **Decision:** Exercises and games share one validated relationship graph and metadata contract, while consumers receive distinct exercise and game projections. A game must explicitly carry the `MOVEMENT_GAME` family.
- **Reason:** Shared validation prevents divergent safety metadata, while first-class projections prevent games from becoming arbitrary workout text.

### YF-ADR-018 — Approval lookup fails closed

- **Status:** Accepted (Phase 2)
- **Decision:** Future youth consumers must use the approved lookup boundary, not raw catalog membership. Missing, draft, retired, invalid, or unknown activities are unavailable.
- **Persistence boundary:** Phase 2 uses immutable fixtures. A production admin editor remains deferred pending authorization, audit, versioning, and rollback design.

### YF-ADR-019 — Canonical planner input and identity boundary

- **Status:** Accepted (Phase 3)
- **Decision:** A successfully resolved Youth Fitness Profile is the canonical input to the future Program Planner; raw browser profile fields are not. The server must resolve the authenticated Pocket PT participant to an opaque `participant_ref`, and Phase 3 creates no duplicate identity or persistence schema.

### YF-ADR-020 — Presentation age is not competency

- **Status:** Accepted (Phase 3)
- **Decision:** Age determines presentation band only. Without supporting competency evidence, all participants remain `FOUNDATION`; in particular, an inexperienced 17-year-old remains Foundation. A requested over-level is conservatively downgraded with a warning rather than inferred from age.

### YF-ADR-021 — Controlled, balanced profile semantics

- **Status:** Accepted (Phase 3)
- **Decision:** Controlled goals may influence future emphasis but cannot override balanced safety. Movement needs are development/training categories, never diagnoses. Readiness is a non-diagnostic training snapshot, not medical screening; reported pain triggers a safety flag and coach review without interpretation.

### YF-ADR-022 — Neutral exclusion-aware consistency

- **Status:** Accepted (Phase 3)
- **Decision:** Consistency uses eligible completed divided by eligible scheduled, keeps exclusions separate, returns no percentage for a zero denominator, and applies no failure, shame, or moralizing label.

### YF-ADR-023 — Phase 3 is profile state only

- **Status:** Accepted (Phase 3)
- **Decision:** Phase 3 provides enums, placeholders, deterministic normalization, warnings, statuses, and structured fail-closed validation. It creates no program, workout, session, UI, production persistence, AI call, or Leader Within integration.

### YF-ADR-024 — Roadmap before activity selection

- **Status:** Accepted (Phase 4)
- **Decision:** Phase 4 creates deterministic phase, week, and session-slot architecture before detailed sessions. These records are objectives and constraints, not workouts. They contain movement-family and activity-type targets only; Phase 5 must select specific approved exercises and games through the Phase 2 authority.

### YF-ADR-025 — Balanced emphasis and presentation

- **Status:** Accepted (Phase 4)
- **Decision:** Controlled goals influence program emphasis but never remove balanced development, movement competency, or recovery. Age changes language/presentation only and never upgrades training level. Consistency expectations use exclusion-aware, non-shaming language.

### YF-ADR-026 — Draft, metadata-only deterministic planning

- **Status:** Accepted (Phase 4)
- **Decision:** Planned programs default to `DRAFT`; baseline and reassessment schedules are metadata and do not execute assessments or start sessions. Profile safety flags remain visible. Phase 4 makes no AI calls, and output validation fails closed on structural gaps, unknown targets, workouts, or specific activity identifiers.

### YF-ADR-027 — Program-bound approved activity blueprints

- **Status:** Accepted (Phase 5)
- **Decision:** The Session Planner consumes an exact Program Planner session slot and produces an executable blueprint inside that program hierarchy, never an orphan workout. It may select only available, admin-approved Phase 2 records and can never invent an exercise or game.

### YF-ADR-028 — Local integrity now, independent safety veto next

- **Status:** Accepted (Phase 5)
- **Decision:** Phase 5 validates identity, structure, duration, registry provenance, level, equipment, required coaching/safety metadata, prescription bounds, prohibited language, and claims. This fail-closed integrity check does not replace the independent Phase 6 final safety veto.

### YF-ADR-029 — Non-diagnostic readiness and conservative stress hooks

- **Status:** Accepted (Phase 5)
- **Decision:** Reported pain creates a safety flag, supervising-adult review note, and `COACH_REVIEW_REQUIRED` status without diagnosis. Recent high impact removes avoidable moderate/high-impact candidates. This is an early conservative hook, not full adaptation or training memory.

### YF-ADR-030 — Deterministic sessions without AI

- **Status:** Accepted (Phase 5)
- **Decision:** Session selection, prescriptions, duration allocation, presentation, and warnings are deterministic. Phase 5 makes no OpenAI, coach-AI, LLM, generated-workout, or free-text exercise calls.
