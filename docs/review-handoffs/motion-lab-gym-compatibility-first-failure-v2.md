# FIRST FAILURE — Gym Compatibility v2

`RUNTIME_READY -> PERSONAL_AVATAR_COMPATIBILITY -> GYM_COMPATIBILITY_CONTROLLER -> GYM_COMPATIBILITY_PANEL_SCRIPT -> GYM_COMPATIBILITY_PANEL_INSTALL -> GYM_COMPATIBILITY_PANEL_RENDER -> READY`

If `RUNTIME_READY` fails, debug the canonical Motion Lab first. If a dependency boundary fails, debug only that feature module. If `PANEL_RENDER` fails, inspect the Loaded Avatar anchor/presentation component before bone mapping. Bone mapping failures begin only after the integration reaches READY and the owner presses Inspect Personalized Avatar.
