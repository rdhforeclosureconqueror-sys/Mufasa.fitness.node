# Pilot Auth Environment Hardening

Phase 3 keeps the existing auth system in place and makes pilot/production configuration deterministic. It does not add auth providers, change the login UI, change session writes, or weaken permission checks.

## Required pilot/production variables

Set these values in the deployment environment before pilot approval:

| Variable | Required value/posture | Why it is required |
| --- | --- | --- |
| `AUTH_TOKEN_SECRET` | Non-empty high-entropy secret; must not be `dev-only-secret-change-me` or another default/dev-only placeholder. | Signs auth tokens deterministically and prevents production use of development secrets. |
| `PILOT_LOGIN_PASSWORD` | Non-empty pilot login password. | Allows the existing explicit email/password login route to work without adding another provider. |
| `LOGIN_SEED_EMAIL` | Non-empty pilot login seed email. | Makes the default pilot login principal explicit and repeatable. |
| `ALLOWED_ORIGINS` | Non-empty comma-separated origin allowlist in pilot/production mode. | Prevents pilot/production CORS behavior from depending on an empty allowlist. |
| `AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS` or `AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS` | At least one non-empty allowlist entry in either variable. | Ensures deterministic initial super-admin access. |
| `ENABLE_TTS_NO_AUTH` | `false` | Keeps unauthenticated TTS access disabled for pilot/production. |
| `AUTH_BRIDGE_ALLOW_MANUAL` | `false` | Disables manual low-trust bridge issuance. |
| `AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE` | `false` | Disables unverified Google bridge issuance. |

## Preflight behavior

Run:

```sh
npm run ops:preflight
```

The preflight exits with status `1` and reports the exact variable names when any required auth hardening value is missing or misconfigured:

- `AUTH_TOKEN_SECRET` is missing or uses a default/dev-only value.
- `PILOT_LOGIN_PASSWORD` is missing.
- `LOGIN_SEED_EMAIL` is missing.
- both `AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS` and `AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS` are empty.
- `ENABLE_TTS_NO_AUTH` is not exactly `false`.
- `AUTH_BRIDGE_ALLOW_MANUAL` is not exactly `false`.
- `AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE` is not exactly `false`.
- `ALLOWED_ORIGINS` is empty while running in pilot/production mode.

Pilot/production mode is detected when any of these are set: `NODE_ENV=production`, `APP_ENV=production`, `APP_ENV=pilot`, `DEPLOY_ENV=production`, `DEPLOY_ENV=pilot`, `PILOT_MODE=true`, `PILOT_MODE=pilot`, `PILOT_DEPLOYMENT=true`, or `PILOT_DEPLOYMENT=pilot`.

If `ALLOWED_ORIGINS` is empty outside pilot/production mode, preflight emits a warning so local developers can still see the rollout requirement before enabling pilot/production mode.

## Minimal passing pilot example

```sh
AUTH_TOKEN_SECRET='replace-with-32-plus-random-characters' \
PILOT_LOGIN_PASSWORD='replace-with-pilot-password' \
LOGIN_SEED_EMAIL='pilot@example.com' \
ALLOWED_ORIGINS='https://your-pilot-origin.example' \
AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS='pilot_email_pilot.example.com' \
ENABLE_TTS_NO_AUTH=false \
AUTH_BRIDGE_ALLOW_MANUAL=false \
AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE=false \
NODE_ENV=production \
npm run ops:preflight
```
