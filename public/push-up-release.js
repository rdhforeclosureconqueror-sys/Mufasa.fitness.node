(function installMileleFitPushUpRelease(global) {
  'use strict';

  const BUILD = '20260912-light-signup-v1';
  const AVATURN_URL = 'https://www.avaturn.me/';
  const state = {
    build: BUILD,
    phase: 'BOOT',
    profile: null,
    auth: null,
    avatarReady: false,
    avatar: null,
    firstFailure: null,
    trace: []
  };
  let avatarVerificationVersion = 0;

  const $ = (id) => global.document.getElementById(id);

  function safe(value) {
    return String(value == null ? '' : value)
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REDACTED]')
      .replace(/ticket=[A-Za-z0-9_-]+/gi, 'ticket=[REDACTED]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .slice(0, 260);
  }

  function trace(stage, status, detail = '') {
    const entry = { stage, status, detail: safe(detail), at: new Date().toISOString() };
    state.trace.push(entry);
    if (state.trace.length > 80) state.trace.shift();
    if (status === 'FAIL' && !state.firstFailure) state.firstFailure = entry;
    renderDiagnostics();
    try { global.console?.info?.('[PUSH_UP_RELEASE]', entry); } catch (_) {}
    return entry;
  }

  function renderDiagnostics(force = false) {
    const el = $('releaseAvatarDiagnostics');
    if (!el) return;
    const debug = force || new URLSearchParams(global.location.search).get('debugRelease') === '1' || Boolean(state.firstFailure);
    el.hidden = !debug;
    if (!debug) return;
    const first = state.firstFailure ? `${state.firstFailure.stage} — ${state.firstFailure.detail || state.firstFailure.status}` : 'none';
    el.textContent = [
      `MileleFit Push-Up Release ${BUILD}`,
      `phase: ${state.phase}`,
      `avatar ready: ${state.avatarReady ? 'YES' : 'NO'}`,
      `first failure: ${first}`,
      '',
      ...state.trace.map((entry) => `${entry.status.padEnd(7)} ${entry.stage} — ${entry.detail || ''}`)
    ].join('\n');
  }

  function setStatus(message, mode = '') {
    const el = $('releaseAvatarStatus');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('good', mode === 'good');
    el.classList.toggle('bad', mode === 'bad');
  }

  function setGate(message, ready = false) {
    state.avatarReady = Boolean(ready);
    const status = $('releaseGateStatus');
    const button = $('releaseEnterArenaBtn');
    if (status) status.textContent = message;
    if (button) button.disabled = !ready;
    renderDiagnostics();
  }

  function setError(message = '') {
    const el = $('releaseError');
    if (el) el.textContent = message;
  }

  function canonicalAuthFromReadiness(readiness) {
    const auth = readiness?.auth || global.AuthStateRuntime?.getCanonicalAuthState?.() || null;
    const token = auth?.token || global.AuthStateRuntime?.getAuthToken?.() || null;
    if (!token) return null;
    return { ...(auth || {}), token };
  }

  function loginTarget(mode = 'login') {
    const returnTo = '/push-up.html';
    if (global.AuthNavigation?.loginUrl) {
      const url = global.AuthNavigation.loginUrl(returnTo);
      if (mode === 'register') {
        const parsed = new URL(url, global.location.origin);
        parsed.searchParams.set('mode', 'register');
        return `${parsed.pathname}${parsed.search}`;
      }
      return url;
    }
    const target = new URL('/login.html', global.location.origin);
    target.searchParams.set('returnTo', returnTo);
    if (mode === 'register') target.searchParams.set('mode', 'register');
    return `${target.pathname}${target.search}`;
  }

  function backendOrigin() {
    const candidate = global.MaatApiClient?.origin?.()
      || global.RuntimeState?.getEndpoints?.().nodeBaseUrl
      || global.RuntimeState?.getBackendOrigin?.()
      || global.MAAT_BACKEND_ORIGIN
      || global.location.origin;
    try { return new URL(String(candidate), global.location.href).origin; }
    catch (_) { return null; }
  }

  function resolveAssetUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
      if (/^https?:\/\//i.test(raw)) return raw;
      if (typeof global.MaatApiClient?.resolve === 'function') return global.MaatApiClient.resolve(raw);
      const origin = backendOrigin() || global.location.origin;
      return new URL(raw, `${String(origin).replace(/\/$/, '')}/`).href;
    } catch (_) {
      return null;
    }
  }

  function canonicalAvatar(profile = state.profile) {
    const source = profile?.avatar;
    if (!source || typeof source !== 'object') return null;
    const modelUrl = String(source.avatarModelUrl || source.modelUrl || '').trim();
    if (!modelUrl) return null;
    return {
      avatarProvider: source.avatarProvider || source.provider || 'custom',
      avatarModelUrl: modelUrl,
      avatarThumbnailUrl: String(source.avatarThumbnailUrl || source.thumbnailUrl || '').trim() || null,
      avatarUpdatedAt: source.avatarUpdatedAt || source.updatedAt || null
    };
  }

  function arenaAssetId(modelUrl) {
    const raw = String(modelUrl || '').trim();
    const backend = backendOrigin();
    if (!raw || !backend) return null;
    try {
      const relative = raw.startsWith('/') && !raw.startsWith('//');
      const url = new URL(raw, `${backend}/`);
      const allowedOrigins = new Set([backend, global.location.origin]);
      if (url.username || url.password || (!relative && !allowedOrigins.has(url.origin))) return null;
      const match = url.pathname.match(/^\/api\/me\/avatar\/assets\/([a-f0-9-]{16,64})(?:\.glb)?$/i)
        || url.pathname.match(/^\/uploads\/avatars\/([a-f0-9-]{16,64})\.glb$/i);
      return match ? match[1] : null;
    } catch (_) {
      return null;
    }
  }

  function showArenaAvatarUnavailable(reason) {
    const setup = $('releaseAvatarSetup');
    const readyActions = $('releaseAvatarReadyActions');
    const badge = $('releaseAvatarReadyBadge');
    if (setup) setup.hidden = false;
    if (readyActions) readyActions.hidden = true;
    if (badge) badge.hidden = true;
    setStatus('Your saved avatar is attached to your profile, but the Push-Up Arena cannot load that asset. Upload a current .glb before entering.', 'bad');
    setGate('Arena-compatible avatar verification failed. Upload or replace your avatar.', false);
    setError(reason || 'The saved avatar is unavailable to the arena.');
  }

  async function verifyArenaAvatar(authToken, reason = 'profile') {
    const version = avatarVerificationVersion;
    const assetId = arenaAssetId(state.avatar?.avatarModelUrl);
    if (!assetId) {
      showArenaAvatarUnavailable('AVATAR_SOURCE_UNSUPPORTED');
      trace('ARENA_AVATAR_ASSET', 'FAIL', 'AVATAR_SOURCE_UNSUPPORTED');
      return false;
    }

    const origin = backendOrigin();
    const url = `${origin}/api/me/avatar/assets/${encodeURIComponent(assetId)}`;
    setGate('Checking that your saved avatar is available to the Push-Up Arena…', false);
    trace('ARENA_AVATAR_ASSET', 'RUNNING', `HEAD canonical owned avatar (${reason})`);
    try {
      const response = await global.fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        headers: {
          Accept: 'model/gltf-binary',
          authorization: `Bearer ${authToken}`
        }
      });
      if (version !== avatarVerificationVersion) return false;
      if (!response.ok) {
        const code = response.status === 404 ? 'AVATAR_ASSET_UNAVAILABLE' : `AVATAR_ASSET_HTTP_${response.status}`;
        showArenaAvatarUnavailable(code);
        trace('ARENA_AVATAR_ASSET', 'FAIL', code);
        return false;
      }
      const setup = $('releaseAvatarSetup');
      const readyActions = $('releaseAvatarReadyActions');
      const badge = $('releaseAvatarReadyBadge');
      if (setup) setup.hidden = true;
      if (readyActions) readyActions.hidden = false;
      if (badge) badge.hidden = false;
      setStatus('Your saved MileleFit avatar is verified against the arena asset authority and ready.', 'good');
      setGate('Avatar verified. You can enter the Push-Up Arena.', true);
      setError('');
      trace('ARENA_AVATAR_ASSET', 'PASS', 'owned backend GLB is available to the arena');
      return true;
    } catch (error) {
      if (version !== avatarVerificationVersion) return false;
      const code = error?.message || 'AVATAR_ASSET_CHECK_FAILED';
      showArenaAvatarUnavailable(code);
      trace('ARENA_AVATAR_ASSET', 'FAIL', code);
      return false;
    }
  }

  function renderAvatar(profile = state.profile) {
    avatarVerificationVersion += 1;
    state.profile = profile || null;
    state.avatar = canonicalAvatar(profile);
    const present = Boolean(state.avatar?.avatarModelUrl);
    const thumb = $('releaseAvatarThumb');
    const placeholder = $('releaseAvatarPlaceholder');
    const badge = $('releaseAvatarReadyBadge');
    const setup = $('releaseAvatarSetup');
    const readyActions = $('releaseAvatarReadyActions');
    const signedOut = $('releaseSignedOutActions');
    const modelInput = $('releaseAvatarModelUrlInput');
    const thumbInput = $('releaseAvatarThumbUrlInput');

    if (modelInput) modelInput.value = state.avatar?.avatarModelUrl || '';
    if (thumbInput) thumbInput.value = state.avatar?.avatarThumbnailUrl || '';
    if (signedOut) signedOut.hidden = true;
    if (setup) setup.hidden = present;
    if (readyActions) readyActions.hidden = true;
    if (badge) badge.hidden = true;

    const thumbUrl = resolveAssetUrl(state.avatar?.avatarThumbnailUrl);
    if (thumb) {
      thumb.hidden = !thumbUrl;
      if (thumbUrl) thumb.src = thumbUrl;
      else thumb.removeAttribute('src');
    }
    if (placeholder) placeholder.hidden = Boolean(thumbUrl);

    if (present) {
      setStatus('Saved avatar found. Checking arena compatibility…');
      setGate('Verifying the saved avatar with the arena asset authority…', false);
      trace('AVATAR_PROFILE', 'PASS', `canonical avatar present (${state.avatar.avatarProvider || 'custom'})`);
    } else {
      setStatus('No canonical avatar is attached to this account yet. Create or upload one below.');
      setGate('Create or upload your avatar before arena entry.', false);
      trace('AVATAR_PROFILE', 'WAITING', 'canonical avatar missing');
    }
    return present;
  }

  function renderSignedOut() {
    avatarVerificationVersion += 1;
    state.profile = null;
    state.avatar = null;
    state.avatarReady = false;
    $('releaseSignedOutActions').hidden = false;
    $('releaseAvatarSetup').hidden = true;
    $('releaseAvatarReadyActions').hidden = true;
    $('releaseAvatarReadyBadge').hidden = true;
    $('releaseAvatarThumb').hidden = true;
    $('releaseAvatarPlaceholder').hidden = false;
    setStatus('Join with four quick details so MileleFit can create your player and load avatar setup.');
    setGate('Sign in first. Arena access is tied to your MileleFit member profile.', false);
    trace('SIGNUP_FORM', 'WAITING', 'lightweight challenge registration ready');
  }

  function signupError(message = '') {
    const el = $('releaseSignupError');
    if (el) el.textContent = message;
  }

  async function authRequest(route, body) {
    return global.MaatApiClient.request(route, { method: 'POST', body, auth: false });
  }

  async function establishCanonicalAuth(payload) {
    trace('CANONICAL_AUTH', 'RUNNING', 'adopting auth response through AuthStateRuntime');
    const adopted = await global.AuthStateRuntime.persistCanonicalAuthState(
      { token: payload.token, user: payload.user },
      { reason: 'push_up_challenge_signup', rememberMe: false }
    );
    if (!adopted?.ok || !global.AuthStateRuntime.getCanonicalAuthState()?.isAuthenticated) {
      throw Object.assign(new Error('Your account was created, but this browser could not establish the session.'), { signupStage: 'CANONICAL_AUTH' });
    }
    state.auth = global.AuthStateRuntime.getCanonicalAuthState();
    trace('CANONICAL_AUTH', 'PASS', 'canonical member session established');
  }

  async function saveParticipantMetadata(fitnessLevel) {
    trace('PARTICIPANT_METADATA', 'RUNNING', 'saving owner-scoped Push-Up Challenge entry');
    const result = await global.MaatApiClient.request('/api/me/challenge-participants/push_up', {
      method: 'PUT', body: { fitnessLevel }
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.payload?.error?.message || result.payload?.error || 'Challenge details could not be saved.'), { signupStage: 'PARTICIPANT_METADATA' });
    }
    trace('PARTICIPANT_METADATA', 'PASS', 'challenge source and fitness level saved');
  }

  async function submitSignup(event) {
    event.preventDefault();
    const button = $('releaseCreateAccountBtn');
    const original = button.textContent;
    const values = {
      name: $('releaseSignupName').value.trim(),
      email: $('releaseSignupEmail').value.trim(),
      password: $('releaseSignupPassword').value,
      fitnessLevel: $('releaseSignupFitnessLevel').value
    };
    button.disabled = true;
    button.textContent = 'CREATING ACCOUNT…';
    signupError('');
    trace('ACCOUNT_REGISTER', 'RUNNING', 'POST /api/auth/register');
    try {
      let result = await authRequest('/api/auth/register', {
        name: values.name, email: values.email, password: values.password, entryContext: 'push_up_challenge'
      });
      if (result.diagnostics?.status === 409 && result.payload?.code === 'ACCOUNT_EXISTS') {
        trace('ACCOUNT_REGISTER', 'PASS', 'existing account preserved; authenticating supplied credentials');
        result = await authRequest('/api/auth/login', { email: values.email, password: values.password });
        if (!result.ok) {
          const error = new Error('This email already has a MileleFit account. Sign in with your existing password to continue.');
          error.signupStage = 'ACCOUNT_REGISTER';
          error.existingAccount = true;
          throw error;
        }
      } else if (!result.ok) {
        throw Object.assign(new Error(result.payload?.error?.message || result.payload?.error || 'Account registration failed.'), { signupStage: 'ACCOUNT_REGISTER' });
      } else {
        trace('ACCOUNT_REGISTER', 'PASS', 'ACCOUNT_CREATED');
      }
      await establishCanonicalAuth(result.payload);
      await saveParticipantMetadata(values.fitnessLevel);
      trace('RELEASE_REFRESH', 'RUNNING', 'refreshing canonical account and profile');
      await refreshAuthAndAvatar('challenge-signup');
      trace('RELEASE_REFRESH', 'PASS', 'release experience refreshed without intake navigation');
      trace('AVATAR_GATE', 'PASS', state.avatarReady ? 'saved avatar verified' : 'existing avatar setup unlocked');
      $('releaseSignupPassword').value = '';
    } catch (error) {
      trace(error.signupStage || 'ACCOUNT_REGISTER', 'FAIL', error?.message || 'signup failed');
      signupError(error.message);
      if (error.existingAccount) {
        signupError(`${error.message} Use SIGN IN below; you will return to this Push-Up Challenge.`);
      }
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function configureCanonicalRuntimes(authToken) {
    global.AppHydrationRuntime?.configure?.({
      backendReadClient: global.BACKEND_READ_CLIENT,
      getProfile: () => state.profile,
      setProfile: (profile) => { state.profile = profile; global.USER_PROFILE = profile; },
      installAuthListeners: false
    });

    global.ProfileWriteRuntime?.configure?.({
      refs: {
        avatarFileInput: $('releaseAvatarFileInput'),
        avatarModelUrlInput: $('releaseAvatarModelUrlInput'),
        avatarThumbUrlInput: $('releaseAvatarThumbUrlInput'),
        avatarCreationStatusEl: $('releaseAvatarUploadStatus'),
        avatarRuntimeStatusEl: $('releaseAvatarRuntimeStatus'),
        avatarAssetStatusEl: $('releaseAvatarAssetStatus')
      },
      endpoints: {
        nodeBaseUrl: global.MaatApiClient?.origin?.() || global.RuntimeState?.getBackendOrigin?.() || global.MAAT_BACKEND_ORIGIN || global.location.origin
      },
      deps: {
        getProfile: () => state.profile,
        setProfile: (profile) => { state.profile = profile; global.USER_PROFILE = profile; },
        getAuthToken: () => authToken || global.AuthStateRuntime?.getAuthToken?.(),
        isAvatarFeatureEnabled: () => true,
        avatarProviderDefault: 'avaturn',
        persistUser: () => {},
        loadAvatarAssetForCurrentUser: async () => true,
        setAvatarAssetStatus: (message, bad) => {
          const el = $('releaseAvatarAssetStatus');
          if (el) el.textContent = message;
          if (bad) trace('AVATAR_ASSET', 'FAIL', message);
        },
        setAvatarRuntimeStatus: (message, bad) => {
          const el = $('releaseAvatarRuntimeStatus');
          if (el) el.textContent = message;
          if (bad) trace('AVATAR_RUNTIME', 'FAIL', message);
        }
      }
    });
  }

  async function loadCanonicalProfile(authToken, reason = 'initial') {
    state.phase = 'PROFILE_LOADING';
    setStatus('Loading your MileleFit avatar…');
    setGate('Verifying your avatar before arena entry…', false);
    configureCanonicalRuntimes(authToken);
    trace('PROFILE_READ', 'RUNNING', `GET /api/me/profile (${reason})`);
    const result = await global.AppHydrationRuntime?.hydrateProfileFromBackend?.({ authToken });
    if (!result) {
      const last = global.AppHydrationRuntime?.getState?.().lastProfileReload || {};
      const message = last.message || last.code || 'profile_read_failed';
      trace('PROFILE_READ', 'FAIL', message);
      throw new Error(message);
    }
    state.profile = global.AppHydrationRuntime?.getCanonicalProfile?.() || state.profile;
    global.USER_PROFILE = state.profile;
    trace('PROFILE_READ', 'PASS', 'canonical profile adopted');
    const hasAvatar = renderAvatar(state.profile);
    if (hasAvatar) await verifyArenaAvatar(authToken, reason);
    return state.profile;
  }

  async function refreshAuthAndAvatar(reason = 'refresh') {
    state.phase = 'AUTH_CHECK';
    setError('');
    const readiness = await global.AuthStateRuntime?.whenReady?.();
    const auth = canonicalAuthFromReadiness(readiness);
    if (!auth) {
      state.auth = null;
      renderSignedOut();
      return false;
    }
    state.auth = auth;
    trace('AUTH', 'PASS', 'canonical member session restored');
    try {
      await loadCanonicalProfile(auth.token, reason);
      state.phase = state.avatarReady ? 'READY' : 'AVATAR_REQUIRED';
      return state.avatarReady;
    } catch (error) {
      state.phase = 'PROFILE_FAILED';
      setStatus('We could not verify your MileleFit profile. Retry or sign in again.', 'bad');
      setGate('Avatar verification failed. Arena entry remains locked.', false);
      setError(error?.message || 'Profile verification failed.');
      trace('PROFILE_GATE', 'FAIL', error?.message || 'profile verification failed');
      return false;
    }
  }

  async function uploadAvatar() {
    const file = $('releaseAvatarFileInput')?.files?.[0];
    if (!file) {
      $('releaseAvatarUploadStatus').textContent = 'Choose a .glb avatar file first.';
      return;
    }
    if (!state.auth?.token) {
      renderSignedOut();
      return;
    }
    const button = $('releaseUploadAvatarBtn');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Uploading…';
    setError('');
    setGate('Uploading and verifying your avatar…', false);
    trace('AVATAR_UPLOAD', 'RUNNING', `${file.name} · ${file.size} bytes`);
    try {
      configureCanonicalRuntimes(state.auth.token);
      const result = await global.ProfileWriteRuntime?.uploadAvatarFile?.(file);
      if (!result?.ok) throw new Error(result?.reason || 'avatar_upload_failed');
      state.profile = global.AppHydrationRuntime?.getCanonicalProfile?.() || state.profile;
      trace('AVATAR_UPLOAD', 'PASS', 'upload, canonical reload, and profile adoption complete');
      const hasAvatar = renderAvatar(state.profile);
      const verified = hasAvatar && await verifyArenaAvatar(state.auth.token, 'post-upload');
      state.phase = verified ? 'READY' : 'AVATAR_REQUIRED';
    } catch (error) {
      state.phase = 'AVATAR_UPLOAD_FAILED';
      const message = error?.message || 'Avatar upload failed.';
      setStatus('Avatar upload did not complete. The arena remains locked until your profile is verified.', 'bad');
      setGate('Fix the avatar upload and retry before entering the arena.', false);
      setError(message);
      trace('AVATAR_UPLOAD', 'FAIL', error?.code || message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function enterArena() {
    const button = $('releaseEnterArenaBtn');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Verifying player…';
    setError('');
    try {
      const ready = await refreshAuthAndAvatar('pre-arena');
      if (!ready) throw new Error('Your personalized avatar must be verified before arena entry.');
      if (!global.PocketPTWorldLaunch?.createArenaSession) throw new Error('Arena launcher is unavailable.');
      state.phase = 'ARENA_SESSION';
      trace('ARENA_SESSION', 'RUNNING', 'creating authenticated Push-Up Arena session');
      button.textContent = 'Opening arena…';
      const session = await global.PocketPTWorldLaunch.createArenaSession();
      if (!session?.launchUrl) throw new Error('Arena launch URL missing.');
      trace('ARENA_SESSION', 'PASS', 'one-time arena launch created');
      state.phase = 'NAVIGATING';
      global.location.assign(session.launchUrl);
    } catch (error) {
      if (error?.code === 'AUTH_REDIRECT') return;
      state.phase = 'ARENA_BLOCKED';
      const message = error?.message || 'Arena launch failed.';
      setError(message);
      trace('ARENA_GATE', 'FAIL', message);
      button.disabled = !state.avatarReady;
      button.textContent = original;
    }
  }

  function bind() {
    $('releaseSignInBtn').addEventListener('click', () => global.location.assign(loginTarget('login')));
    $('releaseSignupForm').addEventListener('submit', submitSignup);
    $('releaseOpenAvaturnBtn').addEventListener('click', () => {
      const popup = global.open(AVATURN_URL, 'avaturn_creator', 'popup=true,width=1100,height=800');
      $('releaseAvatarUploadStatus').textContent = popup ? 'Avaturn opened. Export your .glb, then return here and upload it.' : 'Popup blocked. Allow popups or open Avaturn in a new tab.';
      trace('AVATURN', popup ? 'PASS' : 'WAITING', popup ? 'creator opened' : 'popup blocked');
    });
    $('releaseUploadAvatarBtn').addEventListener('click', uploadAvatar);
    $('releaseChangeAvatarBtn').addEventListener('click', () => {
      $('releaseAvatarSetup').hidden = false;
      $('releaseAvatarReadyActions').hidden = true;
      $('releaseAvatarUploadStatus').textContent = 'Choose a new .glb to replace the avatar currently attached to your profile.';
      $('releaseAvatarSetup').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('releaseEnterArenaBtn').addEventListener('click', enterArena);
    global.addEventListener('auth:changed', () => refreshAuthAndAvatar('auth-changed'));
    global.addEventListener('app:canonical-profile', (event) => {
      if (!event?.detail?.profile) return;
      state.profile = event.detail.profile;
      const hasAvatar = renderAvatar(state.profile);
      if (state.phase !== 'PROFILE_LOADING' && hasAvatar && state.auth?.token) {
        verifyArenaAvatar(state.auth.token, 'canonical-profile-event').then((verified) => {
          state.phase = verified ? 'READY' : 'AVATAR_REQUIRED';
        });
      }
    });
  }

  async function boot() {
    bind();
    trace('PAGE', 'PASS', 'release front door loaded');
    if (!global.AuthStateRuntime || !global.BACKEND_READ_CLIENT || !global.AppHydrationRuntime || !global.ProfileWriteRuntime || !global.PocketPTAvatarUploadContract) {
      state.phase = 'DEPENDENCY_FAILED';
      const missing = [
        ['AuthStateRuntime', global.AuthStateRuntime],
        ['BACKEND_READ_CLIENT', global.BACKEND_READ_CLIENT],
        ['AppHydrationRuntime', global.AppHydrationRuntime],
        ['ProfileWriteRuntime', global.ProfileWriteRuntime],
        ['PocketPTAvatarUploadContract', global.PocketPTAvatarUploadContract]
      ].filter(([, value]) => !value).map(([name]) => name).join(', ');
      trace('DEPENDENCIES', 'FAIL', `missing: ${missing}`);
      setStatus('Avatar setup could not start because a required MileleFit runtime is unavailable.', 'bad');
      setGate('Arena entry locked until avatar setup is restored.', false);
      setError(`First failure: missing ${missing}`);
      return;
    }
    trace('DEPENDENCIES', 'PASS', 'canonical auth/profile/avatar runtimes available');
    await refreshAuthAndAvatar('boot');
  }

  global.MileleFitPushUpRelease = {
    boot,
    refresh: refreshAuthAndAvatar,
    uploadAvatar,
    enterArena,
    getState: () => ({ ...state, auth: state.auth ? { ...state.auth, token: state.auth.token ? '[REDACTED]' : null } : null, trace: [...state.trace] })
  };

  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);
