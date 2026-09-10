# Dev-bot handoff — Yoga support/contact operators v1

## Purpose

Phase 3 after merged PR #757. Promote machine-readable Yoga support semantics into real Motion Lab endpoint contacts and generated IK instead of leaving every support as metadata.

## Architecture

`Yoga description -> generation plan -> reusable archetype -> support operator policy -> grounded/IK Motion Spec -> Coach Avatar -> shared compiler -> playable preview`

## New support operator layer

`public/motion/motion-support-operator-policy.js`

Endpoint supports currently enforced:

- `left_foot` -> LeftUpLeg / LeftLeg / LeftFoot chain
- `right_foot` -> RightUpLeg / RightLeg / RightFoot chain
- `left_hand` -> LeftArm / LeftForeArm / LeftHand chain
- `right_hand` -> RightArm / RightForeArm / RightHand chain

The policy converts those declarations into `groundingPolicy.contacts`, `contactBones`, `kinematicChains`, `anchorPhaseId`, `enforceContactAnchors:true`, and `enforceGeneratedIK:true`.

## Anchor behavior

- neutral standing and bilateral squat archetypes anchor endpoint supports at `start` and keep them active through all named phases;
- stance-changing/floor archetypes establish endpoint anchors at `target` and enforce them through `target` + `hold`, allowing entry/exit to establish or release the contact instead of locking the rest pose to the final support geometry.

## Surface-support boundary

The current shared IK engine is an endpoint-chain solver. It is **not** valid to pretend it can enforce broad body-surface support such as pelvis, upper back, head, or upper arms against the floor.

Therefore this PR explicitly classifies and reports these as the next capability:

`BODY_SURFACE_SUPPORT_SOLVER`

Cobra currently enforces both palms and reports pelvis/legs as deferred body-surface supports. Bridge enforces both feet and reports upper back/head/upper arms as deferred body-surface supports.

Unknown support identifiers fail closed with `SUPPORT_OPERATOR_UNSUPPORTED`.

## Six proof poses

- Mountain: both feet enforced
- Chair: both feet enforced with generated bilateral leg IK
- Warrior II: both feet enforced at target/hold
- Downward Dog: both hands + both feet enforced with four generated chains
- Cobra: both hands enforced; body-surface supports explicitly deferred
- Bridge: both feet enforced; body-surface supports explicitly deferred

## Important integration repair

Merged Phase 2 had a generator asset but Motion Lab could reach the Yoga intake before the generator was loaded. `motion-lab/index.html` now loads in this order:

1. `motion-support-operator-policy.js`
2. `motion-description-to-spec-generator.js`
3. `yoga-motion-description-intake.js`

This removes the false `PocketPTMotionDescriptionGenerator unavailable` first failure.

## Diagnostics

The Yoga intake pipeline now includes an explicit `Support/contact operators` stage between generator and Coach Avatar. It reports:

- enforced endpoint contacts;
- deferred body-surface supports;
- generator/support failures before avatar/compile work begins.

## Review commands

```bash
node --test test/motion-support-operator-policy.test.js
node --test test/motion-description-to-spec-generator.test.js
node --test test/yoga-motion-description-intake.test.js
node --test test/yoga-workout-integration.test.js
```

Also run the Motion Spec compiler/generated-IK, Coach retarget, lifecycle, pose-editor and local playback regressions.

## First-failure review order

1. support policy asset load
2. generator asset load
3. description + generation plan
4. support classification
5. contact mapping
6. anchor phase
7. chain mapping
8. Coach Avatar load
9. Motion Spec compile
10. generated IK solve
11. contact residual
12. Play enabled
13. visible support stability

## Visual acceptance

Human/device approval remains required. In particular verify:

- Chair feet do not visibly slide while descending/holding/rising.
- Warrior II feet remain planted after the stance is established.
- Downward Dog maintains both hands and both feet at the target/hold without solver explosion.
- Cobra palms remain planted while the chest lift is inspected.
- Bridge feet remain planted while the pelvis lift is inspected.

Do not record body-surface support as complete for Cobra or Bridge; that capability is deliberately deferred and explicitly diagnosed.

## Readiness

This affects tracked Motion Lab behavior. Use the repository CLI for readiness evidence (`npm run readiness:update -- ...`) and run `npm run readiness:validate`. Never hand-edit readiness JSON or OPS state. Human visual/movement approval must remain owner-controlled.
