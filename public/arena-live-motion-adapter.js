(function (root, factory) {
  const normalized = typeof module === 'object' && module.exports ? require('./motion/normalized-pose') : root.PocketPTNormalizedPose;
  const mirror = typeof module === 'object' && module.exports ? require('./motion/live-avatar-mirror') : root.PocketPTLiveAvatarMirror;
  const api = factory(normalized, mirror);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaLiveMotion = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function (normalized, mirror) {
  'use strict';
  const VERSION = 1;
  const SEGMENT_BONES = Object.freeze({
    leftUpperArm: 'LeftArm', leftForearm: 'LeftForeArm', leftThigh: 'LeftUpLeg', leftLowerLeg: 'LeftLeg',
    rightUpperArm: 'RightArm', rightForearm: 'RightForeArm', rightThigh: 'RightUpLeg', rightLowerLeg: 'RightLeg'
  });
  const finiteDirection = value => value && Number.isFinite(value.x) && Number.isFinite(value.y);
  const angle = value => Math.atan2(value.y, value.x);
  function restRelativeJoints(frame, baseline) {
    const joints = {};
    for (const [segment, bone] of Object.entries(SEGMENT_BONES)) {
      const current = frame?.directions?.[segment], rest = baseline?.[segment];
      if (!finiteDirection(current) || !finiteDirection(rest)) continue;
      let radians = angle(current) - angle(rest);
      while (radians > Math.PI) radians -= Math.PI * 2;
      while (radians < -Math.PI) radians += Math.PI * 2;
      const confidenceNames = {
        leftUpperArm: ['left_shoulder','left_elbow'], leftForearm: ['left_elbow','left_wrist'], leftThigh: ['left_hip','left_knee'], leftLowerLeg: ['left_knee','left_ankle'],
        rightUpperArm: ['right_shoulder','right_elbow'], rightForearm: ['right_elbow','right_wrist'], rightThigh: ['right_hip','right_knee'], rightLowerLeg: ['right_knee','right_ankle']
      }[segment];
      const confidence = Math.min(...confidenceNames.map(name => Number(frame.joints?.[name]?.confidence || 0)));
      if (confidence < .35) continue;
      joints[bone] = {rotation: [0, 0, Math.sin(radians / 2), Math.cos(radians / 2)], confidence, valid: true};
    }
    return joints;
  }
  function create({send = () => null, mark = () => {}, now = () => Date.now(), randomUUID = () => globalThis.crypto.randomUUID(),
    calibrationOptions = {}, speak, activateVoice, resumeVoice} = {}) {
    if (!normalized?.fromMoveNetPosePacket || !mirror?.AvatarMirrorCalibration || !mirror?.AvatarPresentationStabilizer) return null;
    let sessionId = null, frameSequence = 0, baseline = null, released = true, inputFrames = 0, outputFrames = 0;
    const stabilizer = new mirror.AvatarPresentationStabilizer({now});
    const calibration = new mirror.AvatarMirrorCalibration({now, speak, ...calibrationOptions,
      onCue: () => mark('COACH_VOICE', 'RUNNING', 'COACH_CUE_QUEUED')});
    function release(reason = 'FLOW_RELEASED') {
      if (sessionId && !released) send('LIVE_MOCAP_RELEASE', {mocapVersion: VERSION, mocapSessionId: sessionId, reason});
      released = true; sessionId = null; frameSequence = 0; baseline = null; stabilizer.reset();
      mark('GODOT_LIVE_MOCAP', 'WAITING', 'MOCAP_RELEASED');
    }
    function observe(posePacket) {
      if (!posePacket) {mark('MIRROR_MOTION_INPUT', 'WAITING', 'MIRROR_INPUT_STALE'); return false;}
      try {
        const frame = normalized.fromMoveNetPosePacket(posePacket); inputFrames++;
        mark('MIRROR_MOTION_INPUT', 'PASS', 'MIRROR_INPUT_OBSERVED');
        stabilizer.observe(frame);
        const capture = calibration.observe(frame, frame.timestamp);
        const state = calibration.diagnostics();
        mark('REST_BASE_CAPTURE', state.calibrationReady ? 'PASS' : 'RUNNING', state.calibrationReady ? 'REST_BASE_READY' : 'REST_BASE_CAPTURING');
        if (capture && !baseline) baseline = Object.fromEntries(Object.keys(SEGMENT_BONES).map(name => [name, frame.directions?.[name]]).filter(([, value]) => finiteDirection(value)));
        if (!state.calibrationReady || !baseline) {mark('MIRROR_MOTION_READY', 'WAITING', 'MIRROR_REST_NOT_READY'); return false;}
        const processed = stabilizer.sample(frame.timestamp);
        const joints = restRelativeJoints(processed, baseline);
        if (!Object.keys(joints).length) {mark('MIRROR_MOTION_READY', 'FAIL', 'MIRROR_OUTPUT_INVALID'); return false;}
        if (!sessionId) {
          sessionId = randomUUID(); released = false;
          send('LIVE_MOCAP_ACQUIRE', {mocapVersion: VERSION, mocapSessionId: sessionId, trackingState: 'TRACKING', restBaseReady: true});
        }
        const packet = {mocapVersion: VERSION, mocapSessionId: sessionId, frameSequence: ++frameSequence,
          sourceTimestamp: frame.timestamp, trackingState: 'TRACKING', restBaseReady: true, joints};
        const sent = send('LIVE_MOCAP_FRAME', packet);
        if (sent === null) {mark('MOCAP_BRIDGE', 'FAIL', 'MOCAP_SEND_REJECTED'); return false;}
        outputFrames++; mark('MIRROR_MOTION_READY', 'PASS', 'MIRROR_OUTPUT_READY'); mark('MOCAP_BRIDGE', 'PASS', 'MOCAP_FRAME_SENT');
        return true;
      } catch (_) {
        mark('MIRROR_MOTION_READY', 'FAIL', 'MIRROR_PROCESSING_FAILED');
        return false;
      }
    }
    function reset() {release('FLOW_RESET'); calibration.stopSpeech?.();}
    function diagnostics() {return Object.freeze({version: VERSION, inputFrames, outputFrames, sessionId, frameSequence, ...calibration.diagnostics()});}
    return Object.freeze({observe, release, reset, diagnostics});
  }
  return Object.freeze({VERSION, SEGMENT_BONES, restRelativeJoints, create});
});
