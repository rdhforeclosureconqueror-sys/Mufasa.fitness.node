# Kettlebell Start Workout Runtime Experience

## Summary
The canonical kettlebell handoff now enters a dedicated, mobile-first training layer inside the existing workout shell. It presents server-owned exercise order and prescriptions, intentional work/rest states, resumable server persistence, Movement Intelligence, canonical media, and the existing completion pipeline.

## Scope
This phase changes only the correlated kettlebell runtime reached through `workout.html?sessionId=kb_…`. It does not replace the general workout runtime, challenge programming, commitment scheduler, education registry, media registry, completion correlation, or gamification adapters. It introduces no camera or pose behavior.

## Existing Runtime Audit
The challenge projection already resolved a canonical commitment session, rendered server-projected exercises, and posted to the owner-scoped start route. The route deterministically created `kb_<enrollment>_<commitment>` with canonical workout and source metadata, marked the commitment started, and handed off to `workout.html`. Session completion already invoked commitment correlation and gamification capture idempotently. Missing pieces were an owner-scoped runtime read, resumable start semantics (the deterministic second start returned an opaque 409), canonical exercise-by-exercise presentation, persisted active progress, embedded education, and an intentional rest/completion view. The general workout page was camera-centric and did not consume the correlated canonical workout.

## Architecture Decisions
- Keep the existing deterministic runtime ID and treat an owned unfinished session as a resume, never as a new session.
- Add owner-scoped session read and narrowly validated runtime-progress APIs rather than copying prescriptions to browser storage.
- Activate a kettlebell-only overlay for `kb_` session IDs; all other workout entry points retain the established runtime.
- Persist only location/status (`exerciseIndex`, prescribed unit index, phase). Bounds always come from the stored canonical workout.
- Continue session completion through `POST /api/sessions/:id/complete`.

## Files Changed
- `src/services/sessionService.js`: owner-scoped reads and canonical-bounded progress persistence.
- `server.js`: clean start/resume response and runtime routes.
- `config/route-authorization-contract.js`: route security declarations.
- `config/intentional-html-sinks.js`: reviewed escaped template declaration.
- `public/workout.html`, `public/kettlebell-workout-runtime.js`, `public/kettlebell-workout-runtime.css`: active training mode.
- `test/kettlebell-workout-runtime-ux.test.js`: service, rendering, security, persistence, and semantics contracts.
- `e2e/kettlebell-workout-runtime-mobile.spec.js`: CI-ready 320/375/390/430 rendered contracts.

## Routes / APIs
- Existing `POST /api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/start-workout`: creates once or returns the same owned unfinished runtime with `resumed: true`.
- New `GET /api/sessions/:id`: returns only the authenticated user's stored authoritative session.
- New `PATCH /api/sessions/:id/runtime-progress`: accepts only canonical-bounded exercise/unit positions and enumerated phases.
- Existing `POST /api/sessions/:id/complete`: remains the sole completion path.

## Start Behavior
The server resolves the commitment and canonical session before deriving the runtime ID. Request bodies cannot override workout order or prescription. A missing runtime is created with canonical workout and source metadata and returns HTTP 201.

## Resume Behavior
An owned, unfinished deterministic runtime returns HTTP 200, `resumed: true`, the original canonical identity, and the same runtime URL. Stored progress restores the current exercise/unit and converts an interrupted working interval to an explicit paused state. Completed sessions return conflict and are not resurrected. Foreign or guessed IDs remain indistinguishable 404s.

## Active Workout State Model
The view has ready, working, rest, paused, complete, and unavailable states. Current exercise/unit and upcoming exercise derive from the stored canonical array. Timers are display/execution helpers; refresh persistence retains position/status, while an interrupted active timer resumes safely as paused rather than inventing elapsed time.

## Exercise Rendering
The hierarchy shows exercise number/count, canonical name/type, work target, set/round position, rest target, side instruction, tempo, one coaching focus, next exercise, and overall progress. Completed/current/upcoming position is derived from the single persisted canonical cursor.

## Timer / Rep Semantics
Activities with `workSeconds` receive a seconds-based timer and are never converted to reps. Rep prescriptions show their canonical minimum/range; the participant confirms set completion because the authoritative model does not support manual per-rep progress. Sets and rounds use their canonical field and bounds.

