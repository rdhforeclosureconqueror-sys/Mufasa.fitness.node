# PocketPT previous avatar system — forensic technical audit

**Audit date:** 2026-08-18  
**Posture:** forensics and architecture only; no production runtime, schema, catalog, or asset was changed.

## Evidence standard and material limitation

This audit inspected every reachable commit (`git rev-list --all`), path history, current avatar/pose/auth/boot/upload code, reports preserved in the initial repository snapshot, tests, and the asset audit completed earlier today. Conclusions use **ROOT CAUSE CONFIRMED**, **LIKELY CONTRIBUTING CAUSE**, and **NOT VERIFIED** literally.

The checkout contains only 211 reachable commits. Its first reachable commit, merge `14bbdb8`, has no application tree; `d37169d` (2026-07-28, “Add files via upload”) introduces the application as one 3,055-file snapshot. The snapshot contains reports dated April–May and references historical hashes (`abf8e8d`, `bfae3ec`, `845f9e2`, etc.), but none of those objects exists in this object database. Consequently, the actual avatar introduction, repair, quarantine, and alleged outage commits cannot be diffed. This is a **proven provenance gap**, not proof of an avatar root cause. Any report claiming an exact old failure commit from this checkout would be inventing evidence.

## 1. EXECUTIVE SUMMARY

The old system evolved from a keypoint-driven 2D procedural avatar into an authenticated user-avatar flow: Avaturn/provider metadata, `.glb` upload, profile persistence, local/vendor Three.js and `GLTFLoader`, GLB probing/mounting, skinned-mesh humanoid mapping, rest-pose capture, MoveNet pose retargeting, and a continuous WebGL overlay. Much of this lived in a giant inline workout shell before being partly delegated to `public/avatar-runtime.js`.

What survived is substantial but not a self-contained engine: the server feature gate and upload route, profile metadata, a vendored Three 0.158 module tree, a runtime facade/diagnostics, guarded loader/mount logic, bone/rest-pose routines, pose subscription, fallback behavior, and a large amount of load-bearing inline glue in `public/workout.html`.

**Overall root-cause finding: NOT VERIFIED.** The historical objects and incident logs required to identify why the application became unusable are absent. There is no reachable commit proving Three/WebGL/avatar code broke authentication or dashboard boot. The strongest evidence is architectural and contemporaneous documentation:

* the May pilot record says avatar/3D was deliberately quarantined by unavailable commit `bfae3ec` and kept disabled;
* the deprecation map calls the combined camera/avatar/pose/render-loop inline implementation “dangerous” and “load-bearing”;
* the current workout document still owns renderer creation, a perpetual animation frame loop, GLB pipeline bindings, camera/pose integration, and orchestration in thousands of lines of shared inline JavaScript;
* import failures are caught in the extracted runtime, renderer/model failures fall back, and the server now serves a disabled stub/default-off gate—strong evidence that isolation was the chosen stabilization response;
* saved avatar metadata hydration historically triggered model loading, coupling a persistent user-controlled asset to workout hydration, though not to login/dashboard.

**LIKELY CONTRIBUTING CAUSE:** excessive coupling and lifecycle ambiguity in the monolithic workout/camera/pose/avatar shell made a 3D exception, hung dependency/model operation, duplicate renderer/loop, or resource exhaustion capable of degrading the workout route. **NOT VERIFIED:** which of those occurred in the historical incident, or whether avatar caused rather than merely coincided with broader instability.

The surviving infrastructure is reusable only selectively. Reuse the feature-gate/fallback/diagnostic ideas and validation primitives; extract a lower-level loader rather than making the future Motion Engine depend on the legacy facade. Keep pose puppeting and upload paths isolated. Replace loop/listener lifecycle ownership and strengthen binary validation.

The new assets do not explain or cure the old instability. Mixamo-style FBXs supply a real 65-bone rig and one test animation, addressing the documented absence of a true 3D/retarget pipeline in April. Gym Muscle supplies semantic anatomy/highlighting. But its anatomy is unskinned, Draco support is absent from production, licenses need approval, and none of this fixes boot coupling, cleanup, GPU, deployment, or auth safety.

## 2. AVATAR IMPLEMENTATION TIMELINE

### Reconstructed historical stages (preserved evidence, commits unavailable)

