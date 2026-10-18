"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("accepted courtesy trial opens Nutrition by default without forcing Retention Journey", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "trial.js"), "utf8");
  assert.match(source, /:"\/nutrition\.html"/);
  assert.doesNotMatch(source, /retention-journey-start\.html\?firstRun/);
  assert.doesNotMatch(source, /trial=started&tour=dashboard/);
});
