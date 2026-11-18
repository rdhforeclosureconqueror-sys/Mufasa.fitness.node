# Marketing Bot — Platinum Resumption Baseline (2026-11-18)

## Decision
Resume the Marketing Bot / AI Business OS role work now. Freeze new notification infrastructure features. The notification primitives merged in PRs #1294–#1303 are not evidence of live dispatch, production migration, authenticated provider activation or commercial certification.

## Verified source-of-truth findings
- `docs/architecture/ai-business-os/MASTER_HANDOFF.md`: Full Brain + Thin Body; one governed Brain and shared runtime, with Scout, Analyst, Experiment Manager, Economics, Sales, Production, QA, Learning, Manager as roles rather than independent brains. Full lifecycle: Observe → Understand → Reason → Decide → Plan → Authorize → Act → Verify → Measure → Learn → Reflect → Improve.
- `docs/architecture/ai-business-os/experiment-manager/README.md`: internal core readiness only; E1/E3/E5/E6/E7 partial; application authentication, durable decision records, independent downstream QA/Economics/Learning consumers and real source verification remain unproven. Platinum/live-enabled false.
- `docs/architecture/ai-business-os/sales/SALES_0_ARCHITECTURE_AND_GAP_AUDIT.md`: Sales role and synthetic handoff exist, but commercial opportunity, qualification, quote, acceptance, payment and fulfillment contracts are missing or partial; Gold and Platinum not achieved.
- PR #1038 is an older draft WELLNESS-1 NFC campaign/check-in acceptance change, not merged or certified. Its current mergeability and CI must be independently reviewed; do not merge it solely as part of this audit.

## Immediate gated plan
1. Re-establish current main-branch inventory for Scout, Analyst, Experiment, Economics, Sales, Production, QA, Learning and Manager; record each module's implemented contracts, live wiring, test evidence and first failure. Do not infer live capability from a role name or synthetic test.
2. Run existing Academy and end-to-end synthetic scenario runners; separate verified results from documentation claims and stale historical runs.
3. Trace one narrow Milele Fit customer journey: attributable prospect → Analyst assessment → authorized Experiment → Economics decision → Sales proposal → human-approved outreach → registration/RSVP/check-in → CRM readback → Learning. Stop at first missing authoritative boundary; no unsolicited real outreach, spending or payment changes.
4. Implement the smallest failing boundary on a dedicated PR, with negative tests and provenance. Pause for review; next turn review → fix → merge → deploy → verify.
5. Define Platinum gates by evidence: security/authority, durable replay and recovery, source provenance, independent QA, realistic evaluation, observable business outcomes, and no unsupported production claims.

## Explicit hold/backlog
Notification production database ownership/migrations, real provider, secrets, provider idempotency, durable dispatch wiring, authenticated reconciliation and real delivery acceptance are deferred. Their current absence must remain visible; never mark live sending enabled.

## Next engineering target
Create a reproducible **Marketing Bot first-failure acceptance runner** using the canonical shared runtime and existing experiment acceptance scenarios, reporting per-role PASS/PARTIAL/BLOCKED and an actionable first failure. Do not create new parallel bot architecture.
