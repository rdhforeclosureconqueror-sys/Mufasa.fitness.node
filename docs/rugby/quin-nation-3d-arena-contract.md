# Quin Nation — 3D Rugby Training Arena

Status: architecture and acceptance contract; **not a playable release**.

## Game modes
Only **2v1**, **2v2**, and **3v2**. Solo play fills all unclaimed attacker and defender positions with AI. Private rooms allow up to **four human players**; remaining roles use AI. Do not change existing Rugby HQ drill links before acceptance.

## Existing foundations
- `public/rugby-player.html`: Rugby HQ access.
- `public/rugby-threejs-existing-drills.js`: Three.js **view of SVG drills**, not a game simulation or network engine.
- `public/community-avatar.js`: token-gated GLB avatar loader; reuse its path validation and asset authorization, with low-poly fallback. Remote avatar sharing requires authorization.
- Preserve the existing five-point opportunity checklist criteria and inside/outside/middle terminology. Extract tactical scoring into a pure shared module; do not use DOM text as authoritative multiplayer state.
- The attached RAVENS MF cheat sheet describes full-team scrum, crash, decoy JETS, wedge and edge ruck sequences; useful later, but outside these three small-sided modes.

## Build stages
1. **Solo vertical slice: 2v1**. Real grass pitch, lines, animated player/avatar fallback, ball, chase and tactical cameras, touch joystick and pass/dummy/kick buttons, desktop keyboard/gamepad controls. Fixed-step player movement, cuts, ball flight and recovery, AI defender reaction, deterministic replay.
2. **2v2 then 3v2** using the same shared scenario and scoring engine. Defensive AI reads attacker position, support and available space; outcomes are not guaranteed.
3. **Four-player private rooms**: server-authoritative movement and ball ownership, WebSocket snapshots, room code, authenticated membership, role assignment, AI fill, disconnect/reconnect, validation against impossible actions.
4. **Rugby HQ entry** behind feature flag only after live mobile acceptance.

## Coaching rubric
Five checks: defender committed; usable space created; ball moved into opportunity; support positioned; execution outcome. Show one dramatic check at a time **after the play**; collapsible full review available. Score decisions and actual execution separately. Teach legal support lines and passing; **never present deliberately blocking a defender after passing as automatically lawful**. Contrast legal running lines and obstruction.

## Technical and acceptance requirements
- Separate `/rugby-arena.html` entry; lazy-load Three.js/GLB assets. Keep existing SVG drills unchanged.
- Shared deterministic pure rules module; authoritative server for multiplayer; interpolate client snapshots. Do not trust client position, score, or possession.
- Mobile Safari first: capped DPR, adaptive graphics, safe-area-aware controls, no modal covering gameplay, no render-loop DOM polling, proper cleanup.
- Replay resets exactly the same scenario/seed and never opens the chooser; Change scenario is always dismissible.
- Kick plays continue until ball recovery/contest or a defined terminal outcome.
- Tests: deterministic solo results for all three modes, pass/dummy/kick, room authorization, four-player join, AI fill, reconnect, mobile overlays, avatar fallback, and 3D checklist.
- Rollback: new entry stays gated; old Rugby HQ simulator remains operational.
