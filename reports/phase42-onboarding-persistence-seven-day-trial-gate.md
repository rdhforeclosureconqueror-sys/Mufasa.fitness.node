# Phase 42 — Persistent Onboarding Journey and Seven-Day Subscription Access Gate

## Scope
Phase 42 only: fix evidence-based onboarding persistence for intake, goals, medical-history basics, OHSA, first workout, and Retention Journey display; change Pocket PT membership signup to a card-required 7-day Stripe subscription trial; add backend entitlement enforcement for protected product routes.

## Onboarding persistence root cause
The backend already scoped intake, goals, OHSA, and workouts to `req.auth.userId`, but Retention Journey did not hydrate all completion evidence from the backend after refresh/logout/other-device use. The precise stops were:

- Goals saved to `user.goalsBaseline` but had no stable `completedAt`; completion was inferred only from `state.goalsBaseline.goal`.
- Medical/history basics were represented by `clientIntake` but had no authoritative summary section.
- OHSA saved to `user.ohsa[]`, but Retention Journey read only `window.lastOhsaSummary.createdAt`, so completion disappeared after refresh or on another device.
- First workout saved to `user.workoutTracking[]`, but calendar/day completion used localStorage `RETENTION_COMPLETION_DATES`; only the generic status partially recovered from `/api/progress/dashboard.workoutsCompleted`.
- There was no single authenticated status route returning sanitized section status, timestamps, next action, and counts.

## Routes and schemas before/after

### Before
- `GET/POST /api/client-intake` saved `user.clientIntake` with `completedAt` when posted.
- `GET/POST /api/goals-baseline` saved `user.goalsBaseline` without `completedAt`.
- `POST /api/ohsa` saved `user.ohsa[]`; `GET /api/me/ohsa` returned history.
- `POST /api/workouts/track` saved `user.workoutTracking[]`.
- Retention Journey hydrated intake/goals/program/check-ins/dashboard but not OHSA or a unified onboarding status.

### After
- `GET /api/me/onboarding-status` returns a sanitized, authenticated summary:
  - `sections.intake`
  - `sections.goals`
  - `sections.medicalHistory`
  - `sections.overheadSquatAssessment`
  - `sections.firstWorkout`
  - `completionCount`, `totalCount`, `nextRequiredAction`, `editableSections`, `updatedAt`
- `user.goalsBaseline.completedAt` is stable once validated evidence is complete.
- `user.clientIntake.completedAt` remains stable on edits while required evidence stays complete.
- Retention Journey uses `/api/me/onboarding-status` as the authoritative completion source and no longer treats localStorage or `window.lastOhsaSummary` as authoritative.

## Evidence-based completion rules
- Intake: saved `clientIntake` has a non-empty `name`, at least one `goals[]` item, and `medicalDisclaimerConsent === true`.
- Goals: saved `goalsBaseline.goal` is valid and `goalsBaseline.baseline` exists.
- Medical history: derived from validated saved intake evidence; private answers remain in the authenticated intake/profile records and are not exposed in public diagnostics.
- OHSA: complete when `user.ohsa[]` contains an assessment record; otherwise `skipped_for_pilot` for pilot starter-flow progress.
- First workout: complete when `user.workoutTracking[]` contains a record with `completionStatus: "completed"`.

## Edit behavior
Users can reopen and resubmit intake/goals. `completedAt` remains stable if the section remains complete; `updatedAt` changes on edit. If required evidence is removed or invalid, validation rejects the write or completion is not derived.

## Stripe trial configuration
`POST /api/billing/checkout-session` remains authenticated and embedded. The backend controls:

- `mode: subscription`
- `ui_mode: embedded`
- `subscription_data.trial_period_days: 7`
- `payment_method_collection: always`
- server-controlled `STRIPE_PRICE_ID`
- authenticated `userId` metadata on Checkout Session and subscription data
- existing Stripe customer reuse
- duplicate subscription protection for active/trialing/past_due/incomplete states

Browser-supplied price IDs, trial lengths, and payment-card fields are ignored or rejected.

## Entitlement rules
A single backend entitlement helper gates protected product routes:

- Allow admin/operator bypass, including the pilot admin/operator account.
- Allow authenticated members with `trialing` subscriptions.
- Allow authenticated members with `active` subscriptions.
- Block ordinary authenticated users without valid membership using:

