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
    posePacketsReceived: 0,
    lastPosePacketAt: null,
    lastPosePacketSource: null
  };

  globalScope.__THREE_BRIDGE_FIX_ACTIVE = true;
  globalScope.__AVATAR_THREE = globalScope.__AVATAR_THREE || { THREE: null, GLTFLoader: null, source: null, ready: false };
  globalScope.__avatarRuntimeStatus = { ...defaultStatus, ...(globalScope.__avatarRuntimeStatus || {}) };

  let modulePromise = null;
  let controlBindings = null;
  let poseSubscribed = false;
  let legacyPoseRenderer = null;

  function status() {
    const current = globalScope.__avatarRuntimeStatus || {};
    globalScope.__avatarRuntimeStatus = { ...defaultStatus, ...current, avatarThreeGlobalOk: Boolean(globalScope.__AVATAR_THREE) };
    return globalScope.__avatarRuntimeStatus;
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
    if (refs.avatarCreateBtn) refs.avatarCreateBtn.onclick = openModal;
    if (refs.closeAvatarModalBtn) refs.closeAvatarModalBtn.onclick = closeModal;
    if (refs.saveAvatarBtn) refs.saveAvatarBtn.onclick = saveFromInputs;
    if (refs.uploadAvatarBtn) refs.uploadAvatarBtn.onclick = uploadFile;
    if (refs.clearAvatarBtn) refs.clearAvatarBtn.onclick = bindings.clearAvatar || null;
    console.log('[AVATAR_RUNTIME] controls delegated');
  }

  function handlePosePacket(posePacket, source = 'pose-runtime') {
    update({ posePacketsReceived: Number(status().posePacketsReceived || 0) + 1, lastPosePacketAt: new Date().toISOString(), lastPosePacketSource: source });
    if ((status().posePacketsReceived % 120) === 1) console.log('[AVATAR_POSE] pose packet received', { source });
    try {
      if (typeof legacyPoseRenderer === 'function') legacyPoseRenderer(posePacket);
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

  function registerPoseRenderer(renderer) {
    legacyPoseRenderer = typeof renderer === 'function' ? renderer : null;
    subscribeToPoseRuntime();
  }

  globalScope.__ensureAvatarThreeModules = ensureThreeModules;
  globalScope.__retryAvatarRuntime = async function retryAvatarRuntimeFromExtractedRuntime() {
    modulePromise = null;
    await ensureThreeModules();
    return { ok: Boolean(globalScope.__AVATAR_THREE?.ready) };
  };

  globalScope.AvatarRuntime = {
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
    registerPoseRenderer
  };

  subscribeToPoseRuntime();
  console.log('[AVATAR_RUNTIME] extracted runtime loaded (Three lazy)');
})(window);
