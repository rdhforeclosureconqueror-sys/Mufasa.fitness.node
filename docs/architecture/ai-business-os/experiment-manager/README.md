# Experiment Manager: verified internal core

The `EXPERIMENT_MANAGER` role uses the existing role registry and organizational coordinator. This package implements a governed, in-memory experiment lifecycle for internal/synthetic use. It reuses the canonical organization `ExperimentProposal` and `ExperimentResult` records.

## Current phase status

The full target remains [IMPLEMENTATION_CONTRACT.md](IMPLEMENTATION_CONTRACT.md), restored from planning PR #887. The initial implementation's E0–E8 completion claim was too broad. These are the current statuses against those original phase definitions:

| Phase | Current status | Evidence or remaining work |
| --- | --- | --- |
| E0 Baseline/contracts | INTERNAL_PASS | Existing roles, coordinator, proposal/result contracts, Economics and Learning ownership retained. |
| E1 Policy/records | PARTIAL | Proposal, approval, run, measurement and result records exist; durable decision records remain outstanding. |
| E2 Proposal reasoning | INTERNAL_PASS | A validated `AnalystAssessment` now produces a bounded proposal only when evidence, confidence, product readiness, capability readiness, audience, offer, channel, window, metrics, budget and authority context are complete. Weak, contradictory, stale, mismatched or unsupported inputs are rejected. Further domain-specific reasoning can extend this builder. |
| E3 Lifecycle/governance | PARTIAL | Immutable revisions, authenticated approval adapter, cumulative budgets, replay protection, pause/resume/stop/cancel and transition history pass. Preparation/QA/archive states and durable restart recovery remain outstanding. |
| E4 Coordinator integration | INTERNAL_PASS | Both design and interpretation execute through real kernel grants, roles, assignment and coordinator artifact validation. Negative tests reject missing/revoked authority, wrong mission, forged actor, scope mismatch and over-budget design. |
| E5 Measurement/results | PARTIAL | Missing/zero, unique samples, observation windows, minimum evidence, contradiction and failure classification pass. General metric definitions, statistical windows and real source verification remain outstanding. |
| E6 Department handoffs | PARTIAL | Canonical result and interpretation artifacts are produced. QA/Economics/Learning consumer handoffs and decision ownership workflows require implementation. |
| E7 Academy | PARTIAL | 27 registered scenarios have real executors through the canonical Academy runner. They certify the implemented internal core only; full target behavior coverage follows the remaining phases. |
| E8 Readiness/handoff | INTERNAL_PASS | Full architecture and Platinum stay incomplete. Internal core evidence is separated from application authentication, live, economic and human evidence. |

## Approval and budget contract

`createExperimentManager({organizationId, approvalAuthority})` rejects approval without a verifier. `createKernelApprovalAuthority({kernel, authenticate, policyVersionId})` provides that verifier. Its server-owned `authenticate(context)` resolves an authenticated request/session to an actor, organization, grant and evidence reference. It must not trust a request body or model output. No production HTTP authentication route is wired by this PR.

The kernel must hold an active HUMAN actor and an active, correctly scoped `experiment.approve.internal` grant. The grant must have a numeric `constraints.budgetCeiling`. Kernel policy must allow the action. Approval binds the exact immutable proposal digest and version. Start, replay and resume recheck current authority, including expiry and revocation.

Call `manager.approve({proposalId, proposalVersion, budgetCeiling}, authenticatedContext)`. Caller-supplied identity/status/scope fields are rejected. Each approval is immutable. Run requests bind their idempotency key to proposal/version/approval/budget/boundary/action. An identical replay returns the existing run; a changed request fails.

Budgets use cent precision. All reservations under an approval count toward its ceiling; all reservations under a proposal revision count toward its design ceiling, even across approvals. Stop/completion/cancellation do not release reservations. Actual cost reconciliation belongs to future Economics/storage integration. This package never spends money.

## Lifecycle and observations

Supported run transitions: RUNNING to PAUSED, COMPLETED, STOPPED or CANCELLED; PAUSED to RUNNING, STOPPED or CANCELLED. Terminal states cannot restart. Pause/resume/stop/cancel require a reason and evidence. `triggerStop` accepts a declared stop condition; execution adapters must surface those signals. There is no background monitoring service in this package.

Present observations require a declared success/failure metric, finite nonnegative value, nonempty evidence references, a unique sample reference per metric/run, and an observation time within the run. Missing observations retain MISSING and have no numeric value. Measurement IDs cannot overwrite history.

`minimumUsefulEvidence` is a minimum count of distinct present samples for the relevant outcome metric. It is not a statistical-significance test. Both positive success and positive failure signals yield INCONCLUSIVE. Missing/zero data does not imply rejection. A stopped or cancelled run cannot become SUPPORTED. Technical/policy failure reports require cited evidence and take priority over outcome signals.

Results use the proposal's work identity. SUPPORTED/NOT_SUPPORTED must cite the actual measurement evidence. The interpretation path accepts only the exact stored result and requires the source result and work dependency in the coordinator work item. It emits canonical result and interpretation artifacts, with provenance and explicit internal limitations.

## Evidence and readiness

`runExperimentManagerAcademy()` runs 27 canonical scenarios with real executors. `verifyExperimentManagerIntegration()` executes design, approval, run, observation, result and interpretation in a synthetic fixture. These functions return deeply frozen evidence registered in their modules. `experimentManagerReadiness({academyReport, integrationEvidence: [proof]})` accepts only those in-process reports with complete canonical coverage. Arbitrary PASS objects, copied/serialized reports and incomplete sets cannot pass.

This evidence boundary is intentionally process-local. A future durable evidence repository will need authenticated provenance and revision checks. Do not treat a JSON import as trusted certification.

`internalCoreReady` may be true. `architectureReady`, `certified`, and `liveEnabled` remain false while the target contract has outstanding work. Test sessions simulate authority and never record actual human acceptance.

## EM-1 proposal reasoning

`buildExperimentProposal({manager, assessment, context})` is the controlled bridge from the Platinum Analyst to the Experiment Manager. The assessment must be a canonical `AnalystAssessment` with `ADVANCE_TO_EXPERIMENT`, score at least 55, confidence at least 0.55, attributable evidence, provenance, no open questions, no rewritten history, and no unresolved contradiction. Context must identify the candidate, audience, offer, channel, time window, hypothesis, variable, success/failure metrics, budget, risk, boundary, stop rules, authority and operational product/capability readiness.

The builder preserves the Analyst assessment reference, version, score, confidence, evidence plan and limitations inside the proposal. It does not approve or start the experiment. Approval remains a human-owned governance step.

## Verification

```sh
npm run test:experiment-manager
node --test test/ai-business-os-experiment-manager.test.js test/ai-business-os-phase1-kernel.test.js test/ai-business-os-phase4-execution.test.js test/ai-business-os-phase6-organization.test.js test/ai-business-os-phase7-academy.test.js test/ai-business-os-phase8-simulation.test.js test/ai-business-os-analyst-platinum.test.js
npm run readiness:validate
```

Review repair plus EM-1: 51 Experiment Manager and proposal reasoning tests (including 28 Academy scenario subtests), 170 total targeted/regression checks, zero failures. No browser, physical-device, live campaign, payment or human acceptance was performed. The full repository test suite was not rerun for this repair; the original draft's broad-suite failure report is not a passing gate.

State is in memory and tools remain definition-only/unavailable. Do not connect external execution until durable state, real authentication, independent QA and the remaining target requirements are implemented and verified.
