# Mirror Debug Producer Presentation Authority — Review Handoff

## Physical first failure
On iPhone/Safari, Mirror Motion Live Acceptance, Mirror Camera Motion Review, and Phase 18/other phase debug panels remain independently visible and cover the Pocket PT workout UI even after the Arena consolidation and cache-bust repairs.

## Root cause addressed here
The legacy Mirror Motion modules are browser-side diagnostic producers that create their own fixed-position DOM panels. The previous consolidation path detected and hid those panels only after producer DOM existed. On a physical phone that leaves a startup/rerender authority race: producers can paint before the consolidated center is installed.

This PR moves presentation ownership earlier than producer presentation. `runtime-config.js` installs a CSS presentation guard immediately, declares the Mirror Debug Center as the single presentation authority, and requests the center immediately instead of polling for a legacy producer before loading it.

## Invariant
Diagnostic producers remain alive and their DOM/text remains available to the Mirror Debug Center. Only their independent presentation is suppressed. No motion, camera, MoveNet, IK, retargeting, mat navigation, Godot, rep counting, or workout-state authority changes.

## Physical phone acceptance
1. Open/reload the Pocket PT workout on iPhone Safari.
2. No Mirror Motion Live Acceptance, Camera Review, Phase 18, or other legacy producer panel may independently cover the page.
3. Exactly one small Debug launcher is visible while closed.
4. Opening it shows one Mirror Debug Center.
5. Copy All retains producer evidence and FIRST FAILURE.
6. Closing it returns to an unobstructed workout UI.

Physical iPhone acceptance is decisive. Do not merge based only on static tests if the phone still shows independent producer panels.
