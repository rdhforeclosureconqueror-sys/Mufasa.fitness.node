# PocketPT Godot Gym — personalized avatar animation phase plan

Date: 2026-09-10

## Product authority

The signed-in member's **personalized PocketPT avatar is the primary playable/animated human in the gym**. The older/default Godot avatar is not the animation target for this work. Keep it in the project without deleting it; it can later become a bodyguard/NPC or another character.

Mufasa is the second primary animated character and gets a separate NPC controller.

The system must therefore be avatar-agnostic: animations are authored/tested against a canonical human skeleton contract and retargeted to the currently mounted personalized avatar rather than being permanently baked to one development avatar.

## Owner-observed baseline

Owner-observed iPhone behavior indicates that the Push-Up Arena launches, the personalized avatar appears to download/import/mount, the v1 Godot handshake and diagnostic reporter respond, touch/world control negotiation responds, and GO_TO_MAT visibly moves the personalized avatar. The current visible failure is that locomotion translates the character without a walking animation. The current Arena diagnostic report has no live evidence for ANIMATION_IDLE or LOCOMOTION. Camera/MoveNet-to-Godot retargeting remains later work.

## Existing system direction

The Arena handoff already requires movement commands to use the existing character controller and connect idle/walk/strafe to the imported rig. The Godot world bridge identifies idle/walking animation as the next visible task after the personalized avatar is mounted.

PocketPT Motion Lab already has generated/reviewed exercise-animation work including squat and lunge paths. Motion Lab should become the preparation/validation station for gym animations: inspect skeletons, map bones to canonical joints, preview/adjust motion, validate compatibility, and export/version the mapping/animation data used by the gym.

## Core architecture

### Personalized Avatar Runtime

At gym entry:

1. Load the signed-in member's personalized GLB.
2. Discover its Skeleton3D/bones and any embedded animation tracks.
3. Disable/avoid unintended embedded tracks that would stack with PocketPT motion.
4. Map actual bone names to PocketPT canonical joints.
5. Resolve compatible animation actions through a versioned animation registry.
6. Bind one animation authority to the mounted personalized avatar.

Never assume all personalized avatars use identical bone names.

### Motion Lab as the animation preparation station

Motion Lab needs an explicit **Gym Compatibility / Bone Mapping** workflow. For a selected personalized avatar and motion it should show:

- actual skeleton/bone inventory;
- canonical joint target for each required bone;
- mapped / unmapped / ambiguous state;
- rest-pose compatibility;
- embedded animation tracks and whether they are disabled for custom motion;
- preview of the retargeted motion on that avatar;
- save/version mapping;
- export/publish action to the gym animation registry only after validation.

The owner must be able to correct a mapping in the lab rather than changing Godot code for every avatar.

### One animation authority per character

Player movement, GO_TO_MAT, animation-control buttons, and later body tracking send intent to one personalized-avatar animation controller. They must not independently manipulate the skeleton.

Mufasa uses a separate NPC animation controller.

The retained default Godot avatar is outside this player animation authority until it receives a future NPC role.

## Phase 0 — personalized avatar compatibility inventory + diagnostics

Goal: prove the currently mounted personalized avatar can be driven by the canonical animation system.

Inspect/report:

- personalized avatar descriptor/version;
- Skeleton3D path;
- actual bone names;
- canonical bone-map coverage;
- embedded AnimationPlayer/AnimationTree/libraries;
- exact embedded clip names;
- rest-pose compatibility;
- whether idle/walk/run/squat/lunge exist natively or require retargeting;
- whether any embedded tracks must be disabled to prevent stacking;
- Mufasa's independent clip inventory.

Diagnostic chain:

`PERSONAL_AVATAR_MOUNTED -> SKELETON_FOUND -> BONES_INVENTORIED -> CANONICAL_MAP_RESOLVED -> REST_POSE_VALID -> EMBEDDED_TRACKS_CLASSIFIED -> ANIMATION_LIBRARY_RESOLVED -> COMPATIBILITY_CLASSIFIED`

FIRST FAILURE must name the first missing boundary, first failing/unmapped bone when applicable, and discovered clip names. Never fabricate animation PASS from character translation.

## Phase 1 — Motion Lab Gym Compatibility / Bone Mapping

Goal: make mapping/retarget preparation an owner-operable PocketPT workflow.

Add a Motion Lab mode/panel that can load the personalized avatar, inspect its skeleton, auto-map known bone aliases, expose unresolved/ambiguous mappings for correction, preview a canonical motion, and save a versioned mapping profile.

Initial canonical motion targets:

- idle;
- walk;
- run;
- squat;
- lunge.

The lab should reuse existing PocketPT motion intelligence/pose tooling rather than create a second biomechanics authority.

Diagnostic chain:

`AVATAR_LOADED -> SKELETON_PARSED -> AUTO_MAP_COMPLETE -> REQUIRED_JOINTS_MAPPED -> REST_POSE_NORMALIZED -> MOTION_SOURCE_READY -> RETARGET_PREVIEW_READY -> PREVIEW_PLAYING -> PROFILE_SAVABLE`

