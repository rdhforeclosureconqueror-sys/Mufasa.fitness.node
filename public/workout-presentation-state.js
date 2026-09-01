(function workoutPresentationState(global) {
  'use strict';

  // SINGLE PRESENTATION AUTHORITY.
  // Change avatar-only background styling here. Other runtimes may report state,
  // but this file owns the final visible camera/avatar presentation.
  const PRESENTATION_CONFIG = Object.freeze({
    storageKey: 'pocketpt.avatarPresentationMode.v2',
    modes: Object.freeze(['camera', 'avatar_overlay', 'avatar_only']),
    backgrounds: Object.freeze({
      camera: '#000000',
      avatar_overlay: 'transparent',
      avatar_only: 'linear-gradient(135deg,#090909 0%,#1b1812 24%,#3f3017 52%,#8b681f 73%,#c6a13a 88%,#17130c 100%)'
    })
  });

  const state = {
    canonicalAvatarPresent: false,
    canonicalProfileState: 'loading',
    presentationState: 'none',
    requestedRenderMode: 'camera',
    appliedRenderMode: 'camera',
    visibleAvatarLabelState: 'none',
    profilePanelState: 'loading',
    syncState: 'checking',
    presentationEventLastReceived: 'none',
    canonicalProfileOwner: 'AppHydrationRuntime',
    hydrationProfileGeneration: 0,
    uiProfileGeneration: 0,
    presentationProfileGeneration: 0,
    uiProfileMatchesHydration: false,
    presentationProfileMatchesHydration: false,
    profileLastUpdatedAt: null,
    avatarRuntimeOwner: 'AvatarRuntime',
    avatarRuntimeStatusGeneration: 0,
    avatarPresentationGeneration: 0,
    authorityGeneration: 0,
    authorityLastSource: 'boot',
    authorityConflictCount: 0,
    backgroundOverride: null
  };

  let deps = {};
  let subscribed = false;
  let observer = null;
  let reassertQueued = false;
  let desktopRenderSelector = null;
  let mobileRenderSelector = null;

  function avatarFrom(profile) {
    const url = profile?.avatar?.avatarModelUrl || profile?.avatar?.modelUrl;
    return typeof url === 'string' && url.trim() ? { url: url.trim() } : null;
  }

  function normalizeMode(mode) {
    const next = String(mode || '').trim().toLowerCase();
    return PRESENTATION_CONFIG.modes.includes(next) ? next : 'camera';
  }

  function snapshot() {
    return { ...state };
  }

  function presentationElements() {
    const root = global.document?.getElementById?.('workoutPresentation') || null;
    return {
      root,
      video: global.document?.getElementById?.('video') || root?.querySelector?.('video') || null,
      overlay: global.document?.getElementById?.('overlay') || null,
      avatar: global.document?.getElementById?.('avatar3d') || null
    };
  }

  function setImportant(el, property, value) {
    el?.style?.setProperty?.(property, value, 'important');
  }

  function currentBackground(mode) {
    return state.backgroundOverride || PRESENTATION_CONFIG.backgrounds[mode] || '#000000';
  }

  function enforceDom(mode = state.requestedRenderMode) {
    const next = normalizeMode(mode);
    const { root, video, overlay, avatar } = presentationElements();
    if (!root) return next;

    root.dataset.avatarPresentation = next;
    root.dataset.avatarPresentationOwner = 'WorkoutPresentationState';
    setImportant(root, 'background', currentBackground(next));

    // Keep the video element mounted in every mode so MoveNet capture is never
    // destroyed by a presentation choice. Visibility alone controls what users see.
    setImportant(video, 'display', 'block');
    setImportant(video, 'visibility', next === 'avatar_only' ? 'hidden' : 'visible');

    // Pose/debug overlay follows the camera surface. Avatar-only is intentionally clean.
    setImportant(overlay, 'display', 'block');
    setImportant(overlay, 'visibility', next === 'avatar_only' ? 'hidden' : 'visible');

    // The avatar canvas is visible only for the two avatar modes.
    setImportant(avatar, 'display', next === 'camera' ? 'none' : 'block');
    setImportant(avatar, 'visibility', next === 'camera' ? 'hidden' : 'visible');

    if (desktopRenderSelector && desktopRenderSelector.value !== next) desktopRenderSelector.value = next;
    if (mobileRenderSelector && mobileRenderSelector.value !== next) mobileRenderSelector.value = next;
    // These writes already restore the authoritative presentation. Consuming
    // their records prevents an endless observer -> microtask -> write loop
    // that can starve DOMContentLoaded and the movement capture UI.
    observer?.takeRecords();
    return next;
  }

  function persistMode(mode) {
    try { global.localStorage?.setItem?.(PRESENTATION_CONFIG.storageKey, mode); } catch (_error) {}
  }

  function storedMode() {
    try { return normalizeMode(global.localStorage?.getItem?.(PRESENTATION_CONFIG.storageKey)); } catch (_error) { return 'camera'; }
  }

  function setPresentationMode(mode, options = {}) {
    const next = normalizeMode(mode);
    state.requestedRenderMode = next;
    state.appliedRenderMode = next;
    state.authorityGeneration += 1;
    state.authorityLastSource = options.source || 'authority';

    // Existing render machinery still gets notified for backward compatibility,
    // but its DOM result is not authoritative. We re-project immediately after it.
    try {
      deps.applyRenderMode?.(next, {
        persist: false,
        source: `presentation_authority:${state.authorityLastSource}`
      });
    } catch (_error) {}

    enforceDom(next);
    if (options.persist !== false) persistMode(next);
    global.dispatchEvent?.(new CustomEvent('pocketpt:avatar-presentation-changed', {
      detail: { mode: next, source: state.authorityLastSource, generation: state.authorityGeneration }
    }));
    publish();
    return next;
  }

  function setBackground(background, options = {}) {
    state.backgroundOverride = typeof background === 'string' && background.trim() ? background.trim() : null;
    enforceDom();
    if (options.publish !== false) publish();
    return state.backgroundOverride;
  }

  function queueReassert(source = 'mutation') {
    if (reassertQueued) return;
    reassertQueued = true;
    global.queueMicrotask?.(() => {
      reassertQueued = false;
      const { root } = presentationElements();
      if (!root) return;
      const observed = normalizeMode(root.dataset.avatarPresentation);
      if (observed !== state.requestedRenderMode || root.dataset.avatarPresentationOwner !== 'WorkoutPresentationState') {
        state.authorityConflictCount += 1;
        state.authorityLastSource = `override:${source}`;
      }
      enforceDom(state.requestedRenderMode);
    });
  }

  function installAuthorityObserver() {
    if (observer || !global.MutationObserver) return;
    const { root, video, overlay, avatar } = presentationElements();
    if (!root) return;
    observer = new MutationObserver(() => queueReassert('dom_mutation'));
    observer.observe(root, { attributes: true, attributeFilter: ['data-avatar-presentation', 'style'] });
    [video, overlay, avatar].filter(Boolean).forEach((el) => observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] }));
  }

  function publish() {
    const runtime = global.AvatarRuntime?.getCurrentPresentationState?.() || global.__avatarRuntimeStatus || {};
    const render = deps.getRenderDiagnostics?.() || {};
    global.__workoutPresentationDiagnostics = snapshot();
    const fields = {
      avatarDiagCanonicalUrl: state.canonicalAvatarPresent ? 'YES' : 'NO',
      avatarDiagCanonicalProfile: state.canonicalProfileState.toUpperCase(),
      avatarDiagPresentation: state.presentationState,
      avatarDiagAppliedMode: state.appliedRenderMode,
      avatarDiagVisibleLabel: state.visibleAvatarLabelState,
      avatarDiagProfilePanel: state.profilePanelState,
      avatarDiagSyncState: state.syncState,
      avatarDiagPresentationEvent: state.presentationEventLastReceived,
      avatarDiagProfileOwner: state.canonicalProfileOwner,
      avatarDiagProfileGeneration: state.hydrationProfileGeneration,
      avatarDiagUiIdentity: state.uiProfileMatchesHydration ? 'YES' : 'NO',
      avatarDiagPresentationIdentity: state.presentationProfileMatchesHydration ? 'YES' : 'NO',
      avatarDiagProfileUpdated: state.profileLastUpdatedAt || 'none',
      avatarDiagRuntimeOwner: state.avatarRuntimeOwner,
      avatarDiagRuntimeInstance: runtime.runtimeInstanceId || 'none',
      avatarDiagManualRuntimeInstance: runtime.manualControlRuntimeInstanceId || 'none',
      avatarDiagThreeOwnerInstance: runtime.threeOwnerInstanceId || 'none',
      avatarDiagPresentationRuntimeInstance: runtime.presentationRuntimeInstanceId || 'none',
      avatarDiagRuntimeGeneration: state.avatarRuntimeStatusGeneration,
      avatarDiagRuntimeInitialized: runtime.avatarRuntimeInitialized ? 'YES' : 'NO',
      avatarDiagRuntimeConfigured: runtime.avatarRuntimeConfigured ? 'YES' : 'NO',
      avatarDiagCanonicalObserved: runtime.canonicalAvatarObserved ? 'YES' : 'NO',
      avatarDiagLoadRequested: runtime.avatarLoadRequested ? 'YES' : 'NO',
      avatarDiagLoadRequestSource: runtime.avatarLoadRequestSource || 'none',
      avatarDiagLoadRequestGeneration: runtime.avatarLoadRequestGeneration || 0,
      avatarDiagLoadSkippedReason: runtime.avatarLoadSkippedReason || 'NONE',
      avatarDiagLoadEntered: runtime.avatarLoadFunctionEntered ? 'YES' : 'NO',
      avatarDiagLoadUrlPresent: runtime.avatarLoadUrlPresent ? 'YES' : 'NO',
      avatarDiagLoadUrlCanonical: runtime.avatarLoadUrlMatchesCanonical ? 'YES' : 'NO',
      avatarDiagEnvironmentConfigured: runtime.avatarEnvironmentConfigured ? 'YES' : 'NO',
      avatarDiagSceneAvailable: runtime.sceneAvailable ? 'YES' : 'NO',
      avatarDiagCameraAvailable: runtime.cameraAvailable ? 'YES' : 'NO',
      avatarDiagRendererAvailable: runtime.rendererAvailable ? 'YES' : 'NO',
      avatarDiagCanvasFound: runtime.avatarCanvasElementFound ? 'YES' : 'NO',
      avatarDiagRenderLoopInitialized: runtime.renderLoopInitialized ? 'YES' : 'NO',
      avatarDiagLifecycleStage: runtime.avatarLifecycleStage || 'NOT INITIALIZED',
      avatarDiagPresentationGeneration: state.avatarPresentationGeneration,
      avatarDiagAssetState: runtime.avatarAssetState || 'NONE',
      avatarDiagAssetGeneration: runtime.avatarAssetGeneration || 0,
      avatarDiagRootMounted: runtime.avatarRootMounted ? 'YES' : 'NO',
      avatarDiagRootScene: runtime.avatarRootInActiveScene ? 'YES' : 'NO',
      avatarDiagRootVisible: runtime.avatarRootVisible ? 'YES' : 'NO',
      avatarDiagRequestedMode: state.requestedRenderMode,
      avatarDiagPresentationAppliedMode: state.appliedRenderMode,
      avatarDiagRenderOwnerMode: 'WorkoutPresentationState',
      avatarDiagDesktopSelector: render.desktopSelectorValue || 'unavailable',
      avatarDiagMobileSelector: render.mobileSelectorValue || 'unavailable',
      avatarDiagPreferenceSource: render.preferenceSource || 'default',
      avatarDiagCameraExplicit: render.cameraExplicit ? 'EXPLICIT' : 'DEFAULT',
      avatarDiagVisibleSelectorId: render.visibleSelectorId || 'unavailable',
      avatarDiagVisibleSelectorValue: render.visibleSelectorValue || 'unavailable',
      avatarDiagAuthoritativeSelectorId: render.authoritativeSelectorId || 'WorkoutPresentationState',
      avatarDiagAuthoritativeSelectorValue: state.requestedRenderMode,
      avatarDiagSelectorIdentity: 'YES',
      avatarDiagSelectorChangeReceived: render.selectorChangeLastReceived || 'none',
      avatarDiagSelectorChangeSource: state.authorityLastSource,
      avatarDiagCanvasConnected: runtime.avatarCanvasConnected ? 'YES' : 'NO',
      avatarDiagCanvasVisible: runtime.avatarCanvasVisible ? 'YES' : 'NO',
      avatarDiagRendererDimensions: runtime.rendererDimensions || '0x0',
      avatarDiagRootUuid: runtime.avatarRootUuid || 'none',
      avatarDiagSceneUuid: runtime.sceneUuid || 'none',
      avatarDiagRootIdentity: runtime.avatarParentIsActiveScene ? 'YES' : 'NO',
      avatarDiagRigCounts: `${runtime.skinnedMeshCount || 0} / ${runtime.skeletonBoneCount || 0}`,
      avatarDiagMappedBones: runtime.mappedBoneCount || 0,
      avatarDiagPoseFrames: runtime.posePacketsReceived || 0,
      avatarDiagRetargetFrames: runtime.retargetFramesExecuted || 0,
      avatarDiagBonesChanged: runtime.bonesChangedLastFrame || 0,
      avatarDiagRenderProof: `${runtime.renderFrames || 0} / ${runtime.lastRenderAgeMs == null ? 'unavailable' : `${runtime.lastRenderAgeMs}ms`}`,
      avatarDiagCanvasProof: `${runtime.canvasCssSize || '0x0'} / ${runtime.canvasBufferSize || '0x0'}`,
      avatarDiagRendererProof: `${runtime.rendererType || 'none'} / ${runtime.rendererDpr || 0}`,
      avatarDiagCameraProof: `${runtime.cameraType || 'none'}${runtime.cameraFov == null ? '' : ` fov=${runtime.cameraFov}`}`,
      avatarDiagLights: runtime.activeLights?.join(', ') || 'none',
      avatarDiagMaterials: `${runtime.materialCount || 0} / ${runtime.textureCount || 0}`,
      avatarDiagTerminalStates: `${runtime.avatarAssetState || 'NONE'} / ${runtime.environmentState || 'NOT_CONFIGURED'} / ${runtime.retargetState || 'NOT_STARTED'} / ${runtime.renderLoopState || 'STOPPED'}`,
      avatarDiagRuntimePresentation: runtime.presentationState || 'NONE',
      avatarDiagWorkoutAvatarState: state.visibleAvatarLabelState,
      avatarDiagWorkoutRenderState: state.appliedRenderMode,
      avatarDiagHydrationResponse: global.AppHydrationRuntime?.getState?.().profileResponseReceived ? 'YES' : 'NO',
      avatarDiagNormalization: global.AppHydrationRuntime?.getState?.().profileNormalizationComplete ? 'YES' : 'NO'
    };
    const handoff = global.AppHydrationRuntime?.getState?.().postSaveReload || {};
    Object.assign(fields, {
      avatarDiagPostSaveOwner: handoff.owner || 'none',
      avatarDiagPostSaveReceived: handoff.profileReceived ? 'YES' : 'NO',
      avatarDiagPostSaveNormalized: handoff.profileNormalized ? 'YES' : 'NO',
      avatarDiagPostSaveAdoption: handoff.canonicalAdoptionAttempted ? 'YES' : 'NO',
      avatarDiagPostSaveGenerationBefore: handoff.generationBefore || 0,
      avatarDiagPostSaveGenerationAfter: handoff.generationAfter || 0,
      avatarDiagPostSaveIdentity: handoff.profileMatchesCanonical ? 'YES' : 'NO',
      avatarDiagPostSaveEventDispatched: handoff.canonicalProfileEventDispatched ? 'YES' : 'NO',
      avatarDiagPostSaveEventPresentation: handoff.eventConsumers?.includes('WorkoutPresentationState') ? 'YES' : 'NO'
    });
    Object.entries(fields).forEach(([id, value]) => {
      const el = global.document?.getElementById?.(id);
      if (el) el.textContent = String(value);
    });
    return snapshot();
  }

  function projectAvatarLabel() {
    const saved = state.canonicalAvatarPresent && state.presentationState !== 'failed';
    state.visibleAvatarLabelState = saved ? 'saved' : 'none';
    deps.setAvatarLabel?.(saved ? 'Avatar saved.' : 'No avatar saved.', !saved);
  }

  function setCanonicalProfile(profile, status = 'ready', metadata = {}) {
    state.canonicalProfileState = status;
    state.profilePanelState = status;
    state.canonicalAvatarPresent = Boolean(avatarFrom(profile));
    state.hydrationProfileGeneration = Number(metadata.generation || global.AppHydrationRuntime?.getState?.().profileGeneration || 0);
    state.presentationProfileGeneration = state.hydrationProfileGeneration;
    state.uiProfileGeneration = deps.getProfile?.() === profile ? state.hydrationProfileGeneration : 0;
    state.uiProfileMatchesHydration = deps.getProfile?.() === profile;
    state.presentationProfileMatchesHydration = global.AppHydrationRuntime?.getCanonicalProfile?.() === profile;
    state.profileLastUpdatedAt = metadata.updatedAt || global.AppHydrationRuntime?.getState?.().profileLastUpdatedAt || null;
    global.AppHydrationRuntime?.acknowledgeCanonicalProfileEvent?.(state.hydrationProfileGeneration, 'WorkoutPresentationState');
    if (!state.canonicalAvatarPresent && state.requestedRenderMode !== 'camera') {
      // Preserve the user's requested avatar mode while the asset/profile catches up.
      // Do not let a late profile event silently overwrite their mode choice.
      enforceDom(state.requestedRenderMode);
    }
    projectAvatarLabel();
    return publish();
  }

  function consumePresentation(detail = {}) {
    const rawPresentation = String(detail.avatarPresentationState || '').toUpperCase();
    const next = String(rawPresentation && rawPresentation !== 'NONE' ? rawPresentation : (detail.savedAvatarState || 'none')).toLowerCase();
    state.presentationEventLastReceived = next;
    state.presentationState = next;
    state.avatarPresentationGeneration = Number(detail.presentationGeneration || state.avatarPresentationGeneration || 0);
    state.avatarRuntimeStatusGeneration = Number(detail.runtimeStatusGeneration || global.__avatarRuntimeStatus?.runtimeStatusGeneration || 0);
    if (detail.avatarAssetState === 'MOUNTED' || next === 'profile_ready' || next === 'requested' || next === 'mounted' || next === 'active') state.canonicalAvatarPresent = true;
    if (next === 'none' && detail.avatarAssetState !== 'MOUNTED') state.canonicalAvatarPresent = false;

    // Runtime presentation events are informational only. They do not own the visible mode.
    // If no explicit/local preference exists yet, a first active avatar may seed the authority.
    if (state.authorityGeneration === 0 && next === 'active' && PRESENTATION_CONFIG.modes.includes(detail.presentationMode)) {
      state.requestedRenderMode = normalizeMode(detail.presentationMode);
      state.appliedRenderMode = state.requestedRenderMode;
    }
    enforceDom(state.requestedRenderMode);
    projectAvatarLabel();
    return publish();
  }

  function setSyncState(next) {
    state.syncState = ['synced', 'failed'].includes(next) ? next : 'checking';
    return publish();
  }

  function configure(options = {}) {
    deps = { ...deps, ...options };
    if (!subscribed) {
      if (global.AvatarRuntime?.subscribePresentation) global.AvatarRuntime.subscribePresentation(consumePresentation, { replay: true });
      else global.addEventListener?.('avatar-runtime:presentation-state', (event) => consumePresentation(event.detail || {}));
      global.addEventListener?.('app:canonical-profile', (event) => setCanonicalProfile(event.detail?.profile, 'ready', event.detail || {}));
      global.addEventListener?.('avatar-runtime:proof', () => { enforceDom(); publish(); });
      global.addEventListener?.('pocketpt:avatar-presentation-request', (event) => setPresentationMode(event.detail?.mode, { persist: event.detail?.persist !== false, source: event.detail?.source || 'event' }));
      global.addEventListener?.('app:hydration-state', (event) => {
        const status = event.detail?.status;
        if (status === 'error') {
          state.canonicalProfileState = 'failed';
          state.profilePanelState = 'failed';
          publish();
        }
      });
      subscribed = true;
    }

    const profile = global.AppHydrationRuntime?.getCanonicalProfile?.() || deps.getProfile?.();
    if (profile) setCanonicalProfile(profile, 'ready', global.AppHydrationRuntime?.getState?.() || {});
    const runtime = global.AvatarRuntime?.getCurrentPresentationState?.() || deps.getAvatarRuntimeState?.() || global.__avatarRuntimeStatus;
    if (runtime?.savedAvatarState) consumePresentation({ ...runtime });

    const renderCurrent = normalizeMode(deps.getRenderMode?.());
    const saved = storedMode();
    const initial = saved !== 'camera' ? saved : renderCurrent;
    state.requestedRenderMode = initial;
    state.appliedRenderMode = initial;
    enforceDom(initial);
    installAuthorityObserver();
    return publish();
  }

  function bindRenderModeSelectors({ desktopSelector, mobileSelector, applyRenderMode } = {}) {
    if (!desktopSelector || !mobileSelector || typeof applyRenderMode !== 'function') return null;
    desktopRenderSelector = desktopSelector;
    mobileRenderSelector = mobileSelector;
    deps.applyRenderMode = applyRenderMode;
    const handleChange = (event) => {
      const selector = event?.currentTarget || event?.target;
      return setPresentationMode(selector?.value, {
        persist: true,
        source: selector === mobileSelector ? 'mobile_selector' : 'desktop_selector'
      });
    };
    desktopSelector.addEventListener('change', handleChange);
    mobileSelector.addEventListener('change', handleChange);
    enforceDom(state.requestedRenderMode);
    return { handleChange, desktopHandlerAttached: true, mobileHandlerAttached: true };
  }

  global.WorkoutPresentationState = {
    configure,
    setCanonicalProfile,
    consumePresentation,
    setSyncState,
    setPresentationMode,
    setBackground,
    enforce: () => enforceDom(state.requestedRenderMode),
    getConfig: () => PRESENTATION_CONFIG,
    getState: snapshot,
    bindRenderModeSelectors
  };
  publish();
})(window);
