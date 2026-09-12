'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const runtimeSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'runtime-config.js'), 'utf8');

function fakeStyle() {
  const values = new Map();
  const priorities = new Map();
  return {
    setProperty(name, value, priority = '') { values.set(name, String(value)); priorities.set(name, String(priority)); },
    getPropertyValue(name) { return values.get(name) || ''; },
    getPropertyPriority(name) { return priorities.get(name) || ''; }
  };
}

function fakeElement(id = '') {
  const attrs = new Map();
  return {
    nodeType: 1,
    id,
    style: fakeStyle(),
    dataset: {},
    children: [],
    matches() { return false; },
    querySelectorAll() { return []; },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    appendChild(child) { this.children.push(child); return child; }
  };
}

function bootRuntimeConfig() {
  const body = fakeElement('body');
  const head = fakeElement('head');
  const created = [];
  let observerInstance = null;

  class FakeMutationObserver {
    constructor(callback) { this.callback = callback; observerInstance = this; }
    observe(target, options) { this.target = target; this.options = options; }
  }

  const document = {
    body,
    head,
    documentElement: head,
    readyState: 'complete',
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) {
      const element = fakeElement();
      element.tagName = String(tag).toUpperCase();
      element.defer = false;
      element.src = '';
      element.textContent = '';
      created.push(element);
      return element;
    },
    addEventListener() {}
  };

  const context = { document, MutationObserver: FakeMutationObserver };
  vm.runInNewContext(runtimeSource, context, { filename: 'runtime-config.js' });
  return { context, observer: observerInstance, created };
}

test('late legacy Mirror Motion panel is suppressed immediately while other authorities stay untouched', () => {
  const { context, observer } = bootRuntimeConfig();
  assert.ok(observer, 'presentation observer should install');
  assert.equal(context.PocketPTMirrorPresentationAuthority.dynamicProducerSuppression, true);
  assert.equal(observer.options.childList, true);
  assert.equal(observer.options.subtree, true);
  assert.equal(observer.options.attributes, true);

  const legacy = fakeElement('mirrorMotionCameraReviewDebug');
  legacy.style.setProperty('display', 'block', 'important');
  observer.callback([{ type: 'childList', addedNodes: [legacy] }]);
  assert.equal(legacy.style.getPropertyValue('display'), 'none');
  assert.equal(legacy.style.getPropertyPriority('display'), 'important');
  assert.equal(legacy.getAttribute('aria-hidden'), 'true');

  legacy.style.setProperty('display', 'block', 'important');
  legacy.setAttribute('aria-hidden', 'false');
  observer.callback([{ type: 'attributes', target: legacy, addedNodes: [] }]);
  assert.equal(legacy.style.getPropertyValue('display'), 'none', 'legacy restyle must not reclaim the screen');
  assert.equal(legacy.getAttribute('aria-hidden'), 'true');

  const center = fakeElement('pocketptMirrorDebugCenter');
  center.style.setProperty('display', 'block', 'important');
  observer.callback([{ type: 'childList', addedNodes: [center] }]);
  assert.equal(center.style.getPropertyValue('display'), 'block', 'canonical Mirror Debug Center must remain visible');

  const arenaProducer = fakeElement('bridgeDebugBoard');
  arenaProducer.matches = selector => selector.includes('data-pocketpt-debug-producer');
  arenaProducer.style.setProperty('display', 'block', 'important');
  observer.callback([{ type: 'childList', addedNodes: [arenaProducer] }]);
  assert.equal(arenaProducer.style.getPropertyValue('display'), 'block', 'Mirror authority must not suppress non-Mirror diagnostic producers');
});
