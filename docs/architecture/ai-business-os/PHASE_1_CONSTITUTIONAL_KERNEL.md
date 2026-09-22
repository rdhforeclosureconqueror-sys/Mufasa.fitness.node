# Phase 1 Constitutional Kernel Contract

**Contract version:** `ai-business-os.constitution/1.0.0`  
**Scope:** Phase 1 only

## Governed sequence

Every effect follows `Actor -> StructuredIntent -> AuthorityGrant -> PolicyDecision -> StateTransition -> controlled execution -> observed result -> EvidenceRecord -> AuditEvent -> EventEnvelope/OutboxRecord -> diagnostics`. An upstream failure stops the sequence and marks dependent diagnostic checks `BLOCKED`. Identity never implies permission, a policy decision never executes, and a handler return is not success until it is observed and recorded.

The contracts exported by `src/business-os/kernel/contracts.js` are versioned, frozen records for Actor, StructuredIntent, AuthorityGrant, PolicyDefinition, PolicyVersion, PolicyDecision, Work, WorkItem, StateTransition, EvidenceRecord, ProvenanceLink, AuditEvent, EventEnvelope, OutboxRecord, DiagnosticCheck, FirstFailure, and KillSwitch. Runtime validation rejects missing required fields and unknown enum values.

## Invariants

- Authority and policy are independently evaluated and independently visible.
- A subject cannot issue or expand its own authority. Delegation must be a subset of an active parent grant and must be performed by its issuer.
- Policies are append-versioned. `ALLOW`, `DENY`, and `REQUIRE_HUMAN` are explicit; human acceptance must come from a different registered human actor through the governed input.
- Work transitions require an allowed edge and the expected aggregate version. A stale version is a `CONCURRENCY_CONFLICT`, distinct from `ILLEGAL_TRANSITION`; neither mutates state.
- Evidence classes (`OBSERVED_FACT`, `DERIVED_ATTRIBUTE`, `INFERENCE`, `HYPOTHESIS`, `DECISION`, `KNOWLEDGE`) are immutable. Promotion creates a new record through an authorized path and retains lineage; history and contradictions are never overwritten.
- Audit is append-only and redaction-safe: payloads are represented by references/hashes, and update/delete operations reject.
- Events are at-least-once. Idempotency keys protect business effects and consumer receipts protect duplicate delivery. Outbox retry and terminal `DEAD_LETTER` state are explicit; no exactly-once claim is made.
- Active, scope-matching kill switches fail closed and their changes require authority and generate audit records.
- The sole Phase 1 handler, `synthetic.echo`, is private to the controlled executor. There is no exported direct invocation path.

## Diagnostic and gate contract

Checks use `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `PENDING`, or `NOT_APPLICABLE`. FIRST FAILURE is derived by topological declaration order from direct failure evidence; it is not caller supplied. Phase 1 machine verification can pass while human architectural acceptance remains pending. No Phase 2 model, agent, memory, knowledge, learning, experiment, economics, or registry subsystem is included.

## Acceptance and adversarial plan

The golden path proves one authorized echo from intent through completed Work and queued event. The adversarial matrix covers unknown actors; absent, expired, revoked, action/resource-mismatched authority; policy denial and unaccepted human review; illegal/stale/concurrent state; handler failure/timeout; intent and execution replay; event replay; retry recovery/exhaustion; kill switch; self-grant/delegation expansion; machine self-approval; audit mutation; unsupported evidence promotion; and downstream execution after upstream failure.

Acceptance CTQs are zero unauthorized executions, illegal mutations, false successes, duplicate effects, accepted audit mutations, accepted self-promotion, and FIRST FAILURE misclassifications, with 100% of required kernel tests and readiness validation passing. These deterministic tests are certification evidence, not a statistical process-capability claim.

## Delivery controls

- **Dependencies:** Phase 0 ADRs and cross-repository verification; canonical Mufasa readiness.
- **Risks:** the Phase 1 repository is in-memory and single-process; durable database transaction, worker leasing, and distributed concurrency are later integration work, not implied guarantees.
- **Change control:** contract or invariant changes require a new contract version and ADR.
- **Human gate:** independent owner review remains required. Machine results cannot satisfy it.

