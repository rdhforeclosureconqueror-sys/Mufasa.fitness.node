"use strict";

const { dateKey } = require("./scheduleEngine");
const { resolveCanonicalSession } = require("../../data/challenges/kettlebellCanonicalProgram");

const DAY_MS = 86_400_000;
const WEEKDAYS = Object.freeze(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);
const RECOVERY_TIPS = Object.freeze([
  "Prioritize good sleep; recovery is where training adaptations take hold.",
  "Eat enough nutritious food and protein to support recovery.",
  "Stay hydrated throughout the day.",
  "Light movement is fine; recovery does not need to become another workout.",
  "Use a few minutes of relaxed breathing if it helps you unwind.",
  "Gentle static stretching is optional if you feel tight."
]);

function validation(message, field) {
  const error = new TypeError(message);
  error.field = field;
  return error;
}

function parseDate(value, field = "startDate") {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw validation(`${field} must use YYYY-MM-DD`, field);
  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isFinite(date.valueOf()) || dateKey(date) !== normalized) throw validation(`${field} must be a valid date`, field);
  return date;
}

function normalizeEnrollment(input = {}, { durationWeeks = 8 } = {}) {
  const workoutsPerWeek = Number(input.workoutsPerWeek);
  if (!Number.isInteger(workoutsPerWeek) || workoutsPerWeek < 1 || workoutsPerWeek > 4) {
    throw validation("workoutsPerWeek must be an integer from 1 to 4", "workoutsPerWeek");
  }
  const preferredWeekdays = [...new Set((input.preferredWeekdays || []).map(value => String(value).trim().toLowerCase()))];
  if (preferredWeekdays.length !== workoutsPerWeek || preferredWeekdays.some(day => !WEEKDAYS.includes(day))) {
    throw validation("preferredWeekdays must contain one unique weekday per weekly workout", "preferredWeekdays");
  }
  const startDate = dateKey(parseDate(input.startDate));
  return Object.freeze({
    workoutsPerWeek,
    preferredWeekdays: Object.freeze(preferredWeekdays),
    startDate,
    durationWeeks,
    promisedWorkouts: workoutsPerWeek * durationWeeks
  });
}

function buildCommitmentSchedule(input, options = {}) {
  const enrollment = normalizeEnrollment(input, options);
  const start = parseDate(enrollment.startDate);
  const preferred = new Set(enrollment.preferredWeekdays);
  const schedule = [];
  const weeklyOrdinal = new Map();
  for (let offset = 0; offset < enrollment.durationWeeks * 7; offset += 1) {
    const date = new Date(start.getTime() + offset * DAY_MS);
    const dateValue = dateKey(date);
    const weekNumber = Math.floor(offset / 7) + 1;
    const weekday = WEEKDAYS[date.getUTCDay()];
    const workout = preferred.has(weekday);
    const ordinal = workout ? (weeklyOrdinal.get(weekNumber) || 0) + 1 : null;
    if (workout) weeklyOrdinal.set(weekNumber, ordinal);
    schedule.push(workout ? {
      scheduleSessionId: `commitment_w${weekNumber}_s${ordinal}`,
      canonicalSessionId: resolveCanonicalSession(weekNumber, enrollment.workoutsPerWeek, ordinal - 1).id,
      weekNumber,
      weekday,
      type: "workout",
      state: "scheduled",
      originalPlannedDate: dateValue,
      plannedDate: dateValue,
      actualCompletionDate: null,
      rescheduledFrom: null,
      missedAt: null,
      comeback: false
    } : {
      scheduleSessionId: `recovery_${dateValue}`,
      weekNumber,
      weekday,
      type: "recovery",
      state: "recovery",
      plannedDate: dateValue,
      recoveryTip: RECOVERY_TIPS[offset % RECOVERY_TIPS.length]
    });
  }
  return { enrollment, schedule };
}

function weekEnd(schedule, weekNumber) {
  return schedule.filter(item => item.weekNumber === weekNumber).map(item => item.plannedDate).sort().at(-1);
}

function refreshCommitmentStates(schedule, now = new Date()) {
  const today = dateKey(now);
  return schedule.map(item => {
    if (item.type !== "workout" || !["scheduled", "makeup_available"].includes(item.state)) return { ...item };
    if (item.plannedDate >= today) return { ...item, state: item.plannedDate === today ? "due_today" : "scheduled" };
    const recoverable = today <= weekEnd(schedule, item.weekNumber);
    return { ...item, state: recoverable ? "makeup_available" : "missed", missedAt: item.missedAt || `${item.plannedDate}T23:59:59.999Z` };
  });
}

