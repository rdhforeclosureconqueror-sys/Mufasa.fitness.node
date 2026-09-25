# Next slice: ECO-2 deterministic economic assessment engine

ECO-0/ECO-1 establish contribution truth and strict versioned inputs. Read README
for current behavior, deferred work, the industry comparison, and acceptance
criteria. Start from the merged foundation; preserve legacy read compatibility.

## Deliverable

Implement a pure calculator that consumes validated EconomicInput snapshots and
produces the canonical Organization.EconomicAssessment with the Economics schema
version. It must calculate its own totals and confidence limitations; accepting
caller-supplied totals is not an executor. No additional bot or payment ledger.

1. Define one documented measurement/coverage policy per product/report period.
   Identify required cost categories and explicit exclusions before evaluating
   completeness. Known zero needs evidence; absent records are unknown.
2. Keep collected money, earned revenue, refunds, incurred/paid costs and bank
   transfers distinct. Reuse canonical payment facts. A payment and its later
   payout are not two revenues; an incurred expense and its settlement are not
   two costs. Distinguish timing differences from reconciliation errors.
3. Calculate direct contribution in integer cents. Separate actual cash/labor
   expenditure from estimated owner-time allowance and allocated shared costs.
   Preserve unknowns and avoid double counting labor already in fulfillment.
4. Calculate CAC using defined acquisition cost and attributable new customers;
   zero customers makes CAC undefined, not zero. Define periods and denominator
   evidence. Calculate break-even only when the required margin assumptions are
   known; nonpositive unit contribution does not yield a finite break-even volume.
5. Produce recommendations using documented policy thresholds. Missing material
   facts yield NEEDS_MORE_EVIDENCE. A loss is a valid result. Forecasts and
   assumptions remain distinct from actual values and evidence.
6. Version and link source records and output; include all evidence references,
   limitations, costs omitted and reasons. Retain audit history for corrections.
7. Add independently hand-calculated fixtures and negative controls for partial
   refunds, duplicates, unknown fees, actual-vs-estimated labor, zero customers,
   negative contribution, source/currency/period mismatch and unsafe arithmetic.
   Include a negative control proving wrong math fails the test executor.

## Later phases remain separate

ECO-3 connects verified source adapters; ECO-4 wires the shared coordinator and
downstream roles; ECO-5 adds forecast/capacity/portfolio reasoning; ECO-6 certifies
against independent/live/human evidence. Exact source authentication, bank proof,
advertising connection, causal attribution and autonomous spending are not
established by data shape checks or this handoff.

The owner supplies actual cost records, capacity/time assumptions and account
connections when those phases need them. Machine work must never self-approve
human readiness. Use launch-development-economics-foundation for this foundation
and create a distinct ECO-2 development card through readiness:update for the next
implementation. Do not mark the entire Economics role complete after one slice.
