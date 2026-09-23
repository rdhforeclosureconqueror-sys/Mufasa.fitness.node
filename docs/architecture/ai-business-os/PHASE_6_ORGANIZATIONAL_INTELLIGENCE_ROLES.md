# Phase 6 — Organizational Intelligence Roles

**Contract:** `ai-business-os.organization/1.0.0`
**Scope:** Phase 6 only
**Machine gate:** `CONDITIONAL_GO` when deterministic tests and canonical readiness pass; authenticated human architectural acceptance remains pending and Phase 7 is not authorized.

## One architecture, nine job descriptions

Phase 6 registers Smart Scout, Smart Analyst, Experiment Manager, Economics, Sales, Production, Independent QA, Learning, and Manager as configuration of the Phase 5 Shared Agent Runtime. There is no role-owned model client, tool adapter, policy engine, authority service, database, or reasoning loop. The runtime role-registration seam is now policy-injected: Phase 5 retains its synthetic-only default and the Phase 6 registry is the governed policy for organizational definitions.

Each definition contains a role/version, mission types, bounded context, memory and knowledge profiles, accepted and produced artifact types, allowed capabilities/tools, external authority and policy references, autonomy/risk/budget ceilings, reporting obligations, and escalation behavior. Runs and artifacts attribute that version.

| Role | Question | Inputs | Outputs and boundary |
|---|---|---|---|
| Smart Scout | What may merit investigation? | synthetic sources | observations/candidates/assessment; observed facts require source evidence and stale evidence remains flagged |
| Smart Analyst | What does evidence support? | candidates and signals | assessment/disposition; missing evidence is not manufactured and Scout dissent remains |
| Experiment Manager | What cheap governed test reduces uncertainty? | analysis | hypothesis/design/result/interpretation; prohibited or over-budget tests fail closed and technical failure is distinct from market failure |
| Economics | Do numbers support continuation? | results and cost/value evidence | assessment; known, estimated, unknown, expected, and actual classes stay distinct; it moves no money |
| Sales | What can truthfully be offered? | analysis, economics, validated capability | proposal only; unsupported capabilities/guarantees and real Phase 6 contact are rejected |
| Production | How can an approved obligation be fulfilled? | authorized obligation/remediation | plan/output; unsupported obligations escalate and Production cannot self-certify |
| Independent QA | Does output meet acceptance? | artifact and acceptance contract | PASS/FAIL/BLOCKED/INSUFFICIENT_EVIDENCE; PASS requires criteria and evidence and producer independence |
| Learning | What should be considered for learning? | verified outcomes and findings | governed proposals/candidates only; no self-application or knowledge self-promotion |
| Manager | What deserves attention next? | objective and bounded organizational state | directives/decision proposals; no policy, authority, evidence, QA, or human-gate override |

## Contract distinctions

- **Role** configures one runtime; it is not identity, brain, policy, or authority.
- **AgentIdentity** binds a configured actor to externally issued grants and policies.
- **Mission** bounds a runtime purpose; **Work** is the authoritative organizational unit that can become eligible and assigned.
- **Artifact** is a versioned attributable output with evidence, provenance, status, limitations, correlation/causation, and scope. It is not automatically fact, decision, or authorized action.
- **Handoff** records lineage from completed Work/artifacts to other Work. It never directly invokes a role.
- **Authority** is external constitutional permission, not role membership or capability awareness.
- **Manager Directive** proposes or prioritizes bounded Work; it cannot expand authority.
- **QA Verdict** is independent evidence against explicit criteria and cannot be authored as Production success.
- **Learning Proposal** requests a governed change; it cannot apply one.

The contract layer also defines objectives, assignments, findings, recommendations, decision proposals, reviews, experiments, economic assessments, and QA assessments. Existing Phase 1 Work/Event and Phase 5 Mission/Run remain authoritative lower-layer concepts; Phase 6 adds organizational metadata rather than replacing them.

## Governed Work routing and lineage

The coordinator deterministically answers what Work exists, why, eligible roles, actual assignment, output artifacts, blocking dependencies, newly eligible Work, and event history. It enforces organization scope, mission compatibility, external authority references, dependency completion, artifact type/attribution/provenance, immutable versions, replay control, and QA independence. Its `runtimeInvoker` is the only execution seam. A runtime response that reports direct role invocation is rejected.

A synthetic lineage can therefore be represented as Candidate → Analyst Assessment → Experiment Proposal/Result → Economic Assessment → Offer Proposal → Production Plan/Output → QA failure → remediation Work/output → independent QA pass → Learning Proposal → Manager proposal. This is evidence of what happened, not a mandatory pipeline. Disagreement is never overwritten.

## Diagnostics and CTQs

Organizational diagnostics compose OBJECTIVE, WORK_CREATED, WORK_ELIGIBLE, ROLE_MATCH, ROLE_AUTHORITY, CONTEXT, ROLE_REASONING, ARTIFACT_CREATED, ARTIFACT_VALIDATED, HANDOFF/ROUTING, DOWNSTREAM_WORK, OUTCOME, QA, LEARNING, MANAGEMENT, and REPORTING. Role-specific chains expose meaningful input, validation, reasoning/output, authority, and disposition/verdict boundaries. `NOT_APPLICABLE` is valid; only an executed evidenced failure is FAIL; causal downstream checks are BLOCKED. Lower Phase 1–5 diagnostics remain drillable.

Deterministic CTQs require zero independent role brains, direct role calls, direct provider calls, tool bypasses, self-granted authority, cross-organization/context leakage, ungrounded Scout facts, fabricated Analyst evidence, unknown-as-zero cost, projected-as-actual revenue, unsupported Sales promises, Production self-QA PASS, evidence-free QA PASS, Learning self-application, Manager overrides, lost dissent, provenance-free artifacts, duplicate effects, fabricated PASS, and machine approval of human criteria. The tests establish deterministic conformance only, not statistical process capability.

## Known limitations and gate

Storage, queues, locks and adapters are in-memory/single-process. Role outputs in certification are synthetic structured fixtures rather than claims about model quality. There is no live source, prospecting, customer contact, sales message, experiment, payment, spend, marketing publication, commercial commitment/order, learning mutation, external agent access, browser UI, physical-device validation, or production deployment. Human architectural review remains owned by authenticated Admin authority.

Phase 6 may be machine `CONDITIONAL_GO` after tests/readiness pass, pending human acceptance. **Phase 7 is not allowed to begin from this implementation or gate.**
