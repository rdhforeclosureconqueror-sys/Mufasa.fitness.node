# ECO-6C Economics Adversarial and Fail-Closed Certification

**Decision: `ECO_6C_PASS`**  
**Starting main SHA:** `35ca5c0b60c0fc07c001e6a63444a1066008ea8f`  
**Baseline source:** the supplied checkout was exactly the starting SHA; `git fetch origin main` could not be performed because this checkout has no configured Git remote.  
**Certification date:** 2026-10-04  
**Final implementation SHA:** `119bf14163012da13c8cddad696fb7a360123a01`

## Scope and method

This is a bounded, synthetic/internal security, correctness, and truthfulness certification of the production ECO-2 through ECO-5E modules and their actual Organization and Experiment Manager boundaries. It is not ECO-6D/E, a live financial-system certification, an accounting audit, or human acceptance. No simulated replacement implementation or unconditional-success validator is used. The new suite constructs a valid production workflow, changes one security-relevant field at a time, and checks the production entry point's rejection or truthful qualified result.

Before changes, the Economics and Experiment Manager regression command passed **234/234 tests, 0 failed, 0 skipped**. ECO-6A and ECO-6B reports, their executable suites, the organization economic workflow, Experiment Manager manager/authority contracts, readiness evidence, and every Economics production module were inspected.

## Threat model and trust-boundary matrix

| # | Boundary and production entry point | Attacker controls | Required validation | Fail-closed result |
|---|---|---|---|---|
| 1 | Caller → `EconomicInput` | identity, scope, classification, amount, source declaration | schema/version, USD, periods, safe nonnegative minor units, classification/value consistency | constructor rejection |
| 2 | `EconomicInput` → `EconomicAssessment` | input set, order, duplicates, economic view | exact compatible scope/period, unique identity/source, coverage, checked arithmetic | rejection or explicit UNKNOWN/PARTIAL/INVALID/NOT_APPLICABLE |
| 3 | evidence → provenance (`validateEconomicProvenance`) | supplied registry records, claims, source metadata | exact scope, claim, record/version/hash, freshness, supersession, conflicts, availability | rejection; no trusted assessment |
| 4 | assessment → `GovernedDecision` / `authorizeExecution` | artifacts, refs, role, decision | sealed digest, exact lineage, one human decision, trusted provenance, scope | non-authorizing denial |
| 5 | decision → `ExperimentApproval` | decision/approval IDs, proposal binding, budget, actor | authenticated active HUMAN, exact proposal/version/digest and bounded grant | approval/start rejection |
| 6 | run → result (`complete`, `validateResult`) | run/result-shaped values, measurements | stored run, state, declared metrics, evidence/sample coverage | rejection or qualified result class |
| 7 | result → reconciliation | serialized result and validator | mandatory validator plus deep equality to authoritative stored result and exact run/proposal scope | reconciliation rejection |
| 8 | reconciliation → calibration | decisions, assessments, reconciliation/ref, cohort | immutable digests, operative expectation, actual binding, compatible cohort/status | rejection or NOT_COMPARABLE/PARTIAL |
| 9 | assessment → scenario/sensitivity | overrides, axes, ranges, view | exact baseline digest/scope, one declared delta, safe bounded values, hypothetical classification | rejection or explicit unresolved descriptive output |
| 10 | assessments → portfolio | membership, assessment/scenario/calibration refs | exact digests, leaf/nonoverlap, compatible scope/view/currency/period, checked additive aggregation | rejection or visibly incomplete descriptive output |

## Executed attacks and evidence map

The dedicated suite directly certifies:

- same-ID payload changes, incorrect digest, cross-organization/work substitution, duplicate chain membership, wrong upstream binding, and mutation resistance; the organization authorizer intentionally accepts reordered complete chain references, which the test documents rather than treating order as a security boundary;
- incorrect evidence digest/version, wrong artifact/evidence binding, organization/product/campaign substitution, wrong source record, claim mismatch, and caller-forged source declarations;
- UNKNOWN-as-zero, invalid negative/overflow/unsupported-currency inputs, and preservation of PARTIAL, INVALID, NOT_APPLICABLE, zero-denominator, and relative-precision semantics;
- AI-for-human substitution, modified/reused decisions, forged approvals, post-approval budget increase, and absence of spend/authorization in descriptive outputs;
- forged/same-ID-modified/cross-organization/wrong-run/wrong-proposal/incomplete results, missing validator, unrelated validator return, mutation after retrieval, and replay against another run;
- decision/result/actual/digest/period/currency reconciliation substitutions, calibration binding, and absence of probability or automatic forecast correction;
- deterministic replay of every canonical cross-role artifact and output.

Mandatory cases already executable in focused production regressions were intentionally reused rather than duplicated:

