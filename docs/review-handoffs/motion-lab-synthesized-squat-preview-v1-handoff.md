# Independent Review Handoff — Motion Lab Synthesized Squat Preview v1

Historical handoff for PR #603. The temporary global adapter described below is superseded by the [Motion Lab and Movement Lego integration repair](motion-lab-lego-integration-repair-handoff.md), which contains the current architecture, verification and human-review requirements.

## Role

Act as an independent reviewer. Do not assume the authoring bot is correct. Do not merge solely from this handoff.

## Goal

Make the already-merged `squat/synthesized_engineering_v1` motion definition visible inside the existing admin/internal Motion Lab so a human can load the Phase E reference avatar, explicitly select the synthesized squat, press Play, and visually judge whether the Movement Lego synthesis produces a recognizable squat.

This is a development proof only. It must not promote the squat into the production motion registry, exercise scoring, MoveNet recognition, coaching tolerances, or biomechanical authority.

## Base

Branch: `motion-lab-synthesized-squat-preview-v1`

Created from main SHA `60e95285e3bd52178a2302da94fa21e7a518b208`, the merge commit for PR #602.

PR #602 already added:
- `public/motion/squat-motion-spec.js`
- `motion-sources/squat-synthesis-v1.source.json`
- `test/squat-motion-spec-v1.test.js`
- its synthesis review handoff

## Changes in this PR

### `motion-lab/index.html`
Adds one explicit development control:

`Load Synthesized Squat v1 (Reference Only)`

The page text states that the squat is synthesized from reviewed Movement Lego mechanics and is not biomechanically validated.

### `motion-lab/motion-lab-bootstrap.js`
Loads `/motion/squat-motion-spec.js` before `motion-lab-runtime.js` and wires the new button after runtime initialization.

The existing Motion Lab runtime already exposes only one generic-enough engineering-spec entry point publicly: `MotionLabRuntime.loadPushUp()`. Internally that method validates the current global `PocketPTPushUpMotionSpec`, sends its `.spec` through the existing `PocketPTMotionSpecClip` compiler, and calls `session.loadMotionSpec(...)`.

To avoid copying or creating a second renderer/session/compiler path, the preview adapter temporarily swaps:

`window.PocketPTPushUpMotionSpec = window.PocketPTSquatMotionSpec`

then awaits the existing `MotionLabRuntime.loadPushUp()` path, and restores the original push-up contract in `finally`.

This is intentionally a narrow compatibility adapter for the development lab. The reviewer should decide whether this is acceptable for the proof or whether the runtime should instead be refactored later to expose a generic `loadMotionSpec(contract)` method.

### Test

`test/motion-lab-synthesized-squat-preview-v1.test.js`

Checks:
- visible squat button exists
- squat spec loads before Motion Lab runtime
- adapter uses the existing motion-spec path
- original push-up global is restored
- no autoplay
- no camera/MoveNet detector ownership is added
- squat contract remains development-only and contains no FBX/GLB dependency

## Required independent checks

1. Confirm current branch is based on the stated main SHA or a clean descendant.
2. Read `public/motion/squat-motion-spec.js`; verify it is still `development-test-only` and `squat/synthesized_engineering_v1`.
3. Read `motion-lab/motion-lab-bootstrap.js`; confirm the temporary global swap is always restored through `finally`, including failure paths.
4. Confirm no new `getUserMedia`, MoveNet detector, renderer, RAF owner, animation mixer, or binary asset is introduced.
5. Confirm no production motion registry entry was added for the squat.
6. Run:

   `node --test test/squat-motion-spec-v1.test.js test/motion-lab-synthesized-squat-preview-v1.test.js`

7. If Motion Lab can be run, perform human visual proof:
   - authenticate as an authorized Motion Lab operator
   - open `/dev/motion-lab`
   - Initialize Runtime
   - Start Session
   - Load Reference Avatar
   - select `Load Synthesized Squat v1 (Reference Only)`
   - press Play
   - inspect at least two loops
   - use Pause / Resume / Stop / Restart
   - confirm the original Push-Up control still loads the push-up after the squat preview
   - Dispose Runtime and check lifecycle resources return to zero

## Visual acceptance questions

Give separate PASS/FAIL/UNPROVEN answers for:

- Does the avatar remain connected with no skeletal explosion or inversion?
- Do both feet remain plausibly planted through the non-jumping squat?
- Does the pelvis travel down and back rather than teleport?
- Do knees and hips flex symmetrically during descent?
- Is there a recognizable bottom position?
- Does ascent approximately reverse descent?
- Does the avatar return to a stable upright finish?
- Is there catastrophic foot sliding, root drift, or lateral translation?
- Does the motion look like a bodyweight squat rather than a hinge-only good morning?

## Expected product boundary

A successful review proves only:

`reviewed animation mechanics -> synthesized motion spec -> existing Motion Lab compiler/runtime -> visible avatar motion`

It does NOT prove:
- biomechanical correctness
- coaching safety
- user-specific squat depth
- MoveNet scoring thresholds
- production readiness
- human FRONT + SIDE validation

## Reviewer verdict format

Return three independent verdicts:

1. **Static/code contract:** GO / NO-GO
2. **Motion Lab runtime/visual proof:** GO / NO-GO / UNPROVEN
3. **Biomechanical validation:** must remain UNPROVEN until human evidence/review exists

Do not merge if the static/code contract is NO-GO. Do not describe the synthesized squat as visually proven unless the Motion Lab steps were actually executed and observed.
