# Phase E — canonical avatar animation architecture

Phase E1 adds an optional development fixture to the isolated Motion Lab. `phase-e-assets.js` is the sole URL authority. `DisposableMotionSession` owns the loaded avatar, `AnimationMixer`, action, clock, renderer, and sole RAF; its RAF advances the mixer and disposal aborts pending loads, stops actions, removes the avatar, disposes scene resources, and releases the canvas/context.

The avatar and animation load independently. Diagnostics report bones, skinned meshes, clip tracks, and target names that do not bind to avatar bones. Controls cover play, pause, resume, stop, restart, and looping. A missing fixture returns `asset_missing`; it cannot affect member/core routes because only the gated Motion Lab bootstrap imports Phase E modules.

No anatomy, highlighting, exercise catalog/schema, member-facing integration, second renderer, or second RAF is introduced. Outputs remain development/test-only until provenance is cleared. E1 is safe to publish without binaries; E3 remains pending until both GLBs validate and visible deformation is proven.
