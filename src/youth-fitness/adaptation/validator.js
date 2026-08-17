'use strict';

const { SORENESS_LEVELS } = require('../profiles');
const { COMPLETION_STATUSES, COMPLETION_QUALITIES, REPORTED_EFFORTS, TECHNIQUE_QUALITIES, ADJUSTMENT_TYPES, ADJUSTMENT_SCOPES } = require('./constants');

const values = (enumeration) => new Set(Object.values(enumeration));
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const fail = (error, message, field) => ({ ok: false, error, message, field });

function validateSessionCompletionResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return fail('invalid_session_result', 'Session result must be a canonical object.', 'session_result');
  for (const field of ['session_result_id', 'session_blueprint_id', 'program_id', 'profile_id', 'participant_ref', 'session_code']) if (!text(result[field])) return fail(`missing_${field}`, `${field} is required.`, field);
  if (!Number.isInteger(result.week_number) || result.week_number < 1) return fail('invalid_week_number', 'week_number must be a positive integer.', 'week_number');
  if (!values(COMPLETION_STATUSES).has(result.status)) return fail('unknown_completion_status', 'Completion status is unsupported.', 'status');
  if (!values(COMPLETION_QUALITIES).has(result.completion_quality)) return fail('unknown_completion_quality', 'Completion quality is unsupported.', 'completion_quality');
  if (!Array.isArray(result.completed_blocks) || !Array.isArray(result.skipped_blocks) || !Array.isArray(result.coach_notes) || !Array.isArray(result.safety_flags)) return fail('invalid_session_result_lists', 'Completion block, note, and safety fields must be arrays.', 'session_result');
  if (!values(REPORTED_EFFORTS).has(result.reported_effort)) return fail('invalid_reported_effort', 'reported_effort is unsupported.', 'reported_effort');
  if (!values(TECHNIQUE_QUALITIES).has(result.technique_quality)) return fail('invalid_technique_quality', 'technique_quality is unsupported.', 'technique_quality');
  const readiness = result.readiness_after;
  if (!readiness || !Number.isInteger(readiness.energy) || readiness.energy < 1 || readiness.energy > 5 || !values(SORENESS_LEVELS).has(readiness.soreness) || typeof readiness.pain !== 'boolean') return fail('invalid_readiness_after', 'readiness_after requires energy 1-5, canonical soreness, and boolean pain.', 'readiness_after');
  if (result.status === 'BLOCKED_BY_SAFETY' && ['SUCCESSFUL', 'SUCCESSFUL_WITH_WARNINGS', 'TOO_EASY'].includes(result.completion_quality)) return fail('safety_block_cannot_be_successful', 'A safety-blocked session cannot be a successful completion.', 'completion_quality');
  if (result.status === 'STOPPED_EARLY' && (readiness.pain || result.completion_quality === 'PAIN_REPORTED') && !result.safety_flags.includes('PAIN_REPORTED_REQUIRES_COACH_REVIEW')) return fail('pain_stop_requires_safety_flag', 'A pain-related early stop requires coach-review routing.', 'safety_flags');
  if (result.version !== 1) return fail('invalid_session_result_version', 'Session result version must be 1.', 'version');
  return { ok: true, session_result: result };
}

function validateNextSessionAdjustment(adjustment) {
  if (!adjustment || typeof adjustment !== 'object' || !values(ADJUSTMENT_TYPES).has(adjustment.adjustment_type)) return fail('invalid_adjustment_type', 'Adjustment type is unsupported.', 'adjustment_type');
  if (!adjustment.target || !values(ADJUSTMENT_SCOPES).has(adjustment.target.scope)) return fail('invalid_adjustment_target', 'Adjustment target scope is unsupported.', 'target.scope');
  if (!adjustment.change || typeof adjustment.change !== 'object' || Array.isArray(adjustment.change)) return fail('invalid_adjustment_change', 'Adjustment change must be an object.', 'change');
  if (!text(adjustment.reason_code) || adjustment.requires_safety_revalidation !== true) return fail('invalid_adjustment_audit', 'Adjustment needs a reason and Phase 6 revalidation.', 'adjustment');
  return { ok: true, adjustment };
}

module.exports = { validateSessionCompletionResult, validateNextSessionAdjustment };
