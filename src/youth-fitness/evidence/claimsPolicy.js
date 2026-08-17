'use strict';

const prohibitedClaimPatterns = Object.freeze([
  /prevents? all injuries/i,
  /guarantees? weight loss/i,
  /movement screen predicts? injury/i,
  /(?:squat )?compensation diagnoses?/i,
  /proprietary score is clinically validated/i,
  /program (?:solely )?caused (?:the |this |an )?(?:individual )?result/i,
]);

function inspectPresentationClaim(text) {
  if (typeof text !== 'string') throw new TypeError('Presentation claim must be a string');
  const pattern = prohibitedClaimPatterns.find((candidate) => candidate.test(text));
  return Object.freeze({ allowed: !pattern, reason: pattern ? 'UNSUPPORTED_OR_PROHIBITED_CLAIM' : null });
}

module.exports = { prohibitedClaimPatterns, inspectPresentationClaim };
