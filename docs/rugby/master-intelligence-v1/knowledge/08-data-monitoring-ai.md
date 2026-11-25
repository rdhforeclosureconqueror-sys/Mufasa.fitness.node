# Data, Monitoring, Explainability and AI

## External vs internal load
External: work performed.
Internal: athlete response.

### GPS/GNSS
May include:
distance, speed, HSR, sprinting, acceleration/deceleration, MSS, peak windows.
GPS is not total rugby load; static force and collisions can be underrepresented.
Sampling frequency alone does not equal accuracy.
Store device model/ID, software/configuration, filtering context and threshold method.
Prefer same device for the same athlete where practical.
Interpret change relative to measurement error.

### VBT
Possible devices: linear position transducer, IMU, camera or validated alternatives.
Load increases generally correspond to lower velocity within an exercise.
Profiles are exercise-specific.
Mean, mean-propulsive and peak velocity are not interchangeable.
Individual load–velocity profiles are preferable where enough reliable data exist.
VBT can autoregulate:
- load
- volume

Velocity loss is a fatigue marker:
small losses are generally more compatible with power/quality; larger losses represent more fatigue.
Course examples discussed roughly 5–10%, 15–25%, and 30–40%+ bands as contextual, not universal.
One anomalous rep should not trigger a major programme change without confirmation.

## Planned vs actual
Store separately:
- planned programme/session/dose
- actual completed work
- actual RPE
- actual GPS/VBT/sprint/contact exposure
- symptoms/readiness
- technical quality
- modification reason

Then update the athlete state.

## Recommendation explanation
Required structure:
RECOMMENDATION → WHY → EVIDENCE → CONFIDENCE → WHAT WOULD CHANGE THE DECISION → SAFETY/CONTEXT NOTE

Example:
“Lower-body power is RESTORE because jump performance declined across two comparable assessments while strength remained stable. Readiness is normal. Use low-volume high-quality ballistic work with strength maintenance. Confidence: moderate-high.”

## AI responsibilities
AI may:
- summarize state
- explain fired rules
- draft allowed programme options
- answer “what changed?”
- propose substitutions inside allowed method families
- communicate uncertainty

AI may not:
- invent missing measurements
- override safety gates
- diagnose injury/RED-S/concussion
- declare medical clearance
- silently change programme logic
- turn one screen into a causal muscle diagnosis

Structured rules first; language model second.
