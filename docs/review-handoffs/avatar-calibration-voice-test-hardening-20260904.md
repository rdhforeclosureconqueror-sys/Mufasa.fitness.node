# AVATAR CALIBRATION VOICE TEST HARDENING — REVIEW HANDOFF

## Parent

Parent corrective PR: #665
Parent head: `6c82d899b210becf0563e3d755adc6d8e023e397`

## Finding

PR #665 fixes the live voice-ownership race, but `test/avatar-calibration-canonical-voice.test.js` still encoded the older contract where calibration called `CoachRuntime.activateVoice()` and expected `canonicalCoachSpeak()` to behave synchronously.

That test no longer described the intended runtime after #665 and could make the verification suite internally contradictory.

## Change

The canonical calibration voice regression test now verifies the #665 ownership contract:

- calibration speech delegates to `CoachRuntime.speak(..., "avatar-calibration")`;
- calibration acquisition stops active listening;
- calibration activation does not call `startListening()`;
- the explicit post-calibration `resumeCanonicalCoachVoice()` handoff starts recognition once;
- a second resume does not create another recognition start;
- unavailable CoachRuntime fails safely for both activation and resume helpers.

## Scope

Test-contract hardening only. No MoveNet, pose math, solver, workout progression, or new voice runtime authority is added here.

## Reviewer instructions

Review this PR together with parent #665. Run:

- `test/avatar-calibration-exclusive-voice.test.js`
- `test/avatar-calibration-canonical-voice.test.js`
- `test/avatar-calibration-speech-arbitration.test.js`
- `test/coach-speech-activation.test.js`
- full repository suite

Manual acceptance remains: one voice during base-position capture, no wake interruption before READY, and Mufasa resumes once afterward unless explicitly muted.

Return GO or CHANGES REQUIRED. Do not merge the child without ensuring the parent runtime change is present.