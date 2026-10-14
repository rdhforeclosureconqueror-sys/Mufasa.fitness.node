# WELLNESS-0 — Community Wellness Marketing Integration Audit

Status: AUDIT ONLY — no production authorization or certification.

## Decision
Prioritize Community Wellness (yoga, meditation, pranayama, sound bowl experiences) as the first commercial discovery vertical. Keep Push-Up Arena independent and nonblocking.

## Current repository evidence to inspect
- Shared Business OS: Scout, Analyst, Experiment Manager, Economics, Sales, Learning, Manager and governance.
- Scout: `src/business-os/scout/`, Google Search Console / GA4 read-only connector seams and certification gates.
- Sales: SALES-0 through SALES-2 contracts, qualification logic and evidence requirements.
- Fitness: Community Wellness Hub, NFC Quick Connect, event creation, RSVP, check-ins, private-session booking, optional trial, notifications.
- Current main and deployment configuration must be verified independently. Code presence is not proof of live connectivity.

## Required source-to-outcome contract
Public community/event discovery → evidence-backed lead classification → human-approved organizer outreach → NFC campaign attribution → consented website visit → registration → RSVP → actual check-in → return attendance → booking or trial → measured outcome → Scout/Analyst/Learning feedback.

Every transition must have a canonical event name, provenance, timestamps, organization boundary, consent/legal basis, retention policy, deduplication key, idempotency behavior, error state and FIRST FAILURE diagnostics. Do not infer identities from public event attendance.

## Discovery scope
Dallas/Addison/DFW yoga communities, meditation circles, breathwork/pranayama events, sound baths, run clubs, wellness communities, apartment wellness and emerging scream clubs. Scream clubs are a discovery hypothesis, not verified demand. Use only authorized public/read-only sources and obey platform terms. Distinguish event leads, organizers, expressed customer interest and paying customers.

## Audit checklist
1. Inspect current main, existing tests and open PRs; inventory each boundary and its owner.
2. Trace real Community Wellness entry points and NFC links through server persistence, auth, roles and event/check-in flows.
3. Verify whether Search Console/GA4 have authorized live-source evidence; never expose credentials.
4. Identify the FIRST FAILURE for every missing integration; do not silently substitute mock or synthetic data.
5. Establish baseline funnel metrics: campaign-tagged visits, signups, RSVPs, check-ins, repeat attendees, requests, trials, payments and opt-outs. Count only verified records.
6. Assess organizer outreach approval, no unsolicited mass messaging, no automated spending or publishing.
7. Verify economics cost/capacity inputs and independence of actual conversion measurements.
8. Build industry-standard vs repository-current vs Gold/Platinum gap matrix.
9. Propose the smallest deployable vertical slice, regression tests, staged rollout, feature flag, rollback triggers and acceptance criteria.
10. Run available tests and report precise pass/fail/skipped and live-evidence gaps.

## Initial proposed milestones (not implemented)
- WELLNESS-0: repository and production integration audit.
- WELLNESS-1: canonical campaign/source attribution and consent-safe funnel event contracts.
- WELLNESS-2: instrument NFC → visit → registration → RSVP → check-in.
- WELLNESS-3: human-reviewed public discovery and partnership lead queue.
- WELLNESS-4: aggregate outcomes → Analyst/Economics/Learning feedback.
- WELLNESS-5: independent QA, limited pilot, live evidence and human acceptance.

## Guardrails
No production changes, scraping restricted sources, contacting prospects, self-approval, customer-data export, spending or marketing certification from this audit. Preserve existing Community Wellness behavior. Require review before merge.
