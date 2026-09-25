# Experiment Manager implementation contract

## Invariants

1. `EXPERIMENT_MANAGER` stays a configuration on the shared role registry and coordinator.
2. Existing canonical `ExperimentProposal`, `ExperimentResult`, `EconomicAssessment`, and `LearningProposal` remain authoritative; new records fill verified gaps only.
3. Experiment lifecycle state is separate from Organizational Work state.
4. Hypothesis, audience, variable, success criteria, budget, scope, stop rules, and evidence plan are frozen at approval. Later changes are versioned and auditable.
5. Missing evidence remains missing; it is never silently converted to zero or a failure.
6. Operational/technical failure, market result, economic result, QA failure, and inconclusive evidence remain distinct classifications.
7. Every result and decision links to proposal/run versions and attributable source evidence.
8. Finance determines economic outcomes. Experiment Manager may carry inputs and request review but cannot declare profit.
9. Academy/synthetic results prove architecture only, never real demand or profitability.
10. No external action, live test, spend, publication, or autonomous scale without a separately implemented and verified authority boundary.
11. A diagnostic reports `PASS` only if every required check is `PASS` or `NOT_APPLICABLE`; missing checks remain `INCOMPLETE`.
12. One failed or inconclusive test is preserved and informs future tests; it is never overwritten by a later version.

## Phases and definitions of done

| Phase | Definition of done | Evidence |
|---|---|---|
| E0 Baseline and contracts | Current schemas, coordinator rules, Academy coverage, Economics/Scout consumers, and role gaps are recorded. Canonical ownership is agreed. | Baseline inventory and compatibility map. |
| E1 Role policy and record contracts | Versioned role policy and validated lifecycle, run, observation, interpretation, and decision records exist. Existing proposal/result contracts remain compatible. | Contract tests, version tests, invalid-record tests. |
| E2 Proposal reasoning | A deterministic proposal builder accepts a valid AnalystAssessment and produces a bounded, attributable proposal; incomplete evidence requests clarification. | Positive, incomplete, contradictory, and adversarial tests. |
| E3 Lifecycle and governance | Valid transitions, frozen approved design, immutable revisions, approval prerequisites, stop/pause/resume, cancellation, and idempotent run identity are enforced. | Transition table tests, forbidden transition and replay tests. |
| E4 Coordinator integration | Real kernel grant, role registry, coordinator assignment, runtime invocation, and artifact validation work end to end. Missing grant, wrong mission, forged actor/artifact, and over-budget artifacts fail. | Integration test through `createOrganizationalCoordinator.execute` and negative controls. |
| E5 Measurement and result validation | Observations link to a run and metric definitions; missing versus zero is preserved; technical, market, and inconclusive outcomes cannot be conflated. | Result validation and adversarial classification tests. |
| E6 Department handoffs | QA owns acceptance review, Economics owns financial assessment, Learning owns lesson promotion, and Manager/human owns authorization and cross-role decisions. | Handoff tests with ownership and provenance checks. |
| E7 Academy certification | Canonical Academy executors exercise proposal, lifecycle, authority, budget, data quality, failure modes, replay, and decision limits through production logic. | Scenario registry, executor coverage, negative-control detection. |
| E8 Readiness and handoff | Certification reports architecture/integration separately from live evidence and human acceptance; external gates remain blocked until truly supplied. | Certification output, readiness validation, documented Codex/user handoff. |

## Required behavior cases

At minimum, Academy coverage includes:

- valid bounded proposal; absent or weak Analyst evidence; unsupported product readiness
- no hypothesis, no measurable primary outcome, ambiguous audience, missing cost, unknown budget
- unauthorized start, cost ceiling above authorized work budget, prohibited action
- mutation after approval, duplicate start, stale/replayed run, invalid state transition
- missing measurement versus measured zero; stale or unattributed observation
- technical failure versus market failure; contradictory sources; insufficient sample/window
- clicks/impressions without conversion; conversion without verified revenue; profit claim without Economics
- product funnel blockage; stop condition; safe pause/resume; canceled or incomplete test
- repeat proposal preserving history; scale recommendation without repeatable evidence
- forged coordinator actor/artifact, missing authority, and a negative control that injects false PASS

## Certification vocabulary

- `DESIGNED`: contract exists; execution is not implemented.
- `PARTIAL`: some paths work; required behavior is missing.
- `INTERNAL_PASS`: production code passes deterministic tests and shared coordinator integration.
- `HUMAN_TEST_REQUIRED`: real experience or authority boundary needs human acceptance.
- `LIVE_EVIDENCE_REQUIRED`: a real authorized experiment and attributable outcome are not yet recorded.
- `PLATINUM_CERTIFIED`: internal gates, verified independent outcomes, economic review, and authenticated human acceptance all pass.

Do not label the Experiment Manager Platinum based only on Academy results.
