'use strict';

const crypto = require('node:crypto');
const { EQUIPMENT } = require('../activities');
const { GOALS, TRAINING_EXPERIENCES, TRAINING_LEVELS, PROGRAM_CONTEXTS, MOVEMENT_NEEDS, SORENESS_LEVELS, SLEEP_QUALITIES, STRESS_TAGS, PROFILE_STATUSES, SAFETY_FLAGS } = require('./constants');

const values = (enumeration) => new Set(Object.values(enumeration));
const failure = (error, message, field, profileStatus = PROFILE_STATUSES.NEEDS_REQUIRED_FIELDS) => ({ ok: false, error, message, field, profile_status: profileStatus });
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isIntegerAtLeastZero = (value) => Number.isInteger(value) && value >= 0;

function resolveAgeBand(age) {
  if (typeof age !== 'number' || !Number.isInteger(age)) return null;
  if (age >= 10 && age <= 12) return '10_12';
  if (age >= 13 && age <= 15) return '13_15';
  if (age >= 16 && age <= 17) return '16_17';
  return null;
}

function calculateConsistencyPercentage(consistency) {
  if (!isRecord(consistency) || !isIntegerAtLeastZero(consistency.eligible_scheduled_sessions) || !isIntegerAtLeastZero(consistency.eligible_completed_sessions) || consistency.eligible_completed_sessions > consistency.eligible_scheduled_sessions) return null;
  if (consistency.eligible_scheduled_sessions === 0) return null;
  return Math.round((consistency.eligible_completed_sessions / consistency.eligible_scheduled_sessions) * 100);
}

function normalizeUniqueArray(value, enumeration, field, { emptyAllowed = true } = {}) {
  if (!Array.isArray(value)) return failure(`invalid_${field}`, `${field} must be an array.`, field);
  if (!emptyAllowed && value.length === 0) return failure(`missing_${field}`, `${field} must contain at least one value.`, field);
  const allowed = values(enumeration);
  if (value.some((item) => typeof item !== 'string' || !allowed.has(item))) return failure(`invalid_${field}`, `${field} contains an unsupported value.`, field);
  return { ok: true, value: [...new Set(value)] };
}

function resolveTrainingLevel(experience, requestedLevel, competencyEvidence) {
  const warnings = [];
  const supported = values(TRAINING_LEVELS);
  if (requestedLevel !== undefined && !supported.has(requestedLevel)) return failure('invalid_training_level', 'training_level is unsupported.', 'training_level');
  let maximum = TRAINING_LEVELS.FOUNDATION;
  if ((experience === TRAINING_EXPERIENCES.SOME_EXPERIENCE || experience === TRAINING_EXPERIENCES.EXPERIENCED) && isRecord(competencyEvidence) && supported.has(competencyEvidence.maximum_training_level)) maximum = competencyEvidence.maximum_training_level;
  const rank = { FOUNDATION: 0, DEVELOPMENT: 1, PROGRESSION: 2 };
  if (requestedLevel && rank[requestedLevel] <= rank[maximum]) return { ok: true, value: requestedLevel, warnings };
  if (requestedLevel && requestedLevel !== maximum) warnings.push({ code: 'TRAINING_LEVEL_DOWNGRADED', message: 'Requested training level was conservatively reduced because competency evidence does not support it.' });
  return { ok: true, value: maximum, warnings };
}

