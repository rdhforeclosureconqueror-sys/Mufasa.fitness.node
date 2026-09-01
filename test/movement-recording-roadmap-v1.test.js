'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const roadmapRuntime = require('../public/motion/movement-recording-roadmap');

const roadmap = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/motion/registry/movement-recording-roadmap.v1.json'), 'utf8'));
const scavenger = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/motion/registry/movement-lego-scavenger.v1.json'), 'utf8'));

test('foundation roadmap gives the trainer eight bounded gym captures', () => {
  const tasks = roadmap.foundationSession.tasks;
  assert.equal(roadmap.foundationSession.label, 'Foundation 8');
  assert.equal(tasks.length, 8);
  assert.deepEqual(tasks.map((task) => task.order), [1,2,3,4,5,6,7,8]);
  for (const task of tasks) {
    assert.ok(['front', 'side'].includes(task.view));
    assert.ok([5000, 10000, 15000].includes(task.durationMs));
    assert.ok(task.repetitions.length > 10);
    assert.ok(task.twoDTeaches.length > 0);
    assert.ok(task.animationAdds.length > 0);
    assert.ok(task.animationSearch.length > 0);
    assert.ok(task.helpsCreate.length > 0);
  }
});

test('every roadmap primary and secondary Lego block exists in the scavenger registry', () => {
  const ids = new Set(scavenger.sections.flatMap((section) => section.cards.map((card) => card.id)));
  for (const task of roadmap.foundationSession.tasks) {
    assert.ok(ids.has(task.primaryBlockId), `missing primary ${task.primaryBlockId}`);
    for (const secondary of task.alsoSupports || []) assert.ok(ids.has(secondary), `missing secondary ${secondary}`);
  }
});

test('roadmap distinguishes captured 2D evidence from canonical readiness', () => {
  const task = roadmap.foundationSession.tasks[0];
  assert.equal(roadmapRuntime.taskStatus(task, []).captured, false);
  const recordings = [{ meta: { primitiveId: task.primaryBlockId } }];
  const status = roadmapRuntime.taskStatus(task, recordings);
  assert.equal(status.captured, true);
  assert.equal(status.count, 1);
  assert.match(roadmap.statusMeaning.CAPTURED, /does not mean/i);
});

test('foundation progress is computed only from saved primary-block evidence', () => {
  const tasks = roadmap.foundationSession.tasks;
  const recordings = tasks.slice(0, 3).map((task, index) => ({ recordingId: `r${index}`, meta: { primitiveId: task.primaryBlockId } }));
  const progress = roadmapRuntime.sessionProgress(tasks, recordings);
  assert.deepEqual(progress, { captured: 3, total: 8, complete: false });
});

test('boot loads roadmap only through the existing trainer movement recorder chain', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/boot-core.js'), 'utf8');
  assert.match(source, /movement-recording-roadmap\.js/);
  assert.match(source, /loadTrainerMovementRoadmap\(\)/);
  assert.match(source, /data-coach-template-builder/);
  assert.doesNotMatch(source, /getUserMedia/);
});
