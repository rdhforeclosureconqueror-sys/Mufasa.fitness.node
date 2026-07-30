"use strict";

const fs = require("fs");
const path = require("path");

function createGamificationAwardStore({ filePath }) {
  let state = load();

  function load() {
    if (!fs.existsSync(filePath)) return { schemaVersion: 1, records: [] };
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (value?.schemaVersion !== 1 || !Array.isArray(value.records)) throw new Error("invalid gamification award store");
    return value;
  }
  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state));
    fs.renameSync(temp, filePath);
  }
  function append(record) {
    const existing = state.records.find((item) => item.recordKey === record.recordKey);
    if (existing) return { status: "duplicate", record: structuredClone(existing) };
    state = { ...state, records: [...state.records, structuredClone(record)] };
    persist();
    return { status: "recorded", record: structuredClone(record) };
  }
  function all() { return structuredClone(state.records); }

  return Object.freeze({ append, all });
}

module.exports = { createGamificationAwardStore };
