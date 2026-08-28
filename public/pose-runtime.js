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
    inferenceDurations: [],
    inferenceCompletionIntervals: [],
    overlayRenderIntervals: [],
    displayRenderGeneration: 0,
    animationFrameCount: 0,
    framesRenderedSinceLastInference: 0,
    framesRenderedDuringPreviousInferenceInterval: 0,
    maxFramesRenderedBetweenInferences: 0,
    displayLoopRunning: false,
    displayTrackerGeneration: 0,
    movenetSmoothingConfigured: false,
    poseEventDispatchCount: 0,
    poseEventReceivedCount: 0,
    lastPoseEventAt: null,
    sourceElementId: null,
    sourceConnected: false,
    sourceDimensions: '0x0',
    framingState: 'NO_PERSON',
    framingReason: 'MoveNet has not returned a person.',
    firstFailingBoundary: 'NONE',
    faceVisible: false,
    headShouldersVisible: false,
    partialUpperBodyVisible: false,
    overlayRenderGeneration: 0,
    overlayPointsDrawn: 0,
    overlaySegmentsDrawn: 0,
    overlayFirstFailingBoundary: 'POSE_NOT_RECEIVED',
    lastOverlayError: null,
    lastSpokenState: null,
    lastSpokenMessage: null,
    lastSpokenTimestamp: null,
    speechCount: 0,
    speechSuppressedReason: 'VOICE_NOT_ENABLED',
    speechQueueActive: false
  };

  const KEYPOINT_THRESHOLD = 0.3;
  const UPPER_BODY_JOINTS = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip'];
  const FULL_BODY_JOINTS = [...UPPER_BODY_JOINTS, 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
  const REPORTED_JOINTS = ['nose', ...FULL_BODY_JOINTS];
  const FACE_JOINTS = ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'];
  const SKELETON_EDGES = [[0,1],[0,2],[1,3],[2,4],[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];
  const TRACKING = Object.freeze({ ALPHA_MIN: 0.35, ALPHA_MAX: 0.80, MAX_COAST_MS: 300, MAX_INTERFRAME_COAST_MS: 1200, REACQUIRE_MS: 160, VELOCITY_ALPHA: 0.25, COAST_DECAY_PER_MS: 0.006, MAX_SPEED_SOURCE_FRACTION_PER_MS: 0.003 });
  const TRACK_MODES = Object.freeze({ TRACKED: 'TRACKED', COASTING: 'COASTING', REACQUIRING: 'REACQUIRING', LOST: 'LOST' });
  const cameraBootstraps = new Map();

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function percentile(values, fraction) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
  }
  function recordSample(list, value, limit = 120) { if (Number.isFinite(value)) { list.push(value); if (list.length > limit) list.splice(0, list.length - limit); } }

  function createTemporalPoseTracker(config = {}) {
    const settings = { ...TRACKING, ...config };
    const joints = new Map();
    let generation = 0;
    let sourceWidth = 1; let sourceHeight = 1;
    function empty(name) { return { name, measuredX: null, measuredY: null, filteredX: null, filteredY: null, velocityX: 0, velocityY: 0, rawScore: 0, lastReliableX: null, lastReliableY: null, lastReliableTimestamp: null, lastUpdateTimestamp: null, mode: TRACK_MODES.LOST, reacquireFromX: null, reacquireFromY: null, reacquireStartedAt: null }; }
    function predictedAt(item, timestamp) {
      const age = Math.max(0, timestamp - item.lastReliableTimestamp);
      const travel = (1 - Math.exp(-settings.COAST_DECAY_PER_MS * age)) / settings.COAST_DECAY_PER_MS;
      return { x: item.lastReliableX + item.velocityX * travel, y: item.lastReliableY + item.velocityY * travel, age };
    }
    function update(rawPose, timestamp, dimensions = {}) {
      sourceWidth = Number(dimensions.width) || sourceWidth; sourceHeight = Number(dimensions.height) || sourceHeight;
      const points = Array.isArray(rawPose?.keypoints) ? rawPose.keypoints : [];
      points.forEach((point, index) => {
        const name = keypointName(point) || `keypoint_${index}`; const item = joints.get(name) || empty(name);
        const rawScore = score(point); const x = Number(point?.x); const y = Number(point?.y);
        item.measuredX = Number.isFinite(x) ? x : null; item.measuredY = Number.isFinite(y) ? y : null; item.rawScore = rawScore;
        if (rawScore >= KEYPOINT_THRESHOLD && Number.isFinite(x) && Number.isFinite(y)) {
          const wasCoasting = item.mode === TRACK_MODES.COASTING;
          const previousX = item.filteredX; const previousY = item.filteredY;
          const dt = item.lastUpdateTimestamp == null ? 0 : Math.max(1, timestamp - item.lastUpdateTimestamp);
          if (wasCoasting) {
            const prediction = predictedAt(item, timestamp); const dx = prediction.x - x; const dy = prediction.y - y;
            const distance = Math.hypot(dx, dy); const maxBlendDistance = Math.max(sourceWidth, sourceHeight) * 0.35;
            const scale = distance > maxBlendDistance ? maxBlendDistance / distance : 1;
            item.reacquireFromX = x + dx * scale; item.reacquireFromY = y + dy * scale; item.reacquireStartedAt = timestamp; item.mode = TRACK_MODES.REACQUIRING;
          }
          const confidence = clamp((rawScore - KEYPOINT_THRESHOLD) / (1 - KEYPOINT_THRESHOLD), 0, 1);
          const alpha = settings.ALPHA_MIN + confidence * (settings.ALPHA_MAX - settings.ALPHA_MIN);
          const baseX = wasCoasting ? item.reacquireFromX : previousX; const baseY = wasCoasting ? item.reacquireFromY : previousY;
          item.filteredX = baseX == null ? x : baseX * (1 - alpha) + x * alpha;
          item.filteredY = baseY == null ? y : baseY * (1 - alpha) + y * alpha;
          if (dt && previousX != null) {
            const maxSpeed = Math.max(sourceWidth, sourceHeight) * settings.MAX_SPEED_SOURCE_FRACTION_PER_MS;
            const observedVX = clamp((item.filteredX - previousX) / dt, -maxSpeed, maxSpeed); const observedVY = clamp((item.filteredY - previousY) / dt, -maxSpeed, maxSpeed);
            item.velocityX = item.velocityX * (1 - settings.VELOCITY_ALPHA) + observedVX * settings.VELOCITY_ALPHA;
            item.velocityY = item.velocityY * (1 - settings.VELOCITY_ALPHA) + observedVY * settings.VELOCITY_ALPHA;
          }
          item.lastReliableX = item.filteredX; item.lastReliableY = item.filteredY; item.lastReliableTimestamp = timestamp;
          if (!wasCoasting && item.mode !== TRACK_MODES.REACQUIRING) item.mode = TRACK_MODES.TRACKED;
        } else if (item.lastReliableTimestamp != null && timestamp - item.lastReliableTimestamp <= settings.MAX_COAST_MS) item.mode = TRACK_MODES.COASTING;
        else item.mode = TRACK_MODES.LOST;
        item.lastUpdateTimestamp = timestamp; joints.set(name, item);
      });
      // Missing keypoints are dropouts too; do not retain them indefinitely.
      const names = new Set(points.map((point, index) => keypointName(point) || `keypoint_${index}`));
      joints.forEach((item, name) => { if (!names.has(name)) { item.rawScore = 0; item.measuredX = null; item.measuredY = null; item.mode = item.lastReliableTimestamp != null && timestamp - item.lastReliableTimestamp <= settings.MAX_COAST_MS ? TRACK_MODES.COASTING : TRACK_MODES.LOST; item.lastUpdateTimestamp = timestamp; } });
      generation += 1; return sample(timestamp);
    }
    function sample(timestamp, options = {}) {
      const keypoints = [];
      joints.forEach((item) => {
        let x = item.filteredX; let y = item.filteredY; let predictionAge = 0;
        if (item.mode === TRACK_MODES.COASTING) { const prediction = predictedAt(item, timestamp); predictionAge = prediction.age; if (predictionAge > settings.MAX_COAST_MS) item.mode = TRACK_MODES.LOST; else { x = prediction.x; y = prediction.y; } }
        let displayMode = item.mode;
        // A reliable raw observation remains authoritative, while presentation may
        // extrapolate it until the next sparse inference result. This never writes
        // back to the joint or enters the inference/state pipeline.
        if (options.betweenInferences && item.mode === TRACK_MODES.TRACKED && item.lastReliableTimestamp != null && timestamp > item.lastReliableTimestamp) {
          const prediction = predictedAt(item, timestamp); predictionAge = prediction.age;
          if (predictionAge <= settings.MAX_INTERFRAME_COAST_MS) { x = prediction.x; y = prediction.y; displayMode = TRACK_MODES.COASTING; }
        }
        if (item.mode === TRACK_MODES.REACQUIRING) { const progress = clamp((timestamp - item.reacquireStartedAt) / settings.REACQUIRE_MS, 0, 1); x = item.reacquireFromX + (item.filteredX - item.reacquireFromX) * progress; y = item.reacquireFromY + (item.filteredY - item.reacquireFromY) * progress; if (progress >= 1) item.mode = displayMode = TRACK_MODES.TRACKED; }
        const opacity = displayMode === TRACK_MODES.COASTING ? Math.max(0.35, 1 - predictionAge / settings.MAX_INTERFRAME_COAST_MS) : displayMode === TRACK_MODES.REACQUIRING ? 0.82 : displayMode === TRACK_MODES.TRACKED ? 1 : 0;
        keypoints.push({ name: item.name, x, y, score: item.rawScore, rawScore: item.rawScore, mode: displayMode, displayOnly: displayMode !== TRACK_MODES.TRACKED, authoritative: false, opacity, predictionAge });
      });
      return { keypoints, generation };
    }
    function reset() { joints.clear(); generation = 0; }
    return { update, sample, reset, get generation() { return generation; }, get joints() { return joints; }, settings };
  }
  const displayTracker = createTemporalPoseTracker();

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
    const faceVisible = FACE_JOINTS.some((name) => score(byName[name]) >= KEYPOINT_THRESHOLD);
    const headShouldersVisible = ['nose', 'left_shoulder', 'right_shoulder'].every((name) => score(byName[name]) >= KEYPOINT_THRESHOLD);
    // Face landmarks are observational only; partial upper body requires a
    // confident torso/limb joint and does not relax workout readiness.
    const partialUpperBodyVisible = upperVisible > 0 && upperVisible < UPPER_BODY_JOINTS.length;
    return { framingState, framingReason, byName, visible, visibleNames: visible.map(keypointName).filter(Boolean), visibleCount: visible.length, totalCount: keypoints.length, upperVisible, fullVisible, faceVisible, headShouldersVisible, partialUpperBodyVisible, coverageWidth, coverageHeight, overallConfidence: Number(pose?.score ?? (confidenceScores.length ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0)) };
  }

  // MoveNet returns horizontally-flipped source coordinates. Invert that flip,
  // then apply the single object-fit: cover scale and centered crop offset.
  function createSourceToDisplayTransform(sourceWidth, sourceHeight, displayWidth, displayHeight, flipHorizontal = true) {
    const values = [sourceWidth, sourceHeight, displayWidth, displayHeight].map(Number);
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;
    const scale = Math.max(displayWidth / sourceWidth, displayHeight / sourceHeight);
    const offsetX = (displayWidth - sourceWidth * scale) / 2;
    const offsetY = (displayHeight - sourceHeight * scale) / 2;
    return {
      scale, offsetX, offsetY, flipHorizontal,
      project(point) {
        const x = Number(point?.x); const y = Number(point?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x: (flipHorizontal ? sourceWidth - x : x) * scale + offsetX, y: y * scale + offsetY };
      }
    };
  }

  function renderPoseOverlay(pose, video, canvas = global.document?.getElementById?.('overlay')) {
    const drawingStartedAt = global.performance?.now?.() ?? Date.now();
    state.overlayCanvasFound = Boolean(canvas);
    state.overlayCanvasConnected = Boolean(canvas?.isConnected);
    if (!canvas) { state.overlayFirstFailingBoundary = 'OVERLAY_CANVAS_NOT_FOUND'; return false; }
    if (!canvas.isConnected) { state.overlayFirstFailingBoundary = 'OVERLAY_CANVAS_NOT_CONNECTED'; return false; }
    const sourceWidth = Number(video?.videoWidth || 0); const sourceHeight = Number(video?.videoHeight || 0);
    if (!sourceWidth || !sourceHeight) { state.overlayFirstFailingBoundary = 'VIDEO_DIMENSIONS_ZERO'; return false; }
    const rect = video.getBoundingClientRect?.() || { width: video.clientWidth, height: video.clientHeight, left: 0, top: 0 };
    if (!rect.width || !rect.height) { state.overlayFirstFailingBoundary = 'DISPLAY_RECT_ZERO'; return false; }
    const transform = createSourceToDisplayTransform(sourceWidth, sourceHeight, rect.width, rect.height, true);
    if (!transform) { state.overlayFirstFailingBoundary = 'COORDINATE_TRANSFORM_INVALID'; return false; }
    const ratio = Math.max(1, Number(global.devicePixelRatio || 1));
    const bufferWidth = Math.round(rect.width * ratio); const bufferHeight = Math.round(rect.height * ratio);
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) { canvas.width = bufferWidth; canvas.height = bufferHeight; }
    state.overlayCssSize = `${Math.round(rect.width)}x${Math.round(rect.height)}`; state.overlayBufferSize = `${canvas.width}x${canvas.height}`;
    state.videoSourceSize = `${sourceWidth}x${sourceHeight}`; state.displayedVideoRect = `${Math.round(rect.width)}x${Math.round(rect.height)} @ ${Math.round(rect.left || 0)},${Math.round(rect.top || 0)}`;
    const ctx = canvas.getContext?.('2d');
    try {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
      if (!pose?.keypoints?.length) { state.overlayPointsDrawn = 0; state.overlaySegmentsDrawn = 0; state.overlayFirstFailingBoundary = 'POSE_NOT_RECEIVED'; return false; }
      const projected = pose.keypoints.map((point) => point?.mode && point.mode !== TRACK_MODES.LOST ? transform.project(point) : score(point) >= KEYPOINT_THRESHOLD ? transform.project(point) : null);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, rect.width * 0.006); ctx.strokeStyle = 'rgba(250,204,21,.96)'; ctx.fillStyle = 'rgba(34,211,238,.98)';
      let segments = 0; let points = 0;
      SKELETON_EDGES.forEach(([a,b]) => { if (!projected[a] || !projected[b]) return; ctx.globalAlpha = Math.min(pose.keypoints[a]?.opacity ?? 1, pose.keypoints[b]?.opacity ?? 1); ctx.beginPath(); ctx.moveTo(projected[a].x, projected[a].y); ctx.lineTo(projected[b].x, projected[b].y); ctx.stroke(); segments += 1; });
      projected.forEach((point, index) => { if (!point) return; ctx.globalAlpha = pose.keypoints[index]?.opacity ?? 1; ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(4, rect.width * .009), 0, Math.PI * 2); ctx.fill(); points += 1; });
      ctx.globalAlpha = 1;
      state.overlayPointsDrawn = points; state.overlaySegmentsDrawn = segments; state.overlayRenderGeneration += 1;
      state.lastDrawingMs = Math.round(((global.performance?.now?.() ?? Date.now()) - drawingStartedAt) * 10) / 10;
      state.overlayFirstFailingBoundary = points ? 'APPLIED' : 'NO_CONFIDENT_KEYPOINTS'; state.lastOverlayError = null;
      return points > 0;
    } catch (error) { state.lastOverlayError = error?.message || String(error); state.overlayFirstFailingBoundary = 'DRAW_EXCEPTION'; return false; }
  }

  function failureBoundary() {
    const trace = global.__POSE_BOOTSTRAP_TRACE || {};
    if (trace.firstFailingBoundary && trace.firstFailingBoundary !== 'NONE') return trace.firstFailingBoundary;
    if (!trace.connectClickReceived) return 'NONE';
    if (!trace.poseBootstrapRequested) return trace.poseBootstrapSkippedReason && trace.poseBootstrapSkippedReason !== 'NONE' ? `POSE_BOOTSTRAP_SKIPPED:${trace.poseBootstrapSkippedReason}` : 'POSE_BOOTSTRAP_NOT_REQUESTED';
    if (!trace.cameraActivePredicate) return 'CAMERA_NOT_ACTIVE';
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
    if (value === 'NO_PERSON') return 'Looking for you…';
    if (value === 'TOO_CLOSE') return 'Step back';
    if (value === 'TOO_FAR') return 'Move closer';
    if (value === 'UPPER_BODY_READY') return 'Person found · Upper body ready';
    if (value === 'FULL_BODY_READY') return 'Person found · Full body ready';
    if (state.headShouldersVisible) return 'Person found · Head + shoulders detected';
    if (state.partialUpperBodyVisible) return 'Person found · Partial upper body detected';
    return `Person found · ${state.visibleKeypointCount || 0}/${state.totalKeypointCount || 17} keypoints`;
  }

  const SPEECH_MESSAGES = {
    CAMERA_READY: 'Camera ready. Looking for you.',
    PERSON_FOUND: 'I found you.', FACE_VISIBLE: 'I can see your face.', HEAD_SHOULDERS_VISIBLE: 'I can see your head and shoulders.',
    PARTIAL_UPPER_BODY_VISIBLE: 'I can see part of your upper body.', UPPER_BODY_READY: 'I can see your upper body.',
    FULL_BODY_READY: 'I can see your full body.', TOO_CLOSE: "You're a little too close. Move the phone back.",
    TOO_FAR: "You're too far away. Move a little closer.", NO_PERSON: 'I lost you. Move back into the camera.'
  };

  function semanticVisibilityState() {
    if (!state.latestPose) return state.seenPersonEver ? 'NO_PERSON' : 'CAMERA_READY';
    state.seenPersonEver = true;
    if (state.framingState === 'TOO_CLOSE' || state.framingState === 'TOO_FAR' || state.framingState === 'FULL_BODY_READY' || state.framingState === 'UPPER_BODY_READY') return state.framingState;
    if (state.headShouldersVisible) return 'HEAD_SHOULDERS_VISIBLE';
    if (state.partialUpperBodyVisible) return 'PARTIAL_UPPER_BODY_VISIBLE';
    if (state.faceVisible) return 'FACE_VISIBLE';
    return 'PERSON_FOUND';
  }

  function updateVoiceFeedback(now = Date.now()) {
    const coach = global.CoachRuntime; const coachState = coach?.getState?.() || {};
    state.speechApiAvailable = Boolean(coach?.speak || global.speechSynthesis);
    state.voiceFeedbackEnabled = Boolean(coach?.speak && !coachState.muted && coachState.audioUnlocked);
    const next = semanticVisibilityState();
    if (next === 'NO_PERSON') {
      state.noPersonSince ||= now;
      if (now - state.noPersonSince < 1500) { state.speechSuppressedReason = 'NO_PERSON_DEBOUNCE'; return; }
    } else state.noPersonSince = null;
    if (next === state.lastSpokenState) { state.speechSuppressedReason = 'STATE_UNCHANGED'; return; }
    if (!state.voiceFeedbackEnabled) { state.speechSuppressedReason = 'VOICE_NOT_ENABLED'; return; }
    if (now - (state.lastSpeechAtMs || 0) < 2000) { state.speechSuppressedReason = 'THROTTLED'; return; }
    const message = SPEECH_MESSAGES[next]; if (!message) return;
    coach.stopAllSpeech?.('pose-state-changed'); state.speechQueueActive = true; state.speechSuppressedReason = 'NONE';
    state.lastSpokenState = next; state.lastSpokenMessage = message; state.lastSpokenTimestamp = new Date(now).toISOString(); state.lastSpeechAtMs = now; state.speechCount += 1;
    Promise.resolve(coach.speak(message, 'pose-visibility', { owner: 'system', interruptible: true }))
      .catch((error) => { state.speechSuppressedReason = error?.message || 'SPEECH_FAILED'; })
      .finally(() => { state.speechQueueActive = false; });
  }

  function renderProof() {
    const now = Date.now();
    const trace = global.__POSE_BOOTSTRAP_TRACE || {};
    const authoritativeVideo = global.document?.getElementById?.(trace.authoritativeVideoElementId || 'video');
    const authoritativeStream = authoritativeVideo?.srcObject;
    const authoritativeTrack = authoritativeStream?.getVideoTracks?.().find((track) => track.readyState === 'live' && track.enabled !== false);
    state.cameraStreamActive = Boolean(authoritativeVideo?.isConnected && trace.authoritativeVideoStreamMatchesActiveStream && authoritativeTrack && authoritativeVideo.readyState >= 1 && authoritativeVideo.videoWidth > 0 && authoritativeVideo.videoHeight > 0);
    if (!state.sourceVideo && state.cameraStreamActive) {
      state.sourceVideo = authoritativeVideo; state.sourceElementId = authoritativeVideo.id || null; state.sourceConnected = Boolean(authoritativeVideo.isConnected); state.sourceDimensions = `${authoritativeVideo.videoWidth}x${authoritativeVideo.videoHeight}`;
    }
    state.visibleCameraLayer = state.sourceVideo?.style?.visibility === 'hidden' ? 'HIDDEN' : 'VISIBLE';
    state.firstFailingBoundary = failureBoundary();
    const displayPoints = state.latestDisplayPose?.keypoints || [];
    const modeCount = (mode) => displayPoints.filter((point) => point.mode === mode).length;
    state.trackedJointCount = modeCount(TRACK_MODES.TRACKED); state.coastingJointCount = modeCount(TRACK_MODES.COASTING); state.reacquiringJointCount = modeCount(TRACK_MODES.REACQUIRING); state.lostJointCount = modeCount(TRACK_MODES.LOST);
    state.oldestPredictionAge = Math.round(Math.max(0, ...displayPoints.filter((point) => point.mode === TRACK_MODES.COASTING).map((point) => point.predictionAge || 0)));
    const inferenceAverage = state.inferenceDurations.length ? state.inferenceDurations.reduce((sum, value) => sum + value, 0) / state.inferenceDurations.length : null;
    const completionAverage = state.inferenceCompletionIntervals.length ? state.inferenceCompletionIntervals.reduce((sum, value) => sum + value, 0) / state.inferenceCompletionIntervals.length : null;
    const overlayAverage = state.overlayRenderIntervals.length ? state.overlayRenderIntervals.reduce((sum, value) => sum + value, 0) / state.overlayRenderIntervals.length : null;
    const latestInferenceAge = state.lastInferenceCompletedAt == null ? null : Math.max(0, (global.performance?.now?.() ?? Date.now()) - state.lastInferenceCompletedAt);
    state.performanceFirstFailingBoundary = !state.detectorReady ? 'MODEL_NOT_CREATED' : !state.framesAttempted ? 'ESTIMATE_POSES_NOT_ENTERED' : state.lastError ? 'INFERENCE_EXCEPTION' : !state.overlayRenderGeneration ? 'OVERLAY_NOT_RENDERED' : 'NONE';
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
      `Face visible: ${state.faceVisible ? 'YES' : 'NO'}`, `Head/shoulders visible: ${state.headShouldersVisible ? 'YES' : 'NO'}`, `Partial upper body visible: ${state.partialUpperBodyVisible ? 'YES' : 'NO'}`, '',
      `Pose frame produced count: ${state.framesSuccessful}`, `Pose event emitted: ${state.poseEventDispatchCount ? 'YES' : 'NO'}`, `Pose event name: pose-runtime:frame`, `Pose event generation: ${state.poseEventDispatchCount}`,
      `Pose event dispatch count: ${state.poseEventDispatchCount}`, `Pose event received count: ${state.poseEventReceivedCount}`, `Last pose event timestamp: ${state.lastPoseEventAt || 'none'}`, `Last pose event age: ${state.lastPoseEventAt ? now - Date.parse(state.lastPoseEventAt) : 'unavailable'}ms`, `Consumer count: ${state.eventConsumerCount || 0}`, '',
      `Backend sync initialized: YES`, `Backend sync resolved: ${/checking/i.test(syncText) ? 'NO' : 'YES'}`, `Backend sync state: ${syncText}`, `Backend sync blocks pose inference: NO`, '',
      `Last pose error: ${state.lastError || state.detectorError || 'NONE'}`, `First failing boundary: ${state.firstFailingBoundary}`
    ];
    const panel = global.document?.getElementById?.('poseTrackingProofValues'); if (panel) panel.textContent = lines.join('\n');
    const performancePanel = global.document?.getElementById?.('posePerformanceProofValues');
    if (performancePanel) performancePanel.textContent = [
      `Current backend: ${state.detectorBackend || 'unavailable'}`, `MoveNet enableSmoothing configured: ${state.movenetSmoothingConfigured ? 'YES' : 'NO'}`, '',
      `estimatePoses wall duration last: ${state.lastInferenceMs ?? 'unavailable'}ms`, `Inference duration rolling average: ${inferenceAverage == null ? 'unavailable' : inferenceAverage.toFixed(1)}ms`, `Inference duration p50 approximation: ${percentile(state.inferenceDurations, .50)?.toFixed?.(1) ?? 'unavailable'}ms`, `Inference duration p95 approximation: ${percentile(state.inferenceDurations, .95)?.toFixed?.(1) ?? 'unavailable'}ms`,
      `Time between completed inference generations: ${completionAverage == null ? 'unavailable' : completionAverage.toFixed(1)}ms`, `Inferred inference FPS: ${completionAverage ? (1000 / completionAverage).toFixed(2) : 'unavailable'}`, `Measured display FPS: ${overlayAverage ? (1000 / overlayAverage).toFixed(1) : 'unavailable'}`, `Last animation-frame interval: ${state.lastAnimationFrameInterval == null ? 'unavailable' : state.lastAnimationFrameInterval.toFixed(1)}ms`, '',
      `Raw pose generation: ${state.inferenceGeneration}`, `Display tracker generation: ${state.displayTrackerGeneration}`, `Display render generation: ${state.displayRenderGeneration}`, `Animation frame count: ${state.animationFrameCount}`, `Display loop running independently: ${state.displayLoopRunning ? 'YES' : 'NO'}`,
      `Latest inference age: ${latestInferenceAge == null ? 'unavailable' : latestInferenceAge.toFixed(1)}ms`, `Frames rendered since last inference: ${state.framesRenderedSinceLastInference}`, `Frames rendered during previous inference interval: ${state.framesRenderedDuringPreviousInferenceInterval}`, `Maximum frames rendered between inferences: ${state.maxFramesRenderedBetweenInferences}`, `Display generation > inference generation: ${state.displayRenderGeneration > state.inferenceGeneration ? 'YES' : 'NOT YET'}`, '',
      `Currently tracked joints: ${state.trackedJointCount}`, `Currently coasting joints: ${state.coastingJointCount}`, `Currently reacquiring joints: ${state.reacquiringJointCount}`, `Currently lost joints: ${state.lostJointCount}`, `Oldest prediction age: ${state.oldestPredictionAge}ms`,
      `Max coast configured: ${TRACKING.MAX_COAST_MS}ms`, `Reacquire duration configured: ${TRACKING.REACQUIRE_MS}ms`, '',
      `Tracker processing duration last: ${state.lastTrackerProcessingMs ?? 'unavailable'}ms`, `Event dispatch duration last: ${state.lastEventDispatchMs ?? 'unavailable'}ms`, `Drawing duration last: ${state.lastDrawingMs ?? 'unavailable'}ms`, `Performance first failing boundary: ${state.performanceFirstFailingBoundary}`
    ].join('\n');
    const overlayProof = global.document?.getElementById?.('poseOverlayProofValues');
    if (overlayProof) overlayProof.textContent = [
      `Overlay canvas found: ${state.overlayCanvasFound ? 'YES' : 'NO'}`, `Overlay canvas connected: ${state.overlayCanvasConnected ? 'YES' : 'NO'}`, `Overlay CSS width/height: ${state.overlayCssSize || '0x0'}`, `Overlay buffer width/height: ${state.overlayBufferSize || '0x0'}`, '',
      `Video source width/height: ${state.videoSourceSize || state.sourceDimensions}`, `Displayed video rect: ${state.displayedVideoRect || '0x0'}`, `Object-fit mode: cover`, `Horizontal flip applied: YES (inverse inference flip)`, '',
      `Pose received: ${state.latestPose ? 'YES' : 'NO'}`, `Pose generation: ${state.inferenceGeneration}`, `Person detected: ${state.latestPose ? 'YES' : 'NO'}`, `Visible keypoint count: ${state.visibleKeypointCount || 0}`, `Visible keypoint names: ${(state.visibleKeypointNames || []).join(', ') || 'none'}`, '',
      `Face visible: ${state.faceVisible ? 'YES' : 'NO'}`, `Head/shoulders visible: ${state.headShouldersVisible ? 'YES' : 'NO'}`, `Partial upper body visible: ${state.partialUpperBodyVisible ? 'YES' : 'NO'}`, `Upper body ready: ${state.framingState === 'UPPER_BODY_READY' || state.framingState === 'FULL_BODY_READY' ? 'YES' : 'NO'}`, `Full body ready: ${state.framingState === 'FULL_BODY_READY' ? 'YES' : 'NO'}`, '',
      `Points drawn last frame: ${state.overlayPointsDrawn || 0}`, `Segments drawn last frame: ${state.overlaySegmentsDrawn || 0}`, `Successful overlay draw count: ${state.overlayRenderGeneration || 0}`, `Display render generation: ${state.displayRenderGeneration || 0}`, `Last overlay error: ${state.lastOverlayError || 'NONE'}`, `Overlay first failing boundary: ${state.overlayFirstFailingBoundary}`, '',
      `Voice feedback enabled: ${state.voiceFeedbackEnabled ? 'YES' : 'NO'}`, `Speech API available: ${state.speechApiAvailable ? 'YES' : 'NO'}`, `Last spoken state: ${state.lastSpokenState || 'none'}`, `Last spoken message: ${state.lastSpokenMessage || 'none'}`, `Last spoken timestamp: ${state.lastSpokenTimestamp || 'none'}`, `Speech count: ${state.speechCount || 0}`, `Speech suppressed reason: ${state.speechSuppressedReason || 'NONE'}`, `Speech queue active: ${state.speechQueueActive ? 'YES' : 'NO'}`
    ].join('\n');
    const yn = (value) => value ? 'YES' : 'NO';
    const traceLines = [
      `Connect Camera click received: ${yn(trace.connectClickReceived)}`, `Connect Camera handler entry count: ${trace.connectHandlerEntryCount || 0}`, '',
      `getUserMedia requested: ${yn(trace.getUserMediaRequested)}`, `getUserMedia resolved: ${yn(trace.getUserMediaResolved)}`, `getUserMedia rejected: ${yn(trace.getUserMediaRejected)}`, `getUserMedia error name: ${trace.getUserMediaErrorName || 'NONE'}`, `getUserMedia error message: ${trace.getUserMediaErrorMessage || 'NONE'}`, '',
      `Media stream ID: ${trace.mediaStreamId || 'none'}`, `Video track count: ${trace.videoTrackCount || 0}`, `Video track readyState: ${trace.videoTrackReadyState || 'none'}`, `Video track enabled: ${trace.videoTrackEnabled == null ? 'unknown' : yn(trace.videoTrackEnabled)}`, `Video track muted: ${trace.videoTrackMuted == null ? 'unknown' : yn(trace.videoTrackMuted)}`, '',
      `Production video element found: ${yn(trace.productionVideoFound)}`, `Production video element ID: ${trace.productionVideoElementId || 'none'}`, `Production video DOM connected: ${yn(trace.productionVideoDomConnected)}`, `srcObject assigned: ${yn(trace.srcObjectAssigned)}`, `srcObject === active stream: ${yn(trace.srcObjectMatchesStream)}`, `video.readyState: ${trace.videoReadyState ?? 0}`, `videoWidth: ${trace.videoWidth || 0}`, `videoHeight: ${trace.videoHeight || 0}`, `loadedmetadata received: ${yn(trace.loadedmetadataReceived)}`, `loadeddata received: ${yn(trace.loadeddataReceived)}`, `canplay received: ${yn(trace.canplayReceived)}`, `playing received: ${yn(trace.playingReceived)}`, '',
      `video.play() requested: ${yn(trace.videoPlayRequested)}`, `video.play() resolved: ${yn(trace.videoPlayResolved)}`, `video.play() rejected: ${yn(trace.videoPlayRejected)}`, `video.play() error: ${trace.videoPlayError || 'NONE'}`, '',
      `Pose bootstrap requested: ${yn(trace.poseBootstrapRequested)}`, `Pose bootstrap request generation: ${trace.poseBootstrapRequestGeneration || 0}`, `Pose bootstrap request source: ${trace.poseBootstrapRequestSource || 'none'}`, `Pose bootstrap skipped reason: ${trace.poseBootstrapSkippedReason || 'NONE'}`, `Authoritative camera runtime ID: ${trace.authoritativeCameraRuntimeId || 'none'}`, `Authoritative MediaStream ID: ${trace.authoritativeMediaStreamId || 'none'}`, `Authoritative video element ID: ${trace.authoritativeVideoElementId || 'none'}`, `Authoritative video srcObject stream ID: ${trace.authoritativeVideoSrcObjectStreamId || 'none'}`, `Authoritative video stream matches active stream: ${yn(trace.authoritativeVideoStreamMatchesActiveStream)}`, `Camera active predicate inputs: ${trace.cameraActivePredicateInputs || 'none'}`, `Camera active predicate: ${yn(trace.cameraActivePredicate)}`, `TensorFlow bootstrap function entered: ${yn(trace.tfBootstrapFunctionEntered)}`, `TensorFlow bootstrap entry count: ${trace.tfBootstrapEntryCount || 0}`, '',
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
    displayTracker.reset();
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

      const detectorConfig = { modelType: poseRuntime.movenet.modelType.SINGLEPOSE_LIGHTNING, enableSmoothing: true };
      trace.detectorCreateEntered = true; trace.detectorModelConfig = 'MoveNet SinglePose Lightning; enableSmoothing=true';
      const detector = await poseRuntime.createDetector(
        poseRuntime.SupportedModels.MoveNet,
        detectorConfig
      );
      trace.detectorCreateResolved = true;
      state.movenetSmoothingConfigured = detectorConfig.enableSmoothing === true;

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

  function bootstrapCamera({ video, generation, source } = {}) {
    const key = Number(generation || 0);
    if (cameraBootstraps.has(key)) return cameraBootstraps.get(key);
    if (state.cameraGeneration !== key || state.sourceVideo !== video) displayTracker.reset();
    state.cameraGeneration = key;
    const trace = global.__POSE_BOOTSTRAP_TRACE || (global.__POSE_BOOTSTRAP_TRACE = {});
    trace.poseBootstrapRequested = true;
    trace.poseBootstrapRequestGeneration = key;
    trace.poseBootstrapRequestSource = source || 'PoseRuntime.bootstrapCamera';
    trace.poseBootstrapSkippedReason = 'NONE';
    const task = (async () => {
      const detector = await initMoveNetDetector({ ensurePoseRuntime: global.__ensurePoseRuntime, mobileDevice: true });
      const loop = startPoseLoop({ detector, video, isRunning: () => Boolean(trace.cameraActivePredicate) });
      return { detector, loop, generation: key };
    })();
    cameraBootstraps.set(key, task);
    task.catch(() => cameraBootstraps.delete(key));
    return task;
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
      cancelAnimationFrame = global.cancelAnimationFrame?.bind(global),
      displayRequestAnimationFrame = global.requestAnimationFrame?.bind(global),
      displayCancelAnimationFrame = global.cancelAnimationFrame?.bind(global)
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
    if (state.sourceVideo && state.sourceVideo !== video) displayTracker.reset();
    state.sourceVideo = video;
    state.sourceElementId = video.id || null;
    state.sourceConnected = Boolean(video.isConnected);
    state.sourceDimensions = `${video.videoWidth || 0}x${video.videoHeight || 0}`;
    state.loopRunning = true;
    state.loopStartedAt = new Date().toISOString();
    state.loopFrameCount = 0;
    log('pose loop started');

    let frameId = null;
    let overlayFrameId = null;
    let stopped = false;

    // Presentation refresh is independent from inference cadence. This loop only
    // samples the display tracker and draws; it never calls estimatePoses().
    function overlayFrame(timestamp) {
      if (stopped || !state.loopRunning) return;
      timestamp = Number.isFinite(timestamp) ? timestamp : (global.performance?.now?.() ?? Date.now());
      const previous = state.lastOverlayRenderAt;
      if (previous != null) { state.lastAnimationFrameInterval = timestamp - previous; recordSample(state.overlayRenderIntervals, state.lastAnimationFrameInterval); }
      state.lastOverlayRenderAt = timestamp;
      state.displayLoopRunning = true;
      state.animationFrameCount += 1;
      state.displayRenderGeneration += 1;
      state.framesRenderedSinceLastInference += 1;
      const displayPose = displayTracker.sample(timestamp, { betweenInferences: true });
      state.latestDisplayPose = displayPose;
      state.displayTrackerGeneration = displayPose.generation;
      if (!global.document?.hidden) renderPoseOverlay(displayPose, video);
      renderProof();
      overlayFrameId = displayRequestAnimationFrame(overlayFrame);
    }

    async function frame() {
      if (stopped || !isRunning()) {
        state.loopRunning = false;
        state.displayLoopRunning = false;
        displayTracker.reset(); state.latestDisplayPose = null; state.displayTrackerGeneration = 0;
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
        const inferenceCompletedAt = global.performance?.now?.() ?? Date.now();
        const pose = Array.isArray(poses) && poses.length ? poses[0] : null;
        const posePacket = normalizePosePacket(pose, video);
        state.loopFrameCount += 1;
        state.framesSuccessful += 1;
        state.lastInferenceMs = Math.round(inferenceMs * 10) / 10;
        recordSample(state.inferenceDurations, inferenceMs);
        if (state.lastInferenceCompletedAt != null) recordSample(state.inferenceCompletionIntervals, inferenceCompletedAt - state.lastInferenceCompletedAt);
        state.lastInferenceCompletedAt = inferenceCompletedAt;
        state.framesRenderedDuringPreviousInferenceInterval = state.framesRenderedSinceLastInference;
        state.maxFramesRenderedBetweenInferences = Math.max(state.maxFramesRenderedBetweenInferences, state.framesRenderedSinceLastInference);
        state.framesRenderedSinceLastInference = 0;
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
        state.visibleKeypointNames = projection.visibleNames;
        state.upperVisible = projection.upperVisible;
        state.fullVisible = projection.fullVisible;
        state.faceVisible = projection.faceVisible;
        state.headShouldersVisible = projection.headShouldersVisible;
        state.partialUpperBodyVisible = projection.partialUpperBodyVisible;
        state.overallConfidence = projection.overallConfidence;
        const trackerStartedAt = global.performance?.now?.() ?? Date.now();
        const displayPose = displayTracker.update(pose, inferenceCompletedAt, posePacket.video);
        state.latestDisplayPose = displayPose; state.displayTrackerGeneration = displayPose.generation;
        state.lastTrackerProcessingMs = Math.round(((global.performance?.now?.() ?? Date.now()) - trackerStartedAt) * 10) / 10;
        updateVoiceFeedback();
        global.__lastPoseRuntimeFrame = posePacket;
        global.__lastPoseFrame = posePacket;
        const dispatchStartedAt = global.performance?.now?.() ?? Date.now();
        try {
          global.dispatchEvent?.(new CustomEvent('pose-runtime:frame', { detail: { pose, posePacket, poses } }));
          state.poseEventDispatchCount += 1;
          state.lastPoseEventAt = new Date().toISOString();
        } catch (_) {}
        state.lastEventDispatchMs = Math.round(((global.performance?.now?.() ?? Date.now()) - dispatchStartedAt) * 10) / 10;
        if (typeof onPoseFrame === 'function') onPoseFrame({ pose, posePacket, poses, inferenceMs });
      } catch (err) {
        const message = err?.message || String(err || 'pose_loop_failed');
        if (/disconnected|source element|camera/i.test(message)) { displayTracker.reset(); state.latestDisplayPose = null; state.displayTrackerGeneration = 0; }
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
    if (typeof displayRequestAnimationFrame === 'function') overlayFrameId = displayRequestAnimationFrame(overlayFrame);
    state.activeLoop = {
      stop() {
        stopped = true;
        state.loopRunning = false;
        state.displayLoopRunning = false;
        if (frameId != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameId);
        if (overlayFrameId != null && typeof displayCancelAnimationFrame === 'function') displayCancelAnimationFrame(overlayFrameId);
        displayTracker.reset(); state.latestDisplayPose = null; state.displayTrackerGeneration = 0;
        log('pose loop stop requested');
      }
    };
    return state.activeLoop;
  }

  global.PoseRuntime = {
    initMoveNetDetector,
    bootstrapCamera,
    initOptionalTrackers,
    normalizePosePacket,
    classifyPose,
    createSourceToDisplayTransform,
    renderPoseOverlay,
    createTemporalPoseTracker,
    resetDisplayTracker: () => { displayTracker.reset(); state.latestDisplayPose = null; state.displayTrackerGeneration = 0; },
    TRACKING,
    TRACK_MODES,
    updateVoiceFeedback,
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
