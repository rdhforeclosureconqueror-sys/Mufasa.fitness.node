# Phase 41 — Live Stripe Embedded Subscription Checkout

## Previous flow

The previous billing flow used a backend Checkout Session route that returned a Stripe Checkout `url`. The browser could redirect away from Pocket PT to Stripe-hosted Checkout and then return to a success/cancel URL. Membership state was updated only by signed Stripe webhooks, but duplicate subscription protection and billing portal routing were not implemented.

## New embedded flow

1. User creates or logs into a Pocket PT account.
2. User opens `/membership.html`.
3. The page loads the plan name, backend-configured official price label, feature summary, recurring billing disclosure, and secure checkout area.
4. The frontend requests `POST /api/billing/checkout-session` with the authenticated bearer token.
5. The backend validates Stripe configuration, creates or reuses a Stripe Customer linked to the authenticated Pocket PT user, and creates a Checkout Session with `mode=subscription` and `ui_mode=embedded` using only `STRIPE_PRICE_ID` from the backend environment.
6. The backend returns safe session data, including `clientSecret`; it does not return secret keys or raw payment credentials.
7. The frontend initializes Stripe.js from `https://js.stripe.com/v3/` and mounts Embedded Checkout inside the Pocket PT membership page.
8. The customer completes payment without navigating to a separate Stripe Checkout page.
9. Stripe sends signed webhook events to the backend.
10. Backend webhook verification updates membership state; the frontend success/return state alone never activates access.
11. Existing active, trialing, past_due, or incomplete subscribers are directed to billing management instead of duplicate checkout.

## Routes

- `GET /api/billing/plan` — public safe plan display data.
- `GET /api/me/membership` — authenticated membership status and entitlement rules.
- `POST /api/billing/checkout-session` — authenticated embedded subscription Checkout Session creation.
- `POST /api/billing/create-checkout-session` — compatibility alias returning embedded checkout data, not redirect checkout data.
- `POST /api/billing/portal-session` — authenticated Stripe billing portal session for the user's stored customer.
- `POST /api/billing/webhook` — signed Stripe webhook endpoint.

## Environment variables

Backend private:

- `BILLING_ENABLED=true`
- `STRIPE_LIVE_MODE=true`
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_PRICE_ID=price_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `FRONTEND_PUBLIC_URL=https://mufasafitsite.onrender.com`
- `BACKEND_PUBLIC_URL=https://mufasa-fitness-node.onrender.com`

Frontend public:

- `STRIPE_PUBLISHABLE_KEY=pk_live_...`
- If needed by a build pipeline: `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`

Optional plan display:

- `MEMBERSHIP_PLAN_NAME`
- `MEMBERSHIP_PRICE_LABEL`
- `MEMBERSHIP_PRICE_CURRENCY`

## Subscription state model

Membership data is stored on the Pocket PT user record with:

- `userId`
- `stripeCustomerId`
- `stripeSubscriptionId`
- `stripePriceId`
- `status`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`
- `lastInvoiceStatus`
- `createdAt`
- `updatedAt`

Pocket PT never stores card number, CVC, or expiration data.

## Webhook behavior

The webhook endpoint verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET` over the raw request body before parsing or applying updates. It handles:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Processed webhook event IDs are remembered on the user billing record to make repeated fixture/event delivery idempotent.

## Entitlement rules

- `active`: grants access.
- `trialing`: grants access.
- `past_due`: no access until payment recovers; duplicate checkout is blocked and billing portal is offered.
- `unpaid`: no access.
- `canceled`: no access.
- `incomplete`: no access until verified Stripe state changes.
- `incomplete_expired`: no access.

## Security decisions

- Secret key and webhook secret are used only on the backend.
- The frontend uses only a publishable key.
- The frontend loads Stripe.js only from the official Stripe domain.
- The membership page does not contain Pocket PT card-number, CVC, or expiration inputs.
- Client-supplied price IDs are ignored.
- Checkout and portal routes require authentication.
- Portal sessions use only the Stripe customer ID already stored for the authenticated user.
- Membership access is determined by backend webhook/subscription state, not by frontend success UI.
- Billing preflight validates required live configuration without printing secret values.

## Tests

Automated tests use mocked Stripe clients and signed webhook fixtures. They do not make real live charges.

Coverage includes:

- Auth required for billing routes.
- Server-side price selection.
- Embedded checkout client secret return.
- Duplicate subscription prevention.
- Portal customer isolation.
- Invalid webhook signature rejection.
- Idempotent webhook handling.
- Success UI alone cannot activate membership.
- Failed payment does not grant access.
- Cancellation removes access.
- Renewal/invoice paid restores active status.
- Static membership page mounts embedded checkout and contains no Pocket PT raw card fields.

## Live activation checklist

1. Create or verify the live recurring Stripe Price and copy its `price_...` ID.
2. Configure backend env:
   - `BILLING_ENABLED=true`
   - `STRIPE_LIVE_MODE=true`
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_PRICE_ID=price_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `FRONTEND_PUBLIC_URL=https://mufasafitsite.onrender.com`
   - `BACKEND_PUBLIC_URL=https://mufasa-fitness-node.onrender.com`
3. Configure frontend public key as `STRIPE_PUBLISHABLE_KEY=pk_live_...` or `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`, depending on deployment.
4. In Stripe Dashboard, configure webhook endpoint `https://mufasa-fitness-node.onrender.com/api/billing/webhook` for required event types.
5. Run preflight and readiness checks.
6. Log in as a real Pocket PT test account in production.
7. Open `https://mufasafitsite.onrender.com/membership.html`.
8. Confirm the embedded form appears and no Pocket PT native card inputs are present.
9. Complete one manual live transaction only after explicit approval.
10. Confirm Stripe Dashboard payment/subscription, backend webhook success, `/api/me/membership` status `active`, and dashboard access.
11. Open billing portal and verify the user can manage/cancel the subscription.

## Rollback notes

- Set `BILLING_ENABLED=false` or remove Stripe env values to fail closed.
- Remove or hide `/membership.html` links from the frontend.
- Revert to the previous redirect behavior only if the backend route again returns a Checkout `url`; do not expose secret keys or collect card details in Pocket PT.
- If a live Price is incorrect, update `STRIPE_PRICE_ID` server-side and redeploy; clients cannot choose prices.
