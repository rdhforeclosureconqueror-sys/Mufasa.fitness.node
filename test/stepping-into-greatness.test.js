"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createGpsProcessor, haversineMeters } = require("../src/stepping/gpsEngine");
const { createCardioSessionEngine } = require("../src/stepping/sessionEngine");
const { createUserStore } = require("../src/repositories/userStore");
const { createSteppingIntoGreatnessService } = require("../src/services/steppingIntoGreatnessService");

const sample = (latitude, longitude, capturedAtMs, extra = {}) => ({ latitude, longitude, capturedAtMs, accuracyMeters: 5, ...extra });

test("haversine and GPS quality count normal movement but not stationary drift", () => {
  assert.ok(haversineMeters(sample(0,0,0), sample(0,.001,1)) > 100);
  const gps = createGpsProcessor("walk");
  gps.add(sample(40, -74, 1_000), { nowMs: 1_000 });
  gps.add(sample(40, -73.99999, 2_000), { nowMs: 2_000 });
  gps.add(sample(40, -73.9999, 5_000), { nowMs: 5_000 });
  assert.ok(gps.summary().distanceMeters > 7 && gps.summary().distanceMeters < 10);
});

test("GPS rejects inaccurate, duplicate, stale, impossible, jump, and paused samples", () => {
  const gps = createGpsProcessor("walk", { staleAfterMs: 1000 });
  assert.equal(gps.add(sample(40,-74,1000,{accuracyMeters: 100}), { nowMs: 1000 }).rejectionReason, "poor_accuracy");
  assert.equal(gps.add(sample(40,-74,1000), { nowMs: 1000 }).rejectionReason, "duplicate_timestamp");
  assert.equal(gps.add(sample(40,-74,2000), { nowMs: 4000 }).rejectionReason, "stale_timestamp");
  gps.add(sample(40,-74,5000), { nowMs: 5000 });
  assert.equal(gps.add(sample(40,-73.999,5100), { nowMs: 5100 }).rejectionReason, "impossible_speed");
  assert.equal(gps.add(sample(41,-73,6000), { nowMs: 6000 }).rejectionReason, "gps_jump");
  assert.equal(gps.add(sample(40,-74,7000), { nowMs: 7000, paused: true }).rejectionReason, "session_paused");
  assert.equal(gps.summary().gpsQuality.suspiciousMovementDetected, true);
});

test("session lifecycle pauses without bridging, stops tracking, and finishes idempotently", async () => {
  let now = 1000, starts = 0, stops = 0;
  const engine = createCardioSessionEngine({ clock: () => now, locationTracker: { requestPermission: async () => {}, start: () => starts++, stop: () => stops++ } });
  await engine.start("walk"); engine.addSample(sample(40,-74,now)); now += 5000; engine.addSample(sample(40,-73.9999,now));
  const beforePause = engine.snapshot().distanceMeters; engine.pause(); now += 10000; engine.resume(); engine.addSample(sample(41,-73,now)); now += 5000; engine.addSample(sample(41,-72.9999,now));
  const complete = engine.finish(); assert.equal(starts, 1); assert.equal(stops, 1); assert.equal(complete.movingTimeMs, 10000); assert.equal(complete.pausedTimeMs, 10000); assert.ok(complete.distanceMeters > beforePause); assert.equal(engine.finish().duplicateFinish, true);
});

test("permission denial enters error and cancel stops GPS", async () => {
  const denied = createCardioSessionEngine({ locationTracker: { requestPermission: async () => { throw new Error("denied"); } } });
  await assert.rejects(denied.start("walk"), /denied/); assert.equal(denied.snapshot().state, "error");
  let stopped = false; const active = createCardioSessionEngine({ locationTracker: { requestPermission: async () => {}, start() {}, stop() { stopped = true; } } }); await active.start("run"); active.cancel(); assert.equal(stopped, true); assert.equal(active.snapshot().state, "cancelled");
});

function fixture() { const root = fs.mkdtempSync(path.join(os.tmpdir(), "greatness-")); const userStore = createUserStore({ userDir: root }); userStore.ensureDirs(); return { userStore, service: createSteppingIntoGreatnessService({ userStore, clock: () => Date.parse("2026-07-28T12:00:00Z") }) }; }
const valid = (overrides = {}) => ({ clientSessionId: "client-1", activityType: "walk", startedAt: "2026-07-28T11:30:00Z", endedAt: "2026-07-28T12:00:00Z", elapsedTimeMs: 1800000, movingTimeMs: 1700000, pausedTimeMs: 100000, distanceMeters: 5000, gpsQuality: { rating: "good", acceptedSamples: 20, rejectedSamples: 1, suspiciousMovementDetected: false }, ...overrides });

test("valid completion awards records, badges and verified contributions idempotently", () => {
  const { service } = fixture(); service.join("maya"); const activity = service.complete("maya", valid()); assert.equal(service.complete("maya", valid()).activityId, activity.activityId);
  const journey = service.journey("maya"); assert.equal(journey.activities.length, 1); assert.equal(journey.lifetimeDistanceMeters, 5000); assert.equal(journey.personalBests.longest_walk.valueMeters, 5000); assert.ok(journey.achievements.some((a) => a.achievementKey === "first_5k")); assert.equal(service.feed("maya")[0].summaryData.distanceMeters, 5000);
});

test("privacy suppresses feed pace and private activity; leaving preserves journey", () => {
  const { service } = fixture(); service.join("maya"); service.complete("maya", valid({ privacy: { activityVisibleToCommunity: true, routeVisible: false, exactStartTimeVisible: false, paceVisible: false } })); const event = service.feed("maya")[0]; assert.equal("averagePaceSecondsPerKilometer" in event.summaryData, false); assert.equal("startedAt" in event.summaryData, false); assert.equal(service.route("maya", event.activityId).visibility, "private"); service.leave("maya"); assert.equal(service.journey("maya").activities.length, 1); assert.throws(() => service.feed("maya"), /Join/);
});

test("invalid and manual-like submissions cannot earn credit and browser steps are rejected", () => {
  const { service, userStore } = fixture(); const activity = service.complete("maya", valid({ gpsQuality: { rating: "poor", acceptedSamples: 1, rejectedSamples: 5, suspiciousMovementDetected: true } })); assert.equal(activity.validation.state, "invalid"); const domain = userStore.loadUser("maya").steppingIntoGreatness; assert.equal(domain.contributions.length, 0); assert.equal(domain.achievements.length, 0); assert.throws(() => service.complete("maya", valid({ clientSessionId: "two", stepCount: 42 })), /step counts/);
});

test("route access is owner scoped by service API", () => {
  const { service } = fixture(); const activity = service.complete("maya", valid()); assert.equal(service.route("maya", activity.activityId).visibility, "private"); assert.throws(() => service.route("other", activity.activityId), /not found/);
});
