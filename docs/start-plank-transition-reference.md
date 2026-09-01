# Start Plank transition reference

## Purpose

A user-supplied `Start Plank.fbx` was inspected as a mechanics reference for PocketPT's difficult standing-to-floor / push-up transition.

The goal is **not** to replay the source performance. The source contains stylistic motion the product does not want. PocketPT instead keeps only a coarse biomechanics profile for root descent and pelvis orientation, while live MoveNet/body tracking remains authoritative.

## Source inspection

Observed from the uploaded FBX:

- FBX version: 7700
- file size: 705,664 bytes
- SHA-256: `c76872258a72f20b34140d660a79fbb36d234519f1fde2bfb333ebe5548fc5eb`
- skeleton namespace: `mixamorig`
- model/skeleton nodes: 65
- animation curves: 315
- animation curve nodes: 54
- animation stacks: 1
- duration: approximately 4.9 seconds
- hip Y starts near 103.54 and finishes near 41.12, a net source-space descent of about 62.42 units
- hip X rotation changes by roughly 68.8 degrees from first to final frame

These observations are recorded in `motion-sources/start-plank-reference.source.json`.

## What is committed

`public/motion/transition-profiles/stand-to-plank.v1.json` stores eight coarse anchors:

`stand -> hinge -> crouch -> hands_down -> weight_transfer -> leg_extension -> plank_acquire -> plank_stable`

Each anchor includes root-drop progress plus coarse hip translation and pelvis rotation deltas.

`public/motion/transition-profile.js` can interpolate that profile and infer a rough standing-to-floor transition progress value from live body-axis angle/root descent.

## What is deliberately NOT committed

The uploaded FBX binary is not committed in this PR because its redistribution/license status has not been established. The source manifest marks it `reference-only` and `licenseStatus: unverified`.

This PR also does **not** wire the profile into production avatar movement yet. That would change live motion behavior and needs its own bounded PR plus browser/device acceptance.

## Intended next integration

When live tracking clearly indicates standing-to-floor intent, the live solver can use the coarse reference as a confidence-limited assist for root descent/pelvis pitch only. Arm, hand, leg, and torso articulation should continue to come from live tracking wherever confidence is adequate.

The assistance should fade back to zero once a stable floor/plank pose is reacquired.
