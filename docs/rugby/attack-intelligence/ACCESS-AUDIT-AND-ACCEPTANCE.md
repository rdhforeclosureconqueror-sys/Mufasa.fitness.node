# Rugby HQ — Existing Access Audit and Implementation Gate

Date: 2026-11-19
Status: Source-level inspection completed; runtime authorization and live access not yet verified.
Scope: Existing Rugby HQ, not a new app or login.

## Verified in repository

- `public/rugby.html` is a public landing page with a link to `/rugby-player.html`.
- `public/rugby-player.html` hides the dashboard until `AuthNavigation.requireUser({returnTo:'/rugby-player.html'})` returns `ok`; otherwise it redirects or shows an error.
- The player dashboard already contains profile, assessments, recovery check-in, diagnostics, and an eight-week in-season educational pathway.
- The current feature branch adds a coach-review Attack Intelligence preview **inside the existing dashboard**.
- The architecture plan `docs/architecture/RUGBY_COACHING_OS_INTEGRATION_PLAN.md` documents existing bearer auth and permission middleware for server-side access controls.

## Not yet verified — do not assume

- Whether a separate rugby-specific password or access code exists in deployed infrastructure.
- Whether the existing user login is sufficient to distinguish Quins members from other Milele Fit members.
- Whether any directly requested tactical JSON/PDF/media assets are blocked for unauthenticated and unauthorized users.
- Whether deployment configuration adds another access gate outside this source.
- Whether current GitHub CI validates tactical content authorization.

## Acceptance checks before publishing tactical material

1. Without session: requesting any tactical API, document or media URL returns 401/403, not the file.
2. With ordinary Milele Fit account not authorized for Quins: same requests return 403.
3. With authorized Quins player: only approved player-facing lessons are readable.
4. With authorized Quins coach: review/approval controls available; players cannot approve.
5. With admin: can revoke access and inspect access logs.
6. Password/code is verified on the server, not in browser JS; no secrets committed to GitHub.
7. The current rugby landing and player dashboard remain functional; denied access does not break existing features.
8. CI regression tests and a rollback commit are available before merge/deploy.

## Product direction

One Rugby HQ inside `Mufasa.fitness.node`, reusing the existing identity and player dashboard. Attack Intelligence cards: Structure & Chaos, 4 P's, Midfield Hitup. Each lesson links original source, approved tactical playbook, movement demo, structure/chaos exercise, and quiz. No parallel login or second player-facing site.

## Next implementation

Trace existing deployed team access code or role gate through server routes/config; if a separate gate exists, reuse it. If it does not, extend the existing server-side authorization minimally. Only then connect full tactical source and media endpoints. Preserve current live site and use review → tests → merge → deploy → live verification.
