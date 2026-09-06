# Mufasa Phase A implementation summary

Phase A converges the workout/mirror Mufasa chat destination onto the authenticated Node AI Coach service already used by the dedicated Mufasa Coach experience.

## Runtime change
`RuntimeState.getEndpoints().askUrl` now aliases the canonical authenticated `aiCoachUrl` at `/api/me/ai-coach/messages` on the configured Node backend.

## Preserved behavior
- `CoachRuntime` remains the speech/wake-word/typed-chat client.
- Auth bearer injection remains unchanged.
- Calibration voice arbitration remains unchanged.
- Explicit mute/listening behavior remains unchanged for Phase B.
- External brain program generation remains unchanged.

## Data/authority outcome
Workout and wake-word questions now enter `aiCoachService`, which constructs context through `coachContextService` using the authenticated member identity. No new coach store or duplicate member data is introduced.

## Verification status
Regression coverage was added in `test/mufasa-phase-a-canonical-coach-convergence.test.js`. Independent review should execute that test plus relevant AI Coach, speech activation, and calibration voice suites before merge.