| Stage/date | Commit | Files/capability | Core startup | Auth/dashboard | New dependency | Later reversal/isolation |
|---|---|---|---|---|---|---|
| Before 2026-04-23 | **NOT VERIFIED** | `public/index.html` historical procedural pose avatar; `runPoseLoop` produced MoveNet packets and selected camera/overlay/avatar-only rendering | Shared workout inline boot, yes | Profile/runtime adjacent; no evidence of login/dashboard dependency | TensorFlow/pose stack; Three not yet used by avatar according to preserved report | Procedural fallback survives |
| 2026-04-23 provider/profile stage | **NOT VERIFIED** | avatar modal, Avaturn popup, provider/model/thumbnail metadata, `PUT/GET /api/me/profile`, mode gating | Workout/profile hydration touched | Auth required for profile; no login bootstrap dependency proven | External provider popup/URLs | Later hidden/default disabled |
| 2026-04-23 upload stage | **NOT VERIFIED** | `POST /api/avatar/upload`, custom multipart parser, public file storage, GLB signature probe, GLTFLoader mount | Workout hydration could call asset load | Bearer auth on upload/profile only | Three/GLTFLoader and model files | Feature gate and fallback survive |
| 2026-04-23 live report | **NOT VERIFIED** | Report records metadata flow passing but true GLB+rig retarget rendering failing/not implemented | No | No dashboard failure recorded | No | Recommended next 3D phase |
| 2026-04-25–26 3D bootstrap | **NOT VERIFIED** | Preserved build label `avatar-runtime-bootstrap1`; live report says CDN/module checks passed | Avatar boot embedded in workout shell | Auth/profile mirrors remained in shell | Three module and GLTFLoader | Later vendored and lazy-loaded |
| 2026-05-06 extraction state | **NOT VERIFIED** | `pose-runtime.js`, runtime bridges and partial extraction; giant inline shell still owned Three canvas, mount, rig, loop and camera integration | Workout bootstrap/orchestrator touched | Reports explicitly say login shell did not eagerly load Three; auth/profile shell reduction unfinished | Local/vendor Three | Avatar extraction intentionally last because dangerous/load-bearing |
| Pilot Phase 1, before 2026-05-14 | `bfae3ec` **referenced, object unavailable** | server/UI/runtime quarantine behind `ENABLE_AVATAR_FEATURE` | Gate protects normal workout boot | Avatar hidden and route disabled; auth remains independent | Existing dependencies remain shipped | Default-off isolation is explicit |
| Locked pilot, 2026-05-14 | `845f9e2` **referenced, object unavailable** | pilot report records avatar disabled and rollback to quarantine | Core pilot passes static/backend checks | Login/dashboard included in core pilot | None added | Keep disabled |
| Repository import, 2026-07-28 | `d37169d` | Entire current app snapshot, including 738-line runtime, vendored Three, reports/tests | Current state only | Current state only | root `three@^0.158.0` | First diffable point |
| Runtime re-upload, 2026-07-28 | `d37169d` (path history; parent snapshot `14bbdb8`) | `public/avatar-runtime.js` first reachable blob | Conditional workout script | None shown | Dynamic local ESM imports | Current remnant |
| New assets, 2026-08-18 | `b21a065`, `c12892a`, `bd02e00` | imported/intermingled `exercise-generation/3dmode`: Gym Muscle, Gym MVP, FBXs/GLBs | No production integration | None | Nested demo dependencies only | Still quarantined |
| Asset audit, 2026-08-18 | `d2dae5f` | documents asset/runtime readiness and recommends isolation | No runtime change | None | None | Current architectural baseline |

### Smallest failure range

The only defensible range is **after the pre-3D procedural/provider stage and before quarantine commit `bfae3ec`**, approximately 2026-04-23 through early May, based on preserved reports. The exact first bad commit is **NOT VERIFIED** because every commit in that range is missing. `d37169d` cannot be called the entry commit; it imported an already-quarantined state months later.

## 3. FAILURE ENTRY POINT

