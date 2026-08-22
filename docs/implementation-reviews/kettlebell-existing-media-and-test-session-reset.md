# Kettlebell Existing Media and Test Session Reset

## Summary

Connected the four already-approved JPG descriptors to browser-safe backend URLs and added a narrow, internal, idempotent reset command for one exact unfinished test workout. No workout-runtime behavior or visual redesign is included.

## Scope

This change is limited to media delivery and test-state maintenance. The commitment scheduler, canonical allocator, completion/idempotency rules, gamification, and `/workout.html` remain unchanged.

## Existing Media Assets and Canonical Media Mapping

| Canonical exercise ID | Existing source asset |
| --- | --- |
| `exercise_goblet_squat` | `exercise-generation/kettlebellchallenge/gobletsquat.jpg` |
| `exercise_kettlebell_halo` | `exercise-generation/kettlebellchallenge/kettelbellhalo.jpg` |
| `exercise_bent_over_row` | `exercise-generation/kettlebellchallenge/bentoverrow.jpg` |
| `exercise_suitcase_carry` | `exercise-generation/kettlebellchallenge/suitcasecarry.jpg` |

The physical Halo misspelling is intentionally preserved. Unknown IDs have no media descriptor.

## Root Cause of Media Failure

The registry correctly returned an API-root-relative `/exercise-media/...` descriptor. The challenge frontend placed that value directly in `img.src`, so the browser requested the static frontend origin rather than the separately deployed backend origin. The card consequently entered its correct error fallback despite the asset existing.

## Media URL / Serving Architecture

The existing registry and allowlisted `GET /exercise-media/kettlebell/:exerciseId` route remain authoritative. Card and education-sheet markup now resolve descriptors with `MaatApiClient.resolve`, which uses runtime backend-origin configuration. The endpoint looks up canonical IDs only, constrains the resolved file to the approved source directory, returns `image/jpeg`, and exposes no user data.

## Files Changed

- `public/challenge-page.js`: canonical backend-origin media URL resolution.
- `scripts/reset-kettlebell-test-session.js`: internal exact-identifier maintenance command.
- `test/kettlebell-exercise-education.test.js`: four-asset route/content-type/path and frontend-origin contract coverage.
- `test/kettlebell-test-session-reset.test.js`: reset, ownership, idempotency, and clean-state coverage.
- This review artifact.

## Reset Scope and Persistence Records Affected

The command accepts exact user, enrollment, and commitment-session identifiers. It changes only the matching commitment workout's start fields, deletes only its correlated unfinished runtime session from the owned user record, and removes its matching `fitness.startSession` audit-style user event. It refuses completed workouts and mismatched source correlations.

Run from an environment with the mounted production datastore:

```bash
node scripts/reset-kettlebell-test-session.js \
  --user-id '<EXACT_USER_ID>' \
  --enrollment-id '<EXACT_ENROLLMENT_ID>' \
  --commitment-session-id '<EXACT_COMMITMENT_SESSION_ID>'
```

`DATA_DIR` defaults to the repository `data` directory; `--challenge-file` and `--user-file` can explicitly identify mounted files. Repeating the same command produces the same clean result.

## Data Preserved

Enrollment identity, active status, Week 1, three-day commitment, preferred weekdays, all schedule rows and recovery days, original/planned dates, canonical assignments, prescriptions, source identity derivation, and duplicate-start protection are preserved. The command does not edit gamification stores and refuses completed state; the intended stale-start case has no completion award to reverse.

## Security / Ownership

This is not an HTTP route. Exact user ownership, challenge identity, schedule membership, workout type, unfinished status, and runtime source correlations must all match. Arbitrary users cannot invoke it through the application, arbitrary paths are not served by the media route, and media is public challenge-definition content with no user information.

## Tests Added and Tests Run

Tests cover every canonical file mapping, JPEG responses, missing/path-like IDs, backend-origin URL construction, fallback retention, exact ownership, correlation, idempotent reset, schedule preservation, zero completion/streak, runtime removal, and continued canonical resolution/startability. Full command results are recorded in the implementation response.

## Media Verification

The connected contract proves canonical challenge exercise to registry descriptor to backend URL to successful JPEG response. Week 1 Essential retains fallback for Deadlift and Floor Press while Suitcase Carry has its approved descriptor.

## Reset Verification

The reset was executed against isolated local persistence in automated tests. The resulting first workout is due/startable, has no runtime correlation, no prior completion, zero completed commitment workouts, zero commitment streak, and still resolves the unchanged canonical Week 1 allocation with source metadata and owner identity.

## Mobile Verification

Existing responsive media constraints use a fixed media region, `object-fit: cover`, page overflow protection, mobile card sizing, reachable controls, dialog media sizing, and safe-area insets. Browser automation status and tested viewports are reported in the implementation response; no screenshot or binary was added to this change.

## Known Limitations

This checkout does not contain production persistence or the exact production identifiers, so production was not reset. An operator with production datastore access must run the command above with exact identifiers. A completed session intentionally cannot be reset by this operation.

## Merge Readiness

The patch is narrowly scoped, adds no binary assets, retains all integrity protections, and is ready once the reported checks and review are accepted.

## Recommended Next Phase

Proceed only after production reset verification to **Start Workout → Existing Workout Runtime UX and behavior**. Do not rebuild the allocator, scheduler, challenge engine, ownership/completion/gamification models, authoritative handoff, cards, or media system.
