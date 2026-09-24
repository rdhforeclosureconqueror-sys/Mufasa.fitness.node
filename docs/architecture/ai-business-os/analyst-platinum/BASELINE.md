# Analyst baseline and audit scope

Inspected repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`.

Remote main inspected on 2026-09-24: `5a2ba1e5dfe2d6455587e0c8e82c887b223e978a` (Command Brain and diagnostic translation, PR #881).

The initial local checkout was `8f1415c65811e6c1632fc9c1d6fb38f11a2b7cdf` with separate Scout edits. Those edits were preserved. Remote comparison and direct reads established that the organizational role, contract, coordinator and diagnostics files examined below were unchanged between those two commits. Planning artifacts are published on a branch based on the inspected remote main. Readiness evidence uses the current committed baseline and the canonical CLI.

## Observed findings

| ID | Source | Observation | Consequence | Planned resolution |
|---|---|---|---|---|
| AN-B01 | `src/business-os/organization/roles.js` | SMART_ANALYST has ASSESS_EVIDENCE, candidate/evidence-history context, memory profiles, Scout inputs and an AnalystAssessment output; default allowedTools and allowedCapabilities are empty | Role configuration exists but dedicated tool availability is absent in this default | A2 |
| AN-B02 | `src/business-os/organization/contracts.js`, `coordinator.js` | ANALYST_DISPOSITIONS exist; AnalystAssessment is an output name without a dedicated constructor/validator here; coordinator validates the generic envelope | An envelope-only assessment can become COMPLETED without findings, disposition or recommendation | A1 |
| AN-B03 | `src/business-os/organization/diagnostics.js` | Aggregation derives PASS when no FAIL was observed, including all required stages NOT_RUN | A summary can imply readiness without execution | A1, regression for all callers |
| AN-B04 | `test/ai-business-os-phase6-organization.test.js` | Tests cover registration, work eligibility, attribution, dissent and organizational boundaries; synthetic artifacts exercise those paths | Useful architecture tests do not certify marketing judgment | A4, A7 |
| AN-B05 | `src/business-os/real-world/harness.js` | Dry-run roleTrace represents role stages with fixture evidence | A roleTrace entry does not prove Analyst cognition or tools ran | A2, A7 integrated execution |

Earlier isolated in-memory probes returned:

```json
{"check":"default_analyst_tools","allowedCapabilities":[],"allowedTools":[]}
{"check":"no_analysis_checks_run","stages":["NOT_RUN","NOT_RUN","NOT_RUN","NOT_RUN"],"gate":"PASS"}
{"check":"assessment_without_analysis","workState":"COMPLETED","hasDisposition":false,"hasFindings":false,"hasRecommendation":false}
```

These are source-level diagnostic observations, not live customer or production findings. Codex must repeat them as meaningful regression cases on its starting SHA. A newer fix should be reused and documented instead of duplicated.

## What was not certified by this planning review

- Deployed Render state, external credentials, GA4/Search Console configuration or live source records.
- Analyst model quality, production runtime wiring or business effectiveness.
- A fresh full test-suite baseline at the implementation starting commit.
- Browser/mobile usability or human acceptance.
- Completion of the Fitness Product Factory manifest runtime.

The implementation run owns the A0 executable baseline. Do not copy previous Scout test counts as Analyst evidence. Distinguish individual test results from a runner that merely reports one test file as passing; confirm expected cases actually execute.

## Reuse map to reconcile in A0

| Existing path | Intended reuse |
|---|---|
| `organization/roles.js`, `contracts.js`, `coordinator.js` | Role configuration, work/artifact validation and handoff lineage |
| `runtime/`, `cognition/` | Shared mission lifecycle, model gateway and structured reasoning |
| `memory/` | Scoped history, evidence and context composition |
| `execution/registry.js`, `controller.js` | Registered capabilities and governed execution |
| `scout/` | Candidate contracts, source/evidence conventions and read-only Google groundwork |
| `academy/` | Canonical scenario registry, runner, observations, assertions and certification |
| `real-world/controlled-live.js`, `live-test-plan.js` | Existing controlled-test observations; read-only use with explicit classification |
| `command/service.js`, `brain.js` | Authenticated reporting and shared intelligence interface |
| `src/services/launchReadinessService.js`, `scripts/readiness-update.js` | Canonical development cards and machine evidence |

No assumed manifest reader or payment/cost record may be declared operational solely because the plan names it. Find the actual canonical source; where it is absent, report a capability gap and implement only the approved interface/reader scope.
