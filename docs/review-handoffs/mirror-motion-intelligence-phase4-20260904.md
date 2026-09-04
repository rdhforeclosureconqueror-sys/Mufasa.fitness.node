# Mirror Motion Intelligence — Phase 4 review handoff

## Scope

Phase 4 adds exercise-context awareness after Phase 3 structural correction and before the canonical avatar retarget renderer.

Audited base: `61ec29a707a7661501851be47d6c9eb1f0738920` (merged PR #640).

Branch: `feature/mirror-motion-intelligence-phase4-20260904`.

## Pipeline

`MoveNet raw -> Phase 2 temporal stabilization -> Phase 3 structural body constraints -> Phase 4 exercise context/contact constraints -> existing AvatarRuntime retarget renderer -> avatar render`

Raw MoveNet remains canonical perception evidence for workout/form analysis. Phase 4 changes only the avatar presentation path.

## Existing authority reused

Phase 4 does not create a new exercise-selection system. It consumes the existing workout selection exposed by PocketPT (`window.__selectedExercise` / active workout) and normalizes known aliases for:

- squat
- push-up
- jumping jack
- lunge

The phase classifier is presentation intelligence, not rep-count authority.

## Implemented behavior

### Squat

- Classifies standing / bent / bottom from knee geometry.
- Establishes left/right ankle contact anchors while standing or bending.
- Corrects only bounded foot drift.
- Releases an anchor rather than forcing it when measured drift exceeds the body-scale-normalized tolerance.

Goal: reduce the visible foot skating and split-like leg failures that remain after temporal and structural stabilization.

### Push-up

- Distinguishes upright/floor transition from horizontal push-up posture.
- Does not anchor hands/feet while the user is still getting down to the floor.
- Once the torso is horizontal, anchors both wrists and both ankles with bounded corrections.
- Releases push-up anchors during transition.

Goal: allow the avatar to follow the user down to the floor instead of assuming an upright body while preserving planted contacts once the push-up position is established.

### Jumping jack

- Classifies CLOSED / OPEN / TRANSITION from ankle separation relative to shoulder width plus wrist height.
- Does not plant the feet.

Goal: preserve real opening/closing leg travel instead of applying a squat-style foot constraint to a movement that requires foot displacement.

### Generic posture

When no recognized exercise is selected, Phase 4 only classifies upright vs horizontal body posture. It does not create contact anchors.

## Contact safety rules

- Only non-coasted, non-dropped points above confidence threshold may create or maintain anchors.
- Contact tolerance is normalized by measured shoulder/hip scale.
- Missing body scale prevents correction rather than inventing a pixel constant.
- Excess drift releases the anchor rather than dragging the avatar to a stale contact point.
- Exercise changes release old anchors.

## Diagnostics

Dedicated `Mirror Motion Phase 4 Debug` panel reports:

- first failing Phase 4 boundary
- pipeline stage
- runtime patch status
- renderer binding
- selected exercise pattern
- interpreted exercise phase
- anchored contact count
- cumulative anchor corrections
- anchor releases
- last exercise-context issue
- process errors

## Files

- `public/mirror-motion-phase4.js`
- `public/runtime-state.js`
- `test/mirror-motion-phase4.test.js`
- this handoff

## Verification

Run at minimum:

`node --test test/pose-stability-engine.test.js test/mirror-motion-phase2.test.js test/mirror-motion-phase3.test.js test/mirror-motion-phase4.test.js`

Then run the full repository suite.

Manual acceptance should include:

1. Standing squat calibration, then repeated squats: feet should remain visually planted without delaying knee/hip movement.
2. Deliberately move a foot during squat: anchor should release instead of fighting the real motion.
3. Move from standing to floor for push-up: no premature hand/foot lock during transition.
4. Hold push-up position and perform reps: wrists/ankles should remain stable.
5. Jumping jacks: feet must remain free to open/close; OPEN/CLOSED state should change sensibly.
6. Fast arm movement: Phase 2 responsiveness must remain intact.
7. Camera disconnect/reacquisition: Phase 2/3 reset behavior must remain intact and Phase 4 must not preserve stale contacts across an exercise/session reset.
8. Avatar overlay and avatar-only modes.

## Reviewer focus

Challenge these failure modes specifically:

- stale contact anchors after camera/person discontinuity;
- false push-up horizontal classification while bending over;
- squat anchors fighting deliberate stepping or stance changes;
- jumping-jack feet being accidentally anchored;
- wrapper order accidentally bypassing Phase 2 or Phase 3;
- selected exercise changes not releasing prior contacts;
- Phase 4 changing raw MoveNet packets used by form/rep systems.

## Explicit non-goals

No inverse kinematics solver, quaternion retarget rewrite, 3D depth reconstruction, collision solver, live F-curve engine, or new camera/MoveNet authority in this PR.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge during independent review unless explicitly requested by the owner.
