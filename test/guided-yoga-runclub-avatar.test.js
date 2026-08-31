"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const guide = fs.readFileSync(path.join(__dirname, "..", "public", "guided-experience.js"), "utf8");

test("Yoga detail guidance falls back to the visible catalog", () => {
  assert.match(guide, /target:\s*'\[data-tour="yoga-detail"\], \[data-tour="yoga-catalog"\]'/);
});

test("Run Club guide uses the canonical public Run Club entry route", () => {
  assert.match(guide, /"run-club":\s*"\/stepping-into-greatness\.html"/);
  assert.doesNotMatch(guide, /"run-club":\s*"\/greatness\.html"/);
});

test("Avatar guidance explains the full Avaturn export and upload workflow", () => {
  for (const phrase of [
    "Open Avaturn Creator",
    "export or download the .glb file",
    "Choose File",
    "Upload Avatar (.glb)",
    "saved avatar"
  ]) assert.ok(guide.toLowerCase().includes(phrase.toLowerCase()), `missing guidance phrase: ${phrase}`);
});
