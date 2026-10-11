"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createEventCheckinStore } = require("../src/services/eventCheckinStore");
test("exports guest check-in store", () => {
  assert.equal(typeof createEventCheckinStore, "function");
});
