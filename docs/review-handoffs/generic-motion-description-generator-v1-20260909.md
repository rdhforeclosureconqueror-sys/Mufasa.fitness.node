# Generic Motion Description -> Motion Spec Generator v1 — Review Handoff

## Goal

Turn the approved Yoga Motion Description intake from PR #756 into an actual reusable draft generator instead of six bespoke animation branches.

Pipeline under review:

`Yoga pose -> approved human description -> normalized generation plan -> generic archetype generator -> Coach-targeted Motion Spec draft -> personalized Coach Avatar -> shared Motion Lab compiler -> playable preview`

## Important architecture boundary

The generator is **archetype-driven**, not `exerciseId`-driven. The six Beginner Full-Body Flow poses select reusable movement archetypes and semantic requirements from `public/motion/yoga/beginner-flow-generation-plans.v1.json`. The generator implementation must not branch on `mountain`, `chair`, `warrior-ii`, `downward-dog`, `cobra`, or `bridge` IDs.

Human-readable descriptions from PR #756 remain authoritative. Generation plans are the normalized machine representation used so the engine does not guess meaning from English keywords.

## Six proof cases

- Mountain -> `neutral-standing-hold`
- Chair -> `bilateral-squat-overhead-hold`
- Warrior II -> `wide-split-stance-lateral-reach`
- Downward-Facing Dog -> `inverted-v-four-point`
- Cobra -> `prone-spinal-extension`
- Bridge -> `supine-hip-extension`

Every generated draft targets:

- avatar profile `avaturn-personalized-candidate`
- skeleton profile `avaturn-native-v1`
- rest-relative local Motion Spec compilation
- no autoplay
- owner visual acceptance required

## First-failure order

1. Yoga navigation handoff
2. description/template resources
3. pose description resolved
4. description template valid
5. generation request valid
6. generation plan resolved
7. generator module available
8. archetype supported
9. Motion Spec draft generated
10. personalized Coach Avatar loaded
11. generated Motion Spec compiled/bound
12. playable preview selected
13. owner visual acceptance

Do not skip to visual tuning if an earlier boundary fails.

## Files

- `public/motion/motion-description-to-spec-generator.js`
- `public/motion/yoga/beginner-flow-generation-plans.v1.json`
- `public/motion/yoga-motion-description-intake.js`
- `test/motion-description-to-spec-generator.test.js`

## Required automated review

Run:

```bash
node --test test/motion-description-to-spec-generator.test.js
node --test test/yoga-motion-description-intake.test.js
node --test test/yoga-workout-integration.test.js
```

Also run current Motion Lab runtime/compiler, Coach-retarget, lifecycle, pose-editor and local-playback regressions.

## Critical review questions

1. Confirm the generator does not contain per-exercise ID branches.
2. Confirm all six descriptions resolve one generation plan and one supported archetype.
3. Confirm generated specs use `avaturn-native-v1` names and the Coach retarget metadata required by `MotionLabRuntime.loadMotionSpec`.
4. Confirm no generated motion autoplays.
5. Confirm a missing plan or unsupported archetype fails closed and is visible as the first failure.
6. Confirm the intake lazy-loads the public generator module and does not weaken the privileged Motion Lab route gate.
7. Confirm loading a generated Yoga draft uses the existing Motion Lab runtime/session rather than creating a second renderer or mixer.
8. Confirm the generated draft is shown in the intake panel for inspection/copying.

## Deliberate v1 limitation

`supports` and semantic support requirements are preserved in generation diagnostics, but contact/IK promotion is **not yet automatically inferred for every archetype**. The draft reports `contactSolvingDeferred:true`. This is intentional for the first generator proof: visual testing should reveal which archetypes require new support/contact semantic operators rather than silently inventing anchors.

Do not mark movement quality accepted from code review. Owner/device visual acceptance is required per repository policy.

## Readiness

This changes tracked Motion Lab behavior. Record machine evidence through `npm run readiness:update -- ...`, then run `npm run readiness:validate`. Do not hand-edit readiness JSON or OPS state.
