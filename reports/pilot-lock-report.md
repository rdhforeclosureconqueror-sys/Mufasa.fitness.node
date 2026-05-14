# Phase 9 — Pilot Lock Report

Date: 2026-05-14  
Branch: `work`  
Locked source commit: `845f9e2489635794b346988242fa1b76f9df40a6`  
Scope: Phase 9 only — final pilot lock report.  
Change posture: report-only. No runtime code, frontend code, backend route behavior, auth/session/payment/avatar behavior, root-level legacy/shadow frontend files, `data/`, or `package-lock.json` were changed.

## 1. Final recommendation

**Recommendation: PARTIAL GO**

The controlled-pilot backend/API state is ready to lock for human pilot approval, provided operators deploy with the required pilot environment variables and complete the remaining manual browser checks. This is not a full GO because browser-only verification remains manual, TTS upstream behavior depends on external configuration/availability, and full browser automation is deferred.

## 2. Current commit hash and branch

- Branch: `work`
- Locked source commit before this Phase 9 report: `845f9e2489635794b346988242fa1b76f9df40a6`
- Phase 9 report commit: to be recorded after commit.

## 3. Phase summary table

| Phase | Goal | Commit | Result | Notes |
| --- | --- | --- | --- | --- |
| Phase 0 | Establish protection baseline, active entry points, and no-touch files. | `abf8e8d` | PASS | Report-only baseline; identified `server.js`, `public/`, `data/`, `package-lock.json`, and root-level frontend duplicates as protected areas. |
| Phase 1 | Disable/quarantine avatar and 3D systems by default. | `bfae3ec` | PASS | Avatar runtime is feature-gated and disabled unless explicitly enabled. |
| Phase 2 | Lock active frontend source of truth. | `66f6065` | PASS | Documented active frontend source and avoided root-level shadow duplicates. |
| Phase 3 | Harden pilot auth environment preflight. | `d925cc8` | PASS | Added deterministic pilot/production env checks and documented minimal passing preflight command. |
| Phase 4 | Protect structured session writes. | `1e80eb8` | PASS | Authenticated structured session write paths are covered by tests. |
| Phase 5 | Clean up runtime backend origins. | `6a44025` | PASS | Reduced hardcoded runtime origin risk. |
| Phase 5C | Remove hardcoded backend origins from public files. | `c36cfd3` | PASS | Additional frontend-origin cleanup. |
| Phase 6 | Fix diagnostics admin auth posting. | `49a045a` | PASS | Diagnostics admin routes require auth/admin permission and tests cover allowed/denied cases. |
| Phase 7 | Add minimal Stripe Checkout membership pilot. | `513d4f8` | PASS | Minimal membership/checkout/webhook path added with tests and missing-config guardrails. |
| Phase 8 | Verify core controlled-pilot fitness flow. | `040637a` | PARTIAL PASS | Automated backend/static checks passed; browser-only checks remain manual. |
| Phase 9 | Freeze pilot state and publish final lock report. | TBD | PARTIAL GO | Report-only phase; no runtime changes. |

## 4. Enabled systems

The following systems are enabled for the controlled pilot state:

- **Auth/login** — pilot email/password login and authenticated `/api/auth/me` checks.
- **Profile** — authenticated profile load/save.
- **Intake/goals** — authenticated client-intake and goals/baseline persistence.
- **Programs** — authenticated current-program/program persistence path.
- **Exercise library** — static exercise-library page/assets and exercise API index/search/detail routes.
- **Authenticated session writes** — create session, rep update, and complete session routes require auth.
- **Dashboard/history** — authenticated history and progress-dashboard data routes.
- **Check-ins** — authenticated weekly check-in save/load.
- **Progress dashboard** — authenticated retention/progress summary route.
- **Diagnostics with auth** — admin diagnostics report/recent routes require authenticated admin/ops authorization.
- **Minimal Stripe membership** — membership status, checkout-session creation, and webhook handling with Stripe env guardrails.
- **TTS route** — `/api/speak` remains available with `ENABLE_TTS_NO_AUTH=false` required for pilot hardening; upstream TTS availability depends on configured upstream env and service health.
- **Legacy `/command` fallback** — retained for compatibility and degraded write fallback behavior.

