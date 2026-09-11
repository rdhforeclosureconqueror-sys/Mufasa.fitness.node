"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createUserStore } = require("../src/repositories/userStore");
const { createGymMappingBridge, REQUIRED_CANONICAL_JOINTS } = require("../src/world/gymMappingBridge");
const { createWorldBridge, EXPERIENCE } = require("../src/world/worldBridge");

function completeProfile() {
  const canonicalMap = {};
  for (const joint of REQUIRED_CANONICAL_JOINTS) canonicalMap[joint] = joint;
  return {
    schemaVersion: 1,
    profileId: "personalized-gym-map-v1",
    avatarId: "personalized",
    skeletonProfile: "avaturn",
    canonicalMap,
    restPoseValid: true,
    embeddedAnimations: [{ name: "avaturn_animation", embedded: true, stackingRisk: true, policy: "disable-before-pocketpt-custom-motion" }]
  };
}

function tempStore() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pocketpt-gym-map-"));
  const store = createUserStore({ userDir: path.join(root, "users") });
  store.ensureDirs();
  return { root, store };
}

test("validated 20/20 mapping persists on the member record", () => {
  const { root, store } = tempStore();
  try {
    const bridge = createGymMappingBridge({ userStore: store, now: () => new Date("2026-09-11T20:00:00.000Z") });
    const saved = bridge.save("member_1", completeProfile());
    assert.equal(saved.restPoseValid, true);
    assert.equal(Object.keys(saved.canonicalMap).length, 20);
    assert.equal(saved.validationStatus, "member-validated");
    assert.equal(bridge.read("member_1").profileId, "personalized-gym-map-v1");
    assert.equal(store.loadUser("member_1").gymMappingProfile.savedAt, "2026-09-11T20:00:00.000Z");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("server rejects incomplete or unvalidated mapping profiles", () => {
  const { root, store } = tempStore();
  try {
    const bridge = createGymMappingBridge({ userStore: store });
    const noRest = completeProfile();
    noRest.restPoseValid = false;
    assert.throws(() => bridge.save("member_1", noRest), /Rest pose/i);

    const incomplete = completeProfile();
    delete incomplete.canonicalMap.LeftHand;
    assert.throws(() => bridge.save("member_1", incomplete), /LeftHand/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Godot bootstrap carries the saved gym mapping profile", () => {
  const { root, store } = tempStore();
  try {
    const gymMappingBridge = createGymMappingBridge({ userStore: store });
    gymMappingBridge.save("member_1", completeProfile());
    const world = createWorldBridge({ gymMappingBridge });
    const bootstrap = world.bootstrap({
      sessionId: "session-1",
      userId: "member_1",
      displayName: "Member",
      expiresAt: Date.now() + 60_000,
      experience: EXPERIENCE
    });
    assert.equal(bootstrap.gymMappingState.status, "AVAILABLE");
    assert.equal(bootstrap.gymMappingProfile.profileId, "personalized-gym-map-v1");
    assert.equal(Object.keys(bootstrap.gymMappingProfile.canonicalMap).length, 20);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Motion Lab save path syncs local profile to authenticated backend", () => {
  const compatibility = fs.readFileSync(path.join(__dirname, "..", "public", "motion", "motion-lab-gym-compatibility.js"), "utf8");
  const panel = fs.readFileSync(path.join(__dirname, "..", "public", "motion", "motion-lab-gym-compatibility-panel.js"), "utf8");
  assert.match(compatibility, /\/api\/me\/gym-mapping-profile/);
  assert.match(compatibility, /saveProfileEverywhere/);
  assert.match(compatibility, /authorization:\s*`Bearer/);
  assert.match(panel, /saveProfileEverywhere/);
  assert.match(panel, /Save \+ Sync Mapping/);
});
