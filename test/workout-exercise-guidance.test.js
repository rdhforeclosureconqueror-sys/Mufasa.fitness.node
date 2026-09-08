"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const runtime = fs.readFileSync(path.join(repoRoot, "public", "workout-exercise-guidance.js"), "utf8");
const bootstrap = fs.readFileSync(path.join(repoRoot, "public", "kettlebell-workout-runtime.js"), "utf8");

test("workout runtime loads shared canonical exercise guidance", () => {
  assert.match(bootstrap, /workout-exercise-guidance\.js/);
  assert.match(bootstrap, /loadSharedExerciseGuidance\(\)/);
});

test("guidance resolves current exercise through authenticated canonical exercise APIs", () => {
  assert.match(runtime, /\/api\/me\/exercises\?query=/);
  assert.match(runtime, /\/api\/me\/exercises\/\$\{encodeURIComponent\(exact\.exerciseId\)\}/);
  assert.match(runtime, /MaatApiClient/);
});

test("guidance presents existing media and technique instead of an instructional void", () => {
  assert.match(runtime, /media\?\.illustrations/);
  assert.match(runtime, /Setup \/ start position/);
  assert.match(runtime, /Execution/);
  assert.match(runtime, /Finish \/ return/);
  assert.match(runtime, /Key coaching cues/);
  assert.match(runtime, /Safety/);
});

test("guidance follows exercise label changes and provides a safe fallback", () => {
  assert.match(runtime, /MutationObserver/);
  assert.match(runtime, /exerciseLabel/);
  assert.match(runtime, /Do not guess at an unfamiliar movement/);
  assert.match(runtime, /Open Exercise Hub technique/);
});
