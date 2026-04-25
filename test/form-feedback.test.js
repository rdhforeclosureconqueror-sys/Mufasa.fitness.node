"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { mapRegionFeedbackToColor, FORM_STATUS } = require("../public/form-engine.js");

test("feedback mapping returns correct colors", () => {
  assert.equal(mapRegionFeedbackToColor(FORM_STATUS.GOOD), "#22c55e");
  assert.equal(mapRegionFeedbackToColor(FORM_STATUS.WARNING), "#f59e0b");
  assert.equal(mapRegionFeedbackToColor(FORM_STATUS.BAD), "#ef4444");
});

test("NOT_VISIBLE does not map to red", () => {
  assert.notEqual(mapRegionFeedbackToColor(FORM_STATUS.NOT_VISIBLE), "#ef4444");
});
