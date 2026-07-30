"use strict";

const fs = require("fs");
const path = require("path");

function createGamificationLedgerStore({ filePath }) {
  let entries = load();
  function load() {
    if (!fs.existsSync(filePath)) return [];
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(value) || value.some((entry) => !Number.isSafeInteger(entry.delta))) throw new Error("invalid gamification ledger store");
    return value;
  }
  function append(entry) {
    const existing = entries.find((item) => item.effectKey === entry.effectKey);
    if (existing) return { status: "duplicate", entry: structuredClone(existing) };
    entries = [...entries, structuredClone(entry)];
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(entries));
    fs.renameSync(temp, filePath);
    return { status: "recorded", entry: structuredClone(entry) };
  }
  function all() { return structuredClone(entries); }
  return Object.freeze({ append, all });
}

module.exports = { createGamificationLedgerStore };
