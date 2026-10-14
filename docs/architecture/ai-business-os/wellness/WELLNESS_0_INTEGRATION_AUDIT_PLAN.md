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

## Executed source-level audit — 2026-10-14
Baseline: main `7ddeea05dcae49191d4fd2feddb158f5886fff31`. Inspection only; no runtime test or deployed secret inspection.

| Boundary | Observed code | Status / first failure |
|---|---|---|
| NFC entry | `public/quick-connect.html` routes to wellness, check-in, assessment, private sessions | PRESENT; no `utm_source`, campaign or event ID propagated on these links. FIRST FAILURE for source-specific funnel attribution is NFC entry → destination context. |
| Event catalog | `src/routes/communityEventCatalogRoutes.js` public GET, admin/super_admin protected write | PRESENT; routes installed only when durable catalog configured. Live persistence configuration UNVERIFIED. |
| Event check-in | `public/event-checkin.js` uses eventId query param or active event, guest-check-in and reflection endpoints | PRESENT; check-in page is not reached with eventId from generic NFC landing. Source attribution not forwarded to check-in payload. |
| Google discovery/measurement | `src/business-os/scout/google-sources.js` official read-only Search Console and GA4 adapters | PRESENT; requires token, property IDs and human-verified configuration; real provider reads UNVERIFIED. |
| Sales | `docs/architecture/ai-business-os/sales/SALES_0_ARCHITECTURE_AND_GAP_AUDIT.md` describes synthetic handoff, and later SALES-1/2 PRs exist | Commercial source-to-opportunity-to-conversion integration UNVERIFIED. |
| Operator marketing | `docs/EXTRACTION_OS_POCKET_PT_V1.md` says planning fields use browser localStorage | Not canonical server-side marketing evidence. |

### First failure and recommended first implementation
**FIRST FAILURE (source-code trace): NFC campaign identity is not captured or carried across the Quick Connect navigation.** This does not prove that GA4 or other analytics have no independent tracking; it means this specific first-party funnel cannot reliably attribute an event check-in to the NFC source from the inspected code.

Propose WELLNESS-1 as a backward-compatible, privacy-minimizing attribution contract: approved `campaignId` and `channel` allowlist, optional `eventId`, server-issued anonymous visit/session identifier, consent-aware collection, safe propagation to approved destinations, and aggregate-only admin reporting. Never claim a tap is a unique person or a booking. Preserve all existing links and guest check-in behavior. Test malformed parameters, spoofed event IDs, deduplication, opt-out, mobile navigation and first failure diagnostics.

### Unverified before production acceptance
- Whether real NFC tags currently point at Quick Connect or a different route.
- Production frontend/backend commit parity, persistent event catalog, deployed GA4/Search Console configuration and actual read results.
- Complete RSVP and check-in backend linkage, permission and consent semantics.
- Baseline conversion denominators and real participant outcomes.
- Test execution, CI checks and manual mobile NFC acceptance.

No certification or production enablement follows from this audit.
