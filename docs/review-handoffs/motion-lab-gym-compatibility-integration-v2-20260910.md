# Motion Lab Gym Compatibility Integration v2

## Why this replaces PR #776

PR #776 attempted to wire personalized-avatar compatibility by rewriting/compressing the large canonical Motion Lab bootstrap. Main has since advanced and now contains additional Motion Lab behavior, including the Thriller motion catalog. Replacing that lifecycle bootstrap is no longer an acceptable integration strategy.

This slice reorganizes the feature around an isolated integration boundary. The canonical Motion Lab bootstrap continues to own the viewer/runtime lifecycle. Gym compatibility waits for that lifecycle to become ready, then loads only its three feature dependencies in strict order and installs the existing panel.

## Ownership

Canonical Motion Lab bootstrap owns runtime/viewer initialization, pose editor, authoring, persistence, diagnostics, lunge preview, and current animation catalogs.

`motion-lab-gym-compatibility-integration.js` owns only:

`RUNTIME_READY -> PERSONAL_AVATAR_COMPATIBILITY -> GYM_COMPATIBILITY_CONTROLLER -> GYM_COMPATIBILITY_PANEL_SCRIPT -> GYM_COMPATIBILITY_PANEL_INSTALL -> GYM_COMPATIBILITY_PANEL_RENDER -> READY`

The existing compatibility authority continues to own skeleton inventory/canonical mapping. The existing controller continues to own correction/profile persistence. The existing panel continues to own the visible owner/test UI.

## FIRST FAILURE

The integration publishes `PocketPTMotionLabGymCompatibilityIntegrationDiagnostics` with a copyable text report and the first failing boundary. It never reports READY merely because a script tag loaded; the expected authority and rendered panel are verified.

## Activation boundary

This PR intentionally does not rewrite `motion-lab-bootstrap.js`. The integration module is the new stable seam. The page entrypoint should load this module as a deferred sibling of the canonical bootstrap; after that, it waits for runtime readiness itself. Keeping activation separate prevents future Motion Lab catalog additions from colliding with personalized-avatar compatibility wiring.

## Non-regression

No changes to Thriller, existing Motion Specs, pose authoring, Godot, GO_TO_MAT, navigation, MoveNet/TensorFlow, rep detection, timer, leaderboard, or animation autoplay.

## Next checkpoint

Activate this integration from the Motion Lab page entrypoint, then verify the personalized avatar produces a truthful mapping report. After mapping/rest-pose acceptance, proceed to deterministic Idle -> Walk -> Run preview using the saved profile.
