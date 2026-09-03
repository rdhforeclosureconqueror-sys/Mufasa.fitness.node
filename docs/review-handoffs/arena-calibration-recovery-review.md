# Arena calibration recovery — independent review handoff

## Scope and release gate

New review branch: `review/arena-calibration-recovery-20260903`.
Audited main/base: `bb2a762e9b29a082cea8b1706c5422d588187c4c` (merged PR #633).
Draft PR: https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node/pull/634
Published implementation: `eb76ef786f03b132bc4dd3f9ba9b1fc055bc81bf`.
Tested/published implementation tree: `2ba3c315b85f37da50743bb8e686ebd26826c4c0`.
This is a follow-up repair, not an amendment to that merged PR. The draft PR and
readiness evidence identify the implementation commit and current review head.
Do not merge or deploy until independent review and the owner's applicable
visual/device checks are recorded. Machine evidence is not human acceptance.

## What changed

- Replaced the eight-frame hold buffer with a 700 ms time window, at least four
  samples, maximum 350 ms sampling gaps, and bounded high-rate coalescing.
  The old buffer could never span 700 ms at 15/30/60 fps; it worked at 10 fps.
- Restored source-video pixel scale before computing angles. Independently
  normalized x/y coordinates distort angles on non-square camera frames.
- Required finite, in-frame, confident, fresh landmarks and chronological
  timestamps. Bound references to the tracked side and source dimensions.
- Added a 30-second deadline for each acquisition phase. Timeout clears all
  references and pauses until explicit restart; it never advances automatically.
- Added **Restart pose capture**, rotation invalidation, sustained tracking-loss
  recovery, camera-switch resets, and generation-safe cleanup of pending timers.
- Added a separate diagnostic for returning to the personal TOP reference.
  Reference capture cannot mark valid start posture, rep detection, timer, or
  persistence as PASS. Reset clears downstream evidence; a short dropout may
  restore reference evidence only while the actual in-memory references remain.
- Started calibration only after camera startup completes, not during permission
  or model initialization. Clarified the camera-check-only and captured-reference
  messages. Updated cache-version queries together for the changed script set.

These are attempt-local geometry templates, **not saved photographs**, a new
exercise definition, or proof of technically valid push-ups. No raw pose data is
sent to Godot or copied into diagnostics. No new persistent user data is created.

## Files in scope

Runtime: `public/arena-pose-calibration.js`, `public/arena-camera.js`,
`public/arena-phone-flow.js`, `public/arena-phone-ui.js`,
`public/arena-diagnostics.js`, `public/arena-push-up.html`.

Tests: `test/arena-calibration-hardening.test.js`,
`test/arena-pose-calibration.test.js`, `test/arena-camera.test.js`,
`test/arena-phone-flow.test.js`, `test/arena-phone-ui.test.js`,
`test/arena-diagnostics.test.js`.

Evidence: this handoff and `data/readiness/development-evidence.json`, updated
through the readiness CLI. Generated `data/ops/` records must not be committed.

Unchanged: Godot exports and editable scenes, gym, player movement/animations,
avatar pipeline, authentication/backend routes, canonical exercise definitions,
competition results/leaderboards, deployment configuration, and package lock.

## Independent review checklist

1. Compare the actual PR head against the base above; check scope before code.
2. Rerun the commands below; report independently executed results separately
   from this author's evidence. The full repository test suite is not claimed.
3. Verify TOP → BOTTOM → TOP at 5/10/15/30/60/120 simulated pose fps. Identical
   TOP/BOTTOM, unstable holds, gaps, duplicates, old/future frames, and missing
   joints must not complete calibration.
4. Verify equivalent source pixel geometry produces the same angles across
   portrait/landscape dimensions. CSS mirroring/cropping must not enter angles.
5. Time out each acquisition phase; only the failed phase gets timeout FAIL,
   all templates clear, and restarting begins with TOP. Returning visibility
   alone must not revive a timed-out capture.
6. Rotate, switch cameras, change tracked side, interrupt tracking, return to
   gym, suspend, reset, and exit. No old references, late timer, or old camera
   callback may complete a restarted attempt. A brief loss resets the current
   hold; 1.5 seconds of observed unusable tracking erases acquired references.
7. Inspect the actual coordinator using real calibration logic and controlled
   camera/DOM doubles. These tests do not prove browser rendering or MoveNet
   accuracy. Restart must remain available and focus must stay on a visible
   recovery control. Legacy camera preview must not collect references.
8. Verify the new diagnostic row is PocketPT-owned, disallowed in Godot reports,
   sanitized, and dependent on both references. Personal-cycle PASS must not
   imply form approval, countdown, competition score, or saved results.
9. Confirm no credential, raw landmark, camera image, or device identifier was
   added to packets/copied diagnostics/persistent storage.
10. Leave human visual/device/fitness-naturalness gates unapproved.

## Automated evidence and reproduction

Author run: **114 tests passed, 0 failed**, across the 11 targeted files below.
The first broader attempt was blocked by missing `express`; installing the
existing lockfile dependencies resolved it. No dependency manifest was changed.
Readiness validation and whitespace checks also passed before publication;
repeat them at the final PR head.

```sh
npm ci --ignore-scripts --no-audit --no-fund
node --test --test-reporter=spec \
  test/arena-calibration-hardening.test.js \
  test/arena-pose-calibration.test.js \
  test/arena-phone-flow.test.js \
  test/arena-phone-ui.test.js \
  test/arena-camera.test.js \
  test/arena-diagnostics.test.js \
  test/world-bridge-pocketpt-finish.test.js \
  test/world-bridge-production-entry.test.js \
  test/world-bridge-mobile-auth.test.js \
  test/world-bridge.test.js \
  test/world-avatar-bridge.test.js
npm run readiness:validate -- --base bb2a762e9b29a082cea8b1706c5422d588187c4c
git diff --check bb2a762e9b29a082cea8b1706c5422d588187c4c
```

## Risk management: prevent, detect, recover, verify

| Risk / owner | Prevention and detection | Recovery / release evidence |
| --- | --- | --- |
| Endless capture / PocketPT | Time-based sample window; per-phase deadline and safe diagnostic | Explicit restart from TOP; variable-fps and each-phase timeout tests |
| Misleading geometry / PocketPT | Source dimensions, finite confident in-frame points, source/side binding | Erase references on source change; aspect/rotation/camera-switch checks |
| Stale tracking / PocketPT | Fresh chronological timestamps, gap resets, loss timer | Restart after sustained loss; camera wrapper signals silence after 1.5 s, then calibration loss grace adds up to 1.5 s; device validation still required |
| False exercise approval / exercise-rule owner | Separate personal-reference rows from form/rep/timer gates | Keep countdown/scoring disconnected until reviewed depth/orientation/alignment rules and representative movement tests exist |
| Phone interruption / PocketPT | Existing session/camera generation guards and suspension path; capture timers clear | Explicit re-entry/restart, no automatic navigation resume; test phone lock, app switch, camera interruption and Safari back cache physically |
| Mixed client/game versions / Bridge + Godot | Negotiated capabilities; unsupported controls remain unavailable; coordinated script cache versions | Deploy a complete reviewed artifact set; check actual responses after reload; legacy READY is not new-control or reporter evidence |
| Avatar/gym regression / Godot owner | This PR changes no Godot asset, import, or movement code | Owner compares gym, correct member avatar and arrow motion; a green bridge alone is not visual proof |
| Privacy / PocketPT + backend | Templates stay in memory; fixed diagnostic messages and semantic packets only | Inspect copied report and requests; erase templates on exit/change; no new public avatar consent implied |
| Untrusted competition results / future challenge owner | This PR cannot start scoring or write results | Before enablement, define one timer owner, expiry handling, idempotent finish and canonical backend eligibility checks; these are remaining work, not implemented protection |
| Difficult rollback / release owner | Isolated follow-up PR, recorded base/head, no data migration | If regression appears after owner-authorized deployment, stop acceptance and revert this PR through a reviewed revert; redeploy the prior compatible artifact set. Do not reset unrelated commits or edit PCK bytes |

For an incident, record the deployment/review SHA, device/browser, exact action,
expected/observed behavior, and sanitized diagnostic copy. Start with the earliest
failed dependency, not all blocked rows. Reproduce with a minimal fixture, add a
regression test, make a focused repair, and rerun both automated and affected
device checks. Do not collect private camera footage by default.

## Owner/device acceptance and remaining blockers

No live authenticated browser launch, physical iPhone, real-camera pose accuracy,
or human visual acceptance was performed for this follow-up. No production or
full-challenge success is claimed. Local HTTP preview tests validate assets and
synthetic camera wiring only, not rendered UI.

On the review deployment, check:

- Correct personal avatar and the approved gym remain visible; existing arrow
  movement remains unchanged. Walking is still separate Godot work.
- Diagnostics can be opened/closed with keyboard; phone controls, Restart and
  Return fit portrait/landscape, zoom, safe areas and the on-screen keyboard.
- Enable camera only with consent; deny/retry, switch camera, rotate, background,
  lock/unlock, return and re-enter. The phone camera must stop on exit.
- With a compatible Godot receiver, tap mat → actual arrival → camera setup →
  TOP capture → BOTTOM capture → TOP confirmation. Test stuck/noisy capture and
  explicit restart. Do not interpret the displayed references as approved form.
- With the current legacy receiver, **Check my camera** remains preview-only;
  missing touch/diagnostic capabilities are expected. This PR does not add the
  Godot receiver, locomotion, push-up animation, or diagnostic sender. Follow
  `arena-phone-flow-godot-handoff.md` for that editable-source work.
- Keep countdown, reps, official results, ghost replay and leaderboard
  acceptance blocked until their separate canonical integrations are complete.

The whole Push-Up Arena V1 card remains incomplete. This PR repairs a prerequisite;
it does not turn a diagnostic panel into proof that the full game works.
