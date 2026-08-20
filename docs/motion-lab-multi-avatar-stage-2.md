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

## Human visual verification (required)

Automated binding and lifecycle checks cannot classify the visible motion.
Status remains **PENDING HUMAN VERIFICATION** until a human performs all steps:

1. Launch authenticated Motion Lab from the admin dashboard.
2. Select **Initialize Runtime**.
3. Select **Start Session**.
4. Select **Load Personalized Avaturn Avatar**.
5. Confirm the personalized avatar appears normally in its rest pose.
6. Select **Native Avaturn Animation**.
7. Select **BODY-MOTION WINDOW (0–1.533333 s)**.
8. Select **Play** and observe the complete motion.
9. Determine whether the motion is visibly a push-up.
10. Confirm a push-up/plank configuration, coherent elbow flexion/extension and
    shoulder motion, a relatively stable torso and legs, and lowering/rising.
11. Confirm there are no detached limbs, skeletal explosion, unexpected
    inversion, uncontrolled translation, or duplicate avatar.
12. Select **Pause**, then **Resume**, **Stop**, and **Restart**.
13. Turn **Loop OFF** and confirm one cycle.
14. Turn **Loop ON** and confirm repeated cycles.
15. Select **Unload Selected Animation**, **Unload Avatar**, then **Dispose Runtime**.
16. Confirm sessions, RAFs, listeners, timers, and canvases all return to zero.

Stage 3 and Phase F are intentionally not started. No extracted push-up GLB,
canonical retarget, M1 repair, anatomy data, or skeleton-profile retargeter is
part of this stage.
