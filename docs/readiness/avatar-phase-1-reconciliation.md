# Avatar Development Phase 1 reconciliation

This is the authoritative 2026-08-30 repository and human-evidence reconciliation. “Human evidence” records only the supplied observations; it is not a blanket acceptance.

| Card ID | Old status | Effective status | Implementation / automated evidence | Human evidence / remaining blocker | Dependencies | Priority |
|---|---|---|---|---|---|---|
| `avatar-runtime-foundation-avatar-asset-runtime-foundation` | IN_PROGRESS | **DONE** | public/avatar-runtime.js; test/avatar-runtime-v15.test.js; Automated: PASS | Avatar runtime asset loading, lifecycle, and disposal are covered by repository tests. | None | NORMAL |
| `avatar-runtime-foundation-avaturn-skeleton-profile-verification` | IN_PROGRESS | **DONE** | public/motion/avaturn-live-pose-solver.js; test/avaturn-live-pose-solver.test.js; Automated: PASS | Avaturn skeleton profile and aliases are verified programmatically. | None | NORMAL |
| `avatar-runtime-foundation-runtime-bone-name-verification` | IN_PROGRESS | **DONE** | public/avatar-runtime.js; test/avatar-live-runtime-proof.test.js; Automated: PASS | Runtime bone resolution is exercised by automated proof. | None | NORMAL |
| `avatar-pose-pipeline-movenet-pose-event-payload-audit` | IN_PROGRESS | **DONE** | public/pose-runtime.js; PR #565; Automated: PASS | Machine: pose payload tests pass. Human-provided iPhone observation: WebGL, MoveNet SinglePose Lightning, about 28–40 ms, about 20 FPS, zero observed failed inference frames. | None | CRITICAL |
| `avatar-pose-pipeline-normalized-pose-mapping` | IN_PROGRESS | **DONE** | public/motion/normalized-pose.js; test/normalized-pose.test.js; PR #560; Automated: PASS | Normalized full-rig mapping has automated coverage. | None | CRITICAL |
| `avatar-pose-pipeline-rest-pose-calibration-handling` | IN_PROGRESS | **BLOCKED** | public/motion/avaturn-live-pose-solver.js; PR #561; PR #567; Automated: PASS | Human-provided iPhone observation: successful neutral lock corrected head and torso lean; calibration required one refresh and lacks an explicit visible/voice 3-2-1 flow. Blocker: Explicit neutral-position calibration UX and reliable retry remain incomplete. | None | CRITICAL |
| `avatar-live-mirror-one-arm-live-mirror-proof` | HUMAN_TEST_REQUIRED | **HUMAN_TEST_REQUIRED** | public/motion/live-avatar-mirror.js; test/live-avatar-mirror.test.js; Automated: PASS | Human-provided iPhone observation: arms respond to movement. Human acceptance has not been separately signed off. | None | HIGH |
| `avatar-live-mirror-full-live-avatar-mirror` | HUMAN_TEST_REQUIRED | **BLOCKED** | public/motion/live-avatar-mirror.js; public/motion/avaturn-live-pose-solver.js; PR #566; Automated: PASS | Human-provided iPhone observation: arms, legs, head, calibrated torso lean, smoothing, and tracking-loss recovery respond. Jump root, floor/push-up transitions, and 360 spin are not accepted. Blocker: Jump root behavior and floor/push-up/spin acceptance remain outstanding. | None | CRITICAL |
| `avatar-live-mirror-smoothing-stability` | IN_PROGRESS | **HUMAN_TEST_REQUIRED** | public/motion/live-avatar-mirror.js; PR #567; Automated: PASS | Human-provided iPhone observation: smoothing substantially improved and weak-tracking disappearance recovery was repaired; final human acceptance remains. | None | HIGH |
| `avatar-motion-recording-motion-recorder` | BACKLOG | **BACKLOG** | Not evidenced; Automated: NOT_RUN | None recorded | None | NORMAL |
| `avatar-motion-recording-saved-motion-data-format` | BACKLOG | **BACKLOG** | Not evidenced; Automated: NOT_RUN | None recorded | None | NORMAL |
| `avatar-motion-recording-motion-source-manifest` | BACKLOG | **BACKLOG** | Not evidenced; Automated: NOT_RUN | None recorded | None | NORMAL |
| `avatar-fixtures-registry-phase-4-fixture-builder` | IN_PROGRESS | **DONE** | scripts/motion/build-motion-fixture.js; test/motion-fixture-builder.test.js; Automated: PASS | Fixture builder has automated coverage. | None | NORMAL |
| `avatar-fixtures-registry-fixture-validation` | IN_PROGRESS | **DONE** | scripts/motion/validate-motion-fixture.js; test/motion-fixture-builder.test.js; Automated: PASS | Motion fixture validation has automated coverage. | `avatar-fixtures-registry-phase-4-fixture-builder` | NORMAL |
| `avatar-fixtures-registry-registry-integration` | IN_PROGRESS | **DONE** | scripts/motion/lib/motion-manifest.js; test/motion-registry.test.js; Automated: PASS | Motion registry integration has automated coverage. | `avatar-fixtures-registry-fixture-validation` | NORMAL |
| `avatar-fixtures-registry-recorded-motion-playback` | BACKLOG | **BACKLOG** | Not evidenced; Automated: NOT_RUN | None recorded | `avatar-motion-recording-motion-recorder`, `avatar-motion-recording-saved-motion-data-format`, `avatar-motion-recording-motion-source-manifest`, `avatar-fixtures-registry-registry-integration` | NORMAL |
| `avatar-acceptance-mobile-browser-qa` | HUMAN_TEST_REQUIRED | **IN_PROGRESS** | Not evidenced; Automated: NOT_RUN | Human-provided iPhone session proves the authenticated board and live pose pipeline operated; comprehensive mobile/browser acceptance is not recorded. | `avatar-live-mirror-full-live-avatar-mirror` | HIGH |
| `avatar-acceptance-physical-device-acceptance` | HUMAN_TEST_REQUIRED | **BACKLOG** | Not evidenced; Automated: NOT_RUN | Partial iPhone observations are recorded on applicable cards. Jump, floor, push-up, and spin are not accepted. | `avatar-acceptance-mobile-browser-qa` | HIGH |
| `avatar-acceptance-privacy-camera-handling-verification` | HUMAN_TEST_REQUIRED | **BACKLOG** | Not evidenced; Automated: NOT_RUN | None recorded | `avatar-acceptance-mobile-browser-qa` | NORMAL |
| `avatar-acceptance-final-avatar-motion-launch-gate` | HUMAN_TEST_REQUIRED | **BACKLOG** | Not evidenced; Automated: NOT_RUN | None recorded | `avatar-acceptance-physical-device-acceptance`, `avatar-acceptance-privacy-camera-handling-verification`, `avatar-fixtures-registry-recorded-motion-playback` | CRITICAL |

## Project pointers and totals

- **CURRENT:** `avatar-live-mirror-full-live-avatar-mirror`
- **NEXT:** `avatar-live-mirror-one-arm-live-mirror-proof`
- **LAST COMPLETED:** `avatar-fixtures-registry-registry-integration`
- **Counts:** BACKLOG 7; IN_PROGRESS 1; BLOCKED 2; HUMAN_TEST_REQUIRED 2; DONE 8; POST_LAUNCH 0; REMAINING 12; TOTAL 20.
