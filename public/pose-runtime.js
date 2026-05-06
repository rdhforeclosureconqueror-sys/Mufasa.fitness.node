(function initPoseRuntime(globalScope) {
  'use strict';

  const global = globalScope || window;
  const state = global.__POSE_RUNTIME_STATE = {
    ...(global.__POSE_RUNTIME_STATE || {}),
    loaded: true,
    detectorReady: false,
    detectorInitStartedAt: null,
    detectorInitCompletedAt: null,
    detectorInitMs: null,
    detectorBackend: null,
    detectorError: null,
    optionalTrackers: { face: false, hand: false },
    optionalTrackerErrors: {},
    loopRunning: false,
    loopStartedAt: null,
    loopFrameCount: 0,
    lastFrameAt: null,
    lastError: null
  };

  function log(message, details) {
    if (details === undefined) console.log(`[POSE_RUNTIME] ${message}`);
    else console.log(`[POSE_RUNTIME] ${message}`, details);
  }

  function setVisibleRuntimeError(message) {
    state.lastError = message;
    const poseStatus = global.document?.getElementById('poseStatus');
    const brainStatus = global.document?.getElementById('brainStatus');
    const featurePanel = global.document?.getElementById('featureActivationStatus');
    if (poseStatus) {
      poseStatus.textContent = message;
      poseStatus.classList?.add?.('status-bad');
    }
    if (brainStatus) brainStatus.textContent = message;
    if (featurePanel && !String(featurePanel.textContent || '').includes(message)) {
      featurePanel.textContent = `${featurePanel.textContent || ''}\npose runtime error: ${message}`.trim();
    }
  }

  async function initMoveNetDetector(options) {
    const {
      tf = global.tf,
      poseDetection = global.poseDetection,
      ensurePoseRuntime = global.__ensurePoseRuntime,
      mobileDevice = false,
      markPerfMetric = global.__markPerfMetric,
      trackPilotEvent,
      trackingCapabilities,
      logTrackerCapabilities
    } = options || {};

    state.detectorInitStartedAt = new Date().toISOString();
    state.detectorError = null;
    state.detectorReady = false;
    const startedAt = global.performance?.now?.() || Date.now();
    log('detector init requested');

    try {
      if (typeof ensurePoseRuntime === 'function') await ensurePoseRuntime();
      const tfRuntime = tf || global.tf;
      const poseRuntime = poseDetection || global.poseDetection;
      if (!tfRuntime) throw new Error('tf runtime unavailable');
      if (!poseRuntime) throw new Error('poseDetection runtime unavailable');

      try {
        await tfRuntime.setBackend(mobileDevice ? 'cpu' : 'webgl');
      } catch (err) {
        console.warn('[POSE_RUNTIME] preferred backend unavailable, attempting cpu backend', err);
        await tfRuntime.setBackend('cpu');
      }
      await tfRuntime.ready();

      const detector = await poseRuntime.createDetector(
        poseRuntime.SupportedModels.MoveNet,
        { modelType: poseRuntime.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );

      state.detectorReady = true;
      state.detectorBackend = tfRuntime.getBackend?.() || 'unknown';
      state.detectorInitMs = Math.round((global.performance?.now?.() || Date.now()) - startedAt);
      state.detectorInitCompletedAt = new Date().toISOString();
      if (trackingCapabilities) trackingCapabilities.hasMoveNet = true;
      if (typeof markPerfMetric === 'function') markPerfMetric('cameraBootMs', state.detectorInitMs);
      if (typeof trackPilotEvent === 'function') {
        trackPilotEvent('app_loaded', {
          detectorInitMs: state.detectorInitMs,
          tfBackend: state.detectorBackend,
          poseRuntimeOwner: 'pose-runtime.js'
        });
      }
      if (typeof logTrackerCapabilities === 'function') logTrackerCapabilities();
      log('MoveNet detector ready', { detectorInitMs: state.detectorInitMs, backend: state.detectorBackend });
      return detector;
    } catch (err) {
      const message = err?.message || String(err || 'pose_detector_init_failed');
      state.detectorError = message;
      state.detectorReady = false;
      if (trackingCapabilities) trackingCapabilities.hasMoveNet = false;
      if (typeof logTrackerCapabilities === 'function') logTrackerCapabilities();
      setVisibleRuntimeError(`Pose detector failed: ${message}`);
      console.error('[POSE_RUNTIME] detector init failed', err);
      throw err;
    }
  }

  async function initOptionalTrackers(options) {
    const {
      mobileDevice = false,
      faceLandmarksDetection = global.faceLandmarksDetection,
      handPoseDetection = global.handPoseDetection,
      trackingCapabilities,
      logTrackerCapabilities
    } = options || {};

    const result = { faceDetector: null, handDetector: null };
    state.optionalTrackers = { face: false, hand: false };
    state.optionalTrackerErrors = {};

    if (trackingCapabilities) {
      trackingCapabilities.hasFaceMesh = false;
      trackingCapabilities.hasHandTracking = false;
    }

    if (mobileDevice) {
      log('optional face/hand trackers disabled on mobile');
      if (typeof logTrackerCapabilities === 'function') logTrackerCapabilities();
      return result;
    }

    try {
      const faceRuntime = faceLandmarksDetection || global.faceLandmarksDetection;
      if (!faceRuntime) throw new Error('facemesh_lib_unavailable');
      result.faceDetector = await faceRuntime.createDetector(
        faceRuntime.SupportedModels.MediaPipeFaceMesh,
        { runtime: 'tfjs', refineLandmarks: true, maxFaces: 1 }
      );
      state.optionalTrackers.face = true;
      if (trackingCapabilities) trackingCapabilities.hasFaceMesh = true;
    } catch (err) {
      state.optionalTrackerErrors.face = err?.message || String(err || 'face_tracker_failed');
      console.warn('[POSE_RUNTIME] face tracker load failed', err);
    }

    try {
      const handRuntime = handPoseDetection || global.handPoseDetection;
      if (!handRuntime) throw new Error('hand_lib_unavailable');
      result.handDetector = await handRuntime.createDetector(
        handRuntime.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite', maxHands: 2 }
      );
      state.optionalTrackers.hand = true;
      if (trackingCapabilities) trackingCapabilities.hasHandTracking = true;
    } catch (err) {
      state.optionalTrackerErrors.hand = err?.message || String(err || 'hand_tracker_failed');
      console.warn('[POSE_RUNTIME] hand tracker load failed', err);
    }

    if (typeof logTrackerCapabilities === 'function') logTrackerCapabilities();
    log('optional trackers initialized', state.optionalTrackers);
    return result;
  }

  function normalizePosePacket(pose, video) {
    const keypoints = Array.isArray(pose?.keypoints) ? pose.keypoints : [];
    return {
      pose,
      keypoints,
      video: {
        width: video?.videoWidth || video?.clientWidth || 0,
        height: video?.videoHeight || video?.clientHeight || 0
      },
      at: Date.now(),
      tracker: { mode: 'movenet', visibleLandmarks: keypoints.filter((kp) => (kp?.score || 0) > 0.3).map((kp) => kp.name || kp.part || null).filter(Boolean) }
    };
  }

  function startPoseLoop(options) {
    const {
      detector,
      video,
      isRunning = () => true,
      onPoseFrame,
      onError,
      requestAnimationFrame = global.requestAnimationFrame?.bind(global),
      cancelAnimationFrame = global.cancelAnimationFrame?.bind(global)
    } = options || {};

    if (!detector) {
      const err = new Error('pose detector missing');
      setVisibleRuntimeError('Pose loop could not start: detector missing.');
      if (typeof onError === 'function') onError(err);
      throw err;
    }
    if (!video) {
      const err = new Error('video element missing');
      setVisibleRuntimeError('Pose loop could not start: video element missing.');
      if (typeof onError === 'function') onError(err);
      throw err;
    }
    if (typeof requestAnimationFrame !== 'function') {
      const err = new Error('requestAnimationFrame unavailable');
      setVisibleRuntimeError('Pose loop could not start: requestAnimationFrame unavailable.');
      if (typeof onError === 'function') onError(err);
      throw err;
    }

    state.loopRunning = true;
    state.loopStartedAt = new Date().toISOString();
    state.loopFrameCount = 0;
    log('pose loop started');

    let frameId = null;
    let stopped = false;

    async function frame() {
      if (stopped || !isRunning()) {
        state.loopRunning = false;
        log('pose loop stopped');
        return;
      }
      try {
        const poses = await detector.estimatePoses(video, { flipHorizontal: true });
        const pose = Array.isArray(poses) && poses.length ? poses[0] : null;
        const posePacket = normalizePosePacket(pose, video);
        state.loopFrameCount += 1;
        state.lastFrameAt = new Date().toISOString();
        global.__lastPoseRuntimeFrame = posePacket;
        if (typeof onPoseFrame === 'function') onPoseFrame({ pose, posePacket, poses });
      } catch (err) {
        const message = err?.message || String(err || 'pose_loop_failed');
        state.lastError = message;
        console.error('[POSE_RUNTIME] pose loop frame failed', err);
        setVisibleRuntimeError(`Pose loop error: ${message}`);
        if (typeof onError === 'function') onError(err);
      }
      frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame(frame);
    return {
      stop() {
        stopped = true;
        state.loopRunning = false;
        if (frameId != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameId);
        log('pose loop stop requested');
      }
    };
  }

  global.PoseRuntime = {
    initMoveNetDetector,
    initOptionalTrackers,
    normalizePosePacket,
    startPoseLoop,
    getState: () => ({ ...state, optionalTrackers: { ...state.optionalTrackers }, optionalTrackerErrors: { ...state.optionalTrackerErrors } })
  };

  log('loaded');
})(typeof window !== 'undefined' ? window : globalThis);