Copyable diagnostics must include FIRST FAILURE and mapping coverage. A failed or ambiguous required joint blocks publishing that motion to the gym.

## Phase 2 — player Idle / Walk / Run in Godot

Goal: remove gliding on the personalized avatar.

Use the saved canonical mapping/profile to bind compatible locomotion to whichever personalized avatar is mounted.

State contract:

- zero horizontal velocity -> IDLE;
- normal locomotion velocity -> WALK;
- run threshold / explicit run intent -> RUN;
- STOP -> IDLE.

CharacterBody/navigation remains world-movement authority. Locomotion clips visually follow actual velocity; do not change the already-working GO_TO_MAT arrival rules.

Both manual movement and GO_TO_MAT must use the same locomotion-animation controller.

Diagnostic chain:

`LOCOMOTION_INPUT -> VELOCITY_RESOLVED -> PROFILE_RESOLVED -> CLIP_RESOLVED -> RETARGET_BOUND -> CLIP_PLAY_REQUESTED -> CLIP_PLAYING -> CHARACTER_MOVED`

Phone acceptance criteria:

- personalized avatar visibly idles;
- directional movement visibly walks instead of glides;
- GO_TO_MAT visibly walks using the same controller;
- run visibly uses RUN when requested/threshold reached;
- STOP returns to idle;
- mat arrival remains physically correct.

## Phase 3 — Mufasa Idle / Walk / Run + roaming

Goal: make Mufasa alive without coupling him to player controls.

Mufasa uses his own verified clip library and NPC state machine:

`IDLE -> WALK -> RUN -> IDLE`

After binding the clips, add bounded navigation targets inside safe gym roaming areas. Mufasa must not interfere with the personalized avatar's mat route, camera setup, or challenge state.

Diagnostic chain:

`NPC_STATE -> NAV_TARGET -> PATH_AVAILABLE -> CLIP_RESOLVED -> CLIP_PLAYING -> NPC_MOVED`

## Phase 4 — Gym Animation Control Panel

Goal: let the owner trigger verified actions on the mounted personalized avatar.

Add a compact gym animation control panel separate from the consolidated debug panel. The control panel reads the verified animation registry/profile for the currently mounted avatar; it does not hard-code false availability.

Target controls:

- Idle;
- Walk test;
- Run test;
- Squat when published/compatible;
- Lunge when published/compatible;
- later dance, flip, push-up, yoga/exercise demonstrations.

One-shot exercise actions temporarily override locomotion, then safely restore IDLE. Locomotion/exercise clips must never stack accidentally on the same bones.

Diagnostic chain:

`CONTROL_SELECTED -> ACTION_AVAILABLE_FOR_AVATAR -> PROFILE_RESOLVED -> CLIP_RESOLVED -> OVERRIDE_ENTERED -> CLIP_PLAYING -> OVERRIDE_EXITED -> IDLE_RESTORED`

## Phase 5 — shared gym animation registry

Define a canonical registry mapping action/exercise IDs to:

- source motion/spec;
- canonical skeleton requirements;
- personalized-avatar mapping profile/version;
- retarget data/version;
- loop/one-shot behavior;
- locomotion override policy;
- diagnostic identity;
- validation/publish status.

This makes animations portable across personalized avatars rather than tied to the old development avatar.

## Phase 6 — camera / TensorFlow / MoveNet to personalized Godot avatar

Only after deterministic animation playback is stable, connect body tracking through the same canonical mapping layer. Keep camera inference, pose stabilization, canonical pose, retarget, Godot receipt, skeleton application, and render evidence separate so FIRST FAILURE can identify the exact boundary.

## Later character/environment work

- Keep the old/default Godot avatar in the project. Do not delete it. It can later become the bodyguard or another NPC.
- Replace the current fire wall picture with the existing Stepping Into Greatness artwork after locating the canonical repo asset.

## Non-regression boundaries

Do not change these unless a proven FIRST FAILURE requires it:

- v1 bridge handshake;
- personalized avatar download/import/mount;
- GO_TO_MAT protocol/replyTo semantics;
- NavigationAgent target projection and physical mat-arrival threshold;
- camera/MoveNet runtime during the earlier animation phases;
- rep detector/timer/leaderboard;
- consolidated debug authority.

## PR strategy

Implement as small reviewable PRs:

1. Personalized avatar compatibility inventory + diagnostics.
2. Motion Lab Gym Compatibility / Bone Mapping workflow.
3. Personalized avatar idle/walk/run in Godot.
4. Mufasa locomotion/roaming.
5. Gym Animation Control Panel.
6. Shared animation registry.
7. Camera/MoveNet retarget bridge.

Every implementation phase must add copyable diagnostics with FIRST FAILURE and must test the personalized-avatar path, not the retained default avatar.