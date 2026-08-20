# Motion Lab multi-avatar Stage 2: native Avaturn playback

## Scope and source audit

Stage 2 uses the single `avaturn_animation` clip already retained in the loaded
`exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb` GLTF. It
does not reload, extract, rename, retarget, or alter the source GLB. The source
contains 46 channels: 40 skeletal tracks addressing 39 skeletal nodes and six
morph-weight tracks. Its nominal duration is about 8.083333 seconds.

The previously observed **195 tracks; 195 unbound** result comes exactly from
`public/motion/assets/phase-e/animation-fixture.glb`. Its clip is named
`Armature|mixamo.com|Layer0` and has 195 channels targeting the canonical Mixamo
hierarchy. Applying it to the Avaturn profile was an incompatible pairing, not
an Avaturn avatar-load failure. Motion Lab now labels and guards both directions:

- **Phase E fixture → Phase E reference avatar**
- **Native Avaturn animation → Avaturn personalized avatar**

## Playback and diagnostics

Selecting the native animation creates an action on the selected avatar's
existing mixer and root. Binding mode is `NATIVE`; there are no track-name,
rest-space, rotation, or prefix transformations. The selection control is only
enabled for `avaturn-personalized-candidate`. Loading that avatar leaves it in
its rest pose: selection and Play remain separate explicit steps.

Two in-memory playback modes are available. **FULL SOURCE CLIP** preserves the
approximately 8.083333-second clip. **BODY-MOTION WINDOW** clones the clip in
memory, sets an end time of 1.533333 seconds, and calls `trim()` on the clone.
The immutable embedded source clip and GLB are unchanged.

The native action supports Play, Pause, Resume, Stop, Restart, Loop OFF, Loop ON,
and explicit unload. Diagnostics identify the avatar profile, animation source,
clip name, source duration, active range/mode, total/skeletal/morph tracks,
bound and exact unbound tracks, playback and loop states, current time, and
`NATIVE` binding mode.

## Lifecycle validation

The automated native lifecycle covers 50 complete cycles of start, personalized
avatar load, native selection, Play, Pause, Resume, Stop, Restart, both loop
states, action unload, avatar unload, and disposal. Each cycle asserts zero
retained actions, mixers, avatar roots, GLTF references, session-owned clip
copies, scene avatar objects, and pending requests. The suite also asserts final
global counts of zero sessions, RAF owners, listeners, timers, and canvases.

## Mobile direct-route assessment

Direct navigation to `/dev/motion-lab` without the opaque, short-lived,
HttpOnly Motion Lab session cookie is expected to return `401 UNAUTHENTICATED`.
The supported launch is the authenticated admin dashboard POST to
`/api/dev/motion-lab/session`, which sets that cookie before navigation. No
authentication was weakened. Repository inspection provides no evidence that
the dashboard-launched path itself fails on iPhone Safari; such a real-device
failure, if reproduced, is a separate bounded defect.

## Human visual acceptance

**STAGE 2 HUMAN VISUAL STATUS: PASS WITH MINOR VISUAL DEFECT.**

The human operator completed verification in the deployed, authenticated Motion
Lab on a real iPhone Safari session. The evidence supports exactly these
observations:

- personalized avatar visible;
- native clip visible;
- motion visibly identified as push-up;
- elbows flex;
- body lowers and rises;
- shoulders coherent;
- torso coherent;
- legs comparatively stable;
- no detached limbs;
- no skeleton explosion;
- no inversion;
- no uncontrolled drift; and
- no duplicate avatar.

The Motion Lab bounded event history also reported `animation_clip` as `PASS`.
This closes the former pending-human-verification blocker and proves native
push-up playback on the personalized avatar's own native skeleton. It does not
make any claim about retargeting or extracted animation assets.

## Bounded visual defect

**Identifier:** `avaturn_head_face_transparency_during_pushup`

During the lower push-up position, the avatar's head/face becomes partially
transparent or visually open. The head does not appear detached, the avatar
remains otherwise coherent, animation continues normally, and the torso and
limbs remain stable. This is categorized only as a rendering/material/mesh
defect; the exact root cause is **NOT YET VERIFIED**. It does not block proof of
native push-up playback and requires a separate bounded follow-up. No source
GLB, material, mesh, texture, normal, morph track, or animation data was changed
as part of recording acceptance.

The follow-up task title is **AVATURN HEAD/FACE TRANSPARENCY FORENSIC**. It must
determine with evidence whether the cause is back-face culling, material
sidedness, mesh normals, facial-mesh overlap, morph targets,
clipping/interpenetration, or another rendering cause; it must not presume one.

## Stage 2 disposition and handoff

The defect is a **NON-BLOCKING VISUAL DEFECT — REQUIRES SEPARATE FOLLOW-UP**.
Available evidence does not show compromised skeleton integrity, source-asset
corruption, broken cleanup, invalid rendering state, or a severe compatibility
or safety failure. Subject to the documented automated validation remaining
green, the Stage 2 disposition is **SAFE TO MERGE: YES**.

The exact next phase is **STAGE 3 — NATIVE AVATURN PUSH-UP EXTRACTION /
PACKAGING**. Preserve
`exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb` as
immutable source truth and produce a separate development-only animation asset
for the confirmed push-up at
`public/motion/assets/exercises/push-up/avaturn-push-up-animation.glb`. Extract
only the required body-motion animation and remove duplicate avatar
mesh/material/texture content. Stage 3 must initially remain native Avaturn
only; it must not retarget to Phase E.

Stage 3 and Phase F are intentionally not started. No extracted push-up GLB,
canonical retarget, M1 repair, anatomy data, legacy-runtime reconnection, or
skeleton-profile retargeter is part of this acceptance closure.
