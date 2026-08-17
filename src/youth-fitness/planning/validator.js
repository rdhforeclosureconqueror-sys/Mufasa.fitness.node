'use strict';

const { MOVEMENT_FAMILIES, ACTIVITY_TYPES, TRAINING_LEVELS } = require('../activities');
const { GOALS } = require('../profiles');
const { PROGRAM_LENGTHS, PROGRAM_STATES } = require('./constants');

const values = (enumeration) => new Set(Object.values(enumeration));
const fail = (error, message, field) => ({ ok: false, error, message, field });
const isText = (value) => typeof value === 'string' && value.trim().length > 0;

function containsProhibitedOutput(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => /^(exercise|game|activity)_id$|workout/i.test(key) || containsProhibitedOutput(child));
}

function validateYouthFitnessProgram(program) {
  if (!program || typeof program !== 'object' || Array.isArray(program)) return fail('invalid_program', 'Program must be an object.', 'program');
  if (!PROGRAM_LENGTHS.includes(program.program_length_weeks)) return fail('unsupported_program_length', 'Program length must be 8, 12, or 32 weeks.', 'program_length_weeks');
  if (!isText(program.participant_ref)) return fail('invalid_participant_ref', 'participant_ref is required.', 'participant_ref');
  if (!isText(program.profile_id)) return fail('invalid_profile_id', 'profile_id is required.', 'profile_id');
  if (!values(TRAINING_LEVELS).has(program.training_level)) return fail('invalid_training_level', 'training_level is unsupported.', 'training_level');
  if (!Array.isArray(program.goals) || program.goals.length === 0 || program.goals.some((goal) => !values(GOALS).has(goal))) return fail('invalid_goals', 'goals must contain only supported goals.', 'goals');
  if (!values(PROGRAM_STATES).has(program.status)) return fail('invalid_program_status', 'status is unsupported.', 'status');
  if (!Array.isArray(program.phases) || program.phases.length === 0) return fail('invalid_phases', 'At least one phase is required.', 'phases');

  const covered = new Set();
  for (const phase of program.phases) {
    if (!Number.isInteger(phase.phase_number) || !Number.isInteger(phase.start_week) || !Number.isInteger(phase.end_week) || phase.start_week > phase.end_week) return fail('invalid_phase_range', 'Every phase needs a valid inclusive range.', 'phases');
    for (let week = phase.start_week; week <= phase.end_week; week += 1) {
      if (covered.has(week)) return fail('overlapping_phases', 'Phase week ranges must not overlap.', 'phases');
      covered.add(week);
    }
  }
  if (covered.size !== program.program_length_weeks || [...Array(program.program_length_weeks)].some((_, index) => !covered.has(index + 1))) return fail('incomplete_phase_coverage', 'Phases must cover every program week exactly once.', 'phases');
  if (!Array.isArray(program.weeks) || program.weeks.length !== program.program_length_weeks) return fail('invalid_weeks', 'Program must contain one record per week.', 'weeks');
  const phaseNumbers = new Set(program.phases.map((phase) => phase.phase_number));
  for (let index = 0; index < program.weeks.length; index += 1) {
    const week = program.weeks[index];
    if (week.week_number !== index + 1) return fail('non_contiguous_weeks', 'Weeks must be contiguous and ordered.', 'weeks');
    if (!phaseNumbers.has(week.phase_number) || !program.phases.some((phase) => phase.phase_number === week.phase_number && week.week_number >= phase.start_week && week.week_number <= phase.end_week)) return fail('orphan_week', 'Every week must belong to its covering phase.', `weeks.${index}.phase_number`);
    if (!Array.isArray(week.session_slots) || week.session_slots.length === 0 || week.session_slots.length !== week.session_count) return fail('invalid_session_count', 'Each week session count must match its slots.', `weeks.${index}.session_slots`);
    for (const slot of week.session_slots) {
      if (!Array.isArray(slot.broad_objectives) || slot.broad_objectives.length === 0) return fail('missing_session_objectives', 'Every slot needs broad objectives.', 'session_slots');
      if (!Array.isArray(slot.movement_family_targets) || slot.movement_family_targets.length === 0 || slot.movement_family_targets.some((target) => !values(MOVEMENT_FAMILIES).has(target))) return fail('invalid_movement_targets', 'Every movement target must be canonical.', 'movement_family_targets');
      if (!Array.isArray(slot.activity_type_targets) || slot.activity_type_targets.length === 0 || slot.activity_type_targets.some((target) => !values(ACTIVITY_TYPES).has(target))) return fail('invalid_activity_targets', 'Every activity target must be canonical.', 'activity_type_targets');
    }
  }
  if (!Array.isArray(program.education_sequence) || program.education_sequence.length !== program.program_length_weeks) return fail('invalid_education_sequence', 'Every week needs an education assignment.', 'education_sequence');
  if (!program.consistency_expectation || !Number.isInteger(program.consistency_expectation.scheduled_sessions_per_week)) return fail('invalid_consistency_expectation', 'Consistency metadata is required.', 'consistency_expectation');
  if (!program.assessment_schedule || !Array.isArray(program.assessment_schedule.checkpoints)) return fail('invalid_assessment_schedule', 'Assessment schedule metadata is required.', 'assessment_schedule');
  if (containsProhibitedOutput(program)) return fail('prohibited_generation_output', 'Program architecture cannot contain workouts or specific activity IDs.', 'program');
  if (!Array.isArray(program.safety_flags)) return fail('invalid_safety_flags', 'Safety flags must be preserved as an array.', 'safety_flags');
  return { ok: true, program };
}

module.exports = { containsProhibitedOutput, validateYouthFitnessProgram };