## Unilateral Semantics
Canonical `perSide` produces explicit per-side guidance: complete the prescription on one side and then the other. The UI never collapses it into an ambiguous total.

## Movement Intelligence Integration
Technique opens a modal over the active runtime using education already embedded from `getEducation`. Closing it leaves the in-memory and persisted workout cursor unchanged.

## Media Integration
The browser consumes only `education.media.url` supplied by the central registry projection and resolves it through `MaatApiClient.resolve`. Runtime code contains no filenames or JPG paths. Missing/failed media shows an accessible neutral fallback without substitution.

## Completion Flow
The runtime calls the established completion route. `sessionService` persists completion, the challenge completion callback correlates the exact commitment, and the existing event adapter captures gamification. The view displays refreshed server-derived commitment totals when available. Duplicate completion remains idempotent.

## Ownership / Security
Every runtime data route requires authentication and membership entitlement, indexes session data beneath `req.auth.userId`, and ignores client identity authority. Progress validation rejects unknown sessions, completed sessions, out-of-order array bounds, prescription-unit overflow, and unknown phases. Route authorization inventory passes for all 290 runtime routes.

## Mobile Behavior
The fixed training layer supports 320–430 px widths, has no fixed content width, reserves iPhone top/bottom safe areas, uses at least 58 px primary controls, keeps actions in thumb reach, and prevents horizontal overflow by construction. The E2E contract checks all four requested viewports.

## Accessibility
Controls are semantic buttons/links with visible focus, media has registry alt text or an accessible fallback, phase is written as text, the guide has an accessible close name, touch targets are large, and a polite status region announces coarse state rather than every timer tick visually. Reduced-motion preference is respected.

## Tests Added
Four Node tests cover canonical identity/order/prescription/source/media, owner/guessed-ID denial, bounded persisted progress, completion idempotency, completed-session guards, semantics, accessible UI contracts, and no filename duplication. Four Playwright cases cover 320, 375, 390, and 430 px.

## Tests Run
- `npm run lint`: pass.
- `npm test`: 1,208 tests; 1,208 pass, 0 fail, 0 skipped/cancelled/todo.
- Targeted kettlebell runtime/integration/commitment/education run: 15 tests; 15 pass, 0 fail.
- `npm run security:validate-routes`: pass; 290 runtime routes match the authorization contract.
- `git diff --check`: pass.
- Playwright rendered run: not executed; `npx` attempted registry access and received HTTP 403 because Playwright is not installed locally.

## Route Verification
Static contract and executable integration coverage verify the challenge definition, join, reschedule, start, session completion, exercise education, and media routes. New session read/progress declarations match the executable server inventory.

## Authenticated Verification
Authenticated integration creates separate owner and attacker tokens, denies attacker start/access, starts the server-selected workout despite an override payload, and completes/idempotently re-completes the exact correlated runtime.

## Binary Status
No binary file is added, modified, renamed, or deleted. The existing 16 JPG assets remain untouched.

## Rendered Mobile Status
CI-ready Playwright coverage exists for all requested widths, but rendered success and screenshots are not claimed. The local environment cannot install/execute Playwright due the registry HTTP 403 restriction.

## Known Limitations
- A refresh during an active timer restores an explicit paused state and the full canonical interval; the server currently stores phase/cursor, not timer wall-clock expiry.
- Manual rep-by-rep counting is intentionally absent because the authoritative challenge model does not persist it.
- Completion shows commitment totals when the refreshed current-challenge projection is available; it does not calculate or synthesize XP/streak values.

## Regression Risks
The primary risk is interaction between the legacy workout page boot and the fixed kettlebell overlay. Activation is restricted to deterministic `kb_` IDs, leaving every general workout path unchanged. The complete 1,208-test regression and static focus-mode tests pass.

## Merge Readiness
Ready for human review and merge. Code, route inventory, full regression, lint, and whitespace validation pass. Rendered device review remains an environment-limited follow-up rather than a claimed pass.

## Recommended Next Phase
Deploy to a review environment and perform real iPhone Safari checks of safe areas, background/foreground timer behavior, voice/accessibility verbosity, and full authenticated Start → Resume → Complete navigation. Camera and pose work should remain a separate later phase.
