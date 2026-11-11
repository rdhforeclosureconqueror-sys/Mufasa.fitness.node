"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createUserStore } = require("../repositories/userStore");
const { feedback } = require("../../public/daily-check-in");

function createDailyCheckIns(userStore, clock = Date.now) {
  const dayKey = (time) => new Date(time).toISOString().slice(0, 10);
  const oneDay = 86_400_000;

  function summarize(records, now) {
    const days = new Set(records.map((record) => record.day));
    const today = dayKey(now);
    const completed = days.has(today);
    let streak = 0;
    let cursor = completed ? now : now - oneDay;
    while (days.has(dayKey(cursor))) {
      streak++;
      cursor -= oneDay;
    }
    const nextMilestone = [1, 3, 7, 14, 30].find((target) => target > streak)
      ?? (Math.floor(streak / 30) + 1) * 30;
    return { day: today, completed, streak, nextMilestone };
  }

  function status(userId) {
    return summarize(userStore.loadUser(userId).dailyCheckIns || [], clock());
  }

  function complete(userId) {
    const now = clock();
    const day = dayKey(now);
    const current = userStore.loadUser(userId).dailyCheckIns || [];
    if (current.some((record) => record.day === day)) return summarize(current, now);
    const user = userStore.updateUser(userId, (record) => {
      record.dailyCheckIns = [...(record.dailyCheckIns || []), { day, ts: now }];
      return record;
    });
    return summarize(user.dailyCheckIns, now);
  }

  return { status, complete };
}

function runDailyCheckInDiagnostic() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "milele-daily-check-in-"));
  let step = "Create synthetic member";
  try {
    const store = createUserStore({ userDir: directory });
    const member = "daily-check-in-diagnostic";
    store.saveUser({ userId: member });
    const now = Date.UTC(2026, 0, 2, 23, 59);
    const service = createDailyCheckIns(store, () => now);
    step = "Save and reload the daily check-in";
    service.complete(member);
    if (!service.status(member).completed) throw new Error("Saved check-in was not found");
    step = "Deduplicate a same-day retry";
    service.complete(member);
    if (store.loadUser(member).dailyCheckIns.length !== 1) throw new Error("Expected one saved record");
    step = "Verify dashboard feedback";
    const result = feedback(service.status(member));
    if (result !== "Check-in complete. Current streak: 1 day. Next milestone: 3 days.") {
      throw new Error("Unexpected dashboard feedback");
    }
    return { passed: true, message: result };
  } catch (error) {
    return { passed: false, step, message: error.message };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

module.exports = { createDailyCheckIns, runDailyCheckInDiagnostic };
