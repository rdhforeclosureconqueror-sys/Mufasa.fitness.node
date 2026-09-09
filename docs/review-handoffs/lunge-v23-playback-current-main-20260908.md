# Lunge v2.3 playback regression — current-main repair

## Owner-observed failure
After loading the Phase E reference avatar, **Load Stationary Lunge Left v2.3** leaves **Play** disabled while the Phase E fixture, push-up, and squat remain playable.

## First broken boundary
Motion Lab only enables Play after `MotionLabRuntime.loadMotionSpec()` produces a ready runtime motion/action. The v2.3 source currently on main reused the rejected v2.2 long-stride/aggressive loaded geometry. That authored geometry can pass static `validate()` checks but still fail the compiler/generated-IK/contact-anchor stage, leaving `state.motion` unset and Play correctly disabled.

The repository already contains prior playability evidence for the exact same failure family: v2.2 was rolled back to the last known-playable v2.1 geometry after it failed to produce a ready clip on device. Later v2.3 lineage work accidentally reintroduced that rejected geometry family.

## Repair
Keep the canonical version at **v2.3**, but restore the exact known-playable v2.1 movement geometry and preserve only the owner-approved split-plant right-knee correction.

- playable base: `lunge/stationary_left_movement_definition_v2_1_exit_release`
- rejected family: `v2.2-long-stride`
- playable split-top RightLeg pitch: `-7°`
- owner-approved split-plant delta: `+5°`
- v2.3 split-plant RightLeg pitch: `-2°`
- repetition-top RightLeg pitch remains `-7°`

This repair does **not** force-enable Play. The existing runtime remains the final authority: Play only enables if compilation, generated IK, contact anchoring, and action creation actually succeed.

## Acceptance
1. Initialize Motion Lab runtime.
2. Load Reference Avatar.
3. Load Stationary Lunge Left v2.3.
4. Confirm Play becomes enabled.
5. Press Play and confirm finite playback runs through the full sequence.
6. If Play remains disabled, copy the consolidated diagnostics; the remaining failure is then downstream of spec lineage and must be resolved at the compiler/IK/contact boundary.
