# Kettlebell Exercise Cards + Education Audit

## Baseline audit

At `92a42c7`, the challenge already had canonical exercise IDs and prescriptions, canonical Essential/A/B/C/Technique allocation, commitment schedule states, recovery and rescheduling, server-authoritative Start Workout handoff, and the generic `/api/exercises/:slug` library route. The four proof-of-concept JPGs were already present under `exercise-generation/kettlebellchallenge/`.

The participant page did not yet project a current commitment session, render exercise cards or explicit card states, provide challenge-specific structured education, register the four images, expose them to the browser, or open an education view. The generic exercise endpoint did not resolve the challenge IDs and was therefore not an education fallback for these cards.

## Completed gaps

The active projection now selects the started, today, makeup, or next actionable commitment session without changing scheduler state, and attaches its canonical prescription plus structured education. The page presents that workout before the weekly schedule, renders explicit Not Started, Current, and Completed labels, and keeps Start Workout on the existing authoritative route.

A central allowlisted registry maps four canonical IDs to the existing physical JPGs, browser URLs, and alt text. Express streams those files from their original locations with a fixed mapping, JPEG content type, and immutable cache policy; no binary was copied or modified. Structured education supplies movement-type-specific stages, four richer proof-of-concept records, and a concise canonical fallback for the remaining challenge movements.
