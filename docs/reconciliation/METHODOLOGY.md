# Legacy Knowledge Reconciliation Methodology

## Version, authority, and scope

Methodology version **1.0.0** audits the immutable `public/new/` legacy source library. The current root application remains authoritative. Ordinary dependencies, build output, caches, Git internals, and unrelated infrastructure are excluded. Legacy support files inside the source library are included because their rejection is architecturally material. No legacy file is deleted, imported, required, evaluated, or executed.

## Repeatable process

1. `legacy:inventory` performs a sorted, non-following filesystem walk, hashes every regular file with SHA-256, bounds parsing, identifies byte duplicates, and records parse failures. JSON is parsed only as data; CSV receives header inspection only; scripts are treated as bytes/text.
2. `legacy:reconcile` applies the explicit file policy in `scripts/lib/legacy-reconciliation.js`, creates stable path-derived IDs, and emits one record per asset.
3. Focused comparisons use canonical files and behavior tests. A name match is identity evidence only—not evidence that rules, cues, tolerances, safety, or media transferred.
4. `legacy:validate` rejects missing evidence, invalid paths/statuses, duplicate IDs, and duplicate asset paths.
5. `legacy:report` recomputes status, domain, transfer-dimension, exercise, Yoga, media, program, and assessment metrics from the register/current catalogs.

## Evidence and interpretation

Claims distinguish architecture, deterministic behavior, structured content, media, professional review, and activation readiness. The denominator for each metric is emitted beside it. “Integrated After Transformation” is used for legacy gamification seeds because the production event ledger/policies preserve the product concept while deliberately not asserting identical point values. Zero is reported where no mapping, approval, benchmark, or review evidence exists.

The ten allowed primary statuses have their task-defined meanings. Every record receives exactly one. Review gates may also appear on records whose primary status is technical validation or partial integration.

## Security and limitations

Paths are normalized relative to the repository and must remain under `public/new/`; symlinks are reported but never followed. Payloads are bounded, executable files are not loaded, secret-like assignments are redacted on serialization, and raw file content is absent from generated artifacts. The audit does not establish copyright, consent, clinical correctness, model quality, or professional approval. It records those absent facts as gates. A file-level record cannot establish row-level validity. Prior sprint documents are supporting evidence, not sole evidence.

The legacy source contains no nutrition-specific knowledge asset, wearable model, running/trail rules, cognitive protocol, notebook, video, or model artifact discovered by deterministic inventory. That absence is not evidence those domains never existed outside this checkout; it is a repository limitation.

