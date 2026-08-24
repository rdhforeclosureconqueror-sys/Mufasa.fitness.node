# Push-Up Challenge product motion preview architecture

## A. Current Push-Up Challenge architecture

The canonical page is `public/push-up-challenge.html`, with public redirects from
`/push-up-challenge` and `/pushup-challenge`. The route authorization contract
classifies those redirects as public and not membership-gated. The page currently
contains an inline SVG stick figure in `#movementPreview`, inline responsive styles,
and the product controls and status copy around it.

`public/guided-exercise-sequence.js` owns the existing two-position instructional
preview. It derives steps from the exercise sequence registry, cycles them while
idle, pauses for reduced-motion/visibility, accepts the live expected phase from
`ChallengeController`, and exposes pause/resume/dispose behavior. It changes SVG
state only; it is not a Three.js viewer.

`public/push-up-challenge-page.js` is the camera product composition root. It loads
MoveNet independently, owns camera capture and overlay sizing, gates Practice and
Challenge on camera/tracking readiness, connects the challenge controller to the
guided sequence player, records repetitions, renders supported feedback, and stops
camera resources on `pagehide`. Nothing in the motion preview may become an input
to this controller, its repetition engine, or its start-button readiness predicate.

## B. Current Motion Engine pieces available

Reuse these pieces without copying them into page code:

* `public/motion/shared3d-loader.js`: local Three.js and GLTFLoader loading plus a
  WebGL capability probe.
* `public/motion/disposable-motion-session.js`: the renderer, scene, camera,
  animation mixer, sole RAF, asset loading, native binding inspection, playback,
  resize/visibility hooks, resource disposal, and ownership diagnostics.
* `DisposableMotionSession.loadExtractedAnimation`: independently loads the
  fixture, chooses the named clip, enforces profile/skeleton compatibility,
  requires exactly the declared track count, rejects any unbound track, creates
  the action on the avatar root, and never adds the fixture scene to the renderer.
* `public/vendor/three/**`: the pinned local browser runtime.
* The immutable source avatar
  `exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb`.
* The independent fixture
  `public/motion/assets/exercises/push-up/avaturn-push-up-animation.glb` and its
  provenance JSON.
* The registry shapes in `public/motion/avatar-profiles.js` and
  `public/motion/avaturn-push-up-fixture.js`, after separating product records from
  development records and replacing development URLs/flags.

The proven product pairing is exact: avatar profile
`avaturn-personalized-candidate`, skeleton `avaturn-native-v1`, motion
`push_up/avaturn_native_v1`, fixture `avaturn-push-up-animation`, clip
`avaturn_push_up_native_v1`, duration `1.5333333015441895`, and binding acceptance
`40 intended / 40 bound / 0 unbound`.

## C. Gap between Motion Lab and product page

There is no product composition layer which resolves IDs, creates one disposable
session, loads avatar then fixture, validates the acceptance result, frames the
exercise, maps friendly UI controls to playback, and turns every failure into an
instruction-only fallback. `motion-viewer.js` is only a primitive runtime test and
adds developer copy. `MotionViewerBoundary` is an opt-in generic lazy-loading proof
whose descriptor contains only `exerciseId`; it cannot express or verify this
avatar/fixture contract. The current profile and fixture URLs are Motion Lab-gated,
and both records are marked development-only. Therefore the page cannot safely use
the proven assets merely by importing current registries.

## D. Recommended product motion preview architecture

Add a small, reusable `ProductMotionPreview` controller. It is a product adapter,
not a second renderer and not a copy of Motion Lab:

```text
exercise product page
  -> ProductMotionPreview contract/controller
     -> product avatar registry + product motion fixture registry
        -> shared3d-loader -> DisposableMotionSession -> Three.js/GLTFLoader
```

Public API:

```js
ProductMotionPreview.create({
  container,
  avatarProfileId,
  motionId,
  fixtureId,
  autoplay = true,
  loop = true,
  cameraPreset = "exercise-side",
  expectedBindings, // { intended: 40, bound: 40, unbound: 0 }
  onStatus = () => {},
  onError = () => {}
})
// -> { mount(): Promise<Result>, play(), pause(), resume(), dispose(), getStatus() }
```

`create` must be side-effect free. `mount` performs capability detection, lazily
acquires dependencies, resolves registry records, verifies IDs and matching skeleton
profiles before any fixture request, starts exactly one session, loads one avatar,
loads the extracted fixture, verifies the returned diagnostic tuple, applies a side
or slightly elevated side camera preset, enables looping, and only then autoplays.
It must be idempotent or reject a duplicate mount without creating another session.

The adapter owns a monotonically increasing generation/abort token so late loader
completion after failure/unmount is ignored and its resources disposed. It returns
stable product statuses (`idle`, `loading`, `ready`, `playing`, `paused`, `failed`,
`disposed`) and stable failure codes, but does not expose GLTF, mixer, action,
PropertyBinding, or lab diagnostic objects to the page.

The first camera preset must use the animated avatar's motion envelope rather than
only its rest-pose bounds where practical; otherwise use the existing camera fit
with enough landscape/mobile padding to keep hands and feet visible throughout the
clip. Pixel ratio remains capped by the disposable runtime. No orbit controls,
diagnostic tables, anatomy, or lab buttons are included.

Keep the existing sequence phase text/list as the accessible instructional layer.
The 3D canvas supersedes the SVG visual. The existing pause button should control
both the sequence player and `ProductMotionPreview`; on session start the preview
may pause (preferred to reduce concurrent mobile work), but it must not follow
camera landmarks or gate the session. On session finish it may resume if it was
autoplaying before the session. `prefers-reduced-motion` initializes the preview
loaded but paused and requires an explicit Play action.

## E. Data flow

1. The Push-Up page passes only IDs, product options, a DOM container, and status
   callbacks to the adapter.
2. The adapter resolves `avaturn-personalized-candidate` from the product avatar
   registry and resolves (`push_up/avaturn_native_v1`,
   `avaturn-push-up-animation`) from the product fixture registry.
3. It rejects missing records, a motion/fixture mismatch, different skeleton
   profiles, or a fixture whose compatible profile differs from the selected avatar.
4. It creates and starts one `DisposableMotionSession` in the container.
5. It calls `loadAvatar(profile)`. The source GLB's embedded
   `avaturn_animation` is inventoried by the loader but is never selected and never
   receives an action.
6. It calls `loadExtractedAnimation(fixture)`. That method reads only the named clip
   from the independent GLB, binds it to the existing avatar mixer/root, and does not
   add `fixtureAsset.scene` to the Three.js scene.
7. The adapter accepts readiness only if diagnostics identify all requested IDs and
   report intended 40, bound 40, unbound 0. It sets repeat looping and plays.
8. Status callbacks update only preview UI. Camera initialization continues on its
   existing independent path regardless of preview status.

## F. Lifecycle flow

`DOMContentLoaded -> create -> mount -> capability probe -> session.start ->
loadAvatar -> loadExtractedAnimation -> validate -> setLoop(true) -> play`.

The product adapter owns its abort controller, load generation, visibility/page
listeners, ResizeObserver (if the low-level runtime does not already cover the
container), and the one low-level session. The low-level session exclusively owns
Three.js objects, canvas/context, RAF, mixer/action/clock, loaded GLTF references,
and GPU resources. The page owns only the adapter and calls `dispose` once.

On `document.hidden`, stop the RAF and pause playback while remembering whether it
was playing. On visible, resume only when it was previously playing, no workout is
active, and reduced motion does not prohibit autoplay. On `pagehide` or navigation,
abort pending loads, disconnect observers/listeners, stop playback, and dispose the
session. Disposal is idempotent. Page teardown must also keep the existing camera
stop and overlay observer cleanup.

## G. Failure / fallback flow

Every unsupported-capability, dependency, timeout, HTTP, parse, registry,
compatibility, track-count, binding, renderer, or runtime failure follows one path:
abort the attempt, dispose any partial session, remove its canvas, mark the preview
failed, retain the instructional phase text, and show: **“3D demonstration is
unavailable right now. Camera training is still available.”** A retry action is
optional but, if shown, creates a completely fresh bounded attempt.

Failure must not mutate `engineReady`, `cameraActive`, `lastFrame`, challenge/session
state, repetition counts, or Practice/Challenge disabled logic. The fallback may
retain the existing SVG only as a temporary no-WebGL/failure fallback during this
first integration; successful 3D readiness hides/removes the SVG so exactly one
avatar visual is presented. A preview failure is never promoted to a page-level
exception and never disables camera controls.

## H. Exact files to reuse

* `public/motion/shared3d-loader.js`
* `public/motion/disposable-motion-session.js`
* `public/vendor/three/build/three.module.js`
* `public/vendor/three/examples/jsm/loaders/GLTFLoader.js`
* `exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb`
* `public/motion/assets/exercises/push-up/avaturn-push-up-animation.glb`
* `public/motion/assets/exercises/push-up/avaturn-push-up-animation.provenance.json`
* `public/guided-exercise-sequence.js` (phase text/state contract; only minimal
  coordination additions if necessary)
* `public/push-up-challenge.js`, `public/push-up-sequence-engine.js`,
  `public/challenge-controller.js`, and `public/pose-runtime.js` unchanged.

## I. Exact files to create

* `public/motion/product-avatar-profiles.js`: immutable product-safe avatar records;
  initially the single proven Avaturn profile with a product asset URL and no
  development-only semantics.
* `public/motion/product-motion-fixtures.js`: immutable registry keyed by motion and
  fixture IDs; initially the exact independent native Avaturn fixture contract.
* `public/motion/product-motion-preview.js`: the product-facing controller described
  above, including lazy dependency loading, orchestration, lifecycle, status, and
  friendly failures.
* `test/product-motion-preview.test.js`: unit/contract/lifecycle tests with fake
  loader/session/DOM dependencies.
* `test/push-up-product-motion-integration.test.js`: static route/page isolation and
  camera non-regression contract tests.

Do not duplicate the avatar binary. Serve the immutable source through an explicit
allowlisted route. Continue using the already published independent fixture binary.

## J. Exact files to modify

* `public/push-up-challenge.html`: replace the successful visual surface with a
  labelled 3D container, retain a hidden/fallback SVG if desired, add loading/status
  semantics, mobile-safe dimensions, and load the three product motion modules.
* `public/push-up-challenge-page.js`: create/mount the preview independently, bridge
  the existing preview toggle and session begin/end pause policy, and dispose it in
  the existing `pagehide` cleanup. Do not add it to `controls()` readiness.
* `public/motion/disposable-motion-session.js`: make profile eligibility explicit
  and product-neutral (replace the current development-only flag test with an
  accepted runtime-profile contract), expose a safe render-loop suspend/resume or
  guarantee that visibility pause can preserve playback intent, and add the named
  side-view framing preset without weakening existing disposal/binding checks.
* `server.js`: add an allowlisted product avatar asset GET route before static
  handling, independent of `motionLabGate`, with explicit cache/content/security
  headers and no arbitrary path parameter traversal.
* `config/route-authorization-contract.js`: declare the new asset route with the
  same audience as the consuming challenge page.
* Existing focused tests in `test/disposable-motion-session.test.js`,
  `test/push-up-challenge-mvp.test.js`, and route authorization tests: extend their
  expectations without deleting current camera and lifecycle assertions.

Do not repurpose `public/motion/avatar-profiles.js` or
`public/motion/avaturn-push-up-fixture.js` in place: Motion Lab tests currently
depend on their development URLs/semantics. A later cleanup can unify records behind
audience-specific URL resolution after product integration is proven.

## K. Dev-only code that must not move into product

Do not import or copy `motion-lab/**`, Motion Lab bootstrap/runtime/HTML/CSS,
`MotionViewerBoundary`'s lab adapter usage, Phase E assets/spec/compiler, fake
viewer, diagnostic event history/readiness/session cookie flow, admin launch
handshake, avatar selectors, embedded-native-clip controls, track tables, ownership
tables, 50-cycle UI controls, or developer wording. Product playback must never call
`loadNativeAnimation`; that embedded clip remains proof/source inventory only.

## L. Asset route / auth analysis

The fixture file is beneath `public/` and is currently reachable through generic
`express.static` at its physical `/motion/assets/exercises/...` path, but its
registry points at the cookie-gated `/dev/motion-lab-avatar-assets/...` alias. The
source avatar is outside `public/` and is available only through that same
Motion-Lab-gated route. Motion Lab is default-off/fail-closed and requires its own
short-lived admin session, so those URLs are categorically unsuitable for a product
page.

The challenge route is currently public and not membership-gated. Consequently its
browser-loaded GLBs must either be public too or the product route itself must first
be changed to a member route with a supported same-origin asset credential design.
For the minimum integration, add a product-specific, exact allowlist route for the
avatar and register it as public to match the current page. Before deployment, the
product owner must explicitly approve public distribution of this personalized
avatar binary; if it is member-private, that approval is a release blocker and both
page and asset authorization must be designed together. Do not silently expose it
through generic static middleware, do not reuse `motionLabGate`, and do not place
bearer tokens in asset URLs. The non-sensitive independent fixture can retain its
existing public physical URL, although documenting it in the route contract is
recommended.

## M. Test plan

1. Successful mount: fake capability/loader/session resolves; status becomes playing.
2. Registry selection: exact Avaturn profile is passed to `loadAvatar`.
3. Fixture selection: exact motion/fixture/clip record reaches
   `loadExtractedAnimation`; `loadNativeAnimation` is never called.
4. Incompatible pairing: reject before fixture fetch/action; dispose; friendly
   fallback; camera bootstrap still runs.
5. Binding invariant: accept exactly 40/40/0; reject 39 intended, 39 bound, or any
   unbound result.
6. Loop: assert `setLoop(true)` precedes play and remains enabled across resume.
7. Pause/resume: product toggle and reduced-motion behavior preserve correct state.
8. Single root: runtime ownership reports one avatar root/scene avatar object.
9. Fixture scene: assert it is never a child of the rendered scene.
10. Visibility: hidden stops RAF/pauses; visible conditionally resumes once.
11. Teardown: pending loads abort; navigation/unmount removes canvas/listeners/RAF,
    releases action/mixer/roots/GLTF references; repeated dispose is harmless.
12. Failure isolation: inject capability, avatar, fixture, binding, and runtime
    failures and assert camera enable/retry and training remain usable.
13. Start regression: existing Practice/Challenge readiness predicates and start,
    observe, finish, summary, and personal-best paths remain unchanged.
14. Mobile: zero/late container sizing does not throw; resize/orientation refits;
    DPR is capped; full motion remains framed at narrow widths.
15. Route/auth: Motion Lab disabled still leaves product asset available according
    to the public route contract; arbitrary names/traversal return 404; dev aliases
    remain gated; cache and GLB content type are asserted.
16. Run `node --test test/product-motion-preview.test.js
    test/push-up-product-motion-integration.test.js
    test/disposable-motion-session.test.js test/push-up-challenge-mvp.test.js
    test/push-up-sequence-engine.test.js test/motion-lab.test.js` and then the full
    `npm test` suite.

## N. Copilot implementation contract

**Branch:** `feature/push-up-product-motion-preview`

Implement only files listed in I/J and follow this order:

1. Add audience-specific product registries with the exact IDs and 40-track
   invariant above. Do not alter or alias the development registries.
2. Generalize only the eligibility and camera/visibility seams required in
   `DisposableMotionSession`; retain native `PropertyBinding` checks, one avatar,
   fixture-scene exclusion, the sole RAF, abort behavior, and complete disposal.
3. Implement `ProductMotionPreview.create` with the exact API and state/failure
   rules in D. Dependency/session factories must be injectable for deterministic
   tests. Do not expose Three.js objects through its public API.
4. Add the explicit product avatar route and authorization declaration. Keep all
   Motion Lab gates unchanged. Confirm product-owner approval before treating the
   personalized binary as a public production asset.
5. Wire the challenge page. Initialize preview and pose engine as sibling paths.
   Preview callbacks may update only preview DOM. Never use preview readiness in
   camera controls, repetition counting, sequence matching, persistence, Practice,
   or Challenge gating.
6. Use only `loadExtractedAnimation(productFixture)` for normal playback. Assert
   diagnostic identity and 40 intended/40 bound/0 unbound before calling play.
7. Coordinate the existing pause button, reduced motion, session pause, visibility,
   resize/orientation, and page teardown. Preserve phase text and accessible fallback.
8. Add every test in M. Keep current camera, thresholds, auth, Motion Lab, and 50
   lifecycle tests green.

Explicit non-goals: Stage 4 retargeting, Phase E/M1 changes, MoveNet-to-avatar
mirroring, camera-to-preview data flow, anatomy, avatar selection UI, exercise-page
redesign, new pose assessments, or changes to challenge scoring/storage.

Acceptance requires: one visible avatar; no rendered fixture root; independent
fixture only; exact compatible IDs; 40/40/0; looping plus pause/resume; hidden-page
throttling; clean unmount; useful mobile side view; and camera challenge operation
under every preview failure.

## O. Safe to hand to Copilot

**YES**, as an implementation architecture. Production deployment remains contingent
on explicit approval to serve the personalized avatar to the same public audience as
the current challenge page (or, alternatively, a separately reviewed member-auth
design for both page and asset).
