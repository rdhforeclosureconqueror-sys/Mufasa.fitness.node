'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const debug = require('../public/motion/movement-capture-debug');

test('reports the earliest expected pipeline failure instead of later symptoms', () => {
  const checks = debug.deriveChecks({
    trainerHost:true, recorderModule:true, recorderUi:true,
    roadmapModule:false, roadmapUi:false, studioModule:false, studioUi:false,
    poseRuntime:true, poseFrame:false, recorderState:{state:'IDLE',frameCount:0}, latest:null,
    localEvidenceSaved:false, attempted:{capture:false,save:false}
  });
  assert.equal(debug.findFirstFailure(checks)?.id, 'roadmap_module');
});

test('capture/save checks stay neutral until the user actually attempts them', () => {
  const checks = debug.deriveChecks({
    trainerHost:true, recorderModule:true, recorderUi:true,
    roadmapModule:true, roadmapUi:true, studioModule:true, studioUi:true,
    poseRuntime:true, poseFrame:false, recorderState:{state:'IDLE',frameCount:0}, latest:null,
    localEvidenceSaved:false, attempted:{capture:false,save:false}
  });
  assert.equal(debug.findFirstFailure(checks), null);
  assert.equal(checks.find((c) => c.id === 'pose_frame').expected, false);
  assert.equal(checks.find((c) => c.id === 'local_evidence_saved').expected, false);
});

test('after record is attempted, missing canonical pose frame is the first failure', () => {
  const checks = debug.deriveChecks({
    trainerHost:true, recorderModule:true, recorderUi:true,
    roadmapModule:true, roadmapUi:true, studioModule:true, studioUi:true,
    poseRuntime:true, poseFrame:false, recorderState:{state:'RECORDING',frameCount:0}, latest:null,
    localEvidenceSaved:false, attempted:{capture:true,save:false}
  });
  assert.equal(debug.findFirstFailure(checks)?.id, 'pose_frame');
});

test('after save, missing front/side tag is surfaced before missing checkpoints', () => {
  const latest = { meta:{primitiveId:'crouch'}, summary:{frameCount:40}, poseCheckpoints:[] };
  const checks = debug.deriveChecks({
    trainerHost:true, recorderModule:true, recorderUi:true,
    roadmapModule:true, roadmapUi:true, studioModule:true, studioUi:true,
    poseRuntime:true, poseFrame:true, recorderState:{state:'RECORDED',frameCount:40}, latest,
    localEvidenceSaved:true, attempted:{capture:true,save:true}
  });
  assert.equal(debug.findFirstFailure(checks)?.id, 'capture_view_tagged');
});

test('boot chain loads debug only after capture studio and does not create camera ownership', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/boot-core.js'), 'utf8');
  const studioLoaded = source.indexOf("renderBootStatus('movement-capture-studio-loaded')");
  const debugCall = source.indexOf('loadMovementCaptureDebug()', studioLoaded);
  assert.ok(studioLoaded >= 0 && debugCall > studioLoaded);
  assert.match(source, /movement-capture-debug\.js/);
  assert.doesNotMatch(source, /getUserMedia/);
});
