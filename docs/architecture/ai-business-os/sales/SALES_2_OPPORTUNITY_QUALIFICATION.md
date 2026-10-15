# SALES-2 — Opportunity Qualification

Baseline: `817817961eeb1c960fa47cb144fe61852d790146`

SALES-2 adds deterministic, evidence-based opportunity qualification. It does not contact prospects, score personalities, invent probabilities, price offers, activate proposals or create commercial obligations.

## Truth model

Each explicit qualification criterion is one of `SATISFIED`, `UNSATISFIED`, `UNKNOWN`, or `CONTRADICTED`.

Deterministic disposition precedence is:

`CONTRADICTED → ESCALATE`  
`UNSATISFIED → DISQUALIFIED`  
`UNKNOWN → NEEDS_MORE_EVIDENCE`  
otherwise → `QUALIFIED`.

A decisive criterion requires evidence. UNKNOWN cannot carry decisive evidence, and a qualification with missing/unknown evidence cannot be promoted to QUALIFIED.

The assessment remains organization/work scoped and references a SALES-1 `QualificationInput`. It has no customer-contact, contracting, payment, discount, fulfillment or Production authority.

## Acceptance

Focused tests cover qualification, disqualification, missing evidence, contradiction escalation, evidence requirements, duplicate criteria, cross-scope rejection, manual promotion attacks, deterministic replay and immutability.

This environment has not independently executed the Node suite; source-level tests are not represented as executed evidence. Hosted CI, if present, must be inspected separately.

**SALES-2 complete does not certify Sales Gold or Platinum.**
