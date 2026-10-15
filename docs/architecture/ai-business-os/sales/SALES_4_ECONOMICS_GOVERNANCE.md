# SALES-4 — Economics evidence and governance boundary

This phase binds an immutable SALES-3 draft proposal to the existing canonical Economics EconomicAssessment validator and records an **approval request**, never an approval.

- EconomicAssessment must pass Economics-owned structural validation, match organization/work and proposal service identity, have disposition CONTINUE and no unknown contribution/costs.
- The exact assessment digest/version and proposal digest/version are retained. No Sales price arithmetic is performed.
- ApprovalRequest is explicitly AWAITING_EXTERNAL_AUTHORIZATION, with all authority flags false. It cannot send customer contact, authorize a transaction, record acceptance, verify payment, or initiate fulfillment.
- External evidence registry attestation, freshness and authenticated human authorization remain integration gates. This is a **reference binding**, not a claim that an external approval has occurred.
- Scope is one service per economic product identity; multi-product economic allocation remains future work.
- Tests are initially fail-closed boundary tests; positive end-to-end certified Economics fixture and external human authorization are required before SALES-5 Gold certification.
