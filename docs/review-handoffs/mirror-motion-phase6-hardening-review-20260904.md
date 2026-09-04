# Mirror Motion Intelligence — Phase 6 hardening review

## Reviewed implementation

Merged Phase 6 PR #645, now present on the stacked motion-intelligence feature branch.

Reviewed Phase 6 implementation head: `9fb369aa510065f41f0decdb28038e291bc999ec`.

Corrective branch starts from the post-Phase-6 stacked branch head `de6e073beabcd727e76d41072eef6c859a385a62`.

## Verdict

CHANGES REQUIRED.

## Findings

1. **Phase 6 could invalidate Phase 5 IK output.**
   Phase 5 solves knees/elbows to exact two-segment geometry. Phase 6 then adaptively smoothed those same solved joints unless they happened to be Phase 4 distal anchors. That can move the middle joint off the solved circles and immediately reintroduce limb-length residual after IK.

2. **Uncertainty was evaluated after anchoring.**
   A coasted/dropped point with a still-present Phase 4 anchor could take the anchor passthrough path first and be written into live-curve history. Phase 4 deliberately uses contact hysteresis, so this ordering can contaminate curve history during short perception dropouts.

3. **Acceleration telemetry/math was not actually acceleration.**
   Velocity delta was divided by body scale but not by elapsed time, while the result was named `curveAccelerationBodyPerSec2`. The adaptive response was therefore frame-rate dependent and dimensionally inconsistent.

4. **Fields documented as per-frame telemetry were cumulative averages.**
   `liveCurve.averageAlpha`, suppression, and latency were calculated from lifetime sums. The packet-level telemetry therefore did not describe the current frame, making tuning and first-failure interpretation misleading.

## Fixes

- Preserve Phase 5 `ikState === 'solved'` joints exactly through Phase 6 and expose `ik_passthrough` / IK-bypass diagnostics.
- Make dropped/coasted uncertainty take precedence over both IK and contact-anchor passthrough, clearing history rather than seeding it.
- Compute acceleration as velocity change divided by body scale and elapsed seconds; retune the default acceleration gain for the corrected units.
- Keep cumulative diagnostics cumulative, but make packet-level live-curve alpha/suppression/latency truly per-frame.
- Preserve timestamp continuity after an exercise-change reset.

## Regression coverage added

- coasted anchored contact cannot seed curve history;
- Phase 5 solved joint is not moved by Phase 6;
- acceleration telemetry is body-scale-normalized per second squared;
- packet-level telemetry reflects the current frame rather than lifetime history;
- debug text exposes IK bypasses.

## Scope boundary

No quaternion retarget rewrite, new IK solver, 3D reconstruction, collision solver, new camera/MoveNet authority, or new exercise/rep authority is added.

Run Phase 1–6 focused tests, the full repository suite, and live-camera squat/push-up/jumping-jack/contact/reconnect acceptance before treating the stacked branch as merge-ready.