# Business OS — Commercial handoff recovery audit (2026-10-14)

## Scope and verified evidence
Baseline: main after WELLNESS-4 merge `35060bfc04cb3c51d790a15e3a88fdfa0e83e0b8`.
This is a read-only architecture/integration audit: no production behavior, permissions, contact, payments, or sales claims changed.

- WELLNESS-1 through WELLNESS-4 are merged, culminating in an administrator-facing report of **guest check-ins**, not verified purchases, taps or new customers.
- `src/business-os/scout/google-sources.js` includes Search Console/GA4 source adapters and explicit authorization/resource verification gates. Source existence is **not** proof of valid live credentials, access, freshness or operational collection.
- `docs/architecture/ai-business-os/sales/SALES_0_ARCHITECTURE_AND_GAP_AUDIT.md` defines the Sales Gold/Platinum roadmap and external authority boundaries.
- `src/business-os/sales/contracts.js` and `src/business-os/sales/index.js` exist on main; the index currently exports contracts only.
- SALES-2 PR #935 proposes `src/business-os/sales/qualification.js`, `test/ai-business-os-sales-qualification.test.js` and related documentation. The qualification file is **not** present on main. The PR's mergeability, CI and content need independent review before adoption.
- Existing Economics Platinum documentation and PRs are not evidence of live, revenue-bearing integration; verify actual deployed provider records and workflow receipts.

## First failing boundary
**Commercial opportunity qualification:** a marketing event guest check-in does not automatically become a Sales-qualified opportunity. The qualification engine from SALES-2 is absent from main; no verified governed handoff from wellness attendance to Sales qualification has been established.

## Industry-standard commercial controls
1. Preserve provenance and user permission separately: marketing attribution consent is not sales-contact consent.
2. Opportunity != qualified opportunity != approved proposal != customer acceptance != verified payment != fulfilled obligation.
3. Keep deterministic source references, organizational isolation, replayable dispositions, unknown evidence, and human approval for outbound contact.
4. Never infer revenue or conversion from guest check-ins.
5. Fail closed when provider authorization, economic evidence, offer capability or customer consent is missing.

## Execution sequence
1. **SALES-2 recovery:** inspect PR #935 current status, diff, source, CI and regression suite. Rebase or recreate against main if necessary; repair first failing test, confirm authority boundaries, then review/merge. Do not merge blind.
2. **SALES-3 capability + offers:** construct immutable proposal and revision artifacts from validated capability, explicitly non-authoritative.
3. **SALES-4 Economics/governance:** bind certified economic evidence by exact identity/digest; require explicit external approval.
4. **SALES-5 Gold certification:** adversarial replay, isolation, no-contact, unsupported-claim and missing-evidence tests.
5. **SALES-6+ Platinum:** immutable pipeline ledger, outcome attribution, conversion denominators, negotiation controls and calibrated forecast.
6. **Wellness commercial handoff:** opt-in lead capture separately from guest attendance; never reuse optional campaign attribution as permission to contact.
7. **Scout verification:** validate live Search Console/GA4 authorization, resource access, date windows and provider receipts; expose UNKNOWN when unavailable.
8. **Thin Body E2E:** one authorized customer, one capability, one approved offer, externally verified payment, delivery receipt, QA and Economics reconciliation. No simulated records counted as production.

## Acceptance gates
- SALES-2 tests and impacted CI checks pass; no unauthorized contact or payment behavior.
- End-to-end evidence ties one legitimate source to a qualified opportunity without exposing guest PII or inventing consent.
- Source freshness, financial truth, fulfillment truth and rollback are independently demonstrable.
- Status remains **NOT GOLD/PLATINUM CERTIFIED** until all applicable gates pass.

## Rollback and release policy
Use separate, scoped PRs. Keep old working behavior in main until checks pass. Deploy behind existing authorization and observe first failure. Revert the exact merge commit if production regression occurs; preserve diagnostic evidence without tokens or PII.
