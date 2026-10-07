# SALES-0 — Sales Architecture, Enterprise Benchmark & Gap Audit

**Audit baseline:** `bb4c680dc4645b40018e941fc8bf8679e328afca`  
**Scope:** architecture/readiness audit only; no SALES-1 implementation and no Gold/Platinum claim.

## Executive assessment

Sales currently exists primarily as a **Phase 6 shared-runtime role configuration and synthetic organizational boundary**, not as a complete commercial domain. The role accepts `AnalystAssessment`, `EconomicAssessment`, and `CapabilityEvidence`, can produce `SalesProposal`/`OfferProposal`, is bounded to recommendation autonomy, and the coordinator rejects real customer contact, unsupported capability claims, and unsupported guarantees.

There is no dedicated `src/business-os/sales/` domain, canonical opportunity/qualification/quote lifecycle, proposal version model, customer-acceptance evidence, pipeline ledger, negotiation/concession policy, conversion analytics, revenue forecast/calibration, or quote-to-obligation production handoff.

**SALES-0 determination: BASELINE ESTABLISHED — GOLD NOT ACHIEVED; PLATINUM NOT ACHIEVED.**

## Current implementation inventory

| Capability | Status | Repository evidence | Finding |
|---|---|---|---|
| Shared-runtime SALES role | IMPLEMENTED | `organization/roles.js` | Mission `PROPOSE_OFFER`; recommendation ceiling inherited from Phase 6 role registration. |
| Sales inputs/outputs | PARTIAL | `roles.js` | Inputs Analyst/Economics/Capability evidence; outputs SalesProposal/OfferProposal, but no dedicated canonical sales contracts. |
| Truth/contact guard | IMPLEMENTED (narrow) | `organization/coordinator.js` | Rejects real customer contact, unsupported capability and unsupported guarantee flags. |
| Organization/authority assignment | IMPLEMENTED | `coordinator.js` | Governed Work assignment requires active external authority grant. |
| Synthetic sales handoff | IMPLEMENTED | Phase 6 organization test | Synthetic SalesProposal participates in a closed organizational lineage. |
| Opportunity qualification | MISSING | no dedicated Sales domain | No canonical qualification contract, criteria, disposition, evidence model or state machine. |
| Capability validation | PARTIAL | role input type + coordinator flags | CapabilityEvidence is named but no Sales-owned validation contract was found. |
| Offer construction | PARTIAL | role output type only | No line items, price/economic binding, limitations, validity, version or deterministic digest contract. |
| Economics integration | PARTIAL | role input type | EconomicAssessment is accepted conceptually; no Sales-specific binding to the certified Economics artifacts. |
| Customer acceptance | MISSING | Phase 6 exclusions | No authoritative acceptance artifact or contract. |
| Payment verification | MISSING / OUTSIDE ROLE | Phase 6 exclusions | No money movement; Sales must not fabricate payment. |
| Production obligation handoff | MISSING | synthetic lineage only | No canonical accepted-offer → authorized obligation transition. |
| Pipeline/conversion intelligence | MISSING | no Sales domain | No commercial event ledger, stages, conversion denominators or loss taxonomy. |
| Negotiation/concessions | MISSING | no Sales domain | No governed discount/concession boundaries. |
| Forecasting/calibration | MISSING | no Sales domain | Economics calibration exists, but no Sales forecast semantics. |
| Independent Sales QA | PARTIAL | Independent QA role exists | No Sales-specific acceptance contract/certification suite. |

## Existing architecture and authority boundary

Current repository architecture is:

`AnalystAssessment + EconomicAssessment + CapabilityEvidence → SALES shared runtime → SalesProposal/OfferProposal`

The Phase 6 coordinator supplies Work assignment, organization isolation, artifact attribution/provenance checks and narrow Sales truth/contact guards. The Phase 6 architecture describes a synthetic downstream path from Sales proposal to Production, but this is evidence of role routing, **not a commercial transaction protocol**.

The certified Economics workflow is separate and must remain authoritative for economic calculations. Sales may reference certified Economics artifacts; it must not recalculate or mutate them.

Required semantic boundaries:

- OPPORTUNITY ≠ QUALIFIED OPPORTUNITY
- PROPOSAL ≠ APPROVED OFFER
- APPROVED OFFER ≠ CUSTOMER ACCEPTANCE
- CUSTOMER ACCEPTANCE ≠ VERIFIED PAYMENT
- VERIFIED PAYMENT ≠ FULFILLED OBLIGATION
- FORECAST REVENUE ≠ ACTUAL REVENUE

