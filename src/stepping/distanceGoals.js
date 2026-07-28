"use strict";

const MILE = 1609.344;
const GOAL_PRESETS = Object.freeze({
  open: { label: "Open goal", meters: null },
  half_mile: { label: "0.5 mile", meters: 804.672 },
  one_mile: { label: "1 mile", meters: MILE },
  two_miles: { label: "2 miles", meters: 3218.688 },
  five_k: { label: "5K", meters: 5000 },
  ten_k: { label: "10K", meters: 10000 },
  half_marathon: { label: "Half marathon", meters: 21097.5 },
  marathon: { label: "Marathon", meters: 42195 }
});
const MIN_CUSTOM_METERS = 100;
const MAX_CUSTOM_METERS = 200000;

function normalizeGoal(input) {
  if (!input || input.type === "open") return { type: "open", label: "Open goal", distanceMeters: null, custom: null, autoFinish: false };
  if (input.type === "custom") {
    const value = typeof input.customValue === "number" ? input.customValue : Number(String(input.customValue || "").trim());
    if (!Number.isFinite(value) || value <= 0 || !/^(?:\d+\.?\d*|\.\d+)$/.test(String(input.customValue).trim())) throw new Error("Enter a valid positive distance");
    if (!["miles", "kilometers"].includes(input.customUnit)) throw new Error("Choose miles or kilometers");
    const meters = value * (input.customUnit === "miles" ? MILE : 1000);
    if (meters < MIN_CUSTOM_METERS || meters > MAX_CUSTOM_METERS) throw new Error("Custom distance must be between 0.1 km and 200 km");
    return { type:"custom", label:`${value} ${input.customUnit === "miles" ? "mi" : "km"}`, distanceMeters:meters, custom:{ value, unit:input.customUnit }, autoFinish:input.autoFinish === true };
  }
  const preset = GOAL_PRESETS[input.type];
  if (!preset || preset.meters == null) throw new Error("Choose a valid distance goal");
  return { type:input.type, label:preset.label, distanceMeters:preset.meters, custom:null, autoFinish:input.autoFinish === true };
}

function goalProgress(goal, acceptedDistanceMeters, prior = {}) {
  const distance = Math.max(0, Number(acceptedDistanceMeters) || 0);
  if (!goal?.distanceMeters) return { completed:false, justCompleted:false, remainingMeters:null, percentage:null };
  const completed = distance >= goal.distanceMeters;
  return { completed, justCompleted:completed && !prior.completed, remainingMeters:Math.max(0, goal.distanceMeters-distance), percentage:Math.min(100, distance/goal.distanceMeters*100) };
}

module.exports = { GOAL_PRESETS, MIN_CUSTOM_METERS, MAX_CUSTOM_METERS, normalizeGoal, goalProgress };
