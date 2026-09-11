# Godot Phase 2 — Mufasa NPC locomotion

## Goal
After the personalized player locomotion gate, implement Mufasa as a separate NPC authority:

`IDLE -> ALERT -> CHASE -> YIELD -> CIRCLE`

The player controller and Mufasa controller must remain independent.

## Known Mufasa animation inventory
Use only clips that are actually present in the current Mufasa asset. Historically observed names:
- `Mufasa_Idle_01`
- `Mufasa_Idle_02`
- `Mufasa_Idle_03`
- `Mufasa_Walk`
- `Mufasa_Run`

These names are historical evidence, not permission to fabricate runtime success. Inventory the live `AnimationPlayer` and stop at the exact first missing boundary.

## State contract
### IDLE
- NPC stationary.
- One verified idle clip loops.
- No navigation target is active.

### ALERT
- Resolve the personalized player node and world position.
- Orient Mufasa toward the player.
- Transition to CHASE only after a valid player target and reachable navigation target are resolved.

### CHASE
- Target the personalized player world position.
- Project target to the NavMesh when needed.
- `NavigationAgent3D`/physical NPC movement owns world translation.
- `Mufasa_Run` is visual locomotion only; no animation-root world translation.
- Refresh the chase target as the player moves.

### YIELD
Expose a callable/event boundary named `MUFASA_YIELD` (or an equivalent Godot signal/method whose external contract is documented as `MUFASA_YIELD`).

On yield:
- cancel pursuit target;
- decelerate/stop physical NPC movement;
- leave Run;
- face the player;
- enter a stable yielded state before CIRCLE starts.

Voice recognition is out of scope for this PR. The future phrase is: `Mufasa, yield.`

### CIRCLE
Circle is navigation behavior, not a baked animation.

At runtime:
1. use the current personalized-player world position as the circle center;
2. choose a safe fixed radius for v1;
3. advance a clockwise angle;
4. compute the next point around the player;
5. project that point to reachable NavMesh;
6. walk to it using `Mufasa_Walk`;
7. keep spacing safe and recalculate if the player moves.

Conceptually:

```text
center = player.global_position
next = center + Vector3(cos(angle), 0, sin(angle)) * radius
resolved = NavigationServer3D.map_get_closest_point(nav_map, next)
navigation_agent.target_position = resolved
```

Do not hard-code one world-space orbit around the gym. The circle must follow the player.

## First-failure pipeline
Every test run must make the earliest broken boundary obvious:

`NPC_STATE -> MUFASA_NODE_RESOLVED -> ANIMATION_PLAYER_RESOLVED -> CLIP_RESOLVED -> PLAYER_TARGET_RESOLVED -> NAV_TARGET_RESOLVED -> PATH_AVAILABLE -> CLIP_PLAY_REQUESTED -> CLIP_PLAYING -> NPC_MOVED`

For CIRCLE also report:
- circle center;
- radius;
- current angle;
- next raw waypoint;
- resolved waypoint;
- distance to player.

For YIELD also report:
- yield event received;
- chase target cleared;
- velocity before/after;
- state before/after;
- active clip before/after.

`FIRST FAILURE` is the earliest failed boundary, never a later symptom.

## Acceptance
### Idle / alert
1. Mufasa spawns at the current scene-authored location.
2. Verified idle visibly plays.
3. Player entry resolves the personalized player, not an old/default avatar.
4. Mufasa turns/alerts toward the player without teleporting.

### Chase
1. Mufasa transitions to CHASE.
2. `Mufasa_Run` visibly plays.
3. NPC physically approaches the moving personalized player.
4. Pathing remains on reachable NavMesh.
5. No double displacement from animation root motion.

### Yield
1. Trigger `MUFASA_YIELD` during chase.
2. Pursuit stops promptly.
3. Run exits.
4. Mufasa remains near the player and faces them.
5. No stale chase target reactivates movement.

### Circle
1. After yield, start CIRCLE.
2. Mufasa walks, not runs, around the player.
3. The orbit center follows the player's current position.
4. Waypoints remain reachable.
5. Safe radius is maintained within tolerance.
6. If player moves, the circle recenters rather than orbiting an old point.

## Protected systems
Do not modify:
- player locomotion authority from Phase 1;
- player GO_TO_MAT projection or arrival rules;
- personalized-avatar skeleton/mapping system;
- MoveNet/TensorFlow;
- Push-Up Arena rep/timer/leaderboard;
- Thriller;
- Motion Lab overhead squat;
- consolidated debug-panel ownership.

## Repository boundary
Canonical Godot runtime source is still expected locally at:
`C:\Users\pftgu\Documents\avlobytest`

This web-repo PR defines and verifies the implementation contract. It does not by itself prove that the local Godot runtime has been changed or accepted.

## Delivery report
Return:
1. exact local branch/commit/worktree state;
2. Mufasa scene/node path;
3. live animation inventory;
4. exact FIRST FAILURE;
5. IDLE result;
6. ALERT result;
7. CHASE result;
8. YIELD result;
9. CIRCLE result;
10. player-locomotion regression result;
11. GO_TO_MAT regression result;
12. copyable debug-panel output.