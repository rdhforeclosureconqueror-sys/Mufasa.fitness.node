# PocketPT personalized Avaturn avatar and push-up forensic audit

**Date:** 2026-08-20  
**Scope:** read-only binary inspection and architecture recommendation. No runtime, canonical asset, fixture, production, or member-facing behavior was changed.

## 1. Personalized Avaturn inventory

| Property | Exact result |
|---|---|
| Path | `exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb` |
| SHA-256 | `ec21fb1b5ba8499f2e410b49272e2b7f30e09257cd737c9efe25c0cd3d21adb6` |
| File size | 13,547,220 bytes |
| glTF / generator | glTF 2.0; `Avaturn.me | Blender` |
| Scenes / scene | 1; default scene `Scene` |
| Nodes | 65 |
| Scene root | node 64, `Armature` |
| Meshes / primitives | 10 / 10; all ten mesh nodes reference skin 0 |
| Materials | 10 (`Body`, `Eyes`, `EyeAO`, `Eyelash`, `Head`, two `Teeth`, `avaturn_hair_0_material`, `avaturn_shoes_0_material`, `avaturn_look_0_material`) |
| Textures / images | 28 / 28 |
| Skins / joints | 1 (`Armature`) / 54 |
| Animations | 1, `avaturn_animation` |
| Animation duration | glTF clip duration 8.083333015441895 s; skeletal portion 0–1.5333333015441895 s; the longer duration comes only from six facial morph-weight channels |
| Channels / samplers | 46 / 46 |
| Channel kinds | 1 translation, 39 rotation, 0 scale, 6 morph weights |
| Animated targets | 45 unique nodes: 39 joint targets plus 6 facial mesh targets |
| Bounds in loaded rest pose | min `[-0.938343505, -0.014111275, -0.158168922]`, max `[0.938166253, 1.851347584, 0.203884915]`; dimensions **1.876509758 × 1.865458860 × 0.362053837 m** (X × Y × Z) |
| Extensions | No `extensionsUsed` or `extensionsRequired` |

The avatar mesh and animation **do coexist in the same GLB**. There are ten skinned mesh nodes (`Body_Mesh`, `Eye_Mesh`, `EyeAO_Mesh`, `Eyelash_Mesh`, `Head_Mesh`, `Teeth_Mesh`, `Tongue_Mesh`, `avaturn_hair_0`, `avaturn_shoes_0`, and `avaturn_look_0`) and one animation.

### Exact joints and hierarchy

The complete 54-joint hierarchy is:

```text
Armature (scene root, not a skin joint)
└─ Hips
   ├─ Spine
   │  └─ Spine1
   │     └─ Spine2
   │        ├─ Neck
   │        │  └─ Head
   │        │     ├─ LeftEye
   │        │     └─ RightEye
   │        ├─ LeftShoulder
   │        │  └─ LeftArm
   │        │     └─ LeftForeArm
   │        │        └─ LeftHand
   │        │           ├─ LeftHandThumb1 → LeftHandThumb2 → LeftHandThumb3
   │        │           ├─ LeftHandIndex1 → LeftHandIndex2 → LeftHandIndex3
   │        │           ├─ LeftHandMiddle1 → LeftHandMiddle2 → LeftHandMiddle3
   │        │           ├─ LeftHandRing1 → LeftHandRing2 → LeftHandRing3
   │        │           └─ LeftHandPinky1 → LeftHandPinky2 → LeftHandPinky3
   │        └─ RightShoulder
   │           └─ RightArm
   │              └─ RightForeArm
   │                 └─ RightHand
   │                    ├─ RightHandThumb1 → RightHandThumb2 → RightHandThumb3
   │                    ├─ RightHandIndex1 → RightHandIndex2 → RightHandIndex3
   │                    ├─ RightHandMiddle1 → RightHandMiddle2 → RightHandMiddle3
   │                    ├─ RightHandRing1 → RightHandRing2 → RightHandRing3
   │                    └─ RightHandPinky1 → RightHandPinky2 → RightHandPinky3
   ├─ LeftUpLeg → LeftLeg → LeftFoot → LeftToeBase
   └─ RightUpLeg → RightLeg → RightFoot → RightToeBase
```

This tree is also the exact joint-name list. `Hips` is the skeleton root in practice even though the glTF skin's optional `skeleton` field is absent. Its rest translation is approximately `[0, 0.984089396, 0.005022130]`, rotation `[0.001074115, 0.000000065, 0, 0.999999423]`, and scale approximately one. Thus the asset is meter-scale, Y-up, upright, and almost identity-oriented at the hips. Several descendants contain authored local scale (`Spine2` 0.91, `Neck` 1.048, `Head` 1.12, shoulders 1.044, arms 1.11), which matters to retargeting.

### Exact animation targets

Rotation channels target: `Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, both `Shoulder`, `Arm`, `ForeArm`, `Hand`, `UpLeg`, `Leg`, and `Foot` chains; `RightHandThumb1`; and the first two phalanges of each hand's thumb/index/middle/ring/pinky where present. Twenty-three rotation channels have 47 keys over 1.533333302 seconds; sixteen finger channels are one-key constants. The sole translation channel targets `Hips` with 47 keys. The six 486-key, 8.083333015-second weight channels target `Eye_Mesh`, `Eyelash_Mesh`, `Head_Mesh`, `Teeth_Mesh`, `Tongue_Mesh`, and `EyeAO_Mesh`.

## 2. Current Phase E canonical inventory

| Property | Exact result |
|---|---|
| Path | `public/motion/assets/phase-e/canonical-avatar.glb` |
| SHA-256 | `9f70e94ebd974db01deebc14e2ff488bb47d495728521f83515e32dfe9b0c876` |
| File size | 15,145,460 bytes |
| glTF / generator | glTF 2.0; `Khronos glTF Blender I/O v4.2.70` |
| Scenes / nodes | 1 / 67 |
| Scene root | node 66, `Armature` |
| Meshes / primitives | 1 / 1 (`Ch18`, skinned) |
| Materials / textures / images | 1 / 4 / 4 |
| Skins / joints | 1 / 65 |
| Animations | 0 (intentionally neutral canonical avatar) |
| Bounds in loaded rest pose | dimensions **1.780250935 × 1.772854632 × 0.313713003 m** (X × Y × Z) |
| Extensions | `KHR_materials_specular` used, not required |

The canonical root uses a Blender-export conversion: `mixamorig:Hips` has translation `[0, 2.555347919, -93.766197205]` and a -90° X quaternion `[-0.707106769, 0, 0, 0.707106769]` beneath an `Armature` scaled by 0.01. Bone translations are consequently expressed near centimeter values, unlike the Avaturn meter-scale rig. Its exact 65-joint set is the 52 shared humanoid/finger joints in the mapping below plus `mixamorig:HeadTop_End`, ten `mixamorig:*Hand*4` fingertip joints, and `mixamorig:LeftToe_End` / `mixamorig:RightToe_End`.

The GLTFLoader parse test succeeds for both assets. Avaturn uses core glTF PBR materials with opaque, `MASK`, and `BLEND` modes and double-sided flags; canonical additionally uses Three.js-supported `KHR_materials_specular`. This establishes structural loader support, not final visual approval of transparency, hair, textures, color space, or skin weights.

## 3. Skeleton comparison

| Concern | Finding |
|---|---|
| Hierarchy | The 52 shared body/finger joints have the same parent/child topology after removing canonical `mixamorig:`. Avaturn adds two eye joints; canonical instead adds head-top, toe-end, and ten fourth-finger/end joints. |
| Joint count | Avaturn 54; canonical 65. |
| Naming | No exact raw names. 52 are prefix-only matches (`Name` → `mixamorig:Name`); two Avaturn eyes are missing. |
| Rest pose / axes | Both are humanoid upright assets, but local rest quaternions and several Avaturn local scales differ. Canonical has a root -90° X conversion and 0.01 armature scale. They are not interchangeable bind/rest spaces. |
| Parents | Shared topology matches; terminal chains differ as described above. |
| Bind matrices | Each asset has its own complete, finite inverse-bind accessor (54 versus 65 matrices). They are not numerically interchangeable because dimensions, rest transforms, axes, and joint sets differ. |
| Scale | Loaded heights are close (Avaturn 1.86546 m; canonical 1.77285 m), but encoded rig units/root conversion differ materially. |
| Root orientation | Avaturn `Hips` is nearly identity and Y-up. Canonical `mixamorig:Hips` carries -90° X under a 0.01 armature conversion. |
| Skinning | Avaturn: ten skinned meshes, each bound to 54 bones. Canonical: one skinned mesh bound to 65 bones. |
| Materials | Both are GLTFLoader-supported. Avaturn has ten multi-part/avatar materials and alpha content; canonical has one specular-extension material. |
| Direct animation reuse | Unsafe without profile-aware name mapping and rest-space retargeting. AnimationMixer itself supports both. |

**Compatibility percentages:** source-joint semantic coverage is **52/54 = 96.30%**. Exact raw-name compatibility is **0/54 = 0%**. Coverage of the larger canonical joint set is **52/65 = 80.00%**. The useful overall mapping compatibility is therefore **96.30% of Avaturn source joints**, but this must not be mistaken for clip compatibility: bind/rest-space compatibility is not exact.

## 4. Complete Avaturn-to-canonical bone mapping

Status meanings: `EXACT` is byte-for-byte name equality; `PREFIX-ONLY` differs only by the canonical namespace; `RENAMED` is a semantic rename; `AMBIGUOUS` has multiple plausible targets; `MISSING` has none.

| Avaturn bone | Current canonical bone | Status |
|---|---|---|
| Hips | mixamorig:Hips | PREFIX-ONLY |
| Spine | mixamorig:Spine | PREFIX-ONLY |
| Spine1 | mixamorig:Spine1 | PREFIX-ONLY |
| Spine2 | mixamorig:Spine2 | PREFIX-ONLY |
| Neck | mixamorig:Neck | PREFIX-ONLY |
| Head | mixamorig:Head | PREFIX-ONLY |
| LeftEye | — | MISSING |
| RightEye | — | MISSING |
| LeftShoulder | mixamorig:LeftShoulder | PREFIX-ONLY |
| LeftArm | mixamorig:LeftArm | PREFIX-ONLY |
| LeftForeArm | mixamorig:LeftForeArm | PREFIX-ONLY |
| LeftHand | mixamorig:LeftHand | PREFIX-ONLY |
| LeftHandThumb1 | mixamorig:LeftHandThumb1 | PREFIX-ONLY |
| LeftHandThumb2 | mixamorig:LeftHandThumb2 | PREFIX-ONLY |
| LeftHandThumb3 | mixamorig:LeftHandThumb3 | PREFIX-ONLY |
| LeftHandIndex1 | mixamorig:LeftHandIndex1 | PREFIX-ONLY |
| LeftHandIndex2 | mixamorig:LeftHandIndex2 | PREFIX-ONLY |
| LeftHandIndex3 | mixamorig:LeftHandIndex3 | PREFIX-ONLY |
| LeftHandMiddle1 | mixamorig:LeftHandMiddle1 | PREFIX-ONLY |
| LeftHandMiddle2 | mixamorig:LeftHandMiddle2 | PREFIX-ONLY |
| LeftHandMiddle3 | mixamorig:LeftHandMiddle3 | PREFIX-ONLY |
| LeftHandRing1 | mixamorig:LeftHandRing1 | PREFIX-ONLY |
| LeftHandRing2 | mixamorig:LeftHandRing2 | PREFIX-ONLY |
| LeftHandRing3 | mixamorig:LeftHandRing3 | PREFIX-ONLY |
| LeftHandPinky1 | mixamorig:LeftHandPinky1 | PREFIX-ONLY |
| LeftHandPinky2 | mixamorig:LeftHandPinky2 | PREFIX-ONLY |
| LeftHandPinky3 | mixamorig:LeftHandPinky3 | PREFIX-ONLY |
| RightShoulder | mixamorig:RightShoulder | PREFIX-ONLY |
| RightArm | mixamorig:RightArm | PREFIX-ONLY |
| RightForeArm | mixamorig:RightForeArm | PREFIX-ONLY |
| RightHand | mixamorig:RightHand | PREFIX-ONLY |
| RightHandThumb1 | mixamorig:RightHandThumb1 | PREFIX-ONLY |
| RightHandThumb2 | mixamorig:RightHandThumb2 | PREFIX-ONLY |
| RightHandThumb3 | mixamorig:RightHandThumb3 | PREFIX-ONLY |
| RightHandIndex1 | mixamorig:RightHandIndex1 | PREFIX-ONLY |
| RightHandIndex2 | mixamorig:RightHandIndex2 | PREFIX-ONLY |
| RightHandIndex3 | mixamorig:RightHandIndex3 | PREFIX-ONLY |
| RightHandMiddle1 | mixamorig:RightHandMiddle1 | PREFIX-ONLY |
| RightHandMiddle2 | mixamorig:RightHandMiddle2 | PREFIX-ONLY |
| RightHandMiddle3 | mixamorig:RightHandMiddle3 | PREFIX-ONLY |
| RightHandRing1 | mixamorig:RightHandRing1 | PREFIX-ONLY |
| RightHandRing2 | mixamorig:RightHandRing2 | PREFIX-ONLY |
| RightHandRing3 | mixamorig:RightHandRing3 | PREFIX-ONLY |
| RightHandPinky1 | mixamorig:RightHandPinky1 | PREFIX-ONLY |
| RightHandPinky2 | mixamorig:RightHandPinky2 | PREFIX-ONLY |
| RightHandPinky3 | mixamorig:RightHandPinky3 | PREFIX-ONLY |
| LeftUpLeg | mixamorig:LeftUpLeg | PREFIX-ONLY |
| LeftLeg | mixamorig:LeftLeg | PREFIX-ONLY |
| LeftFoot | mixamorig:LeftFoot | PREFIX-ONLY |
| LeftToeBase | mixamorig:LeftToeBase | PREFIX-ONLY |
| RightUpLeg | mixamorig:RightUpLeg | PREFIX-ONLY |
| RightLeg | mixamorig:RightLeg | PREFIX-ONLY |
| RightFoot | mixamorig:RightFoot | PREFIX-ONLY |
| RightToeBase | mixamorig:RightToeBase | PREFIX-ONLY |

No mapping is `EXACT`, `RENAMED`, or `AMBIGUOUS` under the requested strict classification.

## 5. Default-avatar suitability

**Classification: READY AFTER NORMALIZATION** for a Motion Lab candidate; **not ready for production default promotion**.

The model is a valid multi-mesh skinned glTF that loads into the current Three.js version, has a conventional humanoid topology, and can be driven by `AnimationMixer`. It can support its native push-up immediately in an isolated test. It can support future squat, yoga, exercise-library, and MoveNet-mirroring work once those motions go through a declared Avaturn skeleton profile (names, rest-space correction, root/scale policy, and validation), rather than assuming generic humanoid equivalence.

Required normalization is asset/profile-level, not destructive replacement: establish license/provenance, asset hash, skeleton profile, sanitized runtime names, root scale/orientation, rest pose, bounds/camera framing, material/alpha behavior, clip separation, and disposal/load performance. Cross-rig use against canonical needs actual retarget/conversion, not prefix substitution alone.

## 6. Embedded push-up analysis

**Structural classification: LIKELY PUSH-UP.**  
**Approval qualifier: MOTION IDENTITY REQUIRES HUMAN VISUAL VERIFICATION.**

Evidence:

* The only clip is `avaturn_animation`.
* Its skeletal cycle is 1.533333302 seconds with 47-key body tracks, even though facial morph animation extends the glTF clip to 8.083333015 seconds.
* Hips translation ranges are X 0.014782105, Y 0.322324932, Z 0.104536522 m; the first and final hip translation differ by only `2.33e-10`, so the body cycle closes and has no accumulated root drift.
* Hips rotation, torso, shoulders, upper arms, forearms, hands, thighs, knees, and feet all move. Forearm quaternion-component ranges are especially large (left up to 0.7400/0.5184; right up to 0.7744/0.6123), consistent with a bend-and-extend cycle. Upper-arm/shoulder motion is substantial; legs and feet move much less, consistent with a braced lower body.
* All 23 moving skeletal rotation channels and hips translation return extremely close to their start values (largest reported body start/end quaternion-vector delta about `1.33e-6`). This supports a looped repetition.

Metadata and trajectories can establish a closed, coordinated upper-body-dominant lowering cycle; they cannot prove exercise identity, hand/foot contact, safe form, or visual quality. A human must play the first 1.533333302 seconds on the personalized avatar. The facial tracks should be excluded or deliberately handled during exercise extraction, otherwise the nominal clip continues for another 6.55 seconds after the skeletal repetition ends.

## 7. M1 unbound root cause

The exact requested M1 targets are:

```text
mixamorig:Hips
mixamorig:LeftArm
mixamorig:RightArm
mixamorig:LeftForeArm
mixamorig:RightForeArm
```

All five exist with those exact names in the canonical GLB JSON. However, Three.js `GLTFLoader` sanitizes reserved `:` characters from node names. The actual loaded object names are:

| Requested target | Actual loaded canonical bone | Why lookup failed |
|---|---|---|
| mixamorig:Hips | mixamorigHips | `GLTFLoader`/`PropertyBinding.sanitizeNodeName` removes `:`; compiler performs exact `Map.has()` lookup |
| mixamorig:LeftArm | mixamorigLeftArm | Same |
| mixamorig:RightArm | mixamorigRightArm | Same |
| mixamorig:LeftForeArm | mixamorigLeftForeArm | Same |
| mixamorig:RightForeArm | mixamorigRightForeArm | Same |

Thus `motion_targets_unbound` is deterministic and affects **all five targets**, not a missing skeleton bone. The Avaturn names contain no reserved colon, so its native track names survive unchanged and avoid this particular failure. It still needs an explicit skeleton-profile mapping for any semantic/spec-generated or cross-avatar clip; do not rely on coincidental loader sanitization.

## 8. Animation extraction feasibility

**Feasible.** Produce an animation-only glTF/GLB with no meshes, materials, textures, images, or skins:

1. Preserve the source SHA-256 and work on a copy.
2. Isolate the skeletal interval 0–1.5333333015441895 seconds. Decide separately whether facial expression is product-required; do not let its 8.083333 duration define exercise cadence.
3. Copy the 40 skeletal channels (one hips translation + 39 rotations) and their samplers/accessors. Optionally remove the sixteen constant one-key finger tracks if equivalence is verified.
4. Retain a minimal transform-node hierarchy containing only referenced animation targets, or serialize a Three.js `AnimationClip` fixture with skeleton-profile-qualified semantic targets. Do not include mesh/skin data.
5. Name/version the motion (for example `push_up/avaturn_native_v1`), record source hash, source skeleton profile, time span, root-motion policy, loop policy, and human-approval state.
6. Validate channel/accessor bounds, finite quaternions, unique targets, duration, closed-loop tolerances, and absence of mesh/material/image/skin payloads.
7. Reload the personalized avatar separately, map fixture targets through the Avaturn profile, bind with `AnimationMixer`, play, and visually approve lifecycle controls and disposal.
8. Only then generate a distinct **retargeted derivative** for the Phase E profile using rest-local correction quaternions, hierarchy correspondence, avatar-height-normalized hips translation, root-axis conversion, and excluded/missing-joint policy. Validate visually; do not label a string-renamed native clip cross-compatible.

## 9. Can one exercise motion drive both avatars?

**One semantic exercise motion: yes. One raw authored clip unchanged: no evidence yet.** The Avaturn clip can directly drive the Avaturn rig after extraction. The canonical rig differs in namespace, runtime-sanitized names, root conversion, scale, rest quaternions, bind matrices, and terminal joints. A retargeter can derive profile-specific clips from one source motion, but simple track renaming risks rotated or displaced limbs. The durable unit is one motion identity/version with per-skeleton compiled fixtures (or runtime retargeting), never duplicated human meshes.

## 10. Recommended multi-avatar architecture

Design-only `Avatar Registry` record:

```text
avatar_id
 display_name
 source { provider, owner_scope, source_asset_hash, license/provenance }
 skeleton_profile
 asset_url
 compatibility_profile {
   three_revision, loader_status, unit_scale, up_axis, forward_axis,
   root_bone_semantic, runtime_name_map, rest_pose_id,
   supported_motion_profiles, material_features, bounds_policy
 }
 status: candidate | lab-approved | fallback | default-eligible | retired
```

Initial records:

1. `owner_avaturn_v1`: personalized owner avatar; candidate; `avaturn_humanoid_v1`.
2. `phase_e_reference_v1`: current known-good reference/fallback; `phase_e_mixamo_v1`; remains intact.
3. Future member-created Avaturn avatars: per-member asset records sharing a versioned provider skeleton profile only after import validation; never a hard-coded mesh assumption.

Keep separate registries/contracts for `Avatar`, `SkeletonProfile`, `MotionDefinition`, `AnimationFixture`, and `MotionCompatibility`. Selection resolves `(avatar skeleton profile, motion identity) → validated fixture/retarget strategy`.

## 11. Motion Spec + animation fixture architecture

This should become the permanent split:

* **Motion Spec** is semantic authority: exercise identity, START/DESCENT/BOTTOM/ASCENT/FINISH, ordering, tempo intent, recognition conditions, contacts, coaching meaning, limitations, and versioning. It must not pretend recognition thresholds are bone rotations.
* **Animation Fixture** is authored visual data: source skeleton profile, quaternion/translation/scale tracks, keys, timing curves, root-motion policy, loop closure, provenance, and visual-review status.
* A binding/retarget layer resolves semantic joints to runtime node names and compiles or selects a skeleton-specific clip. Compatibility results are explicit and cached by avatar, skeleton profile, motion, fixture, and runtime version.
* Recognition, rep persistence, and coaching remain outside the visual fixture. A fixture may visualize a semantic phase but never becomes measurement or coaching authority by itself.

This preserves M1's semantic work while allowing higher-quality authored motion to replace only the visualization layer.

## 12. Exact next implementation stage

Execute **Stage 1 only** next: add the personalized Avaturn candidate as a separately addressed, authenticated Motion Lab-only asset and load it through the existing shared Three.js loader/session. Do not change the canonical asset path or default. Capture diagnostics for hash, load time, ten skinned meshes/54 joints, material/texture success, bounds/framing, one renderer, one RAF owner, and zero resources after disposal. Human-review appearance and rest pose.

After Stage 1 approval, separately authorize Stage 2 (native embedded clip playback). Later stages remain gated: extract skeletal motion; reload avatar plus independent motion; create/validate a canonical retarget derivative; then design/implement registry/default selection. Do not automatically execute any later stage.

## 13. Files that would change in the next authorized stage

Expected Stage 1-only changes (exact naming may be finalized during implementation):

* A **new copy or published candidate path** under a Motion Lab-only asset namespace; the source asset remains immutable.
* `public/motion/phase-e-assets.js` or a new lab candidate manifest/registry module, preferably the latter to avoid implying promotion.
* `motion-lab/motion-lab-runtime.js` and possibly `motion-lab/index.html` for an operator-only candidate load action and diagnostics.
* Motion Lab route allowlist only if the new asset/module requires an authenticated route.
* Focused Motion Lab/asset-isolation tests and a Stage 1 verification document.

No such implementation change was made by this audit.

## 14. Files that must not change

* `public/motion/assets/phase-e/canonical-avatar.glb`.
* `public/motion/assets/phase-e/animation-fixture.glb` (current dance fixture).
* Production workouts, exercise library, MoveNet production runtime, rep persistence, coaching, dashboard, anatomy, and all Phase F files/work.
* Core/member runtime and authentication behavior, except an explicitly scoped Motion Lab route test if later authorized.
* Shared renderer/RAF ownership and cleanup/disposal contracts must not be forked or bypassed.

## 15. Decision

**CONDITIONAL GO.**

* **GO** for Stage 1 Motion Lab-only loading of the personalized avatar.
* **CONDITIONAL GO** for native push-up playback and extraction after human visual confirmation, license/provenance confirmation, and lifecycle/material validation.
* **NO-GO now** for replacing `canonical-avatar.glb`, changing the product default, treating the raw clip as cross-rig compatible, production/member-facing changes, or beginning Phase F.

The owner avatar is a strong candidate and its embedded skeletal trajectory is likely a push-up, but default promotion remains gated by visual and lifecycle validation. Cross-avatar reuse requires profile-aware retargeting.

## Audit method and reproducibility

Commands used:

```bash
stat -c '%n %s bytes' exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb public/motion/assets/phase-e/canonical-avatar.glb
sha256sum exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb public/motion/assets/phase-e/canonical-avatar.glb
node /tmp/glbaudit.js exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb public/motion/assets/phase-e/canonical-avatar.glb
node /tmp/threebounds.mjs exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb public/motion/assets/phase-e/canonical-avatar.glb
node /tmp/names.mjs public/motion/assets/phase-e/canonical-avatar.glb
npm run motion:validate-phase-e
node --test test/push-up-motion-spec.test.js test/motion-phase-e.test.js test/motion-lab.test.js
```

`/tmp/glbaudit.js`, `/tmp/threebounds.mjs`, and `/tmp/names.mjs` were ephemeral read-only inspection utilities and are not repository changes. Bounding dimensions reported above use Three.js r158 `GLTFLoader` plus `Box3.setFromObject`, including skinned vertex transforms; textures/materials were stripped only in-memory for the headless geometry parse. Counts, names, hierarchy, accessors, channel timing, and trajectory ranges came directly from each GLB's JSON and binary chunks.
