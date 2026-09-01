# Motion Lab and Movement Lego integration audit — 2026-09-01

This repair connects the synthesized squat and Movement Lego capture workflow to their existing runtimes, corrects verified playback and capture defects, and retains the development-only boundary. Human movement and physical-device acceptance remain required.

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`.

Base: `95d6fafcce3af315e62bcb5eb6571bbcdfd958d9` (`main`, merge of PR #604). PRs #601, #602, #603 and #604 are merged. This follow-up incorporates #604's normalized bone-name resolution and automatic recovery to the reference avatar. It does not change either merged PR.

## What is connected

The study registry contains **17 Movement Lego blocks: 4 transitions, 5 postures and 8 actions**. Every block has repository evidence, and every status remains `CANDIDATE`. These are research building blocks, not 17 approved production animation clips. The Foundation 8 roadmap requires separate Front and Side captures for each task.

| Entry or resource | Destination and check |
| --- | --- |
| Dashboard → Motion Lab | Existing launcher opens `/dev/motion-lab-launch` on the backend and performs the origin-checked authorization handoff. |
| `POST /api/dev/motion-lab/session` | Existing authorized session creates the Motion Lab cookie. Local browser used a signed test admin token and received 201. |
| `/dev/motion-lab` | Existing feature flag and Motion Lab access gate remain in place. Anonymous requests stay denied. |
| `/dev/motion-lab-assets/*` | Squat spec now loads through the same protected module graph as the compiler, session and other specs. Route tests verify the complete required graph. |
| Motion Lab → Load Synthesized Squat v1 | Uses `MotionLabRuntime.loadMotionSpec(contract)` and the existing disposable session/compiler. Automatically loads the Phase E reference avatar if needed. Play remains explicit. |
| Dashboard → Movement Capture Studio | Existing admin/super-admin entry points to `/workout.html?movementCaptureStudio=1`; its canonical recorder, roadmap, studio and debug modules finish startup in order. |
| `/motion/registry/movement-lego-scavenger.v1.json` | All 17 candidate records and their referenced local evidence files were checked. Custom recordings cannot inflate coverage above 17/17. |
| Source evidence links | Repository pointers now open their actual GitHub files. `motion-sources/` is repository evidence, not a deployed static directory. |
| Workout pilot events | Uses the canonical authentication token and the server's allowed event names and bounded payload fields. Detailed unsupported diagnostics remain in the existing local log. |

The repository route-authorization validator matches **all 316 registered routes**. This is a contract check, not proof of every business workflow or a production deployment.

## Repairs

### Squat playback and lifecycle

- Replaced the temporary push-up global swap with a generic `loadMotionSpec(contract)` API. The squat and push-up retain their own contract identities and the same renderer, mixer, session, playback controls and cleanup owner.
- Preserved #604's exact/normalized bone resolver and ambiguous-alias rejection. Tracks bind to resolved object UUIDs; diagnostics retain the authored and actual bone names.
- Corrected root translations for the shipped armature's rotation and 0.01 scale. Offsets expressed in avatar-height units are converted from world displacement into the root parent's local coordinates.
- Restore the rest pose before compiling a new spec. Switching motions while playing or paused no longer bakes the previous pose into the next clip.
- Corrected ignored pelvis rotation, reversed leg-axis signs and mismatched ankle/root offsets in the development squat. The result is explicitly a **partial-depth engineering reference**. A numerical regression check samples 101 times and bounds foot displacement to 2.5% of avatar height; this is not a claim of perfectly planted feet or natural movement.
- Loading a motion does not autoplay. Stop, unload, failed avatar loads, late async completions and Dispose cannot leave an old motion selected or restore a stopped session. Dispose supports a fresh Initialize/Start cycle.

### Capture and export

- Module readiness now means the UI and registry fetch have completed, rather than merely that a script loaded. Delayed or failed registry requests produce accurate boot state and an actionable error.
- Capture view and movement identity are fixed when Record is pressed. Changing a dropdown before Save cannot relabel a Front recording as Side or attach it to another movement.
- Saving uses an exact recording ID and a synchronous saved event. Repeated Save cannot manufacture a paired capture from one recording.
- Export of a saved capture preserves its view tags and pose checkpoints. Starting another recording clears stale export/save state.
- Increased bounded local retention from 8 to 16 recordings to accommodate Foundation 8 × two views. Storage failures are reported; a browser quota failure is never reported as a successful save.

### Workout startup

- Removed references to two retired inline render constants and an undefined debug callback. The existing avatar runtime retains its owned defaults.
- Fixed a presentation MutationObserver that reacted indefinitely to its own writes, starving page startup. It now consumes the records of its own authoritative update while continuing to repair external changes. The regression test fails before the fix and passes afterward.
- Corrected unauthenticated, unsupported pilot-event requests observed during the full workout-page browser check. Server authorization and payload restrictions are unchanged.

Two existing test files were also missing their `node:test` imports. Their assertions now execute, and the speech-lock tests wait for the asynchronous speech chain to settle. Old single-view roadmap assertions were updated to the existing paired-view requirement.

## Verification

| Check | Evidence |
| --- | --- |
| Focused motion/capture/startup tests | 85 passing tests, including real GLTFLoader parsing of the shipped avatar and the canonical transition profile. |
| Real avatar binding | Both engineering specs compile; the squat has 12 tracks, 11 bound targets and zero unbound targets. Unknown and ambiguous targets fail closed. |
| Motion Lab browser | Chromium 149/WebGL2 against the actual local Express routes: personalized avatar → squat automatically switches to Phase E; load stays ready until Play; Pause, push-up switching, Stop, Dispose and reinitialize succeed. No page errors or failed HTTP responses. |
| Cleanup | Zero active sessions, RAF owners, listeners, timers and canvases after disposal. |
| Capture browser | Actual workout shell at 390 × 844, with a delayed registry response and a signed test admin session. Front and Side recordings, checkpoint creation, pairing, source links and JSON export succeed. No page errors, failed HTTP responses or boot error. |
| Capture input limits | Browser check injected three simulated canonical pose frames per recording. It did not use a camera or validate MoveNet inference, movement quality or a physical phone. |
| Static checks | `npm run lint`, `npm run security:validate-routes`, `npm run motion:validate-phase-e` and `git diff --check` pass. |
| Readiness | `readiness:validate` passes with correlated repository evidence. The repair card is `HUMAN_TEST_REQUIRED`, with `humanVerified=false`; no human acceptance is recorded by this repair. |

Run the focused checks with:

```sh
node --test test/motion-lab*.test.js test/motion-spec-real-avatar.test.js \
  test/disposable-motion-session.test.js test/push-up-motion-spec.test.js \
  test/squat-motion-spec-v1.test.js test/movement-capture*.test.js \
  test/movement-recording-roadmap*.test.js test/admin-movement-capture-dashboard.test.js \
  test/stand-to-plank-transition-profile.test.js test/avatar-calibration-exclusive-speech-lock.test.js \
  test/workout-presentation-observer.test.js
npm run lint
npm run security:validate-routes
npm run motion:validate-phase-e
npm run readiness:validate -- --base 95d6fafcce3af315e62bcb5eb6571bbcdfd958d9
```

### Full-suite comparison

The full repository suite is not green. The same environment produced:

| Revision | Tests | Pass | Fail |
| --- | ---: | ---: | ---: |
| Clean main at `95d6faf` | 1,704 | 1,663 | 41 |
| This repair | 1,724 | 1,688 | 36 |

There are **zero newly failing tests** relative to the clean base. Three obsolete roadmap assertions and two test-loader failures are resolved. The remaining 36 failures reproduce at the base and cover existing calibration/mirror expectations, UI/auth fixtures, billing/community behavior and static build/security inventories. They still require triage before a repository-wide green or launch-ready claim.

Remaining failures by file:

| Test file | Failing tests |
| --- | ---: |
| `test/avatar-body-follow-root-motion.test.js` | 1 |
| `test/avatar-calibration-canonical-voice.test.js` | 1 |
| `test/avatar-calibration-speech-arbitration.test.js` | 1 |
| `test/avatar-modal-controls.test.js` | 1 |
| `test/billing-api.test.js` | 2 |
| `test/free-run-club-community-phase1.test.js` | 4 |
| `test/global-navigation-auth.test.js` | 3 |
| `test/greatness-post-login-route-guard.test.js` | 1 |
| `test/guided-experience.test.js` | 1 |
| `test/live-avatar-mirror.test.js` | 2 |
| `test/performance-lazyload.test.js` | 1 |
| `test/phase12a-security-remediation.test.js` | 1 |
| `test/phase13-pilot-gating.test.js` | 2 |
| `test/phase32-account-nutrition-journal.test.js` | 1 |
| `test/render-mode-production-repair.test.js` | 1 |
| `test/retention-journey-wizard.test.js` | 1 |
| `test/runtime-url-cleanup.test.js` | 1 |
| `test/stepping-into-greatness-dashboard.test.js` | 1 |
| `test/stepping-into-greatness-static-build.test.js` | 1 |
| `test/timed-workout-progression.test.js` | 1 |
| `test/workout-canonical-presentation-wiring.test.js` | 1 |
| `test/workout-coach-runtime.test.js` | 1 |
| `test/workout-presentation-state.test.js` | 4 |
| `test/workout-render-mode-interaction.test.js` | 2 |

## Required independent and human review

1. Review the compiler's coordinate conversion, rest-pose restoration, generic loader and async cancellation handling. Confirm that #604's automatic reference-avatar recovery still works.
2. In the deployed Motion Lab: Initialize Runtime → Start Session → load either avatar → Load Synthesized Squat v1 → Play. Observe at least two complete loops, then exercise Pause/Resume/Stop/Restart, switch to push-up and back, and Dispose/reinitialize.
3. A human must judge pelvis descent/backward travel, bilateral knee flexion, feet, bottom depth, return to standing, arm posture, sliding and overall movement naturalness. The automated engineering bound does not approve these criteria. The current depth is intentionally partial.
4. On a physical target phone, open Dashboard → Movement Capture Studio. Use the existing camera/MoveNet flow to record distinct Front and Side takes. Save, reload and export them; inspect the tags and pose checkpoints. Check quota behavior and complete all eight paired tasks before calling Foundation 8 captured.
5. Record human and physical-device decisions through the authenticated Admin readiness UI/API. Keep biomechanical, coaching/scoring and production-motion acceptance unproven until the required review exists.

No production motion-registry entry, camera loop, MoveNet detector, retargeting system, animation binary or second renderer was added. This repair is a reviewable PR; merging, deployment and human acceptance are separate steps.

Readiness task: `avatar-development-motion-lab-lego-integration-repair` on board `avatar`. Correlated evidence also applies to the canonical runtime foundation, bone-name verification, rest-pose/calibration, motion recorder, saved motion data format and browser QA cards. Their existing acceptance criteria remain unchanged.
