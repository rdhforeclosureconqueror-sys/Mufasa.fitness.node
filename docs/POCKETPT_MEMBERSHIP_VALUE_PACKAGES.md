# PocketPT Membership Value Packages

Baseline main SHA: `60cead8800aabe4189d662e6620a617f756b7e96`.

## Product decision

PocketPT should sell three increasing levels of value rather than three arbitrary page locks. The package progression is training foundation → coaching intelligence → complete/immersive experience.

| Plan | Monthly price | Product promise |
| --- | ---: | --- |
| PocketPT Essential | $9.99 | Personalized training foundation |
| PocketPT Performance | $19.99 | Training plus coaching intelligence |
| PocketPT Unleashed | $39.99 | Complete PocketPT experience plus premium immersive/device capabilities when production-ready |

`Performance` is the recommended plan because it contains the strongest currently established differentiation without depending on newly built immersive features to justify its value.

## Essential — $9.99/month

- Personalized training plan and workout calendar
- Guided workout execution with saved history
- Exercise Library and movement education
- Challenges, personal bests, progress, streaks, and rewards
- Core member dashboard and return-to-training experience

## Performance — $19.99/month

Everything in Essential, plus:

- AI Coach with authoritative PocketPT training context
- Camera-based pose/form feedback on supported movements
- Nutrition journal, nutrition missions, and connected nutrition guidance
- Yoga, mobility, recovery, and adaptive training recommendations

Camera/form intelligence remains limited to supported movements and compatible devices.

## Unleashed — $39.99/month

Everything in Performance, plus:

- Personalized avatar and premium 3D training experiences where supported
- Premium challenge and arena experiences as they are released
- Run Club and GPS performance tools on supported platforms
- Early access to new premium PocketPT experiences after production acceptance

### Truth rule

Unfinished features must never be represented as currently available benefits. Godot world experiences, GPS/device integrations, and other device-dependent capabilities become usable benefits only after their applicable production acceptance gates pass. The membership page carries this limitation explicitly.

## Stripe configuration

Code maps the plans to three environment-owned Stripe recurring Price IDs:

- `STRIPE_PRICE_ESSENTIAL_ID`
- `STRIPE_PRICE_PERFORMANCE_ID`
- `STRIPE_PRICE_UNLEASHED_ID`

The existing `STRIPE_PRICE_ID` is retained as a backward-compatible fallback for **Performance only**. It is not silently reused for Essential or Unleashed.

Do not commit Stripe Price IDs or secret keys to the repository.

## Deployment checklist

1. In Stripe, create or confirm three USD recurring monthly Prices:
   - $9.99/month — PocketPT Essential
   - $19.99/month — PocketPT Performance
   - $39.99/month — PocketPT Unleashed
2. Put the corresponding `price_...` IDs into the three Render environment variables above.
3. Keep the existing Stripe secret key, webhook secret, publishable-key delivery, and customer portal configuration intact.
4. Deploy backend and frontend.
5. Verify `GET /api/billing/plans` reports all three plans with `checkoutConfigured: true` and exposes no raw Stripe IDs.
6. In Stripe test mode, complete one checkout for each tier with a distinct test member.
7. Confirm the existing webhook updates canonical membership state and persists the selected `stripePriceId`.
8. Confirm `GET /api/me/membership-tier` maps that persisted Stripe price back to the expected PocketPT plan ID.
9. Confirm duplicate-subscription protection still prevents a second checkout for an active/trialing/past-due/incomplete subscription.
10. Confirm the customer portal opens for an existing Stripe customer.
11. Repeat the acceptance flow on mobile Safari before switching live Stripe prices into production.

## Deliberate rollout boundaries

### Tier identity before tier enforcement

The existing PocketPT membership middleware is binary: a valid paid/trialing membership grants membership access. This phase introduces canonical product/tier identity and tier-specific checkout, but does **not** change existing protected routes to enforce Essential vs Performance vs Unleashed.

That is intentional. Per-feature tier enforcement should be a separate reviewed change based on a canonical entitlement matrix. Pricing should not silently remove access from existing members.

### Plan changes for existing subscribers

The existing duplicate-protection behavior remains authoritative. Active/trialing/past-due/incomplete subscribers are not allowed to create a second subscription simply by selecting another pricing card.

Upgrade/downgrade support should be added separately by either:

- configuring Stripe Customer Portal subscription switching for these three approved Prices, or
- adding a server-authoritative subscription-change endpoint with explicit proration rules.

Until that phase is accepted, existing subscribers use **Manage billing** and new checkout is for members without a duplicate-protected subscription state.

### Existing 7-day trial

The established 7-day card-required trial remains unchanged and currently applies to each new tier checkout. If the business later chooses different trial policy by tier, that should be a separate pricing-policy decision rather than an incidental code change.

## Canonical architecture

- Public plan definitions: `src/billing/membershipPlans.js`
- Tier checkout/config adapter: `src/billing/membershipTierBridge.js`
- Existing canonical subscription persistence/webhook logic: `src/services/membershipService.js`
- Existing Stripe validation/security: `src/validation/billingValidation.js`
- Member pricing UI: `public/membership.html` + `public/membership.js`

The selected tier resolves server-side to a Stripe Price ID. The client never chooses or receives raw Stripe Price IDs. Existing canonical membership state continues to persist the Stripe Price ID returned through the subscription/webhook lifecycle, and the tier read model maps that price back to a PocketPT plan.

## Server composition note

Production currently starts through `world-bridge-server.js`, which already wraps canonical `createApp()`. This phase mounts the bounded tier adapter there instead of making a large risky edit to `server.js`.

This is an additive rollout mechanism, not a recommendation for permanent server fragmentation. When the existing World Bridge wrapper is consolidated into canonical `createApp()`, the membership tier routes should be consolidated in the same server-assembly cleanup so there remains one long-term application composition path.
