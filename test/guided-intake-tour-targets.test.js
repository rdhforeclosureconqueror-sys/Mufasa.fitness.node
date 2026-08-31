"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const guidePath = path.join(__dirname, "..", "public", "guided-experience.js");
const source = fs.readFileSync(guidePath, "utf8");

test("Intake tour keeps a canonical visible fallback for dynamic targets", () => {
  assert.match(source, /target:\s*'\[data-tour="intake-wizard"\], #retentionFlowRoot'/);
  assert.match(source, /target:\s*'\[data-tour="intake-current-section"\], #retentionFlowRoot'/);
  assert.match(source, /target:\s*'\[data-tour="intake-actions"\], #retentionFlowRoot'/);
});

test("Intake target fallback remains on the canonical retention root", () => {
  const matches = source.match(/#retentionFlowRoot/g) || [];
  assert.ok(matches.length >= 4, "expected route plus Intake fallback targets to reference retentionFlowRoot");
});