* **First problematic commit:** `bfae3ec^..bfae3ec` cannot be used as an entry range; it is described as the *quarantine*. The predecessor range is missing. **NOT VERIFIED.**
* **First problematic code path:** likely the shared inline `public/workout.html` camera → pose loop → render mode → Three renderer/GLB/rig path. **LIKELY**, because preserved extraction reports explicitly describe it as dangerous/load-bearing and current code shows shared ownership.
* **Blast radius:** workout runtime/performance is **LIKELY**; authenticated profile hydration/model persistence is **POSSIBLE**; login, token restoration, protected-route routing, and dashboard boot are **NOT VERIFIED** as affected by avatar.
* **Confidence:** high that coupling was unsafe; low that it was the incident's causal mechanism.

## 4. ROOT CAUSE ANALYSIS

### Confirmed causes

**ROOT CAUSE CONFIRMED — historical diagnosability/provenance failure.** The repository history needed to diagnose the production incident was replaced by a bulk snapshot. Referenced repair/quarantine commits and their parents are unreachable. There are no preserved stack traces, browser profiles, WebGL context-loss logs, deployment manifests, or incident timestamps. This definitively prevents causal closure today; it is not the original outage cause.

**ROOT CAUSE CONFIRMED — current old architecture lacks an independent lifecycle boundary.** The workout page remains the owner of avatar canvas sizing, renderer creation and loop, pose/camera bindings, asset bindings and orchestrator callbacks. `AvatarRuntime` stores one anonymous global pose listener and exposes no unsubscribe/destroy API. This is a concrete architecture defect, whether or not it triggered the incident.

### Likely contributing causes

1. **LIKELY CONTRIBUTING CAUSE — monolithic inline coupling.** A large shared script mixed auth/profile hydration, camera, detector, pose, form/rep, canvas, avatar, trace harness and rendering. Extraction documentation calls those sections dangerous and load-bearing. A parse error or unguarded synchronous error in that shared script could prevent later workout initialization.
2. **LIKELY CONTRIBUTING CAUSE — incomplete lifecycle/cleanup.** The Three loop recursively schedules `requestAnimationFrame`; the pose runtime has its own frame loop. No public avatar destroy/unsubscribe path removes the anonymous `pose-runtime:frame` listener, cancels a renderer frame, disposes renderer/material/geometry/texture resources, or handles route/page lifecycle. Duplicate configuration is guarded only partially.
3. **LIKELY CONTRIBUTING CAUSE — persistent asset hydration.** Historical reports state backend profile hydration called `loadAvatarAssetForCurrentUser`. A malformed/missing user model could therefore fail repeatedly for that user. Current catches/fallback reduce the blast radius, but strict timeout/abort and full parser validation are absent.
4. **LIKELY CONTRIBUTING CAUSE — deployment-sensitive ESM graph.** CommonJS server/package coexists with browser dynamic ESM imports. Vendored `GLTFLoader.js` imports Three by relative paths and browser MIME/static routing must be correct. Diagnostics devoted many fields to import path, MIME, timeout and bridge failures, suggesting this was an operational pain point, though not proof of outage.
5. **LIKELY CONTRIBUTING CAUSE — mobile resource pressure.** Simultaneous camera inference, pose RAF, WebGL RAF, model parsing and full-resolution canvas are structurally high CPU/GPU/memory on phones. No visibility/context-loss/adaptive-FPS policy exists in the avatar facade.

### Investigated and ruled out as a confirmed root cause

* **Global eager Three on login:** current and preserved May contracts explicitly avoid eager Three in the login shell. Three loads only when the feature script is present and bootstrap/modal/render mode requests it. Not supported as root cause.
* **Avatar required for dashboard boot:** dashboard only displays diagnostics. No import/init dependency from dashboard/auth to `AvatarRuntime` was found. Not supported.
* **Missing Draco decoder:** the historical uploaded GLB path did not wire Draco, but no evidence says old uploads were Draco-compressed. It can explain individual model parse failure, not confirmed app failure.
* **Missing required bones:** mapper skips absent bones and pose routines guard missing points/bones. It can produce poor/no animation, but current evidence does not show a global crash.
* **Server-side Three execution:** browser modules are dynamically imported by browser code; server does not require Three loaders at boot. Not supported.
* **Service worker/hydration framework failure:** no avatar service-worker or React hydration integration exists in the production surface.

### Unknowns / NOT VERIFIED

The original error message, affected URL, browser/device, outage start commit, whether the HTML failed to parse, whether renderer construction threw, whether a promise hung, whether a GLB exhausted memory, whether loops duplicated after navigation, whether a CDN/MIME deployment failed, whether WebGL context was lost, and whether unrelated auth instability merely coincided with avatar work are all **NOT VERIFIED**.

