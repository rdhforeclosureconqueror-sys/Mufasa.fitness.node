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
