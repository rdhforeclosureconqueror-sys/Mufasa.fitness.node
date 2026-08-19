# Phase 9 — Leader Within ↔ Pocket PT bridge

## Repository integration audit (2026-08-17)

The audit searched the repository for Leader Within, Garvey, leader IDs, cohorts, movement missions, `local_mission`, `leader_within_pocketpt_activity_summaries`, authentication, CSRF, participant identity, launch routes, runtime persistence, completion, audit, and tenant/organization fields.

* This repository contains **no Leader Within/Garvey application, participant/enrollment store, Leader ID implementation, cohort workflow, local movement mission store, facilitator UI, or `leader_within_pocketpt_activity_summaries` implementation**. Leader Within is therefore treated as an external bounded context; no duplicate application model or UI was invented here.
* Pocket PT authentication resolves the subject on the server as `req.auth.userId`. Youth runtime routes are `/api/me/...`; their write operations use a subject-bound, double-submit CSRF token. Garvey enters through the authenticated integration boundary `GET /integrations/garvey/launch?context=...`, which verifies the signed context before redirecting to the existing `/pocketpt/my-program` identity/program flow.
* Pocket PT owns the opaque `YFPT-*` participant reference. The Phase 8 runtime atomically persists program/profile aggregates and program-bound sessions in schema-v1 JSON storage. Completion is the canonical `session_result` attached to the owned session.
* Phase 8's shared participant-session projection conditionally returns `blueprint` only for an owner-scoped `IN_PROGRESS` session with readiness, no pain, and an `ALLOW`/`ALLOW_WITH_WARNINGS` Phase 6 result. Phase 9 consumes that service but never projects its session object.
* The repository has audit/event patterns, but no shared cross-application event bus or production tenant registry. Phase 9 consequently uses a small additive bridge repository and metadata-only audit ledger. Network delivery, production SSO/service authentication, and a Leader Within UI remain integration/deployment work.

## Contract and ownership

`leader_within_pocketpt_bridge_v1` is an explicit allowlist projection. Leader Within supplies its durable participant, enrollment, Leader ID, organization, and mission identifiers through an authorized integration workflow. Pocket PT maps those identifiers to its authenticated subject and opaque participant reference; mutable names are never identity keys. Organization equality and either participant ownership or a narrowly permissioned facilitator context are required. Unauthorized lookup fails as not found.

Assignment is deliberate and program-first: the bridge resolves the existing active program dashboard, takes its independently current session slot, and links that exact session to the leadership mission. It never compares Leader Within and fitness week numbers, calls a random-workout path, or creates a program. Only a facilitator granted both participant-read and movement-assignment permission may create the linkage.

The externally consumed launch route is the fixed `GET /integrations/garvey/launch?context=...` contract. It is exposed only when `GARVEY_INTEGRATION_ENABLED=true` and verifies an HS256 compact JWS using `GARVEY_LAUNCH_VERIFICATION_SECRET` (SECRET A). The payload is restricted to contract/version, issuer/audience, a five-minute maximum lifetime, opaque subject and assignment references, exact PocketPT/Garvey/movement bindings, and a return URL in `GARVEY_LAUNCH_RETURN_URL_ALLOWLIST`. Failures disclose no context or secret. A successful verification redirects to `/pocketpt/my-program`; it does not enroll a participant, create a workout/session, or mutate completion. Pocket PT identity, its existing program, readiness, Phase 6 validation, execution, and canonical completion remain authoritative.

## Exact allowlist

The v1 response contains only:

* contract name and version;
* Leader ID;
* bounded connection status;
* whether movement is required;
* bounded movement status;
* safe display name;
* launch availability and the fixed launch path; and
* completion timestamp.

Connection states currently emitted are `CONNECTED_NO_PROFILE`, `PROGRAM_READY`, `ACTION_AVAILABLE`, `ACTION_IN_PROGRESS`, `ACTION_COMPLETED`, `ACTION_UNAVAILABLE`, `SAFETY_HOLD`, and `TEMPORARILY_UNAVAILABLE`. Movement states are `NOT_ASSIGNED`, `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `UNAVAILABLE`, and `SAFETY_HOLD`.

## Explicitly prohibited data

The bridge never serializes raw Pocket PT aggregates. It prohibits readiness answers; pain location or reason; sleep, soreness, or energy values; movement-screen observations; detailed exercise/activity prescriptions or results; profile and assessment data; raw program-generation inputs; session blueprints; Phase 6 reasoning; coach/facilitator/private notes; follow-up information; credentials; cookies; session/CSRF tokens; and internal participant subjects or fitness identifiers.

## Completion, failure, and compatibility

Completion credit requires the canonical `COMPLETED` result of the session explicitly named by the assignment. The assignment ID uniquely keys one credit, so polling, refresh, retry, and duplicate processing return one logical credit. An unrelated workout cannot qualify. The canonical five-step mission calculator remains data-driven (one point each for story, practice selection, practice completion, movement, and reflection); it does not special-case percentages.

Pain or a Phase 6 delivery veto produces only `SAFETY_HOLD`, disables launch, leaves MOVE incomplete, and exposes no reason. Missing mapping fails closed; missing program does not create one; missing/stale sessions and paused state are unavailable; adapter failure becomes temporary unavailability and never completion. Deactivation/pause synchronization requires the external owning systems and remains deferred.

`movement_source` supports `LOCAL` and `POCKETPT`. The LOCAL projector returns the existing local mission unchanged. The migration is additive, does not rewrite Leader Within records, and does not reset Pocket PT data.

## Verification boundary

Focused tests use synthetic identities and secrets to prove mapping uniqueness, program-first linkage, launch authentication and claim validation, happy-path completion/credit/progress, safety hold, minimum-data projection, ownership and organization denial, facilitator permission, outage behavior, unrelated-session rejection, idempotency, and preservation after repository reopen. The first staging launch reached PocketPT but returned `Cannot GET /integrations/garvey/launch`; the corrected route still requires deployment and a repeated real browser test before staging verification.
