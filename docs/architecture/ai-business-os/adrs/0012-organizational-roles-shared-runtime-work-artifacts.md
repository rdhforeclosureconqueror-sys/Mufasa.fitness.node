# ADR 0012 — Organizational Roles Are Shared-Runtime Configurations Connected Through Governed Work and Artifacts

**Status:** Accepted for Phase 6 machine certification
**Date:** 2026-09-23

## Context

Phase 5 established one governed runtime. Phase 6 needs nine specialized organizational functions without nine brains, private truth stores, implicit authority, or a hard-coded Scout-to-Analyst-to-Sales pipeline. Direct agent calls would hide eligibility, authority, provenance, replay, failure, and dissent boundaries.

## Decision

A Role is versioned configuration for the Shared Agent Runtime. It declares missions, permitted context/memory/knowledge views, artifact inputs and outputs, capabilities, tools, authority/policy references, autonomy/risk/budget ceilings, reporting, escalation, and diagnostic expectations. A Role is neither an `AgentIdentity` nor an authority grant. A Mission states why an identity runs. Organizational Work is authoritative eligible activity. An Artifact is an attributable, versioned product of a run and is not automatically fact. A Handoff links completed Work evidence to separately eligible Work; it does not invoke a role. Authority remains in the Phase 1 Constitution.

The deterministic Organizational Coordinator may create and transition Work, test dependency eligibility and role compatibility, create assignments, register validated artifacts, emit lifecycle events, control idempotency, and expose lineage. It delegates all reasoning through an injected Shared Runtime seam. It may not reason, invoke a model/provider or tool, grant authority, approve human gates, or call roles directly.

A Manager Directive remains a governed proposal or bounded prioritization, never constitutional authority. A QA Verdict is an independent assessment against explicit criteria and evidence; Production cannot issue its own PASS. A Learning Proposal is a candidate for governance and knowledge-promotion processes; Learning cannot mutate policy, authority, prompts, procedures, capabilities, autonomy, production code, or validated knowledge.

Dependency direction is:

`Organizational Role Configuration -> Shared Agent Runtime -> Phase 3 Context -> Phase 2 Cognition -> Phase 4 Execution -> Phase 1 Constitution`

and:

`Objective -> Work eligibility/assignment -> Shared Runtime run -> attributable Artifact -> deterministic registration/event -> optional dependent Work`.

## Consequences

Role disagreement remains separate immutable artifacts. Some work can terminate, skip roles, or route backward because the coordinator follows data dependencies rather than a fixed pipeline. Context and organization filtering precede exposure. Knowing that a capability exists does not authorize its tools. Duplicate work execution is replay-controlled and artifact version conflicts are observable.

Phase 6 remains synthetic and single-process. It does not prove live prospecting, real customer contact, money movement, commercial fulfillment, distributed locking, durable production queues, human architectural acceptance, Phase 7 Brain Academy, or Phase 8 simulation.
