(function installGuidedExerciseSequence(globalScope, factory) {
  'use strict';
  const api = factory(globalScope);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (globalScope) globalScope.GuidedExerciseSequence = api;
})(typeof window !== 'undefined' ? window : globalThis, function guidedExerciseSequenceFactory(globalScope) {
  'use strict';

  const loadedDefinition = globalScope.ExerciseSequenceDefinitions?.pushUp || (typeof require === 'function' ? require('./exercise-sequence-definitions').pushUp : null);
  const stepsFromDefinition = definition => Object.freeze(definition.visualTemplate.steps.map(step => Object.freeze({ label:step.label, position:step.visual, phaseId:step.phaseId })));
  const PUSH_UP_SEQUENCE = stepsFromDefinition(loadedDefinition);

  class SequencePlayer {
    constructor({ steps = PUSH_UP_SEQUENCE, intervalMs = 1600, onStep = () => {}, setTimer = setInterval, clearTimer = clearInterval } = {}) {
      this.steps = steps;
      this.intervalMs = intervalMs;
      this.onStep = onStep;
      this.setTimer = setTimer;
      this.clearTimer = clearTimer;
      this.index = 0;
      this.timer = null;
    }
    render() { this.onStep(this.steps[this.index], this.index); }
    start() { if (this.timer) return; this.render(); this.timer = this.setTimer(() => { this.index = (this.index + 1) % this.steps.length; this.render(); }, this.intervalMs); }
    pause() { if (!this.timer) return; this.clearTimer(this.timer); this.timer = null; }
    toggle() { if (this.timer) this.pause(); else this.start(); return Boolean(this.timer); }
    showPosition(position) { const index=this.steps.findIndex(step=>step.position===position);this.index=index<0?0:index;this.render(); }
  }

  function mount(document) {
    const preview = document.getElementById('movementPreview');
    const title = document.getElementById('guidedPreviewTitle');
    const list = document.getElementById('sequenceSteps');
    const toggle = document.getElementById('previewToggle');
    if (!preview || !title || !list || !toggle) return null;
    const items = Array.from(list.children);
    const player = new SequencePlayer({ onStep(step, index) {
      preview.dataset.position = step.position;
      preview.setAttribute('aria-label', `${loadedDefinition.exerciseId} demonstration in the ${step.position} position`);
      title.textContent = step.label;
      items.forEach((item, itemIndex) => {
        if (itemIndex === index) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
    }});
    toggle.addEventListener('click', () => {
      const running = player.toggle();
      toggle.textContent = running ? 'Pause preview' : 'Play preview';
      toggle.setAttribute('aria-pressed', String(!running));
    });
    player.start();
    player.setLiveTarget = (expected, trackingPaused = false) => {
      player.pause();
      const targets = Object.fromEntries(loadedDefinition.phases.map(phase => [phase.id.toUpperCase(), { position:phase.visual, title:phase.label, next:`Next: ${phase.nextLabel}${phase.nextLabel.toLowerCase().includes('position') ? '' : phase.id === 'top' || phase.id === 'bottom' || phase.id === 'top_complete' ? ' position' : ''}` }]));
      const target = targets[expected] || targets[loadedDefinition.initialPhase.toUpperCase()];
      player.showPosition(target.position);
      title.textContent = trackingPaused ? 'Tracking unclear' : target.title;
      const next = document.getElementById('guidedPreviewNext');
      if (next) next.textContent = trackingPaused ? 'Sequence progress is paused.' : target.next;
      preview.dataset.expectedPhase = expected || 'TOP';
      toggle.hidden = true;
    };
    player.resumePreview = () => { toggle.hidden=false;player.start(); };
    if (globalScope) globalScope.__guidedSequencePlayer = player;
    return player;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(document), { once: true });
    else mount(document);
  }
  return Object.freeze({ PUSH_UP_SEQUENCE, stepsFromDefinition, SequencePlayer, mount });
});