## 5. OLD AVATAR SYSTEM INVENTORY

* Workout UI: modal, upload/save/clear controls, render modes, canvas/status panels, feature-disabled CSS.
* Provider/profile: Avaturn popup concept, provider/model/thumbnail/update metadata, profile normalize/save/hydrate.
* Upload: authenticated multipart `.glb` endpoint, 15 MiB default limit, generated names, configurable/public storage.
* Validation: extension, multipart field, size and four-byte `glTF` magic; URL normalization/probe. No structural glTF budget or content scanner.
* Dependency bridge: `/vendor/three/build/three.module.js`, local `GLTFLoader.js`, globals/status/events and dynamic imports.
* Renderer: scene/camera/lights/canvas, continuous RAF, resize and WebGL guards.
* Asset pipeline: fetch/probe, loader, scene mount, bounding-box scale/center, skinned-mesh search.
* Rig: humanoid alias mapping, rest pose, arm/leg/root/head transforms, calibration, smoothing and visibility handling.
* Pose: MoveNet packets via `pose-runtime:frame`, live-camera retargeting, procedural 2D fallback.
* Diagnostics: global status object, console events, dashboard diagnostic projection and retry hooks.
* Isolation: server flag, disabled runtime stub, hidden UI, camera fallback and pilot tests.
* Historical shadow surfaces: root and `public/` shell duplicates formerly diverged, increasing audit/deployment ambiguity.

## 6. REUSE MATRIX

| Component | Historical role | Current state | Reuse classification | Required change | Risk |
|---|---|---|---|---|---|
| Three dependency loading | Resolve browser Three | Local dynamic imports, cached rejected promise | **SAFE WITH MODIFICATION** | Extract loader; timeout/abort; reset retry; pin manifest/integrity | Medium |
| GLTFLoader loading | Parse avatar GLB | Local ESM, no decoder registry | **SAFE WITH MODIFICATION** | Share loader factory; local Draco/Meshopt optional adapters | Medium |
| GLB mounting | Scale/center/add scene | In legacy facade/inline bindings | **KEEP BUT ISOLATE** | Move into disposable viewer session; asset budgets | High |
| Skinned mesh handling | Find/retarget character | Defensive traversal | **SAFE WITH MODIFICATION** | Validate skin/weights/skeleton before mount | Medium |
| Humanoid bone mapping | Aliases to canonical bones | Useful tolerant map | **SAFE WITH MODIFICATION** | Version mapping; report coverage; never assume fingers | Medium |
| Rest-pose system | Preserve base transforms | Present | **SAFE WITH MODIFICATION** | Immutable snapshot and reset tests per asset | Medium |
| Pose-frame subscription | Live puppeting | Anonymous global listener, no unsubscribe | **REPLACE** | Explicit subscribe handle and `dispose()` | High |
| Render loop | Continuous overlay | Owned in workout inline code | **REPLACE** | Single session-owned scheduler; pause/cancel/dispose/context loss | Critical |
| Camera integration | Overlay live user | Coupled to workout pose/canvas | **KEEP BUT ISOLATE** | Adapter only; Motion Engine must not own camera | High |
| Procedural fallback | Preserve useful exercise | Existing camera/2D behavior | **SAFE TO REUSE AS-IS** | Keep independent of Three | Low |
| Diagnostics | Status/event/dashboard trace | Broad but global/mutable | **SAFE WITH MODIFICATION** | Scoped session IDs, timings, error taxonomy, redaction | Low |
| GLB validation | Reject wrong extension/header | Superficial only | **REPLACE** | Offline/server structural parse, count/size/extensions/animation/rig budgets | Critical |
| Upload API | User model persistence | Authenticated, public web-root storage | **KEEP BUT ISOLATE** | Private/object storage, ownership, scanning, retention, signed retrieval | High |
| Feature flags | Quarantine | Server default-off plus UI gate | **SAFE TO REUSE AS-IS** | Add separate motion-lab/production/asset flags and kill switch | Low |
| Lifecycle initialization | Bootstrap on selected mode/modal | Conditional, but shared shell | **REPLACE** | User-intent component/route entry only | Critical |
| Lifecycle cleanup | Stop/dispose | Incomplete | **REPLACE** | Mandatory idempotent destroy contract | Critical |
| Error handling | Catch imports/load/render, fallback | Useful but distributed | **SAFE WITH MODIFICATION** | Boundary + timeout + fallback outside module | Medium |
| Browser capability checks | WebGL probe | Basic | **SAFE WITH MODIFICATION** | WebGL/context/memory/reduced-data matrix; mobile policy | Medium |
| Pose puppeting | Mirror camera body | Live prototype | **REFERENCE ONLY** | Separate from authored exercise clips | High |
| `avatar-runtime.js` facade | Partial extraction | Still coupled/global | **KEEP BUT ISOLATE** | Do not make Motion Engine depend on it directly | High |

