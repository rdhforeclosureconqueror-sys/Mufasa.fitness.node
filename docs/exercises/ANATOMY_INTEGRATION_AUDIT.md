# Anatomy integration audit — 2026-11-28

Source data/exercise.json blob 99d414913b62e96263f31d1babe5bb50d13444f5: 873 records; primary populated 873, secondary 601, stabilizers 0. Seventeen broad labels. Premium preview has 24 distinct muscle IDs. Canonical runtime src/exercise-intelligence/exerciseCatalog.js adds supplemental identities and classification; audit separately, never assume its count equals source count.

Run `node scripts/audit-anatomy-exercise-coverage.mjs` for repeatable inventory. Exact label matches do not imply anatomical validation. Broad groups must remain explicitly provisional; do not infer individual muscle roles or stabilizers from absent fields. Preserve canonical exercise IDs and provenance; no second catalog. Next: reviewed translation contract, exercise selector, missing/partial states, regression tests and live acceptance. Owner V2.1 screenshot acceptance 5/7; female contour and all-model retest outstanding. Candidate geometry remains unvalidated.
