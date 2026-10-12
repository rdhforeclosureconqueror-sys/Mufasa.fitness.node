"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const TYPES = new Set(["yoga", "meditation", "breathwork", "sound_bath", "wellness"]);
const STATES = new Set(["draft", "confirmed", "cancelled"]);
function createEventCatalog({ filePath, clock = () => Date.now() }) {
  if (!filePath || !path.isAbsolute(filePath)) throw new Error("Absolute event catalog path required");
  function read() {
    if (!fs.existsSync(filePath)) return { schemaVersion: 1, events: [] };
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (data.schemaVersion !== 1 || !Array.isArray(data.events)) throw new Error("Unsupported event catalog");
    return data;
  }
  function save(data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temp = filePath + "." + crypto.randomUUID() + ".tmp";
    try {
      fs.writeFileSync(temp, JSON.stringify(data, null, 2), { flag: "wx", mode: 0o600 });
      fs.renameSync(temp, filePath);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  function validate(input) {
    const title = String(input.title || "").trim();
    const location = String(input.location || "").trim();
    const type = String(input.type || "");
    const startAt = String(input.startAt || "");
    const endAt = String(input.endAt || "");
    const capacity = input.capacity;
    if (!title || title.length > 120 || !location || location.length > 200) throw new Error("Invalid event title or location");
    if (!TYPES.has(type) || !Number.isInteger(capacity) || capacity < 1 || capacity > 10000) throw new Error("Invalid event type or capacity");
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(startAt) || !/(Z|[+-]\d\d:\d\d)$/.test(startAt) || !/(Z|[+-]\d\d:\d\d)$/.test(endAt)) throw new Error("Event times must include timezone offsets");
    if (!Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt)) || Date.parse(endAt) <= Date.parse(startAt)) throw new Error("Invalid event time range");
    return { title, location, type, startAt, endAt, capacity };
  }
  function list({ publicOnly = false } = {}) {
    return read().events.filter(e => !publicOnly || (e.status === "confirmed" && Date.parse(e.endAt) > clock())).map(e => ({ ...e }));
  }
  function create(input, actorId) {
    if (!actorId) throw new Error("Actor required");
    const fields = validate(input);
    const data = read();
    const event = { eventId: "evt_" + crypto.randomUUID(), ...fields, status: "draft", createdBy: String(actorId), createdAt: new Date(clock()).toISOString(), updatedAt: new Date(clock()).toISOString() };
    data.events.push(event); save(data); return { ...event };
  }
  function update(eventId, patch, actorId) {
    if (!actorId) throw new Error("Actor required");
    const data = read(), index = data.events.findIndex(e => e.eventId === eventId);
    if (index < 0) throw new Error("Event not found");
    const old = data.events[index];
    const status = patch.status === undefined ? old.status : patch.status;
    if (!STATES.has(status)) throw new Error("Invalid event status");
    if (old.status === "cancelled" && status !== "cancelled") throw new Error("Cancelled events cannot be reopened");
    const fields = validate({ ...old, ...patch });
    if (status === "confirmed" && Date.parse(fields.startAt) <= clock()) throw new Error("Cannot publish past event");
    const next = { ...old, ...fields, status, updatedAt: new Date(clock()).toISOString(), updatedBy: String(actorId) };
    data.events[index] = next; save(data); return { ...next };
  }
  return { list, create, update };
}
module.exports = { createEventCatalog };
