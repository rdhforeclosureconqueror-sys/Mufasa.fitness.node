'use strict';

const crypto = require('node:crypto');
const { resolveYouthFitnessProfile, PROFILE_STATUSES, GOALS } = require('../profiles');
const { inspectPresentationClaim } = require('../evidence');
const { PROGRAM_LENGTHS, PROGRAM_STATES } = require('./constants');
const { validateYouthFitnessProgram } = require('./validator');

const phaseTemplates = {
  8: [[1, 3, 'Foundation & Movement Confidence'], [4, 6, 'Build Capacity'], [7, 8, 'Progress & Demonstrate']],
  12: [[1, 4, 'Foundation & Movement Confidence'], [5, 8, 'Build Capacity'], [9, 12, 'Progress & Demonstrate']],
  32: [[1, 8, 'Foundation & Movement Confidence'], [9, 16, 'Build Capacity'], [17, 24, 'Progress & Skill Expansion'], [25, 32, 'Demonstrate, Reassess & Continue']],
};
const lessons = [
  ['TECHNIQUE_BEFORE_SPEED', 'Technique comes before speed.'],
  ['CONSISTENCY_OVER_EXTREMES', 'Consistency matters more than one extremely hard workout.'],
  ['RECOVERY_IS_TRAINING', 'Recovery is part of training.'],
  ['SLEEP_SUPPORTS_RECOVERY', 'Sleep supports growth and recovery.'],
  ['WATER_SUPPORTS_PERFORMANCE', 'Water supports normal physical performance.'],
  ['PROGRESS_IS_GRADUAL', 'Progress happens gradually.'],
  ['FITNESS_IS_BALANCED', 'Fitness includes strength, endurance, movement, mobility, and coordination.'],
  ['PERSONAL_COMPARISON', 'Compare your performance primarily with your own previous performance.'],
  ['HARDER_NOT_ALWAYS_BETTER', 'Harder is not automatically better.'],
  ['STOP_WHEN_FORM_BREAKS', 'Stopping when form breaks is smart training.'],
];

function plannerFailure(error, message, field) { return { ok: false, error, message, field }; }
function isResolvedProfile(profile) { return profile && typeof profile === 'object' && profile.version === 1 && typeof profile.profile_id === 'string' && typeof profile.participant_ref === 'string' && typeof profile.profile_status === 'string'; }
function resolvePlannerProfile(input, options) {
  if (isResolvedProfile(input)) return { ok: true, profile: input };
  return resolveYouthFitnessProfile(input, { participantRef: options.participantRef, profileId: options.profileId });
}

function goalEmphasis(goals) {
  const emphasis = ['BALANCED_DEVELOPMENT', 'MOVEMENT_COMPETENCY', 'RECOVERY'];
  if (goals.includes(GOALS.GET_STRONGER)) emphasis.push('STRENGTH_ENDURANCE');
  if (goals.includes(GOALS.IMPROVE_ENDURANCE)) emphasis.push('AEROBIC_CAPACITY');
  if (goals.includes(GOALS.MOVE_BETTER) || goals.includes(GOALS.IMPROVE_MOBILITY)) emphasis.push('MOVEMENT_CONTROL', 'MOBILITY');
  if (goals.includes(GOALS.BUILD_CONSISTENCY)) emphasis.push('LOW_BARRIER_COMPLETION', 'HABIT_PRACTICE');
  if (goals.includes(GOALS.PREPARE_FOR_SPORT)) emphasis.push('GENERAL_ATHLETIC_DEVELOPMENT');
  return [...new Set(emphasis)];
}

function presentationFor(ageBand) {
  return { '10_12': { style: 'EXPLORATION_AND_GAMES', cue_complexity: 'SIMPLE' }, '13_15': { style: 'STRUCTURED_DEVELOPMENT', cue_complexity: 'CONCISE' }, '16_17': { style: 'MATURE_TRAINING_FRAME', cue_complexity: 'CONCISE' } }[ageBand];
}

