(function installPushUpAvatarValidation(global) {
  'use strict';

  const BUILD = '20260912-avatar-validation-v1';
  const $ = (id) => global.document.getElementById(id);
  const DIAGNOSTICS = [
    ['Modal controls', 'avatarDiagControls'],
    ['Avaturn launch', 'avatarDiagLaunch'],
    ['Selected file', 'avatarDiagFile'],
    ['API origin', 'avatarDiagApiOrigin'],
    ['Contract URL', 'avatarDiagContractUrl'],
    ['Contract version expected', 'avatarDiagContractVersion'],
    ['Contract discovery', 'avatarDiagContractStatus'],
    ['Backend build', 'avatarDiagBackendBuild'],
    ['Upload route advertised', 'avatarDiagUploadRoute'],
    ['Upload method advertised', 'avatarDiagUploadMethod'],
    ['Multipart field advertised', 'avatarDiagMultipartField'],
    ['Max upload size', 'avatarDiagMaxUpload'],
    ['Upload', 'avatarDiagUpload'],
    ['HTTP status', 'avatarDiagHttp'],
    ['Server error code', 'avatarDiagServerCode'],
    ['Compatibility', 'avatarDiagCompatibility'],
    ['Profile save', 'avatarDiagProfile'],
    ['Profile reload', 'avatarDiagReload'],
    ['Profile reload HTTP', 'avatarDiagReloadHttp'],
    ['Profile reload error code', 'avatarDiagReloadCode'],
    ['Avatar runtime component', 'avatarDiagRuntime'],
    ['Last error', 'avatarDiagError'],
    ['Canonical avatar URL present', 'avatarDiagCanonicalUrl'],
    ['Canonical profile state', 'avatarDiagCanonicalProfile'],
    ['Release presentation state', 'avatarDiagPresentation'],
    ['Profile panel state', 'avatarDiagProfilePanel'],
    ['Sync state', 'avatarDiagSync'],
    ['Canonical profile event', 'avatarDiagPresentationEvent']
  ];

  function text(id, value) {
    const node = $(id);
    if (node) node.textContent = String(value == null || value === '' ? 'NONE' : value);
  }

  function openModal(reason = 'create-avatar') {
    const modal = $('releaseAvatarModal');
    if (!modal) return;
    modal.hidden = false;
    modal.classList.remove('hidden');
    text('avatarDiagControls', 'READY');
    text('avatarDiagPresentation', `modal_open:${reason}`);
    global.setTimeout(() => modal.querySelector('button, input, select')?.focus?.(), 0);
  }

  function closeModal() {
    const modal = $('releaseAvatarModal');
    if (!modal) return;
    modal.hidden = true;
    modal.classList.add('hidden');
    text('avatarDiagPresentation', 'modal_closed');
  }

  function canonicalProfile() {
    return global.AppHydrationRuntime?.getCanonicalProfile?.() || global.MileleFitPushUpRelease?.getState?.().profile || null;
  }

  function updateDerivedDiagnostics() {
    const release = global.MileleFitPushUpRelease?.getState?.() || {};
    const profileRuntime = global.ProfileWriteRuntime?.getState?.() || {};
    const hydration = global.AppHydrationRuntime?.getState?.() || {};
    const profile = canonicalProfile();
    const avatar = profile?.avatar || null;
    const avatarUrl = String(avatar?.avatarModelUrl || avatar?.modelUrl || '').trim();

    text('avatarDiagCanonicalUrl', avatarUrl ? 'YES' : 'NO');
    text('avatarDiagCanonicalProfile', profile ? 'READY' : (release.auth ? 'LOADING' : 'SIGNED OUT'));
    text('avatarDiagProfilePanel', release.phase || 'UNKNOWN');
    text('avatarDiagSync', profileRuntime.lastSync ? 'SYNCED' : 'NOT YET');
    if (!avatarUrl && !$('avatarDiagRuntime')?.textContent?.trim()) text('avatarDiagRuntime', 'NOT READY');

    const error = profileRuntime.lastError;
    if (error?.code || error?.message) text('avatarDiagError', error.code || error.message);

    const first = release.firstFailure || null;
    const contract = $('avatarDiagContractStatus')?.textContent || '';
    const upload = $('avatarDiagUpload')?.textContent || '';
    const reload = $('avatarDiagReload')?.textContent || '';
    let boundary = 'NONE';
    let status = 'WAITING';
    if (first) {
      boundary = first.stage || 'RELEASE';
      status = 'FAIL';
    } else if (/FAILED/i.test(contract)) {
      boundary = 'UPLOAD_CONTRACT';
      status = 'FAIL';
    } else if (/FAILED/i.test(upload)) {
      boundary = 'AVATAR_UPLOAD';
      status = 'FAIL';
    } else if (/FAILED/i.test(reload)) {
      boundary = 'PROFILE_RELOAD';
      status = 'FAIL';
    } else if (avatarUrl && release.avatarReady) {
      boundary = 'NONE';
      status = 'PASS';
    }
    text('releaseAvatarDebugStatus', status);
    text('releaseAvatarDebugFirstFailure', boundary);
    text('releaseAvatarDebugNextAction', status === 'PASS'
      ? 'Avatar is canonical and arena-ready.'
      : status === 'FAIL'
        ? 'Use the first failing boundary below; do not skip ahead.'
        : 'Select/create an avatar and run the upload flow.');

    // Keep the release diagnostics intentionally public during acceptance, but
    // never render credentials, bearer tokens, tickets, or raw auth objects.
    text('releaseAvatarDebugBuild', BUILD);
    text('avatarDiagPresentationEvent', hydration.profileGeneration ? `PROFILE_GENERATION_${hydration.profileGeneration}` : 'NONE');
  }

  function collectDebugText() {
    updateDerivedDiagnostics();
    const release = global.MileleFitPushUpRelease?.getState?.() || {};
    const lines = [
      `MileleFit — PUSH-UP AVATAR VALIDATION CENTER`,
      `Build: ${BUILD}`,
      `Canonical status: ${$('releaseAvatarDebugStatus')?.textContent || 'UNKNOWN'}`,
      `First failing boundary: ${$('releaseAvatarDebugFirstFailure')?.textContent || 'NONE'}`,
      `Next action: ${$('releaseAvatarDebugNextAction')?.textContent || 'UNKNOWN'}`,
      '',
      '=== AVATAR UPLOAD / PROFILE PIPELINE ==='
    ];
    for (const [label, id] of DIAGNOSTICS) lines.push(`${label}: ${$(id)?.textContent?.trim() || 'unavailable'}`);
    lines.push('', '=== RELEASE FIRST-FAILURE TRACE ===');
    for (const entry of release.trace || []) lines.push(`${entry.status || ''} ${entry.stage || ''} — ${entry.detail || ''}`.trim());
    return lines.join('\n');
  }

  async function copyDebug() {
    const payload = collectDebugText();
    try {
      await global.navigator?.clipboard?.writeText?.(payload);
      text('releaseCopyAvatarDebugBtn', 'COPIED');
      global.setTimeout(() => text('releaseCopyAvatarDebugBtn', 'COPY ALL'), 1400);
    } catch (_) {
      const target = $('releaseAvatarDebugCopyFallback');
      if (target) {
        target.hidden = false;
        target.value = payload;
        target.focus();
        target.select();
      }
    }
  }

  async function saveManualAvatar() {
    text('avatarDiagPresentation', 'manual_avatar_save');
    const result = await global.ProfileWriteRuntime?.saveAvatarFromInputs?.();
    await global.MileleFitPushUpRelease?.refresh?.('manual-avatar-save');
    updateDerivedDiagnostics();
    return result;
  }

  async function removeAvatar() {
    text('avatarDiagPresentation', 'avatar_remove');
    const result = await global.ProfileWriteRuntime?.clearAvatarMetadata?.();
    await global.MileleFitPushUpRelease?.refresh?.('avatar-remove');
    updateDerivedDiagnostics();
    return result;
  }

  function bind() {
    $('releaseCreateAvatarBtn')?.addEventListener('click', () => openModal('create-avatar'));
    $('releaseChangeAvatarBtn')?.addEventListener('click', () => openModal('change-avatar'));
    $('releaseCloseAvatarModalBtn')?.addEventListener('click', closeModal);
    $('releaseAvatarModal')?.addEventListener('click', (event) => {
      if (event.target === $('releaseAvatarModal')) closeModal();
    });
    global.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('releaseAvatarModal')?.hidden) closeModal();
    });

    $('releaseAvatarFileInput')?.addEventListener('change', (event) => {
      const file = event.target?.files?.[0];
      text('avatarDiagFile', file ? `${file.name} · ${file.size} bytes` : 'NONE');
      text('avatarDiagError', 'NONE');
      updateDerivedDiagnostics();
    });
    $('releaseOpenAvaturnBtn')?.addEventListener('click', () => {
      text('avatarDiagLaunch', 'REQUESTED');
      updateDerivedDiagnostics();
    });
    $('releaseUploadAvatarBtn')?.addEventListener('click', () => {
      text('avatarDiagUpload', 'STARTING');
      text('avatarDiagError', 'NONE');
      updateDerivedDiagnostics();
    });
    $('releaseSaveManualAvatarBtn')?.addEventListener('click', () => saveManualAvatar().catch((error) => {
      text('avatarDiagError', error?.code || error?.message || 'MANUAL_SAVE_FAILED');
      updateDerivedDiagnostics();
    }));
    $('releaseRemoveAvatarBtn')?.addEventListener('click', () => removeAvatar().catch((error) => {
      text('avatarDiagError', error?.code || error?.message || 'AVATAR_REMOVE_FAILED');
      updateDerivedDiagnostics();
    }));
    $('releaseCopyAvatarDebugBtn')?.addEventListener('click', copyDebug);

    global.addEventListener('app:canonical-profile', () => {
      text('avatarDiagPresentationEvent', 'RECEIVED');
      updateDerivedDiagnostics();
    });
    global.addEventListener('profile-write:profile-synced', () => updateDerivedDiagnostics());
    global.addEventListener('profile-write:avatar-metadata', () => updateDerivedDiagnostics());

    text('avatarDiagControls', 'READY');
    text('avatarDiagLaunch', 'IDLE');
    text('avatarDiagFile', 'NONE');
    updateDerivedDiagnostics();
    global.setInterval(updateDerivedDiagnostics, 1000);
  }

  global.MileleFitPushUpAvatarValidation = Object.freeze({
    open: openModal,
    close: closeModal,
    copy: copyDebug,
    refresh: updateDerivedDiagnostics,
    getDebugText: collectDebugText
  });

  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})(window);
