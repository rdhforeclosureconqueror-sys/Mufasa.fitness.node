# Executive Report — Legacy Brain Reconciliation

**Register version:** 1 / schema 1.0.0  
**Decision:** the old brain has **not** been completely transferred. Architecture was overwhelmingly replaced safely, but most domain content, movement data, media, and expert approval did not transfer.

## Direct answers and coverage metrics

| Question | Evidence-based answer |
|---|---|
| Did everything valuable make it in? | **No.** 2 assets are partial, 4 need expert review, and 27 need technical validation. |
| Architecture transferred? | **20/21 (95.2%)** applicable architecture assets resolved into current authority or explicit supersession/rejection. This measures architecture reconciliation, not content reuse. |
| Deterministic behavior transferred? | **4/13 (30.8%)** applicable behavior assets have explicit transformed implementation evidence. |
| Structured content transferred? | **4/38 (10.5%)** text/CSV/JSON assets have content/data transfer evidence. |
| Media transferred? | **0/3 (0%)** legacy images are mapped and approved. No legacy video was found. |
| Partially integrated? | Workout block knowledge and universal coaching cues: concepts overlap current engines, but no reviewed content-level mapping exists. |
| Deferred? | No file has primary `Deferred` status. Future domains are represented instead by stronger immediate gates: expert review or technical validation. Dancer/Half Moon rule activation is deferred within those gated records. |
| Expert review? | NASM movement/assessment files and gymnastics files require qualified review; Yoga datasets additionally require movement/data/provenance review. Professional review completion is **0%**. |
| Intentionally rejected? | 20 alternate runtime, deployment, configuration, empty/obsolete, or repository-support assets. Direct client authority and legacy direct-XP mutation must never return. |
| Migrate next? | First preserve runtime boundaries, then the NASM Screen Review Pack for safety, followed by reviewed Exercise Coaching and Legacy Program Template packs. |

Status distribution over 63 assets: 0 Fully Integrated; 4 Integrated After Transformation (6.3%); 2 Partially Integrated (3.2%); 1 Superseded (1.6%); 0 Deferred; 4 Requires Expert Review (6.3%); 27 Requires Technical Validation (42.9%); 5 Archive Only (7.9%); 20 Reject (31.7%); 0 Unknown.

## Findings by domain

### Inventory and Exercise Intelligence

All 63 regular legacy files under `public/new/` received checksums and records. The 873-record current exercise catalog has 774 rich baseline records (88.7%), but this audit found no content mapping proving those fields came from the legacy brain. Alias, curated fault, progression, substitution, contraindication, camera, and landmark *legacy-transfer* coverage therefore cannot be inflated from inferred baseline metadata; validated legacy movement metadata is 0.

### Yoga and movement

The launch catalog has 10 poses. Three legacy dataset identities (Tree, Triangle, Downward Dog) match launch IDs; identity does not prove transfer of samples, angles, cues, tolerances, scoring, faults, landmarks, safety, or member experience. Validated legacy Yoga rule coverage is **0%**. Dancer remains outside launch because provenance/consent, laterality, balance safety, MediaPipe/MoveNet compatibility, and tolerance validation are unresolved. Half Moon is likewise absent. Bound Angle, Goddess, and the ambiguous Warrior variant have no established launch mapping. Python classifiers/extractors are archive evidence only.

### Program/workout

Current program generation, templates, progression, periodization, deload, substitution, recovery placement, scheduling, persistence, and missed-session behavior are authoritative. The single legacy Lego-block document is partial: concepts overlap, but zero legacy templates have a reviewed content migration (0/1).

### Assessment/corrective, mobility, balance, and posture

Two NASM-style documents exist; zero rules are professionally approved (0/2). Contributor claims, corrective prescriptions, pain/injury implications, and clinical-looking language are not member guidance. No rehabilitation claim is silently migrated. Mobility/balance/posture concepts remain inside the same expert-review gate.

### Media/landmarks

Three JPGs were found; none has proven licensing, canonical mapping, captions/accessibility purpose, or launch-quality approval (0%). Yoga CSV landmarks are static samples, not validated temporal animation assets. Dataset provenance, consent, source images, splits, angle math, and MoveNet compatibility are unresolved. No legacy videos, transcripts, captions, notebooks, or binary model artifacts were found.

### Nutrition, running, recovery, wearables, and cognitive performance

No legacy nutrition/diet asset, food database, formula, questionnaire, supplement rule, running/trail rule, wearable model, or cognitive protocol was discovered in the scoped source. No Nutrition Engine is implemented here. Any external/missing source must be inventoried before a package can be assessed; medical nutrition claims would require qualified review.

### AI/prompt knowledge

No standalone private legacy prompt asset was discovered. Legacy recommendation-like coaching rules are kept out of prompts: deterministic services and authoritative AI Coach safety/context remain the destination. Reports disclose file metadata/evidence, not prompt bodies or credentials.

### Gamification

Four CSV seeds are integrated after transformation at the concept/architecture level. The event-sourced ledger, typed events, policy services, projections, corrections, achievements, levels, badges, and streaks remain authoritative. Exact point/cap/tier equivalence is not asserted, and browser-side/direct-XP mutation is intentionally rejected.

## Fully integrated, partial, deferred, review, rejected, and unknown

No legacy file qualifies as Fully Integrated under the strict content-level evidence standard. Four gamification files qualify only as Integrated After Transformation. The two partial files, gated files, archive/superseded files, and twenty rejects are enumerated with checksums and next actions in the canonical register. There are no Unknown records and no primary Deferred records; absence of Unknown means all files received a defensible disposition, not that missing external history was recovered.

## Security validation

Inventory is read-only, sorted, bounded, symlink-safe, and never executes source. Generated records omit raw content and use secret-assignment redaction. Tests cover determinism, checksums, malformed JSON, no-execution parse states, symlink handling, paths, statuses, missing evidence, duplicates, summaries, derivable archive/packages, and no legacy mutation. Configuration stubs are recorded without copying their values.

## Risks, limitations, and final decision

File-level status cannot approve individual CSV rows. Rights/consent, professional correctness, current-device/model accuracy, and source history outside this checkout remain unknown gates. Similar names are never treated as behavior equivalence. The correct final decision is to keep the current architecture authoritative, never revive the legacy application, and migrate only bounded reviewed content packages in backlog order.

## Artifacts and change inventory

Added: four audit commands, one shared library, one focused test suite, three generated JSON artifacts, and six reconciliation documents. Modified: `package.json` only. No legacy source, production domain, deployment, or database was modified.
