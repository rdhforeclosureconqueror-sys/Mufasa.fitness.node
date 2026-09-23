# Phase 5 — Complete Shared Agent Runtime

**Contract:** `ai-business-os.agent-runtime/1.0.0`  
**Scope:** Phase 5 only  
**Machine gate:** `CONDITIONAL_GO` after deterministic certification and canonical readiness validation; human architectural acceptance remains pending.

## Decision and boundary

Phase 5 connects the existing Constitution, Cognitive Core, Memory/Knowledge/Context system, and governed Planning/Execution system into one reusable runtime. It does not create an organizational role or a second implementation of any lower subsystem. Certification uses only `SYNTHETIC_OPERATOR` and `SYNTHETIC_OBSERVER`. Scout, Analyst, Sales, Production, QA, Learning, Manager, real business workflows, cross-run learning, economics, experiments, and self-modification remain excluded.

The dependency direction is:

`Shared Agent Runtime -> Phase 3 Context Engine -> Phase 2 Cognitive Core -> Phase 4 Execution Controller -> Phase 1 Constitutional Kernel`.

Actual results return through `Observation -> Verification -> Evidence -> Episodic Memory -> cumulative budget/risk -> attributed next-action decision -> runtime state -> report`. The runtime never calls a model provider, adapter, or tool directly.

## Contract catalog and separation of concerns

| Contract | Responsibility | Explicitly not |
|---|---|---|
| `RoleConfiguration` | Organization-scoped reusable configuration of mission types, views, registered capabilities/tools, ceilings, defaults, and reporting | identity, authority, mission, policy, or brain |
| `AgentIdentity` | Durable configured runtime identity linked to one Phase 1 Actor and external authority/policy references | an authority grant or durable conversation |
| `Mission` | Structured reason for existence, criteria, scope, budget/risk/autonomy/time boundaries, escalation and stop rules | prompt text |
| Phase 4 `Goal` | Mission-scoped active objective, criteria, provenance, autonomy, and completion evidence | an incompatible second goal model |
| `AgentRun` | Replayable execution instance with authoritative state, plan/activity/context/evidence lineage, accounting and outcome | model conversation history |
| Phase 1 `AuthorityGrant` | Constitutional permission issued externally to the agent | role membership or intelligence |
| `RuntimeTransition` | Attributed, sequenced state change validated against a deterministic transition graph | model recommendation |
| `HumanEscalation` | Structured need, boundary, evidence, missing authority, options and no-response behavior | free-text error or machine approval |
| `RunReport` | Safe lineage and outcome summary with no hidden chain-of-thought | a new ledger or evidence source |

All contracts are versioned. Repository reads require the caller's organization ID. Registration verifies that an identity's actor exists and that referenced active grants belong to that actor and cover its organization. Role, mission, goal, plan, and tool autonomy can only narrow an upstream ceiling.

## Authoritative lifecycle

The transition graph includes `CREATED`, `INITIALIZING`, `READY`, `OBSERVING`, `CONTEXTUALIZING`, `REASONING`, `PLANNING`, `AWAITING_AUTHORIZATION`, `EXECUTING`, `VERIFYING`, `REPLANNING`, `AWAITING_HUMAN`, `PAUSED`, `STOPPING`, `COMPLETED`, `FAILED`, and `TERMINATED`. Invalid edges throw without mutation. Each valid edge creates a sequenced transition and a Phase 1 event/outbox record with an idempotency key.

`PAUSED`, `FAILED`, `COMPLETED`, and `TERMINATED` are distinct. Resume starts from `READY`, rebuilds context, and executes through the controller again, which rechecks current capability/tool availability, constitutional authority, policy, kill switches, cost, risk, and idempotency. A graceful governed stop passes through `STOPPING -> TERMINATED`; it is not automatically a failure.

## One governed cycle

1. Validate identity/mission/goal lineage from authoritative repositories.
2. Record observable mission, goal, budget, risk and supplied fact references without treating cognitive text as fact.
3. Ask the Phase 3 Context Engine for a bounded permission-filtered slice.
4. Create the canonical Phase 2 request and accept only an advisory cognitive result with a safe summary.
5. Accept a candidate Phase 4 plan, select an executable step, and delegate deterministic validation and execution.
6. Let the Phase 4 controller resolve registered capability/tool data, ask Phase 1 to authorize every attempt/substitution, invoke its adapter, observe the actual result, verify independently, record evidence, and hand an episode to Phase 3 memory.
7. Update run-wide known cost, estimated commitments, unknown cost count, remaining budget and deterministic risk classifications. Unknown cost is never zero.
8. Attribute `CONTINUE`, `REPLAN`, `ESCALATE`, `STOP`, or `COMPLETE` to actual evidence and current boundaries. Phase 4 retains bounded `RETRY`; the run records the resulting attempt lineage.
9. Require independent `VERIFIED_SUCCESS`, evidence, success criteria and no blocking step before completion.
10. Produce a structured report of actors, governance, context, plan, capability/tool activity, attempts, verification, cost/risk, uncertainties, escalation and outcome.

Current-run reflection is limited to expected-versus-observed-versus-verified discrepancy and the next governed action. It cannot rewrite prompts, policy, authority, capabilities, procedures, or future-run behavior.

## Failure and diagnostics

Runtime failure types distinguish cognitive, context, memory, plan, authority, policy, capability, tool, verification, budget, risk, human dependency, state, and runtime failures. The diagnostic chain is:

`AGENT_IDENTITY -> MISSION -> GOAL -> RUNTIME_STATE -> OBSERVATION -> CONTEXT -> REASONING -> PLAN -> PLAN_VALIDATION -> AUTHORIZATION -> EXECUTION -> OBSERVATION_RESULT -> VERIFICATION -> EVIDENCE -> MEMORY_HANDOFF -> BUDGET_RISK -> NEXT_ACTION -> COMPLETION -> REPORTING`.

Only checks that ran with supporting evidence may pass. An executed failure makes later dependent checks `BLOCKED`; otherwise checks remain `NOT_RUN`. FIRST FAILURE is the earliest executed causal breakdown and is not asserted to be root cause.

## Deterministic certification and CTQs

The Phase 5 suite proves a harmless complete organism in which the primary synthetic tool fails, a registered compatible alternative is selected, Constitution is rechecked, independent verification succeeds, evidence/memory/accounting are recorded, and a report supports completion. Adversarial cases cover invalid identity/authority, autonomy expansion, organization isolation, mission/goal/run lineage, invalid state, invented capability/tool, verification failure and false completion, unknown cost escalation, pause/resume with authority revocation, replay protection, governed stop, diagnostic truthfulness, and human-owned gate status. Phase 1–4 suites retain coverage for context denial/conflict/staleness, cognition failure, authority/policy/kill-switch denial, timeouts/retry, ambiguous verification, tool disappearance, substitutions, and underlying event/idempotency semantics.

The deterministic CTQs are zero unregistered execution, unauthorized execution, cross-organization leakage, direct model-to-tool/provider calls, false verified outcomes/completion, replayed side effects, self-granted authority/autonomy, fabricated diagnostic passes, unattributed transitions, and machine approvals of human criteria; required deterministic tests and readiness validation must pass. These are certification criteria, not statistical process-capability claims.

## Known limitations and Phase 6 boundary

Storage and adapters remain in-memory and single-process. This phase does not prove distributed locks, durable production persistence, real provider/tool availability, statistically calibrated risk, real cost settlement, live business results, browser UX, physical-device behavior, or human architectural quality. Human acceptance must be recorded through the authenticated Admin authority.

Phase 6 may add organizational **configurations** for future roles on this runtime. It may not create role-specific brains, bypass providers/tools/governance, or treat Phase 5 certification as permission for commercial activity. No Phase 6 implementation is included here.
