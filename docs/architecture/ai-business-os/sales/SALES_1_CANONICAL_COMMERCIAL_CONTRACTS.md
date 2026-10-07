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

The dedicated test suite covers deterministic immutable references, organization/work scope rejection, typed CustomerNeed/CommercialOpportunity references, SHA-256 digest shape and exact opportunity binding, duplicate-need rejection, authority-flag rejection, conflicting kind/schema rejection, non-canonical/cyclic-value rejection, and mutation-sensitive artifact digests.\n\nReview hardening deliberately restricts `artifactRef` to canonical Sales artifacts carrying this Sales schema version; arbitrary caller objects cannot be promoted into canonical Sales references.

Review note: this environment can inspect and modify GitHub but does not execute the Node test suite itself. Test results must therefore come from hosted CI or a later executable runner; source-level test presence is not represented as executed evidence.\n\nThis PR establishes SALES-1 contract foundations only. **Sales Gold and Platinum remain unachieved.**
