# Experiment Manager implementation contract

1. `src/business-os/organization/roles.js` remains the canonical role registry and `createOrganizationalCoordinator` remains the authority for organizational work.
2. `ExperimentProposal` and `ExperimentResult` remain canonical organizational artifact types. Experiment-specific records add detail without replacing those artifacts or the Economics and Learning consumers.
3. A proposal version is append-only. Approval names the exact proposal version, is human-owned, is limited to `EXPERIMENT_RUN_INTERNAL`, and sets a budget no greater than the proposal ceiling.
4. A run requires matching active approval, an internal/synthetic/Academy boundary, a bounded budget, and an idempotency key.
5. Missing measurements have `presence: MISSING` and no numeric value. A measured zero has `presence: PRESENT`, `value: 0`, and evidence.
6. Tool completion is not result success. `SUPPORTED` requires a positive success measurement and cited evidence. Failures, policy blocks, and insufficient evidence remain distinct.
7. Live launch, prospect contact, publication, spending, Test A, and autonomous scaling have no executable capability or adapter.
8. Academy and internal coordinator checks establish architecture evidence only. They cannot establish live evidence, human acceptance, profitability, market demand, or scaling authority.
