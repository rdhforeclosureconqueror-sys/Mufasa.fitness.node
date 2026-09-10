# Yoga Motion Runtime Bootstrap Gate — Review Handoff

## First observed failure

The Mountain Pose Yoga pipeline passed description, template, generation-plan, Motion Spec generation, and support/contact operator stages, then failed at Coach Avatar with:

`Motion Lab runtime or Coach profile unavailable`

This is an initialization-order failure, not evidence that the Coach GLB/profile is invalid.

## Root cause

`PocketPTAvatarProfiles` and `MotionLabRuntime` are loaded by the Motion Lab bootstrap sequence. The Yoga `Create Motion Draft` handler can run before the user manually presses `Initialize Runtime`, so it checks globals that have not been installed yet and mislabels the boundary as a Coach failure.

## Fix

Add `public/motion/yoga-motion-runtime-gate.js` after `/dev/motion-lab-bootstrap.js`.

The gate captures clicks on `#emitYogaMotionGeneration` before the intake handler runs. If Motion Lab runtime + personalized Coach profile are not ready, it:

1. blocks the draft click;
2. starts the existing `Initialize Runtime` path exactly once when possible;
3. polls the existing bootstrap diagnostics and runtime/profile globals;
4. fails with bootstrap stage + code if bootstrap fails or times out;
5. replays the original Create Motion Draft click only after `MotionLabRuntime` and `PocketPTAvatarProfiles.profiles.personalized` are both present.

It creates no second renderer/session/bootstrap implementation.

## Acceptance

Start from Yoga Beginner Full-Body Flow with Motion Lab not initialized manually.

Mountain Pose expected path:

`Yoga handoff PASS -> Description PASS -> Template PASS -> Generation PASS -> Support PASS -> automatic runtime bootstrap -> Coach Avatar PASS -> Compile/bind PASS -> Playable demo PASS`

The user should not have to press `Initialize Runtime` before `Create Motion Draft`.

If bootstrap itself fails, the Yoga status should identify `Runtime/bootstrap failed at <stage>: <code>` instead of reporting the Coach asset as missing.

## Regression

Run:

```bash
node --test test/yoga-motion-runtime-gate.test.js
node --test test/yoga-motion-description-intake.test.js
node --test test/motion-description-to-spec-generator.test.js
node --test test/motion-support-operator-policy.test.js
```

Also re-run Motion Lab bootstrap/lifecycle and Coach Avatar loading regressions.

## Readiness

This changes tracked Motion Lab launch behavior. Record machine evidence using the repository `readiness:update` command and run `readiness:validate`; do not hand-edit readiness JSON. Human/browser/device acceptance remains owner-controlled.
