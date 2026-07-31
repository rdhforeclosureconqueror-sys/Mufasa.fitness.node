# Version 1 Launch Readiness Report — 2026-07-31

## Executive result

The repository is locally testable, but launch is **blocked** until an operator with Render and Stripe test-mode access deploys both services and completes the clean-account browser journey. Network policy in the verification environment returned HTTP 403 for both Render hosts, so no live-state claim is made.

## Readiness classification

| Area | Status | Evidence / remaining gate |
| --- | --- | --- |
| Repository | ✅ Ready | Automated repository suite and generated-artifact checks are the merge gate. |
| Deployment | ❌ Blocked | Deploy access and live Render connectivity are unavailable; compare both build endpoints after deployment. |
| Frontend | ⚠️ Needs Work | Version 1 navigation and legacy journey cards are present; browser acceptance remains. |
| Backend | ⚠️ Needs Work | Runtime services and diagnostics exist; production configuration and live smoke remain. |
| Environment | ⚠️ Needs Work | `/api/admin/launch-health` reports missing and placeholder values without returning secrets. |
| Exercise Intelligence | ✅ Ready | Runtime service exists and is covered by repository tests. |
| Program Engine | ⚠️ Needs Work | Implemented; clean-account generation-to-completion browser evidence remains. |
| AI Coach | ⚠️ Needs Work | Local fallback exists; provider key/connectivity must be observed at runtime. |
| Yoga | ⚠️ Needs Work | UI and service exist; authenticated completion must be browser-verified. |
| Gamification | ⚠️ Needs Work | XP/achievements/rewards are implemented; runtime flags and persistence must all be green. |
| Rewards | ⚠️ Needs Work | Implemented, pending live member-journey proof. |
| Exercise Hub | ⚠️ Needs Work | UI/service exist, pending live authenticated updates. |
| Stripe | ❌ Blocked | Test keys, webhook delivery, checkout, and entitlement evidence require Stripe/Render access. Never use live charges for this gate. |
| Diagnostics | ✅ Ready | The Launch Health Console exposes categorized, redacted runtime state to authorized operators. |

## Navigation disposition

The dashboard exposes Home, My Program, Train, Exercises, Yoga, Progress & Rewards, AI Coach, and Profile & Settings. Stepping Into Greatness and Push-Up Challenge were not removed: their routes and implementations remained in the repository but their dashboard links had disappeared. They have been restored as explicit member journey cards and are treated as Version 1 routes.

## Environment contract

### Required production variables

`AUTH_TOKEN_SECRET`, `PILOT_LOGIN_PASSWORD`, `LOGIN_SEED_EMAIL`, `ALLOWED_ORIGINS`, and `POCKET_PT_DATA_DIR`.

### Optional / conditional variables

Admin authorization, avatar storage, OpenAI, maps, nutrition, billing, and gamification variables are conditional on those capabilities being enabled. The authoritative names are returned in `environmentContract.optional` by the Launch Health API. Stripe requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, and `STRIPE_PUBLISHABLE_KEY` when `BILLING_ENABLED=true`.

### Deprecated variables

None are proven deprecated. No deployment configuration should be removed based only on an example-file mismatch.

## Required operator runbook

1. Deploy the backend and frontend from the same commit.
2. Confirm `/__version` and `/__frontend-version.json` both report `2026-07-31-launch-readiness`, with `Cache-Control: no-store` on shell/version responses.
3. Sign in as an authorized operator and run the Launch Health Console. Save its JSON response as deployment evidence.
4. Configure Stripe **test-mode** keys and endpoint, create a checkout session with a clean account, send signed test webhook events, and verify entitlement activation.
5. With a clean account, record sign-up, login, assessment, program generation, workout start/completion, history/progress, XP, badge, rewards, level, coach context, Exercise Hub, Yoga, and the final green diagnostic state.

## Launch answers

1. **Does the deployed site fully match the repository?** Not proven; live hosts were unreachable from this environment and deployment was not performed.
2. **What is still missing?** Same-commit deployment evidence, production environment sign-off, clean-account browser evidence, and Stripe test-mode webhook/entitlement proof.
3. **What prevents Version 1 launch?** Deployment access, live connectivity, and the absent end-to-end acceptance record.
4. **Next engineering priority:** deploy one immutable build to both services, then execute the clean-account journey while capturing the Launch Health response at each failure boundary.
