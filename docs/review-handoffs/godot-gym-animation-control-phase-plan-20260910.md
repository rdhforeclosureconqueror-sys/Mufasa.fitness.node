# PocketPT Godot Gym — animation control phase plan

Date: 2026-09-10

## Owner-observed baseline

Owner-observed iPhone behavior indicates that the Push-Up Arena launches, the personal avatar appears to download/import/mount, the v1 Godot handshake and diagnostic reporter respond, touch/world control negotiation responds, and GO_TO_MAT visibly moves the avatar. These observations are implementation inputs, not repository-authorized physical-device acceptance. Formal physical-device/human acceptance remains pending until recorded through the required readiness authority. The current owner-observed visible failure is that locomotion translates the character without a walking animation. The current Arena diagnostic report has no live evidence for ANIMATION_IDLE or LOCOMOTION. Camera/MoveNet-to-Godot retargeting remains later work.

This plan deliberately phases the work instead of combining locomotion, exercise playback, Mufasa autonomy, and camera retargeting in one change.

## Repository evidence

The existing Arena handoff already requires MOVE_LEFT / MOVE_RIGHT / MOVE_FORWARD / MOVE_BACKWARD to use the existing character controller and connect idle/walk/strafe to actual movement and the imported rig. The Godot world bridge also identifies idle/walking animation as the next visible task after the personal avatar is mounted.

The web Motion Lab already contains generated/reviewed exercise-animation work including squat and lunge paths. Those are candidates for a later gym animation-control phase; they must not be assumed directly compatible with the runtime Godot skeleton until the avatar animation/skeleton inventory proves the mapping.

## Architecture rule

One animation authority per mounted character.

Player movement, GO_TO_MAT, and later animation buttons must not each manipulate AnimationPlayer/AnimationTree independently. They send intent to one player animation controller. Mufasa gets a separate NPC animation controller.

Every new phase adds first-failure diagnostics. A feature is not considered connected merely because the CharacterBody moves or an animation name exists.

## Phase 0 — inventory before binding

Goal: know exactly what is available before changing presentation.

Inspect the actual Godot source/export inputs and runtime-mounted personal avatar for:

- Skeleton path and bone names.
- AnimationPlayer / AnimationTree nodes.
- Embedded animation libraries and exact clip names.
- Whether idle, walk, run, squat, lunge, or other clips exist on the mounted avatar.
- Whether clips are local/in-place or contain root translation.
- Whether existing web Motion Lab exercise animations require retargeting before Godot playback.
- Mufasa's actual animation library/clip names in the Godot source.

Diagnostic chain:

`AVATAR_MOUNTED -> SKELETON_FOUND -> ANIMATION_LIBRARY_FOUND -> CLIPS_INVENTORIED -> COMPATIBILITY_CLASSIFIED`

First failure must name the first missing boundary and include discovered clip names, but never fabricate a PASS for an animation that was not played.

Acceptance: a copyable inventory report tells us what the mounted player and Mufasa can actually play.

## Phase 1 — player Idle / Walk / Run

Goal: remove gliding.

Create one player locomotion-animation controller. Both manual movement and GO_TO_MAT route movement feed the same velocity/state interface.

State contract:

- zero horizontal velocity -> IDLE
- normal locomotion velocity -> WALK
- run threshold / explicit run intent -> RUN
- STOP -> transition back to IDLE

Do not use animation root motion as world authority in this phase. CharacterBody/navigation remains movement authority; clips visually match velocity. This protects the already-working mat route and arrival threshold.

If the mounted personal avatar does not contain compatible locomotion clips, stop at a truthful compatibility failure and retarget/import a compatible clip in a follow-up implementation rather than silently falling back to glide while reporting PASS.

Diagnostic chain:

`LOCOMOTION_INPUT -> VELOCITY_NONZERO -> CLIP_RESOLVED -> CLIP_PLAY_REQUESTED -> CLIP_PLAYING -> CHARACTER_MOVED`

Also report current state, velocity, requested clip, resolved clip, playback position, and whether movement came from manual control or GO_TO_MAT.

Device acceptance criteria (pending authorized verification):