```json
{
  "code": "membership_required",
  "message": "Start your 7-day free trial to continue.",
  "membershipUrl": "/membership.html"
}
```

## Admin bypass
Admins/operators remain authenticated billing-gate exceptions. The membership status route returns a safe `billingBypass` reason for authenticated diagnostics without exposing Stripe secrets.

## Cancellation behavior
Stripe cancellation/subscription deletion webhooks persist `status: canceled`, `canceledAt`, `trialEnd`, `currentPeriodEnd`, and `hasAccess: false`. If a trial is canceled before the exact Stripe trial-end timestamp, local state does not convert to paid access; Stripe prevents the first recurring charge according to the subscription cancellation state.

## Exact customer-facing disclosure
Use this language:

> 7-day free trial. Payment method required. Cancel before the displayed trial-end date and time to avoid the first monthly charge. After the trial, membership renews monthly until canceled.

The membership page also displays “No charge today,” plan name, monthly price, trial-end timestamp after session/status creation, first billing date, embedded Stripe form, and Manage Billing.

## Webhook behavior
Signature verification is required through `STRIPE_WEBHOOK_SECRET`; invalid/missing signatures are rejected. Processed event IDs are retained per user for idempotency. Handled events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.created`
- `invoice.paid`
- `invoice.payment_failed`

`customer.subscription.trial_will_end` stores in-app reminder state on membership. Existing email infrastructure was not found, so email delivery preparation is deferred rather than adding a new platform.

## Route-gate inventory
Public/pre-membership:

- `/`
- login/signup endpoints and pages
- `/membership.html`
- `/api/billing/plan`
- `/api/billing/checkout-session`
- `/api/me/membership`
- `/api/billing/portal-session`
- terms/privacy/static assets
- push-up challenge public endpoints remain public by existing policy

Protected by auth + entitlement:

- session write routes
- nutrition routes
- workout tracking/reward routes
- progress dashboard

Authenticated onboarding/profile routes remain user-scoped and are used after membership in the intended flow.

## Tests
Automated coverage added/updated for:

- onboarding status persistence and stable timestamps
- account isolation
- status derived from saved evidence
- seven-day trial Checkout Session contract
- payment method collection required
- browser cannot select price/trial length
- trialing/active access behavior
- missing membership block
- admin/operator bypass
- cancellation webhook access removal
- trial-will-end reminder storage
- invoice paid/payment failed behavior
- webhook signature/idempotency
- frontend success cannot activate access
- frontend assets avoid raw card inputs and Stripe secrets

## Deployment variables
Required for billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_PUBLIC_URL` or `PUBLIC_BASE_URL`
- frontend publishable key via runtime config (`STRIPE_PUBLISHABLE_KEY`/equivalent existing mechanism)

Recommended:

- `MEMBERSHIP_PLAN_NAME`
- `MEMBERSHIP_PRICE_LABEL`
- `MEMBERSHIP_PRICE_CURRENCY`
- admin/operator allowlists for production bypass accounts

## Manual production checklist
1. Confirm Stripe price is monthly recurring and matches displayed price.
2. Confirm Checkout Session shows embedded form, no charge today, and payment method required.
3. Confirm trial subscription enters `trialing` after webhook.
4. Confirm trial-end timestamp shown in membership page matches Stripe subscription `trial_end`.
5. Confirm trialing member can open dashboard/workout/nutrition.
6. Confirm ordinary authenticated user without membership receives membership-required response on protected product API routes.
7. Confirm admin/operator can access product routes without checkout.
8. Confirm billing portal cancellation before trial end sets Stripe subscription to cancel before conversion.
9. Confirm `customer.subscription.trial_will_end` stores reminder state and appears in-app.
10. Confirm no card data appears in app logs/assets.
11. Confirm onboarding completion persists after refresh, logout/login, and another device.
12. Confirm another account has pending onboarding status and cannot read the first user’s data.

## Rollback notes
- Revert Phase 42 commit to return Checkout to non-trial subscription creation and previous frontend Retention Journey derivation.
- If only billing rollback is needed, remove `trial_period_days`, `payment_method_collection`, and route entitlement middleware while keeping onboarding status route.
- If only onboarding rollback is needed, revert Retention Journey hydration to previous client-derived logic and remove `/api/me/onboarding-status` route.
