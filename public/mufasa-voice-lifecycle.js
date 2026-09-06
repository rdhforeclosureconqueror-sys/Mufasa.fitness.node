(function installMufasaVoiceLifecycle(global){
  "use strict";
  if (!global || global.MufasaVoiceLifecycle) return;

  const state = {
    installed: false,
    explicitMuted: false,
    voiceEnabledByUser: false,
    calibrationSuspended: false,
    wasListeningBeforeCalibration: false,
    wasMutedBeforeCalibration: true,
    resumeRequestedDuringCalibration: false,
    calibrationSuspends: 0,
    calibrationResumes: 0,
    blockedResumes: 0,
    lastEvent: "BOOT"
  };

  let installTimer = null;

  function snapshot(){ return Object.freeze({ ...state }); }
  function setExplicitMute(value){
    state.explicitMuted = Boolean(value);
    global.__POCKETPT_EXPLICIT_VOICE_MUTE__ = state.explicitMuted;
    state.lastEvent = state.explicitMuted ? "USER_MUTED" : "USER_UNMUTED";
  }

  function clearCalibration(reason){
    state.calibrationSuspended = false;
    state.wasListeningBeforeCalibration = false;
    state.wasMutedBeforeCalibration = true;
    state.resumeRequestedDuringCalibration = false;
    state.lastEvent = reason;
  }

  function install(){
    if (state.installed) return global.MufasaVoiceLifecycle;
    const runtime = global.CoachRuntime;
    if (!runtime) return null;

    const original = {
      activateVoice: runtime.activateVoice?.bind(runtime),
      toggleMuted: runtime.toggleMuted?.bind(runtime),
      stopAllSpeech: runtime.stopAllSpeech?.bind(runtime),
      startListening: runtime.startListening?.bind(runtime),
      setMuted: runtime.setMuted?.bind(runtime)
    };

    if (!original.activateVoice || !original.toggleMuted || !original.stopAllSpeech || !original.startListening || !original.setMuted) return null;

    runtime.activateVoice = function activateVoiceWithIntent(){
      setExplicitMute(false);
      state.voiceEnabledByUser = true;
      if (state.calibrationSuspended) {
        state.resumeRequestedDuringCalibration = true;
        state.lastEvent = "VOICE_ON_DEFERRED_DURING_CALIBRATION";
        return Promise.resolve({ ok:true, deferred:true, reason:"calibration_exclusive" });
      }
      return original.activateVoice();
    };

    runtime.toggleMuted = function toggleMutedWithIntent(){
      const muted = original.toggleMuted();
      setExplicitMute(Boolean(muted));
      state.voiceEnabledByUser = !muted;
      if (state.calibrationSuspended) state.resumeRequestedDuringCalibration = !muted;
      return muted;
    };

    runtime.stopAllSpeech = function stopAllSpeechWithCalibration(reason){
      if (reason === "avatar_calibration_acquire" && !state.calibrationSuspended) {
        const current = runtime.getState?.() || {};
        state.calibrationSuspended = true;
        state.wasListeningBeforeCalibration = Boolean(current.listening && !current.muted);
        state.wasMutedBeforeCalibration = Boolean(current.muted);
        state.resumeRequestedDuringCalibration = false;
        state.calibrationSuspends += 1;
        state.lastEvent = "CALIBRATION_SUSPENDED";
      }
      return original.stopAllSpeech(reason);
    };

    runtime.startListening = function startListeningWithCalibrationRestore(){
      if (!state.calibrationSuspended) return original.startListening();

      if (state.explicitMuted) {
        original.setMuted(true);
        state.blockedResumes += 1;
        clearCalibration("CALIBRATION_RESUME_BLOCKED_USER_MUTED");
        return { ok:false, skipped:true, reason:"explicit_user_mute" };
      }

      const shouldResume = state.wasListeningBeforeCalibration || state.resumeRequestedDuringCalibration;
      if (!shouldResume) {
        original.setMuted(state.wasMutedBeforeCalibration);
        state.blockedResumes += 1;
        clearCalibration("CALIBRATION_RESTORED_PREVIOUS_QUIET_STATE");
        return { ok:false, skipped:true, reason:"voice_not_active_before_calibration" };
      }

      original.setMuted(false);
      const result = original.startListening();
      state.calibrationResumes += 1;
      clearCalibration("CALIBRATION_RESUMED_MUFASA");
      return result;
    };

    state.installed = true;
    global.__POCKETPT_EXPLICIT_VOICE_MUTE__ = false;
    state.lastEvent = "INSTALLED";
    return global.MufasaVoiceLifecycle;
  }

  global.MufasaVoiceLifecycle = Object.freeze({ install, diagnostics:snapshot });

  function attemptInstall(){
    if (install()) {
      if (installTimer != null) global.clearInterval?.(installTimer);
      installTimer = null;
    }
  }

  attemptInstall();
  if (!state.installed && typeof global.setInterval === "function") {
    installTimer = global.setInterval(attemptInstall, 50);
    installTimer?.unref?.();
  }
})(typeof window !== "undefined" ? window : globalThis);
