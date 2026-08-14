"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createUserStore } = require("../src/repositories/userStore");
const { createHealthKitEvidenceService } = require("../src/services/healthKitEvidenceService");

test("iOS diagnostic is redacted and the target remains read-only", () => {
  const root = path.join(__dirname, "..", "ios", "GreatnessHealthKitApp", "Sources");
  const bridge = fs.readFileSync(path.join(root, "HealthKitBridge.swift"), "utf8");
  const entitlements = fs.readFileSync(path.join(root, "GreatnessHealthKitApp.entitlements"), "utf8");
  assert.doesNotMatch(bridge, /latitude|longitude|HKWorkoutRouteQuery/);
  assert.match(bridge, /recentWorkoutCount/);
  assert.match(bridge, /routeAvailable/);
  assert.doesNotMatch(bridge, /toShare:\s*\[[^\]]+\]/);
  assert.match(entitlements, /com\.apple\.developer\.healthkit/);
  assert.doesNotMatch(entitlements, /access|healthkit\.background-delivery/);
});

function fixture(enabled = true, evidenceIngestionEnabled = enabled) {
  const userStore = createUserStore({ userDir:fs.mkdtempSync(path.join(os.tmpdir(), "healthkit-")) });
  userStore.ensureDirs();
  const service = createHealthKitEvidenceService({ userStore, config:{ enabled, evidenceIngestionEnabled, reconciliationVersion:"healthkit-browser-v1" }, clock:() => new Date("2026-08-14T13:00:00Z"), hashSecret:"test-secret" });
  return { userStore, service };
}
const evidence = { sourceRecordId:"apple-workout-1",workoutType:"running",startedAt:"2026-08-14T12:00:00Z",endedAt:"2026-08-14T12:30:00Z",durationSeconds:1800,distanceMeters:5000,routeAvailable:false };

test("disabled HealthKit capability is a closed optional layer", () => {
  assert.throws(() => fixture(false).service.ingest("member", evidence), error => error.code === "HEALTHKIT_CAPABILITY_DISABLED" && error.status === 404);
});

test("disabled HealthKit ingestion is distinguishable from the disabled capability", () => {
  assert.throws(() => fixture(true, false).service.ingest("member", evidence), error => error.code === "HEALTHKIT_INGESTION_DISABLED" && error.status === 404);
});

test("evidence reconciles to an existing browser activity without creating or mutating it", () => {
  const { userStore, service } = fixture();
  const user = userStore.loadUser("member");
  user.steppingIntoGreatness = { activities:[{ activityId:"browser-activity",activityType:"run",status:"completed",startedAt:"2026-08-14T12:00:30Z",endedAt:"2026-08-14T12:30:00Z",distanceMeters:5020,validation:{state:"valid"},achievementIds:["first_run"] }] };
  userStore.saveUser(user);
  const before = structuredClone(user.steppingIntoGreatness.activities[0]);
  const result = service.ingest("member", evidence);
  assert.deepEqual(result, { evidenceId:result.evidenceId,reconciliationStatus:"matched",matchedActivityId:"browser-activity",routeAvailable:false,duplicateEvidence:false });
  assert.deepEqual(userStore.loadUser("member").steppingIntoGreatness.activities, [before]);
  assert.equal(userStore.loadUser("member").healthKitEvidence.records.length, 1);
});

test("repeated provider evidence is idempotent and never becomes another activity or reward", () => {
  const { userStore, service } = fixture();
  const first = service.ingest("member", evidence);
  const second = service.ingest("member", evidence);
  const user = userStore.loadUser("member");
  assert.equal(second.evidenceId, first.evidenceId);
  assert.equal(second.duplicateEvidence, true);
  assert.equal(user.healthKitEvidence.records.length, 1);
  assert.equal(user.steppingIntoGreatness, undefined);
  assert.equal(user.gamification, undefined);
});

test("private diagnostic contains counts but no HealthKit identifiers, timing, distance, or route", () => {
  const { service } = fixture();
  service.ingest("member", { ...evidence, routeAvailable:true, route:{points:[{latitude:40,longitude:-75,timestamp:"2026-08-14T12:01:00Z"}]} });
  const diagnostic = service.diagnostic("member");
  assert.deepEqual(Object.keys(diagnostic), ["enabled","ingestionEnabled","reconciliationVersion","evidenceCount","matchedCount","unmatchedCount","ambiguousCount","lastReceivedAt"]);
  assert.doesNotMatch(JSON.stringify(diagnostic), /apple-workout|latitude|distanceMeters|route/);
});
