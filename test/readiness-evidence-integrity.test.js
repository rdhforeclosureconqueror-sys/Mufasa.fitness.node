'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const evidence=require('../data/readiness/development-evidence.json');

test('PR #840 readiness implementation evidence resolves to the merged commit',()=>{
  const entries=evidence.entries.filter(item=>item.cardId==='avatar-development-mediapipe-pose-engine-test-lab'||item.cardId==='avatar-development-live-mirror-calibration-diagnostics-repair');
  const implementation=entries.filter(item=>item.sourceType==='implementation'&&item.prNumber===840);
  assert.equal(implementation.length,2);
  for(const item of implementation){
    assert.match(item.commitSha,/^[0-9a-f]{40}$/);
    assert.equal(item.commitSha,'542ccf137d09dd82d02a1521c961e7f7fa75efbb');
  }
});
