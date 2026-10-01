# Economics role: foundation and phase plan

Economics answers what a product or campaign produced after its costs, and what
the business should examine next. It is the existing `ECONOMICS` role in the
shared runtime. Its industry analogue is commercial finance / FP&A.

Gold and Platinum are project acceptance standards, not external credentials.
The role is currently Foundation / Pre-Gold. ECO-0 through ECO-3 are implemented.
No provider, live campaign, bank transfer, or human acceptance is activated.

## Existing assets and ownership

Reuse `organization/roles.js`, `organization/contracts.js`, the coordinator,
canonical payment/obligation records, and the controlled-live Command Center.
`simulation/ledger.js` is synthetic; it is not a live financial source.
The role configuration currently has no dedicated operational tool adapters.
Experiment Manager's Economics handoff is still definition-only.

Scout gathers signals; Analyst evaluates opportunities; Experiment Manager
designs tests; Economics evaluates financial evidence; Manager owns resource
decisions; Learning owns promotion of reusable lessons. Economics does not
approve its own facts, declare a payment settled, or authorize spending.

## ECO-0: contribution truth

`observedContribution` calculates the current controlled-test subtotal:

    settled - fees - fulfillmentCost - refunded - acquisitionSpend

The helper is USD-only, uses checked integer-cent arithmetic, and returns
`OBSERVED`, `UNKNOWN`, or `INVALID`. All five values must be supplied. Explicit
zero is valid; null/undefined remain unknown. Strings, booleans, negative inputs,
nonfinite values, fractional cents and unsafe totals are invalid. A negative
result is allowed and represents a loss on this subtotal.

This subtotal does not establish total business profit: owner time, shared
overhead, taxes and future liabilities are not automatically included. OBSERVED
describes the supplied numeric values, not independent source verification.

Controlled reconciliation uses this helper. Invalid evidence records the first
failure `ECONOMIC_EVIDENCE_INVALID`; missing costs keep the contribution null
without preventing the controlled test from recording its other results.
Economic validation remains NOT_RUN. Settlement rejects malformed amounts.

Read projections recalculate the subtotal from underlying fields. An old cached
USD 50 contribution with missing fees/delivery cost therefore reads as unknown,
including in the Command Center, without overwriting historical evidence or
rewriting the file merely by reading it.

## ECO-1: canonical financial records

`EconomicInput` is an immutable observation snapshot, not another payment ledger.
It carries:

- Identity, organization, version, product reference, and campaign reference
  (explicit null means no campaign attribution).
- Currency (USD in v1), reporting period [start, end), and integer `amountMinor`
  in cents. Known amounts are nonnegative; category supplies their meaning.
- Category: REVENUE, REFUND, ACQUISITION_COST, PAYMENT_FEE, FULFILLMENT_COST,
  LABOR_COST, FIXED_COST, or TRANSFER. A transfer is not new customer revenue.
- Classification: ACTUAL, ESTIMATED, UNKNOWN. Unknown requires a null amount.
  Estimated requires nonempty assumptions.
- Source system, record reference, observed timestamp, and evidence references.
  For missing data these point to the observation/request documenting the gap.
  A source reference does not itself authenticate its source.

Timestamps use canonical UTC ISO strings with milliseconds. Reporting periods
must be increasing; the source observation cannot be later than the assessment.
The observation timestamp may be later than the reporting window (late arrival).

New callers continue using **Organization.EconomicAssessment**, adding
`economicsSchemaVersion: "ai-business-os.economics/1.0.0"`, `version`, `currency`,
`productRef`, `campaignRef`, `reportingPeriod`, and `financialInputs`.
Presence of the version field or financialInputs invokes strict validation;
unsupported or absent versions cannot downgrade these new records to legacy.

The existing knownCost/estimatedCost fields retain dollar units for compatibility.
New financial input amounts use cents. actualValue, grossContribution,
capacityCost and expectedValue are classified objects with dollar `amount`:
UNKNOWN requires null; an ESTIMATED amount also carries assumptions.
actualValue cannot be estimated; expectedValue cannot be observed revenue.

Validation enforces organization/product/campaign/currency/period alignment,
source evidence coverage, duplicate identity/source rejection, and explicit
unknown costs. Unknown non-transfer inputs prevent observed contribution and a
CONTINUE disposition. Observed contribution requires actual observations for
all five controlled-subtotal categories, including explicit zero costs/refunds.
Estimates cannot be relabeled as observed contribution.

Legacy assessments without these new fields remain readable under their original
contract. They are not thereby Gold-certified. This phase validates structure
and classifications, not all derived numerical totals or economic completeness.
ECO-2 must derive assessments from inputs rather than trust caller-supplied totals.
No standalone parallel EconomicAssessment constructor has been introduced.

## Gold and Platinum acceptance

