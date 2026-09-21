(function (root, factory) {
  const normalized = typeof module === 'object' && module.exports ? require('./motion/normalized-pose') : root.PocketPTNormalizedPose;
  const mirror = typeof module === 'object' && module.exports ? require('./motion/live-avatar-mirror') : root.PocketPTLiveAvatarMirror;
  const api = factory(root, normalized, mirror);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaLiveMotion = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function (root, normalized, mirror) {
  'use strict';

  const VERSION = 1;
  const MIN_CONFIDENCE = .35;
  const CANONICAL_SCRIPTS = Object.freeze([
    '/pose-stability-engine.js?v=20260904-phase2',
    '/mirror-motion-phase2.js?v=20260904-phase2',
    '/mirror-motion-phase3.js?v=20260904-phase3',
    '/mirror-motion-phase4.js?v=20260904-phase4',
    '/mirror-motion-phase5.js?v=20260904-phase5',
    '/mirror-motion-phase6.js?v=20260904-phase6',
    '/mirror-motion-phase7.js?v=20260904-phase7',
    '/mirror-motion-phase8.js?v=20260904-phase8',
    '/mirror-motion-phase9.js?v=20260904-phase9',
    '/mirror-motion-phase10.js?v=20260904-phase10',
    '/mirror-motion-phase11.js?v=20260904-phase11',
    '/mirror-motion-phase12.js?v=20260904-phase12',
    '/mirror-motion-phase13.js?v=20260904-phase13',
    '/mirror-motion-phase14.js?v=20260904-phase14',
    '/mirror-motion-phase15.js?v=20260904-phase15',
    '/mirror-motion-phase16.js?v=20260904-phase16',
    '/mirror-motion-phase17.js?v=20260905-phase17',
    '/mirror-motion-phase18.js?v=20260905-phase18',
    '/mirror-motion-acceptance.js?v=20260905-final-acceptance',
    '/mirror-motion-camera-review.js?v=20260905-closure-b-review',
    '/mirror-motion-camera-activation.js?v=20260905-closure-c-activation'
  ]);
  const SEGMENT_BONES = Object.freeze({
    leftUpperArm: 'LeftArm', leftForearm: 'LeftForeArm', leftThigh: 'LeftUpLeg', leftLowerLeg: 'LeftLeg',
    rightUpperArm: 'RightArm', rightForearm: 'RightForeArm', rightThigh: 'RightUpLeg', rightLowerLeg: 'RightLeg'
  });
  const SEGMENT_CONFIDENCE = Object.freeze({
    leftUpperArm: ['left_shoulder','left_elbow'], leftForearm: ['left_elbow','left_wrist'], leftThigh: ['left_hip','left_knee'], leftLowerLeg: ['left_knee','left_ankle'],
    rightUpperArm: ['right_shoulder','right_elbow'], rightForearm: ['right_elbow','right_wrist'], rightThigh: ['right_hip','right_knee'], rightLowerLeg: ['right_knee','right_ankle']
  });
  const MIRROR_DEBUG_IDS = Object.freeze(Array.from({length: 17}, (_, index) => `mirrorMotionPhase${index + 2}Debug`).concat([
    'mirrorMotionAcceptanceDebug','mirrorMotionCameraReviewDebug','mirrorMotionCameraActivationDebug','mirrorMotionLiveAcceptanceDebug','mirrorMotionLiveAcceptanceControls'
  ]));

  const finiteDirection = value => value && Number.isFinite(value.x) && Number.isFinite(value.y);
  const angle = value => Math.atan2(value.y, value.x);
  const wrap = value => {
    let radians = Number(value) || 0;
    while (radians > Math.PI) radians -= Math.PI * 2;
    while (radians < -Math.PI) radians += Math.PI * 2;
    return radians;
  };
  const zQuaternion = radians => [0, 0, Math.sin(radians / 2), Math.cos(radians / 2)];
  const multiplyQuaternion = (a, b) => [
    a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
    a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
    a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
    a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]
  ];
  function confidence(frame, names) {
    return Math.min(...names.map(name => Number(frame?.joints?.[name]?.confidence || 0)));
  }
  function directionFromJoints(frame, aName, bName) {
    const a = frame?.joints?.[aName], b = frame?.joints?.[bName];
    if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
    const x = Number(b.x) - Number(a.x), y = Number(a.y) - Number(b.y), length = Math.hypot(x, y);
    return length > 1e-6 ? {x: x / length, y: y / length} : null;
  }
  function captureBaseline(frame) {
    const directions = {};
    for (const segment of Object.keys(SEGMENT_BONES)) if (finiteDirection(frame?.directions?.[segment])) directions[segment] = {...frame.directions[segment]};
    if (finiteDirection(frame?.directions?.bodyAxis)) directions.bodyAxis = {...frame.directions.bodyAxis};
    const eyeLine = directionFromJoints(frame, 'left_eye', 'right_eye');
    if (eyeLine) directions.eyeLine = eyeLine;
    return Object.freeze(directions);
  }
  function restRelativeJoints(frame, baseline, processedPacket = {}) {
    const joints = {};
    const bodyCurrent = frame?.directions?.bodyAxis;
    const bodyRest = baseline?.bodyAxis;
    const bodyDelta = finiteDirection(bodyCurrent) && finiteDirection(bodyRest) ? wrap(angle(bodyCurrent) - angle(bodyRest)) : 0;
    const orientation = processedPacket?.orientationIntent || {};
    const yawDeg = Number(orientation.yawIntentDeg || 0);
    const yawRad = Number.isFinite(yawDeg) ? yawDeg * Math.PI / 180 : 0;
    const coreConfidence = confidence(frame, ['left_shoulder','right_shoulder','left_hip','right_hip']);
    if (coreConfidence >= MIN_CONFIDENCE && finiteDirection(bodyCurrent) && finiteDirection(bodyRest)) {
      const yaw = [0, Math.sin(yawRad / 2), 0, Math.cos(yawRad / 2)];
      joints.Hips = {rotation: multiplyQuaternion(yaw, zQuaternion(bodyDelta)), confidence: coreConfidence, valid: true};
    }

    const segmentDelta = {};
    for (const segment of Object.keys(SEGMENT_BONES)) {
      const current = frame?.directions?.[segment], rest = baseline?.[segment];
      if (finiteDirection(current) && finiteDirection(rest)) segmentDelta[segment] = wrap(angle(current) - angle(rest));
    }
    const parentDelta = {
      leftUpperArm: bodyDelta, rightUpperArm: bodyDelta, leftThigh: bodyDelta, rightThigh: bodyDelta,
      leftForearm: segmentDelta.leftUpperArm || 0, rightForearm: segmentDelta.rightUpperArm || 0,
      leftLowerLeg: segmentDelta.leftThigh || 0, rightLowerLeg: segmentDelta.rightThigh || 0
    };
    for (const [segment, bone] of Object.entries(SEGMENT_BONES)) {
      if (!Number.isFinite(segmentDelta[segment])) continue;
      const score = confidence(frame, SEGMENT_CONFIDENCE[segment]);
      if (score < MIN_CONFIDENCE) continue;
      const localDelta = wrap(segmentDelta[segment] - Number(parentDelta[segment] || 0));
      joints[bone] = {rotation: zQuaternion(localDelta), confidence: score, valid: true};
    }

    const eyeLine = directionFromJoints(frame, 'left_eye', 'right_eye');
    if (eyeLine && finiteDirection(baseline?.eyeLine)) {
      const headConfidence = confidence(frame, ['left_eye','right_eye','nose']);
      if (headConfidence >= MIN_CONFIDENCE) {
        const headDelta = wrap(angle(eyeLine) - angle(baseline.eyeLine) - bodyDelta);
        joints.Neck = {rotation: zQuaternion(headDelta * .3), confidence: headConfidence, valid: true};
        joints.Head = {rotation: zQuaternion(headDelta * .7), confidence: headConfidence, valid: true};
      }
    }
    return joints;
  }

  function suppressLegacyMirrorPanels() {
    const doc = root?.document;
    if (!doc) return;
    for (const id of MIRROR_DEBUG_IDS) {
      const element = doc.getElementById(id);
      if (!element) continue;
      element.setAttribute('data-pocketpt-debug-producer', 'true');
      element.setAttribute('aria-hidden', 'true');
    }
  }
  function createHeadlessRuntime() {
    const status = root.__avatarRuntimeStatus || (root.__avatarRuntimeStatus = {});
    return {
      __arenaHeadlessMirrorRuntime: true,
      __arenaProcessor: null,
      bindPoseFrameRenderer(renderer) { this.__arenaProcessor = renderer; return renderer; },
      registerPoseRenderer(renderer) { return this.bindPoseFrameRenderer(renderer); },
      getStatus() { return status; }
    };
  }
  async function ensureLoader() {
    if (!root.__loadExternalScript && root.RuntimeState?.initHeadRuntime) root.RuntimeState.initHeadRuntime();
    if (typeof root.__loadExternalScript !== 'function') throw new Error('mirror_motion_script_loader_unavailable');
    return root.__loadExternalScript;
  }
  async function ensureCoachRuntime() {
    const load = await ensureLoader();
    if (!root.CoachRuntime) await load('/coach-runtime.js', {async: false, defer: false});
    return root.CoachRuntime || null;
  }
  async function createCanonicalProcessor() {
    const load = await ensureLoader();
    if (root.AvatarRuntime && !root.AvatarRuntime.__arenaHeadlessMirrorRuntime) throw new Error('arena_headless_runtime_conflict');
    const runtime = root.AvatarRuntime?.__arenaHeadlessMirrorRuntime ? root.AvatarRuntime : createHeadlessRuntime();
    root.AvatarRuntime = runtime;
    for (const src of CANONICAL_SCRIPTS) await load(src, {async: false, defer: false});
    suppressLegacyMirrorPanels();
    const processor = runtime.bindPoseFrameRenderer(packet => packet);
    if (typeof processor !== 'function') throw new Error('mirror_motion_processor_unbound');
    return processor;
  }

  function create({send = () => null, mark = () => {}, now = () => Date.now(), randomUUID = () => root.crypto.randomUUID(),
    calibrationOptions = {}, speak, processPose = null, onRestReady = () => {}, requireRestBase = true} = {}) {
    if (!normalized?.fromMoveNetPosePacket || !mirror?.AvatarMirrorCalibration) return null;
    let sessionId = null, frameSequence = 0, baseline = null, released = true, inputFrames = 0, outputFrames = 0;
    let canonicalFrames = 0, processor = typeof processPose === 'function' ? processPose : null, foundationError = null, exerciseCalibrated = false, restNotified = false;
    let foundationPromise = null;
    const calibration = new mirror.AvatarMirrorCalibration({now, speak, ...calibrationOptions,
      onCue: () => mark('COACH_VOICE', 'RUNNING', 'COACH_CUE_QUEUED')});

    function ensureFoundation() {
      if (processor) return Promise.resolve(processor);
      if (foundationError) return Promise.reject(foundationError);
      if (!foundationPromise) {
        mark('MIRROR_MOTION_READY', 'RUNNING', 'MIRROR_FOUNDATION_LOADING');
        foundationPromise = createCanonicalProcessor().then(value => {
          processor = value;
          mark('MIRROR_MOTION_READY', 'WAITING', 'MIRROR_FOUNDATION_READY');
          return value;
        }).catch(error => {
          foundationError = error;
          mark('MIRROR_MOTION_READY', 'FAIL', 'MIRROR_FOUNDATION_FAILED');
          throw error;
        });
      }
      return foundationPromise;
    }
    function release(reason = 'FLOW_RELEASED') {
      if (sessionId && !released) send('LIVE_MOCAP_RELEASE', {mocapVersion: VERSION, mocapSessionId: sessionId, reason});
      released = true; sessionId = null; frameSequence = 0; baseline = null; exerciseCalibrated = false; restNotified = false;
      mirror.resumeCanonicalCoachVoice?.();
      mark('GODOT_LIVE_MOCAP', 'WAITING', 'MOCAP_RELEASED');
    }
    function observe(posePacket) {
      if (!posePacket) {mark('MIRROR_MOTION_INPUT', 'WAITING', 'MIRROR_INPUT_STALE'); return false;}
      inputFrames++;
      mark('MIRROR_MOTION_INPUT', 'PASS', 'MIRROR_INPUT_OBSERVED');
      if (!processor) {
        ensureFoundation().catch(() => {});
        return false;
      }
      if (!requireRestBase) {
        // Push-Up Arena calibrates directly from the athlete's floor TOP/BOTTOM
        // positions. Standing-neutral Mirror Motion rest calibration is not a
        // prerequisite for recognizing or scoring the exercise.
        mark('REST_BASE_CAPTURE', 'SKIP', 'PUSHUP_DIRECT_CALIBRATION');
        mark('MIRROR_MOTION_READY', 'SKIP', 'PUSHUP_DIRECT_CALIBRATION');
        if (!restNotified) {restNotified = true; onRestReady();}
        return false;
      }
      try {
        root.__selectedExercise = 'pushup';
        const processedPacket = processor(posePacket) || posePacket;
        canonicalFrames++;
        const frame = normalized.fromMoveNetPosePacket(processedPacket);
        const capture = calibration.observe(frame, frame.timestamp);
        const state = calibration.diagnostics();
        mark('REST_BASE_CAPTURE', state.calibrationReady ? 'PASS' : 'RUNNING', state.calibrationReady ? 'REST_BASE_READY' : 'REST_BASE_CAPTURING');
        if (capture && !baseline) baseline = captureBaseline(frame);
        if (!state.calibrationReady || !baseline) {mark('MIRROR_MOTION_READY', 'WAITING', 'MIRROR_REST_NOT_READY'); return false;}
        if (!restNotified) {restNotified = true; onRestReady();}
        const joints = restRelativeJoints(frame, baseline, processedPacket);
        if (Object.keys(joints).length < 4) {mark('MIRROR_MOTION_READY', 'FAIL', 'MIRROR_OUTPUT_INVALID'); return false;}
        mark('MIRROR_MOTION_READY', 'PASS', 'MIRROR_PHASE2_18_OUTPUT_READY');
        if (!exerciseCalibrated) {mark('MOCAP_BRIDGE', 'WAITING', 'PUSHUP_CALIBRATION_PENDING'); return false;}
        if (!sessionId) {
          sessionId = randomUUID(); released = false;
          const acquired = send('LIVE_MOCAP_ACQUIRE', {mocapVersion: VERSION, mocapSessionId: sessionId, trackingState: 'TRACKING', restBaseReady: true});
          if (acquired === null || acquired === false) {sessionId = null; released = true; mark('MOCAP_BRIDGE', 'FAIL', 'MOCAP_ACQUIRE_REJECTED'); return false;}
        }
        const floor = processedPacket?.floorTransitionIntent || null;
        const orientation = processedPacket?.orientationIntent || null;
        const packet = {mocapVersion: VERSION, mocapSessionId: sessionId, frameSequence: ++frameSequence,
          sourceTimestamp: frame.timestamp, trackingState: 'TRACKING', restBaseReady: true, joints,
          semantics: {foundation: 'mirror-motion-phase2-18', exercise: 'pushup', orientation, floorTransition: floor}};
        const sent = send('LIVE_MOCAP_FRAME', packet);
        if (sent === null || sent === false) {mark('MOCAP_BRIDGE', 'FAIL', 'MOCAP_SEND_REJECTED'); return false;}
        outputFrames++;
        mark('MOCAP_BRIDGE', 'PASS', 'MOCAP_FRAME_SENT');
        return true;
      } catch (error) {
        mark('MIRROR_MOTION_READY', 'FAIL', 'MIRROR_PROCESSING_FAILED');
        return false;
      }
    }
    async function activateVoice() {
      ensureFoundation().catch(() => {});
      try {
        await ensureCoachRuntime();
        const result = await mirror.activateCanonicalCoachVoice?.();
        mark('COACH_VOICE', result?.ok === false ? 'FAIL' : 'PASS', result?.ok === false ? 'COACH_VOICE_ACTIVATION_FAILED' : 'COACH_VOICE_READY');
        return result;
      } catch (_) {
        mark('COACH_VOICE', 'FAIL', 'COACH_VOICE_ACTIVATION_FAILED');
        return {ok: false};
      }
    }
    function reset() {release('FLOW_RESET'); calibration.stopSpeech?.();}
    function setExerciseCalibration(ready) {
      exerciseCalibrated = ready === true;
      if (!exerciseCalibrated && sessionId) release('PUSHUP_CALIBRATION_RESET');
      return exerciseCalibrated;
    }
    function diagnostics() {
      return Object.freeze({version: VERSION, inputFrames, canonicalFrames, outputFrames, sessionId, frameSequence,
        foundationReady: Boolean(processor), requireRestBase, foundationError: foundationError ? String(foundationError.message || foundationError) : null,
        exerciseCalibrated, ...calibration.diagnostics()});
    }
    return Object.freeze({observe, release, reset, diagnostics, activateVoice, ensureFoundation, setExerciseCalibration});
  }

  return Object.freeze({VERSION, CANONICAL_SCRIPTS, SEGMENT_BONES, captureBaseline, restRelativeJoints, create});
});
