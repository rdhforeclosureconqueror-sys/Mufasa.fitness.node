# Experiment Manager Role

## Purpose

The `EXPERIMENT_MANAGER` role turns a governed `AnalystAssessment` into a controlled, measurable experiment proposal, then preserves the experiment's result and decision. It coordinates work through the existing Business OS; it does not replace the coordinator, execution engine, Economics role, QA role, or Learning role.

## Baseline inspected

Repository baseline: main after SMART_ANALYST PR #883 merge (commit `363a1995584424b801697aab6a1726db13591401`).

Existing foundations:

- `src/business-os/organization/roles.js` registers `EXPERIMENT_MANAGER` with `DESIGN_EXPERIMENT` and `INTERPRET_EXPERIMENT`, `AnalystAssessment` input, and `ExperimentProposal`, `ExperimentResult`, and `ExperimentInterpretation` outputs.
- `src/business-os/organization/contracts.js` already defines `ExperimentProposal` and `ExperimentResult`. The proposal has question, hypothesis, motivating evidence, variable, success/failure metric, minimum useful evidence, cost/risk ceilings, boundary, confounders, limitations, stop conditions, authority references, information gain, status, and timestamp. The result has proposal linkage, result class, evidence, limitations, status, and timestamp.
- `src/business-os/organization/coordinator.js` enforces that experiment artifacts cannot request prohibited actions or exceed the work item's budget.
- Phase 6 organization tests include synthetic Experiment Manager work and verify economic uncertainty and result classification.
- Academy contains an experiment-reasoning scenario for distinguishing operational failure from market failure.
- Economics owns cost/value assessment; Scout already consumes verified `ExperimentResult` and `EconomicAssessment` records to create outcome feedback.

Current gap: this is a role shell and shared record foundation. There is no dedicated Experiment Manager package implementing the proposal logic, lifecycle state rules, run/observation/interpretation/decision records, lifecycle diagnostics, independent Academy coverage, or a proven role-specific coordinator execution path.

## System relationship

| Role | Responsibility |
|---|---|
| SMART_ANALYST | Assess evidence and recommend whether an experiment may be useful |
| EXPERIMENT_MANAGER | Define the experiment, govern its lifecycle, validate result completeness, and recommend a decision |
| PRODUCTION | Prepare approved materials and fulfillment |
| INDEPENDENT_QA | Check acceptance criteria and evidence independently |
| ECONOMICS | Assess costs, actual value, contribution, capacity, and uncertainty |
| LEARNING | Propose durable lessons from verified outcomes |
| MANAGER / authorized human | Resolve cross-role decisions and grant authority |

The Experiment Manager may design, coordinate, observe, interpret, and recommend. It must not self-authorize, publish, contact prospects, spend, change pricing, or scale. Any external side effect remains disabled unless a separately governed capability and authenticated approval path are implemented.

## Record ownership

Reuse the canonical `ExperimentProposal` and `ExperimentResult` contracts. Extend them additively only when a concrete gap is demonstrated and existing consumers remain compatible. Add versioned records only for missing concepts:

- `ExperimentRun`: one execution instance linked to one frozen proposal revision.
- `ExperimentObservation`: attributable measurement or event, preserving missing/unknown distinctly from zero.
- `ExperimentInterpretation`: evidence-based reading, uncertainty, confounders, and limitations.
- `ExperimentDecision`: stop, modify, continue, repeat, scale recommendation, or escalate, with authority and evidence.
- `ExperimentLesson` may be a Learning-owned proposal; do not duplicate the Learning contract.

Do not make Experiment Manager the financial ledger. Do not copy Scout's outcome feedback or Economics' assessment into a second source of truth.

## Lifecycle

Experiment lifecycle is distinct from coordinator Work state.

`DRAFT → DESIGNED → AWAITING_APPROVAL → APPROVED → PREPARATION → QA_PENDING → READY → RUNNING ↔ PAUSED → COMPLETED → INTERPRETED → DECIDED → ARCHIVED`

Required branches include `REJECTED`, `CANCELLED`, `STOPPED`, and `INCONCLUSIVE`. Every transition records actor/role, time, reason, evidence, and prior/new version. A design revision after approval creates a new proposal version or a new experiment; it never rewrites the frozen design or historical results.

## The experiment record in practice

For Push-Up Arena, an assessment may propose former athletes as a candidate audience. The Experiment Manager then proposes a bounded test with one question, control and variation, defined audience, offer, channel, period, budget ceiling, primary completion measure, diagnostic funnel measures, required evidence sources, confounders, stop rules, and scale rule. Production prepares the assets, QA checks the path, an authorized human approves any external launch or spend, and the system preserves the run and observations. Economics verifies economics separately. The Experiment Manager recommends a decision; it cannot call impressions or clicks business success.

## Non-goals

- No live campaign, prospect contact, publication, price change, or spending.
- No autonomous scaling or external account connection.
- No new coordinator/runtime/store architecture.
- No claim of live market evidence from fixtures, Academy, or Test A.
- No rewrite of existing proposal/result records or historical evidence.