Sales cannot independently create customer consent, real customer contact, payment truth, Production fulfillment truth, or spending/settlement authority.

## Enterprise benchmark

The benchmark was refreshed against current authoritative public documentation during this audit.

Microsoft Dynamics 365 documents opportunity → quote → accepted quote/order → fulfillment/invoice transitions. Quotes have explicit draft/active/closed states and revision IDs; quote line items share currency constraints with the quote. Salesforce documents multiple quotes per opportunity, while only one quote can be synchronized to an opportunity at a time. These patterns support four architecture principles for this Business OS:

1. **Separate lifecycle artifacts.** Opportunity, quote/proposal, acceptance/order and fulfillment should not be one mutable status blob.
2. **Version commercial commitments.** Draft/revision/activation semantics prevent an edited proposal from being confused with the version a customer accepted.
3. **Bind line items to pricing/economic evidence.** Commercial arithmetic must retain currency, product/service and price lineage.
4. **Treat state transitions as authority-bearing events.** A quote becoming an obligation requires evidence/authority distinct from Sales reasoning.

We should borrow these contract principles, not their UI or CRM-specific implementation. Live CRM mutation, customer communication, legal acceptance, payments and fulfillment remain external authority boundaries.\n\nAuthoritative benchmark sources checked for this audit:\n\n- Microsoft Learn — Manage quote, order, and invoice: https://learn.microsoft.com/en-us/dynamics365/sales/sales-transactions\n- Microsoft Learn — Create or edit quotes: https://learn.microsoft.com/en-us/dynamics365/sales/create-edit-quote-sales\n- Microsoft Learn — Create or edit sales orders: https://learn.microsoft.com/en-us/dynamics365/sales/create-edit-order-sales\n- Salesforce Help — How Quote Syncing Works: https://help.salesforce.com/s/articleView?id=sales.quotes_synch_overview.htm&type=5\n

## Gold definition

**Sales Gold:** a deterministic, governed commercial reasoning capability that transforms a qualified opportunity into a truthful, economically supported and capability-validated offer proposal, with immutable lineage, explicit limitations, versioning and human authorization boundaries.

### Gold gap matrix

| Requirement | Status | Gap / risk | Recommended phase | Acceptance |
|---|---|---|---|---|
| Canonical opportunity identity | PARTIAL | Scout candidate exists, not a Sales commercial opportunity | SALES-1 | immutable organization/work/source identity |
| Customer need representation | MISSING | no canonical need/evidence contract | SALES-1 | needs + provenance + unknowns |
| Qualification | MISSING | no criteria/disposition | SALES-2 | deterministic qualified/disqualified/needs-evidence result |
| Evidence provenance | PARTIAL | organizational artifact provenance exists | SALES-1/2 | exact authoritative source refs preserved |
| Capability validation | PARTIAL | input name/guard only | SALES-3 | unsupported capability fails closed |
| Offer construction | PARTIAL | output type name only | SALES-3 | canonical versioned proposal and line items |
| Pricing/Economics binding | PARTIAL | EconomicAssessment input only | SALES-4 | exact digest/version binding; no Sales recalculation |
| Commercial limitations | PARTIAL | unsupported guarantee guard | SALES-3 | explicit limitations/unknowns |
| Proposal identity/versioning | MISSING | no dedicated contract | SALES-1/3 | deterministic ID/digest and revision lineage |
| Human approval boundary | PARTIAL | external role authority exists | SALES-4 | proposal cannot self-activate or create obligation |
| Rejection/escalation | PARTIAL | organizational routing supports failures generally | SALES-2/4 | explicit commercial dispositions |
| Deterministic replay | UNVERIFIED | no Sales suite | SALES-5 | identical canonical inputs replay identically |
| Cross-role handoff | PARTIAL | synthetic Phase 6 lineage | SALES-4 | Analyst/Economics/Production refs verified |
| Independent QA | PARTIAL | generic QA exists | SALES-5 | Sales Gold acceptance contract |
| Gold certification | MISSING | none | SALES-5 | adversarial + regression PASS |

## Platinum definition

**Sales Platinum:** enterprise-grade commercial intelligence over a governed pipeline: multi-product proposals, bounded negotiation, conversion analysis, forecast/calibration and lifecycle visibility, while contracting, payment and fulfillment authority remain external.

