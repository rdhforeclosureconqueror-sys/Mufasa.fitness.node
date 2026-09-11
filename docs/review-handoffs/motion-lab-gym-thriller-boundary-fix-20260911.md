# Motion Lab Gym / Thriller boundary fix — 2026-09-11

## First failures proved before implementation

### Gym Compatibility

`canonical Motion Lab avatar diagnostics -> missing runtime adapter -> panel fallback { mounted:false }`

The canonical runtime already retained the personalized-avatar profile, 54 loaded bone names, embedded animation inventory, and skeleton diagnostics. The compatibility panel asked for `gymCompatibilityState()` or `personalizedAvatarState()`, but the runtime exported neither and its public snapshot omitted the avatar. The panel therefore discarded known-good state and reported `PERSONAL_AVATAR_MOUNTED` before inspecting any bones.

### Thriller Part 1

`source semantic/world pose -> local-rest delta applied across unlike local bases -> target semantic/world pose`

The prior conversion calculated `inverse(sourceRestLocal) * sourceAnimatedLocal`, then appended that local delta to the target rest local quaternion. That is only valid when source and target local bone frames and parent frames are interchangeable. Mixamo and Avaturn do not satisfy that assumption, so 162 bound channels could produce connected but severely misoriented limbs.

## Implementation

The Motion Lab runtime now publishes a read-only, narrow personalized-avatar adapter backed directly by its existing avatar diagnostics. It does not traverse the scene, inventory a second skeleton, poll, or load another avatar. Load, unload, and reload state follows the canonical session owner.

Thriller normalization now:

1. captures source and target local/world rest quaternions;
2. samples the source hierarchy at each quaternion key time;
3. derives the source semantic rotation in world/rest space;
4. applies that semantic world delta to the target world rest frame; and
5. derives each target local quaternion relative to its animated target parent.

Scale tracks and non-root translations remain removed. Hips translation remains the existing scale-controlled, rest-rebased channel. The overhead-squat implementation was not changed.

Selected frames for `Hips -> LeftUpLeg -> LeftLeg -> LeftFoot` and `Spine -> LeftArm` now retain the local/world rest and animated/produced quaternions, parent world transforms, bone directions, and source/target semantic deltas in `rotationBasisSamples`.

## New success boundary order

`TRACK_BINDING_VALID -> RETARGET_CLIP_NORMALIZED -> RETARGETED_POSE_STRUCTURE_VALID -> RETARGETED_POSE_KINEMATIC_VALID -> VISIBLE_AVATAR_BONES_CHANGED_AFTER_PLAYBACK_TICK -> THRILLER_VISIBLE_PLAYBACK_CONFIRMED`

The kinematic boundary compares source and rendered-target semantic world-rotation deltas. A connected rotation-only contortion now fails at `RETARGETED_POSE_KINEMATIC_INVALID` rather than reaching `FIRST FAILURE: NONE`.

## Human / physical iPhone acceptance still required

No machine evidence approves movement naturalness or visual quality. On a physical iPhone, an authorized owner must:

1. load the personalized avatar and confirm Gym Compatibility automatically reports mounted PASS, 54 bones, and 20/20 mapping;
2. unload it and confirm mounted false, then reload and confirm 20/20 returns;
3. leave the rest-pose checkbox unchecked and confirm `REST_POSE_VALID` remains the first waiting/failing human gate;
4. play Thriller Part 1 first as rotation-only observation, checking hips/left leg/foot and spine/left arm orientation;
5. inspect rotation plus controlled Hips translation for floor drift, jumps, torso inversion, left/right inversion, folding, or curling; and
6. confirm stop/unload restores the avatar rest pose and the existing overhead squat remains visually unchanged.

Authorized human visual rest-pose, movement-naturalness, mobile Safari, and physical-device acceptance remain open.
