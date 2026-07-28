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

const { generateSplits, calculateElevationGain, acceptedPoints } = require("../src/stepping/activityMetrics");
const { MILE_METERS } = require("../src/stepping/domain");
function line(distanceMeters, durationMs=600000) { const degrees=(distanceMeters/6371000)*(180/Math.PI); return [sample(0,0,0,{altitudeMeters:0}),sample(0,degrees,durationMs,{altitudeMeters:10})]; }
test("mile, kilometer, multi and partial splits use exact metre boundaries",()=>{const mile=generateSplits(line(MILE_METERS),MILE_METERS);assert.equal(mile[0].complete,true);assert.ok(Math.abs(mile[0].distanceMeters-MILE_METERS)<.001);const km=generateSplits(line(1000),1000);assert.equal(km[0].complete,true);const multi=generateSplits(line(2500),1000);assert.equal(multi.length,3);assert.deepEqual(multi.map(x=>x.complete),[true,true,false]);});
test("split generation rejects jumps and never completes early",()=>{const points=[...line(900),sample(0,.1,700000,{accepted:false})];assert.equal(generateSplits(points,1000).filter(x=>x.complete).length,0);});
test("elevation accepts ascent but filters noise, missing data and spikes",()=>{const ascent=[0,4,8,12].map((alt,i)=>sample(0,i*.0001,i*10000,{altitudeMeters:alt,altitudeAccuracyMeters:5}));assert.equal(calculateElevationGain(ascent).meters,12);const flat=[0,1,-1,1,0].map((alt,i)=>sample(0,i*.0001,i*10000,{altitudeMeters:alt,altitudeAccuracyMeters:5}));assert.equal(calculateElevationGain(flat).meters,0);assert.equal(calculateElevationGain(line(100).map(x=>({...x,altitudeMeters:undefined}))),undefined);const poor=ascent.map(x=>({...x,altitudeAccuracyMeters:50}));assert.equal(calculateElevationGain(poor),undefined);const spike=[0,4,100,5].map((alt,i)=>sample(0,i*.0001,i*10000,{altitudeMeters:alt,altitudeAccuracyMeters:5}));assert.ok(calculateElevationGain(spike).meters<=5);});
test("route persistence keeps accepted points bounded and private",()=>{const points=Array.from({length:2100},(_,i)=>sample(0,i/1e7,i,{accepted:i!==3}));const kept=acceptedPoints(points);assert.ok(kept.length<=2000);assert.ok(!kept.some(p=>p.capturedAtMs===3));});
test("challenges require enrollment and contributions are idempotent",()=>{const {service}=fixture();service.join("maya");service.enroll("maya","move_10k");service.complete("maya",valid());service.complete("maya",valid());const c=service.challengeList("maya").find(x=>x.challengeId==="move_10k");assert.equal(c.progress,5000);});
test("activity detail and route identifiers remain owner scoped",()=>{const {service}=fixture();const a=service.complete("maya",valid({samples:line(5000)}));assert.equal(service.activity("maya",a.activityId).activityId,a.activityId);assert.throws(()=>service.activity("other",a.activityId),/not found/);assert.throws(()=>service.route("other",a.activityId),/not found/);});
test("all activity types create distinct longest records and equal values do not replace",()=>{const {service}=fixture();for(const [i,type] of ["walk","jog","run","trail_walk","trail_run"].entries())service.complete("maya",valid({clientSessionId:`s${i}`,activityType:type,distanceMeters:5000+i}));const j=service.journey("maya");for(const type of ["walk","jog","run","trail_walk","trail_run"])assert.ok(j.personalBests[`longest_${type}`]);const old=j.personalBests.longest_walk.activityId;service.complete("maya",valid({clientSessionId:"tie",distanceMeters:5000}));assert.equal(service.journey("maya").personalBests.longest_walk.activityId,old);});
test("weekly summary is authenticated by membership and contains verified aggregates",()=>{const {service}=fixture();assert.throws(()=>service.weeklySummary("maya"),/Join/);service.join("maya");service.complete("maya",valid());const s=service.weeklySummary("maya");assert.equal(s.timezone,"UTC");assert.equal(s.verifiedActivities,1);assert.equal(s.verifiedCommunityDistanceMeters,5000);});

test("owner deletion is idempotent, erases route, revokes contributions, and recalculates fallback records",()=>{
  const {service,userStore}=fixture();service.join("maya");service.enroll("maya","move_10k");
  const older=service.complete("maya",valid({clientSessionId:"older",distanceMeters:4000,endedAt:"2026-07-27T12:00:00Z",samples:line(4000)}));
  const best=service.complete("maya",valid({clientSessionId:"best",distanceMeters:6000,samples:line(6000)}));
  assert.equal(service.journey("maya").personalBests.longest_overall_activity.activityId,best.activityId);
  assert.equal(service.challengeList("maya").find(c=>c.challengeId==="move_10k").completed,true);
  assert.equal(service.remove("maya",best.activityId).duplicateDeletion,false);
  assert.equal(service.remove("maya",best.activityId).duplicateDeletion,true);
  const journey=service.journey("maya");assert.deepEqual(journey.activities.map(a=>a.activityId),[older.activityId]);assert.equal(journey.lifetimeDistanceMeters,4000);assert.equal(journey.personalBests.longest_overall_activity.activityId,older.activityId);
  const d=userStore.loadUser("maya").steppingIntoGreatness,deleted=d.activities.find(a=>a.activityId===best.activityId),revoked=d.contributions.find(c=>c.activityId===best.activityId);
  assert.equal(deleted.route.points.length,0);assert.ok(deleted.deletedAt);assert.equal(revoked.revoked,true);assert.equal(revoked.revocationReason,"activity_deleted");assert.ok(revoked.revokedAt);assert.equal(service.challengeList("maya").find(c=>c.challengeId==="move_10k").progress,4000);assert.equal(service.feed("maya").some(e=>e.activityId===best.activityId),false);assert.equal(service.weeklySummary("maya").verifiedCommunityDistanceMeters,4000);
});

test("cross-user deletion and route identifier tampering reveal nothing",()=>{const {service}=fixture();const a=service.complete("maya",valid());assert.throws(()=>service.remove("other",a.activityId),/not found/);assert.throws(()=>service.route("other",a.activityId),/not found/);assert.equal(service.journey("maya").activities.length,1);});

test("invalidation uses reusable idempotent revocation and can revert completion",()=>{const {service,userStore}=fixture();service.enroll("maya","move_10k");const a=service.complete("maya",valid({distanceMeters:11000}));assert.equal(service.challengeList("maya").find(c=>c.challengeId==="move_10k").completed,true);service.setEligibility("maya",a.activityId,{validationState:"questionable",reason:"moderation_questionable"});service.setEligibility("maya",a.activityId,{validationState:"questionable",reason:"moderation_questionable"});const d=userStore.loadUser("maya").steppingIntoGreatness,c=d.contributions.find(x=>x.activityId===a.activityId);assert.equal(c.revoked,true);assert.equal(c.revocationReason,"moderation_questionable");assert.equal(d.contributions.filter(x=>x.activityId===a.activityId).length,1);assert.equal(service.challengeList("maya").find(x=>x.challengeId==="move_10k").progress,0);assert.equal(service.journey("maya").lifetimeDistanceMeters,0);});

test("verification is normalized and client escalation is rejected",()=>{const {service}=fixture();const a=service.complete("maya",valid());assert.equal(a.sourceType,"browser_gps");assert.equal(a.sourceProvider,"browser_geolocation");assert.equal(a.verificationLevel,"verified_gps");assert.equal(a.rankingEligibility,true);assert.equal(a.challengeEligibility,true);assert.equal(a.personalRecordEligibility,true);assert.throws(()=>service.complete("maya",valid({clientSessionId:"attack",verificationLevel:"verified_device"})),/server/);});

test("community settings update current feed visibility and membership remains unique",()=>{const {service,userStore}=fixture();service.join("maya");const a=service.complete("maya",valid({privacy:{activityVisibleToCommunity:true,paceVisible:true,exactStartTimeVisible:true}}));assert.equal(service.feed("maya")[0].activityId,a.activityId);service.updateSettings("maya",{showPace:false,showExactStartTime:false});const event=service.feed("maya")[0];assert.equal("averagePaceSecondsPerKilometer" in event.summaryData,false);assert.equal("startedAt" in event.summaryData,false);service.updateSettings("maya",{showActivities:false});assert.equal(service.feed("maya").length,0);service.leave("maya");assert.equal(service.journey("maya").activities.length,1);service.join("maya");assert.equal(userStore.loadUser("maya").steppingIntoGreatness.memberships.length,1);});

test("manual and estimated verification remain ineligible and challenge rules are declarative",()=>{const { verificationFor, CHALLENGES }=require("../src/services/steppingIntoGreatnessService");assert.equal(verificationFor("manual",null,"valid").personalRecordEligibility,false);assert.equal(verificationFor("estimated",null,"valid").challengeEligibility,false);assert.ok(CHALLENGES.every(c=>Array.isArray(c.allowedVerificationLevels)));});
