"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const profile = require("../src/ai/personalities/mufasa-wellness.draft.json");

test("Mufasa wellness personality is approved but still controlled by the runtime flag", () => {
  assert.equal(profile.id, "mufasa-wellness-coach");
  assert.equal(profile.status, "approved");
  assert.equal(profile.enabled, true);
  assert.equal(profile.approvalRequired, false);
});

test("default humor is explicit and remains sensitive to member context", () => {
  assert.equal(profile.traits.humor, 80);
  assert.match(profile.voice.defaultHumorPolicy, /ON by default/);
  assert.match(profile.voice.humor, /skip jokes when/);
  assert.match(profile.voice.humor, /never mimic/);
});

test("safety, member facts, and self-mastery principles remain intact", () => {
  assert.match(profile.safety.existingCoachBehavior, /Preserve all existing coach safety/);
  assert.match(profile.safety.platformFacts, /Never fabricate/);
  assert.ok(profile.values.some(v => /Compete with your past self/.test(v)));
  assert.ok(profile.values.some(v => /Try, fail, learn, repeat/.test(v)));
});
