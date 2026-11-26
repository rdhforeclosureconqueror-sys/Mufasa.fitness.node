# V8C Mobile HUD — implementation roadmap

Baseline: PR #1409, commit a7063d6f4e17e6096659caa4ddf3a393a328a413. Preserve all subsequent unrelated main changes and existing exported binaries until a verified replacement is ready.

## Approved scope
- Training is default entrance. Mobile cards close after selection; no desktop keyboard instructions on mobile field.
- Pick Your Play: 2v1, 2v2, 2v3, Three Deep, Wedge (2v3), Double Wedge (6v4).
- Drill Settings: ball carrier and existing applicable configuration. New defensive options require separately verified gameplay support; do not invent behavior.
- Training Mode: existing mode/difficulty options.
- Advanced Settings: controller profile, angles, control mode.
- Playbook: existing formation, Crash/Backdoor, Wide Release, 2v2, 2v1, 3v2; preserve Watch, Camera, Ribbons, Reset, Training.
- Keep camera, joystick, Kick, Pass, Start/Restart accessible; controls help on side. Preserve desktop.
- Portrait: use available whitespace for cards; landscape: compact shortcuts. Do not crop field or joystick.
- Coaching feedback readable and dismissible, with all existing information retained.
- Access control is separate release-blocking backlog for public launch.

## Gates
- [x] Existing HUD source audit and screenshot mapping.
- [x] Initial reusable card layer source committed (not compiled).
- [ ] Compile reusable component; validate mobile detection and actual CSS-equivalent touch targets.
- [x] Initial Training Pick Your Play source adapter committed: existing scenario selection signal, ready-state guard, joystick cancellation and raw scene-input guard.
- [ ] Compile and verify Training scenario adapter, including underlying GUI input isolation; finish settings, controls, mode and layout adapters.
- [ ] Wire Playbook adapter and feedback; preserve existing tactical logic.
- [ ] Hide desktop-only instructions on mobile in both source shell and exported shell.
- [ ] Responsive layout, safe areas, focus handling, rotation, no overlap; validate desktop unchanged.
- [ ] Godot 4.5.1 headless import, automated game tests, Web export and manifest regeneration.
- [ ] Browser smoke and physical iPhone acceptance (touch accuracy, readability, performance, cards, replay).
- [ ] Review, merge, deploy and verify canonical milelefit.com; retain rollback checkpoint.

Initial Training integration is source-only; no runtime validation or export is claimed. Do not merge partial source with stale game binaries as a completed HUD release.
