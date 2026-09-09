# OHSA Semantic Arm Retarget Fix — Corrective Follow-Up

Date: 2026-09-09
Context: corrective follow-up after merged PR #752
Branch: `feat/motion-lab-overhead-squat-assessment-20260909`
Status: **RETEST REQUIRED — OWNER VISUAL ACCEPTANCE NOT YET RECORDED**

Owner mobile screenshots showed upper arms following an implausible path through/across the torso/head even though the OHSA description correctly required straight arms overhead.

The first failing boundary is rotation semantics during canonical-to-Coach retargeting. The old path copied a canonical Mixamo local Euler offset onto Avaturn after only renaming the bone. Matching semantic bone names do not guarantee matching local coordinate axes, so the same local X/Y/Z Euler offset can produce a different physical direction on another rig.

The corrective implementation adds `public/motion/motion-spec-semantic-direction-policy.js`. Motion Specs may now declare semantic body-segment direction targets. For OHSA the left and right shoulder-to-elbow segments are requested to point world-up `[0,1,0]`. The policy resolves the actual target-rig upper arm and forearm, computes the target-rig quaternion required to satisfy that world-space direction, compiles from that rig-correct basis, then restores the original avatar rest pose. Existing motions without semantic targets pass through unchanged.

OHSA upper-arm and forearm raw local Euler offsets are now zero. The movement definition says what the limb must do; the rig translator determines how the loaded armature must rotate to make that happen.

Required review:

```bash
node --test test/overhead-squat-assessment-motion-spec.test.js
```

Then run existing Motion Lab lunge/squat/compiler/retarget regressions.

Owner visual retest should stop at the first failure: inspect `setup_overhead` first in front and side views. Each arm must rise from its own shoulder without crossing through chest, opposite shoulder, neck, or head. If that passes, inspect first descent, first bottom, mirrored ascent, grounding, and all three reps.
