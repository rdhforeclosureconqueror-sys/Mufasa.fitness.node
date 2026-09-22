# Phase 0 Generic Contract Candidates

**Scope:** Design inputs for Phase 1, not frozen schemas and not implementations.  
**Rule:** Contracts describe boundaries before code extraction. Versioning, identifiers, timestamps, actor attribution, provenance, and explicit error/status semantics are cross-cutting candidates; exact fields remain subject to Phase 1 contract design and tests.

## Readiness states

| Candidate | Phase 0 disposition | Minimum responsibility | Principal open verification |
|---|---|---|---|
| `Actor` | **READY FOR PHASE 1 CONTRACT DESIGN** | Stable identity for a human, service, model/runtime role, or approved external principal; actor type is not authority | Identity federation and service-actor representation |
| `Work` | **READY FOR PHASE 1 CONTRACT DESIGN** | Domain-neutral objective/lifecycle aggregate owned by a domain | Boundary versus predecessor Case and long-running workflow |
| `WorkItem` | **READY FOR PHASE 1 CONTRACT DESIGN** | Atomic/child unit of Work with dependencies and state | Granularity, concurrency, and parent aggregation |
| `StateTransition` | **READY FOR PHASE 1 CONTRACT DESIGN** | Requested/authorized transition with from/to state, reasons, and version | Optimistic concurrency and invalid-transition semantics |
| `PolicyDecision` | **READY FOR PHASE 1 CONTRACT DESIGN** | Allow/deny/require-approval decision tied to policy version, input, and explanation | Universal Pilot authorizer behavior and denial model |
| `AuthorityGrant` | **READY FOR PHASE 1 CONTRACT DESIGN** | Scoped, time/budget/action-bound permission issued by an authorized principal | Revocation, delegation, and non-self-promotion invariants |
| `EvidenceRecord` | **READY FOR PHASE 1 CONTRACT DESIGN** | Typed observation/derivation/inference/hypothesis/decision/knowledge evidence with source and confidence limits | Alignment with canonical readiness evidence without duplication |
| `ProvenanceLink` | **READY FOR PHASE 1 CONTRACT DESIGN** | Typed lineage edge between evidence, input, invocation, decision, result, and version | Immutability, redaction, retention, and graph cycles |
| `EventEnvelope` | **READY FOR PHASE 1 CONTRACT DESIGN** | Versioned fact notification with correlation/causation and delivery metadata | Transactional outbox boundary and schema evolution |
| `AuditEvent` | **READY FOR PHASE 1 CONTRACT DESIGN** | Security/operational record of attempted and completed critical activity | Append-only store, sensitive-data policy, and failure recording |
| `DiagnosticCheck` | **READY FOR PHASE 1 CONTRACT DESIGN** | Dependency-aware check returning PASS/FAIL/BLOCKED/NOT_RUN/PENDING/NOT_APPLICABLE with evidence | Mapping Mufasa statuses without breaking existing consumers |
| `FirstFailure` | **READY FOR PHASE 1 CONTRACT DESIGN** | Earliest observed causal boundary in an ordered dependency graph | Deterministic ordering for graphs/parallel branches |
| `Tool` | **CANDIDATE** | Executable controlled interface with input/output schema, risk, cost, authority, and failure semantics | Phase 4 owns full registry; Phase 1 needs only execution seam |
| `Capability` | **CANDIDATE** | Governed ability composed from tools/procedures with validation and maturity | Capability maturity must not grant itself authority |
| `MemoryRecord` | **NEEDS MORE VERIFICATION** | Attributed memory item with scope, permissions, type, retention, and source | Phase 3 memory taxonomy and Garvey/source inspection |
| `KnowledgeClaim` | **NEEDS MORE VERIFICATION** | Context-bounded claim supported/contradicted by evidence and reassessment | Confidence semantics, contradiction resolution, expiry |
| `ModelInvocation` | **CANDIDATE** | Auditable request/result metadata for a governed model gateway | Phase 2 owns provider/cost/prompt details; Phase 1 needs audit seam |

`CANDIDATE` means the concept is needed but Phase 1 should avoid over-specifying a later-phase subsystem. `NEEDS MORE VERIFICATION` blocks schema freezing, not the definition of a narrow kernel seam.

## Later attachment points

| Concept | Disposition | Attaches to | Phase boundary |
|---|---|---|---|
| `Opportunity` | **DEFERRED** | `Work`, evidence, domain source, experiment | Define when opportunity/experiment work begins; Real Estate lead adapter remains external |
| `Experiment` | **DEFERRED** | hypotheses, policy, authority, Work, outcomes | Later experiment/economic reasoning; no Phase 1 implementation |
| `Customer` | **DEFERRED** | Actor/party projection, consent, domain CRM | Avoid forcing customer semantics into kernel Actor |
| `ProductionJob` | **DEFERRED** | Work/WorkItem, capability, QA evidence | Production role/body phase |
| `EconomicOutcome` | **DEFERRED** | Work, experiment, cost/revenue evidence, attribution | Economic reasoning phase; never use AI as ledger |
| `LearningRecord` | **DEFERRED** | evidence, prior/new claim, intervention, reassessment | Learning may propose belief/recommendation updates before policy changes |
| `DecisionRecord` | **CANDIDATE** | Actor/model reasoning, evidence, policy decision, outcome | Phase 1 should reserve provenance/audit linkage; full reasoning contract comes later |

## Mandatory boundary sequence

```text
DOMAIN / AGENT
  -> STRUCTURED INTENT
  -> AUTHORITY
  -> POLICY
  -> STATE / WORKFLOW VALIDATION
  -> CONTROLLED TOOL OR DOMAIN SERVICE
  -> OBSERVATION / RESULT
  -> EVIDENCE
  -> AUDIT
  -> EVENT
  -> LEARNING / ORCHESTRATION
```

Every arrow is an observable contract boundary. A failure stops dependent execution. The Brain may form intent, reason, and recommend; it may not mint authority, waive policy, mutate authoritative workflow state directly, forge observation, approve its own human gate, or rewrite audit history. Policy and authority checks occur again when execution context or action changes.

## Phase 1 contract-test obligations

1. Reject unauthenticated/unknown actors and absent, expired, revoked, over-budget, or wrong-scope grants.
2. Prove AI output remains non-authoritative until controlled execution succeeds.
3. Record allow, deny, require-human, invalid-state, tool-failure, and retry-exhaustion outcomes.
4. Prove valid and invalid state transitions, concurrency conflicts, idempotent replay, and duplicate event delivery.
5. Prove outbox/event correlation, causation, versioning, ordering assumptions, and no false success on failed side effects.
6. Prove evidence type/source/lineage distinctions and prevent unsupported promotion from inference to knowledge or decision.
7. Prove audit linkage for attempts as well as results, including denied actions.
8. Prove dependency-aware FIRST FAILURE: after an upstream FAIL, dependent checks are BLOCKED or NOT_RUN, not independently FAIL.
9. Prove machine evidence cannot set human acceptance, alter authority, promote models/capabilities, or modify policy without the authorized path.
10. Add adapter/parity tests before any predecessor code is copied or depended upon.
