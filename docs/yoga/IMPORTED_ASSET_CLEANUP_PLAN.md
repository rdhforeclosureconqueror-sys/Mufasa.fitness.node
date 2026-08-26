# Imported Asset Cleanup Plan

No artifact was deleted in this audit. The complete import was moved out of public serving to `_reference/aligned-yoga/imported/`.

## KEEP (production)

Only Pocket PT-native outputs: camera-coach source, versioned pose rules/schema, tests, audit script, and these documents. No imported artifact is a production dependency.

## REFERENCE

Keep temporarily: upstream README/LICENSE, Python logic, notebooks, and small representative keypoint frames until provenance and independent behavior validation finish. Reference storage should ultimately be outside the application repository.

## EXTRACTED

The BODY_25 schema characteristics, dataset statistics, pose-name mapping, and high-level geometric checks have been reduced to audit documents. Chair/Warrior II behavior is independently authored using normalized joint angles, not imported slope code or thresholds.

## SAFE TO DELETE AFTER REVIEW

Exact candidates, all beneath `_reference/aligned-yoga/imported/`:

1. `parttwoyogafiles/warrior_incorrect 8.28.52 PM.avi` — 16,283,710-byte reference video; not runtime-used and unverified provenance.
2. `environment.pickle` — 1,601,019-byte serialized legacy environment; unsafe/unnecessary to load.
3. `**/*.pyc` and `**/*.doctree` — ten generated Python/Sphinx artifacts totaling 84,679 bytes.
4. Duplicate second copies listed in `imported-asset-audit.json`, especially `parttwoyogafiles/Aligned_VC_Presentation_Deck.pdf` (1,391,986 bytes), duplicate README and `.gitattributes`, and one duplicate keypoint frame.
5. All 853 `*_keypoints*.json` files (746,772 bytes) after approved representative fixtures or statistics are independently retained; production does not read them.
6. All 18 quarantined images (439,334 bytes), two media files (16,308,763 bytes total), ten notebooks (833,216 bytes), and thirty training-data files (3,913,532 bytes) after legal/data-governance review confirms no retention duty. The three `public/new/stepintograteness*.jpg` files are not deletion candidates until the existing Greatness UI has reviewed replacements and provenance.
7. Legacy Python/Flask/OpenPose environment files and vendored JavaScript/docs — obsolete dependencies, not linked into Pocket PT.

Do not delete the quarantine wholesale until legal review covers dataset subject consent, upstream ownership, third-party assets, and whether the apparent MIT license applies beyond source code.

## Repository bloat and future storage

The import is 26,597,302 bytes across 1,041 files; media is 61% of it. Git's current pack is about 157.88 MiB, so deleting the working-tree files later will not shrink history. Do not rewrite history in this task. After approval, use artifact/object storage for research datasets and videos; Git LFS is acceptable only when repository-local versioning is genuinely required. A coordinated `git filter-repo` migration can remove historical blobs in a separately approved maintenance window.

`.gitignore` now excludes virtual environments, Python bytecode, notebook checkpoints, temp directories, and cache files while deliberately leaving curated root `generated/` content trackable.
