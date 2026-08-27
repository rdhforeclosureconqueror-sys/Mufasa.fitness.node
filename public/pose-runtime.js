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
    lastError: null,
    latestPose: null,
    latestPosePacket: null,
    latestPoses: null,
    engineName: 'TensorFlow.js MoveNet',
    modelName: 'MoveNet SinglePose Lightning',
    tfReady: false,
    inferenceGeneration: 0,
    framesAttempted: 0,
    framesSuccessful: 0,
    framesFailed: 0,
    lastInferenceMs: null,
    poseEventDispatchCount: 0,
    poseEventReceivedCount: 0,
    lastPoseEventAt: null,
    sourceElementId: null,
    sourceConnected: false,
    sourceDimensions: '0x0',
    framingState: 'NO_PERSON',
    framingReason: 'MoveNet has not returned a person.',
    firstFailingBoundary: 'NONE'
  };

  const KEYPOINT_THRESHOLD = 0.3;
  const UPPER_BODY_JOINTS = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip'];
  const FULL_BODY_JOINTS = [...UPPER_BODY_JOINTS, 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
  const REPORTED_JOINTS = ['nose', ...FULL_BODY_JOINTS];

  function keypointName(point) { return point?.name || point?.part || ''; }
  function score(point) { return Number(point?.score || 0); }
  function classifyPose(pose, video) {
    const keypoints = Array.isArray(pose?.keypoints) ? pose.keypoints : [];
    const byName = Object.fromEntries(keypoints.map((point) => [keypointName(point), point]));
    const visible = keypoints.filter((point) => score(point) >= KEYPOINT_THRESHOLD);
    const upperVisible = UPPER_BODY_JOINTS.filter((name) => score(byName[name]) >= KEYPOINT_THRESHOLD).length;
    const fullVisible = FULL_BODY_JOINTS.filter((name) => score(byName[name]) >= KEYPOINT_THRESHOLD).length;
    const width = Number(video?.videoWidth || video?.clientWidth || 0);
    const height = Number(video?.videoHeight || video?.clientHeight || 0);
    const xs = visible.map((point) => Number(point.x)).filter(Number.isFinite);
    const ys = visible.map((point) => Number(point.y)).filter(Number.isFinite);
    const coverageWidth = width && xs.length > 1 ? (Math.max(...xs) - Math.min(...xs)) / width : 0;
    const coverageHeight = height && ys.length > 1 ? (Math.max(...ys) - Math.min(...ys)) / height : 0;
    let framingState = 'NO_PERSON';
    let framingReason = 'MoveNet returned no person.';
    if (pose && keypoints.length) {
      framingState = 'LOW_CONFIDENCE';
      framingReason = `Only ${visible.length}/${keypoints.length} keypoints meet the ${KEYPOINT_THRESHOLD.toFixed(2)} confidence threshold.`;
      if (visible.length >= 5 && (coverageHeight > 0.88 || coverageWidth > 0.82)) {
        framingState = 'TOO_CLOSE'; framingReason = `Body coverage ${Math.round(coverageWidth * 100)}% wide × ${Math.round(coverageHeight * 100)}% high exceeds the 82%/88% close limit.`;
      } else if (visible.length >= 5 && coverageHeight < 0.32) {
        framingState = 'TOO_FAR'; framingReason = `Body height covers ${Math.round(coverageHeight * 100)}% of the source, below the 32% minimum.`;
      } else if (fullVisible === FULL_BODY_JOINTS.length) {
        framingState = 'FULL_BODY_READY'; framingReason = `All ${FULL_BODY_JOINTS.length} required full-body joints meet confidence ${KEYPOINT_THRESHOLD.toFixed(2)}.`;
      } else if (upperVisible === UPPER_BODY_JOINTS.length) {
        framingState = 'UPPER_BODY_READY'; framingReason = `All ${UPPER_BODY_JOINTS.length} required upper-body joints meet confidence ${KEYPOINT_THRESHOLD.toFixed(2)}; knees/ankles are incomplete.`;
      }
    }
    const confidenceScores = keypoints.map(score).filter((value) => value > 0);
    return { framingState, framingReason, byName, visibleCount: visible.length, totalCount: keypoints.length, upperVisible, fullVisible, coverageWidth, coverageHeight, overallConfidence: Number(pose?.score ?? (confidenceScores.length ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0)) };
  }

  function failureBoundary() {
    const trace = global.__POSE_BOOTSTRAP_TRACE || {};
    if (trace.firstFailingBoundary && trace.firstFailingBoundary !== 'NONE') return trace.firstFailingBoundary;
    if (!trace.connectClickReceived) return 'NONE';
    if (!state.cameraStreamActive) return 'CAMERA_NOT_ACTIVE';
    if (!global.tf) return 'TF_NOT_LOADED';
    if (!state.tfReady) return 'TF_BACKEND_NOT_READY';
    if (!state.detectorReady) return 'MODEL_NOT_CREATED';
    if (!state.cameraStreamActive) return 'CAMERA_NOT_ACTIVE';
    if (!state.sourceConnected) return 'SOURCE_ELEMENT_MISSING';
    if (state.sourceDimensions === '0x0') return 'SOURCE_ZERO_SIZE';
    if (!state.loopRunning) return 'INFERENCE_LOOP_NOT_STARTED';
    if (state.lastError) return 'INFERENCE_EXCEPTION';
    if (!state.framesAttempted) return 'ESTIMATE_POSES_NOT_ENTERED';
    return 'NONE';
  }

  function framingMessage(value) {
    return { NO_PERSON: 'Looking for you…', LOW_CONFIDENCE: 'Hold still for a moment.', TOO_CLOSE: 'Step back — I need to see more of your body.', TOO_FAR: 'Move closer.', UPPER_BODY_READY: 'Upper body detected.', FULL_BODY_READY: 'Body tracking ready. Full body detected.' }[value] || 'Looking for you…';
  }

  function renderProof() {
    const now = Date.now();
    state.cameraStreamActive = Boolean(state.sourceVideo?.srcObject && state.sourceVideo.srcObject.active !== false);
    state.visibleCameraLayer = state.sourceVideo?.style?.visibility === 'hidden' ? 'HIDDEN' : 'VISIBLE';
    state.firstFailingBoundary = failureBoundary();
    const syncText = global.document?.getElementById?.('syncStatus')?.textContent || 'unknown';
    const lines = [
      `Pose engine initialized: ${state.detectorReady ? 'YES' : 'NO'}`, `Pose engine name: ${state.engineName}`, `Pose model: ${state.modelName}`,
      `TensorFlow backend: ${state.detectorBackend || 'unavailable'}`, `TensorFlow ready: ${state.tfReady ? 'YES' : 'NO'}`, '',
      `Camera stream active: ${state.cameraStreamActive ? 'YES' : 'NO'}`, `Visible camera/video layer: ${state.visibleCameraLayer || 'VISIBLE'}`, `Inference source element ID: ${state.sourceElementId || 'none'}`,
      `Inference source connected: ${state.sourceConnected ? 'YES' : 'NO'}`, `Inference source dimensions: ${state.sourceDimensions}`, '',
      `Pose inference loop running: ${state.loopRunning ? 'YES' : 'NO'}`, `Pose inference generation: ${state.inferenceGeneration}`, `Pose frames attempted: ${state.framesAttempted}`,
      `Pose frames successful: ${state.framesSuccessful}`, `Pose frames failed: ${state.framesFailed}`, `Last pose frame age: ${state.lastFrameAt ? now - Date.parse(state.lastFrameAt) : 'unavailable'}ms`, `Last inference duration: ${state.lastInferenceMs == null ? 'unavailable' : state.lastInferenceMs}ms`, '',
      `Person detected: ${state.latestPose ? 'YES' : 'NO'}`, `Pose count: ${state.latestPoses?.length || 0}`, `Overall pose confidence: ${(state.overallConfidence || 0).toFixed(3)}`,
      `Keypoints detected above threshold: ${state.visibleKeypointCount || 0}/${state.totalKeypointCount || 0}`, '',
      ...REPORTED_JOINTS.map((name) => `${name}: confidence=${score(state.keypointsByName?.[name]).toFixed(3)}`), '',
      `Framing state: ${state.framingState}`, `Framing reason: ${state.framingReason}`, `Required upper-body joints visible: ${state.upperVisible || 0}/${UPPER_BODY_JOINTS.length}`, `Required full-body joints visible: ${state.fullVisible || 0}/${FULL_BODY_JOINTS.length}`, '',
      `Pose frame produced count: ${state.framesSuccessful}`, `Pose event emitted: ${state.poseEventDispatchCount ? 'YES' : 'NO'}`, `Pose event name: pose-runtime:frame`, `Pose event generation: ${state.poseEventDispatchCount}`,
      `Pose event dispatch count: ${state.poseEventDispatchCount}`, `Pose event received count: ${state.poseEventReceivedCount}`, `Last pose event timestamp: ${state.lastPoseEventAt || 'none'}`, `Last pose event age: ${state.lastPoseEventAt ? now - Date.parse(state.lastPoseEventAt) : 'unavailable'}ms`, `Consumer count: ${state.eventConsumerCount || 0}`, '',
      `Backend sync initialized: YES`, `Backend sync resolved: ${/checking/i.test(syncText) ? 'NO' : 'YES'}`, `Backend sync state: ${syncText}`, `Backend sync blocks pose inference: NO`, '',
      `Last pose error: ${state.lastError || state.detectorError || 'NONE'}`, `First failing boundary: ${state.firstFailingBoundary}`
    ];
    const panel = global.document?.getElementById?.('poseTrackingProofValues'); if (panel) panel.textContent = lines.join('\n');
    const trace = global.__POSE_BOOTSTRAP_TRACE || {};
    const yn = (value) => value ? 'YES' : 'NO';
    const traceLines = [
      `Connect Camera click received: ${yn(trace.connectClickReceived)}`, `Connect Camera handler entry count: ${trace.connectHandlerEntryCount || 0}`, '',
      `getUserMedia requested: ${yn(trace.getUserMediaRequested)}`, `getUserMedia resolved: ${yn(trace.getUserMediaResolved)}`, `getUserMedia rejected: ${yn(trace.getUserMediaRejected)}`, `getUserMedia error name: ${trace.getUserMediaErrorName || 'NONE'}`, `getUserMedia error message: ${trace.getUserMediaErrorMessage || 'NONE'}`, '',
      `Media stream ID: ${trace.mediaStreamId || 'none'}`, `Video track count: ${trace.videoTrackCount || 0}`, `Video track readyState: ${trace.videoTrackReadyState || 'none'}`, `Video track enabled: ${trace.videoTrackEnabled == null ? 'unknown' : yn(trace.videoTrackEnabled)}`, `Video track muted: ${trace.videoTrackMuted == null ? 'unknown' : yn(trace.videoTrackMuted)}`, '',
      `Production video element found: ${yn(trace.productionVideoFound)}`, `Production video element ID: ${trace.productionVideoElementId || 'none'}`, `Production video DOM connected: ${yn(trace.productionVideoDomConnected)}`, `srcObject assigned: ${yn(trace.srcObjectAssigned)}`, `srcObject === active stream: ${yn(trace.srcObjectMatchesStream)}`, `video.readyState: ${trace.videoReadyState ?? 0}`, `videoWidth: ${trace.videoWidth || 0}`, `videoHeight: ${trace.videoHeight || 0}`, `loadedmetadata received: ${yn(trace.loadedmetadataReceived)}`, `loadeddata received: ${yn(trace.loadeddataReceived)}`, `canplay received: ${yn(trace.canplayReceived)}`, `playing received: ${yn(trace.playingReceived)}`, '',
      `video.play() requested: ${yn(trace.videoPlayRequested)}`, `video.play() resolved: ${yn(trace.videoPlayResolved)}`, `video.play() rejected: ${yn(trace.videoPlayRejected)}`, `video.play() error: ${trace.videoPlayError || 'NONE'}`, '',
      `TensorFlow loader requested: ${yn(trace.tfLoaderRequested)}`, `TensorFlow script/module URL: ${(trace.dependencyAttempts || []).map((item) => `${item.url} [${item.status}]`).join(', ') || 'none'}`, `TensorFlow load resolved: ${yn(trace.tfLoadResolved)}`, `TensorFlow load failed: ${yn(trace.tfLoadFailed)}`, `window.tf present: ${yn(trace.windowTfPresent)}`, `TensorFlow version: ${trace.tfVersion || 'unavailable'}`, '',
      `tf.ready entered: ${yn(trace.tfReadyEntered)}`, `tf.ready resolved: ${yn(trace.tfReadyResolved)}`, `tf.ready rejected: ${yn(trace.tfReadyRejected)}`, '',
      `Backend requested: ${trace.backendRequested || 'none'}`, `Backend set result: ${trace.backendSetResult == null ? 'none' : String(trace.backendSetResult)}`, `Backend active: ${trace.backendActive || 'unavailable'}`, '',
      `Pose detection library present: ${yn(trace.poseDetectionPresent)}`, `MoveNet detector create entered: ${yn(trace.detectorCreateEntered)}`, `MoveNet detector create resolved: ${yn(trace.detectorCreateResolved)}`, `MoveNet detector create rejected: ${yn(trace.detectorCreateRejected)}`, `MoveNet model/config: ${trace.detectorModelConfig || 'none'}`, '',
      `Inference loop start entered: ${yn(trace.inferenceLoopStartEntered)}`, `Inference loop running: ${yn(state.loopRunning)}`, `estimatePoses entered count: ${trace.estimatePosesEnteredCount || 0}`, `estimatePoses resolved count: ${trace.estimatePosesResolvedCount || 0}`, `estimatePoses rejected count: ${trace.estimatePosesRejectedCount || 0}`, '',
      `First failing boundary: ${trace.firstFailingBoundary || 'NONE'}`, `Last bootstrap error name: ${trace.lastErrorName || 'NONE'}`, `Last bootstrap error message: ${trace.lastErrorMessage || 'NONE'}`, `Last bootstrap error timestamp: ${trace.lastErrorTimestamp || 'NONE'}`
    ];
    const tracePanel = global.document?.getElementById?.('poseBootstrapTraceValues'); if (tracePanel) tracePanel.textContent = traceLines.join('\n');
    const overlay = global.document?.getElementById?.('poseFramingFeedback'); if (overlay) overlay.textContent = framingMessage(state.framingState);
  }

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

  function describeMissingDetectorDependencies(tfRuntime, poseRuntime) {
    const missing = [];
    if (!tfRuntime) missing.push('window.tf');
    if (!poseRuntime) missing.push('window.poseDetection');
    if (poseRuntime && typeof poseRuntime.createDetector !== 'function') missing.push('poseDetection.createDetector');
    if (poseRuntime && !poseRuntime.SupportedModels?.MoveNet) missing.push('poseDetection.SupportedModels.MoveNet');
    if (poseRuntime && !poseRuntime.movenet?.modelType?.SINGLEPOSE_LIGHTNING) missing.push('poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING');
    return missing;
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
    const trace = global.__POSE_BOOTSTRAP_TRACE || (global.__POSE_BOOTSTRAP_TRACE = {});

    try {
      if (typeof ensurePoseRuntime === 'function') await ensurePoseRuntime();
      const tfRuntime = tf || global.tf;
      const poseRuntime = poseDetection || global.poseDetection;
      const missingDependencies = describeMissingDetectorDependencies(tfRuntime, poseRuntime);
      if (missingDependencies.length) {
        throw new Error(`missing detector dependency: ${missingDependencies.join(', ')}`);
      }

      trace.windowTfPresent = Boolean(tfRuntime); trace.tfVersion = tfRuntime?.version?.tfjs || tfRuntime?.version_core || '';
      trace.poseDetectionPresent = Boolean(poseRuntime); trace.backendRequested = mobileDevice ? 'cpu' : 'webgl';
      try {
        trace.backendSetResult = await tfRuntime.setBackend(trace.backendRequested);
      } catch (err) {
        console.warn('[POSE_RUNTIME] preferred backend unavailable, attempting cpu backend', err);
        trace.backendRequested = 'cpu'; trace.backendSetResult = await tfRuntime.setBackend('cpu');
      }
      trace.tfReadyEntered = true;
      try { await tfRuntime.ready(); trace.tfReadyResolved = true; } catch (error) { trace.tfReadyRejected = true; global.__recordPoseBootstrapFailure?.('TF_READY_REJECTED', error); throw error; }
      state.tfReady = true;
      trace.backendActive = tfRuntime.getBackend?.() || 'unknown';

      trace.detectorCreateEntered = true; trace.detectorModelConfig = 'MoveNet SinglePose Lightning';
      const detector = await poseRuntime.createDetector(
        poseRuntime.SupportedModels.MoveNet,
        { modelType: poseRuntime.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      trace.detectorCreateResolved = true;

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
      if (trace.detectorCreateEntered && !trace.detectorCreateResolved) { trace.detectorCreateRejected = true; global.__recordPoseBootstrapFailure?.('MOVENET_DETECTOR_CREATE_FAILED', err); }
      else if (!global.tf) global.__recordPoseBootstrapFailure?.('TF_NOT_LOADED', err);
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
    if (state.loopRunning && state.activeLoop) {
      if (new URLSearchParams(global.location?.search || '').get('debugWorkoutPerformance') === '1') console.info('[WORKOUT_PERF] duplicate pose loop initialization ignored');
      return state.activeLoop;
    }
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

    const trace = global.__POSE_BOOTSTRAP_TRACE || (global.__POSE_BOOTSTRAP_TRACE = {});
    trace.inferenceLoopStartEntered = true;
    state.sourceVideo = video;
    state.sourceElementId = video.id || null;
    state.sourceConnected = Boolean(video.isConnected);
    state.sourceDimensions = `${video.videoWidth || 0}x${video.videoHeight || 0}`;
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
        if (global.document?.hidden) { frameId = requestAnimationFrame(frame); return; }
        state.sourceConnected = Boolean(video?.isConnected);
        state.sourceDimensions = `${video?.videoWidth || video?.clientWidth || 0}x${video?.videoHeight || video?.clientHeight || 0}`;
        if (!state.sourceConnected) throw new Error('inference source element is disconnected');
        if (!(video?.videoWidth || video?.clientWidth) || !(video?.videoHeight || video?.clientHeight)) throw new Error('inference source has zero dimensions');
        state.framesAttempted += 1;
        state.inferenceGeneration += 1;
        if (global.__workoutPerformance) global.__workoutPerformance.poseInferenceCalls += 1;
        const inferenceStartedAt = global.performance?.now?.() ?? Date.now();
        trace.estimatePosesEnteredCount = (trace.estimatePosesEnteredCount || 0) + 1;
        let poses;
        try { poses = await detector.estimatePoses(video, { flipHorizontal: true }); trace.estimatePosesResolvedCount = (trace.estimatePosesResolvedCount || 0) + 1; }
        catch (error) { trace.estimatePosesRejectedCount = (trace.estimatePosesRejectedCount || 0) + 1; global.__recordPoseBootstrapFailure?.('ESTIMATE_POSES_REJECTED', error); throw error; }
        const inferenceMs = (global.performance?.now?.() ?? Date.now()) - inferenceStartedAt;
        const pose = Array.isArray(poses) && poses.length ? poses[0] : null;
        const posePacket = normalizePosePacket(pose, video);
        state.loopFrameCount += 1;
        state.framesSuccessful += 1;
        state.lastInferenceMs = Math.round(inferenceMs * 10) / 10;
        state.lastError = null;
        state.lastFrameAt = new Date().toISOString();
        state.latestPose = pose;
        state.latestPosePacket = posePacket;
        state.latestPoses = poses;
        const projection = classifyPose(pose, video);
        state.framingState = projection.framingState;
        state.framingReason = projection.framingReason;
        state.keypointsByName = projection.byName;
        state.visibleKeypointCount = projection.visibleCount;
        state.totalKeypointCount = projection.totalCount;
        state.upperVisible = projection.upperVisible;
        state.fullVisible = projection.fullVisible;
        state.overallConfidence = projection.overallConfidence;
        global.__lastPoseRuntimeFrame = posePacket;
        global.__lastPoseFrame = posePacket;
        try {
          global.dispatchEvent?.(new CustomEvent('pose-runtime:frame', { detail: { pose, posePacket, poses } }));
          state.poseEventDispatchCount += 1;
          state.lastPoseEventAt = new Date().toISOString();
        } catch (_) {}
        if (typeof onPoseFrame === 'function') onPoseFrame({ pose, posePacket, poses, inferenceMs });
      } catch (err) {
        const message = err?.message || String(err || 'pose_loop_failed');
        state.lastError = message;
        state.framesFailed += 1;
        console.error('[POSE_RUNTIME] pose loop frame failed', err);
        setVisibleRuntimeError(`Pose loop error: ${message}`);
        if (typeof onError === 'function') onError(err);
      }
      renderProof();
      frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame(frame);
    state.activeLoop = {
      stop() {
        stopped = true;
        state.loopRunning = false;
        if (frameId != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameId);
        log('pose loop stop requested');
      }
    };
    return state.activeLoop;
  }

  global.PoseRuntime = {
    initMoveNetDetector,
    initOptionalTrackers,
    normalizePosePacket,
    classifyPose,
    renderProof,
    KEYPOINT_THRESHOLD,
    startPoseLoop,
    getLatestPose: () => state.latestPose || null,
    getLatestPosePacket: () => state.latestPosePacket || null,
    getState: () => ({ ...state, optionalTrackers: { ...state.optionalTrackers }, optionalTrackerErrors: { ...state.optionalTrackerErrors } })
  };

  global.addEventListener?.('pose-runtime:frame', () => { state.poseEventReceivedCount += 1; state.eventConsumerCount = Math.max(1, state.eventConsumerCount || 0); });
  global.setInterval?.(renderProof, 500);

  log('loaded');
})(typeof window !== 'undefined' ? window : globalThis);
