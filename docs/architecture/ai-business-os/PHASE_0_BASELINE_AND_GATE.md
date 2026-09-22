# AI Business OS Phase 0 Baseline and Phase 1 Gate

**Gate date:** 2026-09-22  
**Phase 0 status:** **CONDITIONAL GO**  
**Headquarters:** `rdhforeclosureconqueror-sys/Mufasa.fitness.node` (repository root `/workspace/Mufasa.fitness.node` in this environment)  
**Phase 1 is not started by this gate.**

## Decision summary

Phase 0 establishes enough unambiguous architecture and traceability to permit a separate Phase 1 session to begin **contract design and constitutional-kernel implementation only**. The condition is `VERIFIED_GENERIC_REUSE_CONTRACTS`: every proposed direct reuse from Universal Pilot or Garvey must first receive source-code, dependency, test, ownership, and domain-assumption verification. The supplied cross-repository audit is accepted as authoritative reconnaissance, not falsely relabeled as local code verification.

Canonical inputs are the [Master Handoff](./MASTER_HANDOFF.md), the [cross-repository heritage audit](./PHASE_0_CROSS_REPO_HERITAGE_AUDIT.md), repository-root `AGENTS.md`, and the current Mufasa readiness implementation. The detailed [heritage matrix](./HERITAGE_EXTRACTION_MATRIX.md), [contract candidates](./PHASE_0_CONTRACT_CANDIDATES.md), and ADRs make the Phase 1 boundary explicit.

## Architecture baseline

```text
                              AI BUSINESS OS

  BRAIN                        NERVOUS SYSTEM                  CONSTITUTION
  Memory / Context             Events / queues                 Identity / actors
  Knowledge / Reasoning        Observability / diagnostics     Authority / policy
  Reflection / Learning        Readiness / FIRST FAILURE       State / workflow
  Metacognition                Results / feedback              Evidence / provenance
  Brain Academy                Monitoring / integrations       Audit / idempotency
                                                               Kill switches / gates
             cannot bypass -------------------------------> enforces every action

  DOMAIN BODIES: Fitness (Mufasa) | Education (Garvey) | Real Estate (Universal)
  Domain applications remain modular and connect through versioned contracts/adapters.
```

- **Universal Pilot** is the strongest Constitution/kernel predecessor: identity, authorization, policy-first controlled execution, action envelopes, workflow/state, audit, outbox/retry/idempotency, verification, escalation, module control, and opportunity workflow patterns.
- **Mufasa** is headquarters and the strongest Nervous System/observability predecessor. Its readiness CLI, repository audit, human/machine authority boundary, dependency diagnostics, and FIRST FAILURE behavior remain canonical. Fitness runtime stays a domain body.
- **Garvey** is the strongest learning/knowledge/evidence predecessor: stable graphs, evidence accumulation, bounded confidence/contradiction, reassessment, versioning/attribution, manifests/validation, consent-aware contextual projections, and preservation gates. Education stays a domain body.

No repository is merged into another. No Phase 0 artifact claims that cross-repository documentation alone proves a reusable production implementation.

## Canonical boundaries and ownership

| Concern | Canonical owner/direction | Explicit exclusion |
|---|---|---|
| Headquarters architecture and program evidence | This Mufasa repository | No second headquarters or parallel architecture |
| Development/readiness truth | Existing Mufasa readiness service, `data/readiness/*`, OPS-backed operational/human state, and CLI | No hand-edited readiness/OPS JSON; no separate Business OS readiness store |
| Human-required acceptance | Authenticated, authorized Admin UI/API | Machine/AI may submit evidence or request review, never self-approve |
| Constitution/kernel | Phase 1 generic contracts and verified implementation informed by Universal | No direct copy based only on architecture prose |
| Brain/learning | Later phases informed by Garvey and governed orchestration patterns | No agent or Brain implementation in Phase 0/1; no educational formulas generalized |
| Domain behavior | Source domain repository/application | No moving Fitness, Education, foreclosure, case, or property logic merely because it looks reusable |
| Control & Certification Panel | Future consumer/composition of canonical readiness and diagnostic evidence | No unrelated truth source and no premature UI-first implementation |

## Phase 0 scope and acceptance traceability

| Acceptance question | Resolved answer/evidence | Result |
|---|---|---|
| Where does the OS live? | Headquarters declared above and in Master Handoff/ADR-0001 | PASS |
| What readiness system is canonical? | Existing Mufasa CLI/service/repository+OPS split; ADR-0001 | PASS |
| What roles do the three predecessors provide? | Constitution / Nervous System / Brain-learning evidence, respectively, while domains remain modular | PASS |
| Which assets are reusable, generalizable, integrated, retained, deferred, or rejected? | Row-level heritage matrix with evidence limits and verification flags | PASS |
| Which claims need code-level verification? | Every external direct-reuse candidate flagged; documentation is intent only | PASS |
| What generic contracts are needed? | Contract catalog includes all required initial and later attachment concepts | PASS |
| What are the layer and execution boundaries? | Architecture diagram and mandatory structured-intent sequence | PASS |
| How does FIRST FAILURE work? | Dependency rule/status vocabulary and example below | PASS |
| How do evidence/provenance work? | First-class typed evidence and lineage candidates; ADR-0004 | PASS for Phase 0 design; schema remains Phase 1 work |
| How is human authority protected? | Non-self-promotion invariant and canonical Admin-only verification | PASS |
| What may Phase 1 build? | Narrow allow/prohibit list and test obligations below | PASS |

## FIRST FAILURE system law

