"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createUserStore } = require("../src/repositories/userStore");
const { createNutritionService, AI_DRAFT_SCHEMA } = require("../src/services/nutritionService");

function service() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "weekly-nutrition-"));
  return createNutritionService({ userStore: createUserStore({ userDir: dir }) });
}

test("weekly plan creation enforces one plan per user/week and ownership through user-scoped storage", () => {
  const svc = service();
  const one = svc.createWeeklyPlan("u1", { weekStartDate: "2026-07-15", status: "active" }).plan;
  assert.equal(one.weekStartDate, "2026-07-13");
  assert.throws(() => svc.createWeeklyPlan("u1", { weekStartDate: "2026-07-13" }), /already exists/);
  assert.equal(svc.currentWeeklyPlan("u2", "2026-07-15").plan, null);
});

test("grocery selections create pantry availability including custom items", () => {
  const svc = service();
  const plan = svc.createWeeklyPlan("u1", { weekStartDate: "2026-07-13" }).plan;
  const spinach = svc.upsertGroceryItem("u1", plan.id, { groceryOptionId: "spinach", categoryKey: "leafy_greens", alreadyAtHome: true }).item;
  svc.upsertGroceryItem("u1", plan.id, { customName: "Local pears", categoryKey: "fruit", acquired: true });
  svc.upsertGroceryItem("u1", plan.id, { groceryOptionId: "spinach", categoryKey: "leafy_greens", unavailable: true }, spinach.id);
  svc.upsertGroceryItem("u1", plan.id, { groceryOptionId: "spinach", categoryKey: "leafy_greens", alreadyAtHome: true }, spinach.id);
  const bundle = svc.planBundle("u1", plan.id);
  const spinachCurrent = bundle.groceryItems.find((item) => item.id === spinach.id);
  assert.equal(spinachCurrent.unavailable, false);
  assert.equal(spinachCurrent.acquired, false);
  assert.equal(spinachCurrent.alreadyAtHome, true);
  assert.equal(bundle.pantry.length, 2);
  assert.equal(bundle.progress.groceryPrepared, 2);
});

test("mission generation uses only available foods, rotates categories, and stays stable without confirmation", () => {
  const svc = service();
  const plan = svc.createWeeklyPlan("u1", { weekStartDate: "2026-07-13" }).plan;
  for (const [id, categoryKey] of [["spinach", "leafy_greens"], ["bananas", "fruit"], ["nuts", "healthy_fats"], ["chicken_breast", "lean_protein"], ["brown_rice", "whole_food_carbohydrates"]]) {
    svc.upsertGroceryItem("u1", plan.id, { groceryOptionId: id, categoryKey, acquired: true });
  }
  svc.upsertGroceryItem("u1", plan.id, { groceryOptionId: "salmon", categoryKey: "fatty_fish", unavailable: true });
  const first = svc.generateMissions("u1", plan.id).missions;
  const second = svc.generateMissions("u1", plan.id).missions;
  assert.deepEqual(second.map((m) => m.id), first.map((m) => m.id));
  assert.ok(first.length >= 21);
  assert.equal(first.some((m) => (m.qualifyingFoods || []).includes("Salmon")), false);
  assert.ok(new Set(first.map((m) => m.categoryKey)).size >= 4);
});

test("journal matching gives no duplicate automatic credit and recalculates on edit/delete", () => {
  const svc = service();
  const plan = svc.createWeeklyPlan("u1", { weekStartDate: "2026-07-13" }).plan;
  svc.upsertGroceryItem("u1", plan.id, { groceryOptionId: "spinach", categoryKey: "leafy_greens", acquired: true });
  svc.generateMissions("u1", plan.id);
  let mission = svc.listMissions("u1", plan.id, "2026-07-13").missions.find((m) => m.categoryKey === "leafy_greens");
  const entry = svc.createEntry("u1", { foodName: "Spinach", source: "custom", localDate: "2026-07-13" }).entry;
  mission = svc.listMissions("u1", plan.id, "2026-07-13").missions.find((m) => m.id === mission.id);
  assert.equal(mission.progressValue, 1);
  svc.updateEntry("u1", entry.entryId, { foodName: "Unknown food", source: "custom", localDate: "2026-07-13" });
  mission = svc.listMissions("u1", plan.id, "2026-07-13").missions.find((m) => m.id === mission.id);
  assert.equal(mission.progressValue, 0);
  const entry2 = svc.createEntry("u1", { foodName: "Spinach", source: "custom", localDate: "2026-07-13" }).entry;
  svc.deleteEntry("u1", entry2.entryId);
  mission = svc.listMissions("u1", plan.id, "2026-07-13").missions.find((m) => m.id === mission.id);
  assert.equal(mission.progressValue, 0);
});

test("manual progress, weekly review totals, invalid inputs, and AI draft schema validation", () => {
  const svc = service();
  const plan = svc.createWeeklyPlan("u1", { weekStartDate: "2026-07-13" }).plan;
  assert.throws(() => svc.upsertGroceryItem("u1", plan.id, { customName: "Mystery", categoryKey: "bad" }), /valid grocery category/);
  svc.upsertGroceryItem("u1", plan.id, { groceryOptionId: "bananas", categoryKey: "fruit", acquired: true });
  const mission = svc.generateMissions("u1", plan.id).missions[0];
  svc.manualProgress("u1", mission.id, { progressAmount: 1 });
  assert.equal(svc.listMissions("u1", plan.id).missions.find((m) => m.id === mission.id).status, "completed");
  svc.createEntry("u1", { foodName: "Bananas", source: "custom", localDate: "2026-07-13", calories: 100, proteinGrams: 1 });
  const review = svc.weeklyReview("u1", plan.id);
  assert.equal(review.nutritionTotals.calories, 100);
  assert.ok(AI_DRAFT_SCHEMA.required.includes("safetyFlags"));
  assert.ok(AI_DRAFT_SCHEMA.required.includes("status"));
  assert.equal(svc.validateAiDraft({ title: "Draft", groceryCategorySuggestions: [{ categoryKey: "fruit", groceryOptionIds: ["bananas"] }], proposedMissions: [], educationalRationale: "General education", safetyFlags: [], assumptions: [], status: "draft" }).valid, true);
  assert.equal(svc.validateAiDraft({ title: "Bad", groceryCategorySuggestions: [{ categoryKey: "fruit", groceryOptionIds: ["not_real"] }], status: "active" }).valid, false);
});

test("mobile weekly UI preserves nutrition journal elements and exposes required panels", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "nutrition.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "..", "public", "nutrition-runtime.js"), "utf8");
  for (const id of ["weeklyNutritionMissions", "weeklyThisWeek", "weeklyGroceryBuilder", "weeklyPantry", "weeklyMissions", "weeklyReview", "dailySummary", "entriesList", "foodSearchBtn"] ) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /@media\(max-width:700px\)/);
  assert.match(js, /api\("\/api\/me\/nutrition\/weekly-plan\/current"/);
  assert.match(js, /Manual confirmation/);
});
