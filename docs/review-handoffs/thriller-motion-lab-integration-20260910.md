# Thriller Motion Lab integration handoff

## Goal
Integrate the four user-supplied Mixamo Thriller animation-only FBX clips into PocketPT Motion Lab as independently selectable humanoid motion assets, while preserving the existing explicit load -> inspect -> Play workflow and first-failure diagnostics.

## Supplied source assets
The user supplied four binary FBX files on 2026-09-10:

- `Thriller Part 1.fbx` — 2,755,584 bytes
- `Thriller Part 2.fbx` — 1,870,288 bytes
- `Thriller Part 3.fbx` — 2,411,744 bytes
- `Thriller Part 4.fbx` — 3,408,144 bytes

All four were verified as binary Kaydara FBX files (`Kaydara FBX Binary`).

## Intended repository asset paths
Place the exact source binaries at:

- `public/motion/assets/thriller/Thriller Part 1.fbx`
- `public/motion/assets/thriller/Thriller Part 2.fbx`
- `public/motion/assets/thriller/Thriller Part 3.fbx`
- `public/motion/assets/thriller/Thriller Part 4.fbx`

Do not modify, resample, rename bones, or overwrite the source FBX files during ingestion. Derived GLB/animation-only artifacts may be added separately if the browser runtime requires conversion.

## Integration contract
1. Add a Thriller motion catalog with four ordered parts and stable IDs: `thriller-part-1` through `thriller-part-4`.
2. Motion Lab must expose the four clips as explicit selections; selection must never autoplay.
3. Load the personalized Avaturn Coach avatar first, then bind/retarget the selected clip to that skeleton using the existing Motion Lab compatibility boundary.
4. Preserve the existing Play/Pause/Resume/Stop/Restart controls.
5. Diagnostics must report the selected Thriller part, source asset, source skeleton/bone inventory when available, target avatar profile, intended/bound/unbound tracks, and the first failing boundary.
6. A failed clip must not silently fall back to another animation or a rest pose while reporting success.
7. Keep the source/derived asset structure usable for the later Godot pipeline; do not couple the animation data to the web UI.
8. Add regression tests for catalog order, asset paths, explicit non-autoplay selection, target-avatar compatibility, and first-failure reporting.

## Acceptance gate
This PR is not merge-ready until all four binary FBX assets (or reviewed derived browser-playable artifacts plus retained sources) are present on the branch and each part can be selected independently with Play enabled only after a successful bind.

## Connector limitation recorded for review
The ChatGPT GitHub connector can write repository text and Git objects but cannot stream the multi-megabyte local binary uploads directly from the conversation sandbox into GitHub in this run. The branch/PR therefore records the exact verified assets and integration contract but must remain draft until the four binaries are transferred to the paths above and the runtime implementation/tests are completed.
