'use strict';

const {
  EVIDENCE_CLASSES,
  isEvidenceClass,
  isClaimStrength,
} = require('./classifications');

const RULE_REQUIRED_FIELDS = Object.freeze([
  'rule_id', 'name', 'category', 'description', 'evidence_class',
  'claim_strength', 'source_ids', 'hard_rule', 'admin_override', 'active',
  'evidence_version',
]);

const SOURCE_REQUIRED_FIELDS = Object.freeze([
  'source_id', 'title', 'authors', 'year', 'publication', 'url',
  'source_type', 'population', 'supports', 'does_not_establish',
  'evidence_class_default', 'last_reviewed', 'active',
]);

function requireFields(value, fields, kind) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${kind} must be an object`);
  }
  const missing = fields.filter((field) => value[field] === undefined || value[field] === null);
  if (missing.length) throw new TypeError(`${kind} missing required fields: ${missing.join(', ')}`);
}

function requireNonEmptyStrings(values, field, kind) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new TypeError(`${kind}.${field} must be a non-empty array of strings`);
  }
}

function validateEvidenceSource(source) {
  requireFields(source, SOURCE_REQUIRED_FIELDS, 'Evidence source');
  if (!/^SRC\d{3}$/.test(source.source_id)) throw new TypeError('Evidence source.source_id must match SRC###');
  if (!isEvidenceClass(source.evidence_class_default)) throw new TypeError(`Invalid evidence class: ${source.evidence_class_default}`);
  requireNonEmptyStrings(source.authors, 'authors', 'Evidence source');
  requireNonEmptyStrings(source.supports, 'supports', 'Evidence source');
  requireNonEmptyStrings(source.does_not_establish, 'does_not_establish', 'Evidence source');
  if (!Number.isInteger(source.year) || typeof source.active !== 'boolean') throw new TypeError('Evidence source has invalid year or active value');
  return Object.freeze({ ...source, authors: Object.freeze([...source.authors]), supports: Object.freeze([...source.supports]), does_not_establish: Object.freeze([...source.does_not_establish]) });
}

function validateYouthFitnessRule(rule, sourceIds) {
  requireFields(rule, RULE_REQUIRED_FIELDS, 'Youth fitness rule');
  if (!/^YT-R-\d{3}$/.test(rule.rule_id)) throw new TypeError('Youth fitness rule.rule_id must match YT-R-###');
  if (!isEvidenceClass(rule.evidence_class)) throw new TypeError(`Invalid evidence class: ${rule.evidence_class}`);
  if (!isClaimStrength(rule.claim_strength)) throw new TypeError(`Invalid claim strength: ${rule.claim_strength}`);
  requireNonEmptyStrings(rule.source_ids, 'source_ids', 'Youth fitness rule');
  const unknown = sourceIds ? rule.source_ids.filter((id) => !sourceIds.has(id)) : [];
  if (unknown.length) throw new TypeError(`Unknown evidence source IDs: ${unknown.join(', ')}`);
  for (const field of ['hard_rule', 'admin_override', 'active']) {
    if (typeof rule[field] !== 'boolean') throw new TypeError(`Youth fitness rule.${field} must be boolean`);
  }
  if (!Number.isInteger(rule.evidence_version) || rule.evidence_version < 1) throw new TypeError('Youth fitness rule.evidence_version must be a positive integer');
  if (rule.hard_rule && rule.admin_override) throw new TypeError('Hard youth fitness rules cannot allow admin override');
  if (rule.evidence_class === EVIDENCE_CLASSES.CONSERVATIVE_PROGRAM_POLICY && rule.claim_strength !== 'PROGRAM_POLICY') {
    throw new TypeError('Conservative program policy must use PROGRAM_POLICY claim strength');
  }
  return Object.freeze({ ...rule, source_ids: Object.freeze([...rule.source_ids]) });
}

module.exports = { RULE_REQUIRED_FIELDS, SOURCE_REQUIRED_FIELDS, validateEvidenceSource, validateYouthFitnessRule };
