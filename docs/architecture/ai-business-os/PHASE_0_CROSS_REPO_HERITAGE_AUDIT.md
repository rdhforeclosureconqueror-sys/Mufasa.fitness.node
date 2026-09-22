# Phase 0 Heritage Audit — Cross-Repository Findings

**Prepared for:** AI Business OS Phase 0  
**Headquarters:** Mufasa.fitness.node  
**Repositories inspected:** Mufasa.fitness.node, garvey, universal_pilot_project  
**Purpose:** Supply cross-repository evidence that a single-repository coding agent may not be able to inspect directly.

## Executive conclusion

Phase 0 should **not** begin from a blank architecture. The three repositories already contain three different classes of proven assets:

- **Universal Pilot** is the strongest source for the constitutional/kernel and governed orchestration patterns.
- **Mufasa Fit Node** is the strongest source for readiness, FIRST FAILURE diagnostics, machine-vs-human acceptance boundaries, and future Fitness capability/domain adapters.
- **Garvey** is the strongest source for adaptive evidence, confidence/contradiction patterns, structured assessment/learning progression, content/capability registries, and a useful precursor to the future Learning/Knowledge/Brain Academy architecture.

The recommendation is to **generalize patterns into the AI Business OS headquarters rather than physically merge the three applications**. Preserve each domain system as a domain implementation/integration unless a component is demonstrably generic.

## Classification summary

### Universal Pilot — GENERALIZE + REUSE / REIMPLEMENT FROM PROVEN PATTERN

High-value reusable architecture:
- identity/auth and role authorization patterns;
- PolicyAuthorizer / policy-first execution;
- governed AI orchestration gateway;
- structured action envelopes rather than unrestricted AI writes;
- audit models/logging and AI activity/command logging;
- policy versions/configuration;
- role-session traceability;
- durable outbox model and webhook retry/idempotency concepts;
- workflow/state models and workflow events;
- module registry + module loader;
- verification/system-verification models;
- BotOps control-plane concepts (settings, commands, reports, triggers, inbound logs);
- escalation service;
- lead/opportunity ingestion, dedupe, scoring and lead-to-case automation patterns;
- context/council doctrine patterns already documented in prior architecture.

Evidence locations include:
- `docs/phase8_autonomous_system_builder_architecture.md`
- `docs/platform_capability_report.md`
- `app/services/ai_orchestration_service.py`
- `app/services/auth_service.py`
- `app/services/module_loader_service.py`
- `app/services/module_registry_service.py`
- `app/services/escalation_service.py`
- `app/services/lead_intelligence_service.py`
- `app/models/audit_logs.py`
- `app/models/policy_versions.py`
- `app/models/outbox_queue.py`
- `app/models/workflow.py`
- `app/models/workflow_events.py`
- `app/models/system_verification.py`
- `app/models/botops.py`

Do **not** blindly copy the foreclosure/case/property-specific models into the Business OS. Generalize Case into Work/WorkItem where appropriate, Lead into Opportunity where appropriate, and keep foreclosure/property domain logic in Real Estate.

The strongest doctrine to preserve is: **AI proposes/structures actions; policy authorizes; controlled domain services execute; critical actions are audited. AI does not bypass the kernel or write production state arbitrarily.**

### Mufasa Fit Node — REUSE / GENERALIZE + REUSE

The headquarters already has a mature readiness discipline and multiple FIRST FAILURE implementations.

High-value reusable architecture:
- repository-root `AGENTS.md` readiness/Kanban development contract;
- `npm run readiness:update` and `npm run readiness:validate`;
- repository-backed machine evidence in `data/readiness/` with separate operational/human state;
- explicit prohibition on machine self-approval of visual/device/human acceptance;
- existing Admin First-Failure Debug surface;
- dependency-ordered diagnostics that mark downstream checks BLOCKED instead of generating false secondary failures;
- Motion Lab and Arena diagnostic patterns;
- existing capability/domain assets for future Fitness expansion;
- existing CI/workflow evidence patterns that correlate PR/commit/files with readiness evidence.

Evidence locations include:
- `AGENTS.md`
- `package.json`
- `data/readiness/development-cards.json`
- `data/readiness/development-evidence.json`
- `public/admin-first-failure.html`
- `public/admin-first-failure.js`
- `docs/review-handoffs/arena-first-failure-diagnostics-review.md`
- `docs/movement-capture-debug-v1.md`
- `docs/EXTRACTION_OS_POCKET_PT_V1.md`
- multiple `.github/workflows/*` readiness evidence updates.

Recommendation: **do not create a second readiness truth source for AI Business OS.** Extend/generalize this existing readiness architecture so AI Business OS phase diagnostics become composable modules in the eventual Control & Certification Panel.

A particularly valuable diagnostic rule already proven here is: **after the first failed dependency, dependent stages should be BLOCKED/NOT_RUN rather than falsely failing.**

### Garvey — GENERALIZE + REUSE / INTEGRATE

Garvey contains more reusable Brain-related thinking than a simple education-domain label suggests.

High-value patterns:
- Adaptive Learning V2 / “Diamond Brain” architecture planning;
- stable skill IDs, skill graphs, progression/remediation links and content manifests;
- structured evidence/recommendation records;
- confidence and contradiction/consistency fields in archetype engines;
- explicit separation between practice/client scoring and authoritative operational assessment;
- server-side/persistent assessment sessions, response evidence, recommendations and exposure tracking;
- assessment versioning and attribution;
- consent-aware assessment flows;
- development timeline/event concepts;
- phased conversion discipline with “do not proceed until” gates;
- content factory / schema / loader / validation patterns;
- parent/student projections as examples of permission/context-specific views of the same underlying information;
- preservation tests and additive validation philosophy.