## 5. Disabled/deferred systems

The following systems are disabled, deferred, or not part of the locked pilot scope:

- Avatar/3D disabled by default.
- Community/chat.
- CRM/tenant/business features.
- Book/audiobook tools.
- Advanced billing platform beyond minimal Stripe membership pilot.
- Admin billing dashboard.
- Full browser automation.

## 6. Exact required production/pilot environment variables

Set these values before any production/pilot deployment approval:

| Variable | Required pilot posture |
| --- | --- |
| `AUTH_TOKEN_SECRET` | Required, non-empty, high-entropy; must not be a default/dev-only placeholder. |
| `PILOT_LOGIN_PASSWORD` | Required, non-empty pilot login password. |
| `LOGIN_SEED_EMAIL` | Required, non-empty pilot login seed email. |
| `ALLOWED_ORIGINS` | Required, non-empty comma-separated pilot/production origin allowlist. |
| `AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS` or `AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS` | At least one required with deterministic admin bootstrap identity/subject. |
| `ENABLE_TTS_NO_AUTH` | Must be exactly `false`. |
| `AUTH_BRIDGE_ALLOW_MANUAL` | Must be exactly `false`. |
| `AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE` | Must be exactly `false`. |
| `ENABLE_AVATAR_FEATURE` | Must be `false` or unset. |
| `STRIPE_SECRET_KEY` | Required for live/test checkout creation during pilot membership testing. |
| `STRIPE_WEBHOOK_SECRET` | Required for webhook signature verification. |
| `STRIPE_PRICE_ID` | Required server-side price id for checkout-session creation. |
| `PUBLIC_BASE_URL` | Required public app origin used for checkout success/cancel redirect URLs. |
| TTS upstream env vars if TTS is enabled | Configure `AIVOICE_URL` or `OPENVOICE_UPSTREAM_URL`; configure `AIVOICE_API_KEY` if the upstream requires it. |

## 7. Final route readiness summary

| Area | Readiness | Notes |
| --- | --- | --- |
| Auth routes | READY | Login and current-user token behavior are covered by tests; pilot env hardening is required before deployment. |
| Profile/user routes | READY | Authenticated profile read/write and user state flows are covered by tests. |
| Session write routes | READY | Structured session create, reps, and complete routes require auth and are covered by tests. |
| Retention routes | READY | Intake, goals, check-ins, and progress dashboard paths are covered by retention tests. |
| Exercise routes/static assets | READY | Exercise library page/assets and index/search/detail routes are available; detail route depends on index metadata. |
| Diagnostics/admin routes | READY | Admin diagnostics reject unauthenticated/non-admin users and accept admin tokens in tests. |
| Billing routes | READY FOR MINIMAL PILOT | Missing Stripe config fails safely; checkout uses server-side price id; webhook signature handling is tested. |
| Avatar routes | DISABLED BY DEFAULT | Avatar/3D must remain disabled with `ENABLE_AVATAR_FEATURE=false` or unset. |
| `/command` legacy fallback | AVAILABLE / COMPATIBILITY ONLY | Retained for compatibility; not the preferred structured write path. |

## 8. Final command results

> Initial report was created before these commands, as required. This section was updated after running the required checks.

| Command | Result | Evidence / notes |
| --- | --- | --- |
| `git status --short` | PASS | Only the expected new report file was present: `?? reports/pilot-lock-report.md`. |
| `npm test` | PASS | Node test suite passed: 151 tests, 0 failures. npm emitted a non-blocking `http-proxy` env-config warning. |
| `npm run lint` | PASS | `scripts/selfcheck.js` reported `✅ selfcheck ok`. npm emitted a non-blocking `http-proxy` env-config warning. |
| `npm run pilot:nonsecurity-checks` | PASS | Static pilot checks passed, lint passed, nested full test suite passed, and script reported `✅ pilot non-security checks passed`. npm emitted a non-blocking `http-proxy` env-config warning. |
| `npm run ops:preflight` | EXPECTED LOCAL FAIL | Failed because this local shell does not define required pilot hardening env: bootstrap super-admin, auth token secret, pilot login password, login seed email, TTS no-auth hardening, auth bridge hardening, and allowed-origins warning. This is expected outside the documented pilot env baseline. |
| Documented Phase 3 hardened `npm run ops:preflight` command | PASS | Passed with documented pilot env baseline; output returned `ok:true`, no issues, no warnings, and `readyForPilot:true`. |

