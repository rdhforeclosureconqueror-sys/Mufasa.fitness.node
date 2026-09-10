# Motion Lab Gym Compatibility — clean integration

This replaces superseded #776 and the over-broad staging attempt #781. Branch base is current main after #780 (`cc668892`).

The canonical Motion Lab bootstrap remains unchanged. It continues to own viewer/runtime initialization, current Thriller integration, pose editing/authoring, persistence, and canonical diagnostics.

The new feature seam is intentionally small:

`PAGE ENTRY -> RUNTIME_READY -> PERSONAL_AVATAR_COMPATIBILITY -> GYM_COMPATIBILITY_CONTROLLER -> GYM_COMPATIBILITY_PANEL_SCRIPT -> GYM_COMPATIBILITY_PANEL_INSTALL -> GYM_COMPATIBILITY_PANEL_RENDER -> READY`

`motion-lab-gym-compatibility-entry.js` is an idempotent entry module. `motion-lab-gym-compatibility-integration.js` waits for the canonical runtime, loads only the three existing personalized-avatar compatibility pieces in strict order, verifies each authority, installs the existing panel, verifies its DOM owner, and publishes `PocketPTMotionLabGymCompatibilityIntegrationDiagnostics` with FIRST FAILURE.

No animation autoplay, Godot/GO_TO_MAT/navigation, MoveNet/TensorFlow, rep detection, timer, or leaderboard changes are included.

## Activation checkpoint

The architecture is now isolated from the mature bootstrap. Live activation is one explicit page-entry line after review:

`<script src="/dev/motion-lab-gym-compatibility-entry.js" defer></script>`

Do not claim the panel is live until that line is added to the Motion Lab page. Once activated, verify integration READY, load the personalized avatar, inspect bone mapping/rest pose, save the mapping profile, then proceed to Idle -> Walk -> Run preview.
