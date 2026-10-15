# Wellness browser staging gate

The existing Render frontend and backend both deploy from `main` and have pull-request previews disabled. They are **production**, not staging. Do not create disposable signups, events, RSVPs, payments, or attendance records on either service.

## Preconditions before browser E2E

1. Provision a **separate** backend and frontend deployment, with distinct staging URLs and no production storage or credentials. Confirm database/disk isolation, OAuth callback origins, email/SMS sandboxing, Stripe test mode, and test-only event fixtures.
2. Use a dedicated staging branch or preview, and confirm the deployed commit. Do not share a persistent volume, user store, or event catalog with production.
3. Set `WELLNESS_STAGING_ORIGIN=https://<dedicated-staging-backend>.onrender.com` and `WELLNESS_STAGING_APPROVED_HOST=<dedicated-staging-backend>.onrender.com`; run `node scripts/wellness-staging-preflight.js` before any external requests. This is a **local validation only**, not proof of data isolation.
4. Add staging-only disposable identities and cleanup with auditable test-run identifiers. Keep registration, RSVP, check-in and CRM assertions disabled until isolation is independently verified.
5. Once isolated, execute browser registration/login, public event discovery, RSVP, admin check-in, member readback, CRM Client Management readback, permission-denial matrix, cleanup and rollback. Record first failing boundary and screenshots/redacted evidence.

Do not claim full browser E2E certification from the current isolated service or loopback HTTP tests.