function sessionBlueprint(index, emphasis, ageBand) {
  const gameTarget = ageBand === '10_12' ? ['EXERCISE', 'GAME'] : ['EXERCISE'];
  const base = [
    { name: 'Learn the Movements', focus: 'MOVEMENT_LEARNING_FULL_BODY', effort: 'LOW_TO_MODERATE', domains: ['MOVEMENT_SKILL', 'STRENGTH', 'MOBILITY'], families: ['SQUAT', 'HINGE', 'PUSH', 'PULL', 'TRUNK', 'MOBILITY'], types: ['EXERCISE'] },
    { name: 'Build Strength and Control', focus: 'STRENGTH_ENDURANCE_CONTROL', effort: 'MODERATE', domains: ['STRENGTH', 'MOVEMENT_SKILL', 'RECOVERY'], families: ['SQUAT', 'PUSH', 'PULL', 'SINGLE_LEG', 'TRUNK', 'BREATHING_RECOVERY'], types: gameTarget },
    { name: 'Move, Coordinate, and Recover', focus: emphasis.includes('AEROBIC_CAPACITY') ? 'AEROBIC_CAPACITY_MOVEMENT' : 'COORDINATION_AEROBIC_MOBILITY', effort: 'LOW_TO_MODERATE', domains: ['AEROBIC_FITNESS', 'COORDINATION', 'MOBILITY', 'RECOVERY'], families: ['LOCOMOTION', 'CONDITIONING', 'MOBILITY', 'BREATHING_RECOVERY'], types: gameTarget },
  ];
  return base[index % base.length];
}

function assessmentSchedule(length) {
  const weeks = length === 8 ? [0, 4, 8] : length === 12 ? [0, 4, 8, 12] : [0, 8, 16, 24, 32];
  return { baseline_required: true, execution_in_phase_4: false, stable_protocol_policy: 'Do not switch aerobic test protocols within a program comparison cycle.', checkpoints: weeks.map((week, index) => ({ week, type: index === 0 ? 'BASELINE' : index === weeks.length - 1 ? 'FINAL_REVIEW' : 'CHECKPOINT' })) };
}

