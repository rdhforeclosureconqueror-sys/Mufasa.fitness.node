# Motion Lab Canonical Diagnostic Consolidation — 2026-09-08

## Trigger

After PR #719 merged, the operator still copied the legacy `Motion Lab Diagnostic` block containing only route/session/render stages. The new Motion Intelligence diagnostics were present on `main`, but they were rendered under `Loaded motion` with a separate copy button. The existing `Copy Diagnostic Summary` button still returned only the legacy stage table.

## First failing boundary

`Motion Intelligence diagnostics merged -> rendered beside canonical diagnostics -> operator uses canonical Copy Diagnostic Summary -> Motion Intelligence evidence omitted`

This was a presentation/consolidation failure, not a lunge mechanics failure and not a stale-asset-cache failure. The protected Motion Lab shell and asset routes already send no-store headers.

## Fix

- add `public/motion/motion-lab-diagnostic-consolidator.js` as a presentation-only integration layer;
- load it after `MotionLabRuntime` and before lunge preview;
- move the existing Motion Intelligence heading/data/text into the existing **Diagnostics** column;
- remove the separate Motion Intelligence copy button;
- convert the existing `Copy Diagnostic Summary` control into the one canonical **Copy Full Diagnostic Summary** control;
- copy one block containing legacy stages, Motion Intelligence diagnostics, first-failure evidence, and bootstrap delivery state;
- show a visible `Diagnostic UI build: 2026-09-08-canonical-diagnostic-v1` marker so device screenshots prove which diagnostic UI is active;
- fail explicitly at `diagnostic_consolidator_install` if the integration layer is unavailable.

## Authority boundary

This change does not modify Motion Specs, lunge/squat geometry, contact/root correction, IK, retargeting, renderer/mixer authority, rest-pose handling, or live mirror behavior. `PocketPTMotionIntelligenceDiagnostics` remains the Motion Intelligence truth authority. The new consolidator only owns presentation and canonical copy behavior.

## Device acceptance

After deploy:

1. Open Motion Lab and initialize runtime.
2. Confirm the Diagnostics section visibly shows `Diagnostic UI build: 2026-09-08-canonical-diagnostic-v1`.
3. Load reference avatar.
4. Load synthesized lunge.
5. Press **Copy Full Diagnostic Summary**.
6. The copied block must begin with `MOTION LAB DIAGNOSTIC — CONSOLIDATED` and include both the legacy stage list and `MOTION LAB — MOTION INTELLIGENCE DIAGNOSTICS`.
7. Use the first failing Motion Intelligence boundary to choose the next mechanics fix.

## Verification status

Focused regression coverage was added in `test/motion-lab-canonical-diagnostic-consolidation.test.js`, but tests were not executed in this connector environment. Canonical readiness stores were not edited because repository policy requires the readiness CLI rather than direct JSON mutation.
