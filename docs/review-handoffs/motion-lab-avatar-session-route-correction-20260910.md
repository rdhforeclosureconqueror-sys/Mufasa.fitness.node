# Motion Lab avatar session-route correction

## Live first failure

Physical iPhone Motion Lab evidence after the canonical product-avatar route change shows the main runtime is healthy through renderer startup, then fails at the first asset boundary:

- `gltf_loader: FAIL (asset_load_failed)`
- `avatar_asset: FAIL (asset_load_failed)`
- `skeleton: FAIL (asset_load_failed)`
- `animation_clip: NOT RUN`

The latter two failures are downstream consequences of the avatar GLB never being delivered. Thriller/retarget playback is not reached.

## Root cause

`public/motion/avatar-profiles.js` was changed to use the product route:

`/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb`

That route is protected by normal product `requireAuth`. Motion Lab, however, has its own short-lived Motion Lab session cookie and its own `motionLabGate`. A direct GLTFLoader request from the Motion Lab page can therefore be valid for the Motion Lab shell while not carrying the independent product-auth authority expected by `requireAuth`.

The repository already has the correct Motion-Lab-specific delivery route for this exact source GLB:

`/dev/motion-lab-avatar-assets/avaturn-push-up-source.glb`

That route is protected by `motionLabGate`, uses the same Motion Lab session that authorized the page, and maps to the same tracked source file.

## Fix

Use a context-specific Motion Lab delivery URL while preserving canonical product identity metadata:

- `assetUrl` -> Motion Lab gated route.
- `productAssetUrl` -> canonical product route from the avatar registry.
- `source` and `skeletonProfile` remain identical to the canonical registry record.
- `assetResolver` becomes `motion-lab-session-gate` for the Motion Lab runtime profile.

The canonical product registry is unchanged. Product pages continue to use the member-gated product route; Motion Lab uses its own authorized asset-delivery boundary.

## Regression contract

The route test now proves:

1. Motion Lab uses `/dev/motion-lab-avatar-assets/avaturn-push-up-source.glb`.
2. The canonical product URL remains preserved separately as `productAssetUrl`.
3. Source asset and skeleton identity still match the canonical registry.
4. The server continues to protect the Motion Lab avatar route with `motionLabGate` and serve the same source GLB.

## Acceptance

After deployment:

1. Open Motion Lab through its normal launch flow.
2. Initialize Runtime.
3. Load Personalized Avaturn Avatar.
4. `gltf_loader`, `avatar_asset`, and `skeleton` should pass.
5. Only after that should Thriller Part 1 be selected and the retarget/anatomy boundaries from merged #787 be evaluated.

If avatar loading still fails, the next diagnostic target is the Motion Lab session-cookie delivery itself, not Thriller, skeleton mapping, or WebGL.

## Readiness

This corrects a significant tracked avatar-delivery boundary. Record canonical readiness evidence with `npm run readiness:update -- ...` and validate with `npm run readiness:validate`; do not hand-edit readiness JSON.
