"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("accepted courtesy trial routes first-run member to Retention Journey entry before dashboard", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "trial.js"), "utf8");
  assert.match(source, /retention-journey-start\.html\?firstRun=1&trial=started/);
  assert.doesNotMatch(source, /trial=started&tour=dashboard/);
});
