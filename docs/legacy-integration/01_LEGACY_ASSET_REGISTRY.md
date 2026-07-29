# Legacy Asset Registry

This is the permanent lookup table for meaningful assets in `public/new/`. “Destination” is a proposed current-platform location, not an instruction to move the source. Effort is engineering effort after reviews: **XS** <1 day, **S** 1–3 days, **M** 3–10 days, **L** 2–4 weeks, **XL** multi-sprint/research. All statuses are `Planned` unless `Archive only` or `Do not integrate`.

## Knowledge and seed data

| Legacy asset | Current purpose / equivalent | Destination | Phase | Priority | Effort | Dependencies / review | Status |
|---|---|---|---:|---|---:|---|---|
| `01_lego_training_blocks.txt` | Concepts augment deterministic generated-workout services and exercise metadata | `data/training/blocks.json`, schema/importer; `src/services/generatedWorkoutService.js` | 2 | P0 | L | Trainer review; canonical exercise/movement IDs | Planned |
| `02_nasm_movement_basics.txt` | Taxonomy reference; current exercise source has movement patterns/joints | `data/movement/taxonomy.json`; exercise-generation schema vocabulary | 2 | P1 | M | Trademark/license and trainer review | Planned |
| `03_nasm_overhead_squat_assessment.txt` | Observation→strategy seed; current `/api/ohsa` and assessment runtime exist | `data/movement/ohsa-rules.json`; shared cue references | 2 | P0 | L | Movement professional; non-diagnostic wording; camera/view evidence | Planned |
| `04_gymnastics_fundamentals_L3_L5.txt` | Foundation skill/content seed; no equivalent domain | `data/gymnastics/skills/*.json` | 3 | P1 | L | Qualified gymnastics coach, safeguarding/legal review | Planned |
| `05_gymnastics_progressions_L4_to_L8_elite.txt` | Partial directed progression graph | `data/gymnastics/progression-edges.json` | 3 | P1 | XL | Complete prerequisites/mastery/spotting/equipment; coach approval | Planned |
| `06_coach_cues_and_checklists.txt` | Universal wording seed; current exercise metadata has phrase pools | `data/coaching/cues/*.json` and generated runtime | 2 | P0 | M | Trainer/editor approval, localization design | Planned |
| `FitnessMVP_Actions.csv` | Event-to-points seed; current features emit completions but lack shared ledger | `data/gamification/action-policies.json` | 1 | P0 | M | Product/economy and fraud review | Planned |
| `FitnessMVP_Badges.csv` | Badge catalogue seed | `data/gamification/badges.json` | 1 | P0 | M | Product/content/icon/accessibility review | Planned |
| `FitnessMVP_Criteria.csv` | One rule per badge seed | `data/gamification/achievement-rules.json` | 1 | P0 | L | Typed rule compiler and historical-data policy | Planned |
| `FitnessMVP_Tiers.csv` | Tier-rule seed | `data/gamification/tiers.json` | 1 | P1 | M | Product/economy review; clarify top-percentile semantics | Planned |

## Yoga landmark and angle assets

Every pose trio is research reference material, not launch content. Destination is a quarantined, licensed dataset workspace outside `public/`; no runtime consumes CSV directly.

| Legacy asset | Purpose / current equivalent | Destination | Phase | Priority | Effort | Dependencies / review | Status |
|---|---|---|---:|---|---:|---|---|
| `Dataset_ArdhaChandrasana.csv`; `Dataset_ArdhaChandrasana_Angles.csv`; `ArdhaChandrasana_Combined.csv` | 59 MediaPipe Half Moon samples; current MoveNet has no yoga classifier | `research/yoga/manifest` + normalized records | 3/research | P2 | L | Recover images/consent/license/subjects; recalculate angles | Planned research |
| `Dataset_BaddhaKonasana.csv`; `Dataset_BaddhaKonasana_Angles.csv`; `BaddhaKonasana_Combined.csv` | 60 Bound Angle samples | Same | 3/research | P2 | L | Same; seated/occlusion evaluation | Planned research |
| `Dataset_Downward_Dog.csv`; `Dataset_Downward_Dog_Angles.csv`; `DownwardDog_Combined.csv` | 60 Downward Dog samples | Same | 3/research | P2 | L | Same; canonical Adho Mukha Svanasana ID/view | Planned research |
| `Dataset_Natarajasana.csv`; `Dataset_Natarajasana_Angles.csv`; `Natarajasana_Combined.csv` | 60 Dancer samples | Same | 3/research | P2 | L | Same; laterality and balance safety | Planned research |
| `Dataset_Triangle.csv`; `Dataset_Triangle_Angles.csv`; `Triangle_Combined.csv` | 60 Triangle samples | Same | 3/research | P2 | L | Same; pose variant/canonical Sanskrit name | Planned research |
| `Dataset_UtkataKonasana.csv`; `Dataset_UtkataKonasana_Angles.csv`; `UtkataKonasana_Combined.csv` | 66 Goddess samples | Same | 3/research | P2 | L | Same; clarify English naming | Planned research |
| `https   drive.google.com file d 1mGE64f82r9iqiqQAzJnN6IQZD_hmLvOE view usp=sharing.csv`; `Dataset_Veerabhadrasana_Angles.csv`; `Veerabhadrasana_Combined.csv` | 60 Warrior samples; ambiguous raw filename/variant | Same | 3/research | P2 | XL | Prove pairing/provenance; resolve Virabhadrasana variant/spelling | Planned research |
| `Dataset_Vrukshasana.csv`; `Dataset_Vrukshasana_Angles.csv`; `Vrukshana_Combined.csv` | 58 Tree samples; inconsistent transliteration | Same | 3/research | P2 | L | Same; choose canonical Vrikshasana alias policy | Planned research |

## Legacy runtime and supporting files

| Legacy asset | Current purpose / equivalent | Destination | Phase | Priority | Effort | Dependencies / review | Status |
|---|---|---|---:|---|---:|---|---|
| `README.md`, `LICENSE` | Provenance leads; current audit documents gaps | Archive manifest and `docs/legacy-integration/provenance/` | 0 | P0 | S | Owner/legal confirms scope/upstream revision | Archive only |
| `main.py`, `landmarks.py`, `check_all.py` | Research evidence for MediaPipe extraction; current browser `public/pose-runtime.js` is authoritative | No code destination; measurement behavior captured in specs/tests if approved | Research | P2 | M | Correct angle math and fixtures | Archive only |
| `requirements.txt` | Unrelated UTF-16 environment freeze | None | — | — | — | No reuse | Do not integrate |
| `server.js`, `index.js`, `baseurlRouter.js`, `categoriesRouter.js`, `posesRouter.js`, `services.js`, `schemas.js`, `validatorHandler.js`, `errorHandler.js` | Broken Express/SQLite prototype; current `server.js`/`src/` services replace it | None; translate only domain concepts into current APIs | — | — | — | No reuse | Do not integrate |
| `package.json`, Dockerfile, `compose.yml` | Broken alternate deploy/runtime | None; use root package/deployment | — | — | — | No reuse | Do not integrate |
| `firebaseConfig.js`, `maatApi.js`, `baseURL.json` | Unwired configuration/client stubs; current auth/services are authoritative | None | 0 | P0 | S | Credential restriction/rotation decision | Do not integrate |
| `erm.json` | Invalid pseudo-schema for poses/categories | Concepts superseded by Phase 3 content schema | 3 | P2 | XS | Data-model review | Archive only |
| `index.html` | Placeholder alternate frontend | None; current `public/` pages/components | — | — | — | No reuse | Do not integrate |
| `.gitignore`, `.gitattributes` | Uploaded repository metadata | None; root Git policy | — | — | — | No reuse | Do not integrate |
| `yoga` | Empty artifact | None | — | — | — | Confirm archive checksum before eventual cleanup | Do not integrate |

## Registry maintenance contract

* Add `source_checksum`, `normalized_asset_id`, reviewer decision, and implementation PR links when work starts.
* A status may advance only: `Planned → Normalizing → Review pending → Approved → Integrated → Deprecated`; rejected assets become `Do not integrate` with rationale.
* A current-platform destination may change after drift review. The source location/checksum never changes.
* Dataset rows are not “integrated” merely because files are copied; licensing, grouped split, normalization, validation, and an approved use case are separate gates.
