/* =========================================================
   profile-write-runtime.js — profile/avatar write ownership
========================================================= */
(function initProfileWriteRuntime(global) {
  "use strict";

  const PROFILE_TAG = "[PROFILE_WRITE]";
  const AVATAR_TAG = "[AVATAR_UPLOAD]";
  const SYNC_TAG = "[PROFILE_SYNC]";
  const DEFAULT_PROVIDER = "avaturn";
  const DEFAULT_UPLOAD_TIMEOUT_MS = 30000;
  const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

  const state = {
    configured: false,
    refs: {},
    deps: {},
    endpoints: {},
    lastError: null,
    lastSync: null,
    lastAvatar: null
  };

  function log(tag, message, payload) {
    if (payload !== undefined) console.log(tag, message, payload);
    else console.log(tag, message);
  }

  function warn(tag, message, payload) {
    if (payload !== undefined) console.warn(tag, message, payload);
    else console.warn(tag, message);
  }

  function visibleMessage(target, message, isError = false) {
    if (!target) return;
    target.textContent = message;
    target.classList?.toggle?.("status-bad", Boolean(isError));
    target.classList?.toggle?.("status-ok", !isError);
  }

  function visibleAvatarMessage(message, isError = false) {
    visibleMessage(state.refs.avatarCreationStatusEl, message, isError);
  }

  function diagnostic(id, value) {
    const target = global.document?.getElementById?.(id);
    if (target) target.textContent = value;
  }

  function setAvatarAssetStatus(message, isError = false) {
    if (typeof state.deps.setAvatarAssetStatus === "function") {
      state.deps.setAvatarAssetStatus(message, isError);
      return;
    }
    const target = state.refs.avatarAssetStatusEl || global.document?.querySelector?.("[data-avatar-status]");
    visibleMessage(target, message, isError);
  }

  function setAvatarRuntimeStatus(message, isError = false) {
    if (typeof state.deps.setAvatarRuntimeStatus === "function") {
      state.deps.setAvatarRuntimeStatus(message, isError);
      return;
    }
    visibleMessage(state.refs.avatarRuntimeStatusEl, message, isError);
  }

  function recordError(scope, error) {
    const entry = {
      scope,
      message: String(error?.message || error || "profile_write_error"),
      code: error?.code || null,
      status: error?.status || null,
      at: new Date().toISOString()
    };
    state.lastError = entry;
    global.__profileWriteRuntimeState = snapshot();
    return entry;
  }

  function getProfile() {
    return state.deps.getProfile?.() || global.USER_PROFILE || null;
  }

  function getUserId() {
    return state.deps.getUserId?.() || global.USER_ID || "guest";
  }

  function getAuthToken() {
    return state.deps.getAuthToken?.() || global.APP_AUTH?.token || global.localStorage?.getItem?.("maatAuthToken") || null;
  }

  function parseHeightCm(heightValue) {
    if (heightValue == null) return null;
    if (typeof heightValue === "number" && Number.isFinite(heightValue)) return heightValue;
    const str = String(heightValue).trim().toLowerCase();
    if (!str) return null;
    const cmMatch = str.match(/^(\d+(?:\.\d+)?)\s*cm$/);
    if (cmMatch) return Number(cmMatch[1]);
    return null;
  }

  function parseNullableNumber(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function isAvatarFeatureEnabled() {
    if (typeof state.deps.isAvatarFeatureEnabled === "function") return state.deps.isAvatarFeatureEnabled() === true;
    return global.ENABLE_AVATAR_FEATURE === true;
  }

  function avatarDisabledResult(action) {
    const message = "Avatar feature is disabled for this pilot.";
    visibleAvatarMessage(message, true);
    setAvatarAssetStatus(message, true);
    setAvatarRuntimeStatus("Avatar presentation is unavailable.", true);
    state.deps.trackPilotEvent?.("avatar_disabled", { action });
    return { ok: false, disabled: true, reason: "avatar_feature_disabled" };
  }

  function isLikelyHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
  }

  function resolveAvatarModelUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    if (typeof state.deps.resolveAvatarModelUrl === "function") return state.deps.resolveAvatarModelUrl(raw);
    if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw;
    return null;
  }

  function normalizeAvatarProfile(avatar) {
    if (typeof state.deps.normalizeAvatarProfile === "function") return state.deps.normalizeAvatarProfile(avatar);
    if (!avatar || typeof avatar !== "object") return null;
    const avatarProvider = String(avatar.avatarProvider || avatar.provider || state.deps.avatarProviderDefault || DEFAULT_PROVIDER).trim() || DEFAULT_PROVIDER;
    const avatarModelUrl = resolveAvatarModelUrl(String(avatar.avatarModelUrl || avatar.modelUrl || ""));
    const avatarThumbnailUrl = String(avatar.avatarThumbnailUrl || avatar.thumbnailUrl || "").trim();
    if (!avatarModelUrl) return null;
    return {
      avatarProvider,
      avatarModelUrl,
      avatarThumbnailUrl: isLikelyHttpUrl(avatarThumbnailUrl) ? avatarThumbnailUrl : null,
      avatarUpdatedAt: Number(avatar.avatarUpdatedAt || avatar.updatedAt || Date.now()) || Date.now()
    };
  }

  function profileToApiPayload(profile) {
    if (!profile) return null;
    return {
      age: parseNullableNumber(profile.age),
      height_cm: parseHeightCm(profile.height),
      weight_kg: parseNullableNumber(profile.weight_lbs) ? Number((Number(profile.weight_lbs) / 2.20462).toFixed(2)) : null,
      goals: profile.goals ? {
        primary_goal: profile.goals.primary || null,
        frequency_days_per_week: parseNullableNumber(profile.goals.frequency_days_per_week),
        notes: profile.goals.focus || null
      } : null,
      injuries: Array.isArray(profile.injuries) ? profile.injuries : [],
      notes: profile.notes || null,
      avatar: isAvatarFeatureEnabled() ? normalizeAvatarProfile(profile.avatar) : null
    };
  }

  function makeError(message, code, extra = {}) {
    const err = new Error(message);
    err.code = code;
    Object.assign(err, extra);
    return err;
  }

  function resolveCanonicalApiUrl(path) {
    if (typeof global.MaatApiClient?.resolve === "function") return global.MaatApiClient.resolve(path);
    const configuredOrigin = state.endpoints.nodeBaseUrl || global.RuntimeState?.getBackendOrigin?.();
    if (!configuredOrigin) throw makeError("canonical_api_origin_unavailable", "API_ORIGIN_UNAVAILABLE");
    return new URL(path, `${String(configuredOrigin).replace(/\/$/, "")}/`).href;
  }

  function resolveCanonicalApiOrigin() {
    if (typeof global.MaatApiClient?.origin === "function") return global.MaatApiClient.origin();
    return new URL(resolveCanonicalApiUrl("/")).origin;
  }

  function resolveProfileReload() {
    if (typeof state.deps.reloadProfile === "function") return state.deps.reloadProfile;
    if (typeof global.AppHydrationRuntime?.hydrateProfileFromBackend === "function") {
      return (options) => global.AppHydrationRuntime.hydrateProfileFromBackend(options);
    }
    return null;
  }

  async function verifyUploadContract(contract) {
    const discoveryUrl = resolveCanonicalApiUrl(contract.discoveryPath);
    diagnostic("avatarDiagApiOrigin", new URL(discoveryUrl).origin);
    diagnostic("avatarDiagContractUrl", discoveryUrl);
    diagnostic("avatarDiagContractVersion", String(contract.version));
    diagnostic("avatarDiagContractStatus", "REQUESTING");
    const response = await fetch(discoveryUrl, { method: "GET", cache: "no-store" });
    const contentType = response.headers?.get?.("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : null;
    const advertised = payload?.data;
    if (!response.ok || !payload?.ok || !advertised) {
      diagnostic("avatarDiagContractStatus", `FAILED (HTTP ${response.status})`);
      throw makeError("The deployed backend does not advertise the required avatar upload contract.", "UPLOAD_CONTRACT_UNAVAILABLE", {
        status: response.status,
        payload,
        discoveryUrl,
        responseContentType: contentType || null
      });
    }
    diagnostic("avatarDiagBackendBuild", advertised.backendBuild || "unavailable");
    diagnostic("avatarDiagUploadRoute", advertised.path || "unavailable");
    diagnostic("avatarDiagUploadMethod", advertised.method || "unavailable");
    diagnostic("avatarDiagMultipartField", advertised.field || "unavailable");
    diagnostic("avatarDiagMaxUpload", Number.isFinite(advertised.maxBytes) ? `${advertised.maxBytes} bytes` : "unavailable");
    if (advertised.version !== contract.version) {
      diagnostic("avatarDiagContractStatus", "FAILED (VERSION MISMATCH)");
      throw makeError("The deployed backend advertises an incompatible avatar upload contract version.", "UPLOAD_CONTRACT_VERSION_MISMATCH", { status: response.status, payload, discoveryUrl, responseContentType: contentType || null });
    }
    if (advertised.enabled !== true) {
      diagnostic("avatarDiagContractStatus", "FAILED (UPLOAD DISABLED)");
      throw makeError("The deployed backend has avatar upload disabled.", "AVATAR_UPLOAD_DISABLED", { status: response.status, payload, discoveryUrl, responseContentType: contentType || null });
    }
    if (advertised.path !== contract.path || advertised.method !== contract.method || advertised.field !== contract.field) {
      diagnostic("avatarDiagContractStatus", "FAILED (CONTRACT MISMATCH)");
      throw makeError("The deployed backend advertises incompatible avatar upload request fields.", "UPLOAD_CONTRACT_MISMATCH", { status: response.status, payload, discoveryUrl, responseContentType: contentType || null });
    }
    diagnostic("avatarDiagContractStatus", "VERIFIED");
    return advertised;
  }

  function isAuthUnavailable(err) {
    if (typeof state.deps.isAuthUnavailable === "function") return state.deps.isAuthUnavailable(err);
    return err?.code === "MISSING_AUTH_TOKEN" || err?.code === "UNAUTHORIZED" || err?.status === 401 || err?.status === 403;
  }

  async function postAuthenticatedJSON(url, { method = "POST", body }) {
    if (typeof state.deps.postAuthenticatedJSON === "function") return state.deps.postAuthenticatedJSON(url, { method, body });
    const token = getAuthToken();
    if (!token) throw makeError("missing_auth_token", "MISSING_AUTH_TOKEN");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body || {})
    });
    const payload = await res.json().catch(() => null);
    if (res.status === 401 || res.status === 403) throw makeError("unauthorized", "UNAUTHORIZED", { status: res.status, payload });
    if (!res.ok || !payload?.ok) throw makeError(payload?.error?.message || payload?.error || `request_failed_${res.status}`, "REQUEST_FAILED", { status: res.status, payload });
    return payload?.data || null;
  }

  async function sendLegacyProfile(profile, reason) {
    if (typeof state.deps.sendToNode !== "function") throw makeError("legacy_profile_write_unavailable", "LEGACY_PROFILE_WRITE_UNAVAILABLE");
    return state.deps.sendToNode({
      domain: "fitness",
      command: "fitness.saveProfile",
      userId: getUserId(),
      payload: { profile, _fallbackReason: reason || "profile_api_unavailable", ts: Date.now() }
    });
  }

  function emitProfileSync(profile, source, mode) {
    const avatar = normalizeAvatarProfile(profile?.avatar);
    state.lastSync = { source, mode, at: new Date().toISOString() };
    state.lastAvatar = avatar;
    global.__profileWriteRuntimeState = snapshot();
    if (isAvatarFeatureEnabled()) {
      global.AvatarRuntime?.updateStatus?.({
        profileAvatarMetadataSynced: Boolean(avatar),
        profileAvatarMetadataSource: source,
        profileAvatarMetadataMode: mode,
        profileAvatarModelUrl: avatar?.avatarModelUrl || null,
        profileAvatarThumbnailUrl: avatar?.avatarThumbnailUrl || null,
        profileAvatarSyncedAt: state.lastSync.at
      });
    }
    global.dispatchEvent?.(new CustomEvent("profile-write:profile-synced", { detail: { profile, avatar: isAvatarFeatureEnabled() ? avatar : null, source, mode } }));
    if (isAvatarFeatureEnabled() && avatar) global.dispatchEvent?.(new CustomEvent("profile-write:avatar-metadata", { detail: { avatar, source, mode } }));
  }

  async function saveProfileToNode({ source = "profile", allowLegacyFallback = true, visible = false } = {}) {
    const profile = getProfile();
    log(PROFILE_TAG, "save requested", { source, hasProfile: Boolean(profile) });
    if (!profile) {
      if (visible) visibleAvatarMessage("Sign in first.", true);
      return { ok: false, reason: "missing_profile" };
    }

    const profilePayload = profileToApiPayload(profile);
    const profileUrl = state.endpoints.nodeProfileUrl;
    try {
      if (!profileUrl) throw makeError("profile_url_unavailable", "PROFILE_URL_UNAVAILABLE");
      await postAuthenticatedJSON(profileUrl, { method: "PUT", body: { profile: profilePayload } });
      state.deps.sessionWriteClient?.trackExplicitSuccess?.("profile");
      state.deps.addLog?.("system", "Profile synced to authenticated backend API.");
      state.deps.updateSyncStatus?.();
      emitProfileSync(profile, source, "authenticated_api");
      log(SYNC_TAG, "profile synced", { source, mode: "authenticated_api" });
      return { ok: true, mode: "authenticated_api" };
    } catch (err) {
      const entry = recordError("profile-save", err);
      state.deps.sessionWriteClient?.trackFallback?.("profile", err);
      if (isAuthUnavailable(err)) {
        warn(PROFILE_TAG, "authenticated profile write requires auth", entry);
        if (visible) visibleAvatarMessage("Profile sync requires sign-in. Please sign in and retry.", true);
      } else {
        warn(PROFILE_TAG, "authenticated profile write failed", entry);
      }
      if (!allowLegacyFallback) throw err;
    }

    try {
      await sendLegacyProfile(profile, "profile_api_unavailable");
      state.deps.addLog?.("system", "Profile saved via legacy compatibility path.");
      state.deps.updateSyncStatus?.();
      emitProfileSync(profile, source, "legacy_compatibility");
      log(SYNC_TAG, "profile saved through legacy compatibility", { source });
      return { ok: true, mode: "legacy_compatibility" };
    } catch (err) {
      recordError("profile-legacy-save", err);
      state.deps.updateSyncStatus?.();
      throw err;
    }
  }

  function selectedAvatarFile() {
    return state.refs.avatarFileInput?.files?.[0] || null;
  }

  function validateAvatarFile(file) {
    if (!file) throw makeError("Choose a .glb file first.", "AVATAR_FILE_MISSING");
    if (!/\.glb$/i.test(file.name || "")) throw makeError("Only .glb files are supported.", "AVATAR_FILE_EXTENSION");
    const maxBytes = Number(state.deps.maxUploadBytes || DEFAULT_MAX_UPLOAD_BYTES);
    if (file.size > maxBytes) throw makeError("Avatar file exceeds the 15MB size limit.", "AVATAR_FILE_TOO_LARGE");
    if (file.size === 0) throw makeError("Avatar upload is empty.", "AVATAR_FILE_EMPTY");
    return true;
  }

  function setProfileAvatar(avatar) {
    const profile = getProfile();
    if (!profile) return null;
    profile.avatar = avatar;
    state.deps.setProfile?.(profile);
    return profile;
  }

  async function refreshAvatarAsset(source) {
    if (!isAvatarFeatureEnabled()) return false;
    if (typeof state.deps.loadAvatarAssetForCurrentUser === "function") await state.deps.loadAvatarAssetForCurrentUser(source);
    return true;
  }

  async function saveAvatarFromInputs() {
    log(PROFILE_TAG, "avatar URL save requested");
    if (!isAvatarFeatureEnabled()) return avatarDisabledResult("save_from_inputs");
    const profile = getProfile();
    if (!profile) {
      visibleAvatarMessage("Sign in first.", true);
      return { ok: false, reason: "missing_profile" };
    }
    const nextAvatar = normalizeAvatarProfile({
      avatarProvider: state.deps.avatarProviderDefault || DEFAULT_PROVIDER,
      avatarModelUrl: state.refs.avatarModelUrlInput?.value,
      avatarThumbnailUrl: state.refs.avatarThumbUrlInput?.value,
      avatarUpdatedAt: Date.now()
    });
    if (!nextAvatar) {
      visibleAvatarMessage("Avatar model URL is invalid.", true);
      setAvatarRuntimeStatus("Invalid avatar URL (http/https or same-origin path required).", true);
      return { ok: false, reason: "invalid_avatar_url" };
    }

    setProfileAvatar(nextAvatar);
    await refreshAvatarAsset("creator_flow");
    state.deps.persistUser?.();
    try {
      const result = await saveProfileToNode({ source: "avatar-save", visible: true });
      visibleAvatarMessage(result.mode === "authenticated_api" ? "Avatar saved to your profile." : "Avatar saved locally through compatibility sync.", result.mode !== "authenticated_api");
      emitProfileSync(getProfile(), "avatar-save", result.mode);
      return { ok: true, avatar: nextAvatar, mode: result.mode };
    } catch (err) {
      warn(PROFILE_TAG, "avatar profile save failed", err);
      visibleAvatarMessage(isAuthUnavailable(err) ? "Avatar saved locally. Sign in to sync it to your profile." : "Saved locally. Backend sync failed.", true);
      return { ok: false, avatar: nextAvatar, reason: err?.code || err?.message || "profile_sync_failed" };
    }
  }

  async function uploadAvatarFile(selectedFile) {
    log(AVATAR_TAG, "upload button clicked");
    if (!isAvatarFeatureEnabled()) return avatarDisabledResult("upload_file");
    state.deps.trackPilotEvent?.("avatar_upload_started");
    const profile = getProfile();
    if (!profile) {
      visibleAvatarMessage("Sign in first.", true);
      return { ok: false, reason: "missing_profile" };
    }

    // Capture the modal's File at click time so upload transport does not depend
    // on the later inline runtime configuration having retained the same input.
    const file = selectedFile || selectedAvatarFile();
    let uploadTransportSucceeded = false;
    let profileReloadSucceeded = false;
    // Each attempt owns the visible diagnostic result. Do not let an error from
    // a previous attempt survive a later successful upload and activation.
    diagnostic("avatarDiagError", "NONE");
    try {
      validateAvatarFile(file);
    } catch (err) {
      visibleAvatarMessage(err.message, true);
      setAvatarAssetStatus(err.message, true);
      state.deps.trackPilotEvent?.("avatar_upload_failed", { reason: err.code || err.message });
      const reason = file ? (err.code || err.message) : "UPLOAD_NO_BROWSER_FILE";
      diagnostic("avatarDiagError", reason);
      return { ok: false, reason };
    }

    visibleAvatarMessage("Uploading avatar file…");
    diagnostic("avatarDiagUpload", "UPLOADING");
    setAvatarAssetStatus("Uploading avatar asset to server…");
    const authToken = getAuthToken();
    if (!authToken) {
      const err = makeError("missing_auth_token", "MISSING_AUTH_TOKEN");
      recordError("avatar-upload", err);
      visibleAvatarMessage("Upload blocked: sign in is required before uploading an avatar.", true);
      setAvatarAssetStatus("Upload blocked: authentication required.", true);
      state.deps.trackPilotEvent?.("avatar_upload_failed", { reason: "missing_auth_token" });
      return { ok: false, reason: "missing_auth_token" };
    }

    const contract = global.PocketPTAvatarUploadContract;
    if (!contract) throw makeError("avatar_upload_contract_unavailable", "UPLOAD_CONTRACT_MISSING");
    const form = new FormData();
    form.append(contract.field, file);
    if (form.get(contract.field) !== file) {
      diagnostic("avatarDiagError", "UPLOAD_FORMDATA_FILE_MISSING");
      return { ok: false, reason: "UPLOAD_FORMDATA_FILE_MISSING" };
    }
    let advertisedContract;
    try {
      advertisedContract = await verifyUploadContract(contract);
    } catch (err) {
      diagnostic("avatarDiagHttp", err?.status ? `HTTP ${err.status}` : "NOT SENT");
      diagnostic("avatarDiagServerCode", err?.payload?.error?.code || err?.code || "NONE");
      throw err;
    }
    const uploadUrl = resolveCanonicalApiUrl(advertisedContract.path);
    const abortController = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutHandle = abortController
      ? setTimeout(() => abortController.abort("avatar_upload_timeout"), Number(state.deps.uploadTimeoutMs || DEFAULT_UPLOAD_TIMEOUT_MS))
      : null;

    try {
      log(AVATAR_TAG, "request starting", { method: "POST", url: uploadUrl, field: "avatar", name: file.name, size: file.size, type: file.type });
      diagnostic("avatarDiagUpload", "REQUEST_SENT");
      let response;
      try {
        response = await fetch(uploadUrl, {
          method: contract.method,
          headers: { authorization: `Bearer ${authToken}` },
          body: form,
          ...(abortController ? { signal: abortController.signal } : {})
        });
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
      const payload = await response.json().catch(() => null);
      diagnostic("avatarDiagHttp", `HTTP ${response.status}`);
      diagnostic("avatarDiagServerCode", payload?.error?.code || "NONE");
      log(AVATAR_TAG, "response", { status: response.status, ok: response.ok, payload });
      if (!response.ok || !payload?.ok || !payload?.data?.avatarModelUrl) {
        const serverCode = payload?.error?.code;
        const code = response.status === 401 ? "UPLOAD_HTTP_401"
          : response.status === 413 ? "UPLOAD_HTTP_413"
          : serverCode === "AVATAR_FILE_MISSING" ? "UPLOAD_SERVER_FILE_MISSING"
          : serverCode === "AVATAR_INCOMPATIBLE" ? "UPLOAD_GLB_INCOMPATIBLE"
          : "AVATAR_UPLOAD_FAILED";
        throw makeError(payload?.error?.message || `upload_failed_${response.status}`, code, { status: response.status, payload });
      }

      uploadTransportSucceeded = true;

      for (const stage of payload.data.uploadStages || []) diagnostic("avatarDiagUpload", stage);
      diagnostic("avatarDiagCompatibility", "COMPATIBLE");

      const avatarModelUrl = payload.data.avatarModelUrl;
      if (state.refs.avatarModelUrlInput) state.refs.avatarModelUrlInput.value = avatarModelUrl;
      setAvatarAssetStatus(`Upload success. Asset stored at ${avatarModelUrl}.`);
      visibleAvatarMessage("Upload complete. Saving avatar metadata…");
      diagnostic("avatarDiagUpload", "SUCCESS");
      diagnostic("avatarDiagProfile", "SAVED");
      const nextAvatar = normalizeAvatarProfile({
        avatarProvider: state.deps.avatarProviderDefault || DEFAULT_PROVIDER,
        avatarModelUrl,
        avatarThumbnailUrl: state.refs.avatarThumbUrlInput?.value,
        avatarUpdatedAt: Date.now()
      });
      setProfileAvatar(nextAvatar);
      state.deps.persistUser?.();
      diagnostic("avatarDiagReload", "RELOADING");
      diagnostic("avatarDiagReloadHttp", "REQUESTING");
      diagnostic("avatarDiagReloadCode", "NONE");
      const reloadProfile = resolveProfileReload();
      if (!reloadProfile) {
        throw makeError("profile_reload_unavailable", "PROFILE_RELOAD_UNAVAILABLE");
      }
      // Reuse the credential that the server accepted for this upload instead
      // of asking a potentially lagging mobile auth snapshot for it again.
      const profileReloaded = await reloadProfile({ authToken });
      if (profileReloaded === false) {
        const failure = global.AppHydrationRuntime?.getState?.().lastProfileReload || {};
        const code = failure.code || "PROFILE_RELOAD_FAILED";
        diagnostic("avatarDiagReload", failure.status ? `FAILED (HTTP ${failure.status})` : "FAILED");
        diagnostic("avatarDiagReloadHttp", failure.status ? `HTTP ${failure.status}` : "NOT AVAILABLE");
        diagnostic("avatarDiagReloadCode", code);
        throw makeError(failure.message || "profile_reload_failed", code, { reloadStatus: failure.status || null });
      }
      diagnostic("avatarDiagReload", "RELOADED");
      diagnostic("avatarDiagReloadHttp", "HTTP 200");
      diagnostic("avatarDiagReloadCode", "NONE");
      profileReloadSucceeded = true;
      diagnostic("avatarDiagRuntime", "ACTIVATING");
      const avatarMounted = await refreshAvatarAsset("uploaded_file");
      if (avatarMounted === false) throw makeError("avatar_mount_failed", "AVATAR_MOUNT_FAILED");
      diagnostic("avatarDiagRuntime", "ACTIVE");
      diagnostic("avatarDiagError", "NONE");
      visibleAvatarMessage("Upload success. Avatar saved, reloaded, and mounted.");
      diagnostic("avatarDiagProfile", "SAVED");
      diagnostic("avatarDiagUpload", "COMPLETE");
      state.deps.trackPilotEvent?.("avatar_upload_success", { size: file?.size || 0 });
      emitProfileSync(getProfile(), "avatar-upload", "authenticated_api");
      return { ok: true, avatar: nextAvatar, mode: "authenticated_api" };
    } catch (err) {
      recordError("avatar-upload", err);
      // A confirmed 2xx upload remains a transport success even when the
      // mandatory profile reload or later activation fails.
      diagnostic("avatarDiagUpload", uploadTransportSucceeded ? "SUCCESS" : "FAILED");
      if (uploadTransportSucceeded && !err.uploadTransportSucceeded) err.uploadTransportSucceeded = true;
      if (uploadTransportSucceeded && !profileReloadSucceeded) diagnostic("avatarDiagRuntime", "NOT ACTIVATED");
      if (profileReloadSucceeded) diagnostic("avatarDiagRuntime", "FAILED");
      if (err?.status) diagnostic("avatarDiagHttp", `HTTP ${err.status}`);
      if (err?.payload?.error?.code) diagnostic("avatarDiagServerCode", err.payload.error.code);
      if (err?.status === 422) diagnostic("avatarDiagCompatibility", "INCOMPATIBLE");
      if (state.refs.avatarModelUrlInput?.value) diagnostic("avatarDiagProfile", "FAILED");
      diagnostic("avatarDiagError", String(err?.code || err?.message || err || "UPLOAD_FAILED"));
      warn(AVATAR_TAG, "avatar upload failed", err);
      setAvatarAssetStatus("Upload failed or asset could not be stored.", true);
      const msg = String(err?.message || "");
      if (isAuthUnavailable(err) || msg === "missing_auth_token" || msg.includes("Authentication required") || msg.includes("Trust mode")) {
        visibleAvatarMessage("Upload blocked: backend auth bridge unavailable (missing token).", true);
      } else if (msg === "avatar_upload_timeout" || msg.includes("AbortError")) {
        visibleAvatarMessage("Upload timed out after 30s. Check connection or file size and retry.", true);
      } else if (msg) {
        visibleAvatarMessage(`Upload failed: ${msg}`, true);
      } else {
        visibleAvatarMessage("Upload failed. Use a valid .glb export and try again.", true);
      }
      state.deps.trackPilotEvent?.("avatar_upload_failed", { reason: msg || err?.name || "unknown" });
      throw err;
    }
  }

  async function clearAvatarMetadata() {
    log(PROFILE_TAG, "avatar clear requested");
    if (!isAvatarFeatureEnabled()) return avatarDisabledResult("clear_metadata");
    const profile = getProfile();
    if (!profile) {
      visibleAvatarMessage("Sign in first.", true);
      return { ok: false, reason: "missing_profile" };
    }
    setProfileAvatar(null);
    await refreshAvatarAsset("removed");
    state.deps.persistUser?.();
    const result = await saveProfileToNode({ source: "avatar-clear", visible: true });
    visibleAvatarMessage("Saved avatar removed.");
    emitProfileSync(getProfile(), "avatar-clear", result.mode);
    return { ok: true, mode: result.mode };
  }

  function configure(config = {}) {
    state.refs = { ...(config.refs || {}) };
    state.deps = { ...(config.deps || {}) };
    const runtimeEndpoints = global.RuntimeState?.getEndpoints?.() || {};
    const nodeBaseUrl = global.MaatApiClient?.origin?.() || config.endpoints?.nodeBaseUrl || state.deps.nodeBaseUrl || runtimeEndpoints.nodeBaseUrl || global.RuntimeState?.getBackendOrigin?.() || global.location?.origin;
    state.endpoints = {
      nodeBaseUrl,
      nodeProfileUrl: config.endpoints?.nodeProfileUrl || state.deps.nodeProfileUrl || runtimeEndpoints.nodeProfileUrl || `${nodeBaseUrl}/api/me/profile`
    };
    state.configured = true;
    const contract = global.PocketPTAvatarUploadContract;
    const discoveryUrl = contract ? resolveCanonicalApiUrl(contract.discoveryPath) : null;
    diagnostic("avatarDiagApiOrigin", discoveryUrl ? resolveCanonicalApiOrigin() : "unavailable");
    diagnostic("avatarDiagContractUrl", discoveryUrl || "unavailable");
    diagnostic("avatarDiagContractVersion", contract ? String(contract.version) : "unavailable");
    global.__profileWriteRuntimeState = snapshot();
    log(PROFILE_TAG, "runtime configured", { hasProfileUrl: Boolean(state.endpoints.nodeProfileUrl), hasAvatarRefs: Boolean(Object.keys(state.refs).length), avatarFeatureEnabled: isAvatarFeatureEnabled() });
    return true;
  }

  function snapshot() {
    return {
      configured: state.configured,
      endpoints: { ...state.endpoints },
      lastError: state.lastError,
      lastSync: state.lastSync,
      lastAvatar: state.lastAvatar
    };
  }

  global.ProfileWriteRuntime = {
    configure,
    saveProfileToNode,
    saveAvatarFromInputs,
    uploadAvatarFile,
    clearAvatarMetadata,
    normalizeAvatarProfile,
    profileToApiPayload,
    validateAvatarFile,
    getState: snapshot
  };

  log(PROFILE_TAG, "extracted runtime loaded");
})(window);
