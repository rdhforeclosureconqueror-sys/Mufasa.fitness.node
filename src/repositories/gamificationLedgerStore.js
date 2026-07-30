"use strict";

const fs = require("fs");
const path = require("path");

function createGamificationLedgerStore({ filePath }) {
  let entries = load();
  function load() {
    if (!fs.existsSync(filePath)) return [];
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(value) || value.some((entry) => !validEntry(entry, { legacy: true }))) throw new Error("invalid gamification ledger store");
    return value;
  }
  function append(entry) {
    if (!validEntry(entry)) throw new Error("invalid gamification ledger entry");
    const existing = entries.find((item) => item.effectKey === entry.effectKey);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(entry)) throw new Error("gamification ledger effect key conflict");
      return { status: "duplicate", entry: structuredClone(existing) };
    }
    if (entry.reversalOf) {
      const original = entries.find((item) => item.entryId === entry.reversalOf);
      if (!original || original.reversalOf || original.subjectUserId !== entry.subjectUserId || original.kind !== entry.kind || entry.delta !== -original.delta) throw new Error("invalid gamification ledger reversal");
      if (entries.some((item) => item.reversalOf === entry.reversalOf)) throw new Error("duplicate gamification ledger reversal");
    }
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

function validEntry(entry, { legacy = false } = {}) {
  return Boolean(entry && typeof entry.effectKey === "string" && entry.effectKey && typeof entry.entryId === "string" && entry.entryId
    && entry.kind === "lifetime_xp" && Number.isSafeInteger(entry.delta) && typeof entry.subjectUserId === "string" && entry.subjectUserId
    && typeof entry.sourceEventId === "string" && entry.sourceEventId && typeof entry.policyVersion === "string" && entry.policyVersion
    && typeof entry.occurredAt === "string" && new Date(entry.occurredAt).toISOString() === entry.occurredAt
    && (entry.reversalOf === null || typeof entry.reversalOf === "string")
    && (legacy || typeof entry.reason === "string" && entry.reason));
}

module.exports = { createGamificationLedgerStore, validEntry };