Gold: one product/campaign can produce a reproducible, attributable assessment
with actual/estimated/unknown costs, contribution, labor treatment, acquisition
cost, break-even assumptions and a justified disposition. The real workflow and
independent calculation review must pass. Revenue alone cannot establish profit.

Platinum adds product/cohort comparisons, capacity constraints, cash timing,
scenario analysis, forecast-versus-actual calibration, and resource proposals.
Attribution must not become a causal claim without experimental evidence.
Independent live evidence and authenticated human acceptance are required.
Correctly finding a loss or insufficient evidence can pass role acceptance;
certification must not depend on fabricating a profitable campaign.

## Phased delivery

| Phase | Scope | Completion evidence | Current status |
| --- | --- | --- | --- |
| ECO-0 | Fix missing-cost calculation and old cached projections | Runtime and saved-record negative controls | Implemented; automated validation |
| ECO-1 | Canonical economic inputs and assessment extension | Schema, isolation, provenance and compatibility tests | Implemented; automated validation |
| ECO-2 | Deterministic assessment engine | Independently calculated fixtures; known/estimated/unknown coverage; rounding, cost allocation, labor, break-even and CAC | PASS (automated) |
| ECO-3 | Evidence, provenance and input trust | Canonical evidence registration, deterministic preflight, source health/freshness/supersession/conflict checks and reproducible evidence snapshots | PASS (automated) |
| ECO-4A | Governed organizational workflow | OpportunityCandidate -> AnalystAssessment -> ExperimentProposal -> EconomicAssessment -> human GovernedDecision -> execution preflight | PASS (automated; human acceptance pending) |
| ECO-4B | Outcome reconciliation | Approved assessment -> authorized run/result -> evidence-backed actual assessment -> deterministic variance | PASS (automated; independent review pending) |
| ECO-5 | Platinum decision support | Scenario/portfolio/capacity/cash models and forecast calibration with explicit uncertainty | Not built |
| ECO-6 | Independent certification | Executable Academy, independent review, live evidence and authenticated owner acceptance | Not run |

Every phase must reuse canonical state, update the readiness CLI evidence and
retain its own code-ready / live-verified / human-accepted status. Phase names or
scenario definitions cannot substitute for executed evidence.

### ECO-5 decision-support progress

- ECO-5A deterministic scenario modeling: implemented.
- ECO-5B sensitivity and bounded uncertainty analysis: implemented.
- ECO-5C capital allocation analysis: implemented (automated repository evidence;
  not authorization, human acceptance, Platinum certification, or ECO-6).
- ECO-5D historical economic calibration: implemented (automated repository
  evidence; descriptive history only, not forecasting or automatic correction).
- ECO-5E portfolio economics: not implemented.

## ECO-5D historical economic calibration

ECO-4B reconciliation answers what happened in one completed run compared with
its authorized expectation. ECO-5D consumes that exact reconciliation and asks
how explicitly comparable expectations behaved across repeated completed
observations. **RECONCILIATION IS NOT CALIBRATION. CALIBRATION IS NOT
FORECASTING.** The layer does not reproduce ECO-4B variance logic, accept a raw
caller-supplied actual, or create another Economics engine.

An `EconomicCalibrationObservation` binds one supported monetary metric to the
exact sealed forecast and actual `EconomicAssessment` artifacts, their IDs,
versions and digests, the exact reconciliation digest, its experiment/run/result
lineage, the approving `GovernedDecision`, organization, work, product,
campaign, USD currency, reporting period, engine/model/policy versions, and the
relevant timestamps. The selected expectation must be the baseline designated
by the human-authorized ECO-4A decision and consumed by ECO-4B before the actual
became authoritative. A downside, upside, custom, or numerically close scenario
cannot be substituted after the outcome. **A CLOSE HISTORICAL SCENARIO IS NOT
THE FORECAST UNLESS IT WAS DESIGNATED BEFORE THE OUTCOME.** Assessment,
provenance, designation, actual-authority, and reconciliation chronology are
validated; incompatible or mutated lineage fails closed.

The conservative v1 metric set is `grossRevenue`, `refunds`, `discounts`,
`netRevenue`, `knownVariableCost`, `knownFixedCost`, `totalKnownCost`,
`contributionBeforeUnknownCosts`, and `contribution`. Ratios, ROI, ROAS, CAC,
margins, unit metrics and break-even values are not calibrated or averaged.
All authoritative arithmetic uses integers and checked `BigInt`. The declared
sign convention never varies by metric:

    signedError = expected - actual
    absoluteError = abs(signedError)
    relativeErrorBasisPoints = round-half-up(signedError * 10,000 / abs(actual))

A positive signed error means expected was above actual, a negative error means
expected was below actual, and zero is an exact match. If actual is zero,
relative error is `NOT_APPLICABLE`; the absolute error remains available. The
implementation never substitutes one for a zero denominator and never uses
binary floating-point money or percentages.

