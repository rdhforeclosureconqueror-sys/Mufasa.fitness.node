"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const wizard = require("../public/retention-journey-wizard.js");

const wizardSource = fs.readFileSync(path.join(__dirname, "../public/retention-journey-wizard.js"), "utf8");
const flowSource = fs.readFileSync(path.join(__dirname, "../public/retention-flow.js"), "utf8");

test("Phase 12C exposes member-facing navigation and submitted review mode", () => {
  assert.match(wizardSource, />Previous</);
  assert.match(wizardSource, />Return later</);
  assert.match(wizardSource, /Save &amp; Continue/);
  assert.match(wizardSource, /Review submitted answers/);
  assert.match(wizardSource, /rjw-readonly/);
});

test("Phase 12C maps HTTP, offline, retry, and session-expiry failures", () => {
  for (const status of [400, 401, 403, 404, 409, 429, 500]) {
    assert.ok(wizard.mapServerErrors({ status })?._summary, `status ${status} has a visible message`);
  }
  assert.match(wizard.mapServerErrors({ status: 401 })._summary, /session expired/i);
  assert.match(wizardSource, /Retry save/);
  assert.match(wizardSource, /navigator\.onLine/);
  assert.match(flowSource, /error\.status = res\.status/);
});

test("Phase 12C guards duplicate actions and supports keyboard continuation", () => {
  assert.match(wizardSource, /if \(busy\) return pending/);
  assert.match(wizardSource, /setBusy\(true\)/);
  assert.match(wizardSource, /event\.key === "Enter"/);
  assert.match(wizardSource, /event\.preventDefault\(\)/);
});

test("Phase 12C keeps retry payload and entered DOM values after failure", () => {
  assert.match(wizardSource, /retryPatch=clone\(patch\)/);
  assert.match(wizardSource, /Save failed — retry available/);
  assert.match(wizardSource, /save\(retryPatch, \{ rerender: true \}\)/);
  assert.match(wizardSource, /return false/);
});