## 7. AUTH / APP-BOOT SAFETY AUDIT

### Login and token restoration

No current login, token restoration, auth middleware, or protected-route guard imports or awaits Three/avatar code. The upload endpoint is downstream of `requireAuth`; it does not participate in token issuance. Preserved May verification explicitly says the login shell avoids eager TensorFlow/Three. **Avatar-caused login failure: NOT VERIFIED.**

### Profile hydration

This was the closest auth-adjacent coupling. Authenticated profile read/write stores avatar metadata, and historical workout hydration invoked asset probing/loading. A bad persisted URL could repeatedly exercise the failing path for one user. However, upload/save catches and camera fallback exist in current code, and profile authentication itself does not require successful model loading. Future core profile hydration must return plain metadata only; a viewer may consume it after mounting, never the reverse.

### Dashboard

Dashboard JavaScript reads diagnostic fields such as Three import state/model visibility; it does not initialize or await avatar. No dashboard bootstrap dependency was found. **Dashboard blockage by avatar: NOT VERIFIED.** Keep diagnostics access optional (`?.`) and never promote avatar health to launch-health failure.

### Workout/application boot

Risk was real here. `public/workout.html` conditionally writes the avatar script and contains the rest of the implementation inline. When disabled, the server substitutes false, skips the script, hides UI and bootstrap returns disabled. When enabled, shared-shell parse/synchronous errors remain capable of affecting subsequent workout setup even if async imports are caught. `document.write` is also an unnecessary, timing-sensitive injection mechanism. The feature gate is an effective current quarantine, not a sufficient future boundary.

### Global initialization

Loading `avatar-runtime.js` immediately creates globals/status, but does not import Three. `ensureThreeModules` is invoked from modal/mode/bootstrap flows. Pose subscription begins when render engine configuration binds it, even if avatar mode is not active; the handler then checks mode. Global state makes multiple viewer instances and teardown unsafe.

## 8. RUNTIME / DEPENDENCY AUDIT

* **Three/GLTFLoader:** root package is CommonJS but browser files are ESM modules served statically. Runtime uses absolute dynamic-import paths. Import errors are caught and surfaced, yet `modulePromise` remains a rejected promise, so retry cannot truly reload without page reset. No explicit timeout/AbortController appears in the actual loader despite timeout diagnostic fields.
* **CDN:** preserved April reports mention CDN checks; current runtime uses vendored local assets. Historical CDN failure is **NOT VERIFIED**. Local serving avoids network drift but still requires correct JS MIME/path and synchronized vendor files.
* **Decoders:** production has no Draco/Meshopt loader wiring. Ordinary GLBs work; Draco-compressed Gym Muscle GLBs will not. Decoders must be local, lazy and tested, never globally required.
* **WebGL:** renderer construction is guarded and camera fallback is invoked on failure. There is no `webglcontextlost/restored` handling, GPU denylist, memory budget, adaptive pixel ratio/FPS, or mobile background policy.
* **Models:** upload limit is 15 MiB; header magic is checked, but malicious/pathological scene complexity, external URIs, huge decompression, unsupported extensions, bone counts and animation duration are not validated. Loader promise behavior and asset paths require deployment browser tests.
* **Loops:** pose and renderer use separate RAF chains. Avatar renderer loop is not visibly canceled/disposed by the facade. Hidden-page handling exists in pose runtime but not equivalently in renderer ownership.
* **Subscriptions/listeners:** a boolean prevents repeat pose subscription in one page, but listener identity is not retained for removal. Resize/control/context listeners require the same explicit ownership audit.
* **Cleanup:** no comprehensive unload contract disposes `AnimationMixer` (future), renderer, render lists, geometries, materials, textures, controls, model graph, RAF, requests and listeners.
* **Mobile Safari:** no incident evidence names Safari. Structural risks are memory pressure, two RAF chains plus camera inference, background/foreground lifecycle, context loss and full canvas resolution. Autoplay is irrelevant to current 3D; camera permission remains separate. Mark Safari causation **NOT VERIFIED**.

