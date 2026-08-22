# Kettlebell complete existing-media registry review

**Review date:** 2026-08-22
**Scope:** Existing instructional JPG integration only; no workout allocation, prescription, runtime, ownership, scheduling, completion, gamification, or visual-design changes.

## Canonical inventory and mapping

The authoritative inventory is `EXERCISES` in `data/challenges/kettlebellCanonicalProgram.js`, not the asset filenames. All 16 canonical exercises occur in the approved eight-week pools. Movement category below is the canonical `type` value.

| Canonical exercise ID | Display name | Movement category | Existing matching JPG | Registry status |
|---|---|---|---|---|
| `exercise_kettlebell_deadlift` | Kettlebell Deadlift | `strength` | `Kettlebell Deadlift.jpg` | Registered |
| `exercise_goblet_squat` | Goblet Squat | `strength` | `gobletsquat.jpg` | Existing mapping retained |
| `exercise_bent_over_row` | Bent-Over Row | `unilateral` | `bentoverrow.jpg` | Existing mapping retained |
| `exercise_suitcase_carry` | Suitcase Carry | `timed_unilateral` | `suitcasecarry.jpg` | Existing mapping retained |
| `exercise_kettlebell_halo` | Kettlebell Halo | `cyclical` | `kettelbellhalo.jpg` | Existing mapping retained (physical typo intentional) |
| `exercise_reverse_lunge` | Reverse Lunge | `unilateral` | `ReverseLunge.jpg` | Registered |
| `exercise_kettlebell_floor_press` | Kettlebell Floor Press | `unilateral` | `Kettlebell Floor Press.jpg` | Registered |
| `exercise_two_hand_kettlebell_swing` | Two-Hand Kettlebell Swing | `ballistic` | `Two-HandKettlebellSwing.jpg` | Registered |
| `exercise_overhead_press` | Overhead Press | `unilateral` | `Overhead Press.jpg` | Registered |
| `exercise_farmer_carry` | Farmer Carry | `timed` | `Farmer Carry.jpg` | Registered |
| `exercise_kettlebell_clean` | Kettlebell Clean | `ballistic_unilateral` | `KettlebellClean.jpg` | Registered after visual identity review |
| `exercise_push_press` | Push Press | `ballistic_unilateral` | `PushPress.jpg` | Registered |
| `exercise_high_pull` | High Pull | `ballistic` | `Kettlebell Clean.jpg` | Registered after visual identity review |
| `exercise_front_rack_carry` | Front-Rack Carry | `timed_unilateral` | `Front-Rack Carry.jpg` | Registered |
| `exercise_clean_to_press` | Clean to Press | `composite_unilateral` | `Clean to Press.jpg` | Registered |
| `exercise_kettlebell_snatch` | Kettlebell Snatch | `ballistic_unilateral` | `Kettlebell Snatch.jpg` | Registered |

## Duplicate and ambiguous filename decision

The two clean-looking filenames are distinct files with distinct SHA-256 hashes and were inspected rather than selected by filename alone:

* `KettlebellClean.jpg` visibly identifies and teaches **Kettlebell Clean**, so it maps to `exercise_kettlebell_clean`.
* `Kettlebell Clean.jpg` visibly identifies and teaches **Kettlebell High Pull**, despite its misleading physical filename, so it maps to `exercise_high_pull`.

No canonical exercise remains without matching media. No approximate substitution was made. Unknown IDs still produce `media: null` through the established education contract.

## Architecture and route review

The existing single `MEDIA` registry in `data/challenges/kettlebellExerciseEducation.js` remains the source of both the descriptor returned with exercise education and the backend allowlist. The challenge card and Movement Intelligence sheet both receive that same `education.media` descriptor. The frontend continues to pass `media.url` through `MaatApiClient.resolve`, which selects the canonical backend origin for the separately deployed frontend and backend services.

The existing route is `GET /exercise-media/kettlebell/:exerciseId`. It performs an exact canonical-ID registry lookup, resolves the registered source, verifies the resolved file's immediate parent is the approved kettlebell asset directory, emits `image/jpeg` plus `nosniff`, and returns 404 for unknown or path-like identifiers. It neither accepts a physical path from the client nor exposes user/private storage.

## Verification

Automated coverage verifies the exact 16-ID-to-filename table (including both ambiguous clean filenames), retained mappings, existing files, canonical route descriptors, null media for an unknown exercise, all registered route responses, JPEG content type and byte length, multiple unregistered/traversal-shaped inputs, shared card/sheet descriptor consumption, backend-origin resolution, and the existing image-error fallback.

Regression commands run for this review:

* `npm run lint`
* `npm test`
* `node --test test/kettlebell-exercise-education.test.js`
* `node --test test/kettlebell-workout-integration.test.js`
* `node --test test/kettlebell-commitment-routes-ui.test.js`
* `node --test test/kettlebell-canonical-allocation.test.js`
* `npm run security:validate-routes`
* `git diff --check`

The full suite passed **1,203/1,203** tests. The focused kettlebell commands passed **18/18** tests in total (education/media 4, workout integration 3, commitment routes/UI 4, and canonical allocation 7). The route authorization validator matched all **288** declared runtime routes.

## Binary and mobile status

* New binary files added by this phase: **NO**.
* Existing binary files modified by this phase: **NO**.
* Mobile E2E: not run; Playwright is not present in the project dependencies or scripts. No browser-rendered success is claimed. This is a registry-only change and does not redesign the approved UI.

## Known limitations and merge readiness

Physical filenames remain legacy inputs, including casing, spacing, the halo typo, and the misleading spaced clean filename. They are intentionally isolated behind the canonical registry rather than renamed or exposed in UI code. Route tests use the real application over a loopback HTTP server; deployed Render services were not mutated or asserted before merge/deploy.

The implementation is **ready for human review and merge** provided the recorded regression suite passes in the review environment. Start Workout runtime redesign is explicitly out of scope and has not begun.
