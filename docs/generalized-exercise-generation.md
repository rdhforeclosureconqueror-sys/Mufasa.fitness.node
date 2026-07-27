# Generalized exercise-profile generation plan

## Repository findings and staged rollout

The existing runtime authority is `public/exercise-metadata.js`: a seven-profile UMD bundle containing source facts, generated-like prose, pose rules, validation, and approval records together. `scripts/export-exercise-metadata-review.js` fingerprints that bundle, and `scripts/generate-exercise-review-workspace.js` produces detached profiles, reviews, translation sources, bot inputs, manifests, and decisions. The import database is the 873 exercise JSON records plus generated index and database manifest artifacts in `public/exercise-db`; `data/exercise.json` and the generated exercise index are separate lookup artifacts. This creates content duplication across the UMD source, review export, handoff, translation, and review snapshots. Generated workspace files had been replaceable as a tree, including trainer-decision templates; generation now preserves any existing decision bytes.

Stage A introduces a validated normalized Push-Up source, corrects the runtime source, and makes Push-Up the acceptance fixture. Stage B adds deterministic global → equipment → family → body-position → exercise resolution, provenance, stable fingerprints, phrase construction, and contradiction validation. Stage C adds exercise-ID-scoped pose capabilities; capabilities requiring trainer review remain opt-in records and do not imply approval. Stage D adds a read-only database migration dry run. Stage E remains future work: add trainer-reviewed family rules and small representative samples before any broad migration.

## Artifact and authority boundaries

Files in `exercise-generation/sources` are human-maintained exercise facts. `exercise-generation/rules.json` is the controlled taxonomy/default/template/capability input. `generated/exercise-profiles` and `exercise-review` are generated, non-authoritative review artifacts. Trainer decisions are separate and are preserved byte-for-byte during regeneration. No generator can authorize review or publication, and no automated application of trainer decisions exists.

Fingerprint inputs are canonicalized source data, all controlled shared rules (including templates, capability and threshold references), and generator behavior version; timestamps are excluded. The source's `existingFingerprint` is a stale-write guard for the initial Push-Up conversion. Shared-input dependency reporting and targeted generation use the provenance map; bulk publication is deliberately absent.

## Migration interpretation

The dry run reads every database JSON file, derives a stable candidate ID, detects duplicates and parse failures, and reports missing normalization fields without writing source, generated, approval, review, or publication data. Its conservative result is triage, not a claim that a database record is trainer-ready. Exercises without an explicit exercise-scoped capability must resolve to `no_validated_capability`; coaching content can still be generated once sufficient characteristics exist.
