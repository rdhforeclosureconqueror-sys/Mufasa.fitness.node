# Phase 1 Cross-Repository Verification & Engineering Handoff

**Program:** AI Business OS  
**Headquarters:** Mufasa.fitness.node  
**Phase:** 1 — Architecture Contracts + Constitutional Kernel  
**Prepared after Phase 0 merge:** 2026-09-22

## Purpose

This artifact resolves the cross-repository inspection work that the headquarters coding session cannot safely infer on its own. It is an engineering input to Phase 1, not permission to copy whole domain systems.

Phase 1 must build the domain-neutral Constitution inside Mufasa Fit Node while preserving Mufasa readiness as the canonical development/certification evidence system.

## Verified source findings

### Universal Pilot — Policy/Authority

Source inspected: `auth/authorization.py`.

The implementation confirms a real `PolicyAuthorizer`, not merely an architecture document. It:
- resolves policy configuration by Case or program;
- limits assumed roles using policy-configured eligibility;
- creates time-bounded role sessions;
- rejects invalid duration;
- requires an active, non-revoked, non-expired role session;
- scopes sessions by Case/program;
- reads allowed actions from versioned policy configuration;
- audits both denied and allowed authorization decisions with reason code and policy version.

**Phase 1 classification:** REIMPLEMENT FROM PROVEN PATTERN / GENERALIZE + REUSE SEMANTICS.

Do not copy `Case`, `program_key`, FastAPI exceptions, role names, or SQLAlchemy coupling into the generic contract. Preserve: scoped grants, expiry/revocation, policy-version linkage, deny reasons, and authorization audit.

Important improvement for the Business OS: separate **AuthorityGrant** from **PolicyDecision** explicitly. Universal combines role-session authority and policy action checking in one service; the new kernel should make the two stages independently observable for FIRST FAILURE.

### Universal Pilot — Policy versioning

Source inspected: `app/models/policy_versions.py`.

Confirmed fields include stable ID, program key, version tag, active flag, JSON configuration, and creation timestamp.

**Classification:** GENERALIZE + REUSE SEMANTICS.

The new kernel needs versioned immutable-or-append-oriented policy definitions and must record the exact policy version used by each decision. Do not inherit `program_key` as a universal concept; use neutral scope/domain/subject metadata.

### Universal Pilot — Audit

Sources inspected: `app/models/audit_logs.py`, `app/models/ai_activity_logs.py`, `app/models/workflow_events.py`.

Confirmed:
- AuditLog records actor, AI flag, action, reason, before/after state, policy version, timestamp.
- ORM listeners reject AuditLog update and delete.
- AI activity records provider/model/version, prompt hash, confidence, human override, incident/admin-review fields.
- workflow event hooks use audit/document inserts as workflow synchronization triggers.

**Classification:** GENERALIZE + REUSE SEMANTICS, not direct schema copy.

Phase 1 should preserve append-only audit behavior and attempts/denials, but make the generic AuditEvent independent of Case. Include correlation/causation, target/work reference, authority grant, policy decision/version, outcome, and redaction-safe evidence references.

Do not build the Phase 2 Model Gateway now. Reserve the audit seam so later ModelInvocation metadata can attach without schema replacement.

### Universal Pilot — Outbox/idempotency

Source inspected: `app/models/outbox_queue.py`.

Confirmed a durable outbox data model with event type, Case, payload, unique `dedupe_key`, attempts, max attempts, processed timestamp, created timestamp.

**Classification:** REIMPLEMENT FROM PROVEN PATTERN.

The model proves the pattern exists but does not by itself prove transaction atomicity, worker lease semantics, retry backoff, dead-letter handling, or exactly-once delivery. Phase 1 must implement/test the generic guarantees rather than claim them from the predecessor.

Required generic behavior:
- event persisted atomically with authoritative state change where applicable;
- unique idempotency/dedupe identity;
- retry count and terminal exhaustion state;
- safe replay;
- consumer idempotency;
- correlation and causation;
- explicit delivery status;
- failure evidence and FIRST FAILURE.

