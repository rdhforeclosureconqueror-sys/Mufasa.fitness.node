# Godot Phase 1 — Personalized Avatar Locomotion Controller

Date: 2026-09-11

## Primary milestone
Make the signed-in personalized member avatar visibly perform:

`IDLE -> WALK -> RUN -> STOP -> IDLE`

inside the canonical Godot gym while preserving existing physical movement, NavMesh behavior, GO_TO_MAT arrival semantics, personalized-avatar mapping, Motion Lab, Push-Up Arena, Thriller, and debug-panel consolidation.

Canonical Godot source remains local unless independently verified otherwise:

`C:\Users\pftgu\Documents\avlobytest`

This GitHub PR is an execution/verification handoff. It must not be described as proof that the local Godot runtime was modified until the local implementation is actually applied and tested.

## Preconditions
Use the Phase 0 checkpoint from PR #793 first. Do not fabricate clip names.

Required evidence before binding animation:

`PERSONAL_AVATAR_MOUNTED -> SKELETON_FOUND -> BONES_INVENTORIED -> ANIMATION_PLAYER_FOUND -> ANIMATION_LIBRARY_FOUND -> CLIPS_INVENTORIED`

Resolve exact compatible locomotion clips from that runtime inventory:

- Idle
- Walk
- Run

If any required clip is absent or incompatible, stop at the exact first failure and move to the retarget/import path. Do not substitute the old/default development avatar and do not redesign the 20/20 skeleton mapping system.

## One locomotion authority
There must be exactly one player locomotion-state authority for animation selection.

Inputs may come from:

- keyboard
- phone controls
- GO_TO_MAT navigation
- later MoveNet

But all movement sources must converge before animation selection.

Required flow:

```text
Movement Sources
  -> CharacterBody3D / NavigationAgent3D intent
  -> move_and_slide / collision resolution
  -> FINAL HORIZONTAL VELOCITY
  -> Player Locomotion Controller
  -> IDLE / WALK / RUN / ACTION_OVERRIDE
  -> Personalized Avatar AnimationPlayer
```

Do not create a separate GO_TO_MAT animation controller.
Do not create a separate manual-movement animation controller.
Do not let animation root motion own world translation in this phase.

## State model

```gdscript
enum LocomotionState {
    IDLE,
    WALK,
    RUN,
    ACTION_OVERRIDE,
}
```

### IDLE
Use when actual post-collision horizontal speed is approximately zero.

### WALK
Use when actual post-collision horizontal speed is above idle epsilon and below the run threshold.

### RUN
Use when actual post-collision horizontal speed reaches the run threshold, or when explicit run intent is active and movement is actually occurring.

### ACTION_OVERRIDE
Reserved for exercise/action animation ownership. Locomotion must not fight an active exercise animation.

## Critical rule — animation follows real motion
Do not choose Walk merely because an input button is held.

After physical movement resolution, derive:

```gdscript
var horizontal_velocity := Vector2(velocity.x, velocity.z)
var actual_speed := horizontal_velocity.length()
```

Use `actual_speed` for the locomotion state decision.

Example: if the player pushes into a wall and CharacterBody3D does not move, the avatar must not continue walking in place due only to input intent.

If the current movement architecture provides a more authoritative post-collision displacement measurement, use it, but preserve the rule that visible locomotion state reflects actual physical movement rather than raw input alone.

## Suggested thresholds
Threshold values may be tuned to the existing player speeds, but centralize them in one controller.

Example contract:

```gdscript
@export var idle_speed_epsilon := 0.05
@export var run_speed_threshold := 4.5
```

Do not scatter magic thresholds across keyboard, phone, and navigation paths.

## Clip resolution
Use exact clip names discovered by Phase 0. Resolve once after personalized-avatar mount and cache the result.

Required diagnostic states:

```text
IDLE_CLIP_RESOLVED     PASS/FAIL
WALK_CLIP_RESOLVED     PASS/FAIL
RUN_CLIP_RESOLVED      PASS/FAIL
```

Never silently fall back from Walk to Idle or from Run to Walk and report success. If a clip is unavailable, report the first failing boundary.

## Animation ownership
Only one player animation owner should write locomotion at a time.

Before implementation, inventory and disable or reconcile any competing player bone/animation writers, including:

- old/default avatar animation logic
- embedded AnimationTree state machines
- duplicate AnimationPlayer playback calls
- action/demo systems that remain active outside ACTION_OVERRIDE

Do not delete legacy systems merely because they exist. First prove whether they currently write to the personalized player's skeleton.

## In-place locomotion
Preferred locomotion clips are in-place.

CharacterBody3D / NavigationAgent3D remain world-position authority.

Audit animation root tracks. If a locomotion clip translates the avatar root or hips through world space, remove/disable that translation for this phase or use an equivalent in-place version. Avoid double displacement.

## Manual movement
Keyboard/phone manual movement must use existing physical movement authority.

