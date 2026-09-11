# Godot Gym Locomotion — Phase 0 Execution Contract

Date: 2026-09-11

## Goal

Move the personalized member avatar from the current verified state — mounted in the Godot gym and physically movable through `GO_TO_MAT` — to a truthful runtime inventory of the animation system required for `IDLE -> WALK -> RUN -> STOP -> IDLE`.

This phase does **not** claim that Walk or Run are fixed. It establishes the exact runtime evidence required before binding locomotion.

## Authoritative boundaries

PocketPT / web repository:

`rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Canonical Godot source is currently expected at:

`C:\Users\pftgu\Documents\avlobytest`

Historically this Godot source has been local-only. Verify `git remote -v`; do not invent a remote and do not claim that this GitHub PR directly modifies the canonical local Godot source.

Godot executable:

`C:\Users\pftgu\Desktop\Godot_v4.5.1-stable_win64.exe`

Protected local backup if present:

`export_presets.cfg.before-pocketpt-fix`

Do not add, delete, rename, or overwrite that backup.

## Verified baseline to preserve

The implementation is built around these already-established boundaries:

- personalized Avaturn member avatar loads into the gym;
- GLTF import/mount succeeds;
- the personalized avatar skeleton is usable;
- Gym Compatibility mapping has previously resolved the canonical human joints;
- the personalized avatar can be used by Motion Lab exercise work;
- `GO_TO_MAT` physically moves the player;
- the mat target is projected to the nearest NavMesh point before routing;
- physical horizontal distance to the resolved target remains the arrival authority;
- animation does not own world translation.

Do not redesign the skeleton mapping system in this phase.

## Protected systems

Do not change:

- GO_TO_MAT navigation target projection;
- physical mat-arrival semantics;
- Push-Up Arena rep logic;
- timers or leaderboards;
- MoveNet/TensorFlow;
- Thriller runtime;
- Motion Lab overhead squat;
- Gym Compatibility mapping format;
- saved personalized-avatar mapping format;
- consolidated debug presentation authority;
- Mufasa behavior in this phase.

## Step 1 — local safety checkpoint

Run the repository helper from PowerShell:

```powershell
cd C:\Users\pftgu\Desktop\Mufasa.fitness.node
powershell -ExecutionPolicy Bypass -File .\scripts\godot-locomotion-phase0-checkpoint.ps1
```

The helper is intentionally read-only. It reports:

- current Godot branch;
- current Godot commit;
- worktree status;
- configured remotes or explicit `NO_REMOTE`;
- protected backup presence;
- authoritative source-file presence;
- static animation/navigation references;
- model/animation asset inventory.

It must not run `git add .`, `git reset --hard`, `git clean`, or other destructive repository commands.

## Step 2 — instrument the mounted personalized avatar

Edit the canonical local Godot source only after Step 1 confirms the expected files.

Primary instrumentation location:

`scripts/pocketpt/pocketpt_avatar_loader.gd`

Add the runtime inspection immediately after the signed-in personalized avatar scene has been generated and mounted.

The implementation must recursively inspect the mounted avatar scene and report:

- avatar root node path;
- `Skeleton3D` path;
- full bone count;
- bone names;
- every `AnimationPlayer` path;
- animation library names for each player;
- exact animation names;
- animation duration;
- loop mode / loop flag;
- whether a clip contains authored root translation if that can be determined safely.

Do not fabricate expected clip names.

## Required runtime diagnostic chain

The copyable consolidated diagnostics must expose the earliest boundary failure in this order:

```text
PERSONAL_AVATAR_MOUNTED
-> SKELETON_FOUND
-> BONES_INVENTORIED
-> ANIMATION_PLAYER_FOUND
-> ANIMATION_LIBRARY_FOUND
-> CLIPS_INVENTORIED
-> IDLE_CLIP_RESOLVED
-> WALK_CLIP_RESOLVED
-> RUN_CLIP_RESOLVED
```

If an `AnimationPlayer` exists but contains no compatible locomotion clips, the first failure must be the clip-resolution boundary — not a generic PASS.

A feature is not considered connected merely because an animation name exists.

## Required copyable report

The runtime report should be compact enough to paste into review while containing at minimum:

```text
PERSONAL_AVATAR_MOUNTED: PASS/FAIL
SKELETON_FOUND: PASS/FAIL
BONES_INVENTORIED: PASS/FAIL
ANIMATION_PLAYER_FOUND: PASS/FAIL
ANIMATION_LIBRARY_FOUND: PASS/FAIL
CLIPS_INVENTORIED: PASS/FAIL
IDLE_CLIP_RESOLVED: PASS/FAIL
WALK_CLIP_RESOLVED: PASS/FAIL
RUN_CLIP_RESOLVED: PASS/FAIL

