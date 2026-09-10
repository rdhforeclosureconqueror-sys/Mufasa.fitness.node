# Motion Lab Gym Compatibility / Bone Mapping — Phase 1

## Purpose

Turn the Phase 0 personalized-avatar inventory into an owner-correctable mapping workflow before Godot locomotion is bound.

## Added contract

`public/motion/motion-lab-gym-compatibility.js` consumes `PocketPTPersonalAvatarCompatibility` rather than inventing another skeleton system. It can:

- inspect the currently loaded personalized avatar;
- expose the Phase 0 ordered FIRST FAILURE report;
- accept an explicit owner correction from a canonical joint to a raw bone that actually exists on the loaded avatar;
- refuse unknown canonical joints or nonexistent raw bones;
- refuse to save while required joints remain unresolved;
- require explicit rest-pose validation before a profile is saved;
- save/load a versioned development mapping profile for the next locomotion phase.

This PR implements the mapping **controller/contract** and tests. It does not yet pretend that a full visual editor has been wired to the existing Motion Lab DOM. The next UI wiring should bind these functions to the personalized-avatar runtime data already shown in Motion Lab and add controls without creating a second diagnostics authority.

## FIRST FAILURE

The controller preserves Phase 0 order:

`PERSONAL_AVATAR_MOUNTED -> SKELETON_FOUND -> BONES_INVENTORIED -> CANONICAL_MAP_RESOLVED -> REST_POSE_VALID -> EMBEDDED_TRACKS_CLASSIFIED -> ANIMATION_LIBRARY_RESOLVED -> COMPATIBILITY_CLASSIFIED`

A manual mapping correction only advances the map boundary if all required canonical joints are resolved. Later failures remain visible.

## Safety boundary

- The old Phase E reference avatar remains untouched.
- No Godot movement/navigation changes.
- No GO_TO_MAT changes.
- No TensorFlow/MoveNet changes.
- No animation is automatically played.
- Embedded clips remain classified as stacking risks.
- A browser-local mapping profile is development state, not production member data.

## Acceptance for this phase

1. Complete semantic Avaturn skeleton -> no mapping failure.
2. Alternate raw bone name -> CANONICAL_MAP_RESOLVED first failure until owner maps it.
3. Correction to nonexistent raw bone -> rejected.
4. Missing required joint -> profile save blocked.
5. Unvalidated rest pose -> profile save blocked.
6. Fully mapped + explicitly validated rest pose -> versioned mapping profile can be saved and loaded.

## Next phase

Wire this contract into the existing Motion Lab page as the visible **Gym Compatibility / Bone Mapping** panel, fed by the actual loaded personalized avatar. Then use the saved mapping profile to preview/verify Idle, Walk and Run before Godot locomotion consumes it.