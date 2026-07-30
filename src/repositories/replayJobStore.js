"use strict";

const fs = require("fs");
const path = require("path");

function createReplayJobStore({ filePath }) {
  function empty() { return { schemaVersion: 1, jobs: [], history: [], schedules: [] }; }
  function read() {
    if (!fs.existsSync(filePath)) return empty();
    const state = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (state?.schemaVersion !== 1 || !Array.isArray(state.jobs) || !Array.isArray(state.history) || !Array.isArray(state.schedules)) throw new Error("invalid replay job store");
    return state;
  }
  function write(state) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state));
    fs.renameSync(temp, filePath);
  }
  function update(mutator) { const state = read(); const result = mutator(state); write(state); return result; }
  return Object.freeze({ read: () => structuredClone(read()), update });
}

module.exports = { createReplayJobStore };