- standing avatar visibly idles;
- directional control visibly walks instead of glides;
- GO_TO_MAT visibly walks using the same controller;
- STOP returns to idle;
- existing physical mat arrival behavior remains unchanged.

## Phase 2 — Mufasa Idle / Walk / Run + roaming

Goal: make Mufasa alive without coupling him to player controls.

Use a separate NPC state machine:

`IDLE -> WALK -> RUN -> IDLE`

First bind and verify Mufasa's actual existing idle/walk/run clips. Then add bounded navigation targets inside safe gym roaming areas. Mufasa must not interfere with the player's mat route, camera setup, or challenge state.

Diagnostic chain:

`NPC_STATE -> NAV_TARGET -> PATH_AVAILABLE -> CLIP_RESOLVED -> CLIP_PLAYING -> NPC_MOVED`

Acceptance: Mufasa can idle and walk around the gym naturally; run is callable and verified but need not be used constantly during roaming.

## Phase 3 — Gym Animation Control Panel

Goal: give the owner a deliberate test/control surface for animations already connected to the mounted avatar.

Add a compact gym animation control panel separate from the consolidated debug panel. It is an owner/test interaction surface, not a diagnostic authority.

Initial controls should be generated from the verified animation registry rather than hard-coded claims. Target controls:

- Idle
- Walk test
- Run test
- Squat, if compatible/retargeted
- Lunge, if compatible/retargeted
- later: dance, flip, push-up, yoga/exercise demonstrations

Animation actions temporarily override locomotion when appropriate, then return to IDLE. Locomotion and exercise clips must not stack on the same bones accidentally.

Diagnostic chain:

`CONTROL_SELECTED -> ACTION_ALLOWED -> CLIP_RESOLVED -> OVERRIDE_ENTERED -> CLIP_PLAYING -> OVERRIDE_EXITED -> IDLE_RESTORED`

Acceptance: pressing a listed action visibly plays that verified animation once and returns safely to the correct state.

## Phase 4 — shared exercise-animation registry

Goal: bridge reviewed PocketPT/Motion Lab demonstrations into the Godot gym without duplicating animation knowledge.

Define a canonical registry that can map an exercise/action ID to:

- source animation/spec;
- target skeleton compatibility;
- retarget map/version;
- loop/one-shot behavior;
- locomotion override policy;
- diagnostic identity.

Start with already-reviewed motions such as squat; only add lunge after its current Motion Lab result is explicitly accepted for the target avatar. Do not claim that a web THREE.js/generated clip is a Godot-ready animation until converted/retargeted and visually accepted.

## Phase 5 — camera / TensorFlow / MoveNet to Godot

Only after deterministic animation playback is stable, connect body-tracking intent to the Godot avatar. Keep camera inference, pose stabilization, retargeting, and render diagnostics separate so first failure can identify whether TensorFlow detected the user but Godot never received/applied the pose.

This phase is intentionally not part of the locomotion PR.

## Later environment pass

Replace the current fire wall picture with the existing Stepping Into Greatness artwork after locating the canonical repo asset. Do not invent or duplicate the image.

## Non-regression boundaries

Do not change these while implementing Phases 0-3 unless a proven first failure requires it:

- v1 bridge handshake;
- personal avatar download/import/mount;
- GO_TO_MAT protocol/replyTo semantics;
- NavigationAgent target projection and physical mat-arrival threshold;
- camera/MoveNet runtime;
- rep detector/timer/leaderboard;
- consolidated debug authority.

## PR strategy

This planning PR defines the sequence. Implementation should move as small reviewable PRs:

1. Phase 0 inventory + diagnostics.
2. Phase 1 player idle/walk/run.
3. Phase 2 Mufasa locomotion/roaming.
4. Phase 3 animation control panel.
5. Phase 4 shared exercise registry.
6. Phase 5 camera/MoveNet retarget bridge.

Each implementation PR must include its own first-failure diagnostics and device acceptance criteria. Formal readiness evidence for this plan and subsequent implementation phases must be recorded through the repository's canonical readiness workflow before those phases are treated as complete.