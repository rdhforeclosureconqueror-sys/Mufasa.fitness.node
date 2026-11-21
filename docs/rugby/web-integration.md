# Rugby HQ Web integration

Status: local export and browser regression pass; visual inspection, PR, deployment and human acceptance pending.

Windows source C:\Users\pftgu\Documents\rugby-hq is unchanged. Independent Web source is godot/rugby-hq-web. Exported assets are public/game/rugby-hq. Existing /rugby.html and Community Hub entry are retained.

## Rebuild and test
Set GODOT_WEB_BIN to standard Godot 4.5.1 console executable, then run node scripts/export-rugby-web.js and node scripts/check-rugby-web-browser.js. Existing official Web templates are required. No software was installed. The export script imports, exports and records SHA-256 hashes in build-manifest.json.

The Web copy uses GDScript, Compatibility/WebGL 2 and single-thread templates. No .NET runtime or editor MCP/GUT addon is exported. Rashad model, rig and locomotion resources are retained.

## Verified evidence
Godot import/export passed. Frontend build passed with a local-only placeholder Maps key. Production retains its configured key. Chrome browser input regression passed; see web-validation/chrome-gameplay.json. Tests cover WASD/arrows displacement and facing, sustained locomotion, rig animation, ball visibility state, Space passing and support catch, HUD PASS click, reset and scroll prevention. No engine errors captured. These results do not certify visual quality or human playability.

Test corrections: Space must await the next telemetry sample. HUD coordinates must use Godot viewport screen transform to account for letterboxing. Neither correction required gameplay changes.

Readiness validation passed with READINESS_PREVIOUS_EVIDENCE_FILE holding exact HEAD evidence JSON; this avoids the existing validator Windows backslash Git-path issue without changing unrelated code.

## Hosting
Serve .wasm as application/wasm, .js as JavaScript and .pck as binary, without HTML fallback. Single-thread export needs no cross-origin isolation headers. Host may negotiate compression normally. Browser shell provides loading/error states, focus, scroll prevention, fullscreen and back navigation. QA diagnostics require ?qa=1.

Chrome headless is tested. Visible rendering/fullscreen, other browsers, mobile and live route are unverified.

## Deployment and rollback
Target static service: srv-d4qicd7diees739b6n7g, main branch, npm run build:frontend, dist. PR previews disabled. Same repository also auto-deploys backend srv-d4qdha49c44c73bb7vbg; no backend code, configuration or data changes are intended.
Before merge: inspect diff, record implementation review and separate AI-assisted criteria review, pass applicable checks, record current live deploy/commit and inspect preview. Respect branch protection. Monitor both services after merge and verify actual public routes, MIME types and browser gameplay before requesting owner acceptance.
Rollback through a reviewed revert PR: git revert the squash commit, or git revert -m 1 the merge commit; merge and redeploy. Never force-push main. No database migration is involved. If needed, restore the recorded prior Render frontend deployment then reconcile source with revert. Recheck automatic deployment settings after a Render rollback.

Planned public URL (not yet deployed): https://mufasafitsite.onrender.com/game/rugby-hq/index.html
Local preview: http://127.0.0.1:8780/game/rugby-hq/index.html
Rollback baseline: frontend deploy dep-dc0bkih42hec73f3nlrg at commit 541c9f66000ed3abbaf828d0511fdc207317935d. Package archive directory inspection and existing rugby isolation/prototype regressions: 8 tests passed.

