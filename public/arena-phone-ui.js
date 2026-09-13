(function (root) {
  'use strict';
  function mount({game, mark, send}) {
    const doc = root.document, $ = id => doc.getElementById(id);
    const panel = $('arenaPhonePanel'), video = $('arenaCameraVideo');
    if (!panel || !root.PocketPTArenaPhoneFlow || !root.PocketPTArenaCamera || !root.PocketPTArenaPoseCalibration) return null;
    let scope = null, pointer = null, cameraOperation = 0, flow, previousState = null;
    const calibration = root.PocketPTArenaPoseCalibration.create({onChange: progress => {
      flow?.calibration(progress.stage, progress.reason, progress.failedStage);
    }});
    const camera = root.PocketPTArenaCamera.create({root, video,
      onVisibility: visible => flow?.visibility(visible), onStatus: mark,
      onPose(frame, confidence) {if (!flow?.snapshot().previewOnly) calibration.observe(frame, confidence);},
      onFailure: () => flow?.cameraError(),
      onDevices(devices, selected) {
        $('arenaCameraSelect').replaceChildren(...devices.map(device => {
          const option = doc.createElement('option'); option.value = device.id; option.textContent = device.label; option.selected = device.id === selected; return option;
        }));
        $('arenaCameraChoice').hidden = devices.length < 2;
      }
    });
    function stopCamera() {cameraOperation++; camera.stop(); calibration.reset(); $('arenaCameraChoice').hidden = true;}
    function releasePointer() {
      const held = pointer; pointer = null;
      if (held?.element.hasPointerCapture?.(held.id)) held.element.releasePointerCapture(held.id);
      const knob = $('arenaJoystickKnob'); if (knob) knob.style.transform = 'translate3d(0,0,0)';
      flow.release();
    }
    function joystickVector(event) {
      const joystick = $('arenaJoystick'), rect = joystick.getBoundingClientRect();
      const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
      let x = (event.clientX - (rect.left + rect.width / 2)) / radius;
      let y = (event.clientY - (rect.top + rect.height / 2)) / radius;
      const magnitude = Math.hypot(x, y);
      if (magnitude > 1) { x /= magnitude; y /= magnitude; }
      return {x, y};
    }
    function applyJoystick(event) {
      const vector = joystickVector(event), radiusPx = 42;
      $('arenaJoystickKnob').style.transform = `translate3d(${(vector.x * radiusPx).toFixed(1)}px, ${(vector.y * radiusPx).toFixed(1)}px, 0)`;
      return flow.moveVector(vector.x, vector.y);
    }
    function render(state) {
      panel.hidden = ['CONNECTING', 'CLOSED'].includes(state.state);
      $('arenaPhoneTitle').textContent = state.title;
      $('arenaPhoneMessage').textContent = state.description;
      $('arenaGoToMat').disabled = !state.canApproach;
      $('arenaGoToMat').hidden = !['GYM', 'LEGACY', 'NEGOTIATING'].includes(state.state);
      $('arenaThumbControls').hidden = !state.canMove;
      $('arenaStopApproach').hidden = state.state !== 'APPROACHING';
      $('arenaSetupCamera').hidden = !state.canSetup;
      $('arenaSetupCamera').textContent = state.state === 'INTRO' ? 'Set up my camera' : 'Check my camera';
      $('arenaEnableCamera').hidden = !state.canEnableCamera;
      $('arenaEnableCamera').textContent = state.state === 'CAMERA_ERROR' ? 'Retry camera' : 'Enable camera';
      $('arenaRestartCalibration').hidden = !state.canRestartCalibration;
      $('arenaReturnToGym').hidden = ['CONNECTING', 'CLOSED', 'GYM', 'LEGACY', 'NEGOTIATING', 'APPROACHING'].includes(state.state);
      $('arenaReturnToGym').disabled = state.state === 'RETURNING';
      $('arenaRepeatBriefing').hidden = state.state !== 'INTRO';
      $('arenaCameraStage').hidden = !state.cameraView;
      game.inert = !['CONNECTING', 'GYM', 'LEGACY', 'NEGOTIATING'].includes(state.state);
      game.style.visibility = state.cameraView ? 'hidden' : '';
      $('arenaCameraSelect').disabled = !['CAMERA_POSITIONING', 'BODY_VISIBLE', 'CALIBRATING_TOP', 'CALIBRATING_BOTTOM', 'CONFIRMING_TOP', 'CALIBRATED', 'CALIBRATION_RETRY'].includes(state.state);
      $('arenaWalkMode').disabled = !state.canMove;
      $('arenaRunMode').disabled = !state.canMove;
      $('arenaWalkMode').dataset.selected = String(state.movementMode === 'WALK');
      $('arenaRunMode').dataset.selected = String(state.movementMode === 'RUN');
      $('arenaWalkMode').ariaPressed = String(state.movementMode === 'WALK');
      $('arenaRunMode').ariaPressed = String(state.movementMode === 'RUN');
      $('arenaLocomotionModeStatus').textContent = state.movementMode === 'RUN' ? 'Run mode' : 'Walk mode';
      $('arenaThrillerAction').hidden = !state.canMove;
      $('arenaThrillerAction').disabled = !state.canMove;
      const cameraStatus = {
        BODY_VISIBLE: 'Required joints visible · camera preview only',
        CALIBRATING_TOP: 'Hold TOP still · capturing automatically',
        CALIBRATING_BOTTOM: 'TOP captured ✓ · hold BOTTOM still',
        CONFIRMING_TOP: 'TOP captured ✓ · BOTTOM captured ✓ · return to TOP',
        CALIBRATED: 'TOP ✓ · BOTTOM ✓ · reference cycle observed, not form approval',
        CALIBRATION_RETRY: 'Capture paused · check framing and restart'
      }[state.state];
      $('arenaBodyStatus').textContent = cameraStatus || 'Waiting for a clear full-body view';
      $('arenaBodyStatus').dataset.visible = String(Boolean(cameraStatus) && state.state !== 'CALIBRATION_RETRY');
      if (pointer && !state.canMove) releasePointer();
      if (state.state === 'INTRO' && doc.activeElement === $('arenaStopApproach')) $('arenaSetupCamera').focus();
      if (state.state === 'GYM' && previousState === 'RETURNING' && panel.contains(doc.activeElement)) $('arenaGoToMat').focus();
      previousState = state.state;
    }
    flow = root.PocketPTArenaPhoneFlow.create({send, mark, onChange: render, stopCamera});
    render(flow.snapshot());
    async function enableCamera(deviceId = '') {
      if (deviceId) {stopCamera(); flow.cameraError();}
      if (!flow.cameraStarting()) return;
      $('arenaReturnToGym').focus();
      const generation = ++cameraOperation;
      try {await camera.start(deviceId); if (generation === cameraOperation) {flow.cameraActive(); if (!flow.snapshot().previewOnly) calibration.start();}}
      catch (_) {if (generation === cameraOperation) flow.cameraError();}
    }
    $('arenaGoToMat').addEventListener('click', () => {if (flow.approach()) $('arenaStopApproach').focus();});
    $('arenaStopApproach').addEventListener('click', () => {flow.cancelApproach(); $('arenaGoToMat').focus();});
    $('arenaSetupCamera').addEventListener('click', () => {
      if (flow.setup()) $('arenaEnableCamera').focus();
    });
    $('arenaEnableCamera').addEventListener('click', () => enableCamera());
    $('arenaRestartCalibration').addEventListener('click', () => {
      if (!flow.snapshot().canRestartCalibration) return;
      camera.resetTracking(); calibration.start(); $('arenaReturnToGym').focus();
    });
    $('arenaReturnToGym').addEventListener('click', () => {if (flow.returnToGym()) (flow.snapshot().state === 'RETURNING' ? $('arenaPhoneMessage') : $('arenaSetupCamera')).focus();});
    $('arenaCameraSelect').addEventListener('change', () => enableCamera($('arenaCameraSelect').value));
    $('arenaRepeatBriefing').addEventListener('click', () => $('arenaPhoneMessage').focus());
    $('arenaWalkMode').addEventListener('click', () => flow.setLocomotionMode('WALK'));
    $('arenaRunMode').addEventListener('click', () => flow.setLocomotionMode('RUN'));
    $('arenaThrillerAction').addEventListener('click', () => {releasePointer(); flow.playAction('ThrillerPart1');});
    const joystick = $('arenaJoystick');
    const keyDirections = {ArrowLeft: 'MOVE_LEFT', ArrowRight: 'MOVE_RIGHT', ArrowUp: 'MOVE_FORWARD', ArrowDown: 'MOVE_BACKWARD'};
    joystick.addEventListener('pointerdown', event => {
      if (pointer || event.button !== 0 || !flow.snapshot().canMove) return;
      event.preventDefault(); pointer = {id: event.pointerId, element: joystick};
      try {joystick.setPointerCapture(event.pointerId);} catch (_) {releasePointer(); return;}
      applyJoystick(event);
    });
    joystick.addEventListener('pointermove', event => {if (pointer?.id === event.pointerId) {event.preventDefault(); applyJoystick(event);}});
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(name, event => {if (pointer?.id === event.pointerId) releasePointer();});
    joystick.addEventListener('keydown', event => {
      const action = keyDirections[event.key]; if (!action || event.repeat) return;
      event.preventDefault(); flow.hold(action);
    });
    joystick.addEventListener('keyup', event => {if (keyDirections[event.key]) {event.preventDefault(); flow.release();}});
    root.addEventListener('blur', releasePointer);
    root.addEventListener('orientationchange', () => {releasePointer(); camera.resetTracking(); calibration.invalidate();});
    return {
      connect() {if (!scope) {scope = root.crypto.randomUUID(); flow.connect(scope);}},
      accept: data => flow.accept(data),
      suspend() {releasePointer(); flow.suspend();},
      reset() {releasePointer(); scope = null; flow.reset();},
      close() {releasePointer(); scope = null; flow.close(); camera.dispose?.();}
    };
  }
  root.PocketPTArenaPhoneUI = Object.freeze({mount});
})(window);