| Attack family | Existing executable evidence |
|---|---|
| Economic arithmetic, missing categories, refunds/discounts, duplicates, mixed ACTUAL/EXPECTED, precision/overflow and zero denominators | `ai-business-os-economics-engine.test.js`: “unknown is never zero…”, “zero denominators…”, “losses and refunds…”, “mixed currency/scope…”, “unknown refunds and discounts…” |
| stale/superseded/missing/conflicting/duplicate/wrong-scope/wrong-period/incorrect-classification evidence | `ai-business-os-economics-provenance.test.js`: missing/duplicate/reused, scope isolation, stale, superseded/version, contradictory sources, duplicate records, ACTUAL-vs-estimate tests |
| same-ID decision modification, proposal/run/approval lineage and incomplete run | `ai-business-os-economics-gold-certification.test.js` adversarial matrix and `ai-business-os-economics-workflow.test.js` mutation/authority tests |
| backdating, forged expectation, modified decision/reconciliation, actual/result mismatch, zero actual, missing actual, insufficient coverage, invalid status/cohort | `ai-business-os-economics-reconciliation.test.js` and `ai-business-os-economics-historical-calibration.test.js` |
| scenario/actual mixing, duplicate delta, invalid ranges, unresolved inputs, false precision | `ai-business-os-economics-scenario-modeling.test.js` and `ai-business-os-economics-sensitivity-analysis.test.js` |
| infeasible capital combinations, dependencies, mutual exclusion, silent selection, allocation-as-spend | `ai-business-os-economics-capital-allocation.test.js` |
| duplicate/overlapping/parent-child members, mixed compatibility, tampered digests, incomplete coverage, invalid/NA/negative/zero/shared-cost/ratio attacks | `ai-business-os-economics-portfolio.test.js` |
| authenticated approval, cumulative budget, forged identity/session, boundary mismatch, incomplete/contradictory/false-success results | `ai-business-os-experiment-manager.test.js` canonical Academy and focused manager tests |

The dedicated suite executes eight test groups, not a distinct new test for every attack named in the matrix. The remaining attack families are mapped to existing focused tests, which Codex reports it re-executed in this certification run; the documentation does not independently establish exhaustive threat coverage.

## Qualified-status outcomes

Unknown money remains `null`, never zero. Partial inputs retain missing-input coverage. Invalid is not softened to unknown. Not-applicable is not calculated. Scenario results remain hypothetical. Reconciliation can remain `PARTIALLY_RECONCILED`, and calibration can remain `PARTIAL`/`NOT_COMPARABLE`; neither manufactures accuracy, probability, causality, or corrections. Portfolio totals expose unresolved/not-applicable coverage and never aggregate ratios. Capital and portfolio results expose `authorization`, `reservation`, `spend`, and `execution` as null.

## Evidence authority qualification

ECO-3 strongly validates internal consistency of a caller-supplied evidence registry: exact source record/version/hash, scope, claim, freshness, supersession, conflict, and classification. It does **not** independently connect to, authenticate, or cryptographically attest the named accounting/payment system. A caller can construct internally consistent source declarations, and the result truthfully preserves that supplied source name; this certification therefore does not claim live-system authenticity. Independent external authority must be provided by an authenticated repository/adapter outside this bounded module before live financial reliance.

Experiment results have a stronger in-process authority boundary: reconciliation requires the real manager validator, and the manager accepts only content exactly equal to its stored result. The dedicated negative control proves that merely returning unrelated plausible content from a supplied validator is rejected.

## Mutation and replay ledger

Each dedicated case changes one relevant dimension or iterates single-field variants. Expected outcomes are constructor exception, validator exception, non-authorizing denial, or explicit qualified status; all actual outcomes matched. Valid fixture replay produced deep-equal expected artifacts, human decision, approval, run, stored result, actual artifact, reconciliation, and calibration observation. Operational timestamps are fixed only in the synthetic fixture; the certification does not require real operational clocks to be globally deterministic.

## Vulnerabilities and corrections

No production vulnerability was reproduced. Consequently, **no production code was changed**. The certification adds only adversarial executable evidence, this report, and readiness records. Weakening an assertion was neither necessary nor permitted.

## Exact newly executed results

| Command | Result |
|---|---|
| Baseline `node --test test/ai-business-os-economics-*.test.js test/ai-business-os-experiment-manager.test.js` | PASS — 234 tests, 234 pass, 0 fail, 0 skipped |
| `node --test test/ai-business-os-economics-adversarial-certification.test.js` | PASS — 8 tests, 8 pass, 0 fail, 0 skipped |
| `node --test test/ai-business-os-economics-*.test.js test/ai-business-os-experiment-manager.test.js` | PASS — 242 tests, 242 pass, 0 fail, 0 skipped |
| `node --test test/ai-business-os-*.test.js` | PASS — 500 tests, 500 pass, 0 fail, 0 skipped |
| `npm run lint` | PASS — selfcheck ok |
| `npm run readiness:validate` | PASS |
| `git diff --check` | PASS |

## Remaining risks and limitations

- Evidence and financial values are synthetic/internal; no live accounting, processor, market, bank, settlement, or cryptographic source authentication is claimed.
- The valid integration fixture's authority adapter is bounded and strict but test-only; it does not claim a live authenticated browser/session.
- Experiment Manager authoritative state is in-memory in the dedicated fixture; durable lifecycle behavior is separately executed by the full Business OS suite.
- No financial conclusion authorizes execution, reservation, settlement, pricing, allocation, or spending. Human governance remains mandatory.
- No UI, browser, production, physical-device, visual-quality, movement-naturalness, UX, or human acceptance was performed or self-approved; those are not backend certification evidence.
- This certification does not implement or claim ECO-6D or ECO-6E.

## Evidence references

- Dedicated executable evidence: `test/ai-business-os-economics-adversarial-certification.test.js`.
- Reused executable evidence: `test/ai-business-os-economics-*.test.js` and `test/ai-business-os-experiment-manager.test.js`.
- Baseline integration report: `docs/architecture/ai-business-os/economics/ECO_6B_CERTIFICATION.md`.
- Repository audit/card: `data/readiness/development-evidence.json` and `data/readiness/development-cards.json`, card `launch-development-economics-eco6c`.

## Certification conclusion

`ECO_6C_PASS`

Executable evidence shows that the defined adversarial workflows cannot manufacture economic truth, trusted provenance, human approval, authoritative experiment results, reconciliation certainty, portfolio authority, or spending permission. The meaningful remaining boundary is explicit: supplied evidence metadata is consistency-checked but is not independently authenticated against a live external system.
