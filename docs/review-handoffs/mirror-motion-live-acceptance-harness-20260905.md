# MIRROR MOTION — LIVE ACCEPTANCE HARNESS REVIEW

## Role
Independent reviewer. Do not merge during review. Return GO or CHANGES REQUIRED with exact evidence.

## Baseline
Built from current main after Closure D (#685) and its current-health hardening (#686) merged. The numbered Phase 2–18 foundation and harvested camera closures are canonical.

## Purpose
This PR adds no new motion behavior. It provides an ordered real-device acceptance harness so live testing stops at the first reproducible failure and captures the canonical diagnostic state at that moment.

## Runtime module
`public/mirror-motion-live-acceptance.js`

It exposes:
- an ordered acceptance step list;
- `record(stepId, PASS|FAIL|BLOCKED, notes)`;
- a canonical diagnostic snapshot tied to the recorded step;
- a report with the first failed/blocked test;
- a small debug panel.

## Ordered live sequence
1. calibration voice + complete rest/base capture;
2. standing neutral;
3. squat;
4. jumping jack;
5. front → quarter → side → front turn;
6. standing → floor → plank → standing;
7. camera still + side-step left/right;
8. member still + camera pan/shake at near distance;
9. repeat camera pan/shake at farther distance;
10. leave/re-enter frame + tracker reacquisition;
11. avatar overlay + avatar-only modes.

## First-failure rule
At the first visible failure:
- stop the movement sequence;
- mark that step FAIL or BLOCKED;
- capture the harness snapshot;
- record the canonical first failing/waiting boundary;
- use that boundary to open a bounded corrective PR.

Do not continue through later movements and then guess which upstream stage caused them.

## Authority invariants
The harness must have no `process`, solver, root, camera, MoveNet, IK, retargeter, exercise/contact, animation, or measured-depth authority. It is observation/recording only.

## Loader
Phase 12 loads the harness only after Phase 2–18, final acceptance, Closure B camera review, and Closure C camera activation.

## Required review
1. Confirm #686 current-health acceptance behavior is present underneath this branch.
2. Confirm the harness cannot alter pose packets or solver state.
3. Confirm all 11 acceptance steps exist in the documented order.
4. Confirm PASS/FAIL/BLOCKED captures a current canonical acceptance snapshot.
5. Confirm report identifies the first failed/blocked step.
6. Confirm completion requires every step PASS.
7. Confirm loader order and distinct `MIRROR_MOTION_LIVE_ACCEPTANCE_LOAD_FAILED` attribution.
8. Run `node --test test/mirror-motion-live-acceptance.test.js test/mirror-motion-acceptance.test.js test/mirror-motion-camera-review.test.js test/mirror-motion-camera-activation.test.js` and full suite.

## GO criteria
GO means this is safe instrumentation for the user's live device acceptance pass. It does not mean the actual movements have visually passed; that comes from the real test session.