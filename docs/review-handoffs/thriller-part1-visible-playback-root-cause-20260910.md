# Thriller Part 1 visible-playback root cause

## First failure

`THRILLER_CLIP_SELECTED`: the runtime selected `animations[0]`, `Armature|mixamo.com|Layer0`, instead of the explicitly authored `Thriller_Part_1_Avaturn` clip. The former has only two input keys per sampled transform and leaves the mounted avatar in its rest pose while its action time advances.

## Runtime GLB inventory and binding proof

`Thriller Part 1.glb` has one scene (`Scene`), 55 nodes (`AvaturnTarget` plus the 54-joint Avaturn hierarchy rooted at `Hips`), one skin, zero meshes, and three 162-channel clips: `Armature|mixamo.com|Layer0`, `avaturn_animation`, and `Thriller_Part_1_Avaturn`. All channels target the named Avaturn bones and contain translation, rotation, and scale tracks. The source-labelled clip uses two-key accessors; the intended dance clip uses 896-key accessors for its animated channels.

The GLB therefore does **not** contain a second rendered character or a Mixamo bone hierarchy. `Armature|mixamo.com|Layer0` is stale source-action metadata retained by the offline export, not proof of the runtime binding target. The runtime GLB scene is never added to the rendered scene. Three.js `AnimationMixer` is constructed with the already-mounted personalized avatar, `clipAction(clip, avatar)` uses that same root, and binding resolution is explicitly rooted at that avatar. The old `162/162` result was nevertheless a false pass: it proved only that identically named target properties existed, not that the accidentally selected two-key source action changed visible bone transforms.

## Fix architecture

Like the working extracted independent push-up path, Thriller now treats the GLB as an animation fixture: select a catalog-declared clip by exact name, resolve every track against the mounted avatar, assert the mixer root is the mounted avatar, and never mount the fixture scene. Playback advances the real mixer once and compares local position/quaternion/scale snapshots for `Hips`, `Spine`, `LeftArm`, `RightArm`, `LeftUpLeg`, and `RightUpLeg`. `FIRST FAILURE: NONE` is withheld until at least one mounted-avatar representative bone changes. Human visual acceptance remains required.
