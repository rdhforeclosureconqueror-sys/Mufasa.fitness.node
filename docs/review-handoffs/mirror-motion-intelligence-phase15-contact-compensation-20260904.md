# MIRROR MOTION INTELLIGENCE — PHASE 15 REVIEW HANDOFF

## Purpose
Add a review-first contact-compensation signal for the conflict introduced when Phase 14 moves the avatar root laterally while Phase 4/5 are simultaneously treating a wrist or ankle as planted.

## Base
Phase 14 reviewed head: `49936d3cbde29d02cb11dc8a58b63454713b12f2`.

A separate catch-up PR (#668) targets current main because Phase 14 had previously merged only into the Phase 13 feature lineage.

## Problem being solved
Phase 14 can legitimately translate the avatar root in X when the member steps or shifts. During a squat or horizontal push-up, Phase 4 may simultaneously report planted ankle/wrist anchors. Moving the root while contacts are planted can create visible foot/hand skating unless the root/contact relationship is reconciled.

## Phase 15 boundary
This phase is review-first. It does not write avatar root transforms and does not alter IK. It only computes `contactCompensation` metadata.

Inputs:
- Phase 4 `exerciseContext.anchors`
- Phase 14 diagnostics `lastAppliedX`

Output:
- `contactCompensation.active`
- `contactCompensation.rootXIntent`
- planted-contact count
- pattern/phase context
- source root-X displacement
- reason

## Rules
1. No planted contacts => no compensation.
2. Small root-X displacement below threshold => no new conflict; release uses hysteresis.
3. Meaningful root-X while planted => compensation intent opposes the root displacement.
4. Intent is bounded to prevent a bad upstream value from causing a large correction.
5. No measured Z-depth is introduced.
6. Avatar-root write authority remains NO in this PR.
7. Existing Phase 4 contact and Phase 5 IK authorities remain unchanged.

## Diagnostics
Phase 15 diagnostics report frames, conflicts, whether compensation is active, last compensation intent, planted-contact count, exercise pattern/phase, process errors, first failing boundary, `Measured depth authority: NO`, and `Avatar root authority: NO (review-first)`.

## Regression coverage
Run `node --test test/mirror-motion-phase15.test.js` plus focused Phase 4, 5, 13, and 14 tests and the full repository suite.

Focused tests cover:
- no compensation without contacts;
- opposing bounded root-X intent with planted ankles;
- clamp behavior;
- release hysteresis;
- no-root/no-depth authority diagnostics.

## Manual review scenarios
1. Squat with both feet planted while shifting torso/pelvis laterally.
2. Deliberate side step: verify Phase 4 releases anchors rather than Phase 15 fighting the step.
3. Horizontal push-up with planted wrists/ankles and small camera/person lateral drift.
4. Jumping jack: no planted-foot compensation should activate.
5. Tracker reacquisition/exercise change: confirm upstream anchors clear and compensation falls inactive.
6. Camera pan/shake: report whether Phase 13/14 lateral intent itself needs camera-motion discrimination before activation of Phase 15 writes.

## Next phase if GO
Activate reviewed compensation at the existing Avaturn/root boundary with bounded authority, preserving Phase 5 IK and Phase 4 anchor release semantics. Do not create a second solver.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge without owner approval.
