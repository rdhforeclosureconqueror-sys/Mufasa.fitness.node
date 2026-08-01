(function installChallengeController(root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ExerciseChallenge = api;
})(typeof window !== 'undefined' ? window : globalThis, function challengeControllerFactory(root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function validateChallengeDefinition(definition) {
    const errors = [];
    if (!definition?.exerciseId) errors.push('exerciseId is required.');
    if (!definition?.sequenceId) errors.push('sequenceId is required.');
    if (!definition?.challenge?.title) errors.push('challenge.title is required.');
    if (!Array.isArray(definition?.challenge?.instructions) || !definition.challenge.instructions.length) errors.push('challenge.instructions must contain at least one instruction.');
    if (!definition?.challenge?.camera?.requiredView) errors.push('challenge.camera.requiredView is required.');
    return { valid: errors.length === 0, errors };
  }
  class ChallengeController {
    constructor({ definition, session, preview = null } = {}) {
      const validation = validateChallengeDefinition(definition);
      if (!validation.valid) throw new TypeError(validation.errors.join(' '));
      if (!session || typeof session.start !== 'function' || typeof session.observe !== 'function' || typeof session.finish !== 'function') throw new TypeError('A compatible exercise session is required.');
      this.definition = clone(definition); this.configuration = clone(definition.challenge); this.session = session; this.preview = preview; this.state = 'idle';
    }
    metadata() { return clone({ exerciseId: this.definition.exerciseId, sequenceId: this.definition.sequenceId, productionEligible: this.definition.status !== 'fixture_not_production', ...this.configuration }); }
    attachPreview(preview) { this.preview = preview; return this; }
    applyMetadata(doc) {
      const set = (id, value) => { const node = doc?.getElementById?.(id); if (node && value) node.textContent = value; };
      set('challengeEyebrow', this.configuration.eyebrow); set('challengeTitle', this.configuration.title); set('challengeInstructions', this.configuration.previewDescription); set('sideConfirmationLabel', this.configuration.camera.confirmationLabel);
      const list = doc?.getElementById?.('cameraInstructions');
      if (list?.replaceChildren) list.replaceChildren(...this.configuration.instructions.map(text => { const item = doc.createElement('li'); item.textContent = text; return item; }));
      return this.metadata();
    }
    start(mode, setup = {}) { this.session.start(mode, setup); this.state = 'active'; return this.state; }
    observe(frame) { if (this.state !== 'active') return null; const result = this.session.observe(frame), expected = this.session.sequenceMatcher?.expected?.(); this.preview?.setLiveTarget?.(expected, frame?.trackingState !== 'LOCKED'); return result; }
    finish() { if (this.state !== 'active') throw new Error('No active challenge session.'); const result = this.session.finish(); this.state = 'summary'; this.preview?.resumePreview?.(); return result; }
    reset() { this.session.reset?.(); this.state = 'idle'; return this.state; }
  }
  function definitionFromDocument(doc = root?.document, registry = root?.ExerciseSequenceDefinitions?.definitions) { const exerciseId = doc?.documentElement?.dataset?.exerciseSequenceId; if (!exerciseId) throw new TypeError('The page must identify an exercise sequence.'); const definition = registry?.[exerciseId]; if (!definition) throw new TypeError(`Unknown exercise sequence: ${exerciseId}.`); return definition; }
  return Object.freeze({ ChallengeController, definitionFromDocument, validateChallengeDefinition });
});
