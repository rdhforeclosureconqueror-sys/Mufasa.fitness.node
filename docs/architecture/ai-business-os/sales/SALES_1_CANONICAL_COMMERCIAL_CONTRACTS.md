# SALES-1 — Canonical Commercial Contracts

Baseline: `ce0cb4a58177b70490aad6940abde41e010f807d`

SALES-1 introduces the first dedicated Sales domain contract layer. It intentionally contains no qualification decision engine, pricing, offer activation, CRM/customer contact, acceptance, payment or Production execution.

## Contracts

- `CustomerNeed`: organization/work-scoped need statement, evidence references and explicit unknowns.
- `CommercialOpportunity`: immutable commercial opportunity bound to an exact source artifact reference and one or more need artifact references.
- `QualificationInput`: pre-decision input bound to the exact opportunity digest. SALES-2 owns qualification reasoning.
- `ProposalReference`: deliberately non-authoritative proposal identity. SALES-1 only permits `PROPOSED` and requires acceptance/payment/fulfillment flags to remain false.
- `artifactRef`: deterministic SHA-256 reference over stable canonical artifact content.

Schema: `ai-business-os.sales/1.0.0`.

## Authority boundaries

These contracts preserve: opportunity ≠ qualified opportunity; proposal ≠ approved offer; approved offer ≠ customer acceptance; acceptance ≠ verified payment; payment ≠ fulfilled obligation. SALES-1 creates no artifact that can authorize contact, contracting, money movement or fulfillment.

## Acceptance

The dedicated test suite covers deterministic immutable references, organization/work scope rejection, exact opportunity digest binding, authority-flag rejection and mutation-sensitive artifact digests.

This PR establishes SALES-1 contract foundations only. **Sales Gold and Platinum remain unachieved.**
