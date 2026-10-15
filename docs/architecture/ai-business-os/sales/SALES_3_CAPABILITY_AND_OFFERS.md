# SALES-3 — Capability validation and proposed offers

SALES-3 is a bounded, deterministic **proposal-only** capability. It consumes a qualified SALES-2 assessment and evidenced service capabilities to produce an immutable offer proposal. It does not set price, approve offers, contact customers, accept contracts, verify payments, or trigger fulfillment.

## Boundaries
- Capability status must be SUPPORTED with evidence references; UNKNOWN and UNSUPPORTED fail closed.
- Organization/work identities must match on all artifacts and references.
- Proposal status is PROPOSED and all authority flags remain false.
- Line items are single-unit descriptions with explicit limitations; monetary calculations and discounts are deferred to SALES-4 certified Economics binding.
- Proposal version and artifact digest are preserved using the SALES-1 canonical artifact reference.
- This contract records reference identity and declared qualification disposition, **not independent attestation of the original evidence source**. Caller must obtain artifacts from trusted governed storage; signed/provider verification is a later integration gate.

## Acceptance
Focused tests cover qualified proposals, immutable replay, missing evidence, unsupported capabilities, scope mismatch, forged reference shape, and unauthorized activation/pricing. CI must pass before merge. No Gold/Platinum claim.