## 9. MODEL / RIG / POSE AUDIT

The runtime realistically tolerates common humanoid aliases and missing optional bones. It expects a GLB scene containing a skinned humanoid for meaningful retargeting, uses standard MoveNet indexes, captures rest transforms and applies smoothed rotations. Missing skeleton nodes generally degrade rather than throw. Risks remain: coordinate/rest-pose differences, scale, bind matrices, malformed skin data, >4 weights, absent hips/limbs, model-specific axes and live 2D-to-3D ambiguity.

The historical April report first described a procedural keypoint avatar and explicitly identified the missing GLB scene binding/rig retarget path. The two new FBXs are materially better fixtures: both contain the same Mixamo-style 65-bone skeleton and skinned `Ch18` mesh; `Silly Dancing.fbx` has a real clip and `Ch18_nonPBR.fbx` an effectively static clip. They can test canonical rig/clip compatibility after licensing and conversion, but loader warnings about >4 weights/untriangulated polygons require repair. They do not validate the old user-uploaded model population.

The Gym Muscle anatomy GLBs are static: zero skins, joints, weights and animations. Anatomical “bone” GLBs are visible geometry, not a deformation skeleton. They cannot simply attach to the 65-bone avatar. The old live pose-puppeting design and a future authored exercise-animation player are distinct controllers and must stay separate.

## 10. WHAT THE NEW ASSETS CHANGE

| Asset/technology | Finding |
|---|---|
| Gym Muscle semantic IDs/roles | **Partially helps.** Supplies anatomy selection/highlighting vocabulary; unrelated to old stability and requires taxonomy/review/license work. |
| Gym Muscle Three highlighting | **Partially helps.** Provides a static viewer reference; lacks cleanup/capability/error architecture and must not be copied globally. |
| Draco anatomy GLBs | **Unrelated to old documented limitation / new dependency risk.** Smaller transfer, but production currently lacks decoder wiring and meshes are unrigged. |
| Mixamo-style FBX avatar | **Solves an old fixture gap.** A known skinned 65-bone humanoid now exists, subject to license and conversion QA. It does not solve lifecycle/boot failure. |
| Embedded `Silly Dancing` clip | **Partially helps.** Proves one animation pipeline fixture; it is not an exercise and not incident evidence. |
| 65-bone common namespace | **Partially helps.** Makes canonical mapping/clip reuse plausible; deformation compatibility remains unverified. |
| Static anatomy/bone assets | **Cannot yet solve motion.** No skin weights or common rig; partial anatomy rigging remains the highest asset risk. |
| Gym MVP/R3F demo | **Unrelated/reference only.** Separate stack, static model, mock UI, no production boundary. |

Therefore the historical failure was likely unrelated to missing anatomy assets. The only directly documented old functional gap that new assets help is availability of a suitable skinned rig/animation fixture.

## 11. FAIL-SAFE ARCHITECTURE

Use a small isolated viewer module, not the existing avatar runtime directly and not an iframe initially. An iframe provides stronger crash/CSS/global isolation but costs asset duplication, accessibility, messaging and camera integration; reserve it as escalation if browser soak tests show leaks cannot be bounded. A Web Worker can validate/decode metadata where libraries support it, but WebGL rendering and DOM controls remain main-thread (OffscreenCanvas is optional later, not a baseline dependency).

```text
POCKETPT CORE (never imports 3D at module evaluation)
  Auth ─ Dashboard ─ Workouts ─ Programs ─ Exercise content/images
                              │
                              └─ optional button/capability slot
                                   │ user intent + independent flag
                                   ▼
                         <MotionViewerBoundary>
                         static fallback OUTSIDE boundary
                                   │
                      timeout + dynamic import + error boundary
                                   ▼
                    isolated motion-viewer session (dispose-owned)
                      ├─ capability probe
                      ├─ shared3d loader factory
                      ├─ asset manifest/validator
                      ├─ authored clip controller
                      ├─ anatomy highlight controller
                      └─ scoped telemetry

Any failure ──> boundary catches/aborts/disposes ──> “3D visualization unavailable”
                                                     images/instructions remain
```

