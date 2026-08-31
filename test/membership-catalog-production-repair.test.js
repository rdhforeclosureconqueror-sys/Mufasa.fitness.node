"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "membership.js"), "utf8");

test("membership catalog uses canonical billing route before additive compatibility route", () => {
  const canonical = source.indexOf('"/api/billing/plan"');
  const compatibility = source.indexOf('"/api/billing/plans"');
  assert.ok(canonical >= 0, "canonical /api/billing/plan route must be used");
  assert.ok(compatibility > canonical, "compatibility route must come after canonical route");
});

test("membership catalog has safe three-plan degraded fallback", () => {
  assert.match(source, /PocketPT Essential/);
  assert.match(source, /\$9\.99/);
  assert.match(source, /PocketPT Performance/);
  assert.match(source, /\$19\.99/);
  assert.match(source, /PocketPT Unleashed/);
  assert.match(source, /\$39\.99/);
  assert.match(source, /catalogSource === "local-fallback"/);
  assert.match(source, /Checkout is temporarily disabled until PocketPT verifies the live billing catalog/);
});

test("membership debug state exposes sanitized catalog failure stage", () => {
  assert.match(source, /catalogSource: state\.catalogSource/);
  assert.match(source, /catalogLoadError:/);
  assert.doesNotMatch(source, /stripePriceId\s*:/);
});
