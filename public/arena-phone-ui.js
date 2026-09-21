(function (root) {
  'use strict';
  function mount({game, mark, send}) {
    const doc = root.document, $ = id => doc.getElementById(id);
    const panel = $('arenaPhonePanel'), video = $('arenaCameraVideo'), overlay = $('arenaPoseOverlay');
    if (!panel || !root.PocketPTArenaPhoneFlow || !root.PocketPTArenaCamera || !root.PocketPTArenaPoseCalibration) return null;
    let scope = null, pointer = null, cameraOperation = 0, flow, previousState = null, liveMotion = null, challengeVoice = null;
    let challengeArmed = false;
    const calibration = root.PocketPTArenaPoseCalibration.create({onChange: progress => {
      flow?.calibration(progress.stage, progress.reason, progress.failedStage);
      liveMotion?.setExerciseCalibration(progress.calibrated);
      const cue = {
        CAPTURE_TOP:'I can see you. Capturing your top position. Hold.',
        CAPTURE_BOTTOM:'Top captured. Lower into your bottom position and hold.',
        CONFIRM_TOP:'Bottom captured. Return to the top position and hold.',
        CALIBRATED:'Top and bottom captured. When you are ready, say start.',
        NEEDS_RETRY:"Didn't get it. Say reset to restart the pose capture."
      }[progress.stage];
      if (cue) root.CoachRuntime?.speak?.(cue, 'arena-calibration', {owner:'avatar_calibration', interruptible:false, timerNeutral:true});
      challengeArmed = progress.stage === 'CALIBRATED';
    }});
    const camera = root.PocketPTArenaCamera.create({root, video,
      onVisibility: visible => flow?.visibility(visible), onStatus: mark,
      onPose(frame, confidence, posePacket) {
        drawPose(posePacket, frame, confidence);
        if (!flow?.snapshot().previewOnly && liveMotion?.diagnostics().calibrationReady) calibration.observe(frame, confidence);
        liveMotion?.observe(posePacket);
      },
      onFailure: () => flow?.cameraError(),
      onDevices(devices, selected) {
        $('arenaCameraSelect').replaceChildren(...devices.map(device => {
          const option = doc.createElement('option'); option.value = device.id; option.textContent = device.label; option.selected = device.id === selected; return option;
        }));
        $('arenaCameraChoice').hidden = devices.length < 2;
      }
    });
    function issueLabels(evaluation) {
      if (!evaluation?.usable) return evaluation?.missing?.length ? [`clearer ${evaluation.missing.join(', ')}`] : ['clearer body view'];
      const checks = evaluation.checks || {}, issues = [];
      if (evaluation.stage === 'CAPTURE_BOTTOM') {
        if (checks.elbowDepth === false) issues.push('lower elbow a little more');
        if (checks.bodyLine === false) issues.push('align shoulder · hip · ankle');
        return issues;
      }
      if (checks.elbowExtension === false) issues.push('straighten arm a little more');
      if (checks.shoulderStack === false) issues.push('set arm/shoulder closer to 90°');
      if (checks.bodyLine === false) issues.push('align shoulder · hip · ankle');
      return issues;
    }
    function angleSummary(evaluation) {
      const angles = evaluation?.angles;
      if (!angles) return '';
      return `elbow ${Math.round(angles.elbow)}° · shoulder ${Math.round(angles.shoulder)}° · body ${Math.round(angles.body)}°`;
    }
    function updatePoseStatus(evaluation) {
      const status = $('arenaBodyStatus');
      if (!status || !evaluation) return;
      const stage = evaluation.stage;
      const active = ['CAPTURE_TOP','CAPTURE_BOTTOM','CONFIRM_TOP'].includes(stage);
      if (!active) return;
      const issues = issueLabels(evaluation);
      const label = stage === 'CAPTURE_BOTTOM' ? 'BOTTOM' : 'TOP';
      if (evaluation.usable && evaluation.allPass) {
        status.textContent = `${label} ✓ ${angleSummary(evaluation)} · hold steady · snap`;
        status.dataset.visible = 'true'; status.dataset.form = 'pass';
      } else {
        status.textContent = `Adjust ${label}: ${issues.join(' · ') || 'hold a clear side view'}${evaluation.usable ? ` · ${angleSummary(evaluation)}` : ''}`;
        status.dataset.visible = 'false'; status.dataset.form = 'fail';
      }
    }
    function drawPose(packet, frame, confidence) {
      const context = overlay?.getContext?.('2d');
      if (!context) return;
      const displayWidth = Math.max(1, Math.round(overlay.clientWidth || video.clientWidth || video.videoWidth || 1));
      const displayHeight = Math.max(1, Math.round(overlay.clientHeight || video.clientHeight || video.videoHeight || 1));
      const dpr = Math.max(1, Math.min(3, Number(root.devicePixelRatio) || 1));
      const pixelWidth = Math.max(1, Math.round(displayWidth * dpr)), pixelHeight = Math.max(1, Math.round(displayHeight * dpr));
      if (overlay.width !== pixelWidth) overlay.width = pixelWidth;
      if (overlay.height !== pixelHeight) overlay.height = pixelHeight;
      context.setTransform?.(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, displayWidth, displayHeight);
      if (!packet?.keypoints?.length || !video.videoWidth || !video.videoHeight) return;

      const sourceWidth = Number(packet?.video?.width || video.videoWidth), sourceHeight = Number(packet?.video?.height || video.videoHeight);
      const scale = Math.min(displayWidth / sourceWidth, displayHeight / sourceHeight);
      const renderedWidth = sourceWidth * scale, renderedHeight = sourceHeight * scale;
      const offsetX = (displayWidth - renderedWidth) / 2, offsetY = (displayHeight - renderedHeight) / 2;
      const mirrored = String(video.style?.transform || '').includes('scaleX(-1)');
      const map = point => {
        const rawX = offsetX + Number(point.x) * scale;
        return {x: mirrored ? displayWidth - rawX : rawX, y: offsetY + Number(point.y) * scale};
      };
      const points = Object.fromEntries((packet.keypoints || []).filter(point => Number(point.score) >= .12)
        .map(point => [point.name || point.part, {...point, ...map(point)}]));
      const links = [['left_shoulder','right_shoulder'],['left_shoulder','left_elbow'],['left_elbow','left_wrist'],['right_shoulder','right_elbow'],['right_elbow','right_wrist'],['left_shoulder','left_hip'],['right_shoulder','right_hip'],['left_hip','right_hip'],['left_hip','left_knee'],['left_knee','left_ankle'],['right_hip','right_knee'],['right_knee','right_ankle']];
      const evaluation = frame ? calibration.evaluate(frame, confidence) : null;
      const selected = evaluation?.side;
      const stage = evaluation?.stage;
      const checks = evaluation?.checks || {};
      const GREEN = '#4ee19a', RED = '#ff5d73';
      const confidenceGood = point => Number(point?.score || 0) >= confidence;
      function formPassForLink(a, b) {
        if (!confidenceGood(points[a]) || !confidenceGood(points[b])) return false;
        if (!selected || !stage) return true;
        const side = a.startsWith('left_') || b.startsWith('left_') ? 'left' : (a.startsWith('right_') || b.startsWith('right_') ? 'right' : null);
        if (side && side !== selected) return true;
        const arm = /_(shoulder|elbow|wrist)$/.test(a) && /_(shoulder|elbow|wrist)$/.test(b);
        const body = /_(shoulder|hip|knee|ankle)$/.test(a) && /_(shoulder|hip|knee|ankle)$/.test(b) && !arm;
        if (arm) return stage === 'CAPTURE_BOTTOM' ? checks.elbowDepth !== false : checks.elbowExtension !== false && checks.shoulderStack !== false;
        if (body) return checks.bodyLine !== false;
        return true;
      }
      context.lineCap = 'round'; context.lineJoin = 'round'; context.lineWidth = Math.max(3, displayWidth / 120);
      for (const [a,b] of links) {
        if (!points[a] || !points[b]) continue;
        context.strokeStyle = formPassForLink(a,b) ? GREEN : RED;
        context.beginPath(); context.moveTo(points[a].x,points[a].y); context.lineTo(points[b].x,points[b].y); context.stroke();
      }
      for (const [name, point] of Object.entries(points)) {
        let pass = confidenceGood(point);
        if (selected && name.startsWith(`${selected}_`)) {
          if (['elbow','wrist'].some(joint => name.endsWith(`_${joint}`))) pass = pass && (stage === 'CAPTURE_BOTTOM' ? checks.elbowDepth !== false : checks.elbowExtension !== false && checks.shoulderStack !== false);
          if (['hip','knee','ankle'].some(joint => name.endsWith(`_${joint}`))) pass = pass && checks.bodyLine !== false;
          if (name.endsWith('_shoulder')) pass = pass && (stage === 'CAPTURE_BOTTOM' ? checks.bodyLine !== false : checks.shoulderStack !== false && checks.bodyLine !== false);
        }
        context.fillStyle = pass ? GREEN : RED;
        context.beginPath(); context.arc(point.x,point.y,Math.max(4,displayWidth/95),0,Math.PI*2); context.fill();
      }
      updatePoseStatus(evaluation);
    }
    function stopCamera() {cameraOperation++; liveMotion?.release('CAMERA_STOPPED'); camera.stop(); calibration.reset(); $('arenaCameraChoice').hidden = true;}
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
        BODY_VISIBLE: 'Required joints visible · green = usable · red = adjust',
        CALIBRATING_TOP: 'TOP: get mostly green · hold briefly · snap',
        CALIBRATING_BOTTOM: 'BOTTOM: lower · get mostly green · hold briefly · snap',
        CONFIRMING_TOP: 'Back to TOP · hold briefly · snap',
        CALIBRATED: 'TOP ✓ · BOTTOM ✓ · calibration complete',
        CALIBRATION_RETRY: "Didn't get it · rest for a second · captured poses are kept when possible"
      }[state.state];
      $('arenaBodyStatus').textContent = cameraStatus || 'Waiting for a clear full-body view · red joints need attention';
      $('arenaBodyStatus').dataset.visible = String(Boolean(cameraStatus) && state.state !== 'CALIBRATION_RETRY');
      $('arenaBodyStatus').dataset.form = state.state === 'CALIBRATED' ? 'pass' : 'neutral';
      if (pointer && !state.canMove) releasePointer();
      if (state.state === 'INTRO' && doc.activeElement === $('arenaStopApproach')) $('arenaSetupCamera').focus();
      if (state.state === 'GYM' && previousState === 'RETURNING' && panel.contains(doc.activeElement)) $('arenaGoToMat').focus();
      previousState = state.state;
    }
    flow = root.PocketPTArenaPhoneFlow.create({send, mark, onChange: render, stopCamera});
    function restartPoseCapture({restartCamera = false} = {}) {
      challengeArmed = false;
      camera.resetTracking();
      calibration.reset();
      if (restartCamera) {
        stopCamera();
        flow.setup();
        return enableCamera();
      }
      if (!flow.snapshot().previewOnly) calibration.start();
      return true;
    }
    async function handleArenaVoiceCommand(command) {
      const words = String(command || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
      if (['reset','restart','start over','restart everything'].includes(words)) {
        await root.CoachRuntime?.speak?.('Resetting. Get into a side-view push-up top position. Say ready when you are in position.', 'arena-command', {owner:'arena_voice_command', interruptible:false, timerNeutral:true});
        return restartPoseCapture({restartCamera:false});
      }
      if (['ready','i am ready','im ready'].includes(words)) {
        challengeArmed = false;
        if (!flow.snapshot().cameraView) {
          if (flow.setup()) await enableCamera();
        } else {
          camera.resetTracking();
          calibration.reset();
          if (!flow.snapshot().previewOnly) calibration.start();
        }
        await root.CoachRuntime?.speak?.('Get into your push-up top position in a side view. I am scanning now.', 'arena-command', {owner:'arena_voice_command', interruptible:false, timerNeutral:true});
        return true;
      }
      if (['start','go','begin'].includes(words) && challengeArmed) {
        await root.CoachRuntime?.speak?.('Three. Two. One. Go.', 'arena-command', {owner:'arena_voice_command', interruptible:false, timerNeutral:true});
        root.dispatchEvent?.(new CustomEvent('pocketpt:pushup-start-requested', {detail:{source:'voice'}}));
        return true;
      }
      return false;
    }
    liveMotion = root.PocketPTArenaLiveMotion?.create({send: (event, payload) => flow.liveMocap(event, payload), mark,
      onRestReady: () => {if (!flow.snapshot().previewOnly && calibration.snapshot().stage === 'IDLE') calibration.start();}});
    mark('MIRROR_MOTION_INPUT', liveMotion ? 'WAITING' : 'FAIL', liveMotion ? 'MIRROR_INPUT_WAITING' : 'MIRROR_RUNTIME_MISSING');
    challengeVoice = root.PocketPTArenaCoachRuntime?.installCommandHandler?.(handleArenaVoiceCommand) || null;
    render(flow.snapshot());
    async function enableCamera(deviceId = '') {
      if (deviceId) {stopCamera(); flow.cameraError();}
      if (!flow.cameraStarting()) return;
      $('arenaReturnToGym').focus();
      const generation = ++cameraOperation;
      try {
        await liveMotion?.activateVoice?.();
        await camera.start(deviceId);
        if (generation === cameraOperation) flow.cameraActive();
      }
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
      camera.resetTracking();
      if (!calibration.retry?.()) calibration.start();
      $('arenaReturnToGym').focus();
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
      close() {releasePointer(); challengeVoice?.dispose?.(); liveMotion?.reset(); scope = null; flow.close(); camera.dispose?.();}
    };
  }
  root.PocketPTArenaPhoneUI = Object.freeze({mount});
})(window);