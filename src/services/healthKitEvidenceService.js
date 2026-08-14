"use strict";

const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");

const TYPES = new Set(["running", "walking"]);
const MAX_ROUTE_POINTS = 5000;

function finite(value, minimum = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum ? number : null;
}

function normalize(input) {
  const startedAt = new Date(input?.startedAt);
  const endedAt = new Date(input?.endedAt);
  const durationSeconds = finite(input?.durationSeconds);
  const distanceMeters = finite(input?.distanceMeters);
  if (!TYPES.has(input?.workoutType) || !input?.sourceRecordId || !Number.isFinite(startedAt.valueOf()) ||
      !Number.isFinite(endedAt.valueOf()) || endedAt <= startedAt || durationSeconds === null || distanceMeters === null) {
    throw new ApiError("INVALID_HEALTHKIT_EVIDENCE", "HealthKit evidence is incomplete or invalid", 400);
  }
  const route = input.route == null ? null : input.route;
  if (route && (!Array.isArray(route.points) || route.points.length > MAX_ROUTE_POINTS)) {
    throw new ApiError("INVALID_HEALTHKIT_ROUTE", "HealthKit route exceeds the accepted shape or point limit", 400);
  }
  const points = route ? route.points.map(point => { const timestamp = new Date(point.timestamp); return { latitude:finite(point.latitude,-90), longitude:finite(point.longitude,-180), timestamp:Number.isFinite(timestamp.valueOf()) ? timestamp.toISOString() : null }; }).filter(point => point.latitude !== null && point.latitude <= 90 && point.longitude !== null && point.longitude <= 180 && point.timestamp) : null;
  return { workoutType:input.workoutType, sourceRecordId:String(input.sourceRecordId).slice(0,256), startedAt:startedAt.toISOString(), endedAt:endedAt.toISOString(), durationSeconds, distanceMeters, routeAvailable:Boolean(input.routeAvailable), route:route ? { points } : null };
}

function createHealthKitEvidenceService({ userStore, config, clock = () => new Date(), hashSecret = "healthkit-local-evidence" }) {
  function requireEnabled() {
    if (!config.enabled || !config.evidenceIngestionEnabled) throw new ApiError("HEALTHKIT_CAPABILITY_DISABLED", "HealthKit evidence ingestion is disabled", 404);
  }
  const sourceHash = sourceRecordId => crypto.createHmac("sha256", hashSecret).update(sourceRecordId).digest("hex");
  function candidates(workout, activities) {
    const expectedType = workout.workoutType === "running" ? new Set(["run", "jog", "trail_run"]) : new Set(["walk", "trail_walk"]);
    return activities.filter(activity => !activity.deletedAt && expectedType.has(activity.activityType) &&
      Math.abs(Date.parse(activity.startedAt) - Date.parse(workout.startedAt)) <= 120000 &&
      Math.abs(Number(activity.distanceMeters) - workout.distanceMeters) <= Math.max(100, workout.distanceMeters * 0.03));
  }
  function ingest(userId, input) {
    requireEnabled();
    const workout = normalize(input);
    const hash = sourceHash(workout.sourceRecordId);
    let response;
    userStore.updateUser(userId, user => {
      user.healthKitEvidence ||= { schemaVersion:1, records:[] };
      const duplicate = user.healthKitEvidence.records.find(record => record.sourceRecordHash === hash);
      if (duplicate) { response = { ...diagnosticRecord(duplicate), duplicateEvidence:true }; return user; }
      const matches = candidates(workout, user.steppingIntoGreatness?.activities || []);
      const record = { evidenceId:crypto.randomUUID(), sourceRecordHash:hash, workoutType:workout.workoutType, startedAt:workout.startedAt, endedAt:workout.endedAt, durationSeconds:workout.durationSeconds, distanceMeters:workout.distanceMeters, routeAvailable:workout.routeAvailable, route:workout.route, receivedAt:clock().toISOString(), reconciliationVersion:config.reconciliationVersion, reconciliationStatus:matches.length === 1 ? "matched" : matches.length ? "ambiguous" : "unmatched", matchedActivityId:matches.length === 1 ? matches[0].activityId : null };
      user.healthKitEvidence.records.push(record);
      response = { ...diagnosticRecord(record), duplicateEvidence:false };
      return user;
    });
    return response;
  }
  function diagnosticRecord(record) { return { evidenceId:record.evidenceId, reconciliationStatus:record.reconciliationStatus, matchedActivityId:record.matchedActivityId, routeAvailable:record.routeAvailable }; }
  function diagnostic(userId) {
    requireEnabled();
    const records = userStore.loadUser(userId).healthKitEvidence?.records || [];
    return { enabled:true, ingestionEnabled:true, reconciliationVersion:config.reconciliationVersion, evidenceCount:records.length, matchedCount:records.filter(x => x.reconciliationStatus === "matched").length, unmatchedCount:records.filter(x => x.reconciliationStatus === "unmatched").length, ambiguousCount:records.filter(x => x.reconciliationStatus === "ambiguous").length, lastReceivedAt:records.at(-1)?.receivedAt || null };
  }
  return Object.freeze({ ingest, diagnostic });
}

module.exports = { createHealthKitEvidenceService, normalize };
