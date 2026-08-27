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
    presentationEventLastReceived: 'none'
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
    global.__workoutPresentationDiagnostics = snapshot();
    const fields = {
      avatarDiagCanonicalUrl: state.canonicalAvatarPresent ? 'YES' : 'NO',
      avatarDiagCanonicalProfile: state.canonicalProfileState.toUpperCase(),
      avatarDiagPresentation: state.presentationState,
      avatarDiagAppliedMode: state.appliedRenderMode,
      avatarDiagVisibleLabel: state.visibleAvatarLabelState,
      avatarDiagProfilePanel: state.profilePanelState,
      avatarDiagSyncState: state.syncState,
      avatarDiagPresentationEvent: state.presentationEventLastReceived
    };
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

  function setCanonicalProfile(profile, status = 'ready') {
    state.canonicalProfileState = status;
    state.profilePanelState = status;
    state.canonicalAvatarPresent = Boolean(avatarFrom(profile));
    if (!state.canonicalAvatarPresent) {
      state.presentationState = 'none';
      state.appliedRenderMode = 'camera';
      deps.applyRenderMode?.('camera', { persist: false, source: 'canonical_profile_no_avatar' });
    }
    projectAvatarLabel();
    return publish();
  }

  function consumePresentation(detail = {}) {
    const next = String(detail.savedAvatarState || 'none');
    state.presentationEventLastReceived = next;
    state.presentationState = next;
    if (next === 'profile_ready' || next === 'mounted' || next === 'active') state.canonicalAvatarPresent = true;
    if (next === 'none') state.canonicalAvatarPresent = false;
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
      global.addEventListener?.('avatar-runtime:presentation-state', (event) => consumePresentation(event.detail || {}));
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
    const profile = deps.getProfile?.();
    if (profile) setCanonicalProfile(profile, 'ready');
    const runtime = deps.getAvatarRuntimeState?.() || global.__avatarRuntimeStatus;
    if (runtime?.savedAvatarState) consumePresentation({
      savedAvatarState: runtime.savedAvatarState,
      presentationMode: runtime.presentationMode
    });
    return publish();
  }

  global.WorkoutPresentationState = { configure, setCanonicalProfile, consumePresentation, setSyncState, getState: snapshot };
  publish();
})(window);
