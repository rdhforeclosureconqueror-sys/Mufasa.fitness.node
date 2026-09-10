'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = file => JSON.parse(read(file));

const TEMPLATE = 'public/motion/yoga/motion-description-template.v1.json';
const REGISTRY = 'public/motion/yoga/beginner-flow-motion-descriptions.v1.json';

const expectedIds = ['mountain','chair','warrior-ii','downward-dog','cobra','bridge'];

test('Beginner Full-Body Flow exposes exactly six ordered motion descriptions', () => {
  const registry = json(REGISTRY);
  assert.equal(registry.sessionId, 'beginner-flow');
  assert.deepEqual(registry.descriptions.map(item => item.exerciseId), expectedIds);
});

test('all six yoga descriptions satisfy the reusable Motion Description Template', () => {
  const template = json(TEMPLATE);
  const registry = json(REGISTRY);
  assert.equal(template.templateId, 'pocketpt-motion-description-v1');
  for (const description of registry.descriptions) {
    for (const field of template.required) {
      assert.notEqual(description[field], undefined, `${description.exerciseId} missing ${field}`);
      if (Array.isArray(description[field])) assert.ok(description[field].length > 0, `${description.exerciseId} has empty ${field}`);
    }
    assert.equal(description.source.domain, 'yoga');
    assert.equal(description.source.sessionId, 'beginner-flow');
    assert.equal(description.source.poseId, description.exerciseId);
    assert.equal(description.timing.repetitions, 1);
    assert.ok(description.visualAcceptance.length >= 5);
  }
});

test('descriptions carry support, trajectory and orientation information needed beyond pose recognition', () => {
  const byId = new Map(json(REGISTRY).descriptions.map(item => [item.exerciseId, item]));
  assert.ok(byId.get('mountain').supports.some(x => /left foot planted/i.test(x)));
  assert.ok(byId.get('chair').trajectory.some(x => /hips travel/i.test(x)));
  assert.ok(byId.get('warrior-ii').orientation.some(x => /palms face floor/i.test(x)));
  assert.equal(byId.get('downward-dog').supports.length, 4);
  assert.ok(byId.get('cobra').supports.some(x => /pelvis/i.test(x)));
  assert.ok(byId.get('bridge').supports.some(x => /head supported/i.test(x)));
});

test('Yoga UI exposes Motion Animation only through beginner-flow handoff wiring', () => {
  const source = read('public/yoga.js');
  assert.match(source, /BEGINNER_FLOW_ID="beginner-flow"/);
  assert.match(source, /data-motion-animation>Motion Animation/);
  assert.match(source, /active\.id===BEGINNER_FLOW_ID/);
  assert.match(source, /pocketpt\.motionGenerationRequest\.v1/);
  assert.match(source, /\/motion-lab\/\?motionSource=yoga&session=/);
  assert.match(source, /\/motion\/yoga\/beginner-flow-motion-descriptions\.v1\.json/);
});

test('Motion Lab loads Yoga intake through protected JS route and intake uses public description JSON', () => {
  const html = read('motion-lab/index.html');
  const intake = read('public/motion/yoga-motion-description-intake.js');
  assert.match(html, /\/dev\/motion-lab-assets\/yoga-motion-description-intake\.js/);
  assert.match(intake, /\/motion\/yoga\/motion-description-template\.v1\.json/);
  assert.match(intake, /\/motion\/yoga\/beginner-flow-motion-descriptions\.v1\.json/);
  assert.match(intake, /Yoga Motion Description Intake/);
});

test('Motion Lab intake exposes explicit first-boundary diagnostics through playable-demo boundary', () => {
  const intake = read('public/motion/yoga-motion-description-intake.js');
  for (const id of ['handoff','resources','description','template','request','generator','coach','compile','playback']) {
    assert.match(intake, new RegExp(`stage\\("${id}"`), `missing diagnostic stage ${id}`);
  }
  assert.match(intake, /DESCRIPTION_TEMPLATE_INVALID/);
  assert.match(intake, /DESCRIPTION_RESOURCES_UNAVAILABLE/);
  assert.match(intake, /pocketpt:motion-generation-request/);
  assert.match(intake, /pocketpt:motion-description-ready/);
});