## 9. Manual browser verification checklist

These checks remain required before declaring a full GO:

- [ ] Root page loads.
- [ ] Avatar UI is hidden.
- [ ] Login succeeds.
- [ ] Profile save succeeds.
- [ ] Workout/session tracking succeeds.
- [ ] Dashboard/history renders.
- [ ] Exercise library loads.
- [ ] Stripe test checkout opens.
- [ ] Diagnostics works when logged in as admin.
- [ ] TTS behavior is confirmed against the configured upstream or explicitly deferred for the pilot.

## 10. Known risks

- File-backed storage durability is limited and should be treated as controlled-pilot only unless backed by durable deployment storage/backup policy.
- TTS depends on external upstream availability and configured credentials/URLs.
- Stripe integration uses a fetch-based server client instead of the official Stripe SDK.
- Manual browser checks are still required before full GO.
- Legacy `/command` remains available for compatibility.
- External MufasaBrain dependency remains.
- Full community, CRM/tenant/business, and book/audiobook systems are not part of this pilot lock.

## 11. Rollback plan

1. Revert phase commits in reverse order if a phase-specific regression is identified:
   - Phase 9 report commit once created.
   - `040637a` Phase 8 report.
   - `513d4f8` Phase 7 minimal Stripe membership pilot.
   - `49a045a` Phase 6 diagnostics admin auth posting.
   - `c36cfd3` Phase 5C origin cleanup.
   - `6a44025` Phase 5 runtime origin cleanup.
   - `1e80eb8` Phase 4 session write protection.
   - `d925cc8` Phase 3 auth environment hardening.
   - `66f6065` Phase 2 frontend source-of-truth documentation.
   - `bfae3ec` Phase 1 avatar quarantine.
   - `abf8e8d` Phase 0 protection baseline.
2. Disable payment immediately by unsetting `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID`.
3. Keep avatar disabled with `ENABLE_AVATAR_FEATURE=false` or unset.
4. If immediate stabilization is needed, deploy the previous known-good commit from before the suspect phase.

## 12. Files that must not be edited during pilot without approval

Do not edit these during the pilot without explicit human approval and a scoped phase/change request:

- `server.js`
- `public/`
- `src/`
- `test/` unless only correcting a report reference and explicitly justified
- `scripts/`
- `data/`
- `package-lock.json`
- Root-level legacy/shadow frontend files, including:
  - `index.html`
  - `dashboard.html`
  - `dashboard.js`
  - `fitness.js`
  - `backend-read.js`
  - `session-write.js`
  - `runtime-orchestrator.js`
  - `exercise-library.html`
  - `exercise-library.js`
  - `auth-state-runtime.js`
  - `profile-write-runtime.js`
- Avatar/3D files
- Payment implementation files

## 13. Remaining manual checks

The remaining manual checks are the browser checklist in section 9. No additional runtime-code changes are authorized by Phase 9.

## 14. Blocking issues

None found during report preparation. The recommendation remains PARTIAL GO because manual browser checks and upstream TTS confirmation/defer decision are still outstanding.

## 15. Non-blocking risks

The non-blocking risks are listed in section 10 and should be accepted explicitly by the pilot owner before starting the controlled pilot.

## 16. Human approval status

Phase 9 is ready for human approval as a **PARTIAL GO** pilot lock report. Required post-report commands have been run; the only failing check is the expected default local `ops:preflight` failure without pilot env vars, and the documented hardened pilot baseline passes.
