# MIRROR MOTION INTELLIGENCE — PHASE 18 REVIEW HANDOFF

## Purpose
Activate bounded vertical root assistance during trusted standing-to-floor / floor-to-standing transitions while preserving live pose tracking as the primary authority.

## Base
Current main at branch creation: `bebeb7d445510c7a3fb945ac4a136c3a562d68e3`, containing hardened Phase 17 from PRs #673 and #674.

## Live order
Phase 12 now loads Phase 17 then Phase 18 after the existing Phase 13–16 chain.

## Inputs
Phase 18 consumes only Phase 17 `floorTransitionIntent` metadata. Phase 17 remains the transition-state authority.

## Authority contract
- live MoveNet / normalized pose remains primary;
- Phase 17 classifies transition state only;
- existing Avaturn solver remains the single root/retarget authority;
- Phase 18 may add only bounded root-Y assistance after the existing solver pass;
- no second IK solver, retargeter, camera, exercise authority, or measured Z-depth.

## Assist behavior
- minimum Phase 17 confidence: 0.60;
- assistance only while a transition is active and in an intermediate phase;
- no assistance at STANDING or PLANK_STABLE endpoints;
- guide descent is capped at 0.34 root units;
- only 35% of the gap between live root-Y and guide root-Y is applied;
- per-frame assist is capped at ±0.10 root units;
- measured-depth claims and non-live-pose authority claims are rejected;
- tracker/person reset and solver replacement clear assist state.

## Why this is bounded
The neutral stand-to-plank profile is reference mechanics, not choreography. Phase 18 must help only when live 2D tracking becomes unstable during the transition. It must never drag a correctly tracked member through a canned animation.

## Diagnostics
Phase 18 debug reports patch/bind state, applications, bypasses, transition phase/direction/confidence, observed root Y, guide root Y, applied assist Y, resets, errors, first failure, live-pose authority, root authority scope, and explicit no-depth authority.

## Required review
Run `node --test test/mirror-motion-phase17.test.js test/mirror-motion-phase18.test.js` plus focused Phase 4–16 tests and the full suite.

Manual acceptance:
1. slow standing-to-plank;
2. fast drop-to-plank;
3. pause at hinge/crouch/hands-down;
4. reverse plank-to-standing;
5. simple forward bend that never becomes a floor transition;
6. low-confidence wrist/ankle frames;
7. tracker loss/reacquisition;
8. exercise change away from push-up;
9. verify no snap at STANDING or PLANK_STABLE;
10. verify calibration voice/base-position flow still reaches READY.

Return GO or CHANGES REQUIRED with exact evidence. Do not merge without owner approval.