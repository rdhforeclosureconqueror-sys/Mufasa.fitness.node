# Squat Generator Rule Hierarchy v1

The generator must not synthesize an exercise from rotations alone.

For a bodyweight squat, generation order is:

1. **Exercise identity** — bodyweight squat.
2. **Hard constraints** — bilateral foot contact, no flight, pelvis descends then rises, stable return.
3. **Numerical targets** — approximately 180° standing knee angle and 90° bottom inside-knee angle for this engineering reference; foot-anchor residual tolerance.
4. **Coaching intent** — sit hips down/back, knees track with feet, stay balanced through whole foot, stand by extending hips/knees together.
5. **Movement Lego selection** — standing, grounded contact, stable stance, hinge, bilateral knee flexion, root descent, crouch, bilateral extension, standing reacquisition.
6. **Source evidence** — use animation evidence only for the mechanics it actually supports; constraints outrank source styling.
7. **Runtime geometry validation** — measure hip/knee/ankle, foot anchors, pelvis direction and compensation signals on the real skeleton.
8. **Human review** — front/side/oblique inspection before promotion.

A source clip may contribute a useful joint relationship while its contact/root behavior is rejected. The exercise contract is authoritative over source animation styling.

## Knee-over-toe policy

Do not encode `knee may never pass toe` as a universal hard rule. Valid squat mechanics vary with anthropometry, stance, squat style and ankle dorsiflexion. Instead evaluate whether forward knee travel is coordinated with planted heels/feet, ankle dorsiflexion, pelvis depth and balance, and whether knees track with the feet without material inward/outward collapse.

## Assessment signals

The engine may flag observable compensation patterns such as heel rise, knee valgus/varus, foot turnout/flattening, asymmetric weight shift, excessive forward lean, insufficient depth or excessive/uncoordinated forward knee translation. These are coaching/movement-screen signals, not medical diagnoses.