function planYouthFitnessProgram(input, options = {}) {
  const resolved = resolvePlannerProfile(input, options);
  if (!resolved.ok) return resolved;
  const profile = resolved.profile;
  if (![PROFILE_STATUSES.READY_FOR_PROGRAM_PLANNING, PROFILE_STATUSES.COACH_REVIEW_REQUIRED].includes(profile.profile_status)) return plannerFailure('profile_not_plannable', 'Profile is not in a plannable state.', 'profile_status');
  if (!profile.schedule || ![1, 2, 3].includes(profile.schedule.sessions_per_week) || !Number.isInteger(profile.schedule.session_minutes) || !Array.isArray(profile.goals) || profile.goals.length === 0 || !Array.isArray(profile.safety_flags) || !profile.assessment_profile || !Array.isArray(profile.equipment)) return plannerFailure('invalid_resolved_profile', 'Resolved profile is incomplete or invalid.', 'profile');
  const length = options.programLengthWeeks === undefined ? 12 : options.programLengthWeeks;
  if (!PROGRAM_LENGTHS.includes(length)) return plannerFailure('unsupported_program_length', 'Program length must be 8, 12, or 32 weeks.', 'program_length_weeks');
  const emphasis = goalEmphasis(profile.goals);
  const phases = phaseTemplates[length].map(([start, end, name], index) => ({ phase_id: `P${index + 1}`, phase_number: index + 1, name, start_week: start, end_week: end, primary_focus: index === 0 ? 'MOVEMENT_CONFIDENCE' : index === phaseTemplates[length].length - 1 ? 'CONTROLLED_PROGRESS_AND_REVIEW' : 'BALANCED_CAPACITY', objectives: ['develop movement competency', 'build balanced fitness', 'practice consistent participation'], training_level: profile.training_level, emphasis, progression_policy: 'Progress gradually; preserve technique, balance, and recovery.', education_focus: index === 0 ? 'FOUNDATIONS' : index === phaseTemplates[length].length - 1 ? 'PERSONAL_PROGRESS' : 'CONSISTENCY_AND_RECOVERY', status: 'PLANNED' }));
  const educationSequence = Array.from({ length }, (_, index) => { const [messageId, message] = lessons[index % lessons.length]; return { week_number: index + 1, message_id: messageId, topic: message, claim_review: inspectPresentationClaim(message) }; });
  const weeks = Array.from({ length }, (_, index) => {
    const weekNumber = index + 1;
    const phase = phases.find((candidate) => weekNumber >= candidate.start_week && weekNumber <= candidate.end_week);
    const slots = Array.from({ length: profile.schedule.sessions_per_week }, (_, slotIndex) => {
      const blueprint = sessionBlueprint(slotIndex, emphasis, profile.age_band);
      return { session_id: `W${String(weekNumber).padStart(2, '0')}-${String.fromCharCode(65 + slotIndex)}`, week_number: weekNumber, session_code: String.fromCharCode(65 + slotIndex), name: blueprint.name, session_minutes: profile.schedule.session_minutes, session_focus: blueprint.focus, intended_effort: blueprint.effort, required_domains: blueprint.domains, broad_objectives: [`practice ${blueprint.focus.toLowerCase().replaceAll('_', ' ')}`, 'finish with controlled technique and confidence'], movement_family_targets: blueprint.families, activity_type_targets: blueprint.types, status: 'PLANNED', planner_notes: [] };
    });
    return { week_number: weekNumber, phase_number: phase.phase_number, name: weekNumber === 1 ? 'Learn the Basics' : `Week ${weekNumber}: ${phase.name}`, objectives: ['practice balanced fitness', 'complete eligible scheduled sessions', 'use controlled technique', 'build confidence gradually'], session_count: profile.schedule.sessions_per_week, session_minutes: profile.schedule.session_minutes, consistency_target: Math.min(2, profile.schedule.sessions_per_week), broad_session_objectives: slots.map((slot) => ({ session_code: slot.session_code, objectives: slot.broad_objectives })), education_message_id: educationSequence[index].message_id, reassessment_marker: assessmentSchedule(length).checkpoints.find((point) => point.week === weekNumber)?.type || null, status: 'PLANNED', session_slots: slots };
  });
  const safetyFlags = [...new Set([...profile.safety_flags, ...(profile.assessment_profile.baseline_completed ? [] : ['BASELINE_NOT_COMPLETED']), ...(profile.equipment.length === 1 && profile.equipment[0] === 'BODYWEIGHT' ? ['EQUIPMENT_LIMITED_BODYWEIGHT_ONLY'] : [])])];
  const digest = crypto.createHash('sha256').update(`${profile.profile_id}:${length}:1`).digest('hex').slice(0, 12).toUpperCase();
  const program = { program_id: `YFP-${digest}`, participant_ref: profile.participant_ref, profile_id: profile.profile_id, program_version: 1, program_context: profile.program_context, program_length_weeks: length, desired_start_date: options.desiredStartDate || null, organization_context: options.organizationContext || null, schedule_preferences: options.schedulePreferences || { preferred_days: profile.schedule.preferred_days }, training_level: profile.training_level, age_presentation: presentationFor(profile.age_band), goals: [...profile.goals], emphasis, status: PROGRAM_STATES.DRAFT, phases, weeks, consistency_expectation: { scheduled_sessions_per_week: profile.schedule.sessions_per_week, minimum_successful_sessions_per_week: Math.min(2, profile.schedule.sessions_per_week), calculation: 'eligible_completed / eligible_scheduled', excluded_session_policy: 'Approved exclusions are not counted against consistency.', language_policy: 'non_shaming' }, education_sequence: educationSequence, assessment_schedule: assessmentSchedule(length), planner_notes: profile.profile_status === PROFILE_STATUSES.COACH_REVIEW_REQUIRED ? ['Program remains DRAFT pending coach review.'] : [], safety_flags: safetyFlags, created_at: null };
  const validation = validateYouthFitnessProgram(program);
  return validation.ok ? { ok: true, program } : validation;
}

module.exports = { planYouthFitnessProgram, goalEmphasis, isResolvedProfile };
