# Phase 9B-A — Controlled Live Organism

## Decision and boundary

Phase 9B-A implements, but does not execute, **Test A**: one controlled adult identity traversing the existing PocketPT application, seven-day membership trial, 30-day digital fitness challenge, and canonical Stripe continuation path. Deployment is not authorization. Test B (an independent consenting customer), autonomous acquisition, paid advertising, Phase 10, and economic validation are explicitly outside this phase.

The trial-first sequence separates entry failure, service/engagement failure, and conversion failure. One participant minimizes exposure while exercising identity isolation. Acquisition spend is fixed at **USD 0** because demand is not under test. The continuation ceiling is **USD 50**, matching the locked plan and limiting the only permitted customer-side financial exposure.

## Infrastructure reused

The implementation composes rather than replaces existing seams:

* canonical bearer authentication, role resolution, and `ops.manage_enforcement` permission protect the admin path;
* `membershipService` remains responsible for Stripe customer reuse, idempotent embedded Checkout, seven-day subscription trials, verified webhook processing, and authoritative membership entitlement;
* the server-controlled `STRIPE_PRICE_ID` remains the only accepted checkout price and quantity remains one;
* authenticated challenge routes, the challenge engine, and membership middleware remain the access/provisioning boundary;
* Phase 9A Airlock concepts—bounded authority, kill switches, receipts, evidence, redaction, obligations, QA, and FIRST FAILURE—remain the constitutional foundation;
* operational run state is stored under `data/ops/` and is intentionally not repository evidence.

No raw card data enters PocketPT. A browser return, model assertion, or checkout creation never establishes settlement. Only the existing signed Stripe webhook/backend state can supply `webhookVerified: true` to the controlled-live observer.

## Authenticated plan-level authority

`POST /api/admin/business-os/controlled-live/authorize` is guarded by canonical authentication and the enforcement-management permission. The service derives approver identity and role from authenticated server context; request-body booleans, environment approval, readiness input, fixtures, and model output cannot grant authority. Only the validity end is caller-selected. The server fixes the plan version, controlled identity, allowed actions, one-customer limit, zero acquisition spend, USD 50 ceiling, product, Stripe path, delivery path, stop conditions, kill switches, and single-test-run semantics.

Authorization and revocation are audited. Expiry, revocation, identity mismatch, and plan mismatch are rechecked before every transition. Harmless deterministic transitions inside the envelope do not require repeated owner clicks. New authority always requires an authenticated human.

## State machine and automation

The ordered machine is:

`LIVE_TEST_CREATED → AWAITING_HUMAN_AUTHORIZATION → AUTHORIZED → CONTROLLED_IDENTITY_VERIFIED → ENTRY_READY → TRIAL_STARTED → CHALLENGE_PROVISIONED → ACCESS_QA → ENGAGEMENT_OBSERVATION → CONTINUATION_OFFER_PREPARED → OFFER_ELIGIBLE → CHECKOUT_AVAILABLE → PAYMENT_OBSERVATION → PAYMENT_SETTLED | DECLINED | ABANDONED → [CONTINUATION_PROVISIONED → DELIVERY_QA] → OUTCOME_CAPTURED → ECONOMIC_RECONCILIATION → LEARNING → REFLECTION → MANAGEMENT_REVIEW → TEST_COMPLETE`.

Any critical boundary violation enters `STOPPED`, preserves the first failure, and creates an exception. Payment is optional for successful organism validation: deliberate decline or abandonment can proceed truthfully through outcome and review.

The adapter/orchestrator that calls transitions must obtain facts from the named canonical systems. This PR deliberately does not schedule or execute a live run. It provides the governed observer/controller boundary on which later authenticated operation can rely.

## Identity, funnel, and observations

Every Test A record is permanently marked `CONTROLLED_VALIDATION`. Other recognized provenance classes are `INDEPENDENT_CUSTOMER`, `SYNTHETIC`, and `DRY_RUN`, but Phase 9B-A rejects them for this run. Controlled evidence can prove infrastructure behavior; it cannot prove willingness to pay or market demand.

The funnel records eligibility/entry, trial start, challenge provisioning, access QA, engagement observation, offer preparation and eligibility, checkout, pending payment, settlement/failure/abandonment, and continuation delivery. Login, access, challenge start/completion, return visit, and progress remain `NOT_OBSERVED` until a canonical application event is ingested. Missing events are never synthesized.

## Machine QA and delivery

Before access is accepted, machine evidence must establish the participant identity, entitlement, expected challenge, active trial, accessible resources/route, and absence of cross-user leakage. A failed result stops progression. Production cannot imply delivery: continuation delivery has a separate QA state, and human visual/experience acceptance remains human-owned.

## Payment safety and economics

Checkout requires the exact server-owned Price ID. The plan forbids alternate price/currency, quantity above one, second charges, upsells, cross-sells, and blind retry after ambiguity. Duplicate Stripe event IDs are idempotently ignored; a distinct second settlement attempt stops as duplicate-payment risk. Invalid signatures and unknown settlement stop immediately.

Reconciliation reports zero acquisition spend, USD 50 requested at most, pending/settled/refunded state, Stripe fee when known (otherwise `null`), fulfillment cost when known (otherwise `null`), and net observed contribution. A controlled payment validates Stripe and reconciliation only; it is excluded from market revenue/demand claims.

## Learning, exceptions, and human labor

Evidence retains participant classification through Learning and Reflection. An attempted controlled-evidence claim of market demand is a critical FIRST FAILURE. The exception inbox states what happened, existing evidence, the safe recommendation, forbidden action, required human decision, and consequences without exposing hidden reasoning.

Automation telemetry counts human approvals, interventions, autonomous transitions, escalations, optional known human minutes, and optional determinable unnecessary escalations. Human work should concentrate on governance and exceptions, not routine transitions.

## Stop conditions

Autonomy stops for an unapproved action, duplicate/ambiguous payment, exposure above USD 50, spend above USD 0, wrong identity/challenge, cross-user exposure, critical QA or Stripe verification failure, authority mismatch/expiry/revocation, active kill switch, unexpected live customer, raw credential exposure, unreconciled obligation, or critical FIRST FAILURE. The system preserves evidence and never reasons around the stop.

## Command center and gates

The protected command center at `/admin-controlled-live.html` prioritizes **HUMAN ACTION REQUIRED**, then state, authority, classification, obligation, trial, provisioning, QA, payment, delivery, FIRST FAILURE, kill switches, exposure, evidence, exceptions, labor, next autonomous action, and completion.

At code completion:

| Gate | Required value |
| --- | --- |
| `PHASE_9A_BODY_ARCHITECTURE_READY` | `PASS` |
| `CONTROLLED_LIVE_TEST_IMPLEMENTATION_READY` | machine `PASS` |
| `CONTROLLED_LIVE_TEST_AUTHORIZED` | `PENDING_HUMAN` until authenticated approval |
| `CONTROLLED_LIVE_ORGANISM_VALIDATED` | `NOT_RUN` until Test A completes in reality |
| `INDEPENDENT_MARKET_TEST_AUTHORIZED` | `false` |
| `REAL_WORLD_ORGANISM_VALIDATED` | `NOT_RUN` |
| `ECONOMIC_VALIDATION` | `NOT_RUN` |

Test B requires a separate future authorization and genuinely independent adult. Nothing in Test A authorizes prospecting, outreach, publication, paid acquisition, new channels, or population expansion.
