'use strict';

const crypto = require('node:crypto');
const { activities, TRAINING_LEVELS, AGE_PRESENTATION_BANDS } = require('../activities');
const { PROFILE_STATUSES } = require('../profiles');
const { validateYouthFitnessProgram } = require('../planning');
const { inspectPresentationClaim } = require('../evidence');
const { SESSION_BLOCK_TYPES, LEVEL_RANK } = require('./constants');
const { validateYouthFitnessSessionBlueprint } = require('./validator');

const fail = (error, message, field) => ({ ok: false, error, message, field });
const enumHas = (enumeration, value) => Object.values(enumeration).includes(value);
const blockSpecs = [
  ['READINESS', 'Check In', 2, 'Collect energy, soreness, sleep quality, and pain before activity.', 'Answer honestly; an adult reviews reported pain.', 'LOW'],
  ['DYNAMIC_WARMUP', 'Get Ready to Move', 6, 'Prepare with controlled approved movement.', 'Move smoothly in a comfortable range.', 'LOW'],
  ['SKILL_MOVEMENT_LEARNING', 'Learn and Practice', 6, 'Practice movement setup, control, and confidence.', 'Quality before speed.', 'LOW_TO_MODERATE'],
  ['STRENGTH_ENDURANCE', 'Build Strength and Control', 14, 'Practice balanced strength-endurance without training to exhaustion.', 'Keep repetitions controlled and leave reserve.', 'LOW_TO_MODERATE'],
  ['CONDITIONING_GAME', 'Move and Play', 7, 'Build coordination and work capacity through approved activity.', 'Stay controlled and use the clear play area.', 'LOW_TO_MODERATE'],
  ['MOBILITY_ACTIVE_RECOVERY', 'Move and Recover', 5, 'Emphasize controlled mobility and movement quality.', 'Use a comfortable range; do not force positions.', 'LOW'],
  ['BREATHING_RECOVERY', 'Settle and Recover', 3, 'Use approved low-demand recovery activity.', 'Use easy, unforced breathing.', 'LOW'],
  ['REFLECTION_TRACKING', 'Look Back', 2, 'Record completion and a neutral reflection.', 'Notice practice without judging performance.', 'LOW'],
];

function validProfile(profile) {
  return profile && profile.version === 1 && typeof profile.profile_id === 'string' && typeof profile.participant_ref === 'string' && [PROFILE_STATUSES.READY_FOR_PROGRAM_PLANNING, PROFILE_STATUSES.COACH_REVIEW_REQUIRED].includes(profile.profile_status) && enumHas(TRAINING_LEVELS, profile.training_level) && enumHas(AGE_PRESENTATION_BANDS, profile.age_band) && Array.isArray(profile.equipment) && profile.schedule && Number.isInteger(profile.schedule.session_minutes);
}

function fitDurations(requested) {
  const minimum = [1, 3, 3, 7, 3, 2, 1, 1];
  const result = blockSpecs.map((spec, index) => Math.max(minimum[index], Math.round(spec[2] * requested / 45)));
  while (result.reduce((sum, value) => sum + value, 0) > requested) {
    const index = result.reduce((best, value, candidate) => value > minimum[candidate] && value > result[best] ? candidate : best, 0);
    if (result[index] <= minimum[index]) break;
    result[index] -= 1;
  }
  while (result.reduce((sum, value) => sum + value, 0) < requested) result[3] += 1;
  return result;
}

function feasible(activity, profile, avoidImpact) {
  return activity.approval.status === 'APPROVED' && LEVEL_RANK[activity.minimum_training_level] <= LEVEL_RANK[profile.training_level] && activity.equipment.every((item) => profile.equipment.includes(item)) && (!avoidImpact || !['MODERATE', 'HIGH'].includes(activity.impact_level));
}

function prescriptionFor(activity, blockType) {
  const timed = activity.activity_type === 'GAME' || ['DYNAMIC_WARMUP', 'CONDITIONING_GAME', 'MOBILITY_ACTIVE_RECOVERY', 'BREATHING_RECOVERY'].includes(blockType);
  return { sets: blockType === 'STRENGTH_ENDURANCE' ? 2 : 1, reps: timed ? null : '6-10', duration_seconds: timed ? (activity.activity_type === 'GAME' ? 180 : 45) : null, rest_seconds: activity.activity_type === 'GAME' ? 60 : 45, quality_rule: 'Stop the set when technique can no longer be maintained.', regression_id: activity.regression_ids[0] || null, progression_id: activity.progression_ids[0] || null };
}