Do not claim exactly-once distributed delivery. Design for at-least-once delivery with idempotent effects unless implementation proves a stronger guarantee.

### Universal Pilot — Workflow/state

Sources inspected: `app/models/workflow.py`, `app/models/workflow_events.py`.

Confirmed:
- versioned workflow templates;
- ordered steps;
- responsible roles;
- required documents/actions/blocking conditions;
- pending/active/blocked/complete progress;
- locked template version per Case workflow;
- explicit override records with from/to, reason category, reason, actor, timestamp;
- immutable Document and AuditLog records;
- synchronization on evidence/audit insert.

**Classification:** GENERALIZE + REUSE SEMANTICS.

Do not mechanically rename Case to Work. Build neutral Work/WorkItem/StateTransition contracts. Preserve version locking, explicit legal transitions, blocking conditions, actor-attributed overrides, and immutable historical evidence.

### Universal Pilot — Controlled tool/domain execution

Sources inspected: `app/services/module_registry_service.py`, `app/services/module_loader_service.py`.

Confirmed:
- module lifecycle draft → validated → active/deprecated;
- required services and allowed actions;
- validation before activation;
- policy validation hook;
- wildcard permissions/actions rejected;
- lifecycle audit;
- bounded DomainServiceBroker mapping known action names to approved service handlers;
- action rejected when not allowed, not mapped, or missing required service;
- structured payload building before domain handler invocation.

**Classification:** GENERALIZE + REUSE PATTERN; future Tool/Capability registry precursor.

For Phase 1, implement only the constitutional execution seam needed to prove that an authorized structured intent reaches a controlled handler. Do not build the full Tool Registry/Capability Registry yet; those belong to Phase 4.

### Universal Pilot — AI orchestration

Source inspected: `app/services/ai_orchestration_service.py`.

Confirmed a real advisory/execution separation and command/activity logging precursor. It is domain-heavy and directly imports Real Estate/Veteran/Housing services.

**Classification:** PATTERN ONLY / DEFER implementation.

Do not copy this into Phase 1. Preserve only the constitutional principle that a proposed intent is not an executed action. Model Gateway and shared Brain runtime come later.

### Garvey — evidence/learning precursor

Cross-repo source inspection confirms Garvey assessment architecture exposes persistent assessment sessions, responses/results, skill evidence, recommendations, exposure, reassessment, consent, attribution, assessment versions, confidence/consistency/contradiction fields, and development timelines in its documented/runtime surfaces.

**Phase 1 classification:** architectural input only. No Garvey learning/scoring code should be imported into the kernel.

Phase 1 must make EvidenceRecord/ProvenanceLink capable of supporting later:
- observed vs derived vs inferred evidence;
- source/actor/time/version;
- contradictions;
- reassessment;
- role/context-specific projections;
- knowledge claims that remain separate from evidence.

Do not implement KnowledgeClaim confidence algorithms in Phase 1.

### Mufasa — readiness/FIRST FAILURE

Current headquarters evidence confirms:
- canonical readiness files and CLI remain active;
- Phase 0 evidence records machine PASS separately from required human acceptance;
- existing FIRST FAILURE diagnostics use dependency concepts;
- Phase 0 established PASS/FAIL/BLOCKED/NOT_RUN/PENDING/NOT_APPLICABLE vocabulary for Business OS contract design.

**Classification:** REUSE canonical readiness; GENERALIZE diagnostic semantics.

Do not create a second readiness store.

## Phase 1 architecture decision

Build a **domain-neutral constitutional kernel** under a dedicated Business OS boundary in Mufasa Fit Node. Exact folder naming may follow existing repo conventions, but do not mix kernel code into Fitness-specific runtime modules.

The kernel execution path must be observable as separate stages:

