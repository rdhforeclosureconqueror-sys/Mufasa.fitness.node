# Independent review — Push-Up Arena diagnostics

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Branch: `review/arena-first-failure-diagnostics-20260903`

Draft PR: [#633 — Add first-failure diagnostics to Push-Up Arena](https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node/pull/633)

Original implementation: `62d5811e3fcc8330f2922536a394fa3cb040efcf`. Independent review examined head `04785dfefd6136ae932fcfa4b7bb504c6ba8d040`. The tested keyboard repair is `4bc9b0f8951529d842bc6c966a11c36000739da9`; its following handoff/readiness commit records the repair evidence. Review the actual current PR head as well.

Implementation started from main `2e09f66101c6c77b5485cc4696a739a8a01872de`. The final review branch is based on main `743c9ac4490264dbea95176a97c716a95ed28efa`, which includes the planning handoff from PR #632. Record and review the actual draft PR head, not a remembered commit. Do not merge during this independent review. Report findings to the owner, who will do the visual acceptance check.

## Keyboard repair for re-review

The independent review requested changes because opening the board left focus on its toggle, outside the board's Escape listener. The replacement keyboard regression failed on that reviewed code with **Opening must move focus to Close** before the repair was applied.

The runtime repair adds two lines in `setOpen()`: detect a hidden-to-visible transition, then focus **Close** after showing the board. Escape and Close retain the existing return to the toggle. Repeated requests to show an already open board preserve the current focus, including the manual-copy textarea.

This follow-up changes only `public/arena-diagnostics.js`, `test/arena-diagnostics.test.js`, this handoff and `data/readiness/development-evidence.json`. The full PR still contains the same nine files. Please recheck:

1. Focus the **Arena Diagnostics** toggle with the keyboard. Activate it with Enter. Focus must move to **Close** without another Tab press.
2. Immediately press Escape. The board must hide, `aria-expanded` must become false and focus must return to the toggle. Reopen it and activate Close with Enter; the same recovery must work.
3. While Copy Debug Report or its denied-clipboard fallback has focus, another `setOpen(true)` or diagnostic render must preserve that focus. Escape from the textarea must also close the board and return to the toggle.
4. Inspect the regression fixture: it tracks one `document.activeElement`, respects hidden ancestors and bubbles key events from that element. It must not call the board's Escape callback directly to simulate a keyboard user.
5. Independently rerun the six-file suite below, readiness validation and the whitespace check. The implementer's updated result is **57 passing tests**, with no failures or skips. The prior independent reviewer could not reproduce the earlier 55-test run because their environment could not resolve GitHub; this repair does not replace that missing independent execution evidence.

These focus tests use a controlled DOM fixture, not a live browser. Independent re-review, owner visual acceptance and physical-iPhone acceptance remain pending. The Godot sender, walking and challenge work remain outside this repair.

## What changed and what to expect

The existing **Bridge Debug** panel on `/arena/push-up` becomes **Arena Diagnostics**. It reports the first observed failing dependency, the next unverified check, each check's owner and the next diagnostic action. Connection success does not imply animation, body tracking, rep recognition, saving or ghost success.

The current Godot export sends the existing v1 READY handshake. It does **not yet send the new optional diagnostic messages**. Therefore, successful sign-in and launch can be green while **Game diagnostic reporting** is **NOT CONNECTED** and its dependent avatar checks are **BLOCKED**. This does not mean the owner's working avatar failed to load. Its existing in-game Phase 2 panel remains the current evidence until a sender is added to the editable Godot project.

There are separate checks for personal-avatar descriptor, download, import, mount, default fallback, idle animation and walking. A default avatar never becomes a personal-avatar PASS. A moving character never becomes a walking-animation PASS. No camera, rep counter, timer, voice call, result write or leaderboard request starts merely by opening diagnostics.

The existing gym, generated Godot export, avatar pipeline, server routes and authentication implementation are preserved. This change does not implement walking or the challenge. It supplies the observation layer for that work.

## Files to inspect

| File | Review focus |
| --- | --- |
| `public/arena-push-up.html` | Same arena/frame/exit; existing panel expanded, responsive layout, accessible controls and versioned script references. |
| `public/arena-push-up.js` | Existing config → ticket exchange → bootstrap → build → game flow; safe diagnostics; message validation; timeouts; exit and page lifecycle. |
| `public/arena-diagnostics.js` | Dependency model, truthful states, fixed safe messages, runtime reporter allowlist, report copying and rendering. |
| `test/arena-diagnostics.test.js` | Behavioral model, actual launcher in controlled browser/HTTP fixtures, clipboard and keyboard handling. |
| `test/world-bridge-pocketpt-finish.test.js` | Existing bridge checks updated for scripts extracted from the HTML. |
| `scripts/preview-arena-diagnostics.js` | Standalone local preview using synthetic data only. Not imported by either production server. |
| `data/readiness/development-cards.json` | New development card `avatar-development-arena-first-failure-diagnostics` on the `avatar` board. |
| `data/readiness/development-evidence.json` | Correlated machine evidence from the canonical CLI; no human approval claim. |
| This handoff | Review instructions, proof limits and remaining integration. |

No `public/game/push-up-arena/*`, Godot scenes, animation clips, skeletons, `server.js`, auth services, exercise definitions, result stores or production deployment configuration should change in this PR. No generated `data/ops/` files should be committed.

## Required review checks

1. **Check the base and scope.** Verify the current main and draft head. Confirm the changed-file list above and that PR #632's planning content remains present. Confirm no changes to the working export or approved gym.
2. **Preserve launch and identity.** The existing server-owned return URL, one-use fragment ticket, cookie-scoped bootstrap and fixed `PUSH_UP_ARENA / push_up` context remain authoritative. The panel does not read a bearer token or create another auth mechanism. Failed ticket exchange also removes the fragment.
3. **Check first failure, not a cascade.** A bootstrap 401 is the first failure; dependent identity, build, handshake and runtime checks become blocked. A specifically reported import failure is visible even if other runtime evidence has not arrived. Starting a retry clears old dependent successes so a fresh download cannot revive an old mount PASS.
4. **Check evidence limits.** READY proves the game connection. The build probe proves the server found an entry, not that its WASM/PCK rendered. A valid descriptor proves availability, not import. No evidence means NOT CONNECTED or BLOCKED, never PASS. Personal-avatar and fallback statuses remain distinct.
5. **Check message isolation.** Accept only the exact game iframe's `contentWindow`, exact current origin, `POCKETPT_GODOT_BRIDGE` and numeric protocol v1. A second same-origin window cannot set the panel green. Runtime diagnostics also require the current random request ID, diagnostic version 1 and a strictly increasing safe-integer sequence. Reject old generations, duplicates, invalid statuses and unowned stages.
6. **Check ownership.** Godot may report only its allowed visual/world checks. It cannot mark identity, camera, body visibility, rep validation, timer, leaderboard or persistence PASS. These still need instrumentation in their canonical PocketPT owners.
7. **Check lifecycle.** READY arriving before iframe `load` remains PASS. A replacement iframe document resets game evidence and uses a new request ID. Session expiry blocks dependent checks and late reports. Browser back-cache restoration marks bootstrap stale and asks for reload. Exit cancels pending startup work, revokes the existing session and returns to the canonical PocketPT URL.
8. **Check bounded behavior.** JSON requests time out after 20 seconds; game frame/READY waits after 120 seconds. A genuine late READY may recover. Exit revocation is bounded at 5 seconds. There is no polling loop or second avatar download. Expiry is a local check against the bootstrap timestamp, not a claim of continuous server validation or a new auth authority.
9. **Check privacy and copying.** Retain only fixed diagnostic messages, stage/status IDs and observation times. Do not include raw HTTP errors, arbitrary game messages, URLs with fragments/queries, identity values, session IDs, cookies, tokens, video, landmarks or health data. Clipboard failure must show a selectable report and must not say it copied successfully.
10. **Check the UI on devices.** Exercise toggle focus → Enter → Close focus → immediate Escape → hidden board and toggle focus. Also test Enter on Close, Escape from the manual-copy textarea, and focus preservation when an already open board receives diagnostic updates. Check scrolling, readable status words, Copy Debug Report, Reload Arena and Exit Arena. Confirm the overlay does not prevent exiting or recovering the normal game view. Human visual and physical-iPhone acceptance remain open.

## Automated validation

From the review branch, install the locked dependencies and run:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
node --test --test-reporter=spec test/arena-diagnostics.test.js test/world-bridge-pocketpt-finish.test.js test/world-bridge-production-entry.test.js test/world-bridge-mobile-auth.test.js test/world-bridge.test.js test/world-avatar-bridge.test.js
npm run readiness:validate -- --base 743c9ac4490264dbea95176a97c716a95ed28efa
git diff --check 743c9ac4490264dbea95176a97c716a95ed28efa
```

The implementer's targeted suite passed **57 tests** after the keyboard repair. Coverage includes dependency ordering and recovery, no invented passes, descriptor/fallback distinctions, source/origin/version validation, request generation and sequence rejection, stage ownership, safe reports, clipboard denial, the focused-toggle opening/Escape path, Close activation, focus preservation during updates, the actual shell's ticket ordering and scoped fetches, early READY, failed/malformed/stalled requests, bounded waits, expiry, back-cache restoration, iframe replacement and exit. The existing bridge/avatar server regression checks remain part of the command. Readiness validation and the whitespace check also pass. These are technical tests, not an independent test rerun or human visual approval.

Browser preview was attempted through the provided browser tool. The environment rejected the local preview URL with `net::ERR_BLOCKED_BY_CLIENT`; no live-browser layout, real authenticated Godot run or physical-iPhone acceptance is claimed. Run the preview and deployed checks below independently.

## Local visual preview in PowerShell

In a checkout of this review branch, run:

```powershell
node scripts/preview-arena-diagnostics.js
```

Open the printed local address, normally `http://127.0.0.1:8769/`. The preview needs Node but no npm dependencies. It serves the actual panel files with **synthetic** API responses and a clearly labelled simulated game frame. It does not open the real gym, use real accounts, fetch avatars or save scores. Stop it with Ctrl+C.

| Case | Expected result |
| --- | --- |
| `legacy` | Connection and descriptor checks succeed. Game reporting stays NOT CONNECTED; future checks do not become green. |
| `avatar-failure` | Download reports PASS, import reports FAIL, mount is BLOCKED. Import is the first failure. |
| `avatar-pass` | Separately reported download/import/mount pass. Walking and body/challenge checks remain unverified. |
| `unauthorized` | Bootstrap 401 is the first failure; no game frame launches. |
| `fallback` | Personal descriptor/download/import/mount are explicitly skipped for the fallback; the separately reported default display can pass. |
| `clipboard-denied` | Clicking Copy Debug Report exposes the selectable report instead of claiming success. |
| `390px narrow layout` | Panel and actions fit the narrow iframe and remain scrollable. This is layout coverage, not an iPhone/Safari emulator. |

## Deployed owner visual check

After independent review and the owner's merge/deployment decision:

1. Sign in to PocketPT and enter Push-Up Arena through the usual link.
2. Confirm the same member avatar, approved gym and existing arrow movement still appear.
3. Open **Arena Diagnostics**. Confirm the panel version says `arena-diagnostics-v1`. Connection and descriptor checks should reflect this launch.
4. With the existing Godot export, expect game diagnostic reporting to be NOT CONNECTED. Compare actual avatar import/mount evidence with the existing in-game Phase 2 panel. Do not interpret missing reporting as an avatar-load failure.
5. Confirm there is no new camera prompt or challenge start. On desktop, focus the diagnostics toggle, press Enter and immediately press Escape; confirm the panel closes and focus returns to the toggle. Open, close, copy, reload and exit. Repeat the applicable controls on a physical iPhone. Record visual findings separately from automated test results.

## Optional Godot diagnostic sender — next integration

The receiver is ready, but the sender is not implemented in this PR. Add it only to the actual `C:\Users\pftgu\Documents\avlobytest` project after the source is available for review. Reuse its existing avatar loader and bridge; do not rebuild the import pipeline or hand-edit the exported PCK.

The existing v1 READY message remains unchanged. Once received, the parent sends this additive request to the exact iframe origin:

```json
{
  "type": "POCKETPT_GODOT_BRIDGE",
  "event": "DIAGNOSTICS_REQUEST",
  "protocolVersion": 1,
  "diagnosticVersion": 1,
  "requestId": "opaque-per-launch-correlation-id"
}
```

The Godot-side sender must check the parent window and origin, retain the request ID, and report current observed states through the existing browser bridge:

```json
{
  "type": "POCKETPT_GODOT_BRIDGE",
  "event": "DIAGNOSTIC",
  "protocolVersion": 1,
  "diagnosticVersion": 1,
  "requestId": "opaque-per-launch-correlation-id",
  "sequence": 1,
  "stage": "AVATAR_DOWNLOAD",
  "status": "PASS"
}
```

Allowed Godot stages are `AVATAR_DOWNLOAD`, `AVATAR_IMPORT`, `AVATAR_MOUNT`, `AVATAR_FALLBACK`, `ANIMATION_IDLE`, `LOCOMOTION`, `CHALLENGE_STATE`, and `GHOST_PLAYBACK`. Normal statuses are PASS, FAIL, RUNNING, WAITING or NOT_CONNECTED. SKIP is accepted only for optional fallback/ghost checks. When bootstrap selects a default fallback, personal download/import/mount PASS reports are rejected.

Do not include member identifiers, GLB URLs, camera data or arbitrary error text. The receiver ignores such extra fields. Request IDs correlate evidence; they are not authentication credentials. Restart the sequence for a **new** request ID, preserve it for a duplicate request, and stop reporting on exit. Report RUNNING at the start of a new avatar attempt so dependent successes are invalidated before retry/replacement. Technical animation PASS means the runtime connected playback; the owner still judges whether it walks naturally.

PocketPT's camera, control-channel acknowledgement, rep engine, timer, persistence, leaderboard, cadence loading and voice will get their own instrumentation as those phases are implemented. Do not load another detector or issue speculative challenge writes just to turn a diagnostic row green.

## Required independent review response

Return: reviewed base/head SHA; changed-file scope; PASS/FAIL/BLOCKED per review item; exact tests and results; the first defect found, with its file; visual/device evidence actually observed; remaining Godot sender work; and whether the panel is ready for the owner's visual test. Keep walking/challenge implementation and human approval separate. Do not merge, deploy, self-approve human readiness, or imply that simulated preview evidence proves the production avatar works.
