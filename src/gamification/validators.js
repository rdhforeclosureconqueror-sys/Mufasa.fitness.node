"use strict";

const { getEventContract } = require("./eventTypes");

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,255}$/;
const EVENT_ID = /^evt_[a-f0-9-]{16,64}$/;
const VERIFICATION_STATUSES = new Set(["verified", "provisional", "rejected", "revoked"]);
const VERIFICATION_METHODS = new Set(["authoritative-write", "device-assisted", "provider-verified", "moderator-approved", "derived"]);

class EventValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EventValidationError";
    this.code = code;
  }
}

function invalid(code, message) { throw new EventValidationError(code, message); }
function validDate(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }

function validatePayload(payload, specification) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) invalid("INVALID_PAYLOAD", "payload must be an object");
  const keys = Object.keys(payload);
  if (keys.length !== Object.keys(specification).length || keys.some((key) => !specification[key])) {
    invalid("UNSAFE_PAYLOAD", "payload fields do not match the registered allow-list");
  }
  const clean = {};
  for (const [key, rule] of Object.entries(specification)) {
    const value = payload[key];
    if (rule.type === "boolean" && typeof value !== "boolean") invalid("INVALID_PAYLOAD", `${key} must be boolean`);
    if (rule.type === "enum" && !rule.values.includes(value)) invalid("INVALID_PAYLOAD", `${key} is outside its allowed values`);
    if (rule.type === "event_id" && !EVENT_ID.test(value || "")) invalid("INVALID_PAYLOAD", `${key} must be an event ID`);
    clean[key] = value;
  }
  if (Buffer.byteLength(JSON.stringify(clean), "utf8") > 2048) invalid("PAYLOAD_TOO_LARGE", "payload exceeds 2048 bytes");
  return Object.freeze(clean);
}

function validateEvent(input, { now = Date.now() } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("INVALID_EVENT", "event must be an object");
  const contract = getEventContract(input.eventType, input.schemaVersion);
  if (!contract) invalid("UNKNOWN_EVENT_CONTRACT", "event type and schema version are not registered");
  if (!EVENT_ID.test(input.eventId || "")) invalid("INVALID_EVENT_ID", "eventId is invalid");
  if (!validDate(input.occurredAt) || !validDate(input.recordedAt)) invalid("INVALID_TIMESTAMP", "timestamps must be canonical ISO dates");
  if (Date.parse(input.occurredAt) > now + 5 * 60 * 1000) invalid("FUTURE_EVENT", "occurredAt exceeds the allowed future skew");
  for (const field of ["actorUserId", "subjectUserId", "idempotencyKey", "correlationId"]) {
    if (!ID.test(input[field] || "")) invalid("INVALID_IDENTIFIER", `${field} is invalid`);
  }
  if (!contract.sources.includes(input.source)) invalid("INVALID_SOURCE", "source is not registered for this event");
  const entity = input.sourceEntity;
  if (!entity || !ID.test(entity.type || "") || !ID.test(entity.id || "") || !Number.isSafeInteger(entity.version) || entity.version < 1) {
    invalid("INVALID_SOURCE_ENTITY", "sourceEntity is invalid");
  }
  const verification = input.verification;
  if (!verification || !VERIFICATION_STATUSES.has(verification.status) || !VERIFICATION_METHODS.has(verification.method) || !Array.isArray(verification.riskFlags) || verification.riskFlags.some((flag) => !ID.test(flag))) {
    invalid("INVALID_VERIFICATION", "verification is invalid");
  }
  if (input.causationEventId !== null && !EVENT_ID.test(input.causationEventId || "")) invalid("INVALID_CAUSATION", "causationEventId is invalid");
  return Object.freeze({
    eventId: input.eventId, eventType: input.eventType, schemaVersion: input.schemaVersion,
    occurredAt: input.occurredAt, recordedAt: input.recordedAt,
    actorUserId: input.actorUserId, subjectUserId: input.subjectUserId, source: input.source,
    sourceEntity: Object.freeze({ type: entity.type, id: entity.id, version: entity.version }),
    idempotencyKey: input.idempotencyKey, correlationId: input.correlationId,
    causationEventId: input.causationEventId,
    verification: Object.freeze({ status: verification.status, method: verification.method, riskFlags: Object.freeze([...verification.riskFlags]) }),
    payload: validatePayload(input.payload, contract.payload)
  });
}

module.exports = { EventValidationError, validateEvent };
