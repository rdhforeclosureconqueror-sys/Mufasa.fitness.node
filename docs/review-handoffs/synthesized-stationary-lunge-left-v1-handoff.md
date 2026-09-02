# Independent Review Handoff — Synthesized Stationary Left Lunge v1

## Role
Act as an independent technical and visual reviewer. Do not assume this implementation is correct because prior squat work exists. Do not merge solely from static inspection.

## Base
Branch created from main SHA `201d6dd6ed9c34eecb09287c57d45db88cd45ff5`.

## Goal
Test the Movement Lego generator on a second exercise family: a stationary left-forward split-stance lunge. This intentionally does **not** use or copy a dedicated lunge FBX/GLB. It synthesizes a development reference from existing split-stance/asymmetric-loading evidence plus grounded hip/knee level-change mechanics and a new lunge coaching contract.

## Key files
- `public/motion/contracts/stationary-lunge-left.v1.json`
- `public/motion/lunge-motion-spec.js`
- `motion-sources/stationary-lunge-left-synthesis-v1.source.json`
- `public/motion/motion-spec-clip.js`
- `public/motion/motion-lab-lunge-preview.js`
- `motion-lab/index.html`
- `motion-lab/motion-lab-bootstrap.js`
- `test/lunge-motion-spec-v1.test.js`

## Important source-evidence boundary
`crouched sneaking left.fbx` was previously classified as useful candidate evidence for `split_stance`, `crouch`, lateral shift and asymmetric leg loading. Its own manifest explicitly says it is **not a canonical lunge**. Review must preserve that boundary. The lunge is a new synthesis, not an extracted lunge clip.

## New compiler capability to scrutinize
A stationary lunge needs contact anchors established **after** the authored split stance exists. The prior squat contact solver anchored from avatar neutral rest, which would collapse a split stance back toward standing contact locations.

This PR adds optional `groundingPolicy.anchorPhaseId`. For the lunge it is `start`:
1. apply the authored split-stance start pose,
2. capture left-front-foot and right-rear-forefoot world anchors,
3. restore avatar rest pose,
4. compile all phases while correcting root position to those start-pose anchors,
5. restore the avatar rest pose after compilation.

Verify that existing squat behavior is unchanged when `anchorPhaseId` is absent.

## Lunge contract intent
Reference style: stationary lunge, left foot forward, right foot back.

Hard expectations:
- stable split stance,
- left whole foot remains planted,
- right rear forefoot remains planted; rear heel may rise,
- no flight,
- pelvis lowers mostly vertically between supports,
- front and rear knees flex on descent and extend on ascent,
- rear knee approaches the floor without crossing the floor plane,
- front knee tracks with front foot,
- torso remains relatively tall,
- finish returns to the same split stance.

Engineering targets are approximately 90° front-knee and 90° rear-knee inside angles at bottom. These must be measured on the actual skeleton; authored Euler offsets are not the result.

## Tests to run
`node --test test/lunge-motion-spec-v1.test.js test/squat-motion-spec-v1.test.js test/motion-spec-real-avatar.test.js test/motion-lab-inspection-controls.test.js`

Also run the broader Motion Lab suite if available.

## Real-skeleton review required
Use the shipped Phase E reference avatar and report:
- actual front knee inside angle at start and bottom,
- actual rear knee inside angle at start and bottom,
- left-front-foot world displacement across phases,
- right-rear-toe/forefoot world displacement across phases,
- pelvis vertical travel,
- pelvis horizontal travel,
- whether rear knee actually approaches the floor,
- contact-lock residuals,
- whether compilation restores the avatar rest pose.

## Human Motion Lab review
Path after deploy:
`Motion Lab → Initialize Runtime → Start Session → Load Synthesized Lunge Left v1 (Reference Only) → Play`

Use the existing inspection camera and inspect front, left side, right side, back, and arbitrary orbit angles. Pause at bottom.

### Visual GO criteria
- unmistakable left-forward split stance,
- front whole foot stays down,
- rear forefoot stays connected while rear heel is allowed to rise,
- pelvis descends between the feet rather than pitching/lunging forward,
- rear knee travels toward floor,
- both knees flex meaningfully,
- front knee does not cave inward,
- torso is reasonably tall,
- ascent reverses descent and returns to the same split stance,
- no teleporting, foot skating, skeleton explosion, or root snap.

### NO-GO
Request changes if the pose looks like a squat with staggered legs instead of a lunge, if either support contact slides/lifts materially, if the rear knee does not descend, if the start split stance is unstable or too narrow, if the pelvis translates mostly forward/back instead of down, or if the new anchor-phase compiler path regresses the squat.

## Status boundary
Development-only. No biomechanical validation claim. No production scoring thresholds. Human MoveNet front/side evidence is still pending and should later validate/refine this generated reference.
