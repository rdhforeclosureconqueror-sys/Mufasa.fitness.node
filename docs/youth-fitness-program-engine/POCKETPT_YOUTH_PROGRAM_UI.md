# Phase 8 — Pocket PT Youth Program Experience and Delivery UI

## Runtime architecture and audit

Phase 8 adds participant delivery over the Phase 3 profile resolver, Phase 4 program planner, Phase 5 session planner, Phase 6 safety validator, and Phase 7 adaptation engine. It does not add a workout generator. `server.js` composes subject-scoped handlers; `runtime/service.js` owns the loop; `runtime/repository.js` owns atomic state; and the Pocket PT page renders youth-facing projections.

Before Phase 8, Pocket PT used JWT `req.auth.userId`, a JSON member aggregate, `/dashboard.html`, general program/session routes, exercise intelligence, generic profile/baseline/OHSA concepts, program analytics, gamification consistency, and trainer UI. It had no runtime youth enrollment, readiness, validated youth delivery, pain routing, or adaptation loop. Canonical identity/auth, API envelopes, atomic files, and card styling were reusable. Adult program policy, browser workout generation, public leaderboards, and diagnostic assessment claims were not.

## Exact routes and handlers

| Route | Exact handler |
| --- | --- |
| `GET /pocketpt/my-program` | mobile Pocket PT shell |
| `GET /api/me/youth-fitness/csrf` | `youthCsrf.issue(req.auth.userId)` |
| `POST /api/me/youth-fitness/program/enroll` | `youthProgramService.enrollment` → `resolveYouthFitnessProfile` → `planYouthFitnessProgram` |
| `GET /api/me/youth-fitness/program` | `youthProgramService.dashboard` |
| `POST /api/me/youth-fitness/sessions/:sessionRef/start` | `youthProgramService.start` → `planYouthFitnessSession` → `validateYouthFitnessSessionSafety` |
| `GET /api/me/youth-fitness/sessions/:sessionRef` | `youthProgramService.view` |
| `PUT /api/me/youth-fitness/sessions/:sessionRef/readiness` | `youthProgramService.readiness` → replan/adjust → safety revalidation |
| `PUT /api/me/youth-fitness/sessions/:sessionRef/activities/:activityId` | `youthProgramService.recordActivity` |
| `POST /api/me/youth-fitness/sessions/:sessionRef/activities/:activityId/stop` | `youthProgramService.stopActivity` |
| `POST /api/me/youth-fitness/sessions/:sessionRef/finish` | `youthProgramService.finish` → canonical result → `adaptYouthFitnessProgression` → next Phase 5 blueprint → Phase 6 validation |

All handlers derive ownership from `req.auth.userId`. Browser `participant_id`, `participant_ref`, `tenant_id`, training level, and safety claims have no authority. Repository reads require the opaque reference and matching `owner_subject`; foreign records return not found.

## Program, week, session, and progress experience

The hierarchy is program → journey → current phase → week → target → today → activity → result → next session. Journey phases/week ranges come from `program.phases`; future phases expose orientation only. Week targets and focus come from the current Phase 4 week and persisted completion records.

Readiness collects energy 1–5, soreness, sleep, and pain. It is processed server-side. Low energy/poor sleep reduces sets; significant soreness routes conservatively; every adjusted blueprint is revalidated. Pain withholds the blueprint, sets coach review, asks the youth to tell a coach/supervising adult, and provides no diagnosis or treatment.

Participant session responses use a single delivery projection: executable blueprint content is returned only while the owner-scoped session is `IN_PROGRESS`, readiness exists, no pain flag is active, and Phase 6 returned `ALLOW` or `ALLOW_WITH_WARNINGS`. Start, blocked readiness, pain-stop, completed, foreign, and otherwise non-deliverable states cannot expose the stored executable blueprint.

Session blocks are visually separated. Approved cards show name/type, prescription, rest, registry instructions, cues, and stop conditions. Approved `GAME` records retain game identity; no game is invented. Evidence metadata is not rendered. Actual set/duration values are explicit and may differ from prescription. Stops preserve valid quality reps and neutral reasons (`TECHNIQUE`, `PAIN`, `TOO_TIRED`, `COACH_STOPPED`, `OTHER_SAFE_REASON`).

Finish records effort and optional accomplishment, creates one Phase 7 result, displays a factual adaptation message, and prepares a Phase-6-validated future state. Consistency is `eligible_completed / eligible_scheduled`, with `null` for zero denominator. Current progress is self-only (sessions, level, and baseline availability); there is no global score, ranking, or public leaderboard. One claim-reviewed Phase 4 education message is shown.

## Mobile, persistence, idempotency, and auditability

The UI uses stacked cards, a 720px maximum width, 48px touch controls, labels, sticky progress, high-contrast colors, no tables, and no hover dependency.

`data/youth-fitness/runtime-v1.json` has exact collections `programs` and `sessions`. Program records preserve owner, opaque participant reference, canonical profile/program/version, lifecycle position, and timestamps. Session records preserve Phase 5 blueprint/version, Phase 6 result/validator version, readiness, activity results, stop/pain state, Phase 7 result/adaptation version/rule IDs/reason codes, future validation, and timestamps. Temporary-file plus rename writes are atomic. Existing files are never reset.

Enrollment/start are get-or-create, activity results upsert by approved activity ID, deterministic result/adaptation IDs prevent duplicates, and finish returns an existing result. Readiness/results persist for resume. `migrations/002-youth-fitness-runtime-v1.json` is additive, idempotent, backward-compatible, and non-destructive; it adds no participant master.

Every mutation has `requireAuth` and exactly one `youthCsrf.requireToken`. `GET .../csrf` sets subject-bound `pocketpt_youth_csrf` (`Path=/api/me/youth-fitness; SameSite=Strict; Secure; Max-Age=1800`) and returns the value/header contract. Mutations require the identical `x-pocketpt-csrf` value; the client uses `credentials: same-origin`. Missing, mismatched, malformed, or other-subject tokens return 403; refresh issues a new binding.

## Deferred functionality and Phase 9 boundary

Deferred: full baseline assessment UI; guardian consent/age assurance/privacy/retention; coach-review release; administrator cancellation/medical exclusion UI; normalized multi-process production storage/backup; approved media; richer game/timed inputs; assessment trends/personal bests; and staging device/accessibility verification.

No Garvey/Leader Within route, cohort, curriculum, facilitator workflow, reflection, event, or bridge was added. Phase 9 may consume a bounded opaque summary only.

## Manual checklist

The requested 28 steps remain prepared (synthetic sign-in through cross-participant and mobile Safari checks) but were **not executed** in staging or on a real device. Staging verified: **NO**. Live user verified: **NO**.

## Release verification (2026-08-17)

The final post-correction repository state passed `npm test`: 1,076 passed, 0 failed, 0 skipped. The focused security/Phase 8 command passed 18 tests, and the Phase 1–7 command passed 74 tests. The release audit additionally corrected the response projection so a stored blueprint cannot be returned before readiness or after pain/coach-review routing; focused tests cover start withholding, pain-readiness withholding, pain-stop withholding, browser authority rejection, ownership, CSRF, and repository initialization idempotency. Staging, Mobile Safari, and live-user verification remain separate unperformed deployment gates.
