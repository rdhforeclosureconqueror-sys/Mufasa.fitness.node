'use strict';

const constants = require('./constants');

const REQUIRED_FIELDS = Object.freeze(['activity_id', 'activity_type', 'name', 'description', 'movement_families', 'minimum_training_level', 'age_presentation_bands', 'impact_level', 'equipment', 'instructions', 'coaching_cues', 'common_errors', 'stop_conditions', 'regression_ids', 'progression_ids', 'evidence_tags', 'approval']);

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
}

function stringList(value, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && !value.length) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new TypeError(`${field} must be ${allowEmpty ? 'an' : 'a non-empty'} array of strings`);
  }
}

function enumList(value, field, enumeration) {
  stringList(value, field);
  const unknown = value.filter((item) => !constants.isEnumValue(enumeration, item));
  if (unknown.length) throw new TypeError(`Invalid ${field}: ${unknown.join(', ')}`);
  if (new Set(value).size !== value.length) throw new TypeError(`${field} must not contain duplicates`);
}

function validateEvidenceTags(tags, evidenceContext = {}) {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) throw new TypeError('evidence_tags must be an object');
  stringList(tags.source_ids, 'evidence_tags.source_ids');
  stringList(tags.rule_ids, 'evidence_tags.rule_ids');
  const unknownSources = evidenceContext.sourceIds ? tags.source_ids.filter((id) => !evidenceContext.sourceIds.has(id)) : [];
  const unknownRules = evidenceContext.ruleIds ? tags.rule_ids.filter((id) => !evidenceContext.ruleIds.has(id)) : [];
  if (unknownSources.length) throw new TypeError(`Unknown evidence source IDs: ${unknownSources.join(', ')}`);
  if (unknownRules.length) throw new TypeError(`Unknown youth fitness rule IDs: ${unknownRules.join(', ')}`);
}

function validateApproval(approval) {
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) throw new TypeError('approval must be an object');
  if (!constants.isEnumValue(constants.APPROVAL_STATUSES, approval.status)) throw new TypeError(`Invalid approval status: ${approval.status}`);
  if (!Number.isInteger(approval.version) || approval.version < 1) throw new TypeError('approval.version must be a positive integer');
  if (approval.status === constants.APPROVAL_STATUSES.APPROVED) {
    nonEmptyString(approval.approved_by, 'approval.approved_by');
    nonEmptyString(approval.approved_at, 'approval.approved_at');
  }
}

function validateActivity(activity, evidenceContext) {
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) throw new TypeError('Activity must be an object');
  const missing = REQUIRED_FIELDS.filter((field) => activity[field] === undefined || activity[field] === null);
  if (missing.length) throw new TypeError(`Activity missing required fields: ${missing.join(', ')}`);
  if (!/^YF-(EX|GM)-\d{3}$/.test(activity.activity_id)) throw new TypeError('activity_id must match YF-EX-### or YF-GM-###');
  if (!constants.isEnumValue(constants.ACTIVITY_TYPES, activity.activity_type)) throw new TypeError(`Invalid activity_type: ${activity.activity_type}`);
  if ((activity.activity_type === 'EXERCISE') !== activity.activity_id.startsWith('YF-EX-')) throw new TypeError('activity_id prefix must match activity_type');
  nonEmptyString(activity.name, 'name');
  nonEmptyString(activity.description, 'description');
  enumList(activity.movement_families, 'movement_families', constants.MOVEMENT_FAMILIES);
  if (activity.activity_type === 'GAME' && !activity.movement_families.includes('MOVEMENT_GAME')) throw new TypeError('Games must include MOVEMENT_GAME family');
  if (!constants.isEnumValue(constants.TRAINING_LEVELS, activity.minimum_training_level)) throw new TypeError(`Invalid minimum_training_level: ${activity.minimum_training_level}`);
  enumList(activity.age_presentation_bands, 'age_presentation_bands', constants.AGE_PRESENTATION_BANDS);
  if (!constants.isEnumValue(constants.IMPACT_LEVELS, activity.impact_level)) throw new TypeError(`Invalid impact_level: ${activity.impact_level}`);
  enumList(activity.equipment, 'equipment', constants.EQUIPMENT);
  for (const field of ['instructions', 'coaching_cues', 'common_errors', 'stop_conditions']) stringList(activity[field], field);
  for (const field of ['regression_ids', 'progression_ids']) stringList(activity[field], field, { allowEmpty: true });
  validateEvidenceTags(activity.evidence_tags, evidenceContext);
  validateApproval(activity.approval);
  return Object.freeze({ ...activity, movement_families: Object.freeze([...activity.movement_families]), age_presentation_bands: Object.freeze([...activity.age_presentation_bands]), equipment: Object.freeze([...activity.equipment]), instructions: Object.freeze([...activity.instructions]), coaching_cues: Object.freeze([...activity.coaching_cues]), common_errors: Object.freeze([...activity.common_errors]), stop_conditions: Object.freeze([...activity.stop_conditions]), regression_ids: Object.freeze([...activity.regression_ids]), progression_ids: Object.freeze([...activity.progression_ids]), evidence_tags: Object.freeze({ source_ids: Object.freeze([...activity.evidence_tags.source_ids]), rule_ids: Object.freeze([...activity.evidence_tags.rule_ids]) }), approval: Object.freeze({ ...activity.approval }) });
}

function validateActivityRegistry(activities, evidenceContext) {
  if (!Array.isArray(activities) || !activities.length) throw new TypeError('Activity registry must be a non-empty array');
  const validated = activities.map((activity) => validateActivity(activity, evidenceContext));
  const ids = new Set();
  for (const activity of validated) {
    if (ids.has(activity.activity_id)) throw new TypeError(`Duplicate activity ID: ${activity.activity_id}`);
    ids.add(activity.activity_id);
  }
  for (const activity of validated) {
    for (const relationId of [...activity.regression_ids, ...activity.progression_ids]) {
      if (!ids.has(relationId)) throw new TypeError(`Unknown activity relationship ID: ${relationId}`);
      if (relationId === activity.activity_id) throw new TypeError(`Activity cannot reference itself: ${relationId}`);
    }
  }
  return Object.freeze(validated);
}

module.exports = { REQUIRED_FIELDS, validateActivity, validateActivityRegistry };
