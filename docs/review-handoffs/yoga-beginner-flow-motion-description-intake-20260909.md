# Yoga Beginner Full-Body Flow → Motion Lab description intake handoff

Date: 2026-09-09
Branch: `feat/yoga-motion-description-intake-beginner-flow-20260909`
Scope: first connection layer from Yoga content to generic Motion Lab generation.

## Goal

Prove one reusable product path before expanding Yoga:

`Yoga pose -> Motion Description Template -> Motion Animation button -> Motion Lab intake -> generic generation request -> downstream Motion Spec generator -> Coach Avatar -> compile -> playable demo`

This PR implements through **generic generation request**. It intentionally does not invent six bespoke clips or pretend the repository already has a general natural-language/structured-description-to-Motion-Spec translator. The next downstream boundary is now explicit and diagnosable instead of hidden.

## Six covered poses

The canonical `beginner-flow` session is the only session enabled for this first proof:

1. Mountain Pose (`mountain`)
2. Chair Pose (`chair`)
3. Warrior II (`warrior-ii`)
4. Downward-Facing Dog (`downward-dog`)
5. Cobra Pose (`cobra`)
6. Bridge Pose (`bridge`)

Do not broaden the Motion Animation UI to other Yoga sessions in this PR.

## Description architecture

`public/motion/yoga/motion-description-template.v1.json` defines one required schema for every generated movement description:

- start state;
- target whole-body shape;
- body-segment relationships;
- support/contact points;
- trajectory;
- orientation (hands, feet, head/gaze, torso where relevant);
- timing;
- transition in;
- transition out;
- human visual acceptance checkpoints.

`public/motion/yoga/beginner-flow-motion-descriptions.v1.json` contains all six descriptions using exactly that template. These descriptions are separate from `data/yoga/poses.v1.json` because the canonical Yoga pose resource currently serves recognition/coaching/scoring and does not contain enough generation geometry/trajectory/support detail to author animation safely.

## Product handoff

In `/yoga.html`, when the member opens a pose inside `beginner-flow`, the pose card includes **Motion Animation**.

Pressing it:

1. loads the six-pose motion-description registry from public static content;
2. resolves the selected pose by stable `poseId`;
3. writes a bounded single request to `pocketpt.motionGenerationRequest.v1`;
4. navigates to `/motion-lab/?motionSource=yoga&session=beginner-flow&pose=<poseId>`.

No other session gets this button yet.

## Motion Lab intake

`public/motion/yoga-motion-description-intake.js` is loaded through the existing protected `/dev/motion-lab-assets/:filename` JS route. Its JSON template/registry dependencies use normal `public/` static paths (`/motion/yoga/...`) so the Yoga member page does not need Motion Lab asset-route permission to resolve the description before the privileged handoff.

The Motion Lab intake panel shows the selected structured description and explicit boundaries:

1. Yoga handoff
2. description resources
3. pose description
4. template validation
5. generation request
6. Motion Spec generator
7. Coach Avatar
8. compile / bind
9. playable demo

Stop at the first FAIL. PENDING means the current PR has reached a deliberate downstream boundary, not that the previous stage silently passed.

## Critical architecture boundary

Do **not** implement the next step by mapping `mountain`, `chair`, etc. to six hand-written animation clips in the UI. The next generator should consume `pocketpt:motion-generation-request` and translate the description into a canonical semantic/phase-first draft Motion Spec. Avatar-specific bone names/rest axes remain the retarget/compiler layer's responsibility.

A pose may still require owner calibration after generation. That is expected; the goal is description authority + generic generation, not one-off animation authoring.

## Review commands

```bash
node --test test/yoga-motion-description-intake.test.js
node --test test/yoga-workout-integration.test.js
```

Also run the relevant Motion Lab lifecycle/runtime/pose-editor regressions because `motion-lab/index.html` gains one protected intake script.

## Manual verification

1. Sign in with an entitlement that can open Yoga.
2. Open **Beginner Full-Body Flow**.
3. Confirm all six steps expose **Motion Animation** as they are previewed.
4. Press Mountain Pose → Motion Animation.
5. Complete the existing authorized Motion Lab launch/gate as required by the environment.
6. Confirm Motion Lab receives `session=beginner-flow`, `pose=mountain` and renders the Mountain description.
7. Confirm intake stages through `Generation request` show PASS.
8. Confirm the next unimplemented downstream boundary is clearly shown as `Motion Spec generator: PENDING`, rather than silently claiming a playable clip exists.
9. Repeat description resolution for Chair, Warrior II, Downward-Facing Dog, Cobra and Bridge.
10. Confirm another Yoga session does not expose this first-proof button yet.

## Readiness

This touches Yoga member UX and Motion Lab tracked scope. Per `AGENTS.md`, applicable readiness evidence must be recorded via `npm run readiness:update -- ...`, followed by `npm run readiness:validate`. Do not edit readiness JSON directly. Human/device/visual acceptance must be recorded only through the authorized mechanism.
