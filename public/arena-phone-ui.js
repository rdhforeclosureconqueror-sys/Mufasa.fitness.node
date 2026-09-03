(function (root) {
  'use strict';
  function mount({game, mark, send}) {
    const doc = root.document, $ = id => doc.getElementById(id);
    const panel = $('arenaPhonePanel'), video = $('arenaCameraVideo');
    if (!panel || !root.PocketPTArenaPhoneFlow || !root.PocketPTArenaCamera) return null;
    let scope = null, pointer = null, cameraOperation = 0, flow, previousState = null;
    const camera = root.PocketPTArenaCamera.create({root, video,
      onVisibility: visible => flow?.visibility(visible), onStatus: mark,
      onFailure: () => flow?.cameraError(),
      onDevices(devices, selected) {
        $('arenaCameraSelect').replaceChildren(...devices.map(device => {
          const option = doc.createElement('option'); option.value = device.id; option.textContent = device.label; option.selected = device.id === selected; return option;
        }));
        $('arenaCameraChoice').hidden = devices.length < 2;
      }
    });
    function stopCamera() {cameraOperation++; camera.stop(); $('arenaCameraChoice').hidden = true;}
    function releasePointer() {
      const held = pointer; pointer = null;
      if (held?.element.hasPointerCapture?.(held.id)) held.element.releasePointerCapture(held.id);
      flow.release();
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
      $('arenaReturnToGym').hidden = ['CONNECTING', 'CLOSED', 'GYM', 'LEGACY', 'NEGOTIATING', 'APPROACHING'].includes(state.state);
      $('arenaReturnToGym').disabled = state.state === 'RETURNING';
      $('arenaRepeatBriefing').hidden = state.state !== 'INTRO';
      $('arenaCameraStage').hidden = !state.cameraView;
      game.inert = !['CONNECTING', 'GYM', 'LEGACY', 'NEGOTIATING'].includes(state.state);
      game.style.visibility = state.cameraView ? 'hidden' : '';
      $('arenaCameraSelect').disabled = !['CAMERA_POSITIONING', 'BODY_VISIBLE'].includes(state.state);
      $('arenaBodyStatus').textContent = state.state === 'BODY_VISIBLE' ? 'Required joints visible · challenge has not started' : 'Waiting for a clear full-body view';
      $('arenaBodyStatus').dataset.visible = String(state.state === 'BODY_VISIBLE');
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
      try {await camera.start(deviceId); if (generation === cameraOperation) flow.cameraActive();}
      catch (_) {if (generation === cameraOperation) flow.cameraError();}
    }
    $('arenaGoToMat').addEventListener('click', () => {if (flow.approach()) $('arenaStopApproach').focus();});
    $('arenaStopApproach').addEventListener('click', () => {flow.cancelApproach(); $('arenaGoToMat').focus();});
    $('arenaSetupCamera').addEventListener('click', () => {
      if (flow.setup()) $('arenaEnableCamera').focus();
    });
    $('arenaEnableCamera').addEventListener('click', () => enableCamera());
    $('arenaReturnToGym').addEventListener('click', () => {if (flow.returnToGym()) (flow.snapshot().state === 'RETURNING' ? $('arenaPhoneMessage') : $('arenaSetupCamera')).focus();});
    $('arenaCameraSelect').addEventListener('change', () => enableCamera($('arenaCameraSelect').value));
    $('arenaRepeatBriefing').addEventListener('click', () => $('arenaPhoneMessage').focus());
    for (const button of panel.querySelectorAll('[data-arena-move]')) {
      button.addEventListener('pointerdown', event => {
        if (pointer || event.button !== 0 || !flow.hold(button.dataset.arenaMove)) return;
        event.preventDefault(); pointer = {id: event.pointerId, element: button};
        try {button.setPointerCapture(event.pointerId);} catch (_) {releasePointer();}
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => {if (pointer?.id === event.pointerId) releasePointer();});
      button.addEventListener('click', event => {if (event.detail === 0) flow.nudge(button.dataset.arenaMove);});
    }
    $('arenaThumbStop').addEventListener('click', releasePointer);
    root.addEventListener('blur', releasePointer);
    root.addEventListener('orientationchange', () => {releasePointer(); camera.resetTracking();});
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
