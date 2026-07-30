"use strict";

const EVENT_TYPES = Object.freeze({
  "workout.completed": Object.freeze({
    schemaVersion: 1,
    sources: Object.freeze(["session-service"]),
    payload: Object.freeze({
      durationBand: Object.freeze({ type: "enum", values: ["under_5_min", "5_to_19_min", "20_to_44_min", "45_to_89_min", "90_min_or_more"] }),
      exerciseCountBand: Object.freeze({ type: "enum", values: ["none", "one", "two_to_four", "five_or_more"] }),
      generated: Object.freeze({ type: "boolean" })
    })
  }),
  "workout.revoked": Object.freeze({
    schemaVersion: 1,
    sources: Object.freeze(["gamification-system"]),
    payload: Object.freeze({
      originalEventId: Object.freeze({ type: "event_id" }),
      reasonCode: Object.freeze({ type: "enum", values: ["source_invalidated", "confirmed_abuse", "rule_defect", "approved_moderation"] })
    })
  })
});

function getEventContract(eventType, schemaVersion) {
  const contract = EVENT_TYPES[eventType];
  return contract && contract.schemaVersion === schemaVersion ? contract : null;
}

module.exports = { EVENT_TYPES, getEventContract };
