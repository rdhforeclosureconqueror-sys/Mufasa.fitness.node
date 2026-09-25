# Economics role: foundation and phase plan

Economics answers what a product or campaign produced after its costs, and what
the business should examine next. It is the existing `ECONOMICS` role in the
shared runtime. Its industry analogue is commercial finance / FP&A.

Gold and Platinum are project acceptance standards, not external credentials.
The role is currently below Gold. This change implements only ECO-0 and ECO-1.
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
| ECO-2 | Deterministic assessment engine | Independently calculated fixtures; known/estimated/unknown coverage; rounding, cost allocation, labor, break-even and CAC | Not built |
| ECO-3 | Verified source adapters and reconciliation | Actual fees/refunds/spend/delivery/labor mapped to source records, source health and freshness, duplicate/delayed-event tests | Not built |
| ECO-4 | Coordinator and Command Center Gold workflow | ExperimentResult -> EconomicAssessment -> Sales/Manager/Learning through actual runtime paths | Not built |
| ECO-5 | Platinum decision support | Scenario/portfolio/capacity/cash models and forecast calibration with explicit uncertainty | Not built |
| ECO-6 | Independent certification | Executable Academy, independent review, live evidence and authenticated owner acceptance | Not run |

Every phase must reuse canonical state, update the readiness CLI evidence and
retain its own code-ready / live-verified / human-accepted status. Phase names or
scenario definitions cannot substitute for executed evidence.

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