Checks form an ordered dependency graph, not a flat collection. Each check reports exactly one of `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `PENDING`, or `NOT_APPLICABLE`. `FAIL` requires evidence that the check itself ran and failed. `BLOCKED` means an unmet dependency prevents a valid execution; `NOT_RUN` means it has not been attempted without asserting a dependency cause. `PENDING` is active/incomplete. `NOT_APPLICABLE` requires a reason.

```text
IDENTITY ............. PASS
AUTHORITY ............ PASS
POLICY ............... PASS
STATE VALIDATION ..... FAIL
TOOL EXECUTION ....... BLOCKED
RESULT OBSERVATION ... BLOCKED
AUDIT COMPLETION ..... BLOCKED
EVENT EMISSION ....... BLOCKED

FIRST FAILURE: STATE VALIDATION
```

For branches, report the earliest failed dependency on each independently executable path and a deterministic aggregate first failure based on declared dependency/order metadata. Never convert a downstream absence caused by an upstream failure into a second failure. FIRST FAILURE starts root-cause analysis; it does not prove ultimate cause.

For the Phase 0 → Phase 1 program gate, all Phase 0 questions pass. The earliest unresolved future boundary is:

```text
VERIFIED_GENERIC_REUSE_CONTRACTS .... NOT_RUN (Phase 1 prerequisite)
DIRECT CODE EXTRACTION ............... BLOCKED
KERNEL CERTIFICATION ................. BLOCKED
```

This expected future work makes the gate **CONDITIONAL GO**, not a Phase 0 implementation failure.

## Evidence, provenance, and human authority

Evidence must distinguish observed fact, derived attribute, inference, hypothesis, decision, and accepted knowledge. Each record must be attributable to a source/actor, context, time, version, and relevant invocation or action; provenance links preserve derivation and contradiction. Confidence never erases source type or conflicting evidence.

Machine evidence may establish automated checks and technical facts. It cannot manufacture human evidence, use self-authored evidence to expand its own grant, approve a policy/authority change, promote a model or capability where human review is required, authorize financial powers, or certify production/UX/device acceptance. Learning first changes bounded beliefs or recommendations. Operational policy changes use the separately authorized policy-change path with audit and required human approval.

## Risks, dependencies, and controls

| ID | Risk/dependency | Phase 0 control | Phase 1 disposition |
|---|---|---|---|
| R0-01 | Documentation is mistaken for working generic code | Matrix labels evidence type and verification requirement | Inspect source/tests; record parity evidence before reuse |
| R0-02 | Duplicate readiness/control-plane truth | Existing Mufasa readiness declared canonical | Extend its contract; add no parallel store |
| R0-03 | Domain leakage or destructive extraction | Domains remain modular; generic contracts first | Use adapters; reject mechanical Case→Work translation |
| R0-04 | Brain bypasses authority/policy/state | Mandatory execution boundary and ADR-0003 | Negative contract/integration tests |
| R0-05 | Machine self-promotes human acceptance or autonomy | Admin-only human authority invariant | Authorization and tamper tests |
| R0-06 | Flat diagnostics create cascading false failures | Dependency-aware status law | FIRST FAILURE graph contract tests |
| R0-07 | Garvey scoring becomes universal “truth” | Formulas rejected; only patterns generalize | Define contextual confidence after source verification |
| R0-08 | Event retries duplicate effects | Idempotency/outbox explicitly in kernel scope | Atomicity, replay, and retry-exhaustion tests |
| R0-09 | Sensitive evidence/audit data leaks | Redaction/retention remain open design issues | Resolve in contract and threat review before persistence |
| D0-01 | External implementation/test access | Cross-repo audit supplies reconnaissance only | Required before direct external-code reuse |
| D0-02 | Generic status mapping to current readiness clients | No Phase 0 runtime change | Verify compatibility before readiness extension |

## Phase 1 entry contract

### Allowed to begin

1. Verify proposed predecessor implementations and tests at source; record evidence in canonical readiness.
2. Design and version the Phase 1-ready contracts in the contract-candidate catalog.
3. Implement the constitutional kernel only: Actor/identity seam, Work/WorkItem and transitions, policy, authority, evidence/provenance, audit, event/outbox, retry/idempotency, configuration/versioning, dependency-aware FIRST FAILURE, and kill switches.
4. Build adapters rather than relocate domain code; add contract, negative-path, parity, replay, and failure-injection tests.
5. Extend the existing readiness/diagnostic mechanism as a composable Phase 1 module only after compatibility is proven.

### Not allowed

- Agents, role bots, model gateway/cognitive core, memory/knowledge engine, learning/reflection, Brain Academy, commercial workflows, organism tests, or economic validation.
- A second readiness database/panel architecture, direct AI writes, AI-granted authority, domain repository merger, or unverified code extraction.
- Prematurely frozen later-phase schemas merely to create implementation momentum.

## Phase 1 prerequisites and exit signal

Before implementation extraction: accept ADRs, keep the Phase 0 readiness card/evidence trace, obtain source-level verification for reused code, select narrow schema versions, and define tests before implementation. Phase 1 exits only when its kernel contract tests and diagnostics pass, machine and human evidence remain separated, and the phase receives its own evidence-backed gate. This Phase 0 gate does not pre-approve that exit.

## Phase 0 verification and human requirements

This phase changes architecture documentation and machine readiness evidence only; it makes no perceptible web-application change. Browser, production, and physical-device QA are not applicable. An authorized human must review/accept the architectural decisions and CONDITIONAL GO before organizational adoption; that acceptance is intentionally not marked complete by the agent.
