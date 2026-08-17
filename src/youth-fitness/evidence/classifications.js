'use strict';

const EVIDENCE_CLASSES = Object.freeze({
  EVIDENCE_CONSENSUS: 'EVIDENCE_CONSENSUS',
  VALIDATED_TEST_PROTOCOL: 'VALIDATED_TEST_PROTOCOL',
  RESEARCH_SUPPORTED: 'RESEARCH_SUPPORTED',
  CONSERVATIVE_PROGRAM_POLICY: 'CONSERVATIVE_PROGRAM_POLICY',
  COACH_CONFIGURABLE: 'COACH_CONFIGURABLE',
});

const CLAIM_STRENGTHS = Object.freeze({
  CONSENSUS: 'CONSENSUS',
  SUPPORTED: 'SUPPORTED',
  PROGRAM_POLICY: 'PROGRAM_POLICY',
  CONFIGURABLE: 'CONFIGURABLE',
});

const evidenceClassValues = Object.freeze(Object.values(EVIDENCE_CLASSES));
const claimStrengthValues = Object.freeze(Object.values(CLAIM_STRENGTHS));

function isEvidenceClass(value) {
  return evidenceClassValues.includes(value);
}

function isClaimStrength(value) {
  return claimStrengthValues.includes(value);
}

module.exports = {
  EVIDENCE_CLASSES,
  CLAIM_STRENGTHS,
  evidenceClassValues,
  claimStrengthValues,
  isEvidenceClass,
  isClaimStrength,
};
