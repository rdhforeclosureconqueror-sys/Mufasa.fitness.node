# Phase 18 — Bridge reference audit (2026-04-30)

Scope terms:
- `/api/auth/bridge`
- `authBridge(`
- `trustMode`
- `googleIdToken`
- `provider_unverified`
- `manual_unverified`

## Classification of remaining references

| Path | Classification | Notes |
|---|---|---|
| `server.js` | backend route implementation | Canonical POST `/api/auth/bridge` route and trust-mode policy wiring. |
| `src/validation/meValidators.js` | backend route implementation | Validates bridge payload and trust mode constraints. |
| `src/lib/providerIdentity.js` | backend route implementation | Identity derivation/verification, including low-trust guards. |
| `src/lib/trustPolicy.js` | backend route implementation | Trust-mode normalization and allow-list behavior. |
| `src/lib/authToken.js` | backend route implementation | Token identity class defaults include bridge classes. |
| `backend-read.js` | backend route implementation | Backend client bridge call path used for backend session token bootstrap. |
| `test/bridge-war-room-trace.test.js` | true bridge behavior test | Explicit bridge flow coverage for manual/provider/google_verified cases. |
| `test/auth-hardening-phase13.test.js` | true bridge behavior test | Exercises verification, invalid trust mode, and policy failure paths. |
| `test/control-plane-phase-next.test.js` | identity variance test | Uses bridge to mint identities across admin/user and trust-mode scenarios. |
| `test/session-api.test.js` | identity variance test | Uses helper `authBridge(...)` to generate tokens for session API authorization checks. |
| `test/pilot-login.test.js` | docs/report only | No bridge/trust-mode terms present in file. |
| `test/auth-shell-guard.test.js` | docs/report only | Assertion that frontend HTML does not include bridge route string. |
| `test/auth-migration.test.js` | docs/report only | Assertion guarding against stale frontend bridge references. |
| `README.md` | docs/report only | Documents current bridge contract and trust modes. |
| `reports/*.md` | docs/report only | Historical audits and operational notes that intentionally mention bridge route. |
| `scripts/auth-bridge-audit.js` / `scripts/auth-trace-audit.js` | should remove now | One-off/legacy audit scripts that mostly duplicate test+docs coverage. |
| `scripts/repo-route-audit.js` | should remove now | Generic route audit script retaining bridge string constants; low runtime value. |
| `PILOT_READINESS_PHASE4.md` | should remove now | Historical phase checklist; stale operational artifact. |

## Session API bridge-free status

`test/session-api.test.js` is **not bridge-free**. It still defines `authBridge(baseUrl, payload)` and POSTs to `/api/auth/bridge` to create bearer tokens used by session API assertions.

## Next safe cleanup target

Safest immediate target: remove/retire historical audit scripts and stale readiness artifact:
1. `scripts/auth-bridge-audit.js`
2. `scripts/auth-trace-audit.js`
3. `scripts/repo-route-audit.js` (if no CI/job dependency)
4. `PILOT_READINESS_PHASE4.md`

Reason: these are non-runtime artifacts and removing them does not change backend route behavior or test semantics.
