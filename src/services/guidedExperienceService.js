"use strict";

const TOUR_IDS = Object.freeze(["introduction", "training", "nutrition", "exercise-library", "run-club", "progress", "avatar"]);

function cleanState(value = {}) {
  const tours = {};
  for (const id of TOUR_IDS) {
    const source = value.tours?.[id] || {};
    tours[id] = { seen: Boolean(source.seen), dismissed: Boolean(source.dismissed), completedAt: source.completedAt || null };
  }
  return { version: 1, proactiveDisabled: Boolean(value.proactiveDisabled), tours };
}

function createGuidedExperienceService({ userStore }) {
  const get = userId => cleanState(userStore.loadUser(userId).guidedExperience);
  const update = (userId, patch = {}) => {
    if (patch.tourId && !TOUR_IDS.includes(patch.tourId)) throw Object.assign(new Error("unknown_tour"), { status: 422 });
    let result;
    userStore.updateUser(userId, user => {
      const state = cleanState(user.guidedExperience);
      if (typeof patch.proactiveDisabled === "boolean") state.proactiveDisabled = patch.proactiveDisabled;
      if (patch.tourId) {
        const tour = state.tours[patch.tourId];
        if (patch.action === "dismiss") { tour.dismissed = true; tour.seen = true; }
        if (patch.action === "complete") { tour.seen = true; tour.dismissed = false; tour.completedAt = new Date().toISOString(); }
        if (patch.action === "replay") { tour.dismissed = false; }
      }
      user.guidedExperience = state; result = state; return user;
    });
    return result;
  };
  const eligible = (state, id, { manual = false } = {}) => manual || (!state.proactiveDisabled && !state.tours[id]?.completedAt && !state.tours[id]?.dismissed);
  return { get, update, eligible, TOUR_IDS };
}

module.exports = { createGuidedExperienceService, cleanState, TOUR_IDS };
