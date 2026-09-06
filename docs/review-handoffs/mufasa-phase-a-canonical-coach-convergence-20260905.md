# Independent review handoff — Mufasa Phase A canonical coach convergence

## Role
Review this as an independent technical reviewer. Do not merge during review.

## Goal
Make every workout/mirror Mufasa question, including wake-word questions, use the same authenticated Node AI Coach authority that powers `/coach.html`.

## Base
Phase A starts from main after merged PR #693:
`71848dba43db022a563e22055599a58238aec56a`

## What changed

### `public/runtime-state.js`
`RuntimeState.getEndpoints()` now exposes:
- `aiCoachUrl = <canonical Node backend>/api/me/ai-coach/messages`
- `askUrl = aiCoachUrl`

The existing `askUrl` name remains as a compatibility alias because `index.html`, `public/workout.html`, and `CoachRuntime` already consume it.

The legacy external Mufasa brain remains available only for the existing program-generation endpoint in this phase.

### Regression test
`test/mufasa-phase-a-canonical-coach-convergence.test.js` verifies:
1. `askUrl` and `aiCoachUrl` resolve to authenticated Node AI Coach.
2. They do not resolve to `https://mufasabrain.onrender.com/ask`.
3. Both workout shells still pass `RuntimeState.askUrl` into `CoachRuntime`.
4. `CoachRuntime` supplies the auth bearer token and understands the Node `data.answer` envelope.
5. The Node route derives the member identity from `req.auth.userId`.

## Why the change is intentionally small
`CoachRuntime` already owns speech, wake-word parsing, typed questions, auth-token injection, and answer extraction. Replacing that engine would create another authority. Phase A changes only the knowledge/chat destination.

## Required invariants
- One Mufasa knowledge authority: `aiCoachService` + `coachContextService`.
- Multiple UI/voice surfaces are allowed.
- Authenticated server identity selects member context.
- Client-supplied `user_id` must not select another member's canonical coach context.
- No profile/workout/badge/run duplication is introduced.
- Calibration speech behavior is unchanged in Phase A.
- Explicit mute behavior is unchanged in Phase A; mute lifecycle is Phase B.
- Program generation is not migrated in Phase A.

## Review questions
1. Does a workout typed question now hit `/api/me/ai-coach/messages`?
2. Does a wake-word question (`Hey Mufasa ...`) flow through the same `askCoach()` path and therefore the same endpoint?
3. Does the canonical Node route use `req.auth.userId` rather than trusting browser `user_id`?
4. Can the Node response envelope be read by `CoachRuntime.extractCoachAnswer()`?
5. Is there any surviving workout path that still posts questions directly to the external `/ask` endpoint?
6. Does this change leave TTS, wake-word recognition, calibration voice arbitration, and program generation behavior unchanged?
7. Are there cache/deployment concerns that require a cache-bust/version update before merge?

## Verification
Run at minimum:
`node --test test/mufasa-phase-a-canonical-coach-convergence.test.js`

Then run relevant AI Coach and speech tests, especially:
- `test/coach-speech-activation.test.js`
- AI Coach service/API tests
- avatar calibration voice tests

## Expected reviewer output
Return one of:
- `GO`
- `CHANGES REQUIRED`

If changes are required, identify the earliest actual broken boundary and keep fixes bounded to Phase A.

## Next phase after GO
Phase B: explicit voice lifecycle contract — default activation, intentional user mute, calibration suspension, and exact post-calibration resume semantics.
