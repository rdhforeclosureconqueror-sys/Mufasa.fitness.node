# PR 764 repository regression root-cause audit

Date: 2026-09-10  
Repair head tested: `ebc95ceea89ad284a946bfc619545c88cd2bee9c`  
Main baseline tested: `6140f06dcc99c8fbff30cb35a8407b3335a9691b` (the direct parent of the repair commit and the locally fetched `main` recorded in `.git/FETCH_HEAD`)  

`origin/main` was not configured in this checkout and GitHub access returned HTTP 403. The audit therefore used a detached worktree at the exact parent/main SHA rather than mutating the repair branch. Every failing file below failed independently at both SHAs. No failure was introduced by PR 764.

## Full-suite inventory

The full run emitted 922 passing top-level tests and 18 failing top-level tests before the Node test process remained open. The open-process boundary is itself a test-harness problem; no final TAP total was emitted. Running the ten owning files independently reproduced all 18 failures on both repair head and main.

| # | Test | File | System | Expected | Actual / first failure | Classification |
|---|---|---|---|---|---|---|
| 1 | Extraction OS contains product, delivery, market, and Voice-of-the-People gates | `test/admin-extraction-os.test.js` | Extraction OS | phrase in JS | phrase is in HTML, not JS | D: broken assertion, pre-existing on main |
| 2 | Extraction OS keeps human-required readiness under human authority | same | Extraction OS | exact prose in HTML | prose absent; runtime `effective()` still preserves the human gate | D: prose assertion drift, pre-existing |
| 3 | guided calibration performs settle, 3-2-1-hold, capture, then ready | `test/avatar-body-follow-root-motion.test.js` | Avatar calibration | synchronous `SETTLING` | state remains `BODY_FOUND` until the asynchronous speech cue resolves | D/C: test did not await the intentional speech owner; pre-existing |
| 4 | avatar calibration exclusive speech lock | `test/avatar-calibration-exclusive-speech-lock.test.js` | Coach/avatar voice | `startListening` and conversation-owned channel | current exclusive owner unlocks audio without starting competing recognition and uses `avatar-calibration` | C/D: behavior changed in exclusive-owner work; assertions were not updated |
| 5 | avatar calibration uses a serialized speech arbiter | `test/avatar-calibration-speech-arbitration.test.js` | Coach/avatar voice | source-format regex | implementation contains the serialized promise tail, but formatting differs | D: brittle source assertion |
| 6 | Motion Lab readiness handshake survives the new-window listener race | `test/avatar-integration-recovery.test.js` | Motion Lab launch | one constant named `FRONTEND_ORIGIN` | allowlisted production/current/configured origins with exact membership check | D: stale security-source regex |
| 7 | profile reload and avatar activation are awaited only after server-confirmed profile save | `test/avatar-modal-controls.test.js` | Avatar upload | unconditional literal `ACTIVE` diagnostic | runtime now proves renderer/scene/camera/render-loop and reports `MOUNTED, NOT ACTIVE` when proof is incomplete | D: obsolete expectation that would weaken runtime truth |
| 8 | public billing plan returns backend configured official price label | `test/billing-api.test.js` | Billing | old single plan name | current recommended tier is `PocketPT Performance` | D: stale single-plan expectation |
| 9 | membership page uses Stripe Embedded Checkout and does not include raw card inputs | same | Billing | old `/api/billing/checkout-session` route string | current tier-aware `/api/billing/tier-checkout-session`; embedded checkout remains | D: stale endpoint expectation |
| 10 | 50 complete push-up spec lifecycles... | `test/disposable-motion-session.test.js` | Generated Motion | compile and dispose | mock `Object3D` lacks `getWorldPosition`; compiler stops first at that missing Three.js fixture API | E/C: stale fixture after body-surface solver |
| 11 | 50 personalized profile cycles... | same | Motion lifecycle | zero counters | prior test leaked one session after #10 threw before disposal | E: cascading fixture failure |
| 12 | 50 complete native Avaturn playback lifecycles... | same | Motion lifecycle | zero counters | same leaked session | E: cascading fixture failure |
| 13 | 50 extracted-fixture control lifecycles... | same | Motion lifecycle | zero counters | same leaked session | E: cascading fixture failure |
| 14 | profile requires explicit profile-use permission | `test/free-run-club-community-phase1.test.js` | Run Club | service assertion | fixture calls removed `store.createUser` API | E: obsolete repository fixture |
| 15 | board posts expire after 24 hours | same | Run Club | expiry assertion | same fixture setup failure | E: cascading fixture failure |
| 16 | photo posts require intentional photo permission | same | Run Club | consent assertion | same fixture setup failure | E: cascading fixture failure |
| 17 | diagnostic reports earliest failed boundary | same | Run Club | diagnostic assertion | same fixture setup failure | E: cascading fixture failure |
| 18 | Free Run Club UI uses a real image file picker and explicit post status | `test/free-run-club-community-phase3.test.js` | Run Club UI | explicit JPEG/PNG/WebP accept list | intentional `accept="image/*"` for iOS library/camera chooser | D: obsolete assertion |

## Proven boundaries

### Arena / PR 764

Last known good main is `6140f06`; repair head is `ebc95ce`. The Arena, camera, diagnostics, calibration, and GO_TO_MAT focused suite passes at repair head. All ten failure-owning files above produce the same failure status at both SHAs. **PR 764 introduced none of the inventory.**

### Avatar calibration exclusive voice

- Last known good for `test/avatar-calibration-exclusive-speech-lock.test.js`: `79f1b2f` (parent of the change).
- First known bad and introducing commit: `8e6b172` (`Make avatar calibration the exclusive voice owner`).
- Introducing PR: #665 (merge `fd95f80`).
- Changed owner: `public/motion/live-avatar-mirror.js`.
- Root cause: the intentional exclusive calibration owner changed the listening/channel contract while the older test retained the previous conversation-owned expectations. This is not evidence that serialization disappeared; the arbiter still chains `this.tail`.

### Motion Lab opener-origin handshake

- Last known good for `test/avatar-integration-recovery.test.js`: `d7c3b06` (parent).
- First known bad and introducing commit: `94d1ffa` (`Fix Motion Lab desktop opener origin handoff`).
- Introducing PR: #733 (merge `5ba14d2`).
- Changed file: `motion-lab/motion-lab-launch.js`.
- Root cause: production/current/configured origins became an allowlist and the old test continued to demand the removed `FRONTEND_ORIGIN` source spelling. Runtime still checks `event.source`, message type, and exact allowlist membership. This is test drift, not a weakened origin boundary.

### Generated Motion disposable-session fixture

- Last known good for the precise failing lifecycle assertion: **not proven**; the test has other historical failures before the body-surface change.
- First commit proven to introduce the current `getWorldPosition` first failure: `82903db` (`Validate generated body-surface support planes`).
- Introducing PR: #759 (merge `5d7d267`).
- Changed file: `public/motion/motion-spec-clip.js`.
- Root cause: the production compiler correctly began using real Three.js world transforms, but `test/disposable-motion-session.test.js` kept an incomplete `Object3D`/`Vector3` double. The first thrown test never disposes its session, producing failures 11–13 as fallout. A separate fixture-only repair should add faithful `getWorldPosition`, `worldToLocal`, `copy`, and vector operations, then prove all four lifecycle cases independently.

### Extraction OS

The two assertions fail in their introducing test commit `ec1c6c1`; no passing predecessor containing those tests exists. The first assertion searches JS for prose placed in HTML, and the second requires exact explanatory prose rather than the operative `effective(card)` human gate. Last known good: **not proven**. Classification: broken tests from introduction, not a newly reverted product path.

### Billing, Run Club, avatar activation

These files enter the available ancestry as part of merge `a2cf838` (PR #617) already containing mismatched tests and implementations. A last-good state is **not proven from the available ancestry**. Current behavior shows coherent multi-tier billing and tier checkout, an iOS-compatible image chooser, canonical user-store APIs, and evidence-based avatar activation; their failures are stale assertions/fixtures rather than PR 764 changes. Repair them in system-specific PRs, not in PR 764.

## Motion Lab and generated-motion end-to-end audit

The current Yoga chain is:

`Yoga pose description -> generation request -> Motion Spec generated event -> runtime compilation -> active motion diagnostics -> Play enabled -> registry upsert -> localStorage list -> selection -> Coach Avatar load -> compile -> selected-motion verification -> Play`.

The registry deliberately refuses to save an intermediate draft. It persists only when the generated motion ID is the active diagnostic selection and Play is enabled. On reload it validates the serialized spec, loads the personalized avatar, recompiles, and again requires an enabled Play control before reporting ready.

The source-contract persistence tests pass. Chair Pose normalization tests pass. Several older stationary-lunge/squat tests fail because they assert superseded v2/v3 identifiers while current implementation is v5/phase-first. Those failures are test drift unless a runtime behavioral test proves the newer contract unusable.

**Mountain Pose saved demo remains NOT VERIFIED.** The repository has a Mountain description and the generic registry chain, but there is no Mountain-specific executable test that proves `GENERATED -> SAVED -> DISCOVERABLE -> PLAY ENABLED -> PLAYBACK`. The first unverified boundary is actual generated Motion Spec activation (`motionDiagnostics` contains Mountain's ID while Play is enabled); persistence intentionally waits at this boundary and reports FIRST FAILURE after 12 seconds.

## Debug consolidation audit

Producer/authority separation is implemented for Mirror Motion and Arena. The remaining visible violations are:

- `public/free-run-club.html`: permanent inline “Run Club Debug · First Failure”; no Close or Copy All.
- `public/greatness.html`: multiple always-visible `<details>` diagnostic producers without one consolidated authority or Copy All.
- `public/workout.html`: multiple developer diagnostic panels and the avatar overlay; role gating limits exposure, but no single cross-producer authority is proven.
- `public/dashboard.html`: several separate operational diagnostic launch/results areas; no one Copy All/Close/FIRST FAILURE authority.
- `public/admin-run-club-diagnostics.html`: standalone authority has partial copy support but no consolidated Copy All/Close/FIRST FAILURE contract.
- `public/admin-first-failure.html`: valid dedicated first-failure page, but no Copy All or Close control.

`public/push-up-challenge.html` has a hidden pose producer and is not counted as a competing visible authority by default. Useful producers must be retained when these pages are consolidated.

## Camera / pose pipeline

The focused camera suite passes explicit user action, `getUserMedia`, late permission cancellation, `video.srcObject`, `video.play()`, MoveNet initialization/disposal, BODY_DETECTOR, BODY_VISIBILITY, stale frame handling, pose calibration, and exercise-gate isolation. Real authenticated browser permission and physical-device execution were not performed.

## Recommended repair PRs

1. **Motion test-fixture parity**: repair Three.js doubles and add per-test cleanup so one compile failure cannot contaminate subsequent lifecycle assertions.
2. **Stale contract assertions**: separate PRs for Motion Lab opener allowlist, avatar exclusive voice, avatar activation proof, and current lunge/squat identities; replace source spelling checks with behavioral checks.
3. **Billing test modernization**: assert the three-tier catalog and `/tier-checkout-session`, retaining raw-card prohibition.
4. **Free Run Club fixture modernization**: use the canonical user-store creation API and preserve all consent/expiry behavior checks.
5. **Mountain Pose saved-demo closure**: add an executable end-to-end registry/playback test before claiming the feature complete.
6. **Page-by-page debug authority consolidation**: preserve each producer while adding one visible authority per page.
