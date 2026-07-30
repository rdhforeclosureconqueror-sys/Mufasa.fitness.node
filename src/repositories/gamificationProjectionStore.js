"use strict";

const fs = require("fs");
const path = require("path");

function createGamificationProjectionStore({ filePath }) {
  function replace(projections) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ schemaVersion: 1, projections }));
    fs.renameSync(temp, filePath);
  }
  function readAll() {
    if (!fs.existsSync(filePath)) return {};
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (value?.schemaVersion !== 1 || !value.projections || typeof value.projections !== "object") throw new Error("invalid gamification projection store");
    return structuredClone(value.projections);
  }
  function read(userId) { return readAll()[userId] || null; }
  function removeUser(userId) {
    const projections = readAll();
    const existed = Object.prototype.hasOwnProperty.call(projections, userId);
    delete projections[userId];
    replace(projections);
    return existed;
  }
  function remove() { if (fs.existsSync(filePath)) fs.rmSync(filePath); }
  return Object.freeze({ replace, readAll, read, removeUser, remove });
}

module.exports = { createGamificationProjectionStore };
