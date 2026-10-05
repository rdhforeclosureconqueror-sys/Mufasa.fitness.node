# SALES-0 — Sales Architecture, Benchmark, and Gap Audit

**Audit date:** 2026-10-05  
**Repository:** `rdhforeclosureconqueror-sys/Mufasa.fitness.node`  
**Audited baseline / local starting HEAD:** `2aa38d7dadb448f07c56792f0cbb47a49de6790a`  
**Baseline label supplied by the assignment:** Economics Platinum  
**Current-main verification:** **UNVERIFIED.** This checkout has no configured Git remote or local `main` ref. A read-only `git ls-remote` attempt against the named GitHub repository failed with `CONNECT tunnel failed, response 403`; therefore this audit does not misrepresent the supplied baseline as a freshly fetched `main`.  
**Scope:** architecture and capability audit only; no SALES-1+ implementation, live CRM, customer communication, payment, or new execution authority.  
**Certification result:** Sales Gold **NOT ACHIEVED**; Sales Platinum **NOT ACHIEVED**.

## 1. Executive assessment

Sales currently exists in three materially different forms which must not be conflated:

1. **A functioning generic role configuration and organizational safety seam.** `SALES` is one of nine Phase 6 configurations of the single shared runtime. It can be assigned `PROPOSE_OFFER` Work, may consume `AnalystAssessment`, `EconomicAssessment`, and `CapabilityEvidence`, and may emit generic `SalesProposal` or `OfferProposal` Work artifacts. The coordinator requires attribution/provenance and rejects three explicit Sales violations: real customer contact, unsupported capability, and unsupported guarantee.
2. **A functioning synthetic commercial world.** Phase 8 models synthetic opportunities, offers, customer accept/reject responses, orders, immutable obligations, capacity, independent QA, delivery, settlement, and refund. These are closed-world simulation contracts and fixtures, not a reusable production Sales domain.
3. **A narrow Thin Body demonstration.** Phase 9 supplies one fitness-specific, immutable offer fixture and generic external-action/obligation primitives. Its dry-run harness *represents* the early role sequence with trace entries rather than executing a Sales domain. Phase 9B remains a one-participant controlled-validation plan whose own contract says live execution is not authorized.

There is **no production `src/business-os/sales/` domain**, no canonical opportunity or qualification contract owned by Sales, no reusable offer-line/configuration model, no proposal repository or revision history, no governed Sales state machine, no negotiation/concession contract, no acceptance-evidence adjudicator, no pipeline/conversion/forecast engine, and no Sales-specific certification suite. The Phase 6 role registration therefore proves routing and boundary configuration, not a complete sales system.

The closest reusable upstream foundations are strong: Scout candidate/provenance contracts, Analyst evidence assessments, Experiment Manager proposal/result governance, Economics' versioned inputs and deterministic authoritative calculations, Phase 6 Work/artifact routing, human-only governed decisions, Phase 4/9 action authority, and independent QA patterns. The correct roadmap is to add a bounded, domain-neutral Sales contract and reasoning layer **on those seams**, never a second brain, gateway, policy system, memory system, or executor.

## 2. Repository truth and method

### 2.1 Sources inspected

- Phase 5 shared runtime and ADR 0011.
- Phase 6 role registry, organization contracts, coordinator, diagnostics/readiness, architecture document, ADR 0012, and tests.
- Scout and Analyst contracts, assessment/integration/certification tests, and their Platinum documentation.
- Experiment Manager contracts, approvals, integration, repository, and tests.
- Economics contracts, engine, provenance, scenario/sensitivity/capital allocation/calibration/portfolio/reconciliation, organizational economic workflow, certification documents, and tests.
- Phase 8 simulation contracts/world/runner/scenarios and tests.
- Phase 9/9B real-world contracts, Thin Body, airlock, harness, controlled-live plan, documentation, and tests.
- Readiness definitions/evidence and the readiness update/validation mechanism.

Repository searches found no production Sales module and no Sales-named test. Sales assertions occur inside Phase 6, Phase 8, and Phase 9 tests.

### 2.2 Classification rules

| Status | Meaning in this audit |
|---|---|
| `IMPLEMENTED` | Executable production-path behavior with relevant automated coverage, not merely a name or fixture. |
| `PARTIAL` | A reusable primitive or bounded implementation exists, but the target capability or integration is incomplete. |
| `MISSING` | No applicable executable implementation was found. |
| `BLOCKED` | Delivery depends on an unavailable prerequisite or deliberately external authority. |
| `UNVERIFIED` | A claim or interface exists but sufficient executable evidence was not found or could not be run/observed. |

Synthetic behavior is identified as synthetic. Fitness-specific Phase 9 fixtures are evidence of adapter-boundary design, not evidence of a reusable Sales domain.

## 3. Current implementation inventory

| Artifact / subsystem | Actual identity / version | Owner | What exists and can be reused | What it does **not** prove |
|---|---|---|---|---|
| Sales role configuration | `SALES`, registry contract `ai-business-os.role-registry/1.0.0`, role version `1` | Organization registry | Mission, bounded context/memory/knowledge profiles, three input and two output artifact names; common `RECOMMEND` autonomy ceiling | No typed Sales contracts, executor, reasoning, persistence, qualification, pricing, or lifecycle |
| Shared organization contracts | `ai-business-os.organization/1.0.0` | Organization | Work, assignment, generic immutable-at-write artifact, finding, recommendation, decision proposal, handoff, review, QA, human governed decision | Generic `WorkArtifact` validates an envelope, not offer semantics |
| Sales coordinator guard | Phase 6 `validateArtifact` | Organization coordinator | Rejects `realCustomerContact`, `unsupportedCapability`, and `unsupportedGuarantee`; common provenance and role attribution | Booleans are output assertions; there is no positive proof that every line is supported, priced, eligible, or approved |
| Scout opportunity candidate | `OpportunityCandidate`, `ai-business-os.scout/1.0.0` | Smart Scout | Domain-neutral audience/problem/motivation, product and capability refs, evidence, contradictions, unknowns, confidence basis, limitations, version | Candidate is not a qualified opportunity; no customer/account identity, owner, amount, stage, close date, or qualification decision |
| Scout evidence | `ScoutSourceObservation`, `ScoutLiveEvidence`, `ScoutOutcomeFeedback`, version `1.0.0` | Smart Scout | Source/version/provenance, freshness and outcome feedback foundations | Does not establish commercial consent or Sales eligibility |
| Analyst assessment | `AnalystAssessment`, `ai-business-os.analyst/1.0.0` | Smart Analyst | Evidence-backed analysis, disposition, confidence, limitations, provenance, version | Dispositions advance experiments, request evidence, hold/reject/escalate; no canonical Sales qualification contract |
| Experiment artifacts | `ExperimentProposal` / `ExperimentResult`, Experiment Manager `1.1.0` over Organization `1.0.0` | Experiment Manager | Versioned proposal, human approval, runs, measurements, truthful result classes and handoffs | Experiments do not constitute customer consent, an offer, or an accepted obligation |
| Economics input and result | `EconomicInput` / `EconomicAssessment`, economics schema `ai-business-os.economics/1.0.0` | Economics | Immutable versioned inputs, evidence scope, unknown semantics, deterministic metrics/lineage, scenarios, sensitivity, portfolio, calibration and reconciliation | No Sales price book, price selection, discount authority, quote line, or offer approval |
| Governed economic workflow | `OpportunityCandidate → AnalystAssessment → ExperimentProposal → EconomicAssessment` | Organization + Economics | Digest/version-bound chain and human-only `GovernedDecision`; currently authorizes `EXPERIMENT_EXECUTION` | Stops before Sales; its `APPROVED` means experiment execution approval, not offer publication/contract approval |
| Independent QA | `QAAssessment` and `ReviewRecord`, Organization `1.0.0` | Independent QA | Separate reviewer, canonical verdicts, evidence required for PASS | No Sales acceptance contract, Sales Gold matrix, or proposal QA suite |
| Closed-world opportunity/offer/order | Simulation `ai-business-os.closed-world-simulation/1.0.0` | Synthetic World | Deterministic fixture opportunity; `MAKE_SYNTHETIC_OFFER`; customer-rule acceptance; order/obligation; ledger; replay controls | Offer has only id/opportunity/customer/price/status/time; hidden acceptance rule is fixture truth, not Sales qualification or real consent |
| Synthetic obligation | `SyntheticObligation`, simulation `1.0.0` | Synthetic World | Locks criteria, price, deadline, production and QA requirements after accepted synthetic offer | Not a commercial production contract and lacks proposal version/signature/terms provenance |
| External action boundary | `ExternalActionRequest`, `ExternalApproval`, `ExternalActionReceipt`, airlock `ai-business-os.real-world-airlock/1.0.0` | Real-world airlock | Payload hash, actor/grant/policy, scoped expiring approval, idempotency, kill switches, receipt/verification separation | Does not decide whether an offer is true, qualified, economically sound, or legally acceptable |
| External obligation | `ExternalObligation`, real-world `1.0.0` | Thin Body | Snapshots offer; separates payment, production, QA and delivery state | `acceptOffer()` trusts caller-supplied acceptance evidence and is tied to one Phase 9 fixture; no general acceptance verifier |
| Phase 9 canonical fixture | `offer.30-day-fitness-challenge@1.0.0` | Thin Body adapter | Demonstrates locked scope, exclusions, price, criteria, evidence and authority requirements | Fitness-specific, single offer, dry-run; expressly not a reusable Sales catalog or proof of demand |
| Controlled-live plan | `first-live-organism-test-plan@2.0.0` | Phase 9B controlled live | One participant, trial-first, bounded $50 continuation, zero acquisition spend, payment-state separation | `actualLiveExecutionAuthorized:false`; not a general Sales pathway or certification |

### 3.1 Existing Sales test evidence

- Phase 6 verifies the registered role is complete configuration, shares the common runtime, routes through governed Work, rejects the three named Sales violations, preserves organization isolation, provenance, immutable artifact storage, and replay idempotency.
- Phase 8 verifies an authorized **synthetic** Sales action can become a synthetic accepted offer/order/obligation, distinguishes quoted/pending/settled/refunded money, and fails closed for policy prohibitions.
- Phase 9 verifies a **dry-run fixture** outbound request crosses the airlock only with matching authorization and approval, locks a single offer snapshot into an external obligation, and preserves payment/QA/delivery distinctions.
- No test constructs and validates a canonical `QualifiedOpportunity`, reusable `OfferProposal`, proposal revision, concession, multi-product configuration, negotiation, conversion cohort, forecast, or Sales certification report.

## 4. Existing Sales architecture and actual production pathway

### 4.1 Requested pathway versus repository reality

| Transition | Actual repository path | Determination |
|---|---|---|
| Opportunity | Scout can emit versioned `OpportunityCandidate`; Phase 8 World exposes fixture opportunities; Phase 9 harness ingests one replay fixture observation. | **PARTIAL.** Candidate identity exists, but no canonical cross-role commercial Opportunity aggregate exists. |
| Opportunity → Qualification | Analyst can assess a candidate and can recommend experimentation; Phase 6 declares `SALES_CANDIDATE` only in a generic organization enum unused by the newer Analyst contract. | **MISSING as a Sales transition.** There is no qualification record, criteria snapshot, decision, state machine, or tested handoff to Sales. |
| Qualification → Offer Proposal | Sales is configured to accept Analyst/Economics/Capability artifacts and emit an artifact *named* `OfferProposal`. | **MISSING semantically.** No offer schema, builder, capability resolver, price binding, repository, executor, or acceptance tests exist. |
| Offer Proposal → Authorization | Generic `RoleDecisionProposal` and human-only `GovernedDecision` exist; Phase 9 airlock has external action approval. Economics workflow authorization is scoped to experiment execution. | **PARTIAL primitives, missing Sales binding.** No proposal digest/version/scope is bound to an offer-approval decision. |
| Authorization → Customer Acceptance | Phase 8 World produces deterministic synthetic acceptance; Phase 9 harness inserts `replay:customer-acceptance`. | **MISSING in production.** Synthetic/replay evidence is not real consent and there is no acceptance-verification contract. |
| Acceptance → Commercial Obligation | `SyntheticObligation` works in Phase 8. `acceptOffer()` creates an `ExternalObligation` with a full offer snapshot in Phase 9. | **PARTIAL.** Useful snapshot pattern, but no reusable governed acceptance adjudication, legal/contract authority, or Sales-domain integration. |
| Obligation → Production | Phase 6 Production consumes `AuthorizedObligation`; Phase 8 allocates and produces against synthetic obligation; Phase 9 records production against its fixture obligation. | **PARTIAL.** There is no canonical adapter from an authorized reusable commercial obligation to Production Work, capacity validation, and acceptance contract. |

There is therefore **no end-to-end production Sales pipeline** matching the requested path. The only complete sequence is Phase 8 closed-world simulation; Phase 9 is an explicitly dry-run, fitness-specific Thin Body demonstration. Any diagram that labels these fixtures as a deployed sales funnel would be false.

### 4.2 Current integration boundaries and missing handoffs

1. **Scout → Analyst:** implemented within specialized integration code and generic Work patterns; reusable candidate/evidence references exist.
2. **Analyst → Experiment Manager:** implemented for experiment recommendations and tested; it does not produce a qualified Sales opportunity.
3. **Experiment Manager → Economics:** implemented through explicit results and the economic workflow; immutable references, approval, and reconciliation exist.
4. **Economics → Sales:** declared only by the Sales role's input artifact list. No typed handoff, compatibility rule, freshness policy, version pin, or Sales consumer exists.
5. **Capability registry → Sales:** `CapabilityEvidence` is only a declared input name. Phase 4 has a tool capability registry and Phase 8/9 have fixture capability data, but no canonical product/service capability evidence contract is resolved into offer lines.
6. **Sales → governance:** generic decision and airlock primitives exist; no Sales-specific approval purpose, proposal digest binding, concession scope, expiry, or supersession handling exists.
7. **Sales → customer boundary:** Phase 9 airlock is reusable for an authorized external request, but the dry-run harness hard-codes one outbound fixture. Sales cannot infer consent from a receipt.
8. **Customer acceptance → obligation:** snapshot patterns exist, but no verified acceptance service connects exact accepted proposal version, authorized terms, actor identity, timestamp, evidence, and non-repudiation semantics.
9. **Obligation → Production:** declared and demonstrated synthetically; no generic production-handoff adapter validates capability/capacity/criteria against the exact accepted proposal.
10. **Sales → Independent QA:** generic review is available, but no Sales QA acceptance contract or dedicated independent suite exists.

## 5. Enterprise benchmark (fresh external verification)

This benchmark was freshly checked on 2026-10-05 against publicly accessible official vendor documentation. It extracts architectural principles, not vendor UI or product parity requirements.

### 5.1 Observed mature-system patterns

