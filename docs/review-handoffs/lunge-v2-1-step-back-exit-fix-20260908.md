# Lunge v2.1 step-back exit fix — 2026-09-08

## Observed device failure
Motion Lab loaded the reference avatar, but selecting the new lunge left **Play** disabled. The consolidated diagnostic reported:

- `animation_clip: FAIL (motion_generated_chain_ik_failed)`
- `First failing boundary: CHAIN_IK:right_leg`
- `First failing phase: step_back`
- right leg solve: `UNREACHABLE`
- root correction clamped at `0.39644`

Squat remained playable, isolating the failure to the new lunge Motion Spec rather than the runtime/play controls.

## Root cause
The v2 movement definition preserved `right_rear_forefoot` as an enforced split-stance contact during `step_back`, while the authored `STEP` pose simultaneously moved the right leg almost back toward neutral. The compiler therefore received contradictory instructions: keep the rear toe at the split-stance anchor while neutralizing the leg geometry. Shared Phase 4 IK correctly rejected that target as unreachable, so no animation clip was created and Play remained disabled.

## Fix
- keep both split-stance contacts and generated IK authority through `rep3_top`;
- release loaded contact authority before `step_back`;
- leave `step_back` and `stand_finish` unconstrained by the loaded lunge anchors;
- preserve the strict IK failure behavior instead of weakening solver validation;
- version the corrected movement as **v2.1** with motion ID `lunge/stationary_left_movement_definition_v2_1_exit_release`;
- update Motion Lab UI from stale **Synthesized Lunge Left v1** wording to **Stationary Lunge Left v2.1**;
- add regression coverage that fails if a loaded contact is reintroduced on `step_back`.

## Acceptance
On deployed iPhone Motion Lab:
1. Initialize Runtime and Start Session.
2. Load Reference Avatar.
3. Select **Load Stationary Lunge Left v2.1 (Reference Only)**.
4. `animation_clip` should PASS and Play should enable.
5. Motion Intelligence should not report `CHAIN_IK:right_leg` at `step_back`.
6. Play the full motion and perform human visual review of the step-in, three reps, and return to standing.

This PR fixes the first compile failure only. It does not claim the lunge is visually cleared.