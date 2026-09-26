# Independent review handoff — personal push-up pose matching

## Mission
Independently review the push-up calibration repair on branch `fix/pushup-personal-pose-matching`. Do not assume the implementation is correct because the author says it is.

## User-visible problem
On a real phone, the Push-Up Arena repeatedly failed to catch/hold TOP and BOTTOM even though MoveNet was running. The MVP only needs reliable personal TOP -> BOTTOM -> TOP recognition so the challenge can proceed. Avatar mirroring quality must not gate exercise recognition.

## Intended architecture
1. Camera/MoveNet remains the pose source.
2. Calibration learns the athlete's own TOP and BOTTOM templates.
3. Template geometry is normalized as joint angles, not raw pixels.
4. Calibration requires the core side chain: shoulder, elbow, wrist, hip.
5. Ankle is supporting evidence only; losing it at the edge of a phone frame must not block setup.
6. TOP/BOTTOM classification uses the personal upper-body signature.
7. This is calibration/setup only. Do **not** weaken authoritative competition rep scoring or claim that calibration certifies safe form.
8. Avatar mirroring/LIVE_MOCAP remains downstream and must not become the authority for rep recognition.

## Files changed
- `public/arena-pose-calibration.js`
- `public/arena-camera.js`
- `test/arena-pose-calibration.test.js`
- `test/arena-camera.test.js`

## Required review
- Inspect the diff for accidental weakening outside calibration/setup.
- Verify TOP/BOTTOM templates remain attempt-local and are not persisted or transmitted.
- Verify missing shoulder/elbow/wrist/hip still fails closed.
- Verify missing/weak ankle no longer blocks calibration.
- Verify TOP and BOTTOM remain sufficiently separable and TOP confirmation is still required.
- Verify source-change, stale-frame, timeout and tracking-loss protections still work.
- Verify no dependency on avatar mirroring was introduced.
- Run at minimum:
  - `node --test test/arena-pose-calibration.test.js`
  - `node --test test/arena-camera.test.js`
  - relevant arena phone/hands-free calibration tests
- Then run the broadest practical arena test suite and report any pre-existing vs introduced failures separately.

## Physical acceptance still required
Automated tests cannot prove the original device failure is fixed. On the user's phone:
1. Set phone at side view.
2. Keep shoulder/elbow/wrist/hip visible; ankle may leave frame.
3. Capture personal TOP.
4. Capture personal BOTTOM.
5. Return to TOP and confirm.
6. Confirm live classification transitions TOP -> BETWEEN -> BOTTOM -> BETWEEN -> TOP without requiring avatar mirroring.
7. Only after that should downstream countdown/scoring integration be accepted.

## Reviewer verdict format
Return:
- PASS / NEEDS CHANGES
- exact failing boundary if any
- tests run and counts
- whether authoritative scoring semantics changed
- whether physical-device acceptance remains outstanding
- any recommended patch, with file/line rationale

Do not merge solely from this handoff. Review first.
