# Mirror Motion Intelligence — Phase 9 foreshortening/occlusion guard

## Base

PR #651 hardened head: `8afcc6f40e6ceb23693e83d56b8e6f84be46d1b8`.

## Purpose

Protect the existing 2D-to-avatar solver when FRONT-calibrated limb segments appear to collapse under QUARTER/SIDE projection. This phase does not reconstruct Z depth. It prevents suspicious projected shortening from becoming a high-confidence bone-direction update.

## Behavior

- learns per-segment projected baselines only from trusted FRONT frames;
- monitors upper arms, forearms, thighs, and shins;
- on trusted QUARTER/SIDE facing, compares current projected segment length to its FRONT baseline;
- if collapse exceeds the configured facing-specific threshold, zeros only the presentation confidence of the distal joint before the existing normalized-pose/Avaturn solver consumes the packet;
- preserves raw confidence in `foreshorteningRawConfidence` and records segment/baseline/observed ratio diagnostics;
- untrusted facing evidence never gains foreshortening authority;
- explicitly reports `measuredDepth: false`;
- clears learned baselines after Phase 2 tracker/person resets.

## Important boundary

This is a review-first foundation. The Phase 9 file is not added to the production loader in this PR. Validate thresholds and false-positive behavior before activation. It must not suppress legitimate compact joint geometry, fast exercise motion, or contact-aware IK output merely because the user is turned.

## Debugging

`Mirror Motion Phase 9 Debug` reports first failing boundary, number of learned baselines, FRONT samples, guard count, context resets, no-depth authority, last issue, and process errors.

## Regression coverage

`test/mirror-motion-phase9.test.js` covers FRONT learning, SIDE-collapse guarding, normal side projection passthrough, untrusted-orientation passthrough, and no-depth diagnostics.

## Review focus

Challenge:

- side-on push-ups where projected upper/lower limbs legitimately shorten;
- squat depth and knee travel;
- jumping-jack arm/leg movement;
- camera distance/framing changes;
- quarter-turn transitions;
- contact/IK solved joints from Phase 5;
- Phase 2 tracker reset/reacquisition;
- thresholds at different body sizes.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge unless explicitly requested by the owner.