'use strict';

const { activities, getApprovedActivity, MOVEMENT_FAMILIES, ACTIVITY_TYPES, TRAINING_LEVELS, AGE_PRESENTATION_BANDS, APPROVAL_STATUSES } = require('../activities');
const { SESSION_BLOCK_TYPES, SESSION_BLUEPRINT_STATUSES, LEVEL_RANK } = require('./constants');

const values = (enumeration) => new Set(Object.values(enumeration));
const fail = (error, message, field) => ({ ok: false, error, message, field });
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const listOfText = (value) => Array.isArray(value) && value.length > 0 && value.every(text);
const diagnosisPattern = /\b(diagnos(?:e|ed|is)|cure[sd]?|treats?|fix(?:es|ed)? (?:your|the)|injur(?:y|ed)|disease|disorder)\b/i;
const prohibitedPattern = /\b(max(?:imal|imum)? lift|one[- ]rep max|train(?:ing)? to failure|punishment|until (?:collapse|vomit)|burpee punishment|powerlifting|bodybuilding)\b/i;

function allStrings(value, found = []) {
  if (typeof value === 'string') found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => allStrings(item, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => allStrings(item, found));
  return found;
}

function validateYouthFitnessSessionBlueprint(blueprint) {
  if (!blueprint || typeof blueprint !== 'object' || Array.isArray(blueprint)) return fail('invalid_session_blueprint', 'Session blueprint must be an object.', 'session_blueprint');
  for (const field of ['session_blueprint_id', 'program_id', 'profile_id', 'participant_ref', 'session_code', 'name', 'session_focus']) {
    if (!text(blueprint[field])) return fail(`missing_${field}`, `${field} is required.`, field);
  }
  if (!Number.isInteger(blueprint.week_number) || blueprint.week_number < 1) return fail('invalid_week_number', 'week_number must be a positive integer.', 'week_number');
  if (!values(TRAINING_LEVELS).has(blueprint.training_level)) return fail('invalid_training_level', 'training_level is unsupported.', 'training_level');
  if (!values(AGE_PRESENTATION_BANDS).has(blueprint.age_band)) return fail('invalid_age_band', 'age_band is unsupported.', 'age_band');
  if (!values(SESSION_BLUEPRINT_STATUSES).has(blueprint.status)) return fail('invalid_session_status', 'status is unsupported.', 'status');
  if (!Array.isArray(blueprint.blocks) || blueprint.blocks.length === 0) return fail('missing_blocks', 'At least one session block is required.', 'blocks');
  if (blueprint.blocks.some(({ block_type }) => !values(SESSION_BLOCK_TYPES).has(block_type))) return fail('invalid_block_type', 'Block type is unsupported.', 'blocks');
  if (!blueprint.blocks.some(({ block_type }) => block_type === 'READINESS')) return fail('missing_readiness_block', 'A readiness block is required.', 'blocks');
  let total = 0;
  for (const [blockIndex, block] of blueprint.blocks.entries()) {
    if (!values(SESSION_BLOCK_TYPES).has(block.block_type)) return fail('invalid_block_type', 'Block type is unsupported.', `blocks.${blockIndex}.block_type`);
    if (!text(block.block_id) || !text(block.name) || !text(block.objective) || !text(block.coaching_focus) || !text(block.intensity_target) || !Array.isArray(block.activities)) return fail('invalid_block', 'Block metadata is incomplete.', `blocks.${blockIndex}`);
    if (!Number.isInteger(block.estimated_minutes) || block.estimated_minutes < 1) return fail('invalid_block_duration', 'Block duration must be a positive integer.', `blocks.${blockIndex}.estimated_minutes`);
    total += block.estimated_minutes;
    for (const [activityIndex, selected] of block.activities.entries()) {
      const field = `blocks.${blockIndex}.activities.${activityIndex}`;
      const registry = getApprovedActivity(selected.activity_id);
      if (!registry) return fail('activity_not_approved_or_available', 'Activity must be available in the approved youth registry.', `${field}.activity_id`);
      if (registry.approval.status !== APPROVAL_STATUSES.APPROVED || !activities.includes(registry)) return fail('activity_not_approved_or_available', 'Activity must be approved and available.', `${field}.activity_id`);
      if (selected.name !== registry.name || selected.activity_type !== registry.activity_type) return fail('activity_registry_mismatch', 'Selected activity metadata must match the registry.', field);
      if (!values(ACTIVITY_TYPES).has(selected.activity_type) || !values(MOVEMENT_FAMILIES).has(selected.movement_family) || !registry.movement_families.includes(selected.movement_family)) return fail('unsupported_activity_metadata', 'Activity type and movement family must be canonical and registry-supported.', field);
      if (selected.block_type !== block.block_type) return fail('activity_block_mismatch', 'Activity block type must match its parent block.', `${field}.block_type`);
      if (LEVEL_RANK[registry.minimum_training_level] > LEVEL_RANK[blueprint.training_level]) return fail('activity_above_training_level', 'Activity exceeds the participant training level.', `${field}.activity_id`);
      if (!registry.equipment.every((item) => blueprint.available_equipment.includes(item))) return fail('equipment_mismatch', 'Available equipment does not satisfy the activity requirements.', `${field}.activity_id`);
      if (!listOfText(selected.instructions)) return fail('missing_instructions', 'Every activity needs instructions.', `${field}.instructions`);
      if (!listOfText(selected.coaching_cues)) return fail('missing_coaching_cues', 'Every activity needs coaching cues.', `${field}.coaching_cues`);
      if (!listOfText(selected.stop_conditions)) return fail('missing_stop_conditions', 'Every activity needs stop conditions.', `${field}.stop_conditions`);
      if (!selected.prescription || ![1, 2].includes(selected.prescription.sets) || selected.prescription.rest_seconds < 30 || selected.prescription.rest_seconds > 90 || !text(selected.prescription.quality_rule)) return fail('unsafe_prescription', 'Prescription must stay within conservative Phase 5 bounds.', `${field}.prescription`);
      if (!selected.evidence_tag || !listOfText(selected.evidence_tag.source_ids) || !listOfText(selected.source_rule_ids)) return fail('missing_provenance', 'Every activity needs evidence and rule provenance.', field);
    }
  }
  if (total !== blueprint.estimated_minutes || total < blueprint.requested_minutes - 10 || total > blueprint.requested_minutes + 5) return fail('duration_outside_tolerance', 'Block duration is outside the session-minute tolerance.', 'estimated_minutes');
  const strings = allStrings(blueprint);
  if (strings.some((item) => prohibitedPattern.test(item))) return fail('prohibited_prescription', 'Session contains prohibited automatic prescription language.', 'session_blueprint');
  if (strings.some((item) => diagnosisPattern.test(item))) return fail('medical_diagnosis_language', 'Session must not contain diagnostic or treatment claims.', 'session_blueprint');
  if (!blueprint.education_message || !text(blueprint.education_message.message) || blueprint.education_message.claim_review?.allowed !== true) return fail('invalid_education_message', 'A claim-inspected education message is required.', 'education_message');
  return { ok: true, session_blueprint: blueprint };
}

module.exports = { validateYouthFitnessSessionBlueprint };
