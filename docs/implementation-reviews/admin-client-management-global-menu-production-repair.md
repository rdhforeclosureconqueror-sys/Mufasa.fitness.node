# Admin Client Management + Global Menu Production Repair

## Summary
This repair stabilizes the single shared global navigation runtime, exposes the existing Client Management CRM to administrators, fixes the CRM pages to consume canonical authentication, and strengthens authoritative membership/role projections.

## Human Production Bugs
Authentication worked, but Menu appeared inert during auth restoration and Client Management was not discoverable. The CRM pages also read retired `authToken` storage rather than `AuthStateRuntime`, so their authorized API calls could fail even after a successful canonical login.

## Exact Menu Root Cause
`global-nav.js` rendered immediately, attached handlers directly to injected nodes, awaited asynchronous auth restoration, and rendered a second time. `auth:changed` could cause another render as well. Each render replaced `header.innerHTML`, destroying the button/drawer/backdrop nodes and their listeners. A user tap during that window operated on a node that was immediately discarded and the newly rendered drawer returned closed, producing the observed intermittent no-op. The repair installs one delegated document click owner, guards initialization, preserves open state across auth renders, and never depends on listeners attached to replaceable injected nodes.

## Existing Admin/Client Infrastructure Found
The repository already contained `clientCrmService`, `clientMessagingStore`, admin CRM APIs, trainer/client assignment authorization, member intake, assessments/OHSA, workout sessions, program/challenge data projections, and the user-facing inbox. Those systems are reused, not duplicated.

## Existing admin-client.html Purpose
`public/admin-client.html` is the existing single-client detail/journey page, not an all-member directory. It remains the detail destination. `public/admin-members.html` is the authoritative directory.

## Architecture Decisions
* Keep `global-nav.js` as the one navigation owner and use delegated events resilient to markup replacement.
* Keep `/admin/members.html` as the authoritative directory and `/admin/client.html?userId=…` as detail.
* Keep the existing conversation store and `/api/me/conversations/...` read/send routes.
* Treat browser role state as presentation only; server middleware remains authoritative.

## Files Changed
`public/global-nav.js`, the public HTML cache-busted references, the two CRM HTML/JS surfaces, dashboard HTML/JS, `src/services/clientCrmService.js`, focused tests, and this review.

## Routes/APIs
* Directory: `GET /admin/members.html`; data: `GET /api/admin/members`.
* Detail: `GET /admin/client.html?userId=<id>`; data tabs: `GET /api/admin/clients/:clientUserId/{overview,intake,assessments}`.
* Messaging action: `POST /api/admin/clients/:clientUserId/conversation`, followed by authorized `GET|POST /api/me/conversations/:conversationId/messages`.

## Admin Member Directory
The directory shows name, email, low-prominence ID, resolved role, creation/last activity, enabled/disabled and active/inactive state, authoritative membership state, program/challenge, intake/assessment, workout and unread-message summaries. Search, pagination, sort, activity, membership, journey, unread, and role filters are backend-applied.

## Client Detail/Journey View
The existing overview, intake, assessments, timeline, program, challenge, recent workout, and secure message tabs are preserved. The summary now includes role and account ID. No new medical data is created.

## Membership Classification
`membershipService.getMembership()` is the source. `active` projects to paid, `trialing` to trial, `inactive` to free, canceled states to canceled, payment failure/expiry states to expired, and unsupported statuses to unavailable. Browser access-tier guesses no longer produce a paid classification. The raw authoritative status remains available to the admin projection.

## Messaging Integration
“Message” in the directory opens the detail messaging tab. That tab creates/opens the existing authoritative staff/client conversation and reads/sends through existing inbox APIs. Participant checks return not-found for guessed conversation IDs.

## Authorization
Directory and detail APIs require authentication and `client.crm.read`; conversation creation additionally requires `client.messages.write`. Admins see registered identities; trainers remain limited to active trainer/client assignments. Ordinary users cannot list accounts or read another member's CRM detail. Query parameters do not affect server role resolution.

## Dashboard Changes
An admin-only Client Management card links to `/admin/members.html`. It uses the same canonical auth role reveal logic as other admin controls.

## Global Menu Changes
The admin label is now “Client Management.” One document-level click handler owns toggle, backdrop and Sign Out actions. Escape, focus entry/return, body lock, independent drawer scrolling, repeated cycles, and open-state preservation are maintained. Safe diagnostics report bundle, initialization count, required-node/listener presence, state, auth role and page without secrets or personal data.

## Mobile Behavior
The existing 48px Menu target, fixed drawer/backdrop, safe-area padding, independent momentum scrolling, body lock, bounded width and stacked CRM table/card rules support 320, 375, 390 and 430px layouts without pushing page content.

## Accessibility
The toggle maintains `aria-expanded`, `aria-controls`, and changing labels. Focus enters the drawer, returns to Menu on close, Escape and backdrop close, status messages are live, and controls retain visible focus indicators.

## Tests Added/Run
Focused navigation/CRM/service/API authorization tests cover role-aware menu visibility, single initialization/listener ownership, auth-render state preservation, diagnostics, canonical CRM auth, dashboard entry, membership projection, search/filter behavior, admin/member cross-user denial, guessed conversation denial, messaging reuse and mobile CSS contracts. Exact final totals are recorded in the final continuation report and CI command output.

## Exact Totals
Focused suites: 21 tests passed (20 navigation/CRM unit-contract tests plus 1 authenticated API authorization test). Full `npm test`: 1,255 passed, 0 failed, 0 skipped.

## Route Verification
The focused API test logs in real admin/member identities against `createApp`, verifies admin directory/detail success, member directory/detail denial, search, conversation creation, and non-participant denial.

## Authenticated Verification
Canonical login/logout regressions and the new authenticated CRM route test execute against an ephemeral server and on-disk stores.

## Security/Privacy Notes
No tokens, message bodies, credentials or personal data enter navigation diagnostics. CRM APIs remain permission guarded. Detail access checks trainer assignment/admin role. Message reads/sends remain participant-only. Membership is server projected.

## Binary Status
No binary file is intentionally added or modified; final Git binary-diff verification is required before merge.

## Rendered Browser Status
Rendered browser executed: NO. Playwright is unavailable in this environment; responsive and interaction contracts remain CI-ready and were programmatically verified.

## Known Limitations
The detail page presents several established journey objects as escaped structured data rather than bespoke editors. Unsupported membership provider statuses are deliberately shown as unavailable. No new trainer notes system was created because the request forbids duplicating systems and no CRM-specific notes store is required for this repair.

## Merge Readiness
All automated test, lint, route-authorization, text-diff, and binary-diff checks pass. Ready for commit and human production smoke test.

## Commit Hash
Use `git rev-parse HEAD` on the committed repair (the final response records the exact immutable hash).

## Recommended Next Action
Deploy the committed repair to staging/production, clear the affected static asset cache, and execute the exact admin/member iPhone smoke test in the continuation report. Stop after verification; do not begin another feature phase.