`CALCULATED`, `PARTIAL`, `UNKNOWN`, `INVALID`, and `NOT_APPLICABLE` retain their
distinct meanings. Only two `CALCULATED` metric values produce error arithmetic.
A missing expectation remains non-comparable even when an actual later exists.
**EXPECTED IS NOT ACTUAL. UNKNOWN IS NOT ZERO. PARTIAL IS NOT COMPLETE. INVALID
IS NOT UNKNOWN.** No later outcome mutates, fills, relabels, or improves the
original expectation.

Comparable observations expose only `EXPECTED_ABOVE_ACTUAL`,
`EXPECTED_BELOW_ACTUAL`, or `EXACT_MATCH`; other observations are explicitly
`NOT_COMPARABLE`. These are numerical directions, not GOOD/BAD or
accurate/inaccurate judgments. Calibration measures a historical difference;
**CALIBRATION IS NOT CAUSALITY** and does not attribute a miss to marketing,
pricing, a person, a model, or an assumption.

An `EconomicCalibrationProfile` requires an explicit cohort definition:
organization, metric, currency, exact product/campaign scope, expectation type,
engine version, exact reporting-period duration semantics, and a deterministic
as-of time. Changing the cohort changes profile identity. V1 refuses mismatched
scope, duration, metric, currency or engine version rather than deciding what is
“similar enough.” Observation ordering is canonical, exact duplicate identities
are rejected, and no large-error observation silently disappears as an outlier.

Every profile displays total, comparable, non-comparable, and valid percentage-
denominator sample counts. It reports expected-above, expected-below and exact-
match counts plus mean signed error, mean/minimum/maximum absolute error, and
MAPE in integer basis points. Every statistic states its own observation count.
Zero-actual observations are excluded from MAPE and are not treated as zero
percentage error. Means use deterministic integer half-up rounding. **SAMPLE
SIZE MUST BE VISIBLE. OUTLIERS MUST NOT DISAPPEAR SILENTLY.** These descriptive
facts can expose directional history, but do not pronounce a model “biased” or
apply universal confidence thresholds.

Observation and profile IDs/digests cover canonical exact lineage, cohort,
versions, and sorted observation references. Reordered inputs replay identically.
Repositories reject duplicate observation identity and return defensive copies.
Source inputs, assessments, evidence, decisions, approvals, runs, results,
reconciliations, scenarios, sensitivities, and capital-allocation artifacts are
never mutated.

The governance boundary is absolute: **HISTORICAL ERROR IS NOT FUTURE
PROBABILITY. HISTORICAL CALIBRATION DOES NOT AUTOMATICALLY CHANGE FUTURE
ASSUMPTIONS.** ECO-5D creates no forecast, scenario, probability, confidence or
prediction interval, Monte Carlo distribution, causal conclusion,
recommendation, retraining, assumption adjustment, ranking, allocation,
reservation, authorization, experiment, or spend. It does not modify Scout,
Analyst, Experiment Manager, Learning, prices, budgets, CAC, revenue assumptions,
or sensitivity ranges. Historical calibration produces evidence only. ECO-5E,
ECO-6, live acceptance, and Economics Platinum certification remain separate.

## ECO-2 deterministic engine

`calculateEconomicAssessment` is the sole ECO-2 authoritative arithmetic path.
It validates and canonicalizes `EconomicInput` snapshots, sorts them by identity,
uses checked integer-minor-unit/BigInt aggregation, and emits the existing
`Organization.EconomicAssessment`. The engine version is
`economics-v2.0.0`; the deterministic assessment identifier hashes the canonical
inputs, coverage policy, and engine version. A caller may supply a timestamp,
but timestamps are metadata and do not alter economic content.

The engine derives gross revenue, refunds, discounts, net revenue, known
variable/fixed/allocated costs, total known cost, contribution before unknown
costs, true contribution, contribution margin, unit metrics, break-even units,
CAC, ROAS, and ROI. Cash requirement remains explicitly unknown because ECO-2
has no cash-timing contract. Ratios use integer basis points; money uses integer
minor currency units. Fixed and percentage payment-fee schedules use BigInt and
deterministic half-up rounding. An input fee and a fee schedule cannot coexist,
preventing double counting.

Every metric carries status, value/unit, formula identifier, inputs, missing
inputs, engine version, and calculation timestamp; the assessment also retains
a normalized lineage array. `CALCULATED`, `PARTIAL`, `UNKNOWN`, `INVALID`, and
`NOT_APPLICABLE` remain distinct. Missing required cost categories and explicit
unknown records make true contribution/margin/ROI unknown, while the known-cost
subtotal and contribution-before-unknown-costs remain usable. Estimated inputs
produce partial metrics and never become observed facts.

The coverage policy declares required cost categories plus optional unit and
new-customer denominators. It is part of deterministic input. Zero denominators
are not applicable; absent denominators are unknown. Nonpositive unit
contribution cannot yield a finite break-even value. Mixed scopes/currencies,
duplicates, malformed numbers, unsupported engine versions, unsafe totals, and
fee double counting fail closed.

