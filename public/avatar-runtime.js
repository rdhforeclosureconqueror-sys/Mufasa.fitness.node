(function initAvatarRuntime(globalScope) {
  'use strict';

  const THREE_MODULE_PATH = '/vendor/three/build/three.module.js';
  const GLTF_LOADER_MODULE_PATH = '/vendor/three/examples/jsm/loaders/GLTFLoader.js';

  const defaultStatus = {
    threeBridgeFixActive: true,
    avatarThreeGlobalOk: true,
    threeImportStarted: false,
    threeImportPending: false,
    threeImportOk: false,
    threeImportError: null,
    threeImportTimeout: false,
    threeImportPathUsed: null,
    threeLoaded: false,
    gltfLoaderImportStarted: false,
    gltfLoaderImportPending: false,
    gltfLoaderImportOk: false,
    gltfLoaderImportError: null,
    gltfLoaderImportTimeout: false,
    gltfLoaderImportPathUsed: null,
    gltfLoaderOk: false,
    gltfLoaderLoaded: false,
    readyEventFired: false,
    failedReason: null,
    failureReason: null,
    renderMode: 'unknown',
    lastAvatarUrl: null,
    glbLoadAttempted: false,
    glbLoadStarted: false,
    glbLoadSuccess: false,
    glbLoadError: null,
    lastGlbLoadStatus: 'idle',
    savedAvatarState: 'none',
    savedAvatarSource: null,
    presentationMode: 'camera',
    runtimeOwner: 'AvatarRuntime',
    runtimeStatusGeneration: 0,
    presentationGeneration: 0,
    presentationRequested: false,
    presentationApplied: false,
    presentationUpdatedAt: null,
    avatarAssetState: 'NONE',
    avatarAssetGeneration: 0,
    avatarPresentationState: 'NONE',
    presentationRequestedMode: 'camera',
    presentationAppliedMode: 'camera',
    posePacketsReceived: 0,
    poseEngine: 'MoveNet',
    poseLoopState: 'STOPPED',
    personDetected: false,
    framingState: 'NO_PERSON',
    poseConfidenceMinimum: 0,
    cameraCaptureActive: false,
    poseSourceVideoActive: false,
    userVisibleVideoLayer: 'HIDDEN',
    avatarCanvasVisible: false,
    renderModeOwner: 'camera',
    savedAvatarRestoreRequested: false,
    savedAvatarRestoreSource: null,
    savedAvatarRestoreUrlPresent: false,
    savedAvatarRestoreLoadEntered: false,
    savedAvatarRestoreCompleted: false,
    savedAvatarRestoreFailure: 'NONE',
    bootRestoreGeneration: 0,
    lastPosePacketAt: null,
    lastPosePacketSource: null,
    avatarRuntimeInitialized: true,
    avatarRuntimeConfigured: false,
    canonicalAvatarObserved: false,
    avatarLoadRequested: false,
    avatarLoadRequestSource: null,
    avatarLoadRequestGeneration: 0,
    avatarLoadSkippedReason: 'asset_pipeline_not_configured',
    avatarLoadFunctionEntered: false,
    avatarLoadUrlPresent: false,
    avatarLoadUrlMatchesCanonical: false,
    avatarEnvironmentConfigured: false,
    sceneAvailable: false,
    cameraAvailable: false,
    rendererAvailable: false,
    avatarCanvasElementFound: false,
    renderLoopInitialized: false,
    environmentState: 'NOT_CONFIGURED',
    retargetState: 'NOT_STARTED',
    renderLoopState: 'STOPPED',
    presentationState: 'NONE',
    retargetFramesExecuted: 0,
    bonesChangedLastFrame: 0,
    lastRetargetAt: null,
    lastAnimationFrameId: null,
    avatarLifecycleStage: 'NOT INITIALIZED'
  };

  globalScope.__THREE_BRIDGE_FIX_ACTIVE = true;
  globalScope.__AVATAR_THREE = globalScope.__AVATAR_THREE || { THREE: null, GLTFLoader: null, source: null, ready: false };
  globalScope.__avatarRuntimeStatus = { ...defaultStatus, ...(globalScope.__avatarRuntimeStatus || {}) };

  let modulePromise = null;
  let controlBindings = null;
  let poseSubscribed = false;
  let poseFrameRenderer = null;
  let canvasController = null;

  function status() {
    const current = globalScope.__avatarRuntimeStatus || (globalScope.__avatarRuntimeStatus = {});
    for (const [key, value] of Object.entries(defaultStatus)) {
      if (!(key in current)) current[key] = value;
    }
    current.avatarThreeGlobalOk = Boolean(globalScope.__AVATAR_THREE);
    return current;
  }

  function update(partial = {}) {
    return Object.assign(status(), partial);
  }

  function visibleMessage(element, message, bad = false) {
    if (!element) return;
    element.textContent = message;
    element.classList?.toggle?.('status-bad', Boolean(bad));
    element.classList?.toggle?.('status-ok', !bad);
  }

  function setFailure(reason, payload = {}) {
    const message = String(reason || 'avatar_runtime_failed');
    update({ failedReason: message, failureReason: message });
    console.warn('[AVATAR_RUNTIME]', message, payload);
    globalScope.dispatchEvent?.(new CustomEvent('avatar-runtime-error', { detail: { reason: message, ...payload } }));
    return message;
  }

  async function ensureThreeModules() {
    const bridge = globalScope.__AVATAR_THREE || (globalScope.__AVATAR_THREE = { THREE: null, GLTFLoader: null, source: null, ready: false });
    if (bridge.ready && bridge.THREE && bridge.GLTFLoader) return bridge;
    if (modulePromise) return modulePromise;

    const startedAt = performance.now?.() || Date.now();
    console.log('[THREE_RUNTIME] lazy import requested');
    update({
      threeImportStarted: true,
      threeImportPending: true,
      threeImportPathUsed: THREE_MODULE_PATH,
      gltfLoaderImportStarted: true,
      gltfLoaderImportPending: true,
      gltfLoaderImportPathUsed: GLTF_LOADER_MODULE_PATH,
      lastGlbLoadStatus: 'three_import_started'
    });

    modulePromise = (async () => {
      try {
        const [threeModule, gltfModule] = await Promise.all([
          import(THREE_MODULE_PATH),
          import(GLTF_LOADER_MODULE_PATH)
        ]);
        bridge.THREE = threeModule;
        bridge.GLTFLoader = gltfModule?.GLTFLoader || null;
        bridge.source = 'avatar-runtime.js';
        bridge.ready = Boolean(bridge.THREE && bridge.GLTFLoader);
        const ok = bridge.ready;
        update({
          threeImportPending: false,
          threeImportOk: Boolean(bridge.THREE),
          threeLoaded: Boolean(bridge.THREE),
          gltfLoaderImportPending: false,
          gltfLoaderImportOk: Boolean(bridge.GLTFLoader),
          gltfLoaderOk: Boolean(bridge.GLTFLoader),
          gltfLoaderLoaded: Boolean(bridge.GLTFLoader),
          readyEventFired: ok,
          failedReason: ok ? null : 'avatar_three_runtime_missing_exports',
          failureReason: ok ? null : 'avatar_three_runtime_missing_exports',
          lastGlbLoadStatus: ok ? 'three_import_ready' : 'three_import_missing_exports'
        });
        globalScope.__startupResourceAudit?.deferredModules?.push?.(THREE_MODULE_PATH, GLTF_LOADER_MODULE_PATH);
        globalScope.__markPerfMetric?.('avatarRuntimeLoadMs', Math.round((performance.now?.() || Date.now()) - startedAt));
        if (!ok) throw new Error('avatar_three_runtime_missing_exports');
        console.log('[THREE_RUNTIME] lazy import ready');
        globalScope.dispatchEvent?.(new Event('avatar-three-ready'));
        return bridge;
      } catch (error) {
        const reason = `three_import_failed:${String(error?.message || error || 'unknown')}`;
        update({
          threeImportPending: false,
          threeImportOk: false,
          threeImportError: reason,
          gltfLoaderImportPending: false,
          gltfLoaderImportOk: false,
          gltfLoaderImportError: reason,
          lastGlbLoadStatus: 'three_import_failed'
        });
        setFailure(reason, { source: 'ensureThreeModules' });
        globalScope.dispatchEvent?.(new CustomEvent('avatar-three-failed', { detail: { reason } }));
        throw error;
      }
    })();
    return modulePromise;
  }

  function openModal() {
    const bindings = controlBindings || {};
    const refs = bindings.refs || {};
    const profile = bindings.getProfile?.() || null;
    if (refs.avatarModelUrlInput) refs.avatarModelUrlInput.value = profile?.avatar?.avatarModelUrl || '';
    if (refs.avatarThumbUrlInput) refs.avatarThumbUrlInput.value = profile?.avatar?.avatarThumbnailUrl || '';
    visibleMessage(refs.avatarCreationStatusEl, 'Idle.');
    visibleMessage(refs.avatarRuntimeStatusEl, 'Not attempted.');
    refs.avatarModalEl?.classList?.remove?.('hidden');
    queueMicrotask(() => ensureThreeModules().then(() => bindings.initialize?.('avatar_modal_open')).catch((error) => {
      const reason = String(error?.message || error || 'avatar_modal_bootstrap_failed');
      visibleMessage(refs.avatarRuntimeStatusEl, `Avatar runtime failed: ${reason}`, true);
      setFailure(reason, { source: 'avatar_modal_open' });
    }));
  }

  function closeModal() {
    controlBindings?.refs?.avatarModalEl?.classList?.add?.('hidden');
  }

  async function saveFromInputs() {
    const bindings = controlBindings || {};
    const refs = bindings.refs || {};
    console.log('[AVATAR_RUNTIME] save flow started');
    try {
      await ensureThreeModules();
      await bindings.saveFromInputs?.();
    } catch (error) {
      const reason = String(error?.message || error || 'avatar_save_failed');
      visibleMessage(refs.avatarCreationStatusEl, `Avatar save failed: ${reason}`, true);
      setFailure(reason, { source: 'save' });
    }
  }

  async function uploadFile() {
    const bindings = controlBindings || {};
    const refs = bindings.refs || {};
    console.log('[AVATAR_RUNTIME] upload flow started');
    try {
      await ensureThreeModules();
      await bindings.uploadFile?.();
    } catch (error) {
      const reason = String(error?.message || error || 'avatar_upload_failed');
      visibleMessage(refs.avatarCreationStatusEl, `Avatar upload failed: ${reason}`, true);
      setFailure(reason, { source: 'upload' });
    }
  }

  function bindControls(bindings = {}) {
    controlBindings = bindings;
    const refs = bindings.refs || {};
    if (!refs.avatarCreateBtn) {
      const reason = 'avatar_create_button_missing';
      visibleMessage(refs.avatarCreationStatusEl || globalScope.document?.getElementById?.('avatarCreationStatus'), 'Avatar create button missing. Refresh the page and retry.', true);
      setFailure(reason, { source: 'bind-controls' });
      console.error('[AVATAR_RUNTIME] create button binding failed', { reason });
    }
    console.log('[AVATAR_RUNTIME] rendering configured; modal controls remain owned by WorkoutControlActivation', { hasCreateButton: Boolean(refs.avatarCreateBtn) });
  }

  function handlePosePacket(posePacket, source = 'pose-runtime') {
    const keypoints = posePacket?.keypoints || [];
    const score = index => Number(keypoints[index]?.score || 0);
    const confidence = {
      leftShoulder: score(5), rightShoulder: score(6), leftElbow: score(7), rightElbow: score(8),
      leftWrist: score(9), rightWrist: score(10), leftHip: score(11), rightHip: score(12),
      leftKnee: score(13), rightKnee: score(14), leftAnkle: score(15), rightAnkle: score(16)
    };
    const requiredUpper = ['leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist','leftHip','rightHip'];
    const requiredFull = [...requiredUpper, 'leftKnee','rightKnee','leftAnkle','rightAnkle'];
    const threshold = 0.35;
    const personDetected = keypoints.some(point => Number(point?.score || 0) >= threshold);
    const upperReady = requiredUpper.every(name => confidence[name] >= threshold);
    const fullReady = requiredFull.every(name => confidence[name] >= threshold);
    const shoulderWidth = Math.abs(Number(keypoints[5]?.x || 0) - Number(keypoints[6]?.x || 0));
    const videoWidth = Number(renderEngineBindings?.getVideo?.()?.videoWidth || 0);
    let framingState = !personDetected ? 'NO_PERSON' : fullReady ? 'FULL_BODY_READY' : upperReady ? 'UPPER_BODY_READY' : 'LOW_CONFIDENCE';
    if (personDetected && videoWidth && shoulderWidth / videoWidth > 0.58) framingState = 'TOO_CLOSE';
    if (personDetected && videoWidth && shoulderWidth > 0 && shoulderWidth / videoWidth < 0.1) framingState = 'TOO_FAR';
    const now = new Date().toISOString();
    update({ posePacketsReceived: Number(status().posePacketsReceived || 0) + 1, lastPosePacketAt: now, lastPosePacketSource: source,
      poseLoopState: 'RUNNING', personDetected, framingState, poseConfidenceMinimum: Math.min(...requiredUpper.map(name => confidence[name])),
      keypointConfidence: confidence });
    if ((status().posePacketsReceived % 120) === 1) console.log('[AVATAR_POSE] pose packet received', { source });
    try {
      if (typeof poseFrameRenderer === 'function') poseFrameRenderer(posePacket);
    } catch (error) {
      setFailure(String(error?.message || error || 'avatar_pose_render_failed'), { source: 'pose_packet' });
    }
  }

  function subscribeToPoseRuntime() {
    if (poseSubscribed) return;
    poseSubscribed = true;
    globalScope.addEventListener?.('pose-runtime:frame', (event) => handlePosePacket(event?.detail?.posePacket, 'pose-runtime:event'));
    console.log('[AVATAR_POSE] subscribed to PoseRuntime packets');
  }

  function bindPoseFrameRenderer(renderer) {
    poseFrameRenderer = typeof renderer === 'function' ? renderer : null;
    subscribeToPoseRuntime();
  }

  function registerPoseRenderer(renderer) {
    console.warn('[AVATAR_RUNTIME] registerPoseRenderer is deprecated; use bindPoseFrameRenderer');
    bindPoseFrameRenderer(renderer);
  }

  function bindCanvasController(controller = {}) {
    canvasController = controller || {};
    console.log('[AVATAR_RUNTIME] canvas side effects delegated');
  }

  function setCanvasVisibility(visible) {
    const canvas = canvasController?.getCanvas?.() || canvasController?.canvas || null;
    if (!canvas) return;
    canvas.style.display = visible ? 'block' : 'none';
    canvasController?.logCanvasState?.(`visibility_${visible ? 'on' : 'off'}`);
  }

  function resizeCanvasRuntime() {
    const runtime = canvasController?.ensureRuntime?.() || canvasController?.getRuntime?.() || null;
    const video = canvasController?.getVideo?.() || null;
    const canvas = canvasController?.getCanvas?.() || canvasController?.canvas || null;
    if (!runtime || !video?.videoWidth || !video?.videoHeight || !canvas) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    runtime.renderer?.setSize?.(width, height, false);
    if (runtime.camera) {
      runtime.camera.aspect = width / height;
      runtime.camera.updateProjectionMatrix?.();
    }
    canvas.width = width;
    canvas.height = height;
    canvasController?.logCanvasState?.('runtime_resized');
  }



  const renderEngineDefaults = {
    TRACKING_MODES: { FULL_BODY: 'full_body', UPPER_BODY: 'upper_body', FACE_CLOSE: 'face_close' },
    BODY_VISIBILITY: { NO_PERSON: 'NO_PERSON', HEAD_SHOULDERS: 'HEAD_SHOULDERS', UPPER_BODY: 'UPPER_BODY', TORSO_VISIBLE: 'TORSO_VISIBLE', FULL_BODY: 'FULL_BODY' },
    LOST_HOLD_MS: 500,
    TRACKING_LOG_THROTTLE_MS: 1200,
    MAX_HEAD_YAW: 0.35,
    MAX_HEAD_PITCH: 0.25,
    MAX_SHOULDER_ROLL: 0.25,
    ROTATION_SMOOTHING: 0.18,
    ROOT_SMOOTHING: 0.22,
    ARM_SMOOTHING: 0.28,
    HIP_SMOOTHING: 0.2,
    SHOULDER_TILT_MULTIPLIER: 0.35,
    HEAD_BODY_Y_OFFSET: 0.18
  };

  let renderEngineBindings = null;
  let assetPipelineBindings = null;
  let canonicalProfileSubscribed = false;
  let canonicalLoadPromise = null;

  function canonicalAvatarUrl(profile) {
    const value = profile?.avatar?.avatarModelUrl || profile?.avatar?.modelUrl;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  function refreshEnvironmentTrace() {
    const runtime = renderEngineBindings?.getRuntime?.() || assetPipelineBindings?.getRuntime?.() || null;
    const canvas = renderEngineBindings?.getCanvas?.() || null;
    const ready = Boolean(runtime?.scene && runtime?.camera && runtime?.renderer && canvas);
    return update({
      avatarEnvironmentConfigured: Boolean(renderEngineBindings && assetPipelineBindings),
      sceneAvailable: Boolean(runtime?.scene), cameraAvailable: Boolean(runtime?.camera),
      rendererAvailable: Boolean(runtime?.renderer), avatarCanvasElementFound: Boolean(canvas),
      avatarCanvasConnected: Boolean(canvas?.isConnected), renderLoopInitialized: Boolean(runtime?.renderLoopActive),
      avatarRuntimeConfigured: Boolean(renderEngineBindings && assetPipelineBindings),
      environmentState: ready ? 'READY' : (renderEngineBindings && assetPipelineBindings ? 'FAILED' : 'NOT_CONFIGURED'),
      avatarLifecycleStage: runtime?.avatarRoot ? 'MOUNTED' : (canonicalLoadPromise ? 'LOADING' : (renderEngineBindings && assetPipelineBindings ? 'INITIALIZED BUT NOT LOADING' : 'NOT INITIALIZED'))
    });
  }

  function requestCanonicalAvatarLoad(profile, source, generation = 0) {
    const url = canonicalAvatarUrl(profile);
    update({ canonicalAvatarObserved: Boolean(url), avatarLoadUrlPresent: Boolean(url),
      avatarLoadRequestSource: source, avatarLoadRequestGeneration: Number(generation || 0),
      savedAvatarRestoreRequested: Boolean(url), savedAvatarRestoreSource: /post_save/.test(source) ? 'post_save' : (/event/.test(source) ? 'profile_event' : 'profile_boot'),
      savedAvatarRestoreUrlPresent: Boolean(url), bootRestoreGeneration: Number(generation || 0), savedAvatarRestoreFailure: 'NONE' });
    if (!url) return update({ avatarLoadSkippedReason: 'canonical_avatar_url_missing' });
    if (!assetPipelineBindings) return update({ avatarLoadSkippedReason: 'asset_pipeline_not_configured' });
    if (canonicalLoadPromise) return update({ avatarLoadSkippedReason: 'load_already_in_flight' });
    const current = status();
    if (current.avatarAssetState === 'MOUNTED' && current.lastAvatarUrl === url) return update({ avatarLoadSkippedReason: 'canonical_avatar_already_mounted' });
    update({ avatarLoadRequested: true, avatarLoadSkippedReason: null, avatarLifecycleStage: 'LOADING' });
    canonicalLoadPromise = Promise.resolve().then(() => loadAvatarAssetForCurrentUser(source)).finally(() => {
      canonicalLoadPromise = null;
      refreshEnvironmentTrace();
    });
    return canonicalLoadPromise;
  }

  function configureRenderEngine(bindings = {}) {
    renderEngineBindings = bindings || {};
    bindPoseFrameRenderer((posePacket) => {
      const mode = renderEngineBindings.getRenderMode?.();
      if (mode !== 'avatar_overlay' && mode !== 'avatar_only') return false;
      // Phase 1C gives the bounded solver exclusive pose-to-bone ownership.
      // This runtime still owns the existing renderer/canvas, but must not run
      // its legacy full-rig writer against the same avatar.
      if (renderEngineBindings.isLiveAvatarMirrorActive?.()) return false;
      return renderAvatar3d(posePacket);
    });
    console.log('[AVATAR_RUNTIME] avatar render engine owns pose retarget/render path');
    refreshEnvironmentTrace();
  }

  function configureAssetPipeline(bindings = {}) {
    assetPipelineBindings = bindings || {};
    refreshEnvironmentTrace();
    if (!canonicalProfileSubscribed) {
      globalScope.addEventListener?.('app:canonical-profile', (event) => {
        requestCanonicalAvatarLoad(event.detail?.profile, `canonical_profile_event:${event.detail?.source || 'unknown'}`, event.detail?.generation);
      });
      canonicalProfileSubscribed = true;
    }
    // Canonical events are not replayable. Read the owner directly so late
    // workout/runtime initialization cannot leave a saved avatar at NONE.
    const profile = globalScope.AppHydrationRuntime?.getCanonicalProfile?.();
    if (profile) requestCanonicalAvatarLoad(profile, 'canonical_profile_replay', globalScope.AppHydrationRuntime?.getState?.().profileGeneration);
    console.log('[AVATAR_RUNTIME] avatar asset/profile pipeline delegated to runtime');
  }

  function getRenderConstants() {
    return { ...renderEngineDefaults, ...(renderEngineBindings?.constants || {}) };
  }

  function getThreeRefFromRuntime(runtime) {
    return renderEngineBindings?.getThree?.() || runtime?.THREE || globalScope.__AVATAR_THREE?.THREE || null;
  }

  function getPosePoint(points, index, minScore = 0.35) {
    const point = points?.[index];
    if (!point || Number(point.score || 0) < minScore) return null;
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { ...point, x, y, score: Number(point.score || 0) };
  }

  function getPosePointAny(points, indexes = [], minScore = 0.35) {
    for (const index of indexes) {
      const point = getPosePoint(points, index, minScore);
      if (point) return point;
    }
    return null;
  }

  function getFaceOrientation(face) {
    if (!face || typeof face !== 'object') return null;
    const yaw = Number(face.yaw ?? face.rotationY ?? 0);
    const pitch = Number(face.pitch ?? face.rotationX ?? 0);
    const roll = Number(face.roll ?? face.rotationZ ?? 0);
    return { yaw: Number.isFinite(yaw) ? yaw : 0, pitch: Number.isFinite(pitch) ? pitch : 0, roll: Number.isFinite(roll) ? roll : 0 };
  }

  function toWorldAtAvatarPlane(runtime, x, y) {
    if (typeof renderEngineBindings?.toWorldAtAvatarPlane === 'function') {
      return renderEngineBindings.toWorldAtAvatarPlane(runtime, x, y);
    }
    const video = renderEngineBindings?.getVideo?.() || {};
    const width = Math.max(1, Number(video.videoWidth || renderEngineBindings?.getCanvas?.()?.width || 1));
    const height = Math.max(1, Number(video.videoHeight || renderEngineBindings?.getCanvas?.()?.height || 1));
    const camera = runtime?.camera || { position: { z: 3 }, fov: 45, aspect: width / height };
    const depth = Math.max(0.001, Number(camera.position?.z || 3));
    const halfH = Math.tan((Number(camera.fov || 45) * Math.PI) / 360) * depth;
    const halfW = halfH * Number(camera.aspect || width / height || 1);
    return {
      x: ((Number(x || 0) / width) - 0.5) * halfW * 2,
      y: (0.5 - (Number(y || 0) / height)) * halfH * 2,
      z: 0
    };
  }

  function ensureRuntimeCalibration(runtime) {
    if (!runtime) return null;
    if (!runtime.avatarCalibration) runtime.avatarCalibration = { status: 'not_started', samples: [], shoulderWidthPx: null, midpointPx: null };
    return runtime.avatarCalibration;
  }

  function updateAvatarCalibration(posePacket, runtime) {
    const calibration = ensureRuntimeCalibration(runtime);
    if (!calibration) return null;
    const points = posePacket?.keypoints || [];
    const ls = getPosePoint(points, 5, 0.35);
    const rs = getPosePoint(points, 6, 0.35);
    if (!ls || !rs) return calibration;
    const shoulderWidthSample = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    if (!Number.isFinite(shoulderWidthSample) || shoulderWidthSample <= 0) return calibration;
    calibration.status = 'collecting';
    calibration.samples.push({ shoulderWidthPx: shoulderWidthSample, midpoint: { x: (ls.x + rs.x) * 0.5, y: (ls.y + rs.y) * 0.5 } });
    if (calibration.samples.length < 8) return calibration;
    const shoulderWidthPx = calibration.samples.reduce((sum, sample) => sum + sample.shoulderWidthPx, 0) / calibration.samples.length;
    const midpointPx = calibration.samples.reduce((sum, sample) => ({ x: sum.x + sample.midpoint.x, y: sum.y + sample.midpoint.y }), { x: 0, y: 0 });
    calibration.shoulderWidthPx = shoulderWidthPx;
    calibration.midpointPx = { x: midpointPx.x / calibration.samples.length, y: midpointPx.y / calibration.samples.length };
    calibration.status = 'ready';
    calibration.samples = [];
    return calibration;
  }

  function setLowerBodyVisibility(runtime, visible) {
    if (!runtime?.boneMap) return;
    const lowerBodyBones = ['leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg'];
    if (!runtime.lowerBodyVisibilityState) runtime.lowerBodyVisibilityState = {};
    for (const key of lowerBodyBones) {
      const bone = runtime.boneMap[key];
      if (!bone) continue;
      if (!(key in runtime.lowerBodyVisibilityState)) runtime.lowerBodyVisibilityState[key] = Boolean(bone.visible);
      bone.visible = visible ? runtime.lowerBodyVisibilityState[key] : false;
    }
  }

  function computeAvatarAnchorTransform(posePacket, runtime) {
    const C = getRenderConstants();
    const THREE = getThreeRefFromRuntime(runtime);
    const points = posePacket?.keypoints;
    const tracker = posePacket?.tracker || null;
    const trackingMode = tracker?.mode || renderEngineBindings?.getCurrentTrackingMode?.() || C.TRACKING_MODES.UPPER_BODY;
    const video = renderEngineBindings?.getVideo?.() || {};
    if (!points || !points.length) return { mode: 'lost', trackingReliable: false, hasHead: false, hasShoulders: false, hasHips: false };
    const ls = getPosePoint(points, 5);
    const rs = getPosePoint(points, 6);
    const lh = getPosePoint(points, 11);
    const rh = getPosePoint(points, 12);
    const nose = getPosePointAny(points, [0, 1, 2, 3, 4], 0.25);
    const faceOrientation = getFaceOrientation(tracker?.face);
    const hasHead = Boolean(nose || faceOrientation);
    const hasShoulders = Boolean(ls && rs);
    const hasHips = Boolean(lh && rh);
    const mode = hasShoulders ? (hasHips ? C.TRACKING_MODES.FULL_BODY : C.TRACKING_MODES.UPPER_BODY) : (hasHead ? C.TRACKING_MODES.FACE_CLOSE : 'lost');
    const trackingReliable = mode !== 'lost';
    if (!trackingReliable) return { mode, trackingReliable, hasHead, hasShoulders, hasHips };
    const camera = runtime.camera;
    const depth = Math.max(0.001, camera.position.z);
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * depth;
    const worldPerPixelY = (halfH * 2) / Math.max(1, video.videoHeight || renderEngineBindings?.getCanvas?.()?.height || 1);
    const baseH = runtime.baseAvatarHeight || 1.7;
    const baseW = runtime.baseAvatarWidth || 0.6;
    const baseShoulderWidth = Math.max(0.24, baseW * 0.55);
    const baseTorsoHeight = Math.max(0.28, baseH * 0.32);
    const calibration = ensureRuntimeCalibration(runtime);
    let anchorLevel = C.TRACKING_MODES.FACE_CLOSE;
    let anchorPixel = nose;
    let tilt = 0;
    let scale = 1;
    let ratioY = 0.82;
    if (trackingMode === C.TRACKING_MODES.FULL_BODY && hasShoulders && hasHips) {
      anchorLevel = C.TRACKING_MODES.FULL_BODY;
      anchorPixel = { x: ((ls.x + rs.x) * 0.5 + (lh.x + rh.x) * 0.5) * 0.5, y: ((ls.y + rs.y) * 0.5 + (lh.y + rh.y) * 0.5) * 0.5 };
      const torsoPx = Math.hypot(((ls.x + rs.x) * 0.5) - ((lh.x + rh.x) * 0.5), ((ls.y + rs.y) * 0.5) - ((lh.y + rh.y) * 0.5));
      scale = Math.max(0.45, Math.min(2.4, (torsoPx * worldPerPixelY) / baseTorsoHeight));
      tilt = Math.atan2(rs.y - ls.y, Math.max(1, rs.x - ls.x));
      ratioY = 0.53;
    } else if (trackingMode === C.TRACKING_MODES.UPPER_BODY && hasShoulders) {
      anchorLevel = C.TRACKING_MODES.UPPER_BODY;
      anchorPixel = { x: (ls.x + rs.x) * 0.5, y: (ls.y + rs.y) * 0.5 };
      const shoulderWorld = Math.hypot(rs.x - ls.x, rs.y - ls.y) * worldPerPixelY;
      const calibratedShoulderWorld = (calibration?.status === 'ready' && calibration?.shoulderWidthPx) ? Math.max(0.01, calibration.shoulderWidthPx * worldPerPixelY) : baseShoulderWidth;
      scale = Math.max(0.45, Math.min(2.4, shoulderWorld / calibratedShoulderWorld));
      tilt = Math.atan2(rs.y - ls.y, Math.max(1, rs.x - ls.x));
    } else {
      const eyes = [getPosePoint(points, 1, 0.25), getPosePoint(points, 2, 0.25), getPosePoint(points, 3, 0.25), getPosePoint(points, 4, 0.25)].filter(Boolean);
      const fallbackNose = nose || { x: (video.videoWidth || 1) * 0.5, y: (video.videoHeight || 1) * 0.38 };
      const headSamples = [fallbackNose, ...eyes].filter(Boolean);
      const headCenter = headSamples.reduce((sum, kp) => ({ x: sum.x + kp.x, y: sum.y + kp.y }), { x: 0, y: 0 });
      const headCenterX = headCenter.x / Math.max(1, headSamples.length);
      const headCenterY = headCenter.y / Math.max(1, headSamples.length);
      anchorPixel = { x: headCenterX, y: Math.min((video.videoHeight || 1) - 1, headCenterY + ((video.videoHeight || 1) * C.HEAD_BODY_Y_OFFSET)) };
      const eye = eyes[0] || null;
      const headPx = eye ? Math.max(20, Math.hypot(fallbackNose.x - eye.x, fallbackNose.y - eye.y) * 3.4) : 52;
      scale = Math.max(0.75, Math.min(1.35, (headPx * worldPerPixelY) / (baseH * 0.16)));
    }
    const anchorWorld = toWorldAtAvatarPlane(runtime, anchorPixel.x, anchorPixel.y);
    const clamp = THREE?.MathUtils?.clamp || ((v, min, max) => Math.max(min, Math.min(max, v)));
    return {
      mode,
      trackingReliable,
      hasHead,
      hasShoulders,
      hasHips,
      level: anchorLevel,
      position: { x: anchorWorld.x, y: anchorWorld.y - ((baseH * scale) * ratioY), z: 0 },
      rotationY: 0,
      rotationZ: clamp(-tilt * C.SHOULDER_TILT_MULTIPLIER, -C.MAX_SHOULDER_ROLL, C.MAX_SHOULDER_ROLL),
      scale
    };
  }

  function applyPoseToAvatarRig(posePacket, options = {}) {
    const C = getRenderConstants();
    const runtime = renderEngineBindings?.ensureRuntime?.() || renderEngineBindings?.getRuntime?.() || null;
    const THREE = getThreeRefFromRuntime(runtime);
    if (!runtime?.avatarRoot || !runtime?.boneMap || !THREE?.MathUtils) return false;
    const points = posePacket?.keypoints;
    if (!points || !points.length) return false;
    const visibilityState = options.visibilityState || C.BODY_VISIBILITY.NO_PERSON;
    const allowHeadShoulders = [C.BODY_VISIBILITY.HEAD_SHOULDERS, C.BODY_VISIBILITY.UPPER_BODY, C.BODY_VISIBILITY.TORSO_VISIBLE, C.BODY_VISIBILITY.FULL_BODY].includes(visibilityState);
    const allowArms = [C.BODY_VISIBILITY.UPPER_BODY, C.BODY_VISIBILITY.TORSO_VISIBLE, C.BODY_VISIBILITY.FULL_BODY].includes(visibilityState);
    const allowTorso = [C.BODY_VISIBILITY.TORSO_VISIBLE, C.BODY_VISIBILITY.FULL_BODY].includes(visibilityState);
    const allowLowerBody = visibilityState === C.BODY_VISIBILITY.FULL_BODY && !options.disableLowerBody;
    const now = Date.now();
    const state = runtime.puppetState || (runtime.puppetState = { lastGoodByLimb: {}, lastLogAt: 0 });
    const restPose = runtime.boneRestPose || {};
    const getRest = (key, axis, fallback = 0) => restPose?.[key]?.[axis] ?? fallback;
    const relaxToRest = (boneKey, axis, speed = 0.1) => {
      const bone = runtime.boneMap?.[boneKey];
      if (bone) bone.rotation[axis] = THREE.MathUtils.lerp(bone.rotation[axis], getRest(boneKey, axis, 0), speed);
    };
    const applyTrackedAxis = (limbKey, boneKey, axis, targetValue, min, max, smooth = 0.26, confidence = 1, minConfidence = 0.3) => {
      const bone = runtime.boneMap?.[boneKey];
      if (!bone) return 'missing_bone';
      if (typeof targetValue === 'number' && Number.isFinite(targetValue) && confidence >= minConfidence) {
        state.lastGoodByLimb[limbKey] = now;
        bone.rotation[axis] = THREE.MathUtils.lerp(bone.rotation[axis], THREE.MathUtils.clamp(targetValue, min, max), smooth);
        return 'applied';
      }
      const held = (now - (state.lastGoodByLimb[limbKey] || 0)) <= C.LOST_HOLD_MS;
      if (!held) relaxToRest(boneKey, axis, 0.12);
      return held ? 'held' : 'relaxed';
    };
    const kp = (i, min) => getPosePoint(points, i, min);
    const nose = kp(0, 0.2), leftEye = kp(1, 0.2), rightEye = kp(2, 0.2), leftEar = kp(3, 0.2), rightEar = kp(4, 0.2);
    const ls = kp(5), rs = kp(6), le = kp(7, 0.3), re = kp(8, 0.3), lw = kp(9, 0.25), rw = kp(10, 0.25);
    const lh = kp(11, 0.3), rh = kp(12, 0.3), lk = kp(13, 0.3), rk = kp(14, 0.3), la = kp(15, 0.3), ra = kp(16, 0.3);
    const score = (i) => Number(points?.[i]?.score || 0);
    const hasLandmarks = { head: Boolean(nose || leftEye || rightEye || leftEar || rightEar), shoulders: Boolean(ls && rs), elbows: Boolean(le && re), wrists: Boolean(lw && rw), hips: Boolean(lh && rh), knees: Boolean(lk && rk), ankles: Boolean(la && ra) };
    const applied = [];
    const skipped = [];
    const angle = (a, b) => (a && b) ? Math.atan2(b.y - a.y, b.x - a.x) : null;
    const shoulderRoll = (ls && rs) ? THREE.MathUtils.clamp(-Math.atan2((rs.y - ls.y), Math.max(1, rs.x - ls.x)) * C.SHOULDER_TILT_MULTIPLIER, -C.MAX_SHOULDER_ROLL, C.MAX_SHOULDER_ROLL) : null;
    const headYaw = (leftEar && rightEar) ? THREE.MathUtils.clamp((leftEar.y - rightEar.y) / 120, -C.MAX_HEAD_YAW, C.MAX_HEAD_YAW) : 0;
    const headPitch = (nose && leftEye && rightEye) ? THREE.MathUtils.clamp((((leftEye.y + rightEye.y) * 0.5) - nose.y) / 90, -C.MAX_HEAD_PITCH, C.MAX_HEAD_PITCH) : 0;
    const record = (limb, result) => { if (result === 'applied') applied.push(limb); else skipped.push(`${limb}:${result}`); };
    record('spine', allowTorso ? applyTrackedAxis('spine', 'spine', 'z', shoulderRoll, -0.7, 0.7, C.HIP_SMOOTHING, Math.min(score(5), score(6)), 0.34) : 'hidden');
    record('chest', allowTorso ? applyTrackedAxis('chest', 'chest', 'z', shoulderRoll, -0.9, 0.9, C.HIP_SMOOTHING, Math.min(score(5), score(6)), 0.34) : 'hidden');
    record('neckPitch', allowHeadShoulders ? applyTrackedAxis('neckPitch', 'neck', 'x', -headPitch * 0.45, -0.6, 0.6, C.ROTATION_SMOOTHING, Math.max(score(0), score(1), score(2)), 0.22) : 'hidden');
    record('neckYaw', allowHeadShoulders ? applyTrackedAxis('neckYaw', 'neck', 'y', headYaw * 0.35, -0.7, 0.7, C.ROTATION_SMOOTHING, Math.max(score(3), score(4), score(1), score(2)), 0.22) : 'hidden');
    record('headPitch', allowHeadShoulders ? applyTrackedAxis('headPitch', 'head', 'x', -headPitch, -0.9, 0.9, C.ROTATION_SMOOTHING, Math.max(score(0), score(1), score(2)), 0.22) : 'hidden');
    record('headYaw', allowHeadShoulders ? applyTrackedAxis('headYaw', 'head', 'y', headYaw, -1.1, 1.1, C.ROTATION_SMOOTHING, Math.max(score(3), score(4), score(1), score(2)), 0.22) : 'hidden');
    record('headRoll', allowHeadShoulders ? applyTrackedAxis('headRoll', 'head', 'z', shoulderRoll, -0.8, 0.8, C.ROTATION_SMOOTHING, Math.min(score(5), score(6)), 0.34) : 'hidden');
    record('leftUpperArm', allowArms ? applyTrackedAxis('leftUpperArm', 'leftUpperArm', 'z', (ls && le) ? THREE.MathUtils.clamp(angle(ls, le) + 1.05, -1.4, 1.4) : null, -1.4, 1.4, C.ARM_SMOOTHING, Math.min(score(5), score(7)), 0.34) : 'hidden');
    record('rightUpperArm', allowArms ? applyTrackedAxis('rightUpperArm', 'rightUpperArm', 'z', (rs && re) ? THREE.MathUtils.clamp(angle(rs, re) - 1.05, -1.4, 1.4) : null, -1.4, 1.4, C.ARM_SMOOTHING, Math.min(score(6), score(8)), 0.34) : 'hidden');
    record('leftLowerArm', allowArms ? applyTrackedAxis('leftLowerArm', 'leftLowerArm', 'z', (le && lw) ? THREE.MathUtils.clamp(angle(le, lw) + 0.85, -1.4, 1.4) : null, -1.4, 1.4, C.ARM_SMOOTHING, Math.min(score(7), score(9)), 0.3) : 'hidden');
    record('rightLowerArm', allowArms ? applyTrackedAxis('rightLowerArm', 'rightLowerArm', 'z', (re && rw) ? THREE.MathUtils.clamp(angle(re, rw) - 0.85, -1.4, 1.4) : null, -1.4, 1.4, C.ARM_SMOOTHING, Math.min(score(8), score(10)), 0.3) : 'hidden');
    record('leftHand', allowArms ? applyTrackedAxis('leftHand', 'leftHand', 'z', (le && lw) ? THREE.MathUtils.clamp((angle(le, lw) + 0.85) * 0.45, -0.8, 0.8) : null, -0.8, 0.8, 0.22, Math.min(score(7), score(9)), 0.3) : 'hidden');
    record('rightHand', allowArms ? applyTrackedAxis('rightHand', 'rightHand', 'z', (re && rw) ? THREE.MathUtils.clamp((angle(re, rw) - 0.85) * 0.45, -0.8, 0.8) : null, -0.8, 0.8, 0.22, Math.min(score(8), score(10)), 0.3) : 'hidden');
    record('hips', allowTorso ? applyTrackedAxis('hips', 'hips', 'z', shoulderRoll, -0.7, 0.7, C.HIP_SMOOTHING, Math.min(score(11), score(12)), 0.3) : 'hidden');
    record('leftUpperLeg', allowLowerBody ? applyTrackedAxis('leftUpperLeg', 'leftUpperLeg', 'z', (lh && lk) ? THREE.MathUtils.clamp(angle(lh, lk) + 1.45, -1.25, 1.25) : null, -1.25, 1.25, 0.24, Math.min(score(11), score(13)), 0.32) : 'hidden');
    record('rightUpperLeg', allowLowerBody ? applyTrackedAxis('rightUpperLeg', 'rightUpperLeg', 'z', (rh && rk) ? THREE.MathUtils.clamp(angle(rh, rk) - 1.45, -1.25, 1.25) : null, -1.25, 1.25, 0.24, Math.min(score(12), score(14)), 0.32) : 'hidden');
    record('leftLowerLeg', allowLowerBody ? applyTrackedAxis('leftLowerLeg', 'leftLowerLeg', 'z', (lk && la) ? THREE.MathUtils.clamp(angle(lk, la) + 1.45, -1.25, 1.25) : null, -1.25, 1.25, 0.24, Math.min(score(13), score(15)), 0.32) : 'hidden');
    record('rightLowerLeg', allowLowerBody ? applyTrackedAxis('rightLowerLeg', 'rightLowerLeg', 'z', (rk && ra) ? THREE.MathUtils.clamp(angle(rk, ra) - 1.45, -1.25, 1.25) : null, -1.25, 1.25, 0.24, Math.min(score(14), score(16)), 0.32) : 'hidden');
    if ((now - state.lastLogAt) >= C.TRACKING_LOG_THROTTLE_MS) {
      state.lastLogAt = now;
      console.log('[avatar-puppet] landmarks available: head/shoulders/elbows/wrists/hips/knees/ankles', hasLandmarks);
      console.log('[avatar-puppet] applied limbs:', applied);
      console.log('[avatar-puppet] skipped limbs:', skipped);
    }
    runtime.lastBonesApplied = applied.slice();
    return applied.length > 0;
  }

  function renderAvatar3d(posePacket) {
    const C = getRenderConstants();
    const asset = renderEngineBindings?.getActiveAvatarAsset?.();
    if (!asset) throw new Error('avatar_asset_not_loaded');
    const runtime = renderEngineBindings?.ensureRuntime?.() || renderEngineBindings?.getRuntime?.() || null;
    const THREE = getThreeRefFromRuntime(runtime);
    if (!runtime?.avatarRoot || !THREE?.MathUtils) throw new Error('avatar_runtime_not_initialized');
    const mountedInScene = Boolean(runtime?.scene && runtime.avatarRoot && runtime.scene.children.includes(runtime.avatarRoot));
    if (!mountedInScene) throw new Error('avatar_model_not_mounted_to_scene');
    if (runtime.avatarRoot.visible === false) throw new Error('avatar_model_hidden');
    const canvas = renderEngineBindings?.getCanvas?.() || null;
    const canvasRect = canvas?.getBoundingClientRect?.();
    const canvasWidth = Number(canvas?.width || 0);
    const canvasHeight = Number(canvas?.height || 0);
    const canvasStyles = canvas && globalScope.getComputedStyle ? globalScope.getComputedStyle(canvas) : null;
    const canvasDisplay = canvasStyles?.display || canvas?.style?.display || null;
    const canvasVisibility = canvasStyles?.visibility || canvas?.style?.visibility || null;
    const canvasOpacity = canvasStyles?.opacity || canvas?.style?.opacity || null;
    const overlayContainerExists = Boolean(canvas?.closest?.('.video-shell'));
    let overlayVisibilityReason = 'visible';
    if (canvasWidth <= 0 || canvasHeight <= 0 || (canvasRect && (canvasRect.width <= 0 || canvasRect.height <= 0))) overlayVisibilityReason = 'avatar_canvas_zero_size';
    else if (canvasDisplay === 'none') overlayVisibilityReason = 'avatar_canvas_display_none';
    else if (canvasVisibility === 'hidden') overlayVisibilityReason = 'avatar_canvas_visibility_hidden';
    else if (Number.parseFloat(canvasOpacity || '1') <= 0) overlayVisibilityReason = 'avatar_canvas_opacity_zero';
    else if (!overlayContainerExists) overlayVisibilityReason = 'avatar_overlay_container_missing';
    else if (!runtime.renderLoopActive) overlayVisibilityReason = 'avatar_overlay_render_loop_not_running';
    renderEngineBindings?.updateOverlayDiagnostics?.({ avatarModelLoaded: true, avatarModelMounted: mountedInScene, avatarModelVisible: runtime.avatarRoot.visible !== false, avatarSceneChildrenCount: runtime?.scene?.children?.length || 0, avatarCanvasWidth: canvasWidth, avatarCanvasHeight: canvasHeight, avatarCanvasDisplay: canvasDisplay, avatarCanvasVisibility: canvasVisibility, avatarCanvasOpacity: canvasOpacity, avatarCanvasZIndex: canvasStyles?.zIndex || canvas?.style?.zIndex || null, avatarOverlayContainerExists: overlayContainerExists, overlayRenderLoopRunning: Boolean(runtime.renderLoopActive), avatarOverlayVisibilityReason: overlayVisibilityReason });
    if (overlayVisibilityReason !== 'visible') throw new Error(overlayVisibilityReason);
    const now = Date.now();
    if (!runtime.upperBodyTrackingLogged) {
      runtime.upperBodyTrackingLogged = true;
      console.log('[avatar-upper-body] head/shoulders/arms tracking active');
    }
    const points = posePacket?.keypoints || [];
    const tracker = posePacket?.tracker || null;
    const trackingState = tracker?.trackingState || renderEngineBindings?.getCurrentTrackingState?.();
    const visibilityState = renderEngineBindings?.getLastBodyVisibility?.() || trackingState || C.BODY_VISIBILITY.NO_PERSON;
    const fullBodyReady = visibilityState === C.BODY_VISIBILITY.FULL_BODY;
    const avatarBodyMode = fullBodyReady ? 'full' : 'upper_only';
    const calibration = updateAvatarCalibration(posePacket, runtime);
    renderEngineBindings?.updateOverlayDiagnostics?.({ bodyMode: avatarBodyMode, trackingState: trackingState || null, calibrationStatus: calibration?.status || 'not_started' });
    const hasHead = Boolean(getPosePointAny(points, [0, 1, 2, 3, 4], 0.25));
    const hasShoulders = Boolean(getPosePoint(points, 5) && getPosePoint(points, 6));
    const hasElbows = Boolean(getPosePoint(points, 7, 0.3) && getPosePoint(points, 8, 0.3));
    const hasWrists = Boolean(getPosePoint(points, 9, 0.25) && getPosePoint(points, 10, 0.25));
    const trackingGood = hasHead || hasShoulders || hasElbows || hasWrists;
    if (trackingGood) runtime.lastUpperBodyGoodAt = now;
    const anchor = computeAvatarAnchorTransform(posePacket, runtime);
    const stageMode = renderEngineBindings?.getAvatarStageMode?.() || 'fixed';
    if (anchor?.trackingReliable && anchor.position && stageMode === 'follow_pose') {
      runtime.avatarRoot.position.x = THREE.MathUtils.lerp(runtime.avatarRoot.position.x, anchor.position.x, C.ROOT_SMOOTHING);
      runtime.avatarRoot.position.y = THREE.MathUtils.lerp(runtime.avatarRoot.position.y, anchor.position.y, C.ROOT_SMOOTHING);
      runtime.avatarRoot.position.z = 0;
      runtime.avatarRoot.rotation.y = THREE.MathUtils.lerp(runtime.avatarRoot.rotation.y, anchor.rotationY || 0, C.ROOT_SMOOTHING);
      runtime.avatarRoot.rotation.z = THREE.MathUtils.lerp(runtime.avatarRoot.rotation.z, anchor.rotationZ || 0, C.ROOT_SMOOTHING);
      runtime.avatarRoot.scale.setScalar(THREE.MathUtils.lerp(runtime.avatarRoot.scale.x, anchor.scale || 1.05, C.ROOT_SMOOTHING));
    } else {
      const fixed = runtime.fixedStageAnchor || { x: 0, y: 0, z: 0, rotationY: 0, rotationZ: 0, scale: 1.05 };
      runtime.avatarRoot.position.x = THREE.MathUtils.lerp(runtime.avatarRoot.position.x, fixed.x || 0, C.ROOT_SMOOTHING);
      runtime.avatarRoot.position.y = THREE.MathUtils.lerp(runtime.avatarRoot.position.y, fixed.y || 0, C.ROOT_SMOOTHING);
      runtime.avatarRoot.position.z = 0;
      runtime.avatarRoot.rotation.y = THREE.MathUtils.lerp(runtime.avatarRoot.rotation.y, fixed.rotationY || 0, C.ROOT_SMOOTHING);
      runtime.avatarRoot.rotation.z = THREE.MathUtils.lerp(runtime.avatarRoot.rotation.z, fixed.rotationZ || 0, C.ROOT_SMOOTHING);
      runtime.avatarRoot.scale.setScalar(THREE.MathUtils.lerp(runtime.avatarRoot.scale.x, fixed.scale || 1.05, C.ROOT_SMOOTHING));
    }
    setLowerBodyVisibility(runtime, fullBodyReady);
    const watched = ['hips', 'leftUpperArm', 'rightUpperArm', 'head'];
    const before = Object.fromEntries(watched.map(key => [key, runtime.boneMap?.[key]?.quaternion?.toArray?.() || null]));
    const retargetActive = applyPoseToAvatarRig(posePacket, { disableLowerBody: !fullBodyReady, visibilityState });
    const after = Object.fromEntries(watched.map(key => [key, runtime.boneMap?.[key]?.quaternion?.toArray?.() || null]));
    const changed = watched.filter(key => before[key] && after[key] && before[key].some((value, index) => Math.abs(value - after[key][index]) > 1e-7));
    runtime.retargetFramesExecuted = Number(runtime.retargetFramesExecuted || 0) + 1;
    runtime.lastRetargetAt = now;
    runtime.bonesChangedLastFrame = Math.max(changed.length, runtime.lastBonesApplied?.length || 0);
    update({ retargetState: 'RUNNING', retargetFramesExecuted: runtime.retargetFramesExecuted,
      lastRetargetAt: new Date(now).toISOString(), bonesChangedLastFrame: runtime.bonesChangedLastFrame,
      hipsBefore: before.hips, hipsAfter: after.hips, leftUpperArmBefore: before.leftUpperArm,
      leftUpperArmAfter: after.leftUpperArm, rightUpperArmBefore: before.rightUpperArm,
      rightUpperArmAfter: after.rightUpperArm, headBefore: before.head, headAfter: after.head });
    if (asset.runtimeStatus) asset.runtimeStatus.motionRetargeted = retargetActive;
    runtime.renderer.render(runtime.scene, runtime.camera);
    setCanvasVisibility(true);
    renderEngineBindings?.setRuntimeStatus?.(`3D avatar tracking active (${tracker?.mode || renderEngineBindings?.getCurrentTrackingMode?.() || 'unknown'}).`, false);
    if (!runtime.lastFacingLogAt || (now - runtime.lastFacingLogAt) >= C.TRACKING_LOG_THROTTLE_MS) {
      const finalRotationY = (runtime.avatarRoot?.rotation?.y || 0) + (runtime.avatarModelGroup?.rotation?.y || 0);
      console.log('[avatar-facing] final model rotationY:', Number(finalRotationY.toFixed(4)), 'layer=modelGroup-only');
      runtime.lastFacingLogAt = now;
    }
    if (!runtime.lastTrackingLogAt || (now - runtime.lastTrackingLogAt) >= C.TRACKING_LOG_THROTTLE_MS) {
      console.log(`[avatar-upper-body] landmarks: head ${hasHead ? 'yes' : 'no'}, shoulders ${hasShoulders ? 'yes' : 'no'}, elbows ${hasElbows ? 'yes' : 'no'}, wrists ${hasWrists ? 'yes' : 'no'}`);
      console.log('[avatar-tracking-state]', { trackingState, avatarBodyMode, calibration: calibration?.status || 'not_started' });
      runtime.lastTrackingLogAt = now;
    }
    const holdingPose = !trackingGood && (now - runtime.lastUpperBodyGoodAt) <= C.LOST_HOLD_MS;
    runtime.lastAlignmentTrace = { skeletonBasis: 'MoveNet image-space (pixels, mirrored in detector with flipHorizontal=true) to Three camera world (AvatarRuntime.toWorldAtAvatarPlane)', rootAnchor: anchor?.level || anchor?.mode || 'lost', rootPosition: { x: Number((runtime.avatarRoot?.position?.x || 0).toFixed(4)), y: Number((runtime.avatarRoot?.position?.y || 0).toFixed(4)), z: Number((runtime.avatarRoot?.position?.z || 0).toFixed(4)) }, scale: Number((runtime.avatarRoot?.scale?.x || 1).toFixed(4)), facingDegrees: Number(renderEngineBindings?.getAvatarFacingDeg?.() || 0), limbsApplied: retargetActive ? 'yes' : 'no', limbsSkippedReason: holdingPose ? 'holding_last_pose' : 'none', offscreenReason: (!anchor?.trackingReliable || !anchor?.position) ? 'anchor_not_reliable' : (stageMode !== 'follow_pose' ? `stage_mode_${stageMode}` : 'follow_pose_active') };
    renderEngineBindings?.updateDebugOverlay?.({ tracking: { mode: tracker?.mode || renderEngineBindings?.getCurrentTrackingMode?.(), state: trackingState, visibleLandmarks: tracker?.visibleLandmarks || [], confidenceScore: tracker?.confidenceScore ?? 0 }, avatarMode: renderEngineBindings?.getRenderMode?.(), avatarBodyMode, calibration: { status: calibration?.status || 'not_started' }, form: globalScope.__lastFormResult || null });
    refreshRuntimeProof();
    return retargetActive || holdingPose;
  }

  function refreshRuntimeProof() {
    const previousPresentation = status().presentationState;
    const runtime = renderEngineBindings?.getRuntime?.() || assetPipelineBindings?.getRuntime?.() || null;
    const canvas = renderEngineBindings?.getCanvas?.() || runtime?.renderer?.domElement || null;
    const rect = canvas?.getBoundingClientRect?.() || {};
    const root = runtime?.avatarRoot;
    let bones = 0, skinnedMeshes = 0, materials = 0, textures = 0, lights = [];
    root?.traverse?.(node => {
      if (node?.isBone) bones += 1;
      if (node?.isSkinnedMesh) skinnedMeshes += 1;
      if (node?.isMesh) for (const material of (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean)) {
        materials += 1; for (const value of Object.values(material)) if (value?.isTexture) textures += 1;
      }
    });
    runtime?.scene?.traverse?.(node => { if (node?.isLight) lights.push(node.type); });
    const lastRenderAgeMs = runtime?.lastRenderAt ? Date.now() - runtime.lastRenderAt : null;
    const trackingEnabled = ['avatar_overlay', 'avatar_only'].includes(renderEngineBindings?.getRenderMode?.());
    const identityOk = Boolean(root && root.parent === runtime?.scene);
    const renderRunning = Boolean(runtime?.renderLoopActive && lastRenderAgeMs != null && lastRenderAgeMs < 1000);
    const retargetRunning = Number(runtime?.retargetFramesExecuted || status().retargetFramesExecuted || 0) > 0;
    const poseRunning = Number(status().posePacketsReceived || 0) > 0 && status().poseLoopState === 'RUNNING';
    const boneProof = Number(runtime?.bonesChangedLastFrame || status().bonesChangedLastFrame || 0) > 0;
    const presentation = identityOk && renderRunning && (!trackingEnabled || (poseRunning && retargetRunning && boneProof)) ? 'ACTIVE' : (root ? 'REQUESTED' : 'NONE');
    const proof = update({ sceneUuid: runtime?.scene?.uuid || 'none', avatarRootUuid: root?.uuid || 'none', avatarParentIsActiveScene: identityOk,
      rendererType: runtime?.renderer?.constructor?.name || 'none', cameraUuid: runtime?.camera?.uuid || 'none', cameraType: runtime?.camera?.type || 'none',
      cameraFov: runtime?.camera?.fov ?? null, cameraNear: runtime?.camera?.near ?? null, cameraFar: runtime?.camera?.far ?? null,
      canvasDomId: canvas?.id || 'none', canvasCssSize: `${Math.round(rect.width || 0)}x${Math.round(rect.height || 0)}`,
      canvasBufferSize: `${canvas?.width || 0}x${canvas?.height || 0}`, rendererDpr: runtime?.renderer?.getPixelRatio?.() || 0,
      renderFrames: Number(runtime?.renderFrameCount || 0), lastRenderAt: runtime?.lastRenderAt || null, lastRenderAgeMs,
      avatarWorldPosition: root?.getWorldPosition ? root.getWorldPosition({ setFromMatrixPosition(m){ this.x=m.elements[12];this.y=m.elements[13];this.z=m.elements[14];return this; } }) : null,
      avatarRotation: root ? { x: root.rotation.x, y: root.rotation.y, z: root.rotation.z } : null,
      avatarScale: root ? { x: root.scale.x, y: root.scale.y, z: root.scale.z } : null, skeletonBoneCount: bones, skinnedMeshCount: skinnedMeshes,
      mappedBoneCount: Object.values(runtime?.boneMap || {}).filter(Boolean).length, materialCount: materials, textureCount: textures,
      activeLights: lights, outputColorSpace: runtime?.renderer?.outputColorSpace || 'unknown', toneMapping: runtime?.renderer?.toneMapping ?? 'unknown',
      shadowState: Boolean(runtime?.renderer?.shadowMap?.enabled), renderLoopState: renderRunning ? 'RUNNING' : (runtime?.renderLoopActive ? 'STALLED' : 'STOPPED'),
      renderedRootEqualsRetargetedRoot: Boolean(root && runtime?.avatarRoot === root), poseLoopState: poseRunning ? 'RUNNING' : 'STOPPED',
      presentationState: presentation, avatarPresentationState: presentation,
      retargetState: retargetRunning ? 'RUNNING' : (trackingEnabled && root ? 'ARMED' : 'NOT_STARTED') });
    if (!runtime?.lastProofPublishedAt || Date.now() - runtime.lastProofPublishedAt >= 500) {
      if (runtime) runtime.lastProofPublishedAt = Date.now();
      globalScope.dispatchEvent?.(new CustomEvent('avatar-runtime:proof', { detail: proof }));
    }
    if (presentation !== previousPresentation) globalScope.dispatchEvent?.(new CustomEvent('avatar-runtime:presentation-state', {
      detail: { ...proof, savedAvatarState: presentation === 'ACTIVE' ? 'active' : 'mounted',
        avatarPresentationState: presentation, presentationMode: renderEngineBindings?.getRenderMode?.(), presentationUpdatedAt: new Date().toISOString() }
    }));
    return proof;
  }

  function runManualRuntimeTest(kind = 'bone', durationMs = 1500) {
    const runtime = renderEngineBindings?.getRuntime?.();
    const target = kind === 'depth' ? runtime?.avatarRoot : runtime?.boneMap?.leftUpperArm;
    if (!target?.rotation) throw new Error(kind === 'depth' ? 'avatar_root_missing' : 'left_upper_arm_missing');
    const axis = kind === 'depth' ? 'y' : 'z', original = target.rotation[axis];
    const quaternionBefore = target.quaternion?.toArray?.() || null;
    target.rotation[axis] = original + Math.PI / 4; target.updateMatrixWorld?.(true);
    const quaternionAfter = target.quaternion?.toArray?.() || null;
    const renderFrameBefore = Number(runtime.renderFrameCount || 0);
    refreshRuntimeProof();
    globalScope.setTimeout?.(() => { target.rotation[axis] = original; target.updateMatrixWorld?.(true); }, durationMs);
    return { kind, renderedRootUuid: runtime.avatarRoot?.uuid, mutatedRootUuid: runtime.avatarRoot?.uuid,
      targetBone: kind === 'depth' ? 'avatarOrientationRoot' : 'leftUpperArm', quaternionBefore, quaternionAfter,
      renderFrameBefore, renderFrameAdvanced: () => Number(runtime.renderFrameCount || 0) > renderFrameBefore, axis, radians: Math.PI / 4 };
  }

  async function loadAvatarAssetForCurrentUser(source = 'saved_profile') {
    const b = assetPipelineBindings || {};
    const statusRef = b.getStatusRef?.() || status();
    statusRef.renderMode = b.getRenderMode?.() || 'unknown';
    console.log(`[avatar-load] render mode at avatar load time: ${statusRef.renderMode}`);
    const profile = b.getProfile?.() || null;
    const nextAvatar = b.normalizeAvatarProfile?.(profile?.avatar) || null;
    const loadUrl = nextAvatar?.avatarModelUrl || null;
    const canonicalUrl = canonicalAvatarUrl(globalScope.AppHydrationRuntime?.getCanonicalProfile?.());
    update({ avatarLoadFunctionEntered: true, avatarLoadRequested: true, avatarLoadRequestSource: source, savedAvatarRestoreLoadEntered: true,
      avatarLoadUrlPresent: Boolean(loadUrl), avatarLoadUrlMatchesCanonical: Boolean(loadUrl && canonicalUrl && loadUrl === canonicalUrl),
      canonicalAvatarObserved: Boolean(canonicalUrl || loadUrl), avatarLoadSkippedReason: loadUrl ? null : 'normalized_avatar_missing',
      avatarLifecycleStage: loadUrl ? 'LOADING' : 'INITIALIZED BUT NOT LOADING' });
    const traceState = (savedAvatarState, details = {}) => {
      const generation = Number(statusRef.presentationGeneration || 0) + 1;
      const assetState = details.avatarAssetState || ({ none: 'NONE', profile_ready: 'LOADING', mounted: 'MOUNTED', active: 'MOUNTED', failed: 'FAILED' }[savedAvatarState] || statusRef.avatarAssetState);
      const presentationState = details.avatarPresentationState || ({ active: 'ACTIVE', failed: 'FAILED', mounted: 'REQUESTED', profile_ready: 'NONE', none: 'NONE' }[savedAvatarState] || 'NONE');
      const trace = { savedAvatarState, savedAvatarSource: source, presentationGeneration: generation,
        presentationRequested: ['profile_ready', 'mounted', 'active'].includes(savedAvatarState),
        presentationApplied: savedAvatarState === 'active', presentationUpdatedAt: new Date().toISOString(),
        avatarAssetState: assetState, avatarAssetGeneration: Number(statusRef.avatarAssetGeneration || 0) + (assetState !== statusRef.avatarAssetState ? 1 : 0),
        avatarPresentationState: presentationState, ...details };
      Object.assign(statusRef, trace);
      b.setPresentationState?.(savedAvatarState, { source, mode: trace.presentationMode || b.getRenderMode?.() || 'camera' });
      globalScope.dispatchEvent?.(new CustomEvent('avatar-runtime:presentation-state', { detail: trace }));
    };
    const clearMountedRuntime = () => {
      b.setActiveAvatarAsset?.(null);
      const runtime = b.ensureRuntime?.() || b.getRuntime?.() || null;
      if (runtime?.avatarRoot) runtime.scene?.remove?.(runtime.avatarRoot);
      if (runtime) {
        runtime.avatarRoot = null;
        runtime.avatarModelGroup = null;
        runtime.modelRoot = null;
        runtime.active = false;
      }
      b.setCanvasVisibility?.(false);
    };
    if (!nextAvatar) {
      traceState('none', { presentationMode: 'camera' });
      clearMountedRuntime();
      b.setThumbnail?.(null);
      statusRef.lastAvatarUrl = null;
      statusRef.lastGlbLoadStatus = 'idle';
      b.updateOverlayDiagnostics?.({ avatarModelLoaded: false, avatarModelMounted: false, avatarModelVisible: false, avatarOverlayRenderAttempted: false, avatarOverlayRenderOk: null, avatarOverlayRenderError: null });
      b.setAssetStatus?.('No avatar saved.', true);
      b.setRuntimeStatus?.('No avatar metadata loaded.', true);
      b.setCreateButtonLabel?.('🧍 Create Avatar');
      return false;
    }
    try {
      traceState('profile_ready', { presentationMode: b.getRenderMode?.() || 'camera' });
      b.setAssetStatus?.(`Avatar metadata saved (${nextAvatar.avatarProvider}, ${source}).`);
      b.setRuntimeStatus?.('Metadata accepted. Probing GLB runtime availability…');
      if (nextAvatar.avatarThumbnailUrl) await b.setThumbnail?.(nextAvatar.avatarThumbnailUrl);
      else b.setThumbnail?.(null);
      statusRef.lastAvatarUrl = nextAvatar.avatarModelUrl;
      statusRef.lastGlbLoadStatus = 'probe_started';
      const runtimeStatus = await b.probeAvatarModelRuntime?.(nextAvatar.avatarModelUrl);
      if (runtimeStatus?.assetMissing) {
        b.clearProfileAvatar?.();
        b.clearModelUrlInput?.();
        b.setAssetStatus?.('Saved avatar URL returned 404. Cleared stale avatar reference.', true);
        b.setRuntimeStatus?.('Stale avatar cleared. Upload or save a new .glb avatar.', true);
        throw runtimeStatus.loadError || new Error('avatar_asset_missing');
      }
      if (!runtimeStatus?.assetFound || !runtimeStatus?.runtimeLoaded) {
        b.setAssetStatus?.('Avatar asset probe failed.', true);
        throw runtimeStatus?.loadError || new Error('avatar_runtime_probe_failed');
      }
      b.setRuntimeStatus?.('GLB detected. Booting Three.js runtime…');
      const mountInfo = await b.mountAvatarGlbModel?.(nextAvatar.avatarModelUrl, runtimeStatus.arrayBuffer);
      traceState('mounted', { presentationMode: b.getRenderMode?.() || 'camera' });
      runtimeStatus.renderSucceeded = true;
      runtimeStatus.motionRetargeted = false;
      runtimeStatus.mappedBones = mountInfo?.mappedBones || [];
      b.setActiveAvatarAsset?.({ ...nextAvatar, runtimeStatus });
      // Mounting a model is not activation from the member's perspective. A
      // canonical saved avatar must also select an avatar presentation mode;
      // otherwise both mobile (which boots in camera mode) and a fresh desktop
      // browser can successfully load the GLB while continuing to show only the
      // camera. Keep this callback inside the awaited asset transaction so the
      // upload flow cannot report ACTIVE before the public workout UI agrees.
      const presentationMode = await b.activatePresentation?.({ source, avatar: nextAvatar });
      if (presentationMode !== 'camera' && presentationMode !== 'avatar_overlay' && presentationMode !== 'avatar_only') {
        throw new Error('avatar_presentation_not_activated');
      }
      runtimeStatus.presentationMode = presentationMode;
      const environment = b.inspectPresentationEnvironment?.() || {};
      if (presentationMode === 'camera') {
        // A deliberate camera preference keeps the asset mounted, but it is not
        // an active avatar presentation.
        traceState('mounted', { presentationMode, presentationRequestedMode: 'camera', presentationAppliedMode: 'camera', avatarPresentationState: 'NONE', ...environment });
      } else {
        const accepted = environment.avatarRootMounted !== false && environment.avatarRootInActiveScene !== false &&
          environment.avatarRootVisible !== false && environment.avatarCanvasConnected !== false &&
          environment.avatarCanvasVisible !== false && environment.rendererDimensionsValid !== false;
        if (!accepted) throw new Error('avatar_presentation_environment_not_visible');
        traceState('mounted', { presentationMode, presentationRequestedMode: presentationMode, presentationAppliedMode: presentationMode,
          avatarPresentationState: 'NONE', retargetState: 'ARMED', ...environment });
      }
      b.setAssetStatus?.(`Avatar asset found (${nextAvatar.avatarProvider}, ${source}).`);
      b.setRuntimeStatus?.(`3D avatar loaded. Rig-puppet retargeting armed (mapped bones: ${(mountInfo?.mappedBones || []).join(', ') || 'none'}).`);
      update({ savedAvatarRestoreCompleted: true, savedAvatarRestoreFailure: 'NONE' });
      b.setCreateButtonLabel?.('🧍 Change Avatar');
      return true;
    } catch (err) {
      update({ savedAvatarRestoreCompleted: false, savedAvatarRestoreFailure: String(err?.message || err || 'avatar_load_failed') });
      const failedAfterMount = statusRef.avatarAssetState === 'MOUNTED';
      traceState('failed', { presentationMode: 'camera', presentationAppliedMode: 'camera',
        avatarAssetState: failedAfterMount ? 'MOUNTED' : 'FAILED', avatarPresentationState: 'FAILED',
        presentationError: String(err?.message || err || 'avatar_load_failed') });
      console.warn('avatar load failed', err);
      if (failedAfterMount) b.setCanvasVisibility?.(false);
      else clearMountedRuntime();
      b.setThumbnail?.(null);
      b.updateOverlayDiagnostics?.({ avatarModelLoaded: false, avatarModelMounted: false, avatarModelVisible: false, avatarOverlayRenderOk: false, avatarOverlayRenderError: String(err?.message || err || 'avatar_load_failed') });
      b.ensureAssetProbeFailedStatus?.();
      const errMsg = String(err?.message || '');
      if (errMsg.includes('avatar_three_runtime_unavailable')) {
        b.setAssetStatus?.('Avatar asset found but 3D runtime not loaded.', true);
        b.setRuntimeStatus?.(`3D runtime not loaded (${status().failedReason || errMsg || 'unknown'}).`, true);
        setFailure(errMsg || 'avatar_three_runtime_unavailable', { source });
      } else {
        b.setRuntimeStatus?.('Using procedural fallback (3D avatar load failed).', true);
      }
      b.fallbackRenderModeToCamera?.('Saved avatar failed to load.', err);
      return false;
    }
  }

  globalScope.__ensureAvatarThreeModules = ensureThreeModules;
  globalScope.__retryAvatarRuntime = async function retryAvatarRuntimeFromExtractedRuntime() {
    modulePromise = null;
    await ensureThreeModules();
    return { ok: Boolean(globalScope.__AVATAR_THREE?.ready) };
  };

  globalScope.AvatarRuntime = {
    openModal,
    getStatus: status,
    updateStatus: update,
    setFailure,
    ensureThreeModules,
    bindControls,
    openModal,
    closeModal,
    saveFromInputs,
    uploadFile,
    handlePosePacket,
    subscribeToPoseRuntime,
    bindPoseFrameRenderer,
    registerPoseRenderer,
    bindCanvasController,
    setCanvasVisibility,
    resizeCanvasRuntime,
    configureRenderEngine,
    renderAvatar3d,
    refreshRuntimeProof,
    runManualRuntimeTest,
    applyPoseToAvatarRig,
    configureAssetPipeline,
    loadAvatarAssetForCurrentUser,
    getCurrentPresentationState: () => {
      const current = status();
      return {
        ...current,
        savedAvatarState: current.savedAvatarState,
        savedAvatarSource: current.savedAvatarSource,
        presentationMode: current.presentationMode,
        presentationGeneration: current.presentationGeneration,
        presentationRequested: current.presentationRequested,
        presentationApplied: current.presentationApplied,
        avatarAssetState: current.avatarAssetState,
        avatarAssetGeneration: current.avatarAssetGeneration,
        avatarPresentationState: current.avatarPresentationState,
        presentationRequestedMode: current.presentationRequestedMode,
        presentationAppliedMode: current.presentationAppliedMode,
        avatarRootMounted: current.avatarRootMounted,
        avatarRootInActiveScene: current.avatarRootInActiveScene,
        avatarRootVisible: current.avatarRootVisible,
        avatarCanvasConnected: current.avatarCanvasConnected,
        avatarCanvasVisible: current.avatarCanvasVisible,
        rendererDimensions: current.rendererDimensions,
        rendererPresent: current.rendererPresent,
        cameraPresent: current.cameraPresent,
        scenePresent: current.scenePresent,
        renderLoopRunning: current.renderLoopRunning,
        presentationUpdatedAt: current.presentationUpdatedAt
      };
    },
    subscribePresentation(listener, { replay = true } = {}) {
      if (typeof listener !== 'function') return () => {};
      const handler = event => listener(event.detail || {});
      globalScope.addEventListener?.('avatar-runtime:presentation-state', handler);
      if (replay) listener(this.getCurrentPresentationState());
      return () => globalScope.removeEventListener?.('avatar-runtime:presentation-state', handler);
    }
  };

  subscribeToPoseRuntime();
  console.log('[AVATAR_RUNTIME] extracted runtime loaded (Three lazy)');
})(window);
