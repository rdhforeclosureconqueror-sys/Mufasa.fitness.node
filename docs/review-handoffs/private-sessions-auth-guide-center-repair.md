# INDEPENDENT REVIEW HANDOFF — PRIVATE SESSIONS AUTH + GUIDE CENTER REPAIR

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

## Role
Act as the second independent reviewer. Do not merge. Inspect current main and this PR independently.

## Reported production behavior
1. A member completed the Private Sessions questionnaire.
2. Submission unexpectedly sent them to sign-in.
3. Signing in then returned them to the Private Sessions form because `returnTo` pointed there.
4. Signing in as a different account (admin) also returned to that same form.
5. Desired behavior: authenticate before collecting the request, submit it under the correct canonical account, then go to Dashboard and automatically launch dashboard guidance.
6. Members need a permanent Help / Guide Center in the menu so walkthroughs can be replayed after proactive prompts are disabled. Include a "guide to the guides."

## Root cause to verify
`public/private-sessions.js` previously used a relative same-origin fetch with no canonical bearer token and waited until a 401 at submit time to redirect to login. That allowed a user to fill the form before the account boundary was proven and made login `returnTo` send any subsequently authenticated account back to the form.

## Files changed
- `public/private-sessions.html`
- `public/private-sessions.js`
- `public/global-nav.js`
- `public/guide-center.html`
- `public/guide-center.js`
- `public/admin-first-failure.js`
- `test/private-sessions-auth-guide-center.test.js`

## Required review
- Verify Private Sessions hides the form until canonical auth is ready.
- Verify API submission uses canonical backend resolution and bearer auth.
- Verify an unauthenticated visitor is sent to login before entering data.
- Verify successful submission writes once, queues the existing `dashboard` tour, and redirects to `/dashboard.html?source=private-sessions`.
- Verify the dashboard tour launches from the existing pending-tour mechanism and does not restart the Private Sessions form.
- Verify the menu contains `Help / Guide Center` and the Guide Center can start every existing tour manually.
- Verify `How to use the Guide Center` teaches how to return through the menu.
- Verify turning proactive guidance off does not disable manual Guide Center walkthroughs.
- Verify global navigation behavior, auth restoration, signout, role visibility, and admin diagnostics remain intact after the nav bundle edit.
- Verify admin first-failure diagnostics checks the Guide Center boundary.
- Run focused tests plus global navigation/auth/guided-experience tests.

## Trial follow-up
Do not assume the seven-day system access policy is fully solved by this PR. Existing billing configuration uses a seven-day Stripe trial with payment-method collection. Report whether a separate courtesy trial entitlement is needed to satisfy the owner's desired "request first, look around the system, no payment today" flow.

## Verdict
Return exactly one:
- `APPROVE FOR OWNER TESTING`
- `CHANGES REQUIRED`
