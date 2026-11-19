"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createAiUsageLedger } = require("../src/services/aiUsageLedger");

test("free member is limited to three UTC-day and ten UTC-week AI requests across features", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-usage-"));
  try {
    let instant = new Date("2026-11-16T12:00:00Z");
    const ledger = createAiUsageLedger({ filePath: path.join(dir, "usage.json"), now: () => instant });
    for (let i = 0; i < 3; i++) assert.equal(ledger.record({ userId:"member", feature: i % 2 ? "meal_plan_draft" : "nutrition_research" }).allowed, true);
    assert.equal(ledger.record({ userId:"member", feature:"nutrition_research" }).allowed, false);
    for (let day = 1; day <= 3; day++) {
      instant = new Date(Date.UTC(2026, 10, 16 + day, 12));
      for (let i = 0; i < (day === 3 ? 1 : 3); i++) assert.equal(ledger.record({ userId:"member", feature:"nutrition_research" }).allowed, true);
    }
    assert.equal(ledger.record({ userId:"member", feature:"meal_plan_draft" }).allowed, false);
    assert.equal(ledger.record({ userId:"another", feature:"nutrition_research" }).allowed, true);
    assert.equal(ledger.record({ userId:"admin", feature:"nutrition_research", exempt:true }).allowed, true);
    instant = new Date("2026-11-23T12:00:00Z");
    assert.equal(ledger.record({ userId:"member", feature:"nutrition_research" }).allowed, true);
  } finally { fs.rmSync(dir, { recursive:true, force:true }); }
});
test("ledger fails closed when another writer holds lock", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-lock-"));
  try {
    const filePath = path.join(dir, "usage.json");
    fs.writeFileSync(filePath + ".lock", "");
    assert.deepEqual(createAiUsageLedger({filePath}).record({userId:"member",feature:"nutrition_research"}), {allowed:false,busy:true});
  } finally { fs.rmSync(dir, {recursive:true,force:true}); }
});