function wouldCreateThreeConsecutiveWorkouts(schedule, targetDate, ignoredSessionId) {
  const workoutDates = new Set(schedule.filter(item => item.type === "workout" && item.scheduleSessionId !== ignoredSessionId && !["missed"].includes(item.state)).map(item => item.plannedDate));
  workoutDates.add(targetDate);
  const target = parseDate(targetDate, "targetDate");
  for (let startOffset = -2; startOffset <= 0; startOffset += 1) {
    if ([0, 1, 2].every(offset => workoutDates.has(dateKey(new Date(target.getTime() + (startOffset + offset) * DAY_MS))))) return true;
  }
  return false;
}

function rescheduleCommitmentSession(schedule, sessionId, targetDate, now = new Date()) {
  const target = dateKey(parseDate(targetDate, "targetDate"));
  const refreshed = refreshCommitmentStates(schedule, now);
  const session = refreshed.find(item => item.scheduleSessionId === sessionId);
  if (!session || session.type !== "workout") throw validation("challenge session was not found", "sessionId");
  if (!["makeup_available", "scheduled", "due_today"].includes(session.state)) throw validation("challenge session is not eligible for rescheduling", "sessionId");
  if (target < dateKey(now) || target > weekEnd(refreshed, session.weekNumber)) throw validation("targetDate must be an available date in the same challenge week", "targetDate");
  const targetSlot = refreshed.find(item => item.plannedDate === target && item.weekNumber === session.weekNumber);
  if (!targetSlot || targetSlot.type !== "recovery") throw validation("targetDate must be a recovery day without another challenge workout", "targetDate");
  if (wouldCreateThreeConsecutiveWorkouts(refreshed, target, session.scheduleSessionId)) throw validation("targetDate would create three consecutive kettlebell training days", "targetDate");
  return refreshed.map(item => {
    if (item.scheduleSessionId === sessionId) return { ...item, state:"rescheduled", rescheduledFrom:item.plannedDate, plannedDate:target };
    if (item.scheduleSessionId === targetSlot.scheduleSessionId) return { ...item, plannedDate:session.plannedDate, weekday:session.weekday };
    return item;
  }).sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate));
}

function completeCommitmentSession(schedule, sessionId, completedAt = new Date()) {
  const actualCompletionDate = dateKey(completedAt);
  let found = false;
  let duplicate = false;
  const updated = schedule.map(item => {
    if (item.scheduleSessionId !== sessionId) return { ...item };
    found = true;
    if (["completed", "comeback_completed"].includes(item.state)) { duplicate = true; return { ...item }; }
    if (item.type !== "workout" || actualCompletionDate > weekEnd(schedule, item.weekNumber)) throw validation("completion falls outside the challenge week", "completedAt");
    const comeback = Boolean(item.missedAt || item.rescheduledFrom || actualCompletionDate > item.originalPlannedDate);
    return { ...item, state: comeback ? "comeback_completed" : "completed", actualCompletionDate, comeback };
  });
  if (!found) throw validation("challenge session was not found", "sessionId");
  return { schedule: updated, duplicate };
}

function commitmentSummary(schedule, enrollment) {
  const weeks = Array.from({ length: enrollment.durationWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const workouts = schedule.filter(item => item.weekNumber === weekNumber && item.type === "workout");
    const completed = workouts.filter(item => ["completed", "comeback_completed"].includes(item.state)).length;
    const terminal = workouts.every(item => ["completed", "comeback_completed", "missed"].includes(item.state));
    return { weekNumber, required: enrollment.workoutsPerWeek, completed, comebackCount: workouts.filter(item => item.state === "comeback_completed").length, status: completed === enrollment.workoutsPerWeek ? "weekly_commitment_kept" : terminal ? "weekly_commitment_missed" : "in_progress" };
  });
  let commitmentStreak = 0;
  for (const week of weeks) {
    if (week.status === "weekly_commitment_kept") commitmentStreak += 1;
    else break;
  }
  const completedWorkouts = weeks.reduce((sum, week) => sum + week.completed, 0);
  return { promisedWorkouts: enrollment.promisedWorkouts, completedWorkouts, commitmentScore: Math.round(100 * completedWorkouts / enrollment.promisedWorkouts), commitmentStreak, comebackCount: weeks.reduce((sum, week) => sum + week.comebackCount, 0), weeks };
}

module.exports = { WEEKDAYS, RECOVERY_TIPS, normalizeEnrollment, buildCommitmentSchedule, refreshCommitmentStates, rescheduleCommitmentSession, completeCommitmentSession, commitmentSummary };
