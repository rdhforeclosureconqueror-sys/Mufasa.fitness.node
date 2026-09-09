# OHSA Semantic Arm Retarget Fix — Corrective Follow-Up

Date: 2026-09-09
Context: corrective follow-up after merged PR #752
Branch: `feat/motion-lab-overhead-squat-assessment-20260909`
Status: **RETEST REQUIRED — OWNER VISUAL ACCEPTANCE NOT YET RECORDED**

Owner mobile screenshots showed upper arms following an implausible path through/across the torso/head even though the OHSA description correctly required straight arms overhead.

The first failing boundary was rotation semantics during canonical-to-Coach retargeting. The old path copied a canonical Mixamo local Euler offset onto Avaturn after only renaming the bone. Matching semantic bone names do not guarantee matching local coordinate axes, so the same local X/Y/Z Euler offset can produce a different physical direction on another rig.

## Corrective architecture

The implementation adds `public/motion/motion-spec-semantic-direction-policy.js`. Motion Specs may declare semantic body-segment direction targets. For OHSA the left and right shoulder-to-elbow segments are requested to point world-up `[0,1,0]`.

The important review correction in the current head is that semantic direction is **not solved once from the rest pose and reused**. That was still incorrect because Hips/Spine/Spine1 rotate during the squat and would rotate a reused arm quaternion away from world-up.

The current compiler wrapper now prepares every named/generated phase independently:

1. restore the target rig rest pose;
2. apply that phase's root, hips, spine, and other authored ancestor transforms;
3. update world matrices;
4. solve each semantic shoulder-to-elbow target against world-up on the actual loaded rig;
5. convert the solved local quaternion back into a rest-relative phase offset;
6. store that phase-specific offset in the derived playback spec;
7. restore the avatar before the base compiler runs.

Therefore a torso change at `rep1_descent_mid` or `rep1_bottom` produces a different target-rig local arm quaternion when necessary, while the **physical semantic result remains world-up**.

OHSA upper-arm and forearm raw local Euler offsets remain zero in the owner-authored spec. The movement definition says what the limb must do; the rig translator determines how the loaded armature must rotate for each phase.

Existing motions without semantic targets still pass through unchanged.

## Regression proof

Run:

```bash
node --test test/overhead-squat-assessment-motion-spec.test.js
```

The focused suite now includes a synthetic target rig where:

- the arm rest segment points along local +X;
- the torso/root rotates differently between top and bottom phases;
- top and bottom require different local arm offsets;
- both solved phases still produce a shoulder-to-elbow world direction of `[0,1,0]`.

Then run existing Motion Lab lunge/squat/compiler/retarget regressions.

## Owner visual retest

Stop at the first failure:

1. `setup_overhead` front view — each arm rises from its own shoulder.
2. `setup_overhead` side view — arms are overhead without crossing neck/head.
3. `rep1_descent_mid` — arms remain overhead while torso angle changes.
4. `rep1_bottom` — arms remain overhead rather than rotating forward with the torso.
5. mirrored ascent — world-up intent is preserved as the torso returns.
6. grounding — feet remain acceptably planted.
7. all three reps repeat without arm crossing or semantic drift.

## First-failure diagnostics

Report the first failing boundary in this order:

1. semantic policy module loaded;
2. semantic targets remapped to Coach bone identities;
3. phase-specific semantic preparation entered;
4. phase ancestor pose applied;
5. left upper-arm direction solved;
6. right upper-arm direction solved;
7. phase-specific offsets differ when ancestor geometry requires it;
8. derived spec reaches base compiler;
9. clip binds to Coach Avatar;
10. visible shoulder-to-elbow segment remains overhead during descent/bottom/ascent.

## Readiness boundary

The semantic-motion implementation is corrected in code, but repository readiness evidence must still be recorded through the canonical `npm run readiness:update -- ...` workflow followed by `npm run readiness:validate`. Do not hand-edit readiness JSON. Owner visual acceptance is also still required before merge.
