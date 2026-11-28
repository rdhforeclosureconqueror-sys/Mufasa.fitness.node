# Athlete workout intelligence roadmap

Status: proposed integration plan, not runtime activation. Companion to founding club and digital academy roadmaps; do not change their completion counts.

## Competitive acceptance baseline
User-provided workout screenshots show duration, lifted volume, best sets, personal records, exercise completion, per-side reps and loads, workout blocks, exercise thumbnails, primary/secondary anatomy highlights, reported calories and average heart rate, and shareable summaries. Do not retain athlete names or screenshots in the repository.

## Reuse
Canonical exercise catalog and its primary/secondary muscle arrays; program service and analytics; existing workout/media surfaces. See reports/pocketpt-muscle-motion-engine-technical-audit-2026-08-18.md for historical anatomy prototype and licensing findings. Re-audit current files before reuse; do not ship quarantined assets without clearance.

## Milestones
- [ ] WI01 Trace all existing workout logs, persistence, session APIs, PRs, media and analytics; inventory duplicate authorities and data coverage.
- [ ] WI02 Versioned canonical muscle aggregation for planned versus performed exercises; normalize muscle aliases, distinguish primary/secondary, report missing metadata; no inferred EMG or activation percentages.
- [ ] WI03 Canonical per-set execution ledger with exercise ID, session ID, occurrence ID, units, reps, load basis (total/per side/per implement), side, duration/distance, completion, optional RPE; authorized idempotent writes and historical preservation.
- [ ] WI04 Derive volume only from eligible recorded sets with explicit load conventions; best sets and comparable PRs; estimated 1RM labeled with formula and limitations; separate cardio metrics and reported wearable values. No fabricated calories or HR.
- [ ] WI05 Original or license-cleared responsive anterior/posterior anatomy visualization, accessible legend and textual fallback, planned/completed toggle, exercise drilldown. No claims of measured muscle activation.
- [ ] WI06 Athlete session recap with duration, exercise completion, blocks, thumbnails, sets, PRs, muscle targets, privacy-safe opt-in sharing; compare planned versus actual.
- [ ] WI07 Link execution to rugby priority, position, progression and reassessment; volume and adherence are not proof of field transfer.
- [ ] WI08 Regression, authenticated mobile acceptance, privacy/authorization, deploy and rollback verification.

Priority: WI01 then WI02 in parallel with existing FC02 work where safe. No new independent exercise database, no duplicate workout ledger. Existing assignment status alone is not set-level evidence. Preserve general fitness consumers. Actual completion requires tests and live acceptance where applicable.
