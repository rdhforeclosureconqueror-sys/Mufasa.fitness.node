# Personalized Avatar Compatibility Inventory — Phase 0

This PR implements the first reusable boundary from the gym animation plan. It does **not** bind walk/run yet.

## What it adds

`public/motion/personal-avatar-compatibility.js` is a small environment-neutral compatibility authority that accepts runtime-discovered avatar/skeleton/animation information and produces a copyable ordered diagnostic report.

Pipeline:

`PERSONAL_AVATAR_MOUNTED -> SKELETON_FOUND -> BONES_INVENTORIED -> CANONICAL_MAP_RESOLVED -> REST_POSE_VALID -> EMBEDDED_TRACKS_CLASSIFIED -> ANIMATION_LIBRARY_RESOLVED -> COMPATIBILITY_CLASSIFIED`

The first failing boundary is reported as `FIRST FAILURE`.

The canonical map deliberately supports both current Avaturn semantic names (`Hips`, `LeftArm`, etc.) and the existing Mixamo-prefixed aliases used by older PocketPT motion specs. It never assumes every personalized avatar has identical raw bone names.

Embedded clips are inventoried and explicitly classified as stacking risks for PocketPT custom motion. Discovery of an embedded clip does not mean it is automatically played or accepted.

## Why this comes before locomotion

The current Motion Lab already has a personalized Coach Avatar path and a first lunge retarget from Mixamo names to Avaturn semantic names. This phase extracts the compatibility/inventory concept so the next Motion Lab mapping UI and Godot locomotion work can share a truthful contract.

## Tests

`test/personal-avatar-compatibility.test.js` verifies:

- semantic Avaturn-style names map completely;
- Mixamo-prefixed aliases map to the same canonical joints;
- missing required bones surface at `CANONICAL_MAP_RESOLVED` as the first failure;
- embedded clips are classified as stacking risks.

## Next implementation phase

Wire this inventory contract into the Motion Lab Gym Compatibility / Bone Mapping panel. The panel should run against the loaded personalized avatar, expose unresolved mappings for owner correction, validate the rest pose, preview retargeted Idle/Walk/Run, and save/version the mapping profile. Godot locomotion should consume that verified profile rather than hard-code the old development avatar.