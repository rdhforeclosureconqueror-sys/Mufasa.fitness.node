# PocketPT Muscle Motion Engine — repository and asset audit

**Audit date:** 2026-08-18  
**Scope:** the complete tracked repository, with deep inspection of `exercise-generation/3dmode`, production exercise/avatar infrastructure, every tracked FBX, and every tracked GLB/GLTF.  
**Method:** source/config/license review; Git-history and reference searches; programmatic GLB container inspection; and loading both FBX files through the repository's installed Three.js `FBXLoader`. No assets or schemas were converted or modified.

## 1. EXECUTIVE SUMMARY

### What exists

PocketPT already has more production foundation than either imported demo:

* The authoritative legacy catalog is `data/exercise.json` (873 records), adapted at runtime into immutable canonical IDs and richer classifications by `src/exercise-intelligence/exerciseCatalog.js`. The catalog already has broad `primaryMuscles` and `secondaryMuscles`; canonical records already include `stabilizers`, although the source records generally do not populate them.
* Production already lazy-loads vendored Three.js and `GLTFLoader`, accepts feature-gated GLB avatar uploads, mounts skinned avatars, maps humanoid bones, renders continuously, and can drive bones from pose packets. That is a useful integration seam, not yet an exercise-clip player.
* The imported **Gym Muscle** material is a genuinely useful static anatomy engine: 16 exercise mappings, 15 semantic fitness muscle IDs, three roles, forward and reverse lookup, hover/click raycasting, OrbitControls, layered/regional views, and 16 small Draco GLBs. Its `fullbody.glb` is 1,529,472 bytes and contains 121 primitives tagged into 15 muscle groups.
* The imported **Gym MVP** material is a separate Next/React/R3F viewer proof with a static low-poly `scene.gltf`, orbit/zoom, zone buttons, and mock Spanish exercise lists. It is not wired to PocketPT or Gym Muscle and has no animation system.
* Contrary to the expected filename list, the tracked repository contains **exactly two FBX files**: `Ch18_nonPBR.fbx` and `Silly Dancing.fbx`. Both contain the same useful Mixamo-style 65-bone humanoid, one skinned `Ch18` mesh, and embedded clips. No `Ch06`, `Ch28`, `CoachModel`, Strike Forward Jog, or Big Jump asset exists in the inspected checkout (**NOT PRESENT / NOT VERIFIED elsewhere**).

### Most important discovery

The current Z-Anatomy-derived GLBs are **not rigged**. Every one has zero glTF `skins`, zero `animations`, no `JOINTS_0` or `WEIGHTS_0` attributes, and only static position/normal data. Thus the suspected hard problem is real: the excellent anatomical meshes cannot follow either FBX skeleton today.

The FBX side is better than filenames suggest. Both FBXs are already skinned Mixamo humanoids. `Silly Dancing.fbx` has a real 5.35-second, 53-track clip; `Ch18_nonPBR.fbx` has only a 0.033-second effectively static clip. Both can probably be converted to GLB, and their identical bone namespace makes clip reuse plausible, but a clean conversion and visual deformation test remains required.

### Feasibility and readiness

**Target feasibility: YES, technically feasible with the current foundations, subject to asset-license approval and an anatomy-rigging proof.**

**Readiness: approximately 45%.** This is not “45% of exercises animated.” It means the reusable data, static anatomy interaction, renderer primitives, and one canonical-rig candidate exist. The missing 55% includes the highest-risk work: legally approved asset provenance, skinning anatomy to the canonical rig, validating deformation at joints, authoring/acquiring exercise clips, clip retarget/normalization, schema-governed mappings, production integration, and mobile quality/performance tests. Static anatomy alone is closer to 75%; a production multi-exercise motion engine is much earlier.

### Safe conclusion

Do not merge the demos into production or mass-convert assets. Preserve PocketPT's exercise catalog as authority; treat Gym Muscle as a quarantined/reference asset package until licensing is confirmed; and perform one offline, reversible **bodyweight-squat rigging spike** that exports a single test GLB and records deformation and size results.

## 2. NEW ASSET INVENTORY

### 2.1 Gym Muscle import (`exercise-generation/3dmode`)

| Category | Files | Actual function |
|---|---|---|
| Data | `data.js` | 15 fitness muscle definitions; 16 exercises; `primary`, `synergist`, `stabilizer`; reverse query helper. This is a demo dataset, not PocketPT authority. |
| 2D anatomy | `body.js`, `app.js`, `index.html`, `style.css` | Front/back SVG paths with `data-muscle` IDs, exercise selection, role color, and muscle-to-exercise lookup. |
| 3D engine | `viewer3d.js`, `viewer3d.css`, `mobile3d.css` | Three.js scene, OrbitControls, GLTF/Draco loading, `extras.muscle` discovery, raycasting, hover/click, semantic highlighting, optional bone and layer toggles. |
| 3D entry pages | `fullbody3d.*`, `arm3d.*`, `back3d.*`, `calf3d.*`, `chest3d.*`, `shoulder3d.*`, `thigh3d.*`, `waist3d.*`, `waistglute3d.*` | Thin region configurations around the shared viewer. |
| Muscle anatomy GLBs | `fullbody.glb`, `arm.glb`, `back.glb`, `calf.glb`, `chest.glb`, `shoulder.glb`, `thigh.glb`, `waist.glb`, `waistglute.glb` | Draco-compressed static Z-Anatomy-derived subsets tagged by group and sometimes `superficial`/`deep`. |
| Bone GLBs | `skeleton.glb`, `arm_bone.glb`, `calf_bone.glb`, `chest_bone.glb`, `femur.glb`, `shoulder_bone.glb`, `spine.glb` | Static anatomical bone geometry; these are not animation skeletons. |
| License/provenance | `README.md`, `LICENSE` | Declares Z-Anatomy-derived GLBs and the whole Gym Muscle project CC BY-SA 4.0; 2D paths are attributed to `react-native-body-highlighter` (MIT); Three.js is MIT. |

### 2.2 Gym MVP import (same directory, intermingled)

| Category | Files | Actual function |
|---|---|---|
| R3F viewer | `BodyCanvas.tsx`, `page.tsx`, `gym.tsx`, `layout.tsx`, `_app.tsx` | Client R3F canvas using `useGLTF`, lights and Drei OrbitControls; numbered zones launch mock exercise UI. |
| UI/data | `ExerciseList.tsx`, `MetricsForm.tsx`, `metrics.tsx`, `exercises.ts`, CSS, screenshots/icons | Prototype UI and hard-coded/mock Spanish exercise content, including remote media URLs. |
| Model | `scene.gltf`, `scene.bin`, two material PNGs | Static low-poly male: 3 nodes, 1 mesh, 1 material/texture, zero skins, zero animations. |
| Build | nested `package.json`, lockfile, Next/Tailwind configs | Independent Next 15/React 19/R3F application. Its dependencies are not dependencies of the root application. |
| License | `license.txt` | Model attribution to BitHack's Sketchfab low-poly male under CC BY 4.0. No locally found license covering Gym MVP source code as a whole. |

The overwrite/intermingling is itself a risk: the final `README.md` describes Gym Muscle, while the nested package still calls itself `gym-mvp`; two unrelated app architectures occupy one directory.

### 2.3 FBX inventory

Only these are present anywhere outside ignored dependency trees:

* `exercise-generation/3dmode/Ch18_nonPBR.fbx` — 13,815,152 bytes.
* `exercise-generation/3dmode/Silly Dancing.fbx` — 14,313,184 bytes.

Both include a skinned character, skeleton, material/embedded texture references, and Mixamo-named animation tracks. Details are in section 5.

### 2.4 Exercise-generation package and unusual files

The parent `exercise-generation/` directory is primarily a separate Pocket PT rugby coaching prototype: large `page.tsx`/`site.js` implementations; `activate-adult.html`, `backs-ready.html`, `coach-guide.html`; operating/handoff/upgrade documents; Vite/vinext/Next config; manifest/profile/runtime/translation schemas; artifact build/validation scripts; and one `sources/push_up.json`. It is not the production root exercise generator or the imported 3D app.

There are **66 eight-character files totaling 308,452 bytes** at its root. Sixty-three share binary magic `b2 db df 8a`; three begin with text-like signatures. They have no extension, no repository references, and are not declared inputs in the package scripts. Their byte patterns are consistent with generated runtime/compiler cache artifacts, but the exact producer is **NOT VERIFIED**. Treat all 66 as quarantined unknown/generated artifacts: checksum and trace their origin before removal; do not ship or parse them as exercise records. The two npm debug logs and empty `install.lock` are similarly non-runtime artifacts.

## 3. EXISTING POCKETPT REUSE AUDIT

### Exercise authority and generation

* `data/exercise.json` is explicitly the source for `scripts/build-exercise-index.js`; its 873 records contain stable legacy IDs, names, force/level/mechanic/equipment/category, instructions, image paths, and broad primary/secondary muscle arrays.
* `src/exercise-intelligence/exerciseCatalog.js` is the better production boundary. It canonicalizes legacy records to immutable lowercase slugs, enriches classification, and exposes `getExercise`/`listExercises`. Add motion/anatomy references to this canonical projection via a reviewed, versioned extension or companion overlay keyed by `exerciseId`—not a second catalog.
* `src/exercise-intelligence/exerciseSchema.js` validates the canonical contract. Any production field change needs a schema version and migration/release review; this audit intentionally makes none.
* Existing generated profiles, semantic validators, review workspaces, relationship services, workout builders, program engine and APIs already depend on canonical exercise IDs. That is exactly the identifier needed to join an animation/muscle-role overlay.

### Production 3D/avatar runtime

`public/avatar-runtime.js` already provides lazy Three/GLTF imports, status and diagnostics, pose-frame subscriptions, bone mapping/rest pose handling, GLB mount checks, and graceful camera/procedural fallbacks. The server already offers a feature-gated authenticated `.glb` upload path. Useful pieces are the dependency loader, lifecycle/diagnostics conventions, GLB probing, feature gating and fallback UX.

It does **not** currently provide OrbitControls, Draco decoder wiring, `AnimationMixer`/clip selection, anatomy mesh semantic picking, role materials, or exercise-detail integration. Its pose-puppeting path is live-camera oriented; it should not be overloaded as the authored exercise clip engine. Share a small asset-loading/runtime foundation, then add an isolated motion-viewer controller behind a feature flag.

### Existing exercise UI/media

The root browser app has a generated exercise index, search/library UI, workout and guided-sequence surfaces, JPEG exercise images and media projection utilities. An exercise-detail surface should request an optional `motion3d` capability and lazy-load the viewer only when opened. Existing images remain the fallback and must not be removed.

## 4. REUSE MATRIX

| Component | Current source/location | Purpose | Classification | Required modification | Risk |
|---|---|---|---|---|---|
| Canonical exercise adapter | `src/exercise-intelligence/exerciseCatalog.js` | Production IDs/classification | **REUSE WITH MODIFICATION** | Add versioned optional motion/anatomy projection or join overlay | Medium: schema consumers |
| Legacy exercise catalog | `data/exercise.json` | 873-record content source | **REUSE AS-IS** initially | Do not bulk rewrite; map canonical IDs externally first | Medium: coarse/uncurated muscle facts |
| Exercise schema/validation | `src/exercise-intelligence/exerciseSchema.js` | Canonical contract | **REUSE WITH MODIFICATION** later | Version and validate optional semantic fields | Medium |
| Workout/program engines | `src/workouts`, `src/program-engine`, `src/movement-engine` | Exercise selection/session flows | **REUSE AS-IS** | Consume capability only; no 3D ownership | Low |
| Production avatar runtime foundation | `public/avatar-runtime.js` | GLB load, bone control, fallback/diagnostics | **REUSE WITH MODIFICATION** | Extract/share loader lifecycle; add separate clip viewer | High: load-bearing legacy runtime |
| Root vendored Three.js | `public/vendor/three`, root `three@0.158` | Existing render dependency | **REUSE WITH MODIFICATION** | Pin one compatible version; add local Draco/meshopt decoders if chosen | Medium |
| Gym Muscle data model | `3dmode/data.js` | roles and reverse queries | **REFERENCE ONLY** | Normalize into reviewed overlay keyed by canonical IDs | High: small unreviewed dataset/license |
| Gym Muscle highlighting engine | `3dmode/viewer3d.js` | color/pick/orbit logic | **REUSE WITH MODIFICATION** conceptually | Port semantic logic, accessibility, cleanup, local decoder, tests | High: CC BY-SA boundary and global DOM code |
| Gym Muscle anatomy GLBs | `3dmode/*.glb` | static anatomy | **UNKNOWN / NEEDS VALIDATION** | Legal approval, detailed taxonomy map, rig/weight/export | Critical |
| Gym Muscle 2D map | `body.js` and app | static fallback and picking | **UNKNOWN / NEEDS VALIDATION** | Preserve MIT attribution; isolate from SA material; accessibility | Medium |
| Regional bone GLBs | `*_bone.glb`, `skeleton.glb`, `spine.glb`, `femur.glb` | anatomical context | **REFERENCE ONLY** initially | Optional lazy overlays; reduce heavy chest/skeleton assets | Medium |
| Gym MVP R3F structure | `BodyCanvas.tsx` etc. | React viewer proof | **REFERENCE ONLY** | Rebuild at PocketPT integration seam if React viewer chosen | High: dependency/app mismatch |
| Gym MVP static model | `scene.gltf` + bin/PNGs | clickable low-poly body | **REPLACE** | It is unrigged and duplicates stronger FBX candidate | Medium: attribution |
| `Ch18_nonPBR.fbx` character | `3dmode/Ch18_nonPBR.fbx` | neutral-ish skinned avatar | **UNKNOWN / NEEDS VALIDATION** | License/provenance, rest-pose visual test, GLB conversion/optimization | Critical licensing |
| `Silly Dancing.fbx` clip/model | `3dmode/Silly Dancing.fbx` | animation pipeline proof | **REFERENCE ONLY** | Use only for technical retarget test after license confirmation | Critical licensing/non-exercise clip |
| FBX Mixamo skeleton | both FBXs | common humanoid rig | **REUSE WITH MODIFICATION** if licensed | Canonical bone map, rest pose, root-motion policy, trimmed fingers | High |
| Parent rugby prototype | `exercise-generation/*` | coaching OS prototype | **REFERENCE ONLY** | Do not make it owner of production exercise motion | Medium: separate stack |
| Hash-like files/logs | `exercise-generation/<hash>` | unknown cache-like artifacts | **UNKNOWN / NEEDS VALIDATION** | Trace producer, then exclude/delete in a separate cleanup | Low runtime/high provenance |
| Existing JPEG media pipeline | `public/exercise-db`, `exerciseMedia.js` | exercise fallback media | **REUSE AS-IS** | Add 3D as optional capability, never replacement | Low |

## 5. FBX / AVATAR AUDIT

Inspection used the installed Three.js FBX loader, not filename inference.

| File | Model / animation | Skeleton and skin | Clips | Compatibility | Candidate use / recommendation |
|---|---|---|---|---|---|
| `Ch18_nonPBR.fbx` (13.82 MB) | One `Ch18` skinned mesh, one material, one geometry; appears to be a character/rest asset | 65 Mixamo-style bones from `mixamorigHips`, 3 spines, full arms/legs and finger chains; skinning present. Loader warns some vertices have >4 weights and truncates them; it also warns about untriangulated polygons. | `mixamo.com`: 0.0333 s, 53 tracks (effectively one frame); empty `Take 001` | Strong Mixamo namespace; likely compatible with standard Mixamo clips after rest-pose/root-scale validation | **Best current canonical-avatar candidate**, because it is effectively neutral rather than a dance take. Must not be adopted until provenance/license, visual rest pose, normals, weights and GLB conversion are approved. |
| `Silly Dancing.fbx` (14.31 MB) | Same `Ch18` skinned character/material/geometry with motion | Same 65-bone Mixamo-style hierarchy and skinning; same loader warnings | `mixamo.com`: 5.35 s, 53 tracks; empty `Take 001` | Bone names align with Ch18; useful to prove clip extraction/reuse. Track order differs but names are the important binding | Use only as a pipeline/retarget fixture—not an exercise and not the canonical bundled asset. Extract the clip rather than duplicate the mesh if legally permitted. |

Both files appear to contain image/material data (the loader reaches embedded-image parsing and reports an unsupported shininess map). Texture completeness and visual appearance are **NOT VERIFIED** because this audit did not launch a graphical FBX scene. Exact triangle count is **NOT VERIFIED** due to the binary FBX and loader's non-triangulated polygon warnings. “Mixamo-compatible” is highly probable from the canonical namespace and hierarchy, but cross-model deformation is not proven until an animation is applied to an independently exported canonical GLB.

No other meaningful FBX exists in the checkout. Specifically, the requested `Ch06_nonPBR@Strike Forward Jog`, `Ch28_nonPBR@Strike Forward Jog`, `Ch28_nonPBR@Big Jump`, and `CoachModel` reports are **NOT POSSIBLE: files not present**.

## 6. ANATOMY / MUSCLE ENGINE AUDIT

### What Gym Muscle already solves

* Framework-independent semantic roles (`primary`, `synergist`, `stabilizer`) and theme-owned colors.
* 15 stable-at-demo-level IDs and names, 16 exercise mappings, and muscle-to-exercise reverse query.
* 2D and 3D interaction patterns, hover tooltip, click selection, role chips, dimming, OrbitControls rotation/zoom, resize handling, raycasting and optional regional/layer/bone views.
* A useful conversion outcome: node `extras.muscle` is preserved as `object.userData.muscle`; many nodes also carry `extras.layer`.
* Small Draco-compressed regional delivery rather than a monolithic medical model.

### Programmatic GLB findings

| Asset | Bytes | Position samples across primitives | Nodes / primitives | Muscle tags |
|---|---:|---:|---:|---|
| `fullbody.glb` | 1,529,472 | 291,741 | 174 / 121 | all 15 groups; 82 superficial and 54 deep tagged nodes |
| `arm.glb` | 353,748 | 44,503 | 65 / 51 | biceps 8, triceps 8, forearm 36 |
| `back.glb` | 285,940 | 49,610 | 35 / 15 | lats 2, traps 6, lower_back 14 |
| `calf.glb` | 87,668 | 11,696 | 13 / 8 | calves 8 |
| `chest.glb` | 28,880 | 2,928 | 10 / 6 | chest 6 |
| `shoulder.glb` | 106,528 | 13,333 | 20 / 12 | traps 6, deltoids 6 |
| `thigh.glb` | 332,936 | 45,645 | 41 / 30 | quads 8, hamstrings 8, adductors 12, glutes 6 |
| `waist.glb` | 549,476 | 162,041 | 33 / 12 | lower_back 14, abs 4, obliques 4 |
| `waistglute.glb` | 606,548 | 169,526 | 42 / 16 | waist groups plus glutes 6 |

“Position samples” is the sum of POSITION accessor counts and may duplicate vertices across primitives; it is a complexity proxy, not an exact unique-vertex or triangle count. Some small files have surprisingly high geometry density (waist), so size alone must not drive draw/vertex budgeting.

All 16 anatomy/bone GLBs use Draco plus material extensions; none has textures. Crucially, all have **0 skins, 0 animations, 0 JOINTS/WEIGHTS attributes**. Bone GLBs are visible bone meshes, not a transform skeleton. `skeleton.glb` is 1.69 MB, 244 nodes, 287 primitives and ~186,646 position samples; `chest_bone.glb` is unusually expensive at 1.66 MB.

### Limitations

* Group tags collapse detailed named nodes: e.g. rectus/vastus subdivisions become `quads`, gastrocnemius and soleus become `calves`, all deltoid heads become `deltoids`. Detailed node names remain in GLB, so a more precise taxonomy can be added without discarding geometry.
* The 121 full-body primitives imply too many draw calls for a routine mobile exercise view unless merged/instanced/material-managed carefully.
* Viewer decoder comes from unpkg at runtime, which conflicts with offline/reliability goals and production dependency pinning.
* Materials are replaced per mesh, increasing material count and disposal burden. There is no explicit resource cleanup, animation, keyboard picking, screen-reader equivalent, WebGL capability gate, error retry, telemetry, or test suite.
* Exercise mappings are small, separate, broad, and not clinically reviewed. They must not overwrite production facts.

## 7. GYM MVP AUDIT

Gym MVP contributes a concise example of React client boundaries, R3F `Canvas`, Drei `useGLTF`, lights, OrbitControls, responsive overlay UI and modal exercise lists. Those concepts can inform a future component if PocketPT adopts a React surface.

It should not be copied as architecture:

* It is an independent Next 15/React 19 app nested inside a different Next 16/vinext prototype and a CommonJS/Express production root.
* `BodyCanvas` uses mock localized records, remote third-party images/videos, numeric zones and simulated loading. It has no semantic mesh picking, roles, canonical IDs, animations, fallback or asset lifecycle.
* Its static model has 1 mesh, no skin and no clips. Zone buttons do not correspond to model meshes.
* It would introduce R3F/Drei/Framer/Tailwind dependencies to production without demonstrating a benefit over the existing Three runtime.

Recommendation: **reference only**. First production spike should use root Three.js directly to minimize integration variables. Re-evaluate R3F only if the eventual PocketPT exercise-detail UI is itself React-owned and lifecycle complexity justifies it.

## 8. EXERCISE DATA AUDIT

### Source of truth

`data/exercise.json` is the source asset, but consumers should join through the canonical `exerciseId` from `exerciseCatalog`. The generated `public/exercise-db/index.json` and per-exercise media files are outputs/delivery assets, not another authoring source. The 16 Gym Muscle exercises and the rugby `push_up.json` are not production authority.

### Existing data

The 873 legacy records use 17 broad muscle values for both primary and secondary roles: abdominals, abductors, adductors, biceps, calves, chest, forearms, glutes, hamstrings, lats, lower back, middle back, neck, quadriceps, shoulders, traps and triceps. The canonical classifier preserves these broad arrays under `classification`; canonical records expose a top-level `stabilizers` array but it is not meaningfully populated from the legacy catalog.

### Missing data

* No animation/clip ID, asset version, loop segment, playback speed, root-motion rule, equipment prop, camera preset or fallback media relation.
* No reviewed stabilizer role for most records.
* No detailed anatomy IDs, laterality, anatomical node mapping, confidence/source/review status or taxonomy version.
* No declared viewer capability/asset manifest connecting an exercise to downloadable bundles.

### Safe extension shape

Do not inject colors or raw URLs into every legacy record. Begin with a versioned reviewed overlay/registry:

```json
{
  "exerciseId": "bodyweight_squat",
  "taxonomyVersion": "1",
  "animation": { "clipId": "bodyweight_squat_v1", "assetVersion": "1", "loop": true },
  "muscleRoles": {
    "primary": ["quadriceps", "gluteus_maximus"],
    "synergist": ["hamstrings", "hip_adductors"],
    "stabilizer": ["erector_spinae", "rectus_abdominis", "external_oblique"]
  },
  "review": { "status": "draft", "source": "..." }
}
```

At read time, join it to the canonical record and expose `motion3d.available`. After the contract is proven, migrate it into the canonical schema through the normal versioned lifecycle.

External datasets are not necessary for the first proof. They may help scale clips or anatomical facts later, but every dataset introduces ID reconciliation, quality and licensing work.

## 9. MUSCLE TAXONOMY PLAN

Create a versioned taxonomy registry, not strings scattered through exercise records. Each entry should have:

* immutable `anatomyId` (precise structure), canonical anatomical name, aliases, laterality policy and parent;
* `fitnessMuscleId` for user/programming aggregation;
* `muscleGroupId` and `bodyRegionId`;
* GLB node/primitive selectors and source-model version;
* display/localization labels separate from identity;
* provenance and review status.

Example hierarchy:

```text
vastus_lateralis → quadriceps → knee_extensors → thigh → lower_body
rectus_femoris  → quadriceps → knee_extensors → thigh → lower_body
gluteus_maximus → gluteals   → hip_extensors  → hip   → lower_body
```

Initial aliases should bridge all three vocabularies without losing detail: `chest` → `pectoralis_major`; `deltoids` → parent `deltoid` with anterior/lateral/posterior children; `lower back`/`lower_back` → `erector_spinae`; `abs` → `rectus_abdominis`; `calves` → a group containing `gastrocnemius` and `soleus`; `middle back` must map through explicit structures (not automatically to traps or rhomboids).

Gym Muscle's detailed GLB node names make this feasible, but its current `extras.muscle` should be retained as a compatibility/group tag while a new `anatomyId` mapping is validated. Role values should normalize to `primary`, `synergist`, `stabilizer`, `inactive`; accept `secondary` only as an input alias for `synergist`. Presentation colors belong exclusively to theme/viewer configuration.

## 10. ANIMATION ARCHITECTURE

Recommended offline pipeline:

```text
licensed Ch18/rest source
  → triangulate + repair/limit weights + normalize units/axes/rest pose
  → canonical Mixamo-compatible skeleton and neutral body shell
licensed exercise FBX clip
  → strip duplicate mesh → retarget by bone names → remove/define root motion
  → trim loop → foot-contact/pose QA → clip-only GLB
licensed Z-Anatomy subset
  → align to canonical rest pose → map detailed anatomy IDs
  → skin/weight to same canonical skeleton → joint deformation QA
  → optimize/merge carefully → compressed canonical-anatomy GLB
  → immutable asset manifest with hashes, license and versions
```

Runtime:

```text
exerciseId → motion registry → lazy base avatar/anatomy bundle + clip
           → GLTFLoader/decoders → AnimationMixer → semantic role materials
           → orbit/preset camera + raycaster + accessible details/fallback
```

Prefer one base GLB containing the skeleton, shell and skinned anatomy, then separate clip-only GLBs sharing exact track/bone names. This avoids one model per exercise. If clip-only GLB interoperability proves awkward, ship a compact animation bundle per movement family; still never duplicate the avatar.

FBX should remain an offline authoring/interchange format. Production delivery should be GLB. Do not runtime-load 14 MB FBXs.

An alternative rigid-parent approach (attach each muscle to one bone) is acceptable only as a disposable experiment: muscles crossing joints need blended weights, and rigid attachment will visibly separate/deform incorrectly during squat, elbow and shoulder motion.

## 11. MAIN TECHNICAL GAP

The central hard problem is confirmed: **creating a legally usable, anatomically aligned, mobile-sized skinned anatomy avatar whose detailed muscle meshes deform acceptably on the Mixamo-compatible skeleton**.

The static engine, IDs and ordinary animation playback are not the main risk. Hard subproblems are:

1. Aligning Z-Anatomy proportions/rest pose to Ch18 without destroying anatomical placement.
2. Producing weights for muscles spanning joints and validating hips, knees, shoulders, elbows and torso under extreme ranges.
3. Preserving clickable semantic partitions while reducing 121 full-body draw calls.
4. Preventing z-fighting/clipping between skin shell, muscles and bones; deciding cutaway/transparency mode.
5. Establishing asset licenses/provenance before derivative work.
6. Building/acquiring and QA'ing actual exercise clips; current repository has a dance clip only.

The first rigging proof can falsify the proposed architecture cheaply. If anatomy weighting quality is unacceptable, the fallback architecture is a canonical outer avatar plus selectively visible, simplified skinned “fitness muscle” overlays authored for motion—not the full anatomical mesh set.

## 12. LICENSING / ATTRIBUTION AUDIT

This is a technical boundary analysis, **not legal advice**.

| Material | Locally stated license | Commercial use / obligations | Boundary / unresolved issue |
|---|---|---|---|
| Z-Anatomy-derived anatomy and bone GLBs | CC BY-SA 4.0 in Gym Muscle README/LICENSE | Commercial use is permitted with attribution; adaptations must be shared under same license | Human counsel must decide what constitutes Adapted Material and distribution obligations. Keep original/modified anatomy assets, notices, source/provenance and build scripts in a separable asset package. Do not assume embedding forces unrelated app code under SA; also do not assume it cannot. |
| Gym Muscle project/code | Its LICENSE declares the entire imported project CC BY-SA 4.0 | Attribution and ShareAlike on adapted material | Avoid blind source copying into proprietary runtime. A clean reimplementation of general interaction concepts plus separately loaded licensed assets may create a clearer boundary, subject to counsel. |
| 2D body paths | Locally attributed to `react-native-body-highlighter`, MIT | Copyright/license notice; commercial use generally permitted | Confirm the exact upstream version and preserve MIT text; current local combined license presentation is ambiguous. |
| Three.js | MIT | Preserve notice | Root uses 0.158 while Gym Muscle imports 0.160 CDN and Gym MVP asks for 0.176; pin/version-test one production runtime. |
| Gym MVP low-poly male | `license.txt`: BitHack model, CC BY 4.0 | Commercial use allowed with attribution; no SA stated | Preserve specified credit if used. It is not useful enough to justify use. Confirm Sketchfab asset/version provenance. |
| Gym MVP source | **NOT VERIFIED** locally | Unknown | No source-code license found. Reference concepts only pending provenance. |
| Ch18 FBXs / embedded textures / animations | **NOT VERIFIED** locally | Unknown | Critical blocker. Filenames/metadata suggest Mixamo processing, but repository contains no Adobe/Mixamo terms, download account record, original model license, or provenance. Do not distribute, convert into a product asset, or derive production clips until reviewed. |
| Existing root exercise dataset/images | **NOT VERIFIED by this focused audit** | Unknown | Existing use does not automatically grant new redistribution/media rights. Include in broader product content audit. |

Recommended technical containment: `assets/anatomy-zanatomy/` with its own NOTICE, source URLs/versions, hashes, transformation scripts and generated-output manifest; proprietary code consumes it via a stable manifest/API. Maintain equivalent provenance bundles for avatar and clips. This improves compliance evidence but is not a legal determination of ShareAlike scope.

## 13. PERFORMANCE PLAN

### Proposed budgets for initial mobile viewer

* Initial exercise-detail HTML/JS before user opens 3D: **0 additional 3D bytes**.
* Viewer code + decoder transfer (compressed): target **≤250 KB** incremental, reusing cached Three modules where possible.
* Canonical visible avatar + selected anatomy: target **≤3 MB compressed GLB**, stretch ceiling 5 MB on first proof.
* Per exercise clip: **≤150 KB compressed**, typical 30–100 KB after keyframe reduction; no duplicate mesh/textures.
* Textures: one ≤1K atlas, WebP/KTX2 where device-tested; target **≤512 KB**. Anatomy currently needs no texture.
* Draw calls: target **<50**, stretch <75; current fullbody's 121 primitives needs optimization.
* Visible geometry: target **100k–150k rendered triangles** on normal mobile tier, lower LOD around 50k; exact current triangle counts remain to be measured after Draco decode.
* Stable 30 fps on agreed low/mid-tier test devices; 60 fps aspirational. Cap DPR (the demo already caps at 2), pause animation/rendering offscreen/background, and honor reduced motion.

### Delivery strategy

Feature-detect WebGL first; retain JPEG/instruction fallback. Lazy-load only after the 3D tab/intersection/user intent. Load shell/base anatomy once, then clip on exercise change. Cache immutable content-hashed assets for a year; keep the manifest short-lived/versioned. Preload the next clip only on unmetered/appropriate connections. Store decoders locally; do not depend on unpkg. Use glTF-transform for dedup/prune/weld/keyframe resampling and evaluate Meshopt versus Draco on actual devices. Use KTX2 only if textures survive the final design. Add LOD or region visibility and avoid loading the 1.69 MB skeleton/1.66 MB thorax bones by default.

## 14. PROPOSED POCKETPT MUSCLE MOTION ENGINE ARCHITECTURE

```text
data/exercise.json
        │ existing canonicalization
        ▼
Canonical Exercise Catalog (exerciseId, classification, media)
        │ left join by exerciseId
        ├───────────────┐
        ▼               ▼
Motion Registry      Taxonomy / Role Registry
(clipId/version,     (anatomyId → fitness group →
camera/root/prop)     region; role + provenance/review)
        └───────┬───────┘
                ▼
Exercise Motion Projection/API
(`motion3d.available`, manifest URL, semantic roles; no colors)
                ▼
Feature-flagged lazy PocketPT viewer controller
  ├─ shared production Three/GLTF lifecycle + diagnostics
  ├─ local Draco/Meshopt/KTX decoder support
  ├─ canonical rigged avatar/anatomy GLB (cached once)
  ├─ clip-only GLB → AnimationMixer
  ├─ semantic material/highlight service
  ├─ OrbitControls + camera presets + play/pause/loop
  ├─ raycast anatomy selection → accessible details panel
  └─ error/WebGL/reduced-motion fallback → existing exercise media
```

Authoring/build tooling should be separate from runtime: asset intake → provenance gate → retarget/skin → optimize → validate (structure, IDs, budgets, licenses) → hash/publish manifest. CI must fail on missing IDs, unexpected bones, absent weights, unapproved license status, oversized assets and broken exercise references.

## 15. PHASED IMPLEMENTATION PLAN

### Phase 0 — normalization and legal gate

Inventory checksums/provenance; separate Gym MVP, Gym Muscle and rugby prototype concepts in documentation (do not move binaries yet); identify hash artifact producer; pin desired Three/glTF tool versions; define test devices/budgets; obtain legal decisions for Z-Anatomy, FBX/avatar and clips. **Exit:** each candidate asset is approved, rejected or explicitly quarantined.

### Phase 1 — PocketPT-native static anatomy slice

Behind a feature flag, expose one reviewed overlay for `bodyweight_squat`; load `thigh.glb` or `fullbody.glb` lazily using the production dependency lifecycle; implement semantic role theme, orbit/touch, click/tap details, cleanup and JPEG/WebGL fallback. Do not animate yet. **Exit:** production exercise ID drives static roles on mobile.

### Phase 2 — canonical avatar conversion proof

If licensed, repair/triangulate/convert Ch18 to a compact neutral GLB; apply the dance clip only as a technical fixture; test bone names, rest pose, root motion, weights and mobile load. **Exit:** one base avatar plus separate clip can play without mesh duplication.

### Phase 3 — one moving anatomy proof

Skin a lower-body anatomy subset to the same rig; acquire/author one squat clip; validate knee/hip/spine deformation, highlights during playback and picking while moving. Compare full anatomy versus simplified overlay. **Exit:** objective go/no-go decision with videos, defect list and performance numbers.

### Phase 4 — reusable asset pipeline

Automate intake, retarget, clip trimming, root policy, keyframe reduction, GLB export, taxonomy extras, compression, structural validation, checksums, license manifest and budgets. **Exit:** a second clip can be added without runtime code changes.

### Phase 5 — canonical data/API integration

Formalize/version the motion and taxonomy schema; migrate the reviewed overlay through PocketPT's content lifecycle; expose member-safe capability projections and reverse muscle queries; add contract/parity tests. **Exit:** no competing exercise DB and unknown mappings fail safely.

### Phase 6 — scale the exercise library

Prioritize movement families; reuse clips where biomechanically valid, model props separately, and require exercise/muscle/animation review. Add 5, then 20—not hundreds at once. **Exit:** measured authoring throughput and quality gates.

### Phase 7 — production optimization and accessibility

LOD/draw-call reduction, decoder/cache/CDN policy, memory/disposal tests, low-tier mobile/device matrix, touch target and keyboard/screen-reader equivalents, reduced-motion behavior, analytics and rollback. **Exit:** signed performance/accessibility/reliability release gate.

## 16. FIRST PROOF-OF-CONCEPT RECOMMENDATION

**Bodyweight squat** is the best end-to-end proof.

Why: it is already a canonical supplemental exercise with an explicit `squat` movement pattern and camera support; matching exercise images exist; Gym Muscle provides squat-adjacent lower-body tags; `thigh.glb` is a manageable 333 KB subset; and the motion stresses exactly the unresolved anatomy problem across hips and knees. A biceps curl is easier but could produce a false sense of success because rigid-looking elbow deformation is much simpler. A successful squat demonstrates animation, multi-joint anatomical deformation, primary/synergist/stabilizer roles, canonical exercise linkage, touch rotation and mobile performance.

Proof acceptance criteria:

1. `bodyweight_squat` resolves one reviewed manifest and clip without a duplicate catalog.
2. Canonical avatar and skinned quads/gluteals/hamstrings/adductors move through a seamless loop; abdomen/erector stabilizers are represented if the chosen subset includes torso.
3. Role colors derive from theme, not data; a moving muscle remains pickable and reports name/current role.
4. No visible detachment or severe collapse at hips/knees across front/side/back views.
5. Base asset and clip meet the provisional budgets and hold 30 fps on the agreed low/mid device.
6. Failure produces the existing image/instructions, not a blank canvas.
7. Asset manifest includes hashes, exact provenance, license/attribution and review status.

## 17. EXACT NEXT ACTION

**Create a non-production, offline “squat deformation spike” asset workspace and decision record—after legal/provenance approval—using a copy of `Ch18_nonPBR.fbx` plus only the `thigh.glb` anatomy subset; align and skin that subset to the existing 65-bone rig, export one disposable GLB, and capture deformation, draw-call, decoded-triangle, compressed-size and licensing-manifest results.**

This is the safest single action because it attacks the confirmed highest-risk assumption before schema changes, dependency imports, UI rewrites or mass conversion. Keep outputs outside served production assets and do not commit redistributed derivatives until the license gate is explicitly cleared.

## Audit evidence and verification notes

Commands used during the audit included:

* `find .. -name AGENTS.md -print`, `git status --short`, and bounded `find`/`rg` inventories across the repository.
* `git log --oneline`, `git show --stat bd02e00`, and `git show --stat c12892a` to separate the two imports.
* Node inspection of `data/exercise.json` for record count, fields and muscle vocabulary.
* Python parsing of every GLB JSON chunk for size, nodes, meshes/primitives, accessors, extensions, extras, skins, animations and vertex attributes.
* A temporary `/tmp/inspect-fbx.mjs` using installed `three/examples/jsm/loaders/FBXLoader.js` to inspect both FBXs' scene graph, bones, skinned meshes and clips. The script was not added to the repository.
* Source review of Gym Muscle viewer/data/licenses, Gym MVP viewer/model/config, canonical exercise schema/catalog/docs, root package scripts, production avatar runtime and existing tests/reports.

Limitations: no graphical FBX/GLB deformation was rendered; Draco geometry was not decoded to exact triangle counts; no legal conclusion was made; no upstream web provenance was assumed; and absent expected files are reported as not present rather than inferred.
