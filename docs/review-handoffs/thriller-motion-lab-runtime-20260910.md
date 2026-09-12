# Thriller Motion Lab Runtime Integration

## Relationship
Follow-up implementation PR stacked on #777. The source FBX assets remain unchanged on the parent branch.

## Goal
Make Thriller Parts 1–4 independently selectable in PocketPT Motion Lab for the personalized Avaturn avatar, with explicit playback and FIRST FAILURE diagnostics.

## Required implementation
- Stable ordered IDs: `thriller-part-1`, `thriller-part-2`, `thriller-part-3`, `thriller-part-4`.
- Explicit selection; never autoplay.
- Preserve Play / Pause / Resume / Stop / Restart.
- Verify browser FBX support before claiming runtime success.
- If browser playback requires derived GLB/animation artifacts, retain the original FBX sources and keep derived artifacts separate.
- Bind/retarget only through a reviewed Mixamo-to-Avaturn compatibility boundary.
- Fail closed on incompatible skeletons or unbound intended tracks.
- Diagnostics must expose selected part, source asset, target avatar profile, intended/bound/unbound tracks, and first failing boundary.
- Never silently substitute a different animation or rest pose while reporting success.
- Add tests for catalog order/paths, non-autoplay behavior, compatibility gating, and first-failure reporting.

## Acceptance gate
Not merge-ready until all four parts can be explicitly selected and each either plays correctly on the personalized avatar or reports an actionable retarget/loader first failure without silent fallback.