FIRST FAILURE: <earliest failed boundary>

AVATAR ROOT: <path>
SKELETON: <path>
BONE COUNT: <n>

ANIMATION PLAYER: <path>
LIBRARY: <name>
CLIP: <name> | duration=<seconds> | loop=<true/false or mode>
...
```

The report may include multiple AnimationPlayers/libraries when present.

## Decision gate after runtime inventory

### Gate A — compatible Idle / Walk / Run exist

Proceed to Phase 1 locomotion binding.

Create one player animation authority with states:

- `IDLE`
- `WALK`
- `RUN`
- `ACTION_OVERRIDE`

Both manual movement and `GO_TO_MAT` feed the same controller through final horizontal velocity.

World translation remains owned by `CharacterBody3D` / `NavigationAgent3D`.

Do not use animation root motion for player translation in Phase 1.

### Gate B — locomotion clips are missing or incompatible

Stop truthfully at the exact failed clip boundary.

Do not silently substitute the default development avatar and do not report Walk fixed.

The next PR must import/retarget compatible in-place locomotion clips through the already-proven personalized-avatar compatibility boundary.

## Phase 1 acceptance contract reserved by this phase

Once the inventory gate passes, the implementation PR must prove:

1. stand still -> visible Idle;
2. move forward -> visible Walk;
3. move backward -> visible Walk;
4. move left/right -> visible Walk;
5. `GO_TO_MAT` -> physical movement plus visible Walk;
6. mat arrival -> Idle;
7. STOP -> Idle;
8. no visual glide while the character is physically moving;
9. walking into a collision does not continue a false locomotion state if actual horizontal displacement is zero;
10. existing mat-arrival behavior remains unchanged;
11. explicit run intent / threshold produces Run;
12. reduced speed returns Run -> Walk;
13. stopped speed returns Run -> Idle.

## Required Phase 1 first-failure chain

```text
LOCOMOTION_INPUT
-> VELOCITY_RESOLVED
-> PERSONAL_AVATAR_RESOLVED
-> MAPPING_PROFILE_RESOLVED
-> ANIMATION_PLAYER_RESOLVED
-> CLIP_RESOLVED
-> RETARGET_BOUND
-> CLIP_PLAY_REQUESTED
-> CLIP_PLAYING
-> CHARACTER_MOVED
```

Report requested movement action, movement vector, final velocity, speed magnitude, current locomotion state, requested animation, resolved animation, AnimationPlayer path, playback state, previous state, CharacterBody position before/after, and the earliest failing boundary.

## Mufasa sequencing

Mufasa remains the next independent phase only after player Walk/Run is stable.

Mufasa must have a separate NPC animation/navigation authority and must not share the player locomotion controller.

Planned sequence:

`IDLE -> ALERT -> CHASE -> YIELD -> CIRCLE`

Known clip names remain implementation inputs to verify against the actual scene before binding; do not make Mufasa part of this Phase 0 change.

## Delivery required from the local Godot implementation pass

Return with:

1. exact Godot branch/commit/worktree state;
2. personalized-avatar runtime animation inventory;
3. exact FIRST FAILURE;
4. files changed locally;
5. Idle availability result;
6. Walk availability result;
7. Run availability result;
8. GO_TO_MAT non-regression result if any runtime code was touched;
9. manual-control chain status;
10. copyable diagnostics output;
11. recommendation for the Phase 1 implementation PR.

Primary milestone after this phase:

**Know exactly what the mounted personalized avatar can play so the next implementation binds Walk/Run without guessing or regressing navigation.**
