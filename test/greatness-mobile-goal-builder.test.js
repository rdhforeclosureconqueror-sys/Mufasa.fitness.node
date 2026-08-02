"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = file => fs.readFileSync(path.join(__dirname, "../public", file), "utf8");

test("mobile Greatness goal builder is structured, responsive, and announces its selection", () => {
  const html = read("greatness.html"), css = read("greatness.css"), js = read("greatness.js");
  assert.match(html, /class="card goal-builder/);
  assert.match(html, /id="goalBuilderSummary"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /id="customDistance"[^>]+aria-describedby="customGoalHint"/);
  assert.match(css, /\.goal-builder__fields\{display:grid/);
  assert.match(css, /@media\(max-width:700px\)\{\.goal-builder/);
  assert.match(css, /\.goal-builder \[hidden\]\{display:none!important\}/);
  assert.match(js, /function updateGoalBuilderSummary/);
  assert.match(js, /\$\("activity"\)\.onchange=updateGoalBuilderSummary/);
});
