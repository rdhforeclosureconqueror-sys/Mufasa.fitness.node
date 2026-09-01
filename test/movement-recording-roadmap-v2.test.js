'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const roadmapApi = require('../public/motion/movement-recording-roadmap');

const roadmap = JSON.parse(fs.readFileSync(path.join(__dirname,'../public/motion/registry/movement-recording-roadmap.v1.json'),'utf8'));

test('foundation roadmap requires front and side for every task', () => {
  for (const task of roadmap.foundationSession.tasks) assert.deepEqual(task.requiredViews, ['front','side']);
});

test('task status remains incomplete until both views exist', () => {
  const task = roadmap.foundationSession.tasks.find((item)=>item.primaryBlockId==='crouch');
  const front = { meta:{ primitiveId:'crouch', captureView:'front' } };
  const side = { meta:{ primitiveId:'crouch', captureView:'side' } };
  let status = roadmapApi.taskStatus(task, []);
  assert.equal(status.captured,false); assert.deepEqual(status.missing,['front','side']);
  status = roadmapApi.taskStatus(task,[front]);
  assert.equal(status.front,true); assert.equal(status.side,false); assert.equal(status.captured,false); assert.deepEqual(status.missing,['side']);
  status = roadmapApi.taskStatus(task,[front,side]);
  assert.equal(status.captured,true); assert.deepEqual(status.missing,[]);
});

test('legacy untagged evidence does not fake paired coverage', () => {
  const task = roadmap.foundationSession.tasks[0];
  const status = roadmapApi.taskStatus(task,[{meta:{primitiveId:task.primaryBlockId}}]);
  assert.equal(status.captured,false);
  assert.equal(status.front,false);
  assert.equal(status.side,false);
});
