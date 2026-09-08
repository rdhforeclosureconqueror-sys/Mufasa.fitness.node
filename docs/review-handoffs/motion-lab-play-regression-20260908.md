# Motion Lab Play regression — 2026-09-08

## Owner symptom
After the desktop launcher was repaired, Motion Lab opens but the generated lunge does not become playable. The Play control remains unavailable because no ready motion/action is selected.

## Regression window
PR #730 explicitly restored a compilable v2.1 lunge by removing the contradictory step-back contact. PRs #731/#732 then materially changed entry, split-plant, descent and bottom leg geometry to enforce a longer stride / near-90-degree authoring intent.

The new v2.2 validator checks authored degree thresholds, but those thresholds are not equivalent to runtime world-space reachability on the shipped reference avatar. The Phase 4 compiler remains fail-closed: if generated two-bone IK/contact validation cannot solve a phase, no clip is created. Motion Lab then correctly keeps Play disabled because `state.motion` is never populated.

## Corrective boundary
Restore the last known-playable v2.1 lower-body geometry while preserving the safer v2.2 exit-neutralization shape and the finite non-looping sequence. The raw-degree entry gate is demoted from hard playability authority to advisory metadata until a runtime/world-space playability gate is available.

Future lunge geometry changes must clear both:
1. authoring-intent validation; and
2. runtime compiler playability (`animation_clip: PASS`, action ready, Play enabled).

A spec-only PASS must never be treated as proof that the generated animation is playable.