Evidence locations include:
- `docs/adaptive-v2-phase-implementation-plan.md`
- `docs/assessment_system_existing_asset_audit.md`
- `docs/COMMUNITY_CONTRIBUTION_ENGINE_ARCHITECTURE_AUDIT.md`
- `docs/YOUTH_RITE_OF_PASSAGE_CANONICAL_DEVELOPMENT_ENGINE_ARCHITECTURE.md`
- `public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json`
- `curriculum-framework/schemas/skill-package.schema.json`
- `public/gamehub/skill-world/engine/skill-package-schema.js`
- assessment/session/evidence routes and stores referenced by the audits.

Do **not** copy educational scoring semantics into the Business OS. Instead generalize the architecture:
- skill graph → dependency/knowledge graph pattern;
- learner evidence → contextual evidence pattern;
- mastery/confidence → bounded knowledge confidence pattern;
- misconception/remediation → failure-pattern/corrective-action pattern;
- reassessment → re-evaluation after intervention;
- content manifest/schema validation → capability/knowledge package validation;
- parent/student projection → role/permission-specific context projection.

Garvey should remain an education domain system. Its reusable patterns should inform the generic Memory, Evidence, Knowledge, Learning, Context, and Brain Academy layers.

## Cross-repository architecture map

The emerging reusable foundation is:

**Constitution / Kernel:** strongest predecessor = Universal Pilot.  
Identity → Authority → Policy → State/Workflow → Evidence/Provenance → Audit → Events/Outbox → Retry/Idempotency → Verification/Kill Switches.

**Nervous System / Observability:** strongest predecessor = Mufasa Fit Node.  
Readiness cards → correlated implementation evidence → dependency-ordered diagnostics → FIRST FAILURE → blocked downstream stages → human-vs-machine acceptance → phase gate.

**Brain / Learning Evidence:** strongest precursor = Garvey plus Universal AI orchestration.  
Context-specific views → evidence → confidence/contradiction → recommendation → reassessment → learning progression; combined with governed model/orchestration boundaries from Universal Pilot.

**Domain bodies:** Mufasa Fitness, Garvey Education, Universal/Real Estate. Keep domain implementations modular and connected through future contracts rather than collapsing them into one codebase.

## Recommended Phase 1 extraction posture

Phase 1 should **define contracts and adapters before copying code**.

Promote concepts, not domain assumptions. For each candidate component, determine:
1. Is its contract genuinely domain-neutral?
2. Does Mufasa already have an equivalent canonical mechanism?
3. Can the predecessor remain the source while the Business OS integrates it?
4. If code is copied, what domain names/assumptions must be removed?
5. What regression test proves behavior remained intact?

The first generic contracts should cover Work, Actor, StateTransition, PolicyDecision, AuthorityGrant, EvidenceRecord, ProvenanceLink, EventEnvelope, AuditEvent, DiagnosticCheck, FirstFailure, Tool, Capability, MemoryRecord, KnowledgeClaim, and ModelInvocation.

## Key risks / controls

**Risk: duplicate truth sources.** Control: Mufasa readiness remains canonical for development/readiness; AI Business OS diagnostics extend it.

**Risk: domain leakage.** Control: do not rename foreclosure Case to generic Work mechanically; define a generic Work contract and adapter.

**Risk: false reuse.** Control: architecture documents are evidence of intent, not proof of production behavior. Code/tests must be inspected before classifying a component as direct REUSE.

**Risk: Garvey confidence semantics are mistaken for universal epistemic confidence.** Control: generalize the pattern, not its educational/archetype formulas.

**Risk: AI orchestration is treated as the final Brain.** Control: Universal Pilot's orchestration is a governed predecessor pattern, not proof that the new Memory/Context/Reflection/Metacognition/Learning architecture already exists.

**Risk: diagnostic UI built before diagnostic contract.** Control: preserve machine-readable readiness/evidence first; compose UI from it later.

**Risk: destructive extraction.** Control: no cross-repo moves in Phase 0/1. Prefer references/adapters/generalization and preserve predecessor behavior.

## Phase 0 gate recommendation

**CONDITIONAL GO toward Phase 1.**

The heritage evidence is strong enough to proceed with Architecture Contracts & Constitutional Kernel design, provided Phase 1 begins with contract definition and code-level verification of any component proposed for direct reuse.

The principal condition is that “documented architecture” must not be confused with “verified reusable implementation.” Before copying a Universal/Garvey component, inspect its implementation and tests and record evidence in the Mufasa readiness system.

## FIRST FAILURE

No cross-repository access failure occurred for the three target repositories.

The earliest program-level unresolved boundary is:

**VERIFIED_GENERIC_REUSE_CONTRACTS — NOT YET RUN**

This is expected Phase 1 work, not a Phase 0 defect.

Phase 0 has identified candidate assets and their architectural roles; Phase 1 must prove which implementations can be reused directly versus reimplemented/generalized.

## Phase 1 prerequisites

- Accept the three-layer split: Brain / Nervous System / Constitution.
- Keep Mufasa Fit Node as headquarters.
- Keep Mufasa readiness as the canonical phase evidence mechanism.
- Define generic contracts before code extraction.
- Verify implementation + tests for each direct-reuse candidate.
- Preserve domain repositories as integrations/bodies unless a component is proven generic.
- Add ADRs for reuse-vs-adapter decisions.
- Do not begin model/agent implementation in Phase 1.
