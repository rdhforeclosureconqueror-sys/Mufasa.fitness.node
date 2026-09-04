# Mirror Motion Intelligence — Phase 7 facing-intent foundation

## Base

Hardened Phase 6 stacked head: `ef567c8ccca10d466a30b99eeee2abea7973c036` (includes merged PR #646).

## Purpose

Add a conservative, review-first facing/turn-intent estimator before any root-yaw authority is activated.

MoveNet remains 2D evidence. Phase 7 MUST NOT claim metric Z depth or measured 3D orientation.

## Behavior

- classifies `FRONT`, `QUARTER`, and `SIDE` from projected shoulder/hip width relative to torso length;
- uses consecutive-frame hysteresis before changing facing state;
- uses trustworthy nose/shoulder asymmetry only to choose left/right yaw sign;
- emits bounded `yawIntentDeg` and `confidence`;
- explicitly marks `measuredDepth: false`;
- low-confidence input holds the previous stable intent rather than inventing a turn;
- exposes a Phase 7 debug panel when installed.

## Scope boundary

This PR intentionally does NOT apply yaw to the Avaturn root yet and does not modify the existing quaternion solver. The independent reviewer should first validate that the facing signal itself is stable and does not oscillate or reverse unexpectedly.

A follow-up activation phase may propagate the accepted intent through normalized pose and apply a bounded rest-relative Y-axis quaternion in the existing Avaturn solver.

## Regression coverage

`test/mirror-motion-phase7.test.js` covers front-facing stability, hysteretic side entry, bounded signed yaw intent, low-confidence hold behavior, and explicit no-depth diagnostics.

## Review focus

Challenge false SIDE classifications during narrow squat stance, push-up side views, arm crossings, camera framing changes, mirrored preview semantics, and nose jitter near center.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge during independent review unless explicitly requested by the owner.