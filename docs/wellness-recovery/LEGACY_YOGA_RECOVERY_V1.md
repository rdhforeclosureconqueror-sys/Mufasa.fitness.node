# Yoga, Meditation & Pranayama — Legacy Recovery Register v1

Status: SOURCE AUDIT / NOT APPROVED FOR PUBLICATION OR PRODUCTION IMPORT.
Scope: yoga, asana, meditation, pranayama, chakra symbolism, affirmations, intentions, sound-session education and related tracking only.
Source of truth remains the original Google Drive documents. Never migrate user data, credentials, or raw worksheets directly to the public frontend.

## Confirmed source inventory (2026-10-07)
| Source | Drive file ID | Findings | Next action |
| --- | --- | --- | --- |
| DiscordBotfitness | 1jpnN10DJTEDSzkf2lidsJKWigF07JAR5-KnZH_swjEs | 18 tab-like sections; ~100 chakra affirmations, 56 eight-limb lessons, ~100 meditation messages, ~100 pranayama messages, ~100 yoga messages; additional nutrition/fitness/Discord data outside current scope | Extract only selected educational columns into sanitized, reviewed content records |
| M3 | 1PmbTsgAzRrN5Uw8ZN8u8nqsGDsM_YAAmL-RtI9bRvZQ | 47 sections; session/program templates, yoga flow/segment schema, asana library, pranayama and meditation blocks, readiness and logs; many tables are empty schemas | Map legacy schema to current platform and populate only verified rows |
| SIMBA Wellness System | 1-GMsQAgDDdeX-Zvrug39bsnK_HcH59K6zMf__LCKvl0 | Client intake, meditation/breath/yoga/sound participation, mood before/after, sleep, stress, breath control, goals and weekly adherence | Reconcile with existing PocketPT models; do not migrate identifiable client data without separate authorization |
| Eightfold Path of Union | 1HlRhka-l41avvSNzy7FVKPjuavzOSLjskMcetOci998 | Yama, Niyama, Asana, Pranayama, Pratyahara, Dharana, Dhyana, Samadhi educational outline | Editorial and evidence review, then modular lessons |
| Week 1 Yoga Goals & Intentions | 1BJoL7-wfFZTfIxx9ybi47S1lcL0lriPEHNukOwvXFBA | Weekly goals, meditation, pranayama, pose practice, affirmation, commitment, obstacles, reminder preference | Reconstruct 8-week intention/check-in flow; inspect Weeks 2–8 |
| Yoga Pack folder | 1rn1bcyzAaGi2yYUZlmajeyZN73u8QJk- | Pose-specific folders including Downward Dog, Warrior, Triangle, Tree and more | Asset rights/quality audit before reuse |

## Proposed product modules
1. **Learn**: yoga foundations, meditation, pranayama, Eightfold Path, optional chakra symbolism and affirmation library.
2. **Practice**: guided breathing, meditation, yoga flows; beginner-friendly Return-of-Attention training.
3. **Plan**: 8-week goals and intentions; session personalization by experience, comfort, contraindications and readiness.
4. **Reflect**: before/after mood, stress, energy, adherence, sleep and perceived benefit.
5. **Sound**: educational handoff from Quick/Full Sound Assessment to human-guided sound-session options; no diagnostic or medical claims.
6. **Practitioner**: curated session templates and safety notes; no unreviewed algorithmic prescriptions.

## Content QA
- Preserve source ID, source row, content version, reviewer status, audience, category, and evidence/symbolism classification.
- Reject unsupported claims, including that breathing instantly increases oxygen, that breath directly switches the autonomic nervous system on/off, or that yoga cures pain.
- Separate Sanskrit/traditional symbolic interpretations from modern physiology.
- Explain **The Return**: noticing attention wander and gently returning is part of attention practice, not failure.
- Breathing exercises: default gentle comfortable pacing; no forced breath retention, hyperventilation, or unsupported medical advice.
- Flag and manually review contraindications, accessibility and any potential harm.
- Exclude Discord tokens, keys, passwords, personal identifiers, private notes and client records from all content exports and Git commits.

## Implementation gates
A. Inspect and de-duplicate source content; produce reviewed taxonomy and schema mapping.
B. Audit existing frontend/routes/models to prevent parallel implementations.
C. Build an isolated content catalog and deterministic import validator; default no production import.
D. Implement Learn/Practice/Plan/Reflect progressively behind a feature flag.
E. Test mobile accessibility, safe practice guidance, tracking persistence, and end-to-end session flow.
F. Update readiness evidence through canonical CLI and validate; obtain human visual/mobile approval before launch.

## First-failure diagnostics
SOURCE_DISCOVERY -> SANITIZE -> CONTENT_SCHEMA -> EDITORIAL_REVIEW -> MODEL_MAPPING -> IMPORT_DRY_RUN -> RENDER -> TRACK -> PERSIST -> QA.
Fail closed on secrets, missing source provenance, invalid safety metadata, or unreviewed public-facing health claims.

No credentials or source personal data are copied into this register.
