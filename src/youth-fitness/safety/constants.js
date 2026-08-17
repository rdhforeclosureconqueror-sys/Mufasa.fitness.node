'use strict';

function enumValues(items) {
  return Object.freeze(Object.fromEntries(items.map((item) => [item, item])));
}

const SAFETY_STATUSES = enumValues(['SAFE_TO_DELIVER', 'SAFE_WITH_WARNINGS', 'COACH_REVIEW_REQUIRED', 'BLOCKED_UNSAFE', 'INVALID_SESSION', 'REGENERATE_REQUIRED']);
const SAFETY_DECISIONS = enumValues(['ALLOW', 'ALLOW_WITH_WARNINGS', 'REQUIRE_COACH_REVIEW', 'BLOCK', 'REGENERATE', 'REGRESS_OR_REDUCE']);
const RULE_STATUSES = enumValues(['PASS', 'WARN', 'FAIL', 'NOT_APPLICABLE']);
const RULE_SEVERITIES = enumValues(['HARD', 'WARNING', 'INFO']);

module.exports = { SAFETY_STATUSES, SAFETY_DECISIONS, RULE_STATUSES, RULE_SEVERITIES };