### Platinum gap matrix

| Requirement | Status | Phase |
|---|---|---|
| Pipeline state/event history | MISSING | SALES-6 |
| Conversion/loss/objection analytics | MISSING | SALES-6 |
| Multi-product compatibility | MISSING | SALES-7 |
| Discount/concession governance | MISSING | SALES-7 |
| Governed negotiation revisions | MISSING | SALES-7 |
| Revenue forecast semantics | MISSING | SALES-8 |
| Forecast calibration | MISSING | SALES-8 |
| Customer lifecycle state | MISSING | SALES-8 |
| Cross-role commercial integration | PARTIAL synthetic only | SALES-9 |
| Adversarial/replay certification | MISSING | SALES-10 |
| Final Platinum acceptance | MISSING | SALES-10 |

## Refined bounded roadmap

### SALES-1 — Canonical commercial contracts
Define immutable opportunity/need/qualification-input/proposal-reference primitives, status vocabulary, artifact identity/digest/version and explicit authority semantics. No live actions.

### SALES-2 — Opportunity qualification
Deterministic evidence-based qualification with explicit criteria, unknowns, rejection/escalation and provenance. No lead scoring magic and no contact.

### SALES-3 — Offer & capability validation
Build canonical proposal/line-item/revision semantics; bind offers to validated capability; preserve unsupported/unknown claims and limitations; no activation authority.

### SALES-4 — Economics & governance integration
Bind exact certified EconomicAssessment identities/digests and external governed approval. Prove proposal ≠ approved offer ≠ acceptance ≠ payment/obligation.

### SALES-5 — Gold certification
Regression, integration, adversarial, deterministic replay and readiness evidence. No new feature scope except defect repairs.

### SALES-6 — Pipeline & conversion intelligence
Immutable commercial event ledger, governed stages, conversion denominators, loss/objection taxonomy and descriptive pipeline analytics.

### SALES-7 — Governed negotiation & multi-product offers
Proposal revisions, bundles, concession/discount constraints and compatibility. No autonomous concessions or contracting.

### SALES-8 — Forecasting & lifecycle
Expected commercial outcomes, explicit uncertainty, historical calibration and lifecycle visibility. Forecast ≠ actual; no invented probabilities.

### SALES-9 — Cross-role commercial integration
Certify Scout/Analyst/Economics/Sales/Production/QA handoffs and authoritative acceptance/obligation boundaries using production contracts.

### SALES-10 — Platinum certification
Full regression, adversarial mutation, replay, truthfulness, readiness/limitations register and final PASS/BLOCKED decision.

## Dependencies and risks

Sales should reuse the shared runtime, Work routing, organization isolation, artifact provenance, certified Economics outputs and Independent QA. It must not create another brain/runtime/policy engine.

Highest risks are authority leakage (proposal treated as commitment), stale/mutated economic or capability evidence, proposal revision after acceptance, unsupported guarantees, fake customer acceptance/payment, and forecast revenue being promoted to actual revenue.

Live customer identity/contact permission, legal acceptance, payment verification, tax/invoicing and fulfillment truth are external integrations/authorities and are not prerequisites for Gold if the contracts fail closed when those authorities are absent.

## SALES-1 recommended scope

Create a dedicated `src/business-os/sales/` contract layer only after confirming repository naming conventions. The first production slice should contain canonical immutable commercial artifacts and identity/version/digest helpers plus tests. It should not implement qualification reasoning, offer pricing, CRM calls, customer contact, acceptance, payments or Production execution.

SALES-1 stopping condition: downstream Sales phases have stable, deterministic, organization-scoped artifact contracts that make it impossible to confuse opportunity, proposal, approval, acceptance, payment and fulfillment states.

## Verification status

This audit inspected current remote `main` at the baseline above, Phase 6 role/contracts/coordinator/readiness, economic workflow and Phase 6 organization tests. No production code was changed. Runtime test execution is not available through the GitHub connector in this audit environment; therefore existing test behavior is reported from source inspection rather than represented as newly executed evidence.

## Final determination

**SALES_0_BASELINE_ESTABLISHED**

Sales has a useful Phase 6 skeleton and fail-closed organizational boundary, but Gold requires a dedicated commercial contract/qualification/proposal domain and Gold certification. Platinum additionally requires governed pipeline, negotiation, multi-product, forecasting/lifecycle and final cross-role/adversarial certification.

No Gold or Platinum certification is awarded by SALES-0.
