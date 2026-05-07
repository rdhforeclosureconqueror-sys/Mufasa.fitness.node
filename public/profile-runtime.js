(function profileRuntime(global) {
  'use strict';

  function profileElements() {
    return {
      profileSummaryEl: global.document.getElementById('profileSummary'),
      userInfoBar: global.document.getElementById('userInfoBar'),
      userPicEl: global.document.getElementById('userPic'),
      userNameEl: global.document.getElementById('userName')
    };
  }

  function renderSignedInProfile(profile) {
    const { profileSummaryEl, userInfoBar, userPicEl, userNameEl } = profileElements();
    if (!profileSummaryEl || !userInfoBar || !userPicEl || !userNameEl) return;

    userInfoBar.style.display = 'flex';
    userPicEl.src = profile.picture || 'https://i.imgur.com/9z3s8Gh.png';
    userNameEl.textContent = profile.name || 'User';

    const injuries = Array.isArray(profile.injuries) && profile.injuries.length ? profile.injuries.join(', ') : 'None listed';
    const goalText = profile.goals && profile.goals.primary ? profile.goals.primary : 'Build strength and mobility';
    const signedInUser = global.APP_AUTH?.user || {};
    const signedInLabel = signedInUser.email || profile.email || profile.name || 'User';

    profileSummaryEl.innerHTML =
      `<strong>Signed in as ${signedInLabel}</strong><br/>` +
      (profile.age ? `Age: ${profile.age}<br/>` : '') +
      (profile.height ? `Height: ${profile.height}<br/>` : '') +
      (profile.weight_lbs ? `Weight: ${profile.weight_lbs} lb<br/>` : '') +
      `Goal: ${goalText}<br/>` +
      `Injuries: ${injuries}`;
  }

  function setProfileSummary(text) {
    const { profileSummaryEl } = profileElements();
    if (profileSummaryEl) profileSummaryEl.textContent = text;
  }

  async function hydrateProfileFromBackend() {
    if (!global.BACKEND_READ_CLIENT) return false;

    if (global.APP_AUTH?.isAuthenticated !== true) {
      setProfileSummary('Not signed in yet.');
      return false;
    }

    setProfileSummary('Loading profile...');
    try {
      const result = await global.BACKEND_READ_CLIENT.fetchProfile();
      if (!result?.profile) {
        const fallbackUser = global.APP_AUTH?.user || {};
        renderSignedInProfile({
          ...(global.USER_PROFILE || {}),
          ...fallbackUser,
          name: fallbackUser.name || fallbackUser.email || 'Signed-in user'
        });
        return false;
      }

      global.USER_PROFILE = global.BACKEND_READ_CLIENT.normalizeProfile(result.profile, global.USER_PROFILE || {});
      global.USER_PROFILE.name = global.USER_PROFILE.name || 'Athlete';
      renderSignedInProfile(global.USER_PROFILE);

      global.bootStatus.appRuntimeStarted = true;
      queueMicrotask(() => {
        global.loadAvatarAssetForCurrentUser('backend_profile').catch((error) => {
          console.warn('[avatar-load] deferred backend profile avatar load failed', error);
        });
      });
      global.persistUser();
      global.backendTruthState.profileRead = { mode: 'ok', message: 'Profile loaded from backend.' };
      global.bootStatus.appRuntimeStarted = true;
      global.addLog('system', 'Profile synced from backend.');
      global.updateAuthDebug({ lastProfileStatus: '200' });
      global.updateSyncStatus();
      return true;
    } catch (e) {
      const statusText = e?.status ? `Profile fetch failed (${e.status}).` : `Profile fetch failed: ${e?.message || 'Unknown error'}`;
      setProfileSummary(statusText);
      if (e?.code === 'UNAUTHORIZED') {
        global.BACKEND_READ_CLIENT.clearAuthToken();
        global.backendTruthState.profileRead = { mode: 'degraded', message: 'session expired; showing local cached profile.' };
        global.addLog('system', 'Session expired. Profile is now from local cache until you sign in again.');
        global.updateAuthDebug({ lastProfileStatus: String(e?.status || 401) });
        global.updateSyncStatus();
        return false;
      }
      console.warn('backend profile read failed', e);
      global.backendTruthState.profileRead = { mode: 'degraded', message: 'backend profile unavailable; showing local cached profile.' };
      global.addLog('system', 'Backend profile unavailable. Profile is now from local cache.');
      global.updateAuthDebug({ lastProfileStatus: String(e?.status || 'error') });
      global.updateSyncStatus();
      return false;
    }
  }

  global.PROFILE_RUNTIME = {
    renderSignedInProfile,
    setProfileSummary,
    hydrateProfileFromBackend
  };
})(window);
