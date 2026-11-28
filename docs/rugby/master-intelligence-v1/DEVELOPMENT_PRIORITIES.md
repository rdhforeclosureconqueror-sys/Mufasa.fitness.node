# Evidence-backed working priorities

This delivery activates `/rugby-development-review.html` and the admin GET/POST `/api/admin/rugby/athletes/:athleteId/development-priorities`. Athlete review links to the selected athlete's working priorities. `/rugby-acceptance-checklist.html` offers 13 browser-saved personal test steps, without recording official human acceptance.

## How the pieces connect

Combine results, movement screens and rugby observations enter the existing assessment capture service. The current-record view excludes superseded results. An authenticated canonical admin selects those records, a development question and the kind of concern: physical capacity, movement control, technical execution, decision quality or a need for more evidence. They record a finding, reasoning, an alternative explanation and a comparable retest plan. Candidate exercise families come from the existing full-XV development menus; available exercise IDs resolve through the canonical exercise catalog.

Saving is active and appends a working priority to the existing canonical athlete user store. It pins evidence, menu and exercise versions and the recording admin. Retries reuse a submission ID; changed requests cannot reuse that ID. A later evidence correction leaves the original snapshot intact and marks the old priority for re-review. The UI confirms persistence by reading the saved record back.

This is a working coaching hypothesis, not proof of a deficit. Pain, unknown pain, current readiness and missing supervision/prerequisites remain review conditions. Capture does not become independent verification. Catalog default sets/reps/rest are deliberately excluded from these exercise references. Publication, workout assignment, training dose and stage progression are separate operations and are not implemented by this route.

## Next connection

Use the saved priority as the explicit input to a versioned programme draft: select exercises/drills, specify appropriate load and frequency through the authorized coaching workflow, assign planned sessions, then compare completed sessions and comparable retests. Reuse the existing programme service rather than creating a competing assignment authority. Field transfer and stage recommendations follow that evidence trail.

The original overall roadmap remains 30/53; this bounded delivery does not close a broader acceptance checkpoint.

## Validation and rollback

Automated tests cover authorization, cross-athlete and superseded evidence rejection, immutable snapshots, correction handling, canonical exercise references without doses, pain/readiness visibility, idempotency, UI JSON/save/readback, stale response handling, checklist persistence/reset and failed-write retries. VM UI checks are technical tests, not visual or physical-device acceptance. Owner signed-in iPhone saves, audio and layout remain pending and are enumerated in the personal checklist.

Both Render frontend and backend deploy main. Roll back by reverting the squash commit through a reviewed rollback PR and redeploying both services. No migration or environment change is involved. Keep appended `rugbyDevelopmentPriorities` in the user store; rollback stops exposing the feature without deleting its records. Checklist ticks are local to each browser and can be reset by their owner.