The engine is compatible with Scout's canonical assessment consumer and the
Organization contract. It does not add an LLM arithmetic path, provider adapter,
new payment ledger, coordinator executor, persistence model, or Command Center
projection. Those remain later-phase work.

## ECO-5C capital allocation analysis

ECO-5C answers a scarce-capital question that scenario analysis alone cannot:
given an explicit finite pool, exact candidate artifacts, and explicit
constraints, which modeled all-or-nothing combinations are feasible and what
economic facts do those combinations preserve? It is a deterministic
orchestration layer over ECO-2, not a second calculation engine. A
`CapitalAllocationStudy` binds each candidate to an exact assessment ID,
version, digest, engine version, organization, work, product, campaign,
currency, and reporting period. Required modeled capital is explicit integer
minor currency; it is never inferred from ROI, cash requirement, revenue,
authorization, a bank balance, or an unknown value.

The v1 funding model is deliberately **ALL_OR_NOTHING** and USD-only. The engine
enumerates every combination for at most 12 candidates (4,096 combinations),
canonicalizes candidates and constraints, and never samples, ranks, recommends,
or optimizes. One candidate beyond the bound fails closed. Supported constraints
are total available capital, required candidate, mutual exclusion, dependency,
and candidate minimum/maximum commitment. Under all-or-nothing funding, minimum
and maximum constraints validate the candidate's single fixed commitment; they
do not create fractional funding. Unknown targets, self-dependencies and cycles
fail closed. Every rejected combination retains constraint diagnostics, and an
unsatisfiable study returns `INFEASIBLE` rather than fabricating an allocation.
An empty candidate set has one technically feasible empty combination, but is
explicitly `NO_CANDIDATES`; its economics are not applicable, not a zero-value
success.

Each feasible alternative reports modeled capital committed, modeled capital
remaining, and (when available capital is nonzero) integer-basis-point modeled
utilization. Compatible ECO-2 monetary metrics are added with checked BigInt
arithmetic. UNKNOWN anywhere remains UNKNOWN, and PARTIAL remains PARTIAL.
Ratios, percentages, unit economics, CAC, ROI, ROAS, margins, and break-even
units are listed as non-aggregated: they are neither summed nor blindly
averaged. USD and exact reporting-period compatibility are mandatory; there is
no currency conversion or cross-period aggregation.

An explicitly selected ECO-5A result may supply hypothetical candidate economics
only after its full result digest and baseline lineage validate. Baseline use is
otherwise the default, and the source is labeled on every candidate profile.
ECO-5B results are likewise exact-lineage bound and retained as descriptive
tested-range context only. No probability, preference, penalty, risk-adjusted
return, score, or hidden ranking is derived. Source assessments, scenario
results, sensitivity results, reconciliation history, actuals, decisions,
approvals, runs, and evidence are never mutated.

The governance boundary is absolute:

- **AVAILABLE is not AUTHORIZED.**
- **MODELED ALLOCATION is not RESERVED.**
- **MODELED ALLOCATION is not SPENT.**
- **FEASIBLE is not APPROVED.**
- **HIGHER ROI is not automatically BETTER.**
- **UNKNOWN is not ZERO; PARTIAL is not COMPLETE.**
- **RANGE is not PROBABILITY; SENSITIVITY is not PREFERENCE.**
- **MODEL ECONOMICS is not CAUSALITY or prediction.**
- **CAPITAL ALLOCATION ANALYSIS is not CAPITAL ALLOCATION AUTHORITY.**

Results therefore expose null authorization, reservation, spend, and execution
fields and create no approval, run, payment, budget change, workflow transition,
Scout/Learning action, project start, or scaling action. A human governance layer
must make any subsequent decision. ECO-5C implementation does not claim
Economics Platinum, ECO-5D/ECO-5E completion, live verification, or ECO-6
certification.

## ECO-3 evidence, provenance and input trust

ECO-3 reuses the constitutional kernel's canonical `EvidenceRecord` rather than
creating an Economics-only evidence store. `EconomicEvidenceRecord` is a strict,
versioned profile of that record. It adds vendor-neutral source type/system and
record identity, availability, observation time, economic scope, claim value and
classification, payload hash, record version and explicit supersession. It does
not authenticate a provider connection or copy an external provider payload.

`validateEconomicProvenance` is the deterministic boundary between proposed
facts and ECO-2. It resolves every known input reference against the supplied
canonical evidence registry and fails closed for absent/unavailable evidence,
wrong organization/product/campaign/currency/period, mismatched claim/source,
future or malformed timestamps, unsupported source types, duplicate evidence or
source versions, changed payload hashes, superseded versions and unsupported
classification. ACTUAL requires an `OBSERVED_FACT` carrying an ACTUAL economic
claim. Evidence attached to an estimate cannot promote it to ACTUAL. ESTIMATED
still requires explicit assumptions and estimated evidence. UNKNOWN has a null
amount and may have no evidence: the system does not fabricate a gap record.

