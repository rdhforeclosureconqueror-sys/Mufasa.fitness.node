# ECO-6D — Portfolio & Economic Truthfulness Certification

## Decision

**ECO_6D_PASS**

This is a bounded, synthetic-contract certification of the repository at the
implementation reference recorded below. It does not certify live ledgers,
external accounting accuracy, tax consolidation, source-system completeness,
human acceptance, or the factual truth of caller-supplied evidence.

## References and repository truth

- Starting `main` SHA supplied by the assignment and verified as the checked-out
  repository `HEAD`: `a5625c17e667dfb056923d21d6c29486901069b7`.
- A network fetch could not be performed because this checkout has no configured
  Git remote. The local starting commit exactly matched the assigned SHA.
- Codex-reported local implementation commit: `dfb12835ae9eb2ade890b882d46f48a571def945` (not resolvable via GitHub commit API at independent review). Published PR head at review: `0feff85eea9a04591d8ed4925b7f541eba3a8bec`. The test counts below are Codex-reported local execution, not GitHub-hosted CI; GitHub reported zero check runs on that PR head.
- Inspected production contracts: `contracts.js`, `engine.js`, `contribution.js`,
  `provenance.js`, `reconciliation.js`, `scenario.js`, `sensitivity.js`,
  `capital-allocation.js`, `calibration.js`, `portfolio.js`, and the Economics
  public exports in `index.js`.
- Inspected prior independent evidence: `ECO_6A_CERTIFICATION.md`,
  `ECO_6B_CERTIFICATION.md`, and `ECO_6C_CERTIFICATION.md`, plus their executable
  Economics suites.

The canonical monetary source of truth is a JavaScript safe integer in minor
currency units. The engine rejects unsafe arithmetic and portfolio addition uses
`BigInt` internally before returning a safe integer. Production currently
supports only `USD`. Portfolio views are exactly `ACTUAL`, `EXPECTED_BASELINE`,
and `SCENARIO`. Relevant metric statuses are `CALCULATED`, `PARTIAL`, `UNKNOWN`,
`INVALID`, and `NOT_APPLICABLE`. Portfolio sources bind assessment ID, version,
digest, engine version, organization, work, product, campaign, currency, and an
exact reporting period. Scenario and calibration references have separate exact
identity bindings.

## Representative portfolio and independent reference arithmetic

The dedicated suite constructs three generic products for one organization,
work, exact January reporting period, `USD`, and `ACTUAL` view:

| Unit | Gross revenue | Refund | Discount | Known variable cost | Fixed cost | Contribution |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 100,000 | 0 | 0 | 45,000 | 10,000 | 45,000 |
| B | 900,000 | 0 | 0 | 145,000 plus unknown fulfillment | 50,000 | unknown |
| C | 200,000 | 10,000 | 10,000 | 80,000 | 20,000 | 80,000 |

All values are integer minor units. Independently calculated results are gross
revenue `1,200,000`, net revenue `1,180,000`, known fixed cost `80,000`, and the
**known resolved contribution subtotal** `125,000` from two of three members.
Contribution is `PARTIAL`, not a complete total, and identifies B as unresolved.
The test proves explicit sorted membership, exact source digests, immutable input
objects, deterministic replay, additive totals, coverage, and unresolved IDs.

A separate zero-versus-unknown pair proves an evidenced zero fulfillment cost
produces a complete `CALCULATED` contribution of `750,000`, whereas the otherwise
equivalent unknown cost produces only A's `45,000` known resolved subtotal with
`PARTIAL` status. No missing value is manufactured.

Negative contribution remains additive (`45,000 + -10,000 = 35,000`). A sum of
`Number.MAX_SAFE_INTEGER + 1` is rejected with `aggregate_overflow` rather than
losing precision.

## Status propagation matrix

| Member metric state | Eligible for known resolved subtotal | Complete portfolio state |
| --- | --- | --- |
| `CALCULATED` with safe integer | Yes | `CALCULATED` if every member resolves |
| `PARTIAL` with no missing inputs | Yes, retaining `PARTIAL` qualification | `PARTIAL` |
| `PARTIAL` with missing inputs | No | `PARTIAL`; member is unresolved |
| `UNKNOWN` | No | `UNKNOWN` alone, or `PARTIAL` with resolved peers |
| `INVALID` | No | `INVALID`; never softened |
| `NOT_APPLICABLE` | No and never zero | `NOT_APPLICABLE` alone, or `PARTIAL` with resolved peers |

An `INVALID` member combined with a valid member keeps the valid known subtotal
but makes the portfolio metric `INVALID` and reports the invalid member in the
unresolved IDs. This is intentionally not a complete total.

## Ratios and composition

Portfolio ratios are intentionally unsupported: contribution margin, ROI, ROAS,
CAC, unit metrics, and break-even units are enumerated as non-aggregated and are
neither summed nor averaged. For A and C, individual contribution margins are
`4,500` and `4,444` basis points. Production publishes the compatible underlying
totals (`125,000 / 280,000`) but does not invent either an averaged margin or a
new portfolio-margin field. Existing engine regressions certify zero-denominator
ratio results as `NOT_APPLICABLE`.

