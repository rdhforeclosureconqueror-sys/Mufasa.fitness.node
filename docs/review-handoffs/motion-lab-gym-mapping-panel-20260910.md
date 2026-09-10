# Motion Lab Gym Compatibility Panel — UI slice

This slice adds the visible panel component that sits on top of the merged Phase 0/1 compatibility authorities.

The panel is intentionally a separate presentation module so the compatibility controller remains testable and does not become a second Motion Lab diagnostics authority. It renders after the existing Loaded Avatar section, provides Inspect Personalized Avatar, canonical-joint bone selectors, explicit rest-pose validation, Save Gym Mapping Profile, Copy FIRST FAILURE Report, mapping coverage, and save state.

The component delegates inspection, correction, profile validation/persistence, and report formatting to `PocketPTMotionLabGymCompatibility`. It does not autoplay animations and does not touch Godot, GO_TO_MAT, navigation, MoveNet/TensorFlow, reps, timer, or leaderboard.

## Important integration boundary

This PR supplies the panel component and contract tests. The existing Motion Lab bootstrap still owns dependency ordering. The panel must be loaded only after `personal-avatar-compatibility.js` and `motion-lab-gym-compatibility.js`; wiring that dependency order into the bootstrap is deliberately called out as the first integration checkpoint rather than silently changing the large lifecycle bootstrap in this UI-only slice.

FIRST FAILURE for the next integration checkpoint is therefore:

`PANEL_SCRIPT_LOADED -> COMPATIBILITY_AUTHORITY_AVAILABLE -> CONTROLLER_AVAILABLE -> PERSONAL_AVATAR_RUNTIME_STATE_AVAILABLE -> PANEL_INSTALLED -> INSPECTION_RENDERED`

If the panel is not visible after deployment, do not debug bone mapping first; verify `PANEL_SCRIPT_LOADED` and bootstrap dependency order.