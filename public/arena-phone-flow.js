(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaPhoneFlow = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const VERSION = 1;
  const DIRECTIONS = new Set(['MOVE_LEFT', 'MOVE_RIGHT', 'MOVE_FORWARD', 'MOVE_BACKWARD']);
  const TRACKING_STATES = ['CAMERA_POSITIONING', 'BODY_VISIBLE', 'CALIBRATING_TOP', 'CALIBRATING_BOTTOM', 'CONFIRMING_TOP', 'CALIBRATED', 'CALIBRATION_RETRY'];
  const CALIBRATION_STATES = {CAPTURE_TOP: 'CALIBRATING_TOP', CAPTURE_BOTTOM: 'CALIBRATING_BOTTOM', CONFIRM_TOP: 'CONFIRMING_TOP', CALIBRATED: 'CALIBRATED', NEEDS_RETRY: 'CALIBRATION_RETRY'};
  const COPY = Object.freeze({
    CONNECTING: ['Enter the Lion’s Den', 'Connecting your gym session…'],
    NEGOTIATING: ['Choose your controls', 'Checking the controls available in this gym…'],
    LEGACY: ['Your gym is open', 'Touch movement needs the next gym update. You can still check your camera here.'],
    GYM: ['Head to the push-up mat', 'Tap Go to mat, or use the thumb controls to explore. Your camera stays off.'],
    APPROACHING: ['On the way to the mat', 'Your avatar is moving to the challenge. You can stop at any time.'],
    INTRO: ['Welcome to the Lion’s Den', 'The goal is clean push-ups in sixty seconds: top, bottom, then back to the top. Read the briefing, then set up your camera.'],
    CAMERA_SETUP: ['Set your phone down', 'Place it on a stable surface at your side. Keep your shoulders, elbows, wrists, hips and ankles in view. Enable your camera before stepping back.'],
    CAMERA_STARTING: ['Opening your camera', 'Allow camera access if prompted. You can cancel and return to the gym.'],
    CAMERA_POSITIONING: ['Move into the camera view', 'Use the preview to check your framing. Navigation is off while you set up.'],
    BODY_VISIBLE: ['Your body is visible', 'This is a camera check only. No pose references, countdown or score are being recorded.'],
    CALIBRATING_TOP: ['Hold your TOP position', 'Keep still while PocketPT learns what your personal up position looks like.'],
    CALIBRATING_BOTTOM: ['TOP captured — now lower', 'Move into your normal bottom position and hold still for the BOTTOM capture.'],
    CONFIRMING_TOP: ['BOTTOM captured — return to TOP', 'Press back to your captured TOP position to confirm the full cycle.'],
    CALIBRATED: ['Your personal pose references are captured', 'Your TOP → BOTTOM → TOP reference sequence was observed. This is not form approval. Official countdown and scoring remain off.'],
    CALIBRATION_RETRY: ['Pose capture needs a restart', 'The hold timed out or tracking/camera conditions changed. Check framing, then select Restart pose capture. You can also return to the gym.'],
    CAMERA_ERROR: ['Camera needs attention', 'Check camera permission, then try again. You can also return to the gym.'],
    RETURNING: ['Returning to the gym', 'Waiting for your avatar to stand before enabling movement.'],
    RETURN_BLOCKED: ['Avatar return not confirmed', 'Try returning to the gym again. Movement stays off until your avatar is standing.'],
    SUSPENDED: ['Setup paused', 'The camera is off. Return to the gym to continue when you are ready.'],
    CLOSED: ['Session ended', 'Return to PocketPT and enter the arena again.']
  });

  // This coordinator owns input context and setup only. Competition readiness,
  // countdown, timing, scoring and results require the canonical reviewed owners.
  function create({send, onChange = () => {}, mark = () => {}, stopCamera = () => {},
    setTimer = setTimeout, clearTimer = clearTimeout, setRepeater = setInterval, clearRepeater = clearInterval} = {}) {
    let state = 'CONNECTING', requestId = null, outgoing = 0, incoming = 0, pending = null;
    let capabilities = null, held = null, repeater = null, nudgeTimer = null, avatarNeedsStand = false;
    let previewOnly = true, connected = false, context = 'LOCKED', calibrationStage = 'IDLE', bodyVisible = false;
    const timers = new Map();
    function cancel(name) { clearTimer(timers.get(name)); timers.delete(name); }
    function schedule(name, delay, fn) { cancel(name); timers.set(name, setTimer(() => {timers.delete(name); fn();}, delay)); }
    function change(next) { state = next; onChange(snapshot()); }
    function snapshot() {
      return {state, context, previewOnly, title: COPY[state][0], description: COPY[state][1],
        canMove: state === 'GYM' && capabilities?.touchNavigation === true,
        canApproach: state === 'GYM' && capabilities?.matApproach === true && capabilities?.pushUpTransition === true,
        canSetup: ['GYM', 'LEGACY', 'INTRO'].includes(state),
        canEnableCamera: ['CAMERA_SETUP', 'CAMERA_ERROR'].includes(state),
        canRestartCalibration: !previewOnly && TRACKING_STATES.includes(state),
        cameraView: ['CAMERA_STARTING', 'CAMERA_ERROR', ...TRACKING_STATES].includes(state)};
    }
    function transmit(event, payload = {}) {
      if (!connected || !requestId) return null;
      const sequence = ++outgoing;
      send({type: 'POCKETPT_GODOT_BRIDGE', protocolVersion: 1, event, flowVersion: VERSION, requestId, sequence, ...payload});
      return sequence;
    }
    function control(action, extra = {}) {
      if (!capabilities) return null;
      return transmit('CONTROL_INTENT', {context, action, ...extra});
    }
    function release() {
      clearRepeater(repeater); repeater = null; clearTimer(nudgeTimer); nudgeTimer = null; held = null;
      control('STOP');
    }
    function setContext(next) { release(); context = next; control('SET_CONTEXT'); }
    function command(action, next, timeoutState) {
      pending = {action, sequence: control(action)};
      change(next);
      schedule('command', 20000, () => {pending = null; release(); mark('MAT_APPROACH', 'FAIL', 'FLOW_ACK_TIMEOUT'); change(timeoutState);});
    }
    function connect(id) {
      if (connected && id === requestId) return;
      reset(); requestId = id; connected = true; outgoing = incoming = 0;
      change('NEGOTIATING');
      mark('PHONE_FLOW', 'PASS', 'PHONE_FLOW_READY');
      transmit('ARENA_FLOW_REQUEST', {experience: 'PUSH_UP_ARENA'});
      schedule('capabilities', 3000, () => {
        mark('CONTROL_CHANNEL', 'NOT_CONNECTED', 'TOUCH_NOT_CONNECTED');
        if (state === 'NEGOTIATING') change('LEGACY');
      });
    }
    function accept(data) {
      if (!connected || data?.type !== 'POCKETPT_GODOT_BRIDGE' || data.protocolVersion !== 1 ||
        data.flowVersion !== VERSION || data.requestId !== requestId || !Number.isSafeInteger(data.sequence) || data.sequence <= incoming) return false;
      if (data.event === 'ARENA_MAT_SELECTED') {
        if (!snapshot().canApproach) return false;
        incoming = data.sequence; return approach();
      }
      if (data.event === 'ARENA_FLOW_CAPABILITIES') {
        if (capabilities || data.capabilities?.contextLock !== true ||
          !['touchNavigation', 'matApproach', 'pushUpTransition'].every(key => typeof data.capabilities[key] === 'boolean')) return false;
        incoming = data.sequence; cancel('capabilities');
        capabilities = Object.fromEntries(['contextLock', 'touchNavigation', 'matApproach', 'pushUpTransition'].map(key => [key, data.capabilities[key]]));
        mark('CONTROL_CHANNEL', 'PASS', 'TOUCH_CONNECTED');
        if (['NEGOTIATING', 'LEGACY'].includes(state)) {setContext('GYM_NAVIGATION'); change('GYM');}
        else setContext('LOCKED');
        return true;
      }
      if (data.event !== 'ARENA_FLOW_EVENT' || !pending || data.replyTo !== pending.sequence) return false;
      const expected = {GO_TO_MAT: ['AT_MAT', 'APPROACHING'], PUSH_UP_START: ['AVATAR_DOWN', null], STAND_UP: ['AVATAR_STANDING', 'RETURNING']}[pending.action];
      if (!expected || data.result !== expected[0] || (expected[1] && state !== expected[1])) return false;
      incoming = data.sequence; cancel('command'); pending = null;
      if (data.result === 'AT_MAT') {setContext('LOCKED'); mark('MAT_APPROACH', 'PASS', 'MAT_REACHED'); change('INTRO');}
      if (data.result === 'AVATAR_DOWN') mark('MAT_APPROACH', 'PASS', 'AVATAR_POSITIONED');
      if (data.result === 'AVATAR_STANDING') {avatarNeedsStand = false; setContext('GYM_NAVIGATION'); change('GYM');}
      return true;
    }
    function hold(action) {
      if (!snapshot().canMove || held || !DIRECTIONS.has(action)) return false;
      held = action;
      const pulse = () => control(action, {intensity: 1, validForMs: 300});
      pulse(); repeater = setRepeater(pulse, 100); return true;
    }
    function nudge(action) {if (!hold(action)) return false; nudgeTimer = setTimer(release, 200); return true;}
    function approach() {
      if (!snapshot().canApproach) return false;
      release(); mark('MAT_APPROACH', 'RUNNING', 'MAT_REQUESTED');
      command('GO_TO_MAT', 'APPROACHING', 'GYM'); return true;
    }
    function cancelApproach() {
      if (state !== 'APPROACHING') return;
      pending = null; cancel('command'); release(); mark('MAT_APPROACH', 'WAITING', 'MAT_CANCELLED'); change('GYM');
    }
    function setup() {
      if (!snapshot().canSetup) return false;
      previewOnly = state !== 'INTRO'; calibrationStage = 'IDLE'; bodyVisible = false; setContext('CAMERA_SETUP'); change('CAMERA_SETUP');
      if (!previewOnly) {
        avatarNeedsStand = true;
        pending = {action: 'PUSH_UP_START', sequence: control('PUSH_UP_START')};
        schedule('command', 20000, () => {pending = null; mark('MAT_APPROACH', 'FAIL', 'FLOW_ACK_TIMEOUT');});
      }
      mark('START_POSITION', 'NOT_CONNECTED', 'START_RULES_PENDING');
      mark('POSE_TOP_CALIBRATION', previewOnly ? 'SKIP' : 'WAITING', previewOnly ? 'CALIBRATION_PREVIEW_ONLY' : 'POSE_TOP_WAITING');
      mark('POSE_BOTTOM_CALIBRATION', previewOnly ? 'SKIP' : 'NOT_CONNECTED', previewOnly ? 'CALIBRATION_PREVIEW_ONLY' : 'POSE_BOTTOM_WAITING');
      mark('POSE_CYCLE_CALIBRATION', previewOnly ? 'SKIP' : 'WAITING', previewOnly ? 'CALIBRATION_PREVIEW_ONLY' : 'POSE_CYCLE_WAITING');
      return true;
    }
    function cameraStarting() {if (!snapshot().canEnableCamera) return false; bodyVisible = false; change('CAMERA_STARTING'); return true;}
    function cameraActive() {if (state === 'CAMERA_STARTING') {mark('BODY_VISIBILITY', 'WAITING', 'BODY_NOT_VISIBLE'); change('CAMERA_POSITIONING');}}
    function visibility(visible) {
      if (!TRACKING_STATES.includes(state)) return;
      const next = calibrationStage === 'NEEDS_RETRY' ? 'CALIBRATION_RETRY' : (visible ? (previewOnly ? 'BODY_VISIBLE' : (CALIBRATION_STATES[calibrationStage] || 'BODY_VISIBLE')) : 'CAMERA_POSITIONING');
      if (bodyVisible !== visible) {
        bodyVisible = visible;
        mark('BODY_VISIBILITY', visible ? 'PASS' : 'WAITING', visible ? 'BODY_VISIBLE_NOW' : 'BODY_NOT_VISIBLE');
        if (visible) reportCalibration();
      }
      if (state !== next) change(next);
    }
    function reportCalibration() {
      if (previewOnly || ['IDLE', 'NEEDS_RETRY'].includes(calibrationStage)) return;
      const top = calibrationStage !== 'CAPTURE_TOP', bottom = ['CONFIRM_TOP','CALIBRATED'].includes(calibrationStage);
      mark('POSE_TOP_CALIBRATION', top ? 'PASS' : 'RUNNING', top ? 'POSE_TOP_CAPTURED' : 'POSE_TOP_CAPTURING');
      mark('POSE_BOTTOM_CALIBRATION', bottom ? 'PASS' : top ? 'RUNNING' : 'WAITING', bottom ? 'POSE_BOTTOM_CAPTURED' : top ? 'POSE_BOTTOM_CAPTURING' : 'POSE_BOTTOM_WAITING');
      mark('POSE_CYCLE_CALIBRATION', calibrationStage === 'CALIBRATED' ? 'PASS' : bottom ? 'RUNNING' : 'WAITING', calibrationStage === 'CALIBRATED' ? 'POSE_CYCLE_CAPTURED' : 'POSE_CYCLE_WAITING');
      mark('START_POSITION', 'NOT_CONNECTED', calibrationStage === 'CALIBRATED' ? 'PERSONAL_GATES_READY' : 'START_RULES_PENDING');
    }
    function calibration(next, reason, failedStage) {
      if (previewOnly || !['IDLE', ...Object.keys(CALIBRATION_STATES)].includes(next)) return false;
      if (next === 'IDLE' || next === 'NEEDS_RETRY') {
        calibrationStage = next;
        for (const id of ['POSE_TOP_CALIBRATION','POSE_BOTTOM_CALIBRATION','POSE_CYCLE_CALIBRATION']) mark(id, 'WAITING', 'CALIBRATION_RESET');
        mark('START_POSITION', 'NOT_CONNECTED', 'START_RULES_PENDING');
        if (next === 'NEEDS_RETRY') {
          const id = {CAPTURE_TOP:'POSE_TOP_CALIBRATION',CAPTURE_BOTTOM:'POSE_BOTTOM_CALIBRATION',CONFIRM_TOP:'POSE_CYCLE_CALIBRATION',CALIBRATED:'POSE_CYCLE_CALIBRATION'}[failedStage] || 'POSE_TOP_CALIBRATION';
          mark(id, reason === 'TIMEOUT' ? 'FAIL' : 'WAITING', reason === 'TIMEOUT' ? 'CALIBRATION_TIMEOUT' : 'CALIBRATION_RESET');
          if (TRACKING_STATES.includes(state)) change('CALIBRATION_RETRY');
        }
        return true;
      }
      const expected = {IDLE: 'CAPTURE_TOP', CAPTURE_TOP: 'CAPTURE_BOTTOM', CAPTURE_BOTTOM: 'CONFIRM_TOP', CONFIRM_TOP: 'CALIBRATED'}[calibrationStage];
      if (next !== 'CAPTURE_TOP' && next !== expected) return false;
      calibrationStage = next;
      reportCalibration();
      if (TRACKING_STATES.includes(state)) change(bodyVisible ? CALIBRATION_STATES[next] : 'CAMERA_POSITIONING');
      return true;
    }
    function cameraError() {if (snapshot().cameraView) {stopCamera(); change('CAMERA_ERROR');}}
    function returnToGym() {
      if (!connected || ['CONNECTING', 'NEGOTIATING', 'CLOSED'].includes(state)) return false;
      stopCamera(); cancel('command'); pending = null;
      mark('CAMERA_PERMISSION', 'WAITING', 'CAMERA_OFF');
      mark('CAMERA_STREAM', 'WAITING', 'CAMERA_OFF');
      if (avatarNeedsStand) {setContext('LOCKED'); command('STAND_UP', 'RETURNING', 'RETURN_BLOCKED');}
      else {setContext(capabilities ? 'GYM_NAVIGATION' : 'LOCKED'); change(capabilities ? 'GYM' : 'LEGACY');}
      return true;
    }
    function suspend() {
      if (!connected || state === 'CLOSED') return;
      stopCamera(); cancel('command'); pending = null; setContext('LOCKED');
      mark('CAMERA_PERMISSION', 'WAITING', 'CAMERA_OFF');
      mark('CAMERA_STREAM', 'WAITING', 'CAMERA_OFF'); change('SUSPENDED');
    }
    function reset() {
      setContext('LOCKED'); stopCamera(); for (const name of timers.keys()) cancel(name);
      requestId = null; connected = false; capabilities = null; pending = null;
      avatarNeedsStand = false; previewOnly = true; calibrationStage = 'IDLE'; bodyVisible = false; context = 'LOCKED'; change('CONNECTING');
    }
    function close() {reset(); change('CLOSED');}
    return {snapshot, connect, accept, hold, nudge, release, approach, cancelApproach, setup,
      cameraStarting, cameraActive, visibility, calibration, cameraError, returnToGym, suspend, reset, close};
  }
  return Object.freeze({VERSION, COPY, create});
});
