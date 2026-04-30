# Phase 21 — Bridge Dependency Audit (Post session-api cleanup)

Date: 2026-04-30  
Scope search terms:
- `/api/auth/bridge`
- `authBridge(`
- `trustMode`
- `googleIdToken`
- `provider_unverified`
- `manual_unverified`

## Classification of remaining references

| File(s) | Classification | Notes |
|---|---|---|
| `server.js` | backend implementation | Canonical `/api/auth/bridge` route and trust-mode enforcement/policy wiring. |
| `src/validation/meValidators.js` | backend implementation | Bridge payload validation and trustMode normalization rules. |
| `src/lib/providerIdentity.js` | backend implementation | Verified and unverified provider identity resolution logic. |
| `src/lib/trustPolicy.js` | backend implementation | Allowed low-trust mode definitions and normalization helpers. |
| `src/lib/authToken.js`, `src/middleware/auth.js` | backend implementation | Identity class defaults and auth middleware claim handling. |
| `test/auth-hardening-phase13.test.js` | true bridge behavior tests | Directly validates bridge route auth/trust-mode semantics and verifier path behavior. |
| `test/bridge-war-room-trace.test.js` | true bridge behavior tests | Exercises manual/provider/verified bridge inputs and expected outcomes. |
| `test/session-api.test.js` | identity variance/control-plane tests | Uses bridge helper to mint identity tokens for session authorization coverage; not testing bridge itself as primary target. |
| `test/control-plane-phase-next.test.js` | identity variance/control-plane tests | Uses bridge to produce admin/user identities and enforce control-plane authorization/configuration behavior. |
| `test/diagnostics-api.test.js` | identity variance/control-plane tests | Uses resulting `manual_unverified` identity class assertions in diagnostics surfaces. |
| `test/auth-shell-guard.test.js`, `test/auth-migration.test.js` | identity variance/control-plane tests | Negative checks ensuring frontend does not call bridge route directly. |
| `backend-read.js` | identity variance/control-plane tests | Runtime control-plane client behavior for building bridge payloads and trust modes. |
| `README.md`, `docs/*.md` (auth migration/audit notes), `reports/*.md` | docs/reports only | Documentation and historical audits referencing bridge route and trust modes. |
| `scripts/repo-route-audit.js`, `scripts/auth-bridge-audit.js`, `scripts/auth-trace-audit.js` | removable stale scripts/docs (candidate) | Audit scripts with bridge-specific assumptions; likely stale once bridge retirement planning enters later phase. Keep for now unless replacing audit workflow. |

## Next safe cleanup target

**Recommended next target:** `scripts/auth-bridge-audit.js` and `scripts/auth-trace-audit.js`.

Rationale:
1. They are not runtime-path critical.
2. They duplicate checks now covered by tests and recent phase reports.
3. Removing or consolidating them is low-risk compared with touching `server.js`, validator, or bridge behavior tests.

## Validation run for this phase

- `npm run lint` ✅
- `node --test test/session-api.test.js test/pilot-login.test.js` ✅
