# INDEPENDENT REVIEW HANDOFF — PRIVATE SESSIONS QUOTE FUNNEL V1

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

## Role
Act as an independent reviewer. Do not merge. Inspect current main and this PR independently.

## Product requirement
Add `Private Sessions` as a first-class Retention Journey entry. It must be a quote/request funnel, not checkout and not an automatic pricing engine.

The member should provide:
- desired services: personal training, yoga, pranayama, meditation, sound bowl, integrated blend
- location preference: gym / outside / mixed / unsure
- 1 / 2 / 3 private sessions per week
- payment preference: per-session / weekly prepaid / monthly prepaid
- PocketPT system interest
- monthly budget range
- optional notes

No coaching price may be calculated or displayed. No payment is required to submit the request.

The request must persist to the canonical user and be visible through trainer workspace detail. Trainer should decide the quote and follow up through existing communication channels.

After submission the member may enter the existing 7-day PocketPT trial. The private-session flow deliberately links to the Performance trial, not Unleashed; avatar creation/use is explicitly excluded from this trial experience.

## Files to inspect
- `public/retention-journey-start.html`
- `public/retention-journey-start.js`
- `public/private-sessions.html`
- `public/private-sessions.js`
- `src/services/privateCoachingQuoteService.js`
- `src/routes/privateCoachingQuoteRoutes.js`
- `src/services/trainerWorkspaceService.js`
- `world-bridge-server.js`
- `test/private-coaching-quote.test.js`

## Required checks
1. Retention Journey visibly contains Private Sessions and routes to `/private-sessions.html`.
2. Unauthenticated users are redirected through canonical login and can return.
3. The form never exposes the internal training price table or calculates a quote.
4. Stored fields are bounded and allowlisted.
5. Quote submission writes to the canonical user store only.
6. Trainer workspace detail exposes the private coaching request without creating a second CRM.
7. Production entrypoint installs GET/PUT `/api/me/private-coaching/quote`.
8. Existing Run Club and world bridge startup remain intact.
9. The 7-day trial handoff uses Performance and does not advertise avatar as usable.
10. Review whether backend avatar routes need an additional trial-status guard. The current avatar route contract is authentication-based, so do not claim hard backend trial isolation unless verified.
11. Run focused tests plus relevant trainer workspace/auth/route tests.

## Verdict
Return exactly one:
- `APPROVE FOR OWNER TESTING`
- `CHANGES REQUIRED`

If changes are required, repair the existing branch/PR rather than opening a disconnected replacement.