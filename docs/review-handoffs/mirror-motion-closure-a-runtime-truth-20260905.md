# MIRROR MOTION CLOSURE A — RUNTIME TRUTH CONSOLIDATION

## Role
Independent reviewer. Do not merge as part of review. Verify the implementation against current main and return GO or CHANGES REQUIRED.

## Baseline
This branch starts from main after PR #677 merged. The numbered Phase 2–18 foundation and final acceptance gate are already canonical.

## Problem being closed
The conversation harvest found that early modules still write the legacy numeric `mirrorMotionPhase` field (notably Phases 2, 3, and 4). That number describes which early module most recently wrote shared diagnostics; it is not a reliable statement of the complete live build. A consumer could therefore display a stale low phase number even while the Phase 2–18 stack is loaded.

## Implementation
`public/mirror-motion-acceptance.js` remains the read-only final acceptance authority. It now publishes a canonical high-level foundation status after every evaluation:

- `mirrorMotionFoundationStatus`: WAITING / FAIL / READY
- `mirrorMotionFoundationRange`: `2-18`
- `mirrorMotionFoundationStagesLoaded`
- `mirrorMotionFoundationStagesTotal`
- `mirrorMotionFoundationFirstFailingBoundary`
- `mirrorMotionFoundationFirstWaitingBoundary`
- `mirrorMotionFoundationRestPoseStatus`
- `mirrorMotionFoundationRestPoseBoneCount`
- `mirrorMotionLegacyPhaseDiagnostic: true`
- global read-only snapshot `__mirrorMotionFoundationStatus`

The legacy `mirrorMotionPhase` field is deliberately not deleted in this PR. Removing it could break unknown diagnostic consumers. Instead it is explicitly demoted to diagnostic-only status while the acceptance gate becomes canonical build truth.

The acceptance panel now says `Foundation status`, identifies the foundation range/stage count, and explicitly warns that legacy `mirrorMotionPhase` is not build truth.

## Authority invariants
This PR must add NO camera, MoveNet, IK, retargeter, root translation, contact, exercise-state, F-curve, animation, or measured-depth authority. It is diagnostics/status only.

## Required review
1. Search current repo for every executable writer and reader of `mirrorMotionPhase`.
2. Confirm no consumer requires the numeric field to be deleted or incremented to 18.
3. Confirm acceptance evaluation remains earliest-failure-first across Phases 2–18.
4. Confirm WAITING is published when a stage/runtime/rest pose is unavailable.
5. Confirm FAIL is published for a real phase failure.
6. Confirm READY requires all 17 stages, AvatarRuntime, and protected rest evidence.
7. Confirm a stale `mirrorMotionPhase: 3` can coexist with canonical `mirrorMotionFoundationStatus: READY` without ambiguity in the acceptance panel/API.
8. Run `node --test test/mirror-motion-acceptance.test.js` and the full repository suite.

## GO criteria
GO only if the new foundation fields are the unambiguous canonical high-level truth and no live behavior authority changed.

## Next closure step
After Closure A is independently accepted, begin Closure B: review-first camera-motion discrimination. Do not activate camera-derived correction in this PR.