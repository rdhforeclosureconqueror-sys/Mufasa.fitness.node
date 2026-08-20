# Phase E binary handoff

## Status and licensing

**BINARY ASSETS: MANUAL_GENERATION_REQUIRED.** This environment has neither Blender nor another trusted FBX-to-glTF converter. Do not invent, base64-inline, or duplicate binaries. Asset provenance is not production-cleared; both outputs are **DEVELOPMENT / TEST ONLY**.

The runtime contract is centralized in `public/motion/phase-e-assets.js`. Missing files are an expected, bounded `asset_missing` result confined to the admin-only, default-off Motion Lab.

## Compatibility audit: COMPATIBLE

`scripts/motion/inventory-phase-e-assets.js` inspected both binary FBX 7700 sources. Each exposes the same 66 unique `mixamorig:` bone-name markers (Hips root through limbs, fingers, neck/head, and three spine bones), deformer markers, and one motion-sequence/animation-stack marker. This supports animation retargeting by matching names without duplicating the mesh.

This is **COMPATIBLE**, not IDENTICAL: byte sizes/hashes differ and the inventory cannot prove binary bind matrices, rest transforms, axes, scale, root motion, or per-vertex skin influences. The required Blender visual check below must expose rather than conceal a mismatch. If deformation fails, do not upload or relabel the result.

Source inventory:

| Source | Bytes | SHA-256 | Observed |
|---|---:|---|---|
| `exercise-generation/3dmode/Ch18_nonPBR.fbx` | 13,815,152 | `f5c67d8fbfd98d268c65c697e53031ff24733d171381e565ee5506652d1fa5a3` | 66 named hierarchy markers, deformers, one animation stack |
| `exercise-generation/3dmode/Silly Dancing.fbx` | 14,313,184 | `0dcc7485d5f0da6dff6cfe3338481a4e840fcddb66e66e4b3ac6a441b19f5524` | same 66 names, deformers, one animation stack |

Run `node scripts/motion/inventory-phase-e-assets.js` to reproduce the audit.

## Output 1: canonical avatar

- **Source:** `exercise-generation/3dmode/Ch18_nonPBR.fbx`
- **Exact output:** `public/motion/assets/phase-e/canonical-avatar.glb`
- **Purpose:** one reusable humanoid mesh, skin, skeleton, and stable rest pose.
- **Required:** at least one mesh node with a skin; one armature rooted at `mixamorig:Hips`; the observed 66 named bones; preserved bind/rest transforms and all skin influences; meters-equivalent consistent scale, Y-up glTF output, forward orientation preserved from importer.
- **Prohibited:** animation clips and exercise/anatomy metadata.

## Output 2: independent animation fixture

- **Source:** `exercise-generation/3dmode/Silly Dancing.fbx`
- **Exact output:** `public/motion/assets/phase-e/animation-fixture.glb`
- **Purpose:** independently packaged proof clip applied by `THREE.AnimationMixer` to the canonical avatar.
- **Required:** one armature/node hierarchy using the same bone names and at least one clip with named rotation/position tracks.
- **Prohibited:** meshes, skins, materials, textures, or a duplicate avatar.
- **Root motion:** preserve the source Hips track for compatibility inspection; do not bake it into mesh vertices or silently delete it.

## Deterministic Blender 4.2 LTS conversion

1. Install Blender **4.2 LTS**. Clone/check out the repository at starting commit `fa9f3bab15a7a9b74a79de55bd9780a80d6569b8` plus the Phase E1 commit.
2. From the repository root run exactly:
   `blender --background --python scripts/motion/convert-phase-e.py`
3. The script imports with scale `1.0`, disables automatic bone orientation, preserves transforms/skins/all influences, exports GLB/Y-up, removes every avatar action, and removes every non-armature/non-empty object from the animation fixture.
4. Do not rename bones, apply transforms, optimize animation tracks, add Draco, or manually resave the files.

Equivalent desktop UI settings, only if the script cannot run: import FBX with **Scale 1.00**, **Automatic Bone Orientation off**, **Animation on**. For the avatar delete all Actions. For the fixture delete mesh/material objects but retain the armature and Action. Export glTF 2.0 as **GLB**, **Y Up on**, **Apply Modifiers off**, **Skinning on**, **Include All Bone Influences on**, **Animations on**, **Group by NLA Track off**, **Shape Keys off**, **Draco off**.

## Validation before upload

Run:

```sh
node scripts/motion/validate-phase-e-glb.js
sha256sum public/motion/assets/phase-e/canonical-avatar.glb public/motion/assets/phase-e/animation-fixture.glb
```

The validator must exit zero. Its avatar row must show meshes >= 1, skins >= 1, animations 0. Its fixture row must show meshes 0 and animations >= 1; inspect its `trackTargets` for the expected `mixamorig:` names.

Then enable the admin Motion Lab, load avatar, load animation, press Play, and visually confirm: stable scale/orientation, no bind-pose explosion, visible mesh deformation, expected Hips root movement, and no unbound tracks. Exercise Play/Pause/Resume/Stop/Restart/Loop. Run 50 lifecycle cycles and require every owned-resource count to return to zero.

After successful validation, record each output's byte size and SHA-256 in this document and upload both unchanged at the exact paths above. Confirm GitHub displays those exact sizes. Phase E cannot pass until the actual uploaded binaries receive E3 verification.
