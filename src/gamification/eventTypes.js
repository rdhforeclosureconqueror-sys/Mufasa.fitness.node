"use strict";

const EVENT_TYPES = Object.freeze({
  ...Object.fromEntries(["program.started","program.completed","week.completed","mesocycle.completed","deload.completed","program.milestone"].map(type=>[type,Object.freeze({schemaVersion:1,sources:Object.freeze(["program-engine"]),payload:Object.freeze({})})])),
  "yoga.session.completed": Object.freeze({
    schemaVersion: 1,
    sources: Object.freeze(["yoga-service"]),
    payload: Object.freeze({
      scoreBand: Object.freeze({ type: "enum", values: ["developing", "steady", "strong"] }),
      poseCountBand: Object.freeze({ type: "enum", values: ["one", "two_to_four", "five_or_more"] }),
      cameraAssisted: Object.freeze({ type: "boolean" })
    })
  }),
  "workout.completed": Object.freeze({
    schemaVersion: 1,
    sources: Object.freeze(["session-service"]),
    payload: Object.freeze({
      durationBand: Object.freeze({ type: "enum", values: ["under_5_min", "5_to_19_min", "20_to_44_min", "45_to_89_min", "90_min_or_more"] }),
      exerciseCountBand: Object.freeze({ type: "enum", values: ["none", "one", "two_to_four", "five_or_more"] }),
      generated: Object.freeze({ type: "boolean" })
    })
  }),
  "commitment.comeback.completed": Object.freeze({ schemaVersion:1, sources:Object.freeze(["challenge-commitment-service"]), payload:Object.freeze({ weekNumber:Object.freeze({type:"number",minimum:1}) }) }),
  "workout.revoked": Object.freeze({
    schemaVersion: 1,
    sources: Object.freeze(["gamification-system"]),
    payload: Object.freeze({
      originalEventId: Object.freeze({ type: "event_id" }),
      reasonCode: Object.freeze({ type: "enum", values: ["source_invalidated", "confirmed_abuse", "rule_defect", "approved_moderation"] })
    })
  }),
  "greatness.activity.completed": Object.freeze({ schemaVersion: 1, sources: Object.freeze(["greatness-service"]), payload: Object.freeze({ activityType: Object.freeze({ type: "enum", values: ["walk", "jog", "run", "trail_walk", "trail_run"] }), goalCompleted: Object.freeze({ type: "boolean" }), distanceMeters:Object.freeze({type:"number",minimum:0}), trailId:Object.freeze({type:"string"}) }) }),
  "greatness.challenge.completed": Object.freeze({ schemaVersion: 1, sources: Object.freeze(["greatness-service"]), payload: Object.freeze({ challengeId: Object.freeze({ type: "enum", values: ["move_10k", "three_active_days", "community_100k"] }) }) }),
  "greatness.trail_photo.approved": Object.freeze({schemaVersion:1,sources:Object.freeze(["greatness-service"]),payload:Object.freeze({trailId:Object.freeze({type:"string"})})}),
  "pushup.session.completed": Object.freeze({ schemaVersion: 1, sources: Object.freeze(["pushup-challenge-service"]), payload: Object.freeze({ scoreBand: Object.freeze({ type: "enum", values: ["zero", "one_to_nine", "ten_or_more"] }), leaderboardEligible: Object.freeze({ type: "boolean" }) }) }),
  "pushup.milestone.completed": Object.freeze({ schemaVersion: 1, sources: Object.freeze(["pushup-challenge-service"]), payload: Object.freeze({ milestone: Object.freeze({ type: "enum", values: ["first_verified_session"] }) }) })
});

function getEventContract(eventType, schemaVersion) {
  const contract = EVENT_TYPES[eventType];
  return contract && contract.schemaVersion === schemaVersion ? contract : null;
}

module.exports = { EVENT_TYPES, getEventContract };
