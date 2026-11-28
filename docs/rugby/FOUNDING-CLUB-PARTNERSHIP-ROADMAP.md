# Founding Club Partnership — athlete activation and commercial integration
Date: 2026-11-28. Status: planning only; no commercial activation or club agreement.
Companion to DIGITAL-ACADEMY-ROADMAP.md (P08/P09) and master-intelligence-v1/ROADMAP.md. Do not change their completion counts. Proposed first pilot: Quins, subject to agreement.

## Source audit
- PRs #1439–1442 merged: full XV capture, evidence-backed priorities, learning guides and authenticated navigation. Production signed-in acceptance remains outstanding.
- master-intelligence-v1/DEVELOPMENT_PRIORITIES.md: saved priorities pin evidence and exercise versions; corrected evidence triggers review. No prescription authority.
- src/program-engine/programService.js: existing assign, updateSession and view; assignment currently generates and activates a program, session status and analytics exist. Do not call assign merely to draft; inspect persistence, authorization and replacement/version behavior before bridging.
- data/rugby/master-intelligence-v1/policies/beast-mode-development-cycle.json: inactive owner-directed policy, coach review, comparable retest and field transfer required; no automatic progression.
- src/services/nutritionService.js: meal logging, weekly plans and missions; trace authorized aggregate adherence, not raw private data.
- src/billing/membershipPlans.js: Essential 999, Performance 1999, Unleashed 3999 cents monthly; nutrition/recovery listed in Performance. No $5 athlete plan in this catalog.
- src/services/membershipService.js: Stripe checkout and entitlement status infrastructure; verify paid invoice history, refunds, disputes and replay before commissions.
- public/retention-journey-wizard.js, public/daily-check-in.js and related tests exist; source trace and live evidence pending. Do not equate XP, login or check-in with prescribed session completion.
- src/routes/quinsProtectedRoutes.js: authenticated tactical allowlist/admin or explicit preview. Not a verified club roster or commercial entitlement. No cross-team authorization claim.
- Recursive main tree inspected, not truncated. No dedicated ambassador/referral/sponsorship filenames identified; semantic/server route audit still required before concluding absent.

## Proposed commercial rules (not active)
$5/month athlete offer; $100/$120/$150 monthly club sponsorship tiers; 21/30/60/90-day milestones; proposed $4 referral commission after two paid months. Exact qualification thresholds, grace periods, attribution window, cancellation/refund handling, eligible cohort denominator, payout timing and budget require owner approval. Public referral pricing must match actual eligible plan, not assumed benefits. No payment or payout on login/XP alone. No retroactive attribution without auditable approval. No commitments until unit economics and club agreement are approved.

## Delivery checklist
- [ ] FC01 Complete capability trace: canonical identity, team scopes, program routes/persistence, session evidence, nutrition/recovery aggregates, retention, billing webhooks and referral search. Initial source inventory above is partial.
- [ ] FC02 Priority-to-program bridge: versioned draft pins current evidence; coach selects dosage and approves before assignment via canonical service. Reject stale evidence, unauthorized actor, cross-athlete access and duplicate submission; preserve existing assignment until explicit approval. No automatic stage or medical clearance. Test draft/approve/assign/complete/retest readback and rollback.
- [ ] FC03 Athlete activation: position guide, baseline, approved plan, scheduled training/recovery and 21-day review. Use existing identity and retention; distinguish missing evidence, rest, modified and completed sessions. Test signed-in mobile and interrupted journey.
- [ ] FC04 Club roster/cohort and qualification: explicit enrollment, consent, fixed denominator and versioned rules; 21/30/60/90-day evidence snapshots. Club views aggregate only; deny unrelated/revoked/cross-team access and prevent small-group privacy leaks.
- [ ] FC05 Billing/referrals: dedicated server-authorized partner entitlement; preserve public tiers. Verified paid invoices, unique attribution, idempotent ledger, refund/dispute reversals, manual payout approval, budget caps. Sandbox tests before any live changes.
- [ ] FC06 Founding pilot: signed club agreement, owner-approved terms, production device acceptance, initial cohort and baseline; monitor activation, retention, adherence, contribution margin and coach workload. No performance guarantees.
- [ ] FC07 Expansion only after pilot evidence and team isolation acceptance.

## Next action
Finish FC01 program and authorization trace, then implement FC02 as the first functional PR. Keep commercial policy disabled until approved. Existing academy P01 security gate remains applicable before private club data. Each PR records source evidence, tests, limitations, rollback and next action. This document alone changes no runtime, data, Stripe settings or roadmap completion.
