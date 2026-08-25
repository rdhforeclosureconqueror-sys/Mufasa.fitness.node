"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const registry = require("../public/motion/registry/motion-registry");

function data() { return JSON.parse(JSON.stringify(registry._data)); }

test("versioned registry data and JSON schemas validate", () => {
  assert.deepEqual(registry.validation, { valid: true, errors: [] });
  for (const name of ["exercise-motion-index", "motion-record", "fixture-record", "avatar-profile", "skeleton-profile"]) {
    const schema = JSON.parse(fs.readFileSync(path.join(__dirname, `../schemas/motion/${name}.schema.json`)));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.ok(schema.required.includes("schemaVersion"));
    assert.ok(schema.required.includes("records"));
  }
});

test("push-up resolves through exercise, motion, fixture, avatar, and skeleton records", () => {
  const resolved = registry.resolveExerciseMotion("push-up");
  assert.equal(resolved.motion.motionId, "push_up/avaturn_native_v1");
  assert.equal(resolved.fixture.fixtureId, "avaturn-push-up-animation");
  assert.equal(resolved.avatar.avatarProfileId, "avaturn-personalized-candidate");
  assert.equal(resolved.avatar.skeletonProfileId, "avaturn-native-v1");
  assert.equal(resolved.skeleton.skeletonProfileId, "avaturn-native-v1");
  assert.deepEqual([resolved.fixture.expectedTrackCount, resolved.fixture.expectedBoundTrackCount, resolved.fixture.expectedUnboundTrackCount], [40, 40, 0]);
  assert.equal(resolved.fixture.fileSizeBytes, 52232);
  assert.equal(resolved.fixture.sha256, "046034dd86350c4962ede767c2483e6c68d87b8115ccda5a9e26d4483615205f");
});

test("development-only Phase E records prove multi-record resolution without product exposure", () => {
  const resolved = registry.resolveExerciseMotion("phase-e-dance-development");
  assert.equal(resolved.motion.motionId, "phase_e/dance_fixture_v1");
  assert.equal(resolved.fixture.fixtureId, "phase-e-animation-fixture");
  assert.equal(resolved.exercise.audience, "development");
  assert.equal(resolved.avatar.productEligible, false);
});

test("resolver returns safe copies and deterministic records", () => {
  const first = registry.resolveExercise("push-up");
  first.cameraPreset = "changed";
  assert.equal(registry.resolveExercise("push-up").cameraPreset, "exercise-side");
});

test("unknown IDs and incompatible profiles fail closed", () => {
  assert.throws(() => registry.resolveMotion("missing"), { code: "unknown_motion" });
  assert.throws(() => registry.resolveFixture({ motionId: "push_up/avaturn_native_v1", skeletonProfileId: "missing", avatarProfileId: "avaturn-personalized-candidate" }), { code: "unknown_fixture" });
  assert.throws(() => registry.resolveFixture({ motionId: "push_up/avaturn_native_v1", skeletonProfileId: "avaturn-native-v1", avatarProfileId: "phase-e-reference" }), { code: "incompatible_pairing" });
  assert.throws(() => registry.resolveFixture({ motionId: "push_up/avaturn_native_v1", skeletonProfileId: "avaturn-native-v1", avatarProfileId: "avaturn-personalized-candidate", fixtureId: "missing" }), { code: "unknown_fixture" });
});

test("duplicate IDs and broken cross-references fail registry validation", () => {
  const duplicate = data(); duplicate.motions.records.push({...duplicate.motions.records[0]});
  assert.equal(registry.validateRegistry(duplicate).valid, false);
  assert.match(registry.validateRegistry(duplicate).errors.join(" "), /duplicate/);
  const broken = data(); broken.fixtures.records[0].motionId = "missing";
  assert.equal(registry.validateRegistry(broken).valid, false);
  assert.match(registry.validateRegistry(broken).errors.join(" "), /reference/);
});

test("ProductMotionPreview owns no push-up singleton registry record", () => {
  const source = fs.readFileSync(path.join(__dirname, "../public/motion/product-motion-preview.js"), "utf8");
  assert.doesNotMatch(source, /PRODUCT_(?:AVATAR|FIXTURE)_RECORD|push_up\/avaturn_native_v1|avaturn-push-up-animation/);
});