function outputActivity(activity, blockType, targetFamily) {
  return { activity_id: activity.activity_id, name: activity.name, activity_type: activity.activity_type, movement_family: activity.movement_families.includes(targetFamily) ? targetFamily : activity.movement_families[0], block_type: blockType, prescription: prescriptionFor(activity, blockType), instructions: [...activity.instructions], coaching_cues: [...activity.coaching_cues], common_errors: [...activity.common_errors], stop_conditions: [...activity.stop_conditions], regression: activity.regression_ids[0] || null, progression: activity.progression_ids[0] || null, evidence_tag: { source_ids: [...activity.evidence_tags.source_ids] }, source_rule_ids: [...activity.evidence_tags.rule_ids] };
}

function planYouthFitnessSession(profile, program, sessionSlot, options = {}) {
  if (!validProfile(profile)) return fail('invalid_profile', 'A valid canonical Youth Fitness Profile is required.', 'profile');
  const programValidation = validateYouthFitnessProgram(program);
  if (!programValidation.ok) return fail('invalid_program', 'A valid Phase 4 program is required.', 'program');
  if (program.profile_id !== profile.profile_id || program.participant_ref !== profile.participant_ref || program.training_level !== profile.training_level) return fail('profile_program_mismatch', 'Profile and program identity or training level do not match.', 'program');
  const week = program.weeks.find((item) => item.week_number === sessionSlot?.week_number);
  const canonicalSlot = week?.session_slots.find((item) => item.session_id === sessionSlot?.session_id && item.session_code === sessionSlot?.session_code);
  if (!canonicalSlot || canonicalSlot !== sessionSlot) return fail('orphan_session_slot', 'Session slot must be the canonical slot owned by a valid program week and phase.', 'session_slot');
  if (!program.phases.some((phase) => phase.phase_number === week.phase_number && week.week_number >= phase.start_week && week.week_number <= phase.end_week)) return fail('orphan_session_slot', 'Session slot week must belong to a valid phase.', 'session_slot');
  if (!Array.isArray(sessionSlot.movement_family_targets) || !sessionSlot.movement_family_targets.length) return fail('missing_movement_family_targets', 'Session slot needs movement-family targets.', 'session_slot');
  if (!Array.isArray(sessionSlot.activity_type_targets) || !sessionSlot.activity_type_targets.length) return fail('missing_activity_type_targets', 'Session slot needs activity-type targets.', 'session_slot');

  const avoidImpact = profile.recent_training_summary?.high_impact_recently === true || (profile.recent_training_summary?.recent_stress_tags || []).includes('HIGH') && (profile.recent_training_summary?.recent_stress_tags || []).includes('IMPACT');
  const eligible = activities.filter((item) => feasible(item, profile, avoidImpact));
  if (!eligible.length) return fail('no_eligible_activities', 'No approved activity is feasible for this profile.', 'equipment');
  const used = new Set();
  const choose = (families, types = ['EXERCISE', 'GAME']) => eligible.find((item) => !used.has(item.activity_id) && types.includes(item.activity_type) && families.some((family) => item.movement_families.includes(family)));
  const chooseMany = (families, count) => {
    const selected = [];
    for (const family of families) {
      const item = choose([family], ['EXERCISE']);
      if (item) { used.add(item.activity_id); selected.push(outputActivity(item, 'STRENGTH_ENDURANCE', family)); }
      if (selected.length === count) break;
    }
    return selected;
  };
  const durations = fitDurations(sessionSlot.session_minutes);
  const blocks = blockSpecs.map((spec, index) => ({ block_id: `${sessionSlot.session_id}-B${index + 1}`, block_type: spec[0], name: spec[1], estimated_minutes: durations[index], objective: spec[3], activities: [], coaching_focus: spec[4], intensity_target: spec[5], notes: [] }));
  const addOne = (blockType, families, types) => {
    const item = choose(families, types);
    if (item) { used.add(item.activity_id); blocks.find((block) => block.block_type === blockType).activities.push(outputActivity(item, blockType, families[0])); }
  };
  addOne('DYNAMIC_WARMUP', ['LOCOMOTION', 'MOBILITY', 'SQUAT'], sessionSlot.activity_type_targets);
  addOne('SKILL_MOVEMENT_LEARNING', sessionSlot.movement_family_targets, ['EXERCISE']);
  blocks.find((block) => block.block_type === 'STRENGTH_ENDURANCE').activities.push(...chooseMany(sessionSlot.movement_family_targets, 4));
  addOne('CONDITIONING_GAME', ['MOVEMENT_GAME', 'CONDITIONING', 'LOCOMOTION'], sessionSlot.activity_type_targets.includes('GAME') ? ['GAME'] : sessionSlot.activity_type_targets);
  addOne('MOBILITY_ACTIVE_RECOVERY', ['MOBILITY'], ['EXERCISE', 'GAME']);
  addOne('BREATHING_RECOVERY', ['BREATHING_RECOVERY'], ['EXERCISE']);
  const selected = blocks.flatMap((block) => block.activities);
  if (!selected.length) return fail('no_session_activities', 'No approved activities could fulfill the session slot.', 'session_slot');
  const covered = new Set(selected.map((item) => item.movement_family));
  const warnings = sessionSlot.movement_family_targets.filter((target) => !selected.some((item) => activities.find(({ activity_id }) => activity_id === item.activity_id).movement_families.includes(target))).map((target) => ({ code: 'MOVEMENT_TARGET_UNAVAILABLE', target, message: `No eligible approved activity was available for ${target}; no replacement was invented.` }));
  for (const type of sessionSlot.activity_type_targets) if (!selected.some((item) => item.activity_type === type)) warnings.push({ code: 'ACTIVITY_TYPE_TARGET_UNAVAILABLE', target: type, message: `No eligible approved ${type.toLowerCase()} was available; no activity was invented.` });
  if (avoidImpact) warnings.push({ code: 'RECENT_IMPACT_CONSERVATIVE_FILTER', message: 'Moderate/high-impact activity was excluded because recent impact stress was reported.' });
  const pain = profile.readiness?.pain === true;
  const educationText = program.education_sequence.find((item) => item.week_number === week.week_number)?.topic || 'Recovery is part of training.';
  const blueprint = { session_blueprint_id: `YFSB-${crypto.createHash('sha256').update(`${program.program_id}:${sessionSlot.session_id}:1`).digest('hex').slice(0, 12).toUpperCase()}`, program_id: program.program_id, profile_id: profile.profile_id, participant_ref: profile.participant_ref, week_number: week.week_number, session_code: sessionSlot.session_code, name: profile.age_band === '10_12' ? `${sessionSlot.name}: Practice and Play` : sessionSlot.name, session_focus: sessionSlot.session_focus, training_level: profile.training_level, age_band: profile.age_band, age_presentation: program.age_presentation, requested_minutes: sessionSlot.session_minutes, estimated_minutes: durations.reduce((sum, value) => sum + value, 0), intended_effort: sessionSlot.intended_effort, status: pain ? 'COACH_REVIEW_REQUIRED' : 'PLANNED', available_equipment: [...profile.equipment], blocks, education_message: { message_id: program.education_sequence.find((item) => item.week_number === week.week_number)?.message_id || 'RECOVERY_IS_TRAINING', message: educationText, claim_review: inspectPresentationClaim(educationText) }, coach_notes: pain ? ['Pain was reported. Supervising adult should review before activity.'] : [], participant_notes: profile.age_band === '10_12' ? ['Practice with control and tell an adult if something hurts.'] : ['Prioritize controlled technique and report pain to the supervising adult.'], reflection_prompts: ['What went well today?', 'What movement felt better with practice?', 'How hard did the session feel?'], safety_flags: [...new Set([...program.safety_flags, ...(pain ? ['PAIN_REPORTED_REQUIRES_COACH_REVIEW'] : []), ...(avoidImpact ? ['RECENT_IMPACT_LOAD_REDUCED'] : [])])], movement_family_coverage: [...covered], validation: { ok: true, warnings }, version: 1 };
  const validation = validateYouthFitnessSessionBlueprint(blueprint);
  return validation.ok ? { ok: true, session_blueprint: blueprint } : validation;
}

module.exports = { planYouthFitnessSession, feasible, prescriptionFor };