Resolved gross-revenue concentration is A `833`, B `7,500`, and C `1,667` basis
points against the explicitly named `KNOWN_RESOLVED_GROSS_REVENUE` denominator.
Ordering is deterministic. Unknown revenue changes composition to `PARTIAL` and
the resolved member's `10,000` basis points remain visibly limited to the known
denominator. A zero resolved denominator is `NOT_APPLICABLE`; negative gross
revenue is rejected. No rank or investment-risk score exists.

## Compatibility and lineage attacks

Executable attacks reject different organizations, non-USD currency, unequal or
overlapping-but-not-equal reporting periods, mixed views, duplicate assessment
references, duplicate declared economic units, and duplicate product/campaign
period scope. January is never combined with Q1. Exact source digest binding
rejects changed economic content under an old member reference.

`ACTUAL` portfolios require accepted actual/unknown provenance under the production contract. In this suite the provenance is explicitly constructed as trusted fixture data; it does not authenticate an independent external source.
`EXPECTED_BASELINE` requires estimated input evidence and cannot join `ACTUAL`.
`SCENARIO` uses separate exact scenario-result lineage and labels every member
`MEMBER_HYPOTHETICAL_ONLY`; a forged scenario digest is rejected. Scenario income
does not become observed income. Calibration profiles can be attached only as
exact, compatible descriptive context and explicitly have
`modifiesEconomics: false`.

## Scenario, sensitivity, capital, and calibration findings

- Scenario transformations are applied once through ECO-5A, preserve the bound
  baseline, carry estimated hypothetical inputs, and cannot authorize execution.
- The bounded sensitivity fixture replays identically, preserves its baseline,
  produces contribution points `55,000` and `35,000`, exposes its explicit range,
  publishes no probability model, and leaves a relative transformation of an
  unknown input `UNKNOWN` rather than interpolating it.
- The capital fixture contains two `60,000` candidates, `100,000` available, and
  one required candidate. It enumerates feasible alternatives and explicitly
  rejects the combined infeasible alternative for total-capital excess. Its
  feasibility result supplies no authorization, reservation, spend, execution,
  recommendation, optimum, or spending instruction.
- ECO-5D regression evidence verifies signed error, absolute error, relative
  error, zero-actual `NOT_APPLICABLE`, exact cohort and temporal compatibility,
  transparent sample counts, deterministic profiles, and immutable historical
  lineage. ECO-6D additionally binds an exact calibration profile to a portfolio
  and proves it does not change economics. No correction multiplier exists.

## Deterministic replay

Canonical portfolio membership is sorted, so semantically equivalent member
ordering produces byte-structurally equal results, including IDs, digests,
statuses, known totals, coverage, missing-member IDs, concentration, references,
and lineage. Identical sensitivity inputs also replay exactly. Changing source
economic content while retaining an old assessment reference fails exact digest
binding.

## Defects and limitations

No production defect was reproduced; no production calculation was changed.
Certification added independent executable coverage rather than a second engine.

Remaining contract limitations are explicit:

1. Upstream source contracts declare economic-unit, product, campaign, and period
   ownership but cannot independently prove real-world shared-cost ownership or
   parent/child disjointness across differently named products. Portfolio rejects
   detected duplicate scopes and performs no automatic allocation, but absence of
   double counting remains dependent on truthful upstream scope declarations.
2. Only `USD` is supported. There is no inferred conversion.
3. Portfolio ratios are deliberately unavailable rather than derived.
4. Concentration describes known resolved gross revenue, not risk or certainty.
5. Calibration is descriptive historical error and cannot correct forecasts.
6. Capital feasibility is constraint compatibility, not approval, reservation,
   expenditure, settlement, optimization, or instruction.
7. Synthetic executable evidence does not prove completeness or accuracy of live
   external financial systems.

These limitations do not block the bounded certification because production
fails closed or qualifies availability rather than claiming unsupported certainty.

## Executed evidence

Starting baseline (before ECO-6D additions):

- `node --test test/ai-business-os-economics-*.test.js test/ai-business-os-experiment-manager.test.js`
  — 242 passed, 0 failed, 0 skipped.

Final required results:

- Dedicated ECO-6D suite — 11 passed, 0 failed, 0 skipped.
- Combined Economics and Experiment Manager regression — 253 passed, 0 failed,
  0 skipped.
- Broader Business OS regression — 511 passed, 0 failed, 0 skipped.
- `npm run lint` — passed (`selfcheck ok`).
- `git diff --check` — passed with no diagnostics.
- `npm run readiness:validate` — passed: readiness contract valid, 4 changed
  files and 2 current evidence entries.

The final counts above were reported from Codex's newly executed commands before delivery;
historical documentation is not represented as current execution.
