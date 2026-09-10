# Phase 4 — Body-Surface Support Solver v1

## Goal
Advance the Yoga Motion Generator beyond endpoint-only support. Cobra and Bridge must no longer treat pelvis/back/head/upper-arm floor support as deferred metadata.

## Important correction discovered in this phase
The Phase-2 floor archetypes still used the generic standing start/finish. That directly contradicts the approved Yoga descriptions:
- Cobra starts/returns prone.
- Bridge starts/returns supine with knees bent.

This PR fixes those floor setups before applying surface constraints.

## Engine model
There are now two support classes:

1. **Anchored point / chain contacts**
   - feet
   - hands
   - Bridge upper-back anchor
   These use the existing generated IK/contact solver.

2. **Body-surface support planes**
   - Cobra pelvis and proximal legs
   - Bridge head and upper arms
   These are checked against the world-Y support plane established by the floor start phase.

The compiler fails closed with `motion_surface_support_drift` / `SURFACE_SUPPORT_DRIFT` if a declared body surface leaves that support plane beyond tolerance after generated contact/IK solving.

## Cobra contract
- start: prone setup, not standing
- hands: anchored from start through target/hold/finish
- pelvis, left proximal leg, right proximal leg: support-plane constraints anchored from prone start
- target: chest/spine extends while pelvis/legs remain supported
- finish: returns to the same prone setup, not standing

## Bridge contract
- start: supine bent-knee setup, not standing
- feet: anchored from start
- upper back: promoted to an anchored generated trunk chain (`Hips -> Spine -> Spine2`)
- head + both upper arms: support-plane residual checks
- target: pelvis root travels upward while upper-back support is retained
- finish: returns to the same supine setup

## First-failure order
1. description resolved
2. generation plan resolved
3. support classification
4. endpoint/anchored surface mapping
5. floor start phase
6. anchor capture
7. generated chain solve
8. endpoint contact residual
9. body-surface support residual
10. compile/bind
11. Play enabled
12. human visual acceptance

## Fail closed conditions
- unknown support -> `SUPPORT_OPERATOR_UNSUPPORTED`
- missing surface anchor phase -> `motion_surface_anchor_phase_missing`
- unresolved surface bone -> `motion_surface_support_unresolved`
- surface leaves support plane -> `motion_surface_support_drift` with first boundary `SURFACE_SUPPORT_DRIFT`

## Review commands
```bash
node --test test/motion-support-operator-policy.test.js
node --test test/motion-description-to-spec-generator.test.js
```
Also run existing Motion Spec compiler, generated IK, Coach Avatar, Yoga intake, lifecycle and playback regressions.

## Manual Motion Lab acceptance
### Cobra
1. Yoga -> Beginner Full-Body Flow -> Cobra -> Motion Animation.
2. Create Motion Draft.
3. Coach begins prone rather than standing.
4. Hands remain planted.
5. Pelvis and legs remain visually supported as chest rises.
6. Chest rises through spinal extension rather than lifting the entire body as one rigid object.
7. Hold is stable.
8. Exit returns to prone setup, not standing.

### Bridge
1. Yoga -> Beginner Full-Body Flow -> Bridge -> Motion Animation.
2. Create Motion Draft.
3. Coach begins supine with knees bent rather than standing.
4. Feet remain planted.
5. Upper back remains supported while pelvis rises.
6. Head and upper arms remain on the mat plane.
7. Pelvis visibly elevates; solver must not cancel the lift.
8. Hold is stable.
9. Exit returns pelvis to mat while remaining supine.

## Review risk
The Bridge upper-back support reuses the existing two-bone generated-chain solver on a trunk chain. Review carefully for unreachable-chain or chain residual behavior. If the trunk chain proves mechanically unsuitable, do not weaken residual validation; split trunk support into a dedicated multi-segment solver in the next correction.

The surface-plane check is intentionally one-dimensional (world Y). It prevents floating away from the mat plane but does not claim collision meshes, pressure distribution, friction, or full rigid-body floor physics.

## Acceptance
READY only if automated regressions pass and the runtime compiles both Cobra and Bridge without contact/surface residual failure. Human visual naturalness remains owner-controlled.

## Readiness
Use `npm run readiness:update -- ...` and `npm run readiness:validate`. Do not hand-edit readiness or OPS JSON.
