# Codex handoff: Experiment Manager role

Implement the Experiment Manager architecture described in this directory on current `main`. First inspect the merged SMART_ANALYST implementation and repository instructions. Continue from canonical Phase 6 organization contracts, coordinator, registries, diagnostics, readiness mechanism, and Academy. Do not duplicate the shared Brain/runtime or canonical ExperimentProposal/ExperimentResult/EconomicAssessment/LearningProposal.

## Baseline facts

- The role exists in `src/business-os/organization/roles.js`, missions `DESIGN_EXPERIMENT` and `INTERPRET_EXPERIMENT`.
- Canonical `ExperimentProposal` and `ExperimentResult` are in `src/business-os/organization/contracts.js`.
- The coordinator validates `EXPERIMENT_MANAGER` prohibited actions and ensures artifact `costCeiling` does not exceed the work budget.
- Phase 6 tests cover only synthetic generic role output and basic experiment/economic record shape.
- Academy has a limited experiment-reasoning classification case.
- Economics and Scout already consume canonical result artifacts; preserve their contract.

## Assignment

Create one implementation PR, using phase commits or clear phase sections, that establishes a truthful, testable Experiment Manager role through phases E0–E8 in `IMPLEMENTATION_CONTRACT.md`.

Build an additive package under `src/business-os/experiment-manager/` (reconcile exact paths with current patterns). Implement versioned policies/contracts for missing lifecycle concepts; proposal reasoning; immutable/versioned experiment design; explicit state transitions; measurement definitions and attributable observations; result classification and interpretation; bounded decision recommendations; readiness/Academy certification; and coordinator-compatible runtime integration using a real constitutional grant, role registry, coordinator assignment, and execute path.

Use existing schemas and economics/learning role ownership. Only add role capability/tool definitions the current registries can represent. Mark definition-only/unimplemented capabilities `DESIGNED`/`UNAVAILABLE`; do not claim executable tools without adapters and evidence. Keep any launch, spend, prospect contact, publication, price change, and autonomous scaling unavailable.

Add adversarial negative controls: missing authority, wrong role/mission, forged attribution, budget overflow, post-approval mutation, duplicate run, invalid transition, false success, technical failure relabeled as market failure, missing data converted to zero, profit claim without Finance, and scale without evidence.

## Readiness and validation

Before implementation, inspect whether the canonical readiness board needs a card. If so, use `npm run readiness:update`; never edit readiness stores directly. Record implementation, changed files, PR, automated results, honest external/human blockers, and run `npm run readiness:validate`.

Run the role suite, relevant organization/kernel/execution/Academy regressions, syntax checks, and repository self-checks. Report unrelated baseline failures separately. Do not claim full repository success unless it passes.

## Hard boundaries

- No deployment, live campaign, customer/prospect contact, spend, Test A, external account connection, or autonomous scaling.
- Synthetic Academy results are architecture evidence only.
- Keep raw observations and historical proposals immutable.
- Do not self-record human acceptance or mark live evidence verified from fixtures.
- Open a draft implementation PR from current `main`; do not merge it.

## Completion report

Report phase status and changed paths; tests run with exact outcomes; coordinator negative-control evidence; readiness validation; any pre-existing failures; and remaining human/live gates. Make the system say what is operational, partial, designed, blocked, or not built.
