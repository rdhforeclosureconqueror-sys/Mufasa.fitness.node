# Mirror Motion Phase 2 — retry/reset hardening review

## Audited base

- Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
- Main reviewed: `5590ca522150b1c294cc23a81ffaf3e99d1c8893`
- Predecessor: merged PR #637
- Corrective branch: `fix/mirror-motion-phase2-retry-reset-20260904`

## Independent findings

### 1. Stabilizer dependency failures were still effectively permanent

PR #637 correctly separated persistent dependency failures from per-frame first-failure reporting, but `stabilizerLoadRequested` remained `true` after loader-unavailable, export-missing, or rejected-load paths. `ensureStabilizer()` therefore returned early forever and could not recover if the dependency became available later.

### Fix

Failed dependency attempts now clear the in-flight flag and schedule a bounded 2-second retry backoff. The mirror continues using raw packets during the fallback period. A later frame can retry after the backoff; success clears the persistent stabilizer failure and retry deadline.

The debug panel now reports the remaining retry delay.

### 2. One reacquisition frame could reset temporal history twice

With both a frame gap greater than 750 ms and a stale `lastPersonSeenAt`, the same incoming person-present frame could execute `FRAME_GAP` reset and then `PERSON_REACQUIRED` reset. That inflated diagnostics and performed redundant state clearing.

### Fix

Reset reason is now selected once per incoming frame, with frame-gap taking precedence. Person-loss/reacquisition state is still updated, but `resetTrackerHistory()` can execute at most once for that packet.

## Regression coverage

`test/mirror-motion-phase2.test.js` now asserts:

- a rejected stabilizer dependency load becomes retryable after bounded backoff;
- successful retry restores stabilizer-ready state and clears the persistent failure;
- a long frame gap plus person reacquisition increments tracker reset count exactly once;
- retry delay remains visible in debug text.

## Scope

No Phase 3 body-proportion constraints, left/right recovery, IK, foot planting, exercise-state constraints, or quaternion work is included here.

## Independent review request

Review the actual PR head. Run at minimum:

- `node --test test/pose-stability-engine.test.js test/mirror-motion-phase2.test.js`
- full repository test suite

Manually verify a temporary dependency failure can recover without page reload, and that reconnect/reacquisition produces one tracker reset per discontinuity.

Return GO or CHANGES REQUIRED. Do not merge during independent review unless explicitly requested by the owner.