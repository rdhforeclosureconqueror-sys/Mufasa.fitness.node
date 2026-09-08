# Motion Lab Pose Editor / Motion Authoring — Review Handoff

## Purpose

Reduce tiny animation-tuning PR cycles by letting the owner make bounded pose corrections directly in Motion Lab, preview them on the avatar, play an adjusted temporary clip, reset safely, and export structured adjustment data for later incorporation into a Motion Spec.

## User workflow

1. Initialize Runtime and start a Motion Lab session.
2. Load the reference avatar and a generated Motion Spec.
3. In **Pose Editor / Motion Authoring**, choose a phase and press **Load Phase for Editing**.
4. Choose body part, Move/Rotate mode, axis, and step size.
5. Tap `−` / `+` to make small changes.
6. For hands and feet, position moves use shared Phase 4 two-bone IK so intermediate joints follow naturally.
7. Press **Play Adjusted Preview** to play a temporary cloned clip with the sampled-phase corrections patched into the relevant keyframe.
8. Use **Reset Selected**, **Reset Phase**, or **Reset All** at any time.
9. Press **Copy Motion Spec Adjustment** to export structured, avatar-height-normalized adjustment data.

## Architecture / authority

- `motion-spec-clip.js` remains canonical generated-clip authority.
- `avatar-motion-intelligence-core.js` remains shared biomechanics math authority.
- `motion-lab-intelligence-adapter.js` remains shared Motion Lab biomechanics adapter.
- `motion-lab-authoring-adapter.js` reuses `solvePhaseContacts()` for authoring endpoint IK; it does not implement another IK solver.
- `motion-lab-pose-editor.js` owns editor UI state and temporary preview-clip patching only.
- Source Motion Specs are not overwritten by the editor.
- Reset All reloads the original Motion Spec through the existing guarded session path.

## Supported V1 authoring targets

Endpoint position + IK:
- left foot
- right foot
- left hand
- right hand

Joint/root editing:
- hips/pelvis
- left/right hip
- left/right knee
- left/right shoulder
- left/right elbow
- spine
- head

## Units

Position controls are presented as 0.25 in, 1 in, or 5 in steps for fast human review. Exported position changes are normalized to `avatar_height` so the saved authoring data is portable across differently sized avatars. Rotation controls export degrees.

## Safety / constraints

- Position mode on endpoint targets routes through the same shared Phase 4 chain/contact validation.
- If the requested endpoint is unreachable or violates chain/contact residual limits, the adjustment fails closed rather than producing a broken pose.
- The authoring adapter suppresses avatar-root translation during endpoint authoring so moving a foot means moving the selected limb target, not sliding the entire body.
- Preview clips are clones; canonical Motion Specs remain unchanged.
- Rest-pose guard and Motion Spec reload remain the reset authority.

## Diagnostics

The canonical copied debug report now includes **MOTION LAB — POSE EDITOR DIAGNOSTICS** with:
- editor availability/version
- active session
- motion ID
- phase
- selected target
- mode/axis
- pending edit count
- whether an adjusted preview clip is active
- latest editor message

Diagnostic UI build becomes `2026-09-08-canonical-diagnostic-v2-pose-editor`.

## Manual acceptance

Primary proof case: stationary left lunge.

1. Load the lunge.
2. Load `start` phase in Pose Editor.
3. Select **Left Foot → Move → X → Medium**.
4. Tap `+` once to request approximately 5 inches farther forward.
5. Confirm the front foot moves while the knee/hip chain follows naturally.
6. Press **Play Adjusted Preview** and inspect the full lunge.
7. Confirm rear heel may lift naturally while rear forefoot/toe remains mechanically coherent.
8. Reset All and confirm the original lunge returns.
9. Repeat with squat/push-up to confirm editor presence does not alter motions unless an edit is explicitly made.

## Verification status

Focused static regression coverage was added in `test/motion-lab-pose-editor.test.js`. Tests were not executed in this connector environment. Do not treat code presence as human visual acceptance.
