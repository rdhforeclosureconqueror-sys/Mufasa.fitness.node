# MIRROR MOTION INTELLIGENCE — PHASE 16 REVIEW HANDOFF

## Purpose
Activate the reviewed Phase 15 root/contact conflict signal at the existing Avaturn root boundary with bounded authority.

## Base
Phase 15 reviewed head: `054ebf3e8c6edfc1294d1f9b52b94732741e0ec8`.

Current main already contains Phase 14 plus the calibration voice ownership repair. Separate PR #670 carries the exact three reviewed Phase 15 files to current main.

## Live order
Phase 12 now loads:

`Phase 13 lateral intent -> Phase 14 lateral root activation -> Phase 15 contact-conflict analysis -> Phase 16 bounded contact compensation`

The existing Avaturn solver remains the single root/retarget authority. Phase 16 patches that existing observe path after Phase 14, so Phase 14 applies intended lateral root movement first and Phase 16 may then apply a smaller opposing compensation only when Phase 15 reports planted-contact conflict.

## Authority contract
- Phase 4 owns planted-contact creation/release.
- Phase 5 owns IK.
- Phase 14 owns lateral root translation.
- Phase 15 owns conflict analysis only.
- Phase 16 owns bounded compensation only.
- No second MoveNet detector, camera loop, IK solver, retargeter, or exercise authority.
- Measured depth authority remains NO.

## Activation behavior
Default compensation gain is 0.60 and maximum applied correction is 0.14 root units.

A correction requires:
1. Phase 15 `contactCompensation.active === true`;
2. at least one planted anchor;
3. finite root-X intent;
4. the canonical live solver being in ACTIVE full-body calibration.

No planted contacts => zero correction.
Deliberate stepping must remain governed by Phase 4 anchor release; Phase 16 must not glue the member to the previous contact position.

## Lifecycle
Phase 2 tracker/person reset clears Phase 16 state and resets Phase 15 analysis state. Solver replacement also clears local compensation state.

## Diagnostics
Phase 16 exposes renderer/solver patch state, frames, applications, bypasses, requested root X, applied root-X correction, planted contacts, exercise/phase, context resets, process errors, first failing boundary, bounded root authority, and explicit no-depth authority.

Phase 12 startup audit and dynamic loader now include Phase 15 and Phase 16 with distinct `MIRROR_MOTION_PHASE15_LOAD_FAILED` and `MIRROR_MOTION_PHASE16_LOAD_FAILED` attribution.

## Required regression review
Run:

`node --test test/mirror-motion-phase15.test.js test/mirror-motion-phase16.test.js`

plus focused Phase 4, 5, 13, 14 tests and full repository suite.

## Manual acceptance
1. Squat with both feet planted and small lateral torso/pelvis shift: root may move, but feet should not visibly skate with it.
2. Deliberate side step: Phase 4 should release the relevant anchor and Phase 16 compensation must fall away rather than resisting the step.
3. Push-up horizontal hold: planted wrists/ankles should remain visually steadier during small lateral drift.
4. Jumping jack: Phase 4 has no planted feet; compensation must remain inactive.
5. Camera pan/shake: report whether lateral-intent camera-motion discrimination is still needed.
6. Tracker loss/reacquisition: no stale compensation should survive.
7. Exercise change: no stale contact compensation should carry across exercises.
8. Verify calibration voice ownership remains unchanged and base-position capture still reaches READY.

## GO criteria
- no correction without active contacts;
- correction is bounded and partial;
- deliberate steps are not resisted;
- no duplicate root/solver authority appears;
- no measured-depth claim appears;
- first-failure diagnostics identify Phase 15/16 load or runtime failures accurately.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge without owner approval.