Freshness is policy-driven, not universal. An explicit `EXPIRING` policy supplies
a deterministic maximum age for facts such as a current price estimate. An
explicit `HISTORICAL` policy recognizes a completed reporting period, so an old
transaction remains historically valid. With no applicable policy, freshness is
visibly `UNKNOWN`; it is never silently called current. Supported states are
CURRENT, STALE, HISTORICAL and UNKNOWN. Stale evidence is rejected by the
authoritative preflight.

The validator examines all registered evidence describing the same category and
scope. Differing values or classifications produce a structured `CONFLICTED`
error containing both claims and source references; ECO-3 never selects a winner.
Explicit supersession and a later version of the same source record are also
rejected. Governance or a corrected input must resolve either condition.

`calculateEvidenceBackedAssessment` runs preflight first, invokes the unchanged
`economics-v2.0.0` arithmetic engine only with accepted inputs, then freezes the
evidence snapshot, registry digest, applied policy references and input trust/
freshness/source trace into the canonical `Organization.EconomicAssessment`.
Each metric lineage record carries the input-to-evidence trace. Later registry
changes therefore do not rewrite what supported a historical assessment.

This phase adds no vendor adapter, evidence research, database, attribution
model, coordinator workflow, forecast reconciliation, scenario engine, budget
optimization or autonomous conflict resolution. Kernel evidence persistence is
still repository-adapter dependent; the default kernel repository is in-memory.

### ECO-3 certification statement

**CURRENT CERTIFICATION: Foundation / Pre-Gold**

- **ECO-0: PASS**
- **ECO-1: PASS**
- **ECO-2: PASS**
- **ECO-3: PASS** (repository automated evidence only; not provider, live, or human acceptance)

Economics is not Gold or Platinum. ECO-4A must connect the governed Scout →
Analyst → Experiment Manager → Economics → decision workflow. ECO-4B must add
forecast-to-actual outcome reconciliation. ECO-5 decision intelligence and ECO-6
independent/live/human certification remain unresolved.

## ECO-4A governed organizational workflow

ECO-4A reuses the organization layer's `OrganizationalWorkItem` and
`WorkArtifact` identity rather than introducing an Economics case store. The
four departmental artifacts share an organization and work ID. Every downstream
artifact carries an immutable reference to the immediately preceding artifact,
including its type, ID, version, SHA-256 content digest, organization and work.
The full chain remains reconstructable without copying upstream payloads.

The deterministic organizational state machine permits discovery, analysis,
proposal, economic review, decision and readiness transitions plus explicit
evidence, revision, rejection, pause, expiration and cancellation states. State
skips are rejected. The execution preflight accepts artifacts in any order but
canonicalizes them before evaluation; it performs no execution and uses no LLM.

For economically exposed experiments, `CONTINUE` means only that Economics
permits governance consideration. A separate `GovernedDecision`, made under
explicit human authority and scoped to experiment execution, must approve the
exact proposal, assessment and ancestry digests. Missing, unknown, conflicted,
superseded, cancelled, expired, cross-organization, cross-work, wrongly
attributed, mutated or ambiguously duplicated inputs fail closed. A new proposal
or assessment version therefore leaves the historical decision auditable while
making it invalid for current execution.

ECO-4A does not execute an experiment, reconcile outcomes, add scenario or
portfolio analysis, authorize autonomous spending, or claim human acceptance.
Command Center can consume the existing organization work/artifact projections;
no parallel UI state or broad redesign is introduced.

### ECO-4A certification statement

- **ECO-0: PASS**
- **ECO-1: PASS**
- **ECO-2: PASS**
- **ECO-3: PASS**
- **ECO-4A: PASS** (repository automated evidence; independent human review pending)
- **Overall Economics: PRE-GOLD**

ECO-4B closes the automated pre-Gold implementation gap described by ECO-4A.
Final Gold and Platinum remain uncertified pending independent review and the
separate human/live requirements below.

## ECO-4B forecast-to-actual reconciliation

ECO-4B adds the canonical `EconomicReconciliation`; it does not add another
`ExperimentResult`, `EconomicAssessment`, financial engine, case store, or
ledger. The approved ECO-4A `ArtifactReference` is the immutable baseline. A
reconciliation verifies its proposal and assessment digests, the human governed
decision and Experiment Manager approval, the exact proposal version, run, and
result, plus organization and work identity. The actual assessment is a distinct
artifact produced by `calculateEvidenceBackedAssessment`: ECO-3 validates source
trust and temporal scope before the existing ECO-2 engine performs arithmetic.
The stored run reference includes a digest of the terminal execution record, and
the stored result reference includes its canonical version and digest. Approval
proposal digest/version, authorized ceiling, and the run reservation are checked
against those exact records rather than accepted as caller labels.

Only canonical ECO-2 metrics present on both assessments are compared. Currency,
per-unit, unit-count, and basis-point values remain safe integers. Absolute
variance is `actual - expected`; relative variance is deterministically rounded
to basis points and is `NOT_APPLICABLE` when expected is zero. `UNKNOWN`,
`INVALID`, `NOT_APPLICABLE`, and `PARTIAL` remain explicit rather than becoming
zero. A partial numeric variance is emitted only when both sides omit the same
dependency lineage; unlike partial quantities remain explicitly partial without
a numeric variance. Direction metadata makes higher revenue, contribution,
ROAS, and ROI favorable and lower costs, refunds, CAC, and break-even units
favorable. Equality alone is `ON_PLAN`; ECO-4B invents no tolerance.

Reporting windows must match exactly. ECO-3 permits evidence observed inside a
historical window and recorded later when it is still within the assessment's
`asOf`; stale, conflicting, unavailable, superseded, wrong-scope, or future-as-of
evidence cannot enter the actual assessment. Stored reconciliation identities
are immutable, so later evidence requires a new explicitly versioned artifact
rather than rewriting history.

Authorized amount and reserved amount are reported separately and bound to the
approval and run. Actual spend remains `null` unless a future canonical spend
fact is added; `totalKnownCost` is never mislabeled as spend. Reconciliation
neither releases a reservation nor settles money;
the Experiment Manager's reservation-release adapter remains an operational gap.
Experimental classification is retained unchanged and is never translated into
profitability. Variance describes what changed, not why. No Scout/Learning
weights, forecast calibration, scenario intelligence, or allocation policy are
modified.

### ECO-4B certification statement

- **ECO-0: PASS**
- **ECO-1: PASS**
- **ECO-2: PASS**
- **ECO-3: PASS**
- **ECO-4A: PASS**
- **ECO-4B: PASS** (repository automated evidence; independent review pending)
- **Overall Economics: GOLD CANDIDATE — AUTOMATED EVIDENCE COMPLETE**

This is not final Gold certification and is not Platinum. Independent review,
human acceptance, live financial evidence, and stronger ECO-6 certification
remain outstanding.

## ECO-GOLD independent certification (2026-09-30)

**ECO-GOLD: BLOCKED**

The independent automated certification ran against repository base
`36df527b281b3456160f2684e1b911acf8d922a9`, engine
`economics-v2.0.0`, and reconciliation policy
`economics-reconciliation-v1.0.0`. The dedicated production-path suite is
`test/ai-business-os-economics-gold-certification.test.js`: 43 tests pass,
including a named synthetic end-to-end fixture and negative controls. A passing
test process is not a Gold PASS: two tests deliberately prove current production
integration gaps that prevent the complete chain from being certified.

### Certified layers and evidence

- Production Scout `OpportunityCandidate`, Analyst `AnalystAssessment`,
  Experiment Manager proposal/run/result, Economics inputs/assessments,
  organizational artifacts, human `GovernedDecision`, ECO-3 provenance, ECO-2
  arithmetic, and ECO-4B reconciliation are exercised directly. No Economics,
  hashing, governance, provenance, or reconciliation implementation is copied
  into the suite.
- The organizational pre-execution chain reaches `READY_FOR_EXECUTION` only
  with the four correct producing roles and an exact human decision. Scout may
  not substitute for Analyst; Economics and Experiment Manager cannot authorize;
  a recommendation or experiment result does not declare profitability.
- The synthetic forecast revenue is 90,000 minor units, the evidence-backed
  actual is 62,000, absolute variance is -28,000, and deterministic relative
  variance is -3,111 basis points. Actual revenue traces through its calculated
  metric and `EconomicInput` to `EconomicEvidenceRecord` source evidence.
- UNKNOWN forecast CAC, UNKNOWN actual fulfillment cost, missing values on both
  sides, unequal/equal PARTIAL dependencies, and a zero forecast denominator
  retain canonical UNKNOWN/PARTIAL/NOT_APPLICABLE states without zero,
  Infinity, or fabricated percentages.
- Authorized budget (50,000 minor units), reserved budget (50,000), actual
  economic costs, actual spend (`null`), and settlement remain separate.
  `SUPPORTED` with unfavorable revenue and `NOT_SUPPORTED` with favorable
  contribution remain independent facts.
- Equivalent and reordered economic inputs replay identically; reconciliation
  replay and repository clone isolation are deterministic. Duplicate
  reconciliation identity is rejected. Calculation timestamps remain metadata,
  while economic assessment identity derives from canonical economic content.
- The adversarial suite covers organization/work/role/ancestry isolation;
  proposal, decision, baseline, run, result, and actual-assessment substitutions;
  version, status, budget, reporting-period, future/stale/conflicting/duplicate
  evidence; UNKNOWN/PARTIAL/zero semantics; replay/order; technical failure,
  inconclusive, and policy-blocked outcomes.

### Gold blockers

