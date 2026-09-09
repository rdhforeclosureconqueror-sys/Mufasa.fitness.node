'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-lunge-preview.js'), 'utf8');

function harness(activeProfileId = 'avaturn-personalized-candidate', options = {}) {
  let loadedAvatar = null;
  let loadedContract = null;
  let clickHandler = null;
  const button = { dataset: {}, disabled: true, textContent: '', title: '', addEventListener(_type, handler) { clickHandler = handler; } };
  const avatarDiagnostics = {
    children: [
      { textContent: 'Profile' },
      { textContent: options.diagnosticProfileId ?? activeProfileId ?? 'none' }
    ]
  };
  const document = {
    getElementById(id) {
      if (id === 'loadSynthesizedLunge') return button;
      if (id === 'avatarDiagnostics') return avatarDiagnostics;
      return null;
    }
  };
  const personalized = Object.freeze({
    avatarId: 'avaturn-personalized-candidate',
    skeletonProfile: 'avaturn-native-v1',
    assetUrl: '/coach.glb'
  });
  const sourceSpec = {
    exerciseId: 'stationary_lunge_left',
    motionId: 'lunge/stationary_left_phase_first_v3_owner_split_plant',
    version: 3.0,
    status: 'development-test-only',
    durationSeconds: 1,
    loop: false,
    skeleton: { id: 'canonical_phase_e_mixamo', rootBone: 'mixamorig:Hips', rotationSpace: 'rest_relative_local' },
    phases: [{
      id: 'split_plant', normalizedTime: 0,
      root: { positionOffset: [0,0,0], rotationOffsetEulerDegrees: [0,0,0] },
      boneTargets: [
        { bone: 'mixamorig:LeftUpLeg', rotationOffsetEulerDegrees: [1,0,0] },
        { bone: 'mixamorig:RightLeg', rotationOffsetEulerDegrees: [2,0,0] }
      ],
      contacts: ['right_rear_forefoot']
    }],
    groundingPolicy: {
      contacts: ['right_rear_forefoot'],
      contactBones: { right_rear_forefoot: 'mixamorig:RightToeBase' },
      kinematicChains: [{
        id: 'right_leg', contact: 'right_rear_forefoot',
        rootBone: 'mixamorig:RightUpLeg', jointBone: 'mixamorig:RightLeg',
        endBone: 'mixamorig:RightFoot', contactBone: 'mixamorig:RightToeBase'
      }]
    },
    acceptedAuthoringAdjustment: {
      type: 'promoted_pose_bundle',
      deltas: [
        { bone: 'mixamorig:LeftUpLeg', axis: 'x', deltaDegrees: 45 },
        { bone: 'mixamorig:RightLeg', axis: 'x', deltaDegrees: -10 },
        { bone: 'mixamorig:RightFoot', axis: 'x', deltaDegrees: 10 }
      ]
    }
  };
  const window = {
    PocketPTAvatarProfiles: { profiles: { personalized } },
    PocketPTLungeMotionSpec: {
      spec: sourceSpec,
      validate(candidate) { return candidate === sourceSpec ? { valid: true, errors: [] } : { valid: false, errors: ['unexpected spec'] }; }
    },
    MotionLabRuntime: {
      snapshot() {
        if (options.snapshotAvatar) return { avatar: { avatarProfileId: activeProfileId }, motion: null };
        if (options.emptySnapshot) return { motion: null };
        return { motion: activeProfileId ? { avatarProfileId: activeProfileId } : null };
      },
      async loadAvatar(profile) { loadedAvatar = profile; return { status: 'ready' }; },
      async loadMotionSpec(contract) { loadedContract = contract; return { status: 'ready', diagnostics: { compiled: true } }; }
    }
  };
  vm.runInNewContext(source, { window, document, Object, String, RegExp });
  return { window, personalized, button, getClickHandler: () => clickHandler, getLoadedAvatar: () => loadedAvatar, getLoadedContract: () => loadedContract };
}

test('canonical lunge bones and v3 pose-bundle bones retarget to the Avaturn coach skeleton', () => {
  const { window } = harness();
  const result = window.PocketPTMotionLabLungePreview.buildCoachSpec(window.PocketPTLungeMotionSpec);
  assert.equal(result.status, 'ready');
  assert.equal(result.spec.skeleton.rootBone, 'Hips');
  assert.equal(result.spec.skeleton.targetSkeletonProfile, 'avaturn-native-v1');
  assert.equal(result.spec.skeleton.targetAvatarProfileId, 'avaturn-personalized-candidate');
  assert.equal(result.spec.phases[0].boneTargets[0].bone, 'LeftUpLeg');
  assert.equal(result.spec.phases[0].boneTargets[1].bone, 'RightLeg');
  assert.equal(result.spec.groundingPolicy.contactBones.right_rear_forefoot, 'RightFoot');
  assert.equal(result.spec.groundingPolicy.kinematicChains[0].rootBone, 'RightUpLeg');
  assert.equal(result.spec.groundingPolicy.kinematicChains[0].jointBone, 'RightLeg');
  assert.equal(result.spec.groundingPolicy.kinematicChains[0].endBone, 'RightFoot');
  assert.equal(result.spec.groundingPolicy.kinematicChains[0].contactBone, 'RightFoot');
  assert.deepEqual(Array.from(result.spec.acceptedAuthoringAdjustment.deltas, item => item.bone), ['LeftUpLeg', 'RightLeg', 'RightFoot']);
  assert.equal(result.diagnostics.sourceMotionVersion, 3.0);
  assert.equal(result.diagnostics.degradedContactAliases.length, 1);
  assert.equal(result.contract.validate(result.spec).valid, true);
});

test('lunge uses runtime avatar snapshot when the personalized coach is already loaded', async () => {
  const h = harness('avaturn-personalized-candidate', { snapshotAvatar: true });
  const result = await h.window.PocketPTMotionLabLungePreview.load();
  assert.equal(result.status, 'ready');
  assert.equal(h.getLoadedAvatar(), null);
  assert.equal(h.getLoadedContract().spec.skeleton.rootBone, 'Hips');
  assert.equal(h.getLoadedContract().validate(h.getLoadedContract().spec).valid, true);
  assert.equal(result.diagnostics.coachAvatarProfileId, 'avaturn-personalized-candidate');
  assert.equal(result.diagnostics.sourceMotionVersion, 3.0);
});

test('older runtime snapshot falls back to Avatar Diagnostics instead of reloading the coach', async () => {
  const h = harness('avaturn-personalized-candidate', { emptySnapshot: true, diagnosticProfileId: 'avaturn-personalized-candidate' });
  const result = await h.window.PocketPTMotionLabLungePreview.load();
  assert.equal(result.status, 'ready');
  assert.equal(h.getLoadedAvatar(), null);
});

test('lunge replaces a non-coach avatar with the personalized coach avatar', async () => {
  const h = harness('phase-e-reference', { emptySnapshot: true, diagnosticProfileId: 'phase-e-reference' });
  const result = await h.window.PocketPTMotionLabLungePreview.load();
  assert.equal(result.status, 'ready');
  assert.equal(h.getLoadedAvatar(), h.personalized);
  assert.equal(h.getLoadedContract().spec.skeleton.targetSkeletonProfile, 'avaturn-native-v1');
});

test('button label follows the current canonical lunge version rather than hardcoding v2.3', () => {
  const h = harness();
  h.window.PocketPTMotionLabLungePreview.wire();
  assert.match(h.button.textContent, /v3/);
  assert.doesNotMatch(h.button.textContent, /v2\.3/);
  assert.equal(typeof h.getClickHandler(), 'function');
});