1. Actor resolved/authenticated.
2. Structured Intent accepted.
3. AuthorityGrant validated.
4. Policy evaluated against exact version.
5. Work/State transition validated.
6. Controlled execution seam invoked.
7. Actual result observed.
8. Evidence recorded.
9. Audit appended.
10. Event/outbox persisted.
11. Diagnostic result emitted.

Every stage needs explicit success/failure semantics. An upstream failure blocks dependent stages.

## Contracts Phase 1 should implement

### Actor
Stable principal identity. Actor type is descriptive, not authority. Must support human, service, later agent/model runtime, and approved external principal without granting privileges by type alone.

### StructuredIntent
Add this explicitly even though Phase 0 listed it as a boundary rather than a named candidate. It is the non-authoritative requested action. Minimum semantics: intent ID, actor, action type, target/work scope, payload reference/hash, created time, correlation/causation, requested authority context.

### AuthorityGrant
Scoped permission issued by an authorized principal/system path. Minimum semantics: grant ID, subject actor, action/resource scopes, constraints (time/budget/count where applicable), issuer, issued/expiry/revoked timestamps, parent/delegation reference if allowed, version/status. An actor cannot mint or expand its own grant.

### PolicyDefinition / PolicyVersion
Versioned policy source with stable identity and scope. Prefer append/version over in-place semantic mutation.

### PolicyDecision
Decision ID, exact policy version, actor/grant/intent refs, outcome (ALLOW/DENY/REQUIRE_HUMAN or equivalent), reason codes, evaluated time, relevant evidence refs. Policy decision does not execute.

### Work / WorkItem
Neutral objective/lifecycle aggregate and child work units. Avoid Customer/Opportunity/Case semantics. Include ownership/domain reference, state/version, dependencies, timestamps.

### StateTransition
Requested from/to state, expected version, actor/intent refs, reason, validation outcome, override path if any. Invalid transition must not mutate state. Concurrency conflict must be explicit.

### EvidenceRecord
Typed evidence with source, actor, timestamp, version, evidence class, payload/reference/hash, confidence only where meaningful, scope, and immutable lineage. Do not allow an inference to silently overwrite an observation.

### ProvenanceLink
Typed edge connecting source → observation → derivation/inference → decision/result. Must preserve contradiction and derivation history.

### AuditEvent
Append-only record for attempted/denied/allowed/executed critical actions. Include actor, intent, work/target, authority, policy decision/version, before/after or outcome refs, reason, correlation/causation, timestamp. Design for redaction rather than dumping secrets.

### EventEnvelope
Event ID/type/version, producer, subject/work, timestamp, correlation/causation, payload/reference, idempotency key, schema version.

### OutboxRecord
Durable delivery state, event ref, dedupe/idempotency key, attempts/max attempts, next attempt/lease where implementation requires, processed/failed/dead-letter status and failure evidence.

### DiagnosticCheck / FirstFailure
Dependency graph node with status PASS/FAIL/BLOCKED/NOT_RUN/PENDING/NOT_APPLICABLE, evidence, reason, dependencies, order/priority. FirstFailure is derived deterministically from executed dependency graph, not manually asserted.

### KillSwitch
Scoped disable control for execution class/domain/tool/integration/system as appropriate. Record issuer, reason, scope, active state, timestamps, and audit. A kill switch must fail closed for the scope it governs.

## Contract invariants

- Brain/model output is never authoritative state.
- Actor identity does not imply authority.
- Authority and policy are separate checks.
- Expired/revoked/wrong-scope authority denies execution.
- Policy uses an exact version and returns explicit reason.
- State mutation requires legal transition and expected version.
- Denied/failed attempts are auditable.
- Audit is append-only.
- Evidence classes remain distinguishable.
- Human-required acceptance cannot be generated by the actor seeking approval.
- Event delivery is replay-safe/idempotent.
- Failed side effect never becomes success state.
- Downstream diagnostics become BLOCKED after causal upstream failure.
- Kill switch prevents governed execution and is itself audited.
- Domain adapters cannot bypass the kernel.