1. **ExperimentApproval does not bind the governed workflow proposal artifact.**
   `ExperimentManager.approve` hashes its stored `ExperimentProposal`. ECO-4A
   separately seals that proposal into a `WorkArtifact` by adding artifact role,
   ancestry, and digest fields. ECO-4B requires the approval digest to equal the
   sealed artifact digest. The two production digests therefore differ, so a
   real Experiment Manager approval fails reconciliation at `approval_lineage`.
   Existing ECO-4B unit fixtures bypass this seam by constructing an approval
   directly from the artifact. Severity: Gold-blocking governance/provenance
   integration. Smallest appropriate remediation: define one canonical,
   versioned proposal-artifact approval handoff and make Experiment Manager
   approve/check that exact immutable reference; do not relax digest matching.
2. **Reconciliation does not validate ExperimentResult against Experiment
   Manager storage.** A caller can change a structurally valid result's
   `resultClass`; reconciliation hashes the supplied mutation into a new identity
   and accepts it. `ExperimentManager.validateResult` correctly rejects the same
   object, but ECO-4B never invokes an authoritative validator/repository.
   Severity: Gold-blocking historical-integrity gap. Smallest appropriate
   remediation: require reconciliation orchestration to resolve and validate the
   immutable stored result (and terminal run) before calling the pure arithmetic
   constructor. Do not trust a caller-supplied result merely because it hashes.

Because those gaps break the required
`GovernedDecision -> ExperimentApproval -> ExperimentRun -> ExperimentResult -> EconomicReconciliation`
binding, the complete Gold chain is not proven. Fixing it requires a reviewed
production integration contract, not weaker certification assertions, and is
not attempted in this certification-only change.

Live payment/provider evidence, production execution, settlement, physical
device QA, visual/UX acceptance, and authenticated human acceptance were not
performed and are not claimed. The earlier ECO-0 through ECO-4B phase evidence
remains historical phase evidence; it does not override this independent Gold
result.

### ECO-2 certification statement

**CURRENT CERTIFICATION: Foundation / Pre-Gold**

**ECO-2: PASS** (repository automated evidence only; not human acceptance)

ECO-4 must complete governed organizational workflow and outcome reconciliation
before independent Gold review. ECO-5 scenario/forecast/learning intelligence
and ECO-6 independent, live, and authorized human certification remain
unresolved. Economics is not Gold or Platinum.

## Verification and known baseline

Focused verification:

```sh
node --test test/ai-business-os-economics-foundation.test.js test/ai-business-os-phase9b-controlled-live.test.js test/ai-business-os-phase9-real-world.test.js test/ai-business-os-phase6-organization.test.js
npm run lint
npm run readiness:validate -- --base origin/main
```

The pre-change Command Center suite has two existing failures: compound health
tool selection expects no extra get_diagnostics call, and the no-model production
Brain path references undefined bridgeUrl. Track those separately; neither is
a passing gate. The new Economics tests exercise Command Center economic output
directly, including saved-state recovery. No browser/device/live financial QA
or human acceptance is claimed by these machine tests.

## ECO-5A deterministic scenario modeling

ECO-5A answers: **if these explicitly stated assumptions were true, what would
the economics become?** It is decision support, not a second calculator:

```text
immutable EconomicAssessment / EconomicInput baseline
  -> explicit EconomicScenario overrides
  -> derived hypothetical EconomicInput snapshots
  -> existing ECO-2 calculateEconomicAssessment engine
  -> EconomicScenarioResult and baseline-versus-hypothetical comparisons
```

`EconomicScenario` binds organization, work, product, campaign, currency,
reporting period, ECO-2 engine version, policy version, and the exact baseline
assessment ID/version/digest. A changed baseline cannot silently attach.
`BASELINE`, `DOWNSIDE`, `UPSIDE`, and `CUSTOM` are labels only: no percentages
are implied and each change must be supplied explicitly.

Every override records its target/category, original and derived classification
and value, transformation and amount, unit, reason, and baseline evidence
relationship. ECO-5A supports absolute replacement, signed absolute delta in
minor units, and signed percentage delta in basis points. Integer/BigInt
arithmetic uses deterministic half-up rounding. Negative results, unsafe
integers, duplicate/conflicting targets, and mismatched declared results fail
closed. Overrides are sorted by target; independent reorderings replay
identically, and all changes are applied before one ECO-2 calculation.

UNKNOWN is never zero. A delta or percentage against UNKNOWN remains UNKNOWN;
only an explicit replacement creates a value. Every changed numeric input is
`ESTIMATED` with `SCENARIO_ASSUMPTION` metadata, never `ACTUAL`, and is not ECO-3
observed evidence. Baseline inputs, evidence, assessments, approved forecasts,
actuals, and reconciliation history remain immutable.

