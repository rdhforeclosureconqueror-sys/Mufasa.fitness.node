# Admin Client CRM, Member Directory, and Messaging — Implementation Review

## Summary
This phase adds an authorized, paginated member directory, progressively loaded client record, private existing coach notes, and persistent participant-scoped plain-text messaging.

## Scope
The delivered surfaces are `/admin/members.html`, `/admin/client.html?userId=…`, and `/inbox.html`. Destructive member and billing controls are intentionally excluded.

## Existing Admin Architecture Audit
The repository already had bearer authentication, configured `super_admin`, `admin`, `trainer`, and `user` roles, permission middleware, an authorization contract, a filesystem user store, Stripe-derived memberships, trainer/client assignments, private trainer notes, journey intake, OHSA/assessments, programs, challenge/session records, notifications, WebSockets for unrelated runtime events, and admin audit infrastructure. No direct-message model or member inbox existed. These authorities were reused rather than duplicated.

## Role / Permission Model
`super_admin` and `admin` receive the existing full permission set and can manage every legitimate non-staff member. Trainers receive `client.crm.read` and `client.messages.write`, but every client operation additionally requires an active trainer assignment. Members receive no CRM permission and only access conversations in which they are the client participant.

## Member Directory Architecture
The directory merges safe registered identity fields with existing user records, excludes staff identities, scopes before search, and returns summary-only rows.

## Member Summary Read Model
Rows contain display name, email, avatar reference, dates, account/activity/payment statuses, active program/challenge, completion flags, recent workout/count, and unread count. IDs are used only in action URLs, not displayed.

## Admin Summary Metrics
Authoritative totals are computed over the complete authorized scope before pagination: total, active/inactive, paid/free/trial, new in 7/30 days, programs, challenges, incomplete intake/assessment, and no activity in 7/14/30 days.

## Active / Inactive Definition
Active means the latest authoritative completed workout or stored activity event is within 30 days; inactive means no such activity in 30 days. This read-only activity label never changes enabled/disabled account state.

## Paid / Free Definition
Stripe membership `active`, `trialing`, `past_due`, and `canceled` remain authoritative. A registered access tier is used only when Stripe is inactive/unconfigured; absent evidence is `unknown`. No payment credential or provider secret is projected.

## Search / Filtering
Case-insensitive name/email search and allowlisted paid, free, trial, active, inactive, program, challenge, incomplete intake/assessment, and unread filters run server-side.

## Pagination
Validated page/page-size pagination defaults to 25, caps at 100, returns totals/pages, and preserves query controls in the browser.

## Client Profile Architecture
Overview, intake, assessments, and messages are independently authorized endpoints. Overview includes identity/status, goals, program/challenge, recent workouts, and timeline.

## Intake Projection
Original stored journey intake/profile structure is returned only after staff/client-scope authorization; it is never included in directory rows or search.

## Assessment Projection
Existing assessment and OHSA records are returned without diagnosis or reinterpretation.

## Program Projection
Existing active/selected/generated program state is projected; no program engine logic is duplicated.

## Challenge Projection
Existing active enrollment is projected when present; no challenge logic is duplicated.

## Workout History
The overview returns a bounded 20-record workout summary. The directory computes only latest date and a 30-day count.

## Client Journey Timeline
Only verified account-created, intake-completed, assessment-completed, and workout-completed events are synthesized and ordered.

## Coach Notes
The existing trainer workspace note model remains the private, author-attributed notes authority. This phase does not expose notes to members or create a duplicate notes store.

## Messaging Architecture
An atomic JSON repository persists conversations/messages. The UI always renders message bodies as escaped plain text. Rate limiting uses the existing trainer write limiter.

## Conversation Model
One conversation is found/created for a client and initiating authorized staff member, with server-generated ID/timestamps and staff participants chosen server-side.

## Message Model
Messages store server-generated ID, conversation ID, authenticated sender ID, trimmed body, created timestamp, and read timestamp. Maximum length is 4,000 characters.

## Message Authorization
Every read/write reloads the conversation and requires the authenticated user to equal its client or listed staff participant. Guessed IDs return not found.

## Member Inbox / Reply Flow
`/inbox.html` lists the authenticated member's conversations, opens history, marks incoming messages read, and sends a reply using authenticated identity.

## Payment Status
The profile and directory expose only safe normalized status, tier, renewal date, and cancellation-at-period-end state.

## Privacy / Data Minimization
Directory responses omit intake content, assessment history, notes, message bodies, health data, and Stripe identifiers. Sensitive data is progressively fetched.

## Security / IDOR Protection
Permission middleware protects staff routes; service-level all-member versus assignment scope protects client IDs; participant checks protect conversation IDs. Sender and timestamps are never accepted from request bodies.

## Route Authorization
All eight new API routes are declared in `config/route-authorization-contract.js`; static shells contain no protected data.

## Performance
Pagination limits response size. Summary computation avoids full workout payload projection, though filesystem storage still scans authorized users and should become indexed database queries at larger scale.

## Mobile Behavior
At 700px and below tables collapse into labeled cards, controls wrap, messages remain scrollable, and the composer is sticky. The layout has no fixed minimum width.

## Accessibility
Pages use headings, labels, semantic forms/navigation/tables, live/error regions, textual statuses, 44px controls, visible focus, and mobile labels.

## Files Changed
Authorization, server wiring/contract, safe credential identities, CRM/messaging repository/service, three HTML surfaces with scripts/styles, tests, and this review.

## Routes / APIs
`GET /api/admin/members`; `GET /api/admin/clients/:clientUserId/{overview,intake,assessments}`; `POST /api/admin/clients/:clientUserId/conversation`; `GET /api/me/conversations`; `GET|POST /api/me/conversations/:conversationId/messages`.

## Data Model Changes
Adds `data/client-messaging.json` at runtime with conversations and messages. No migration is required; missing storage initializes empty.

## Tests Added
Unit coverage verifies totals, pagination, search/filtering, trainer scope, sensitive projections, IDOR, validation, authenticated authors/timestamps, safe stored plain text, and unread/read transitions.

## Tests Run
See the final delivery report for exact command outcomes and totals.

## Route Verification
The route authorization validator is required before merge; exact output is recorded in the final report.

## Authenticated Verification
Automated service authorization tests cover admin, assigned trainer, member participant, and attacker cases. No production identity was used.

## Rendered Browser Status
Not executed in this environment; UI behavior was programmatically reviewed and linted.

## Binary Status
No binary files or screenshots are added.

## Known Limitations
Filesystem scans are not suitable for very large deployments; there is no realtime push/email notification; member UI opens the first conversation; existing data has no universal canonical assessment/program/challenge schema; coach notes remain on the pre-existing trainer workspace UI; activity is limited to stored activity events/workouts.

## Regression Risks
Registered identities without user records are materialized as read-only summaries. Role resolution depends on configured trusted assignments. Route-contract drift and static auth-shell behavior require regression checks.

## Merge Readiness
Automated tests, route validation, lint, and diff checks pass; human UI/security review remains required.

## Recommended Next Phase
Coach Follow-Up System + Client Tasks + CRM Alerts.