| System / practice | Authoritative pattern | Applicable Business OS principle | Authority that remains external |
|---|---|---|---|
| Salesforce Sales Cloud | Opportunity stages map to forecast categories; forecast types can aggregate opportunity, product, split, territory, schedule, or custom measures. Historical-trending and opportunity-with-products/quotes report types retain commercial context. ([Forecasting elements](https://help.salesforce.com/s/articleView?id=forecasts3_definitions.htm&language=en_US&type=5), [opportunity report types](https://help.salesforce.com/s/articleView?id=reports_oppforesales_custom.htm&language=en_US&type=5)) | Separate pipeline stage, forecast category, forecast measure, scope, and as-of period. Retain product/quote lineage and historical stage events. Never treat a probability-weighted amount as actual revenue. | Seller/manager judgment, approved stage definitions, territory/credit policy, accounting truth |
| HubSpot CRM / Revenue Hub | Lifecycle stages distinguish Sales Qualified Lead, Opportunity, and Customer. Deal stages carry probabilities; forecast categories and manual submissions coexist. Quote approvals can be triggered by amount, discount, SKU, terms, billing, payment and sequential approvers. ([Lifecycle stages](https://knowledge.hubspot.com/records/use-lifecycle-stages), [pipeline stages](https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines), [forecast tool](https://knowledge.hubspot.com/forecast/use-the-forecast-tool), [quote approvals](https://knowledge.hubspot.com/quotes/quote-approval-use-cases-and-commonly-used-properties)) | Qualification is explicit and distinct from an opportunity. Pipeline and customer lifecycle are separate dimensions. Forecasts need stage-derived and human-judgment lanes. Concessions/terms require declarative rules and sequential external approvals. | Contact permission, seller/manager forecast judgment, legal approval, buyer acceptance, signature/payment |
| Microsoft Dynamics 365 Sales | A qualified lead may become an opportunity; opportunities carry products, price overrides, discounts, estimated revenue/probability/close date. Quotes progress Draft → Active/read-only → Closed and revisions increment an ID. Accepted quotes become orders; fulfilled orders and invoices remain separate transitions. ([Create opportunity](https://learn.microsoft.com/en-us/dynamics365/sales/developer/create-opportunity), [manage quote/order/invoice](https://learn.microsoft.com/en-us/dynamics365/sales/sales-transactions), [quote/order/invoice tables](https://learn.microsoft.com/en-us/dynamics365/sales/developer/quote-order-invoice-entities)) | Use explicit aggregates and transitions; activate an immutable customer-facing version; create a new revision rather than mutating it; preserve opportunity/product/customer lineage into the quote/order; distinguish accepted order, fulfillment, and invoice. | Catalog administration, discount permission, customer acceptance, legal contracting, fulfillment and billing/accounting |
| Enterprise CPQ / quote-to-cash | Vendor documentation consistently centers catalog products/line items, price lists, compatibility/configuration, discounts, totals, effective dates, approval chains, quote activation/version locking, order conversion, billing and payment as distinct responsibilities. Dynamics documents line-level and overall discounts and permission requirements; Salesforce Revenue Cloud documents approval chains and a broader quote-to-cash lifecycle. ([Dynamics quote model](https://learn.microsoft.com/en-us/dynamics365/sales/developer/quote-order-invoice-entities), [Salesforce Revenue Cloud overview](https://www.salesforce.com/en-us/wp-content/uploads/sites/4/documents/PDF/slc-cpq-revenue-cloud-datasheet.pdf)) | Build Sales as configure/propose/justify, not cash or fulfillment. Bind every offer line to catalog/capability/pricing evidence; fail incompatible bundles; require approvals for exception dimensions; snapshot accepted versions into obligations. | Product, price, tax, legal, credit, signature, payment, invoicing and fulfillment authorities |
| Revenue Operations | CRM/forecast products expose common themes: controlled stage definitions, required stage data, ownership, timestamps/history, goals, weighted versus total pipeline, forecast categories, close-date windows, won/lost outcomes, and permissioned adjustments. | Define a canonical event ledger; calculate conversion and forecast from immutable events and authoritative actuals; measure calibration by cohort; expose overrides with actor/reason rather than rewriting model truth. | Operating-process definition, quotas/goals, manager commits, accounting-recognized revenue and business acceptance |

### 5.2 Patterns appropriate for an AI Business OS

- Canonical identities and immutable, attributable versions for opportunities, qualifications, offers, approvals, acceptances, obligations and lifecycle events.
- Deterministic, policy-versioned state transitions with preconditions and fail-closed invalid transitions.
- Product/capability compatibility checks before proposal construction.
- Economics-owned price/margin/sensitivity outputs referenced rather than recalculated by Sales.
- Declarative discount/concession constraints plus external approval for exceptions.
- Evidence-grounded qualification, proposal rationale, objection classification, forecasts and loss analysis.
- Event-sourced audit/replay, organization isolation, independent QA and explicit unknowns.
- Separate modeled pipeline, manager judgment and authoritative actuals.

### 5.3 Patterns that cannot become autonomous Sales authority

The Business OS may prepare and analyze, but external authenticated actors/systems must own contact permission, publication/send, price/policy exceptions, legal terms, signature/acceptance, payment verification, accounting revenue recognition, production authorization, fulfillment, delivery acceptance, refunds, and human commercial judgment. An external CRM may be a future adapter/system of record; it must not become a second organizational brain.

## 6. Proposed Sales Gold definition

**Sales Gold:** a deterministic, governed commercial reasoning capability that transforms a *qualified* opportunity into a truthful, economically supported and capability-validated **offer proposal**. Gold ends at a reviewable proposal and governed cross-role handoff. It does not contact a prospect, publish an offer, accept on a customer's behalf, charge money, or authorize fulfillment.

### 6.1 Gold capability gap matrix

| # | Requirement | Status | Existing implementation / evidence path | Current tests | Missing behavior | Risk | Recommended phase | Dependency | Acceptance criterion |
|---:|---|---|---|---|---|---|---|---|---|
| G1 | Canonical opportunity identity | `PARTIAL` | Scout `OpportunityCandidate` has id/org/version; simulation has fixture opportunity ids | Scout Platinum; Phase 8 | Cross-role aggregate, stable customer/account link, lifecycle/version/digest | High | SALES-1 | Scout | Same scoped opportunity resolves deterministically; conflicts/scope mismatch fail closed |
| G2 | Customer need representation | `PARTIAL` | Candidate audience/problem/motivation/customer language, evidence/unknowns | Scout tests | Structured needs, priority, constraints, stakeholder and consent classifications | High | SALES-1 | Scout/Analyst | Need snapshot is evidence-linked, versioned, and distinguishes stated fact/inference/unknown |
| G3 | Qualification criteria | `MISSING` | Analyst assessment and dispositions are reusable inputs | Analyst tests only | Criteria schema, result/reasons, criterion evidence, disqualify/escalate, version binding | Critical | SALES-2 | SALES-1, Analyst | Deterministic criteria yield qualified/not-qualified/more-evidence with complete lineage |
| G4 | Evidence provenance | `PARTIAL` | Scout/Analyst provenance; Organization Work artifact envelope | Cross-role provenance tests | Proposal claim-to-source map, freshness/supersession/contradiction rules | High | SALES-1/2 | Memory/evidence, Scout | Every qualification and offer claim traces to admissible current evidence; missing/contradictory evidence blocks |
| G5 | Product/service capability validation | `MISSING` | Phase 4 capability registry; fixture capabilities; declared `CapabilityEvidence` input | General capability and synthetic tests | Canonical sellable capability snapshot, readiness/capacity/scope compatibility, limitation resolution | Critical | SALES-3 | Production, capability registry | Every offer line maps to supported current capability and criteria; unsupported/expired evidence blocks |
| G6 | Offer construction | `MISSING` | Output name `OfferProposal`; one Phase 9 fixture | Envelope/fixture tests | Typed offer/header/lines/terms/criteria/expiry/limitations/evidence and deterministic builder | Critical | SALES-3 | G1–G5 | Same inputs/policy produce same proposal digest; malformed or unsupported line fails |
| G7 | Pricing and Economics integration | `PARTIAL` | Economics `1.0.0`, scenarios/sensitivity/portfolio; declared Sales input | Economics suites | Sales handoff pins assessment/scenario/version; pricing selection and unknown/expiry policy | Critical | SALES-4 | Economics, SALES-3 | Proposal price/range reconciles exactly to authoritative approved economic evidence; Sales cannot overwrite it |
| G8 | Commercial limitations | `PARTIAL` | Generic artifact limitations; fixture exclusions; coordinator rejects unsupported guarantees | Phase 6/9 | Required limitation taxonomy, line/offer applicability, customer-visible claim validation | High | SALES-3 | Capability/policy | Omitted required limitation, prohibited claim, or guarantee blocks proposal |
| G9 | Proposal identity/versioning | `MISSING` | Generic id/version and economic digest utility; Phase 9 offer version | Generic conflict tests | Canonical proposal ref/digest, immutable revisions, supersession, current-version rules | Critical | SALES-1/3 | Organization artifacts | Published proposal versions cannot mutate; revision links predecessor and changes; stale approval fails |
| G10 | Human approval boundaries | `PARTIAL` | Human-only governed decision; airlock external approval | Economics workflow; Phase 9 | Sales approval purpose/scope binds exact proposal/version/digest/expiry/concessions | Critical | SALES-4 | Kernel/governance | AI can only request approval; mismatched, expired, revoked, wrong-scope or machine approval blocks |
| G11 | Rejection and escalation | `PARTIAL` | Work states, role escalation behavior, decisions, diagnostics | Phase 6 tests | Sales reason codes and deterministic routes for qualification/capability/economic/policy/review failures | High | SALES-2/4 | Work routing | Each terminal/non-terminal failure records reason, evidence, owner and permitted next states |
| G12 | Deterministic replay | `PARTIAL` | Work execution idempotency; canonical Economics replay; simulation checkpoints | Phase 6/8/Economics | Sales input snapshot, policy/engine version, canonical serialization and replay report | High | SALES-4 | SALES-1–3 | Identical bound inputs reproduce byte-equivalent semantic output/digest without duplicate effect |
| G13 | Cross-role handoff | `PARTIAL` | Generic `HandoffRecord`; declared role I/O; economics chain | Phase 6/Economics | Typed Scout/Analyst/Economics/Capability → Sales and Sales → governance/QA handoffs | High | SALES-4 | All upstream roles | Incorrect role/type/org/work/version/digest/freshness is rejected; valid chain remains attributable |
| G14 | Independent QA | `PARTIAL` | Independent reviewer/evidence-required PASS | Phase 6 QA tests | Sales QA contract, exact proposal checks, QA independence across producer/approver | Critical | SALES-5 | SALES-1–4 | Separate QA actor validates all Gold criteria and cannot pass absent evidence |
| G15 | Gold acceptance tests | `MISSING` | No Sales test/certification module | None specific | Positive, negative, boundary, isolation, immutability, replay and adversarial matrix | Critical | SALES-5 | SALES-1–4 | Entire independent Gold matrix passes; human gates remain pending where applicable |

**Gold determination:** 0 of 15 capabilities are fully implemented as Sales-domain capabilities; 9 are partial reusable foundations and 6 are missing. This is a strict non-certification result, not a statement that the shared architecture is immature.

## 7. Proposed Sales Platinum definition

**Sales Platinum:** an enterprise-grade commercial intelligence capability over Gold that provides governed pipeline management, compatible multi-product offers, bounded negotiation analysis, conversion intelligence, calibrated forecasting, and commercial lifecycle visibility. It remains advisory/proposal-oriented and never independently acquires contracting, payment, accounting, or fulfillment authority.

### 7.1 Platinum capability gap matrix

| # | Requirement | Status | Existing implementation / evidence path | Current tests | Missing behavior | Risk | Recommended phase | Dependency | Acceptance criterion |
|---:|---|---|---|---|---|---|---|---|---|
| P1 | Pipeline state and transition governance | `MISSING` | Economic workflow states are experiment-centric; Work states are execution states | Economic workflow tests | Commercial state machine, preconditions, actor/policy, reopen/expire/lost rules | Critical | SALES-6 | Gold | Illegal transitions fail closed; every legal transition is attributable and replayable |
| P2 | Commercial event history | `PARTIAL` | Kernel lifecycle events, organization events, simulation transitions | Phase 1/6/8 | Canonical Sales event taxonomy, sequencing, corrections/supersession and query model | High | SALES-6 | SALES-1 | Event history reconstructs pipeline state and preserves prior truth |
| P3 | Multi-product offer compatibility | `MISSING` | Economics portfolio is descriptive; mature systems benchmark only | Economics portfolio tests | Offer lines, bundles, prerequisites/exclusions, currency/term alignment, compatibility graph | Critical | SALES-7 | Gold capability validation | Compatible bundle passes deterministically; conflict/unknown blocks without silent pruning |
| P4 | Discount and concession constraints | `MISSING` | Economics has discount category; generic external approval | Economics input tests | Floors/ceilings, authority matrix, cumulative concessions, expiry, margin impact | Critical | SALES-7 | Economics/governance | Unauthorized or economically invalid concession blocks; exact exception approval is bound |
| P5 | Governed negotiation | `MISSING` | None beyond generic revisions/decisions | None | Versioned positions, objection/evidence, allowed moves, concession analysis, human decision | Critical | SALES-7 | P3/P4 | AI proposes bounded alternatives only; no contact/acceptance; stale or prohibited terms fail |
| P6 | Proposal versioning | `MISSING` | Generic artifact version; fixture quote version | Generic tests | Revision lineage, active/frozen/superseded/expired status and customer-facing identity | Critical | SALES-7 | Gold G9 | Approved/active version immutable; changes create revision; acceptance binds exact active version |
| P7 | Customer acceptance evidence | `PARTIAL` | Phase 8 synthetic response; Phase 9 caller-provided replay evidence and snapshot | Phase 8/9 | Verifier for identity, intent, exact proposal/digest, time, channel, authority, revocation/ambiguity | Critical | SALES-9 | Airlock/external identity | Only verified external evidence can create acceptance state; receipt/provider acceptance alone cannot |
| P8 | Conversion analytics | `PARTIAL` | Scout feedback counts and simulation metrics | Scout/Phase 8 | Event-derived funnel definitions, denominators, cohorts, windows, late events, uncertainty | High | SALES-6 | P1/P2 | Metrics reproduce from event history with declared cohort/window and never infer absent events |
| P9 | Revenue forecasting | `MISSING` | Economics scenarios are not Sales forecasts; simulation metrics are actual synthetic outcomes | Economics/Phase 8 | Pipeline amount/timing/categories, forecast snapshots, model/human judgment separation | Critical | SALES-8 | P1/P2, Economics | Forecast is versioned, scoped, as-of, reproducible and explicitly not actual revenue |
| P10 | Forecast calibration | `PARTIAL` | Economics historical expectation-vs-actual calibration primitive | Economics calibration tests | Sales cohort forecasts matched to authoritative outcomes, error metrics and drift gates | High | SALES-8 | P9, Economics calibration | Comparable cohorts yield deterministic calibration; non-comparable/missing actuals report unknown |
| P11 | Loss and objection analysis | `MISSING` | Phase 8 rejection and Scout contradictions are primitive signals | Synthetic tests | Canonical reasons, multi-cause evidence, objection history, non-causal descriptive analysis | Medium | SALES-6/8 | P2 | Analysis traces to events/evidence, preserves unknown/other and makes no unsupported causal claim |
| P12 | Customer lifecycle state | `MISSING` | Phase 9 customer record arrays; controlled participant | Phase 9 | Domain-neutral customer commercial lifecycle separate from pipeline/delivery and consent | Critical | SALES-8 | Identity/privacy | State derives from authoritative events; opportunity/customer/fulfilled states cannot be conflated |
| P13 | Cross-product commercial visibility | `PARTIAL` | Economics portfolio aggregates compatible economic artifacts | Economics portfolio tests | Sales portfolio view across opportunities/offers/lifecycle without double counting or data leakage | High | SALES-8/9 | P3, Economics portfolio | Scoped view shows coverage and unknowns; overlapping units/orgs fail closed |
| P14 | Economics integration | `PARTIAL` | Production-grade deterministic Economics suite | Extensive Economics tests | Platinum forecast/concession/portfolio bindings and freshness/reconciliation contracts | Critical | SALES-9 | SALES-4/6–8 | Every commercial amount states classification/source/as-of; Economics remains calculation authority |
| P15 | Production handoff | `PARTIAL` | Synthetic and one-fixture obligations; Production role input declaration | Phase 6/8/9 | Generic accepted-offer → authorized obligation → capacity/production Work contract | Critical | SALES-9 | P7, Production | Only exact verified acceptance plus external authorization creates immutable obligation; unsupported capacity blocks |
| P16 | Independent QA, audit and replay | `PARTIAL` | Generic QA, immutable artifacts, events, simulation/economic replay | Cross-system tests | Platinum Sales QA matrix and whole-lifecycle deterministic audit bundle | Critical | SALES-10 | SALES-6–9 | Independent suite reconstructs and verifies every state/amount/version/decision without producer self-pass |
| P17 | Adversarial fail-closed behavior | `PARTIAL` | Strong generic isolation/authority and synthetic adversarial tests | Phase 6/8/9/Economics | Sales-specific attacks: forged consent, stale pricing, bundle conflict, discount split, stage inflation, forecast leakage, replay/version confusion | Critical | SALES-10 | All | All enumerated attacks block safely, preserve audit evidence, and create no contact/obligation/payment/fulfillment effect |

**Platinum determination:** no Platinum capability is fully implemented in the reusable Sales domain; 8 have partial cross-system foundations and 9 are missing. Platinum is blocked in practice on completion and independent certification of Gold, though individual foundation work can be designed earlier.

### 7.2 Required versus optional beyond Platinum

Required for Platinum are the 17 capabilities above. Optional later extensions include external CRM synchronization, territory/quota administration, sales engagement sequencing, document rendering/e-signature adapters, tax/credit integrations, subscription billing, commission calculation, predictive/ML lead scoring, conversational call analysis, and autonomous workflow suggestions. None is required to truthfully certify the bounded intelligence role, and each external effect needs a separate governed adapter and authority review.

## 8. Cross-role dependency map

```text
approved evidence sources
        │
        ▼
SMART_SCOUT ── OpportunityCandidate + provenance ──► SMART_ANALYST
        │                                              │
        │                              evidence assessment / questions
        │                                              ▼
        └──────────────────────────────► EXPERIMENT_MANAGER
                                                       │ approved proposal/result
                                                       ▼
ECONOMICS ◄── evidence-backed inputs/results ──────────┘
    │ authoritative calculation, unknowns, scenarios, sensitivity, portfolio
    │
    ├──────────────┐
    ▼              ▼
SALES          capability/production registry
 qualification + capability/economic validation + immutable offer proposal
    │
    ├──► INDEPENDENT_QA (proposal contract/evidence review)
    │
    └──► GOVERNANCE / HUMAN AUTHORITY (exact version/digest and concession scope)
             │
             ▼
       THIN BODY / AIRLOCK (contact or publication only if separately authorized)
             │
             ▼
 external customer acceptance evidence verifier
             │
             ▼
 immutable commercial obligation ──► PRODUCTION ──► INDEPENDENT_QA ──► delivery adapter
             │                            │                  │
             └──────── observed economic/customer outcomes ─┴──► ECONOMICS / LEARNING
                                                                      │
                                                         proposal-only organizational learning
```

Ownership rules:

- Scout owns discovery evidence and candidates, not qualification or offer claims.
- Analyst owns evidence assessment, not customer consent or pricing.
- Experiment Manager owns governed experiments, not offers.
- Economics owns economic calculations/classification; Sales references them and cannot override them.
- Sales owns commercial reasoning and proposal artifacts, not publication, acceptance, money, or fulfillment.
- Governance/humans own approval; external evidence owns customer action truth.
- Production owns fulfillment planning/execution against an authorized immutable obligation, never promise mutation.
- Independent QA owns acceptance verdicts and cannot share producer identity.
- Learning proposes changes; it cannot silently alter Sales policy, qualification, forecasts or offers.
- Thin Bodies translate approved actions/evidence and remain replaceable adapters, not role-specific brains.

## 9. Authority boundaries and invariants

### 9.1 Non-equivalences

| State A | Is not | Required evidence/authority to cross |
|---|---|---|
| `OPPORTUNITY` | `QUALIFIED OPPORTUNITY` | Versioned criteria evaluation with admissible evidence and explicit disposition |
| `PROPOSAL` | `APPROVED OFFER` | External human/policy decision bound to exact proposal id, version, digest, scope, amount/terms and expiry |
| `APPROVED OFFER` | `CUSTOMER ACCEPTANCE` | Verified customer identity/intent and exact accepted version through an authorized channel |
| `CUSTOMER ACCEPTANCE` | `VERIFIED PAYMENT` | Authoritative payment-provider evidence and reconciliation; a checkout/session/authorization is not settlement |
| `VERIFIED PAYMENT` | `FULFILLED OBLIGATION` | Production evidence, independent QA, delivery evidence and required customer-result state |
| `FORECAST REVENUE` | `ACTUAL REVENUE` | Authoritative actual event and Economics/accounting classification; probabilities never convert estimates to actuals |

### 9.2 Prohibited Sales authority

Sales must fail closed rather than:

- invent customer consent or treat an outbound/provider receipt as acceptance;
- contact a real prospect or publish an offer without current scoped authorization and contact eligibility;
- promise a capability absent current, compatible evidence or guarantee an unverified outcome;
- override Economics classifications, unknowns, limits, calculation lineage, pricing policy or margin restrictions;
- approve its own discount, concession, exceptional term, proposal, or QA verdict;
- fabricate payment confirmation or classify requested/pending/authorized money as settled revenue;
- create an obligation without exact-version customer acceptance and separate authorization;
- allocate production, alter accepted scope, or self-certify fulfillment/delivery;
- mutate prior artifacts/events to improve pipeline, conversion or forecast appearance;
- cross organization, customer, product, work, policy-version, evidence-sensitivity or retention boundaries.

## 10. Recommended bounded roadmap

The proposed SALES-1–10 decomposition is sound if each phase remains independently shippable. SALES-3 and SALES-4 must remain separate because offer truth/capability and economic/approval authority fail differently. SALES-6 should combine pipeline events and conversion definitions because conversion must be derived from the same event truth. SALES-8 may implement forecast and lifecycle in separate internal milestones but should retain one bounded integration phase. No phase creates a Sales runtime.

| Phase | One primary responsibility | Inputs → outputs | Dependencies | Implementation boundaries | Acceptance and adversarial expectations | Stopping condition |
|---|---|---|---|---|---|---|
| SALES-1 | Canonical commercial contracts | Scout candidate, evidence refs → `CommercialOpportunity`, need snapshot, artifact refs, proposal identity primitives | Phase 6, Scout | Contracts/validators/repository semantics only; no qualification or offer builder | Version/digest/scope/immutability; reject duplicates, mutation, cross-org/work/customer refs, malformed/superseded refs | Contracts and deterministic repository tests pass; no reasoning implemented |
| SALES-2 | Opportunity qualification | Commercial opportunity + Analyst evidence + policy version → `QualificationAssessment` and disposition | SALES-1, Analyst | Deterministic criteria evaluator; no product offer/pricing | Positive/negative/more-evidence/escalation; reject missing, stale, contradictory, circular or cross-scope evidence | Qualified opportunity can be proven and replayed; cannot create offer |
| SALES-3 | Offer and capability validation | Qualified opportunity + capability/product evidence → immutable `OfferProposal` revision | SALES-1/2, Phase 4 capability, Production readiness | Single/multi-line-ready schema but Gold can constrain to one compatible offer; no price authority or sending | Unsupported/expired capability, missing limitation, incompatible criteria, guarantee injection and stale revision fail | Truthful capability-bound proposal shell exists; economic/approval state remains blocked |
| SALES-4 | Economics and governance integration | Proposal + authoritative Economics refs + policy → economically bound proposal and approval request | SALES-3, Economics, kernel/governance | Reference Economics outputs; do not change Economics contracts or calculate independent truth; no external action | Unknown/stale/mismatched economics, amount tampering, discount override, machine/self/expired/revoked approval and replay attacks fail | Reviewable exact-version proposal can receive a human decision; still cannot contact customer |
| SALES-5 | Gold certification | SALES-1–4 fixtures and production paths → independent Gold report/readiness evidence | SALES-1–4, Independent QA | Certification and minimal proven defect repair only; no Platinum scope | Full 15-capability matrix, isolation, determinism, provenance, authority, mutation and prompt-injection attacks | Machine Gold criteria pass; required human acceptance remains externally recorded; no Platinum claim |
| SALES-6 | Pipeline and conversion intelligence | Gold events/outcomes → governed pipeline state, commercial event history, conversion cohorts | SALES-5 | Descriptive lifecycle/event engine; no forecasting or negotiation | Illegal/backdated/out-of-order transition, stage inflation, deletion, denominator and late-event attacks | Pipeline reconstructs exactly from events and produces reproducible conversion metrics |
| SALES-7 | Negotiation and multi-product offers | Gold proposals + catalog/capability/economics + objections → compatible proposal revisions and bounded concession alternatives | SALES-6, Economics, governance | Proposal analysis only; no communications, contract acceptance or self-approval | Bundle cycles/conflicts, currency/term mismatch, split discounts, cumulative concessions, stale price and unauthorized terms fail | Multi-product revisions are compatible, economically grounded and approval-bound |
| SALES-8 | Forecasting and commercial lifecycle | Pipeline/event history + authoritative outcomes/calibration → forecast snapshots, calibration, loss/objection and customer lifecycle views | SALES-6/7, Economics calibration | Deterministic descriptive/model outputs; no actual-revenue claim or accounting | Leakage, hindsight, non-comparable cohorts, missing actuals, duplicate pipeline value and lifecycle conflation fail | Forecasts are reproducible/as-of/calibrated and explicitly separated from actuals; lifecycle derives from events |
| SALES-9 | Cross-role commercial integration | Platinum artifacts/acceptance evidence → verified obligation and Production handoff; portfolio visibility/feedback | SALES-6–8, airlock, Production, QA, Economics | Adapters only at Thin Body; no CRM implementation, payment or fulfillment authority | Forged/ambiguous consent, provider receipt confusion, wrong proposal version, replay, cross-customer/org, capacity mismatch and QA bypass fail | Exact accepted version becomes one authorized immutable obligation and traceable handoff; no duplicate effects |
| SALES-10 | Platinum certification | SALES-6–9 plus Gold evidence → independent Platinum audit/replay/certification report | SALES-5–9, Independent QA | Certification and minimal defect repair only; optional extensions excluded | Full adversarial matrix including contact, consent, pricing, negotiation, forecast, obligation, payment and fulfillment attacks | All machine Platinum criteria pass, external/human gates remain correctly pending, limitations published |

## 11. Risks and unresolved questions

| Risk / question | Severity | Required resolution owner / phase |
|---|---|---|
| Which canonical identity service owns customer/account identity while preserving privacy and organization isolation? | Critical | Architecture/security before SALES-1 |
| Is `OpportunityCandidate` promoted into a new commercial aggregate or referenced immutably? Avoid two competing opportunity truths. | Critical | SALES-1 ADR |
| What is authoritative for sellable product, capability readiness, capacity, terms and acceptance criteria? Phase 4 tool capabilities are not automatically sellable capabilities. | Critical | Product/Production architecture before SALES-3 |
| Which economic artifact is permitted for list price, proposed price, range, discount and margin, and what freshness policy applies? | Critical | Economics/governance in SALES-4; no Economics contract changes in SALES-0 |
| What human/legal authority approves standard terms versus exceptional concessions, and how is delegation/revocation represented? | Critical | Governance/legal outside Sales, integrated SALES-4/7 |
| What constitutes verified customer acceptance per channel/jurisdiction, and which system is record authority? | Critical | Legal/security/adapter governance before SALES-9 |
| Production currently declares `AuthorizedObligation`, while real-world code defines `ExternalObligation`; canonical ownership and adapter semantics are unresolved. | Critical | Organization + Production + real-world architecture in SALES-9 |
| Phase 9's fitness offer is valuable boundary evidence but creates a high risk of accidental domain hardcoding. | High | Enforce domain-neutral SALES-1–10 fixtures and adapters |
| Generic Work artifacts are frozen but only one artifact id is retained; robust immutable revision/current-index semantics need an explicit repository. | High | SALES-1 |
| Forecast ground truth must be defined without converting payment settlement, invoicing or accounting concepts into Sales-owned truth. | Critical | Economics/finance governance in SALES-8 |
| External CRM eventual consistency, deletions, correction events and source-of-record precedence are intentionally unresolved and optional post-Platinum. | Medium | Future adapter ADR |
| Human acceptance and legal/commercial policy cannot be self-certified by machine tests. | Critical | Authenticated Admin/legal authority throughout |

## 12. Recommended SALES-1 scope

SALES-1 should deliver **contracts, validation and immutable identity only**:

1. Create `src/business-os/sales/` using the shared runtime, with a versioned contract module for:
   - `CommercialOpportunityReference` (or a carefully named aggregate if an ADR chooses promotion rather than reference);
   - `CustomerNeedSnapshot` with claim classifications and evidence refs;
   - `CommercialArtifactReference` with id/version/digest/org/work;
   - `OfferProposalIdentity` / revision metadata without constructing an offer;
   - explicit status/reason enums sufficient for later qualification and supersession.
2. Publish an ADR resolving ownership relative to Scout `OpportunityCandidate`, customer identity, Organization `WorkArtifact`, and future proposal versions.
3. Implement validation and an organization-scoped append-only/in-memory repository consistent with current repository patterns, including deterministic canonicalization/digests and explicit current/superseded resolution.
4. Add tests for required fields, immutable snapshots, stable digests, revision lineage, duplicate/version conflict, organization/work/customer isolation, tampering, supersession, malformed refs and deterministic replay.
5. Integrate only at role I/O contract declarations if necessary; do not implement qualification, offer construction, price selection, capability decisions, approval, contact, acceptance, obligation, forecasting, CRM or UI.

**SALES-1 acceptance:** downstream work can reference one unambiguous, organization-scoped, immutable commercial identity and evidence-bearing customer-need snapshot, but cannot yet claim it is qualified or create/send an offer.

## 13. Evidence references

### 13.1 Repository evidence

- `src/business-os/organization/roles.js` — actual Sales configuration and shared role-registry contract.
- `src/business-os/organization/contracts.js` — generic organizational, QA, economic and human decision contracts.
- `src/business-os/organization/coordinator.js` — Work routing, scope/authority/provenance enforcement, Sales guard, replay and immutable artifact publication.
- `src/business-os/organization/economic-workflow.js` — canonical digest/reference chain and human experiment authorization.
- `src/business-os/runtime/runtime.js` and `docs/architecture/ai-business-os/PHASE_5_SHARED_AGENT_RUNTIME.md` — shared runtime boundary.
- `docs/architecture/ai-business-os/PHASE_6_ORGANIZATIONAL_INTELLIGENCE_ROLES.md` — Phase 6 claims and explicit synthetic exclusions.
- `src/business-os/scout/contracts.js` and `src/business-os/analyst/contracts.js` — upstream evidence/candidate/assessment contracts.
- `src/business-os/experiment-manager/contracts.js` — experiment version/approval/run/result contracts.
- `src/business-os/economics/contracts.js`, `engine.js`, `scenario.js`, `sensitivity.js`, `portfolio.js`, `calibration.js`, `reconciliation.js` — authoritative economic foundation.
- `src/business-os/simulation/contracts.js`, `world.js`, `runner.js`, `scenarios.js` — closed-world commercial behavior.
- `src/business-os/real-world/contracts.js`, `thin-body.js`, `airlock.js`, `harness.js`, `controlled-live.js` — external boundary, narrow fixture and state-separation evidence.
- `test/ai-business-os-phase6-organization.test.js`, `test/ai-business-os-phase8-simulation.test.js`, `test/ai-business-os-phase9-real-world.test.js`, and `test/ai-business-os-phase9b-controlled-live.test.js` — current Sales-adjacent integration evidence.
- `test/ai-business-os-scout-platinum.test.js`, `test/ai-business-os-analyst-platinum.test.js`, Experiment Manager tests, and Economics tests — reusable upstream evidence.
- `data/readiness/development-cards.json` and `data/readiness/development-evidence.json` — repository-backed readiness definition/audit records updated only through `npm run readiness:update`.

### 13.2 Benchmark evidence

Official external sources are linked inline in section 5. Retrieval was successful for those pages/search results on the audit date. Repository `main` verification was separately blocked by the environment's GitHub CONNECT policy and is explicitly `UNVERIFIED` rather than inferred.

## 14. Final audit determination

**SALES-0 determination: architecture knowledge established; Sales Gold not achieved; Sales Platinum not achieved.**

The repository has a real, reusable Sales **role configuration**, strong shared governance/evidence/economics foundations, a useful synthetic commercial organism, and a narrow Thin Body proof of boundary concepts. It does **not** have a functioning reusable commercial Sales domain. The authoritative pathway currently stops before qualification and offer construction; later customer/obligation behavior is synthetic or fixture-specific.

The bounded SALES-1–10 roadmap can reach Gold and Platinum without duplicating the Full Brain: add canonical Sales artifacts and deterministic domain services behind the existing Phase 6 role, route all work through the shared runtime, consume Economics rather than recalculate it, preserve immutable provenance, use independent QA, and cross the Thin Body airlock only under external authority. At every level, AI-generated commercial reasoning remains a proposal until distinct governance, customer, payment, Production and QA evidence establishes the next state.