Required dependency direction is core → optional capability. The viewer receives immutable exercise/avatar descriptors; it cannot own auth, route transitions, workout state, profile hydration or persistence. Core must not await viewer health. Static content renders before the button.

Use separate modules: `shared3d-loader` (pinned imports, decoder factory, capability checks), `motion-viewer` (scene/session lifecycle), `motion-controller` (AnimationMixer/clips), and optional adapters for anatomy and live avatar. Every session has an `AbortController`, load deadline, one RAF owner and idempotent `dispose`. Failures are local result values/events, never rejected promises escaping into core bootstrap.

Deploy with server-enforced flags (`motionLab`, `motion3dProduction`, per-asset manifest) plus client presentation gates and an instant kill switch. Hash/version assets; canary one exercise/device cohort; retain old images; rollback by flag without redeploying core.

## 12. MOTION LAB RECOMMENDATION

**Yes—this is the right next safety layer**, after first extracting a no-op boundary contract. Implement `/dev/motion-lab` as a server-gated admin/development route not linked for members and not imported by normal pages. In production, return 404 unless an explicit lab flag and admin authorization are both satisfied. The route dynamically imports all 3D code after its own static shell loads.

It should show PASS/FAIL/NOT RUN and timings for WebGL, Three, GLTFLoader, local Draco, avatar asset, skeleton coverage, animation clips, anatomy asset, muscle metadata, renderer/context loss and cleanup. Controls: load/unload avatar/anatomy, play/pause/loop/select clip, rotate/zoom, inspect hierarchy/metadata/bounds/bones/weights, highlight a muscle, reset, and simulated import/404/timeout/parse/WebGL/context-loss failures.

Add automated assertions for: simulated failures never alter auth/core globals; unload cancels RAF/listeners/fetch; repeated load/unload does not increase active sessions/listeners; context loss shows fallback; asset timeout is bounded; mobile budget modes work. Do not allow arbitrary production URLs/uploads in the lab until validation/storage is hardened.

## 13. PRE-IMPLEMENTATION SAFETY REQUIREMENTS

1. Avatar/3D code may not be imported, initialized or awaited for authentication.
2. It may not be required for dashboard boot, redirects, token/profile restoration or protected-route decisions.
3. It may not be required to open workouts, programs, coaching or the exercise library.
4. All 3D dependencies and assets lazy-load only after an explicit optional surface/user action.
5. Asset/dependency/renderer failures fail closed to a local visual fallback, never application failure.
6. Every RAF, timer, listener, subscription, control, request, camera adapter and GPU resource has one owner and idempotent cleanup.
7. Models are structurally validated before runtime use; enforce compressed/uncompressed bytes, node/primitive/vertex/texture/bone/clip budgets and allowed extensions/URIs.
8. Unsupported/low-budget browsers and devices receive static content without attempting expensive loads.
9. Existing exercise images and instructions render first and remain usable with JavaScript/3D disabled.
10. Lab and production 3D have separate server-enforced feature flags, cohort rollout and kill switch.
11. No `document.write`, global script injection, global Three bridge, or mutable core global is allowed in new integration.
12. Core code must not catch viewer internals; a boundary converts all errors/timeouts into a typed unavailable result.
13. A rejected import/load must be retryable in a fresh isolated session; cached rejected promises may not poison the page.
14. Viewer code may read immutable auth-derived asset URLs only after mount; it may not read/write tokens or choose navigation.
15. User uploads must leave public web-root storage; use ownership-scoped object/private storage, scanning, retention and signed delivery before production use.
16. No remote CDN decoder/runtime dependency; pin local versions and asset hashes.
17. Handle `visibilitychange`, resize, `pagehide`, WebGL context loss/restoration and abort-on-unmount; cap DPR/FPS on mobile.
18. One viewer session owns at most one renderer loop. Live pose loop and authored animation controller may not both drive the same rig without explicit arbitration.
19. Telemetry must record stage/timing/device class/context loss/fallback without tokens, user media or model contents.
20. CI must prove core pages contain no static/dynamic dependency edge to Motion Engine except the optional boundary, and simulated viewer failure leaves core navigation working.
21. Asset provenance/license and attribution must pass review before any FBX/Gym Muscle artifact ships.
22. Rollback must be a flag change; no production exercise schema/catalog migration is prerequisite for the first release.