Scenario comparison is distinct from ECO-4B reconciliation: it names
`baseline` and `scenario` sides, not `expected` and `actual`, and reports
absolute/relative deltas with metric directionality. `FAVORABLE`,
`UNFAVORABLE`, `UNCHANGED`, `UNKNOWN`, `NOT_APPLICABLE`, and `INVALID` are
interpretations, not autonomous decisions. Results retain the scenario, exact
baseline reference, derived inputs, ECO-2 assessment, and limitations for
deterministic serialization and replay.

The boundaries are categorical:

* **Scenario != Forecast** — it is not the current expectation and cannot
  replace an approved baseline.
* **Scenario != Actual** — it is not observed evidence and cannot alter
  reconciliation history.
* **Scenario != Prediction** — ECO-5A has no probability, distribution, or
  confidence interval.
* **Scenario != Authorization** — favorable economics is not approval, budget,
  spending authority, scaling permission, or a recommendation.

ECO-5A excludes sensitivity/uncertainty analysis, capital allocation,
historical calibration, portfolio economics, optimization, Monte Carlo methods,
and Platinum certification. Gold architecture is complete; the final post-fix
Gold certification rerun remains deferred. ECO-5A does not rewrite or imply
completion of that historical certification evidence.

## ECO-5B sensitivity and bounded uncertainty analysis

ECO-5B answers how strongly a selected, existing ECO-2 metric responds across
an explicitly supplied set of assumptions, where a requested economic threshold
appears within those tested points, and what caller-declared uncertainty remains.
The production chain is deliberately layered:

```text
exact immutable baseline -> EconomicSensitivityStudy -> canonical points
  -> ECO-5A EconomicScenario -> ECO-2 EconomicAssessment
  -> status-aware EconomicSensitivityResult
```

The sensitivity engine does not reproduce scenario transformations or financial
formulas. It declares each point as an ECO-5A-compatible absolute replacement,
signed absolute delta, or signed basis-point delta. ECO-5A derives hypothetical
inputs, and the authoritative ECO-2 engine calculates the target metric. One-way
studies declare exactly one target. The bounded two-way form declares exactly
two different targets and evaluates their Cartesian product; hidden additional
overrides and duplicate axis targets are rejected.

`EconomicSensitivityStudy` binds its organization, work, product, campaign,
currency, reporting period, baseline assessment ID/version/digest, engine and
scenario versions, target input(s), target metric, points, thresholds, creator,
and creation time. Points and axes are canonicalized, duplicate points are
rejected, and equivalent reordered definitions replay with the same digest and
result. A different range or target metric has a different study identity.

Results retain every ECO-5A scenario and assessment reference, coordinate,
metric value/unit/status, missing dependencies, and status-aware change from
the baseline. `CALCULATED`, `PARTIAL`, `UNKNOWN`, `INVALID`, and
`NOT_APPLICABLE` are not flattened into a numeric series. UNKNOWN relative
perturbations remain UNKNOWN; an explicit replacement may create only an
ESTIMATED scenario assumption. **Unknown is not zero. Hypothetical is not
observed.** No unresolved point is interpolated.

For valid numeric points, one-way analysis reports the tested minimum, maximum,
absolute spread, relative spread when the baseline denominator is nonzero, and
point-by-point direction/change. Driver comparison requires the same exact
baseline and target metric and preserves each transformation and tested range.
Its ordering describes only those ranges; it is not a universal importance
score, recommendation, or priority decision.

Callers may request integer thresholds such as zero contribution, margin, or
ROI. An exactly tested threshold is reported as exact. A sign change between two
tested points is reported only as `BETWEEN_TESTED_POINTS`, with both endpoints
and no invented crossing value. Two-way matrices do not infer continuous
surfaces or thresholds between cells.

Bounded uncertainty is optional, explicit context on an axis: a rationale and
zero or more ECO-3 evidence references explain the caller-supplied plausible
range. It does not infer uncertainty merely because evidence is absent, change
evidence trust, or convert an estimate into an actual. **Range is not
probability**: there are no distributions, likelihood rankings, confidence
intervals, expected-value weights, random sampling, or Monte Carlo simulation.

The boundaries are categorical:

* **Sensitivity is not Scenario Modeling** — ECO-5B orchestrates ECO-5A.
* **Sensitivity is not Prediction** — a point is an if/then model result.
* **Sensitivity is not Causality** — model response does not prove real-world effect.
* **Sensitivity is not Authorization** — favorable conditions grant no execution,
  spending, scaling, or ExperimentRun permission.
* **Sensitivity is not Optimization** — there is no goal seek, automatic search,
  capital allocation, or autonomous prioritization.
* **Sensitivity is not evidence promotion** — hypothetical is not observed and
  uncertainty context is not an actual fact.

ECO-5B adds no ECO-5C capital allocation, ECO-5D historical calibration, ECO-5E
portfolio economics, or ECO-6 certification. It does not modify Scout or
Learning. Completion means ECO-5B is implemented with repository automated
evidence; it does not mean Economics is Platinum certified.