## Phase 1 minimum vertical kernel test

Do not wait for later agents. Prove the Constitution using a harmless synthetic action.

Example conceptual flow:

Human/Test Actor → StructuredIntent("synthetic.echo") → AuthorityGrant → PolicyDecision(ALLOW) → Work transition READY→EXECUTING → Controlled synthetic handler → Result → Evidence → Audit → Event/Outbox → Work COMPLETE → diagnostics all PASS.

Then prove negative/adversarial variants:
- unknown actor;
- missing grant;
- expired grant;
- revoked grant;
- wrong action scope;
- policy DENY;
- policy REQUIRE_HUMAN without human acceptance;
- illegal state transition;
- stale expected version/concurrency conflict;
- handler failure;
- handler timeout;
- duplicate intent/replay;
- duplicate event delivery;
- outbox retry then success;
- retry exhaustion;
- kill switch active;
- attempted self-grant/self-promotion;
- attempted audit mutation;
- attempted evidence-type promotion without authorized path.

Each must produce truthful state and FIRST FAILURE.

## Diagnostic module

Create the Phase 1 diagnostic module as data/contract + test evidence first. Reuse the canonical Mufasa readiness pipeline. A polished UI is optional at this phase unless an existing panel can consume the module cheaply.

The module should expose:
- contract/version health;
- actor/authority/policy/state/execution/evidence/audit/event/outbox/kill-switch checks;
- dependency graph;
- FIRST FAILURE;
- blocked downstream stages;
- automated evidence;
- human-required evidence;
- Phase 1 gate.

Do not hand-edit canonical readiness/OPS state.

## PMP / Six Sigma Phase 1 CTQs

Track at least:
- unauthorized execution count = 0 in acceptance suite;
- illegal state mutations = 0;
- false-success side effects = 0;
- duplicate side effects under replay = 0;
- mutable audit acceptance = 0;
- machine self-approval acceptance = 0;
- FIRST FAILURE misclassification = 0 in defined test matrix;
- required contract tests passing = 100% for gate;
- readiness validation = PASS.

These are acceptance CTQs, not claims of statistical process capability.

## Phase 1 exclusions

Do not implement:
- Model Gateway;
- LLM provider calls;
- Scout/Analyst/Sales/Manager agents;
- Memory engine;
- Knowledge confidence algorithms;
- Learning/reflection/metacognition;
- Experiment engine;
- Economics engine;
- full Tool/Capability Registry;
- commercial opportunity workflows;
- Customer CRM;
- Fitness/Real Estate/Garvey migration;
- a new independent readiness store.

## Phase 1 gate

Phase 1 may be GO only when:
- contracts are versioned/documented;
- kernel implementation follows them;
- positive and negative tests pass;
- predecessor direct-reuse claims are backed by implementation/test evidence or downgraded to pattern/reimplementation;
- readiness validation passes;
- FIRST FAILURE diagnostic module reports truthfully;
- human-required acceptance remains separate;
- no Phase 2+ subsystem was smuggled into the kernel.

Otherwise report CONDITIONAL GO or NO-GO with exact FIRST FAILURE.

## Codex instruction

Use this file together with:
- `MASTER_HANDOFF.md`
- `PHASE_0_BASELINE_AND_GATE.md`
- `HERITAGE_EXTRACTION_MATRIX.md`
- `PHASE_0_CONTRACT_CANDIDATES.md`
- Phase 0 ADRs
- repository-root `AGENTS.md`

Implement **Phase 1 only** on a dedicated branch and PR. Start by writing the contract/spec and test plan, then implement the smallest generic kernel satisfying it. Extend canonical readiness and Phase 1 diagnostics as part of the same phase. Do not begin Phase 2.

At completion report GO / CONDITIONAL GO / NO-GO, FIRST FAILURE, tests, readiness validation, human requirements, risks, and exact Phase 2 prerequisites.