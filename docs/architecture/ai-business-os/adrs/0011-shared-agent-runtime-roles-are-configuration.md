# ADR 0011 — Shared Agent Runtime: Roles Are Configuration, Not Separate Brains

**Status:** Accepted for Phase 5 certification  
**Date:** 2026-09-23

## Context

Phases 1–4 provide constitutional governance, advisory cognition, bounded organizational context, and governed planning/execution. Future organizational roles need different missions, views, capabilities, tools, ceilings, and reporting, but separate role-specific runtimes would duplicate the Brain, fragment controls, and create bypass paths.

## Decision

Implement one domain-neutral Shared Agent Runtime. Durable `AgentIdentity`, reusable `RoleConfiguration`, structured `Mission`, the generalized Phase 4 `Goal`, and execution-specific `AgentRun` remain separate contracts. Identity references a Phase 1 Actor and externally issued authority; neither a role nor an agent can mint authority. Runtime state is deterministic repository state, never model conversation state.

The runtime coordinates the canonical Phase 3 Context Engine, Phase 2 Cognitive Core, Phase 4 Execution Controller, and Phase 1 Constitutional Kernel. It calls neither providers nor adapters directly. Cognitive results and candidate plans remain advisory. Completion requires independent verification and evidence. Run-wide accounting treats unknown cost as unresolved, and cumulative risk/cost can pause, escalate, or stop otherwise permitted individual actions.

Lifecycle changes use the Phase 1 Event/Outbox seam. Resume rebuilds context and traverses current governance and execution controls again. Reports retain references and safe reasoning summaries, not hidden chain-of-thought. Phase 5 role IDs are limited to synthetic certification configurations.

## Consequences

Future roles can specialize by configuration without acquiring a separate brain or implicit permission. Replay, failure taxonomy, FIRST FAILURE, escalation, stop, completion and reporting share one implementation. The runtime carries more explicit records and dependency injection, but its behavior is inspectable and testable.

Certification remains in-memory and single-process. Human architectural acceptance, production persistence, distributed orchestration, real business roles, economics, experiments, permanent learning, and commercial activity remain outside this decision and outside Phase 5.