function resolveYouthFitnessProfile(input, options = {}) {
  if (!isRecord(input)) return failure('invalid_profile', 'Profile input must be an object.', 'profile');
  if (input.age === undefined) return failure('missing_age', 'Age is required.', 'age');
  if (typeof input.age !== 'number' || !Number.isInteger(input.age)) return failure('invalid_age', 'Age must be a whole number and is not coerced.', 'age');
  if (input.age < 10 || input.age > 17) return failure('unsupported_age', 'This youth fitness profile supports ages 10 through 17.', 'age', PROFILE_STATUSES.UNSUPPORTED);
  if (typeof options.participantRef !== 'string' || !options.participantRef.trim()) return failure('unresolved_participant', 'The canonical Pocket PT participant must be resolved server-side.', 'participant_ref');

  const goals = normalizeUniqueArray(input.goals, GOALS, 'goals', { emptyAllowed: false });
  if (!goals.ok) return goals;
  if (!values(TRAINING_EXPERIENCES).has(input.training_experience)) return failure('invalid_training_experience', 'training_experience is required and must be recognized.', 'training_experience');
  const level = resolveTrainingLevel(input.training_experience, input.training_level, input.competency_evidence);
  if (!level.ok) return level;
  const programContext = input.program_context === undefined ? PROGRAM_CONTEXTS.GENERAL_YOUTH_FITNESS : input.program_context;
  if (!values(PROGRAM_CONTEXTS).has(programContext)) return failure('invalid_program_context', 'program_context is unsupported.', 'program_context');

  const schedule = input.schedule === undefined ? { sessions_per_week: 3, session_minutes: 45, preferred_days: [] } : input.schedule;
  if (!isRecord(schedule)) return failure('invalid_schedule', 'schedule must be an object.', 'schedule');
  if (![1, 2, 3].includes(schedule.sessions_per_week)) return failure('invalid_sessions_per_week', 'sessions_per_week must be 1, 2, or 3 under Phase 3 policy.', 'schedule.sessions_per_week');
  if (!Number.isInteger(schedule.session_minutes) || schedule.session_minutes < 20 || schedule.session_minutes > 60) return failure('invalid_session_minutes', 'session_minutes must be a whole number from 20 through 60.', 'schedule.session_minutes');
  if (schedule.preferred_days !== undefined && (!Array.isArray(schedule.preferred_days) || schedule.preferred_days.some((day) => typeof day !== 'string'))) return failure('invalid_preferred_days', 'preferred_days must be an array of strings.', 'schedule.preferred_days');

  const equipmentInput = input.equipment === undefined || (Array.isArray(input.equipment) && input.equipment.length === 0) ? ['BODYWEIGHT'] : input.equipment;
  const equipment = normalizeUniqueArray(equipmentInput, EQUIPMENT, 'equipment', { emptyAllowed: false });
  if (!equipment.ok) return equipment;
  const movementNeeds = normalizeUniqueArray(input.movement_needs || [], MOVEMENT_NEEDS, 'movement_needs');
  if (!movementNeeds.ok) return movementNeeds;

  const readiness = input.readiness === undefined ? { energy: 3, soreness: 'NONE', sleep_quality: 'GOOD', pain: false } : input.readiness;
  if (!isRecord(readiness)) return failure('invalid_readiness', 'readiness must be an object.', 'readiness');
  if (!Number.isInteger(readiness.energy) || readiness.energy < 1 || readiness.energy > 5) return failure('invalid_energy', 'energy must be a whole number from 1 through 5.', 'readiness.energy');
  if (!values(SORENESS_LEVELS).has(readiness.soreness)) return failure('invalid_soreness', 'soreness is unsupported.', 'readiness.soreness');
  if (!values(SLEEP_QUALITIES).has(readiness.sleep_quality)) return failure('invalid_sleep_quality', 'sleep_quality is unsupported.', 'readiness.sleep_quality');
  if (typeof readiness.pain !== 'boolean') return failure('invalid_pain', 'pain must be boolean.', 'readiness.pain');

  const assessment = input.assessment_profile === undefined ? {} : input.assessment_profile;
  if (!isRecord(assessment)) return failure('invalid_assessment_profile', 'assessment_profile must be an object.', 'assessment_profile');
  const recent = input.recent_training_summary === undefined ? {} : input.recent_training_summary;
  if (!isRecord(recent)) return failure('invalid_recent_training_summary', 'recent_training_summary must be an object.', 'recent_training_summary');
  const stressTags = normalizeUniqueArray(recent.recent_stress_tags || [], STRESS_TAGS, 'recent_stress_tags');
  if (!stressTags.ok) return stressTags;
  if (recent.sessions_completed_last_7_days !== undefined && !isIntegerAtLeastZero(recent.sessions_completed_last_7_days)) return failure('invalid_recent_session_count', 'sessions_completed_last_7_days must be a non-negative integer.', 'recent_training_summary.sessions_completed_last_7_days');
  if (recent.high_impact_recently !== undefined && typeof recent.high_impact_recently !== 'boolean') return failure('invalid_recent_impact', 'high_impact_recently must be boolean.', 'recent_training_summary.high_impact_recently');

  const consistency = input.consistency === undefined ? { eligible_scheduled_sessions: 0, eligible_completed_sessions: 0, excluded_sessions: 0 } : input.consistency;
  if (!isRecord(consistency) || !isIntegerAtLeastZero(consistency.eligible_scheduled_sessions) || !isIntegerAtLeastZero(consistency.eligible_completed_sessions) || !isIntegerAtLeastZero(consistency.excluded_sessions)) return failure('invalid_consistency', 'Consistency counts must be non-negative integers.', 'consistency');
  if (consistency.eligible_completed_sessions > consistency.eligible_scheduled_sessions) return failure('invalid_consistency', 'Eligible completed sessions cannot exceed eligible scheduled sessions.', 'consistency.eligible_completed_sessions');

  const safetyFlags = readiness.pain ? [SAFETY_FLAGS.PAIN_REPORTED_REQUIRES_COACH_REVIEW] : [];
  const participantRef = options.participantRef.trim();
  const profileId = typeof options.profileId === 'string' && options.profileId.trim() ? options.profileId.trim() : `YFPF-${crypto.createHash('sha256').update(participantRef).digest('hex').slice(0, 12).toUpperCase()}`;
  return { ok: true, profile: Object.freeze({ profile_id: profileId, participant_ref: participantRef, age: input.age, age_band: resolveAgeBand(input.age), goals: goals.value, training_experience: input.training_experience, training_level: level.value, program_context: programContext, schedule: { sessions_per_week: schedule.sessions_per_week, session_minutes: schedule.session_minutes, preferred_days: [...(schedule.preferred_days || [])] }, equipment: equipment.value, assessment_profile: { baseline_completed: assessment.baseline_completed === true, fitness_tests: isRecord(assessment.fitness_tests) ? assessment.fitness_tests : {}, movement_observations: isRecord(assessment.movement_observations) ? assessment.movement_observations : {}, last_assessed_at: assessment.last_assessed_at || null }, movement_needs: movementNeeds.value, readiness: { energy: readiness.energy, soreness: readiness.soreness, sleep_quality: readiness.sleep_quality, pain: readiness.pain }, recent_training_summary: { last_session_at: recent.last_session_at || null, recent_stress_tags: stressTags.value, high_impact_recently: recent.high_impact_recently === true, sessions_completed_last_7_days: recent.sessions_completed_last_7_days || 0 }, consistency: { ...consistency, percentage: calculateConsistencyPercentage(consistency) }, safety_flags: safetyFlags, warnings: level.warnings, profile_status: readiness.pain ? PROFILE_STATUSES.COACH_REVIEW_REQUIRED : PROFILE_STATUSES.READY_FOR_PROGRAM_PLANNING, version: 1 }) };
}

module.exports = { resolveAgeBand, resolveTrainingLevel, calculateConsistencyPercentage, resolveYouthFitnessProfile };
