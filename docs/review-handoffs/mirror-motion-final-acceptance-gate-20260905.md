# MIRROR MOTION — FINAL ACCEPTANCE GATE

## Purpose
Close the feature-build phase without adding another motion authority. This PR adds one read-only acceptance surface that consolidates the existing Phase 2–18 diagnostics and reports the earliest unhealthy or missing boundary.

## What it checks
- Phase 2 through Phase 18 are loaded;
- each phase reports no first-failure boundary and no process errors;
- AvatarRuntime is present;
- protected rest-pose evidence is reported when observable from AvatarRuntime or Motion Lab;
- the final acceptance script itself is loaded after Phase 18 and included in the startup resource audit.

## Status contract
- `FAIL`: an already-loaded phase reports a concrete failure; earliest phase wins.
- `WAITING`: a required phase, AvatarRuntime, or protected rest-pose evidence is not yet observable.
- `READY`: all required stages are present and healthy and protected rest evidence is observable.

## Authority boundary
Diagnostics only. No camera, MoveNet, IK, retargeter, root translation, exercise state, contact anchor, F-curve, or measured-depth authority is added.

## Verification
Run `node --test test/mirror-motion-acceptance.test.js` plus focused Phase 2–18 tests and the full repository suite. In live acceptance, do not judge animation quality until the acceptance panel is READY. If it is not READY, debug the first reported boundary before downstream symptoms.

## Build-complete rule
If this acceptance gate is reviewed and the live scenarios pass, stop adding numbered motion phases. Further PRs should be driven by reproduced live failures or new product requirements, not by phase count.