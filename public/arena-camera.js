(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaCamera = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const JOINTS = ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'];
  function visible(frame, minimumConfidence) {
    return Number.isFinite(minimumConfidence) && frame?.analysisUsable === true && frame.trackingState === 'LOCKED' &&
      JOINTS.every(name => {
        const p = frame.sequenceLandmarks?.[name];
        return p && !p.cached && !p.displayOnly && Number.isFinite(p.x) && Number.isFinite(p.y) &&
          p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1 && Number.isFinite(p.confidence) && p.confidence >= minimumConfidence;
      });
  }
  function create({root = window, video, onVisibility = () => {}, onPose = () => {}, onStatus = () => {}, onDevices = () => {}, onFailure = () => {}}) {
    let current = null, detectorTask = null, retiredDetector = Promise.resolve();
    const aborted = () => Object.assign(new Error('Camera operation cancelled'), {name: 'AbortError'});
    function stopTracks(stream) {stream?.getTracks?.().forEach(track => track.stop());}
    function dispose(op) {
      if (!op || op.cancelled) return;
      op.cancelled = true;
      root.clearTimeout(op.timeout); root.clearTimeout(op.staleTimer);
      op.capture?.stop(); op.camera.stop();
      for (const cleanup of op.cleanups) cleanup();
      if (video.srcObject === op.stream) {video.srcObject = null; video.style.transform = '';}
      op.rejectCancel(aborted());
    }
    function stop() {const op = current; current = null; dispose(op); onVisibility(false);}
    function detectorForSession() {
      if (!detectorTask) {
        const task = retiredDetector.then(() => {
          if (!current) throw aborted();
          return root.PoseRuntime.initMoveNetDetector({ensurePoseRuntime: root.__ensurePoseRuntime});
        });
        detectorTask = task;
        task.catch(() => {if (detectorTask === task) detectorTask = null;});
      }
      return detectorTask;
    }
    function disposeSession() {
      stop();
      if (detectorTask) {
        retiredDetector = detectorTask.then(detector => detector.dispose?.()).catch(() => {});
        detectorTask = null;
      }
    }
    async function start(deviceId = '') {
      stop();
      if (root.isSecureContext === false || !root.navigator?.mediaDevices?.getUserMedia) {
        onStatus('CAMERA_PERMISSION', 'FAIL', 'CAMERA_UNAVAILABLE'); throw aborted();
      }
      const native = root.navigator.mediaDevices;
      const op = {cancelled: false, cleanups: [], stream: null, capture: null, phase: 'CAMERA_PERMISSION'};
      const cancelPromise = new Promise((_, reject) => {op.rejectCancel = reject;});
      const live = () => current === op && !op.cancelled;
      const check = () => {if (!live()) throw aborted();};
      // CameraController remains the stream owner. Guard unresolved permission
      // requests so a late grant after exit cannot mount or leave a camera on.
      const mediaDevices = {
        async getUserMedia(constraints) {
          check(); const stream = await native.getUserMedia(constraints);
          if (!live()) {stopTracks(stream); throw aborted();}
          onStatus('CAMERA_PERMISSION', 'PASS', 'CAMERA_GRANTED');
          op.phase = 'CAMERA_STREAM'; onStatus('CAMERA_STREAM', 'RUNNING', 'REQUEST_STARTED');
          return stream;
        },
        enumerateDevices: () => native.enumerateDevices()
      };
      op.camera = new root.PushUpChallenge.CameraController({mediaDevices, storage: null, video: null});
      current = op;
      onStatus('CAMERA_PERMISSION', 'RUNNING', 'CAMERA_REQUESTED');
      op.timeout = root.setTimeout(() => {
        if (!live()) return;
        onStatus(op.phase, 'FAIL', 'CAMERA_START_TIMEOUT');
        stop(); onFailure();
      }, 30000);
      async function work() {
        op.stream = await op.camera.open(deviceId); check();
        video.muted = true; video.playsInline = true; video.srcObject = op.stream;
        video.style.transform = op.camera.isMirrored ? 'scaleX(-1)' : '';
        if (!video.videoWidth || video.readyState < 1) await new Promise((resolve, reject) => {
          const cleanup = () => {video.removeEventListener('loadedmetadata', done); video.removeEventListener('error', fail);};
          const done = () => {cleanup(); resolve();};
          const fail = () => {cleanup(); reject(Object.assign(new Error('Video unavailable'), {name: 'NotReadableError'}));};
          op.cleanups.push(() => {cleanup(); reject(aborted());});
          video.addEventListener('loadedmetadata', done, {once: true}); video.addEventListener('error', fail, {once: true});
        });
        check(); await video.play(); check();
        if (!video.videoWidth || !video.videoHeight) throw new Error('Video dimensions unavailable');
        onStatus('CAMERA_STREAM', 'PASS', 'CAMERA_STREAM_READY');
        onDevices(op.camera.devices.map(device => ({id: device.deviceId, label: device.friendlyLabel})), op.camera.selectedDeviceId);
        for (const track of op.stream.getVideoTracks()) {
          const ended = () => {if (live()) {onStatus('CAMERA_STREAM', 'FAIL', 'CAMERA_ENDED'); stop(); onFailure();}};
          track.addEventListener?.('ended', ended); op.cleanups.push(() => track.removeEventListener?.('ended', ended));
        }
        op.phase = 'BODY_DETECTOR'; onStatus('BODY_DETECTOR', 'RUNNING', 'DETECTOR_STARTING');
        if (!root.__ensurePoseRuntime) root.RuntimeState.initHeadRuntime();
        await root.__loadExternalScript('/pose-runtime.js', {async: false, defer: false}); check();
        await root.__loadExternalScript('/exercise-metadata.js', {async: false, defer: false}); check();
        await root.__ensurePoseRuntime(); check();
        const detector = await detectorForSession(); check();
        const profile = root.PushUpChallenge.getPushUpProfile();
        const confidence = profile.poseAnalysis.rules[0].minimumLandmarkConfidence;
        op.capture = new root.PushUpChallenge.PoseCaptureEngine({profile, onFrame(frame) {
          if (!live()) return;
          const bodyVisible = visible(frame, confidence);
          onVisibility(bodyVisible);
          onPose(bodyVisible ? {...frame, sourceWidth: video.videoWidth, sourceHeight: video.videoHeight} : null, confidence);
          root.clearTimeout(op.staleTimer);
          op.staleTimer = root.setTimeout(() => {if (live()) {onVisibility(false); onPose(null, confidence);}}, 1500);
        }});
        await op.capture.start(video, {detector}); check();
        root.clearTimeout(op.timeout);
        onStatus('BODY_DETECTOR', 'PASS', 'DETECTOR_READY');
        return true;
      }
      try {return await Promise.race([work(), cancelPromise]);}
      catch (error) {
        if (live()) {
          const permission = ['NotAllowedError', 'SecurityError'].includes(error?.name);
          onStatus(permission ? 'CAMERA_PERMISSION' : op.phase, 'FAIL', permission ? 'CAMERA_DENIED' : 'CAMERA_START_FAILED');
          stop();
        }
        throw aborted(); // Do not leak browser/device/error strings into reports.
      }
    }
    function resetTracking() {current?.capture?.resetTracking(); onVisibility(false);}
    return {start, stop, resetTracking, dispose: disposeSession};
  }
  return Object.freeze({create, visible});
});
