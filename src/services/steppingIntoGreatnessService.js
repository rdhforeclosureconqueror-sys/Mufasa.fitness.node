"use strict";

const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");
const { ACTIVITY_TYPES, ACTIVE_CHALLENGE_METRICS, DEFAULT_PRIVACY, BADGES } = require("../stepping/domain");

const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const iso = (value = Date.now()) => new Date(value).toISOString();

function ensureDomain(user) {
  user.steppingIntoGreatness ||= { schemaVersion: 1, activities: [], achievements: [], personalBests: {}, memberships: [], feedEvents: [], contributions: [] };
  return user.steppingIntoGreatness;
}

function validateCompletion(input) {
  const reasons = [];
  if ((input.gpsQuality?.acceptedSamples || 0) < 2) reasons.push("insufficient_accepted_points");
  if (input.gpsQuality?.suspiciousMovementDetected) reasons.push("suspicious_movement");
  if (["poor", "unavailable"].includes(input.gpsQuality?.rating)) reasons.push("poor_gps_quality");
  if (!Number.isFinite(input.distanceMeters) || input.distanceMeters < 0) reasons.push("invalid_distance");
  const state = reasons.includes("invalid_distance") || reasons.includes("insufficient_accepted_points") ? "invalid" : reasons.length ? "questionable" : "valid";
  const eligible = state === "valid" && input.sourceType === "sig_gps";
  return { state, reasons, challengeEligible: eligible, personalBestEligible: eligible, rankingEligible: eligible };
}

function createSteppingIntoGreatnessService({ userStore, clock = () => Date.now() }) {
  function membership(userId) { const domain = ensureDomain(userStore.loadUser(userId)); return domain.memberships.find((m) => m.communityId === "greatness_movement" && m.status === "active") || null; }
  function join(userId, preferences = {}) {
    let result; userStore.updateUser(userId, (user) => { const domain = ensureDomain(user); let member = domain.memberships.find((m) => m.communityId === "greatness_movement"); const visibilityPreferences = { showActivities: true, showBadges: true, showPersonalRecords: true, showLifetimeDistance: true, ...preferences }; if (member) Object.assign(member, { status: "active", visibilityPreferences }); else { member = { membershipId: id("membership"), communityId: "greatness_movement", userId, status: "active", joinedAt: iso(clock()), visibilityPreferences }; domain.memberships.push(member); } result = member; return user; }); return result;
  }
  function leave(userId) { let result; userStore.updateUser(userId, (user) => { const domain = ensureDomain(user); result = domain.memberships.find((m) => m.communityId === "greatness_movement"); if (!result) throw new ApiError("MEMBERSHIP_NOT_FOUND", "Community membership not found", 404); result.status = "left"; result.leftAt = iso(clock()); return user; }); return result; }
  function complete(userId, input) {
    if (!ACTIVITY_TYPES.includes(input?.activityType)) throw new ApiError("INVALID_ACTIVITY_TYPE", "Choose walk, jog, run, trail walk, or trail run", 400);
    if (input.stepCount != null) throw new ApiError("UNTRUSTED_STEP_COUNT", "Browser GPS activities cannot submit step counts", 400);
    let result; userStore.updateUser(userId, (user) => {
      const domain = ensureDomain(user); if (input.clientSessionId && domain.activities.some((a) => a.clientSessionId === input.clientSessionId)) { result = domain.activities.find((a) => a.clientSessionId === input.clientSessionId); return user; }
      const now = iso(clock()); const validation = validateCompletion({ ...input, sourceType: "sig_gps" }); const privacy = { ...DEFAULT_PRIVACY, ...(input.privacy || {}) }; const member = domain.memberships.find((m) => m.status === "active" && m.communityId === "greatness_movement");
      const activity = { activityId: id("activity"), clientSessionId: input.clientSessionId || null, userId, activityType: input.activityType, status: validation.state === "invalid" ? "invalid" : "completed", sourceType: "sig_gps", startedAt: iso(input.startedAt), endedAt: iso(input.endedAt), elapsedTimeMs: Math.max(0, Number(input.elapsedTimeMs) || 0), movingTimeMs: Math.max(0, Number(input.movingTimeMs) || 0), pausedTimeMs: Math.max(0, Number(input.pausedTimeMs) || 0), distanceMeters: Math.max(0, Number(input.distanceMeters) || 0), elevationGainMeters: Number.isFinite(input.elevationGainMeters) ? Math.max(0, input.elevationGainMeters) : undefined, averagePaceSecondsPerKilometer: input.distanceMeters > 0 ? (Number(input.movingTimeMs) / 1000) / (input.distanceMeters / 1000) : undefined, splits: Array.isArray(input.splits) ? input.splits : [], route: { acceptedPointCount: input.gpsQuality?.acceptedSamples || 0, rejectedPointCount: input.gpsQuality?.rejectedSamples || 0, visibility: privacy.routeVisible ? "self" : "private" }, gpsQuality: input.gpsQuality || { rating: "unavailable", acceptedSamples: 0, rejectedSamples: 0, suspiciousMovementDetected: false }, verificationLevel: "recorded", validation, privacy, challengeContributionIds: [], achievementIds: [], schemaVersion: 1, createdAt: now, updatedAt: now };
      domain.activities.push(activity);
      if (validation.personalBestEligible) {
        const category = ["walk", "trail_walk"].includes(activity.activityType) ? "longest_walk" : "longest_run"; const old = domain.personalBests[category];
        if (!old || activity.distanceMeters > old.valueMeters) domain.personalBests[category] = { category, activityId: activity.activityId, valueMeters: activity.distanceMeters, earnedAt: now };
      }
      if (validation.challengeEligible) for (const metric of ACTIVE_CHALLENGE_METRICS) { if (metric === "community_distance" && !member) continue; const amount = metric.includes("distance") ? activity.distanceMeters : metric === "duration" ? activity.movingTimeMs : 1; const contribution = { contributionId: id("contribution"), activityId: activity.activityId, challengeId: `phase1_${metric}`, metric, amount, source: "sig_gps", verificationStatus: "recorded", createdAt: now, revoked: false }; domain.contributions.push(contribution); activity.challengeContributionIds.push(contribution.contributionId); }
      if (validation.personalBestEligible) {
        const eligibleActivities = domain.activities.filter((a) => a.validation.personalBestEligible); const lifetime = eligibleActivities.reduce((sum, a) => sum + a.distanceMeters, 0); const values = { activity_count: eligibleActivities.length, walk_count: eligibleActivities.filter((a) => ["walk","trail_walk"].includes(a.activityType)).length, run_count: eligibleActivities.filter((a) => ["run","jog","trail_run"].includes(a.activityType)).length, trail_count: eligibleActivities.filter((a) => a.activityType.startsWith("trail")).length, single_distance: activity.distanceMeters, lifetime_distance: lifetime };
        for (const badge of BADGES) if ((values[badge.metric] || 0) >= badge.threshold && !domain.achievements.some((a) => a.achievementKey === badge.achievementKey)) { const award = { achievementId: id("achievement"), achievementKey: badge.achievementKey, name: badge.name, activityId: activity.activityId, earnedAt: now }; domain.achievements.push(award); activity.achievementIds.push(award.achievementId); }
      }
      if (member && privacy.activityVisibleToCommunity && member.visibilityPreferences.showActivities) domain.feedEvents.push({ eventId: id("event"), communityId: "greatness_movement", userId, activityId: activity.activityId, eventType: "activity_completed", summaryData: { activityType: activity.activityType, distanceMeters: activity.distanceMeters, durationMs: activity.movingTimeMs, ...(privacy.paceVisible ? { averagePaceSecondsPerKilometer: activity.averagePaceSecondsPerKilometer } : {}) }, visibility: "community", createdAt: now });
      result = activity; return user;
    }); return result;
  }
  function journey(userId) { const domain = ensureDomain(userStore.loadUser(userId)); const activities = domain.activities.map((a) => ({ ...a, route: { ...a.route } })); return { activities, personalBests: domain.personalBests, achievements: domain.achievements, lifetimeDistanceMeters: activities.filter((a) => a.validation.personalBestEligible).reduce((sum, a) => sum + a.distanceMeters, 0) }; }
  function feed(userId) { if (!membership(userId)) throw new ApiError("COMMUNITY_MEMBERSHIP_REQUIRED", "Join The Greatness Movement to view the Movement Feed", 403); return userStore.listUsers().flatMap((u) => ensureDomain(u).feedEvents).filter((e) => e.visibility === "community").sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50); }
  function route(userId, activityId) { const activity = ensureDomain(userStore.loadUser(userId)).activities.find((a) => a.activityId === activityId); if (!activity) throw new ApiError("ACTIVITY_NOT_FOUND", "Activity not found", 404); return activity.route; }
  return { join, leave, membership, complete, journey, feed, route, validateCompletion };
}

module.exports = { createSteppingIntoGreatnessService, validateCompletion, ensureDomain };
