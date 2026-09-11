# Motion Lab personalized-avatar load route fix

## Live first failure

The Motion Lab page, renderer, bootstrap and Gym Compatibility panel are alive, but loading the personalized Avaturn fails before skeleton inspection with `asset_load_failed`. The visible fallback cube remains because no avatar scene mounts.

## Repository mismatch

`public/motion/avatar-profiles.js` pointed `avaturn-personalized-candidate` at the legacy Motion-Lab-only alias `/dev/motion-lab-avatar-assets/avaturn-push-up-source.glb`.

The canonical avatar registry already declares the same profile and same source asset through `/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb` with `assetResolver: authenticated-product-backend`. The server maps that authenticated route to the same tracked `exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb` file.

## Fix

Align the Motion Lab runtime profile to the canonical registered authenticated route instead of maintaining a second URL for the same avatar. Skeleton identity remains `avaturn-native-v1`; this does not change the source GLB or retargeting semantics.

A contract test now fails if the browser runtime profile drifts from the canonical registry again.

## Non-regression boundary

No Thriller clip/playback code, Gym Compatibility mapping logic, Motion Lab bootstrap, Godot, navigation, MoveNet, or locomotion code changes in this fix.

## Human acceptance

After deployment: initialize Motion Lab, load the personalized Avaturn, confirm the green diagnostic cube is replaced by the avatar, then run Gym Compatibility > Inspect Personalized Avatar. The next expected boundary is skeleton inventory/canonical mapping rather than `asset_load_failed`.
