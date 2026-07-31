(function installGuidedExerciseSequence(globalScope, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (globalScope) globalScope.GuidedExerciseSequence = api;
})(typeof window !== 'undefined' ? window : globalThis, function guidedExerciseSequenceFactory() {
  'use strict';

  const PUSH_UP_SEQUENCE = Object.freeze([
    Object.freeze({ label: 'Top position', position: 'top' }),
    Object.freeze({ label: 'Bottom position', position: 'bottom' }),
    Object.freeze({ label: 'Top position', position: 'top' })
  ]);

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
      preview.setAttribute('aria-label', `Push-up demonstration in the ${step.position} position`);
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
    return player;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(document), { once: true });
    else mount(document);
  }
  return Object.freeze({ PUSH_UP_SEQUENCE, SequencePlayer, mount });
});