Required proof chain:

`LOCOMOTION_INPUT -> VELOCITY_RESOLVED -> CHARACTER_MOVED -> LOCOMOTION_STATE_RESOLVED -> CLIP_RESOLVED -> CLIP_PLAY_REQUESTED -> CLIP_PLAYING`

Required behavior:

- forward movement -> Walk
- backward movement -> Walk
- left movement -> Walk
- right movement -> Walk
- zero actual movement -> Idle
- explicit run with actual movement -> Run
- release/STOP -> Idle

## GO_TO_MAT integration
GO_TO_MAT is already the strongest physical movement proof and must become a locomotion-animation client, not a separate animation system.

While route is physically moving the player:

`actual_speed > idle epsilon -> WALK`

At resolved reachable target:

`actual_speed ~= 0 -> IDLE`

### Protected navigation behavior
Do not change the existing nearest-NavMesh target projection contract.

Expected concept:

```gdscript
var navigation_map := navigation_agent.get_navigation_map()
var resolved_target := NavigationServer3D.map_get_closest_point(navigation_map, target)
_route_target = resolved_target
navigation_agent.target_position = resolved_target
_route_active = true
```

Arrival remains based on physical horizontal distance to the resolved reachable target, approximately `<= 0.35 m` unless the current verified implementation uses an equivalent tested value.

Do not restore `NavigationAgent3D.is_navigation_finished()` as the AT_MAT authority.

## Transition rules
Avoid replaying the same clip every physics frame.

Concept:

```gdscript
func request_locomotion_state(next_state: LocomotionState) -> void:
    if next_state == current_state:
        return
    previous_state = current_state
    current_state = next_state
    _play_resolved_clip_for_state(next_state)
```

Transitions must be observable in diagnostics.

## Copyable debug panel
The gym debug panel must expose one consolidated locomotion section. Do not create another competing debug panel.

Required fields:

```text
LOCOMOTION INPUT:
MOVEMENT VECTOR:
VELOCITY:
HORIZONTAL SPEED:
LOCOMOTION STATE:
PREVIOUS STATE:
REQUESTED CLIP:
RESOLVED CLIP:
ANIMATION PLAYER:
ANIMATION PLAYING:
ACTION OVERRIDE:
POSITION BEFORE:
POSITION AFTER:
GO_TO_MAT ACTIVE:
FIRST FAILURE:
```

First failure pipeline:

`LOCOMOTION_INPUT -> VELOCITY_RESOLVED -> PERSONAL_AVATAR_RESOLVED -> MAPPING_PROFILE_RESOLVED -> ANIMATION_PLAYER_RESOLVED -> CLIP_RESOLVED -> RETARGET_BOUND -> CLIP_PLAY_REQUESTED -> CLIP_PLAYING -> CHARACTER_MOVED`

`FIRST FAILURE` must identify the earliest broken boundary, not merely dump numbers.

## Walk acceptance
1. personalized avatar loads;
2. standing -> Idle visibly plays;
3. forward -> Walk visibly plays;
4. backward -> Walk visibly plays;
5. left/right -> Walk visibly plays;
6. GO_TO_MAT -> physical movement + Walk;
7. arrival -> Idle;
8. STOP -> Idle;
9. no gliding while physically walking;
10. mat arrival remains correct.

## Run acceptance
1. explicit run threshold/intent exists;
2. WALK -> RUN cleanly;
3. RUN -> WALK when speed decreases;
4. RUN -> IDLE when stopped;
5. direction/navigation stays CharacterBody3D-controlled;
6. animation never independently drags the player through the gym.

Run proof chain:

`RUN_INTENT -> RUN_SPEED_RESOLVED -> RUN_CLIP_RESOLVED -> RUN_PLAYING -> CHARACTER_MOVED`

## Required local delivery report
The implementation owner must return:

1. exact local Godot branch/commit/worktree state;
2. exact Idle/Walk/Run clip names and AnimationPlayer path;
3. files changed;
4. any competing animation authority discovered;
5. first failure before fix;
6. final locomotion state-machine design;
7. Idle result;
8. Walk result;
9. Run result;
10. manual movement result;
11. GO_TO_MAT regression result;
12. root-motion audit result;
13. consolidated debug-panel output;
14. exact human acceptance steps.

## Out of scope
Do not implement Mufasa in this phase.
Do not alter MoveNet/TensorFlow.
Do not alter Push-Up Arena rep/timer/leaderboard logic.
Do not alter Thriller.
Do not alter Motion Lab overhead squat.
Do not redesign personalized-avatar mapping.
Do not substitute the old/default avatar as the player.

## Next phase
After Walk and Run pass with the personalized player, create the Mufasa NPC locomotion PR:

`IDLE -> ALERT -> CHASE -> YIELD -> CIRCLE`

Mufasa must use a separate NPC controller and separate animation/navigation authority.