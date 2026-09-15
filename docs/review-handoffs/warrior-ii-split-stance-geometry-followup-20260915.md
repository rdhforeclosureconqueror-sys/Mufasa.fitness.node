# Warrior II / Split-Stance Geometry Follow-up — Independent Review Handoff

Date: 2026-09-15
Scope: follow-up to merged PR #831
Branch: `fix/split-stance-geometry-operator-20260915`
Status: **REVIEW REQUIRED — DO NOT MERGE WITHOUT TEST + VISUAL CHECK**

## Owner-observed result after #831

The description-to-operator correction worked enough that Warrior II now reads as Warrior II:

- arms travel laterally instead of sweeping backward;
- both arms reach opposite directions at shoulder height;
- the lower body opens into a split stance;
- the front leg bends and the rear leg stays comparatively long.

Remaining owner-visible problem:

- stance is still too narrow;
- pelvis/body remains too high;
- front knee does not bend deeply enough for the front thigh to approach horizontal;
- the shape needs to read more like a true Warrior II / standing lunge base, with the front shin near vertical and the front knee stacked over the ankle.

This is **not** a request for a Warrior-II-specific angle patch and is **not yet** a Pose Editor micro-adjustment. Stance width and depth are defining geometry of the reusable split-stance movement family.

## Root cause / architecture boundary

The generator now consumes the description classification, but the generic lower-body archetype for:

`front-knee-bent-rear-leg-straight`

still produced a conservative split stance. The remaining correction belongs in a reusable lower-body geometry policy.

Desired architecture:

`DESCRIPTION -> MOVEMENT CLASSIFICATION -> LOWER-BODY GEOMETRY OPERATOR -> ARM/TRUNK SEMANTIC OPERATORS -> SUPPORT/IK -> CLIP`

The correction must remain classification-driven. Do not branch on `exerciseId === "warrior-ii"`.

## New policy in this PR

`public/motion/motion-description-lower-body-geometry-policy.js`

The policy wraps generated Motion Specs only when:

`generationMetadata.movementClassification.lowerBodyPattern === "front-knee-bent-rear-leg-straight"`

It then:

1. determines the front leg from the generated knee-bend asymmetry rather than pose identity;
2. widens bilateral thigh abduction to create a clearly wider stance;
3. increases front-knee flexion;
4. keeps the rear knee close to straight;
5. lowers the pelvis/root between the two planted feet;
6. records a reusable `movementGeometryPolicy` and lower-body operators in generated metadata;
7. preserves the semantic arm policy created by #831.

### Why this is body-proportional

The stance is generated from bilateral leg-chain joint angles, not a fixed number of inches or fixed world-space foot coordinates. Therefore actual foot separation scales with the loaded avatar's thigh/shin dimensions. Existing generated contact IK remains responsible for grounded support validation.

## Operators expected after generation

For a split stance, `selectedMovementOperators` should include:

- `lower:front-knee-bent-rear-leg-straight`
- `lower:split-stance-knee-over-ankle`
- `geometry:split-stance-leg-proportional-width`
- `root:pelvis-low-between-feet`
- `guard:rear-leg-stays-long`

For Warrior II it must also retain:

- `arm:opposed-lateral-shoulder-axis`
- `guard:no-posterior-arm-sweep`

## Target geometry contract

Current first-pass defaults are deliberately generic and bounded:

- bilateral stance abduction target: 34 degrees minimum magnitude;
- front hip flexion target: 34 degrees minimum magnitude;
- front knee flexion target: 82 degrees minimum magnitude;
- rear knee flexion: no more than 4 degrees magnitude;
- pelvis drop: at least 0.18 avatar-height units.

These are generator engineering targets, not medical/biomechanical claims. They are intended to produce a recognizable, proportionally scaled split stance before owner calibration.

The emitted `movementGeometryPolicy.constraints` must include:

- `front_knee_over_ankle`
- `front_shin_near_vertical`
- `front_thigh_toward_horizontal`
- `rear_leg_extended`
- `pelvis_low_between_feet`
- `stance_width_scales_with_leg_chain`

## Integration path

The existing Motion Lab page already loads `generator-operator-observability-gate.js`.

That gate now loads and installs `motion-description-lower-body-geometry-policy.js` before generator observability. This avoids modifying the large merged generator file directly and keeps the new geometry behavior independently reviewable.

## Automated review required

Run at minimum:

```bash
node --test test/motion-description-to-spec-generator.test.js
node --test test/motion-description-lower-body-geometry-policy.test.js
```

Also run the existing generated IK / Motion Lab regressions relevant to bilateral feet and generated motion compilation.

Review requirements:

1. Confirm there is no Warrior-II / exercise-ID conditional in the new policy.
2. Confirm activation is based only on `lowerBodyPattern` classification.
3. Confirm front side is detected from generated knee-bend asymmetry.
4. Confirm target/hold phases become wider and lower than the #831 baseline.
5. Confirm rear knee stays nearly straight.
6. Confirm `movementGeometryPolicy` is attached to the generated spec.
7. Confirm split-stance operator IDs are added without deleting the semantic arm operator IDs from #831.
8. Confirm the original generation contract still validates the patched spec.
9. Confirm non-split-stance motions pass through unchanged.
10. Confirm no grounding / generated IK regression.

## Owner/device visual acceptance

After deploy, generate **Warrior II fresh** and press Play.

### GO visual result

- feet visibly spread farther apart than the #831 baseline;
- pelvis sinks materially lower between the feet;
- front knee is strongly bent, approaching a right-angle shape rather than a shallow bend;
- front shin reads near vertical and knee stays toward the ankle/toe line;
- rear leg remains visibly long/straight;
- torso remains tall and side-open;
- arms remain one long horizontal line and do not regress to the old backward sweep.

### CALIBRATION result

If all major relationships are correct and the owner only wants a few degrees / a small amount more or less depth, that is the point where Pose Editor calibration is appropriate.

### NO-GO / first-failure rule

Do **not** merge if any of these occur:

- the policy is keyed to Warrior II instead of movement classification;
- stance gets wider but foot grounding / generated IK regresses;
- pelvis lowers by translating the whole character without preserving planted-feet behavior;
- rear knee bends materially;
- semantic arm behavior from #831 regresses;
- non-split-stance motions change;
- tests fail.

If any code change is needed during review, make the change on this PR branch, document the first failing boundary, rerun tests, and leave the PR open until clean.

If review passes with no required fixes and visual/device acceptance is satisfactory, merge the PR.
