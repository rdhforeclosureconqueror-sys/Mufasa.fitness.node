# Independent Review — PocketPT 7-Day No-Card Full-Access Trial

## Business rule
- New general PocketPT accounts must explicitly accept the 7-day trial before entering the system.
- Trial start requires no card, Stripe customer, or subscription.
- During the 7 days, entitlement is canonical `trialing` and maps to Unleashed/full Premium access so membership-gated Yoga and Nutrition are available.
- Free Run Club remains the only free ongoing product and is outside the full-system trial gate.
- After trial expiration, user must choose Essential ($9.99), Performance ($19.99), or Unleashed ($39.99) for continued full-system access.

## Review targets
1. `src/billing/membershipTierBridge.js`: verify one-time courtesy trial, 7-day boundary, canonical trialing membership entitlement, no Stripe IDs, and expired-trial cleanup when tier/trial state is read.
2. `public/trial.html` + `public/trial.js`: verify explicit consent and no payment form.
3. `public/login.js`: verify new registration lands on trial acceptance instead of entering Retention Journey directly.
4. `src/validation/billingValidation.js`: verify public disclosure says no payment method required to start.
5. Verify `/api/yoga/catalogue` and `/api/me/nutrition/*` accept the canonical `trialing` entitlement through existing `requireMembershipEntitlement`.
6. Verify Run Club-only users can remain on the Run Club path without accepting full-system trial.

## Important follow-up to verify before merge
The legacy Stripe membership service historically configured its own 7-day subscription trial. Confirm paid checkout after the courtesy trial does not accidentally create a second trial window. If it does, remove Stripe `trial_period_days` from paid-tier checkout in the same PR or block merge until repaired.

## Owner acceptance
- Create new account → trial agreement appears.
- Do not agree → full PocketPT system is not entered.
- Agree → no card requested → Dashboard.
- During trial: Yoga and Nutrition load successfully.
- Trial tier endpoint reports `planId=unleashed`, `status=trialing`, `source=courtesy_trial`.
- Run Club remains available independently.
