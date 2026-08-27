(function workoutPresentationState(global) {
  'use strict';

  const state = {
    canonicalAvatarPresent: false,
    canonicalProfileState: 'loading',
    presentationState: 'none',
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
    avatarPresentationGeneration: 0
  };
  let deps = {};
  let subscribed = false;

  function avatarFrom(profile) {
    const url = profile?.avatar?.avatarModelUrl || profile?.avatar?.modelUrl;
    return typeof url === 'string' && url.trim() ? { url: url.trim() } : null;
  }

  function snapshot() {
    return { ...state };
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
      avatarDiagRuntimeGeneration: state.avatarRuntimeStatusGeneration,
      avatarDiagPresentationGeneration: state.avatarPresentationGeneration,
      avatarDiagAssetState: runtime.avatarAssetState || 'NONE',
      avatarDiagAssetGeneration: runtime.avatarAssetGeneration || 0,
      avatarDiagRootMounted: runtime.avatarRootMounted ? 'YES' : 'NO',
      avatarDiagRootScene: runtime.avatarRootInActiveScene ? 'YES' : 'NO',
      avatarDiagRootVisible: runtime.avatarRootVisible ? 'YES' : 'NO',
      avatarDiagRequestedMode: runtime.presentationRequestedMode || 'camera',
      avatarDiagPresentationAppliedMode: runtime.presentationAppliedMode || state.appliedRenderMode,
      avatarDiagRenderOwnerMode: render.currentMode || deps.getRenderMode?.() || state.appliedRenderMode,
      avatarDiagDesktopSelector: render.desktopSelectorValue || 'unavailable',
      avatarDiagMobileSelector: render.mobileSelectorValue || 'unavailable',
      avatarDiagPreferenceSource: render.preferenceSource || 'default',
      avatarDiagCameraExplicit: render.cameraExplicit ? 'EXPLICIT' : 'DEFAULT',
      avatarDiagCanvasConnected: runtime.avatarCanvasConnected ? 'YES' : 'NO',
      avatarDiagCanvasVisible: runtime.avatarCanvasVisible ? 'YES' : 'NO',
      avatarDiagRendererDimensions: runtime.rendererDimensions || '0x0',
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
    if (!state.canonicalAvatarPresent) {
      state.presentationState = 'none';
      state.appliedRenderMode = 'camera';
      deps.applyRenderMode?.('camera', { persist: false, source: 'canonical_profile_no_avatar' });
    }
    projectAvatarLabel();
    return publish();
  }

  function consumePresentation(detail = {}) {
    const next = String(detail.avatarPresentationState || detail.savedAvatarState || 'none').toLowerCase();
    state.presentationEventLastReceived = next;
    state.presentationState = next;
    state.avatarPresentationGeneration = Number(detail.presentationGeneration || state.avatarPresentationGeneration || 0);
    state.avatarRuntimeStatusGeneration = Number(detail.runtimeStatusGeneration || global.__avatarRuntimeStatus?.runtimeStatusGeneration || 0);
    if (detail.avatarAssetState === 'MOUNTED' || next === 'profile_ready' || next === 'requested' || next === 'mounted' || next === 'active') state.canonicalAvatarPresent = true;
    if (next === 'none' && detail.avatarAssetState !== 'MOUNTED') state.canonicalAvatarPresent = false;
    if (next === 'active' && (detail.presentationMode === 'avatar_overlay' || detail.presentationMode === 'avatar_only')) {
      state.appliedRenderMode = deps.applyRenderMode?.(detail.presentationMode, {
        persist: true,
        source: 'avatar_runtime_presentation_state'
      }) || detail.presentationMode;
    } else if (next === 'none' || next === 'failed') {
      state.appliedRenderMode = 'camera';
    } else {
      state.appliedRenderMode = deps.getRenderMode?.() || state.appliedRenderMode;
    }
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
    // Events are not replayable. Always read both canonical stores immediately,
    // then subscribe for future transitions.
    const profile = global.AppHydrationRuntime?.getCanonicalProfile?.() || deps.getProfile?.();
    if (profile) setCanonicalProfile(profile, 'ready', global.AppHydrationRuntime?.getState?.() || {});
    const runtime = global.AvatarRuntime?.getCurrentPresentationState?.() || deps.getAvatarRuntimeState?.() || global.__avatarRuntimeStatus;
    if (runtime?.savedAvatarState) consumePresentation({
      ...runtime
    });
    return publish();
  }

  global.WorkoutPresentationState = { configure, setCanonicalProfile, consumePresentation, setSyncState, getState: snapshot };
  publish();
})(window);
