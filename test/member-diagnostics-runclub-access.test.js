"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("legacy workout and dashboard diagnostics fail closed for non-admin members", () => {
  const css = read("public/global-nav.css");
  for (const selector of [
    "#formRulePanel",
    "#mobileLayoutContainmentProof",
    "#poseTrackingProof",
    "#poseOverlayProof",
    "#posePerformanceProof",
    "#poseBootstrapTrace",
    "#avatarManualControlEventTrace",
    "#avatarManualControlProof",
    ".card:has(#launchHealthStatus)"
  ]) {
    assert.match(css, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${selector} must be covered by the admin-only diagnostics gate`);
  }
  assert.match(css, /html:not\(\.maat-admin-diagnostics\)/);
});

test("free Run Club uses the existing Greatness movement runtime in explicit free mode", () => {
  const entry = read("public/stepping-into-greatness.js");
  assert.match(entry, /RUN_CLUB_ROUTE = "\/greatness\.html\?mode=run-club"/);
  assert.match(entry, /PRODUCTION_BACKEND_ORIGIN = "https:\/\/mufasa-fitness-node\.onrender\.com"/);
  assert.match(entry, /restoreCanonicalAuthState\(\{ force: true, reason: "run-club-entry" \}\)/);
  assert.match(entry, /returnTo: RUN_CLUB_ROUTE/);
});

test("Stepping Into Greatness requires paid membership while Run Club mode bypasses only the paid check", () => {
  const guard = read("public/greatness-entry-auth.js");
  assert.match(guard, /FREE_RUN_CLUB_MODE = "run-club"/);
  assert.match(guard, /MEMBERSHIP_ROUTE = "\/api\/me\/membership"/);
  assert.match(guard, /membership\.hasAccess === true/);
  assert.match(guard, /paid_membership_required/);
  assert.match(guard, /free_run_club_authenticated/);
  assert.match(guard, /if \(trace\.accessMode === FREE_RUN_CLUB_MODE\)/);
  assert.match(guard, /\.section-nav \[data-tab\]:not\(\[data-tab="move"\]\)/);
});
