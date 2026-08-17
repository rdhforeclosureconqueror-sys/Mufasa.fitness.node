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