## 14. REVISED PHASED PLAN

| Phase | Objective / components | Dependencies | Exit criteria | Rollback | Risk |
|---|---|---|---|---|---|
| A — evidence closure | Obtain missing Git bundle/remote refs, deployment logs and incident evidence; map old hashes | Owner/hosting backups | `bfae3ec` and parents inspected or formally declared lost; incident facts recorded | Report only | Medium; evidence may be gone |
| B — boundary contract | Add optional slot, typed unavailable result, fallback and dependency-edge tests; no Three | None | Core auth/dashboard/workout tests pass with forced import throw/timeout | Remove slot/flag | Low |
| C — disposable loader/session | New shared loader and lifecycle, local pinned modules, abort/timeout/dispose/context loss | B | repeated lifecycle/leak tests; zero core globals | Disable lab | High |
| D — Motion Lab | Admin/dev isolated route and failure injection diagnostics | B–C | all diagnostic stages independently fail without leaving route/core broken | Route 404 flag | Medium |
| E — canonical avatar + existing clip proof | Offline convert licensed Ch18 and dance clip; skeleton/weights/rest-pose QA | License approval, D | one GLB/clip loads, animates, unloads; budgets recorded | Delete test manifest | High |
| F — static anatomy proof | Port minimal semantic highlighting with local Draco in lab | License/taxonomy, D | one anatomy asset loads/highlights/falls back/disposes on mobile profiles | Disable anatomy flag | High |
| G — partial anatomy deformation spike | Skin a small region to canonical rig; joint QA | E–F | documented deformation pass/fail and size/draw-call budget; no mass rigging | Retain static anatomy | Critical |
| H — squat end-to-end lab proof | Licensed squat clip + canonical avatar + approved muscle overlay | E–G | loop/root/feet/anatomy/fallback accepted in lab | Asset manifest rollback | Critical |
| I — read-only exercise overlay | Versioned companion registry keyed by canonical exercise ID | H | schema-independent join validates one squat; legacy catalog unchanged | Remove overlay | Medium |
| J — one production exercise canary | Optional boundary on one exercise behind server/cohort/device flags | I + browser/security QA | auth/dashboard/workout unaffected; mobile soak and fallback SLO pass | Kill switch | High |
| K — reusable clip pipeline | Offline validation/retarget/optimization manifests | J | second movement proves repeatability without runtime exceptions | Stop publishing assets | High |
| L — family expansion/scaling | Reviewed mappings, CDN/cache/performance budgets, staged cohorts | K | each family passes licensing, QA, fallback and rollback gates | Per-family flags/manifests | High |

This sequence moves isolation and failure testing before asset excitement. Anatomy deformation precedes squat production because the earlier asset audit identified it as the hardest unproven technical step. Production schema migration remains after—not before—a successful proof.

## 15. EXACT NEXT ENGINEERING ACTION

**Recover the missing historical Git objects and incident artifacts before writing any 3D code.** Ask the repository owner/host backups for a Git bundle or remote refs containing `bfae3ec`, `845f9e2489635794b346988242fa1b76f9df40a6`, their parents, and the April 23–May 14 branches, plus deployment/browser logs from the unusable period. Import them as forensic refs (never merge), then rerun `git log --all --full-history`, diff the pre-avatar → failure → quarantine range, and update only sections 2–4 of this report.

This is one bounded action and attacks the highest uncertainty: today the claimed incident root cause cannot be verified. If the objects are formally unavailable, record that outcome and the next action becomes Phase B's no-Three optional boundary contract—not building a renderer.

## Audit commands and evidence map

Principal commands included `git rev-list --all --count`, `git log --all --reverse --date=short`, `git log --all --follow -- public/avatar-runtime.js`, `git cat-file`/`git show` on referenced hashes, `rg` across avatar/Three/WebGL/GLB/auth/boot/loop terms, direct source/report inspection with `sed`, `node --check`, focused Node tests, and the prior asset audit's programmatic GLB/FBX inspection. No network history was assumed and no destructive command was run.
