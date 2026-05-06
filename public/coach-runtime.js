(function initCoachRuntime(globalScope) {
  const global = globalScope || window;
  const DEFAULT_VOICES = ["alloy", "verse", "aria", "ember", "coral"];
  const GOOD_REP_COOLDOWN_MS = 2500;

  const state = {
    configured: false,
    muted: false,
    audioUnlocked: false,
    speechLock: false,
    repFeedbackAllowed: true,
    lastRepFeedbackAt: 0,
    lastStatus: "Coach ready",
    lastVoiceError: null,
    lastBackendError: null,
    lastSource: null
  };

  let refs = {};
  let deps = {};
  let ttsPlayer = null;

  function log(channel, message, details) {
    const tag = channel === "voice" ? "[VOICE_RUNTIME]" : channel === "maat" ? "[MAAT_STATUS]" : "[COACH_RUNTIME]";
    if (details === undefined) console.log(tag, message);
    else console.log(tag, message, details);
  }

  function normalizeReason(reason) {
    const text = reason?.message || String(reason || "unknown_error");
    return text.trim() || "unknown_error";
  }

  function setClass(el, mode) {
    if (!el?.classList) return;
    el.classList.remove("status-ok", "status-bad");
    if (mode === "ok") el.classList.add("status-ok");
    if (mode === "bad") el.classList.add("status-bad");
  }

  function setCoachStatus(text, options = {}) {
    const statusText = String(text || "Coach ready");
    state.lastStatus = statusText;
    if (refs.brainStatusEl) {
      refs.brainStatusEl.textContent = statusText;
      setClass(refs.brainStatusEl, options.mode || (statusText === "Coach ready" || statusText === "Speaking" ? "ok" : "bad"));
    }
    if (refs.brainChipTxt) {
      refs.brainChipTxt.textContent = options.chipText || `Ma’at 2.0: ${statusText.toLowerCase()}`;
    }
    log("maat", "status", { status: statusText, source: options.source || null });
  }

  function setVoiceSupport(text, ok = false) {
    if (!refs.voiceSupportStatusEl) return;
    refs.voiceSupportStatusEl.textContent = text;
    setClass(refs.voiceSupportStatusEl, ok ? "ok" : "bad");
  }

  function setReady(source = "ready") {
    state.lastVoiceError = null;
    setCoachStatus("Coach ready", { mode: "ok", chipText: "Ma’at 2.0: ready", source });
  }

  function setSpeaking(source = "speech") {
    setCoachStatus("Speaking", { mode: "ok", chipText: "Ma’at 2.0: speaking", source });
  }

  function setVoiceUnavailable(reason, source = "voice") {
    const normalized = normalizeReason(reason);
    state.lastVoiceError = normalized;
    setCoachStatus(`Voice unavailable: ${normalized}`, { mode: "bad", chipText: "Ma’at 2.0: voice unavailable", source });
    log("voice", "unavailable", { reason: normalized, source });
    deps.addLog?.("system", `Voice unavailable: ${normalized}`);
    return normalized;
  }

  function setBackendFailed(reason, source = "voice") {
    const normalized = normalizeReason(reason);
    state.lastBackendError = normalized;
    setCoachStatus(`Voice backend failed: ${normalized}`, { mode: "bad", chipText: "Ma’at 2.0: voice backend failed", source });
    log("voice", "backend failed", { error: normalized, source });
    deps.addLog?.("system", `Voice backend failed: ${normalized}`);
    return normalized;
  }

  function ensureAudioPlayer() {
    if (ttsPlayer) return ttsPlayer;
    ttsPlayer = refs.ttsPlayer || global.document?.getElementById?.("ttsPlayer");
    if (!ttsPlayer && global.document?.createElement) {
      ttsPlayer = global.document.createElement("audio");
      ttsPlayer.id = "ttsPlayer";
      ttsPlayer.preload = "auto";
      global.document.body?.appendChild(ttsPlayer);
    }
    return ttsPlayer;
  }

  function initVoiceDropdown() {
    if (!refs.voiceSelectEl) return;
    refs.voiceSelectEl.innerHTML = "";
    DEFAULT_VOICES.forEach((voice) => {
      const opt = global.document.createElement("option");
      opt.value = voice;
      opt.textContent = voice;
      refs.voiceSelectEl.appendChild(opt);
    });
    refs.voiceSelectEl.value = DEFAULT_VOICES[0];
  }

  function updateVoiceCapabilityStatus() {
    const hasSpeechSynth = "speechSynthesis" in global;
    const hasSpeechRecognition = Boolean(global.SpeechRecognition || global.webkitSpeechRecognition);
    if (!hasSpeechRecognition && !hasSpeechSynth) {
      setVoiceSupport("This device does not support voice. Text only.", false);
      return;
    }
    if (!hasSpeechRecognition) {
      setVoiceSupport("Mic input not supported here. Text + AI voice output only.", true);
      return;
    }
    setVoiceSupport("Voice ready. Tap 'Voice On' to enable audio + mic.", true);
  }

  function stopAllSpeech() {
    try { global.speechSynthesis?.cancel?.(); } catch (err) { log("voice", "speechSynthesis cancel failed", normalizeReason(err)); }
    try {
      const player = ensureAudioPlayer();
      player?.pause?.();
      if (player) player.currentTime = 0;
    } catch (err) {
      log("voice", "audio player stop failed", normalizeReason(err));
    }
  }

  async function unlockAudioOnce() {
    if (state.audioUnlocked) return true;
    const AudioContextClass = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextClass) {
      setVoiceUnavailable("audio_context_unavailable", "unlock");
      return false;
    }
    try {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
      await ctx.resume();
      state.audioUnlocked = true;
      setVoiceSupport("Audio unlocked ✅ Voice will play now.", true);
      log("voice", "audio unlocked");
      return true;
    } catch (err) {
      setVoiceUnavailable(`audio_unlock_failed: ${normalizeReason(err)}`, "unlock");
      return false;
    }
  }

  function releaseLocks(source) {
    if (source === "llm") {
      state.speechLock = false;
      state.repFeedbackAllowed = true;
    }
    if (state.lastStatus === "Speaking") setReady("speech-ended");
  }

  async function speakWithBackend(text, source) {
    const url = deps.voiceUrl;
    if (!url) throw new Error("/api/speak url missing");
    if (typeof global.fetch !== "function") throw new Error("fetch_unavailable");
    const authToken = deps.getAuthToken?.();
    const voice = refs.voiceSelectEl?.value || DEFAULT_VOICES[0];
    const format = "mp3";
    const res = await global.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ text, voice, format })
    });
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${errTxt ? ` ${errTxt}` : ""}`);
    }
    const blob = await res.blob();
    const urlObj = global.URL?.createObjectURL?.(blob);
    if (!urlObj) throw new Error("object_url_unavailable");
    const player = ensureAudioPlayer();
    if (!player) throw new Error("audio_player_unavailable");
    player.src = urlObj;
    player.onended = () => {
      global.URL?.revokeObjectURL?.(urlObj);
      releaseLocks(source);
    };
    player.onerror = () => {
      global.URL?.revokeObjectURL?.(urlObj);
      setVoiceUnavailable("audio_playback_error", source);
      releaseLocks(source);
    };
    await player.play();
  }

  function speakWithBrowserFallback(text, source) {
    if (!("speechSynthesis" in global) || typeof global.SpeechSynthesisUtterance !== "function") {
      throw new Error("browser_speech_synthesis_unavailable");
    }
    global.speechSynthesis.cancel();
    const utterance = new global.SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => releaseLocks(source);
    utterance.onerror = (event) => {
      setVoiceUnavailable(`browser_speech_error: ${event?.error || "unknown_error"}`, source);
      releaseLocks(source);
    };
    global.speechSynthesis.speak(utterance);
  }

  async function speak(text, source = "system") {
    const phrase = String(text || "").trim();
    if (!phrase) return { ok: false, skipped: true, reason: "empty_text" };
    state.lastSource = source;
    if (state.muted) {
      const reason = setVoiceUnavailable("muted", source);
      return { ok: false, reason };
    }
    if (state.speechLock && source === "rep") return { ok: false, skipped: true, reason: "speech_lock" };

    const unlocked = await unlockAudioOnce();
    if (!unlocked) return { ok: false, reason: state.lastVoiceError || "audio_unlock_failed" };

    stopAllSpeech();
    if (source === "llm") {
      state.speechLock = true;
      state.repFeedbackAllowed = false;
    }

    setSpeaking(source);
    try {
      await speakWithBackend(phrase, source);
      log("voice", "backend speaking", { source, chars: phrase.length });
      return { ok: true, backend: true };
    } catch (backendErr) {
      const backendReason = setBackendFailed(normalizeReason(backendErr), source);
      try {
        speakWithBrowserFallback(phrase, source);
        log("voice", "browser fallback speaking", { source, backendReason });
        return { ok: true, backend: false, fallback: true, backendReason };
      } catch (fallbackErr) {
        const reason = setVoiceUnavailable(`browser_fallback_failed: ${normalizeReason(fallbackErr)}`, source);
        releaseLocks(source);
        return { ok: false, reason, backendReason };
      }
    }
  }

  function canSpeakRepFeedback(now = Date.now()) {
    return Boolean(state.repFeedbackAllowed && now - state.lastRepFeedbackAt > GOOD_REP_COOLDOWN_MS);
  }

  function speakRepFeedback(text, source = "rep") {
    const now = Date.now();
    if (!canSpeakRepFeedback(now)) return Promise.resolve({ ok: false, skipped: true, reason: "cue_throttled" });
    state.lastRepFeedbackAt = now;
    return speak(text, source);
  }

  function speakWorkoutIntro(exercise) {
    const name = exercise?.name || "your workout";
    const sets = exercise?.sets || 1;
    const reps = exercise?.targetReps || 10;
    const tempo = exercise?.tempo || "3-1-1";
    return speak(`Starting ${name}. ${sets} sets of ${reps}. Tempo ${tempo}.`, "rep");
  }

  function configure(config = {}) {
    refs = { ...refs, ...(config.refs || {}) };
    deps = { ...deps, ...(config.deps || {}) };
    ensureAudioPlayer();
    initVoiceDropdown();
    updateVoiceCapabilityStatus();
    state.configured = true;
    setReady("configure");
    log("coach", "configured", { hasVoiceUrl: Boolean(deps.voiceUrl), hasSpeechSynth: "speechSynthesis" in global });
    return snapshot();
  }

  function setMuted(muted) {
    state.muted = Boolean(muted);
    if (refs.muteBtn) refs.muteBtn.textContent = state.muted ? "🔇 Unmute" : "🔊 Mute";
    if (state.muted) {
      stopAllSpeech();
      setVoiceUnavailable("muted", "mute-toggle");
    } else {
      setReady("mute-toggle");
    }
    return state.muted;
  }

  function toggleMuted() {
    return setMuted(!state.muted);
  }

  function snapshot() {
    return { ...state };
  }

  global.CoachRuntime = {
    configure,
    speak,
    speakRepFeedback,
    speakWorkoutIntro,
    speakSetStarted: (setNumber) => speak(`Rest is over. Start set ${setNumber}.`, "rep"),
    speakExerciseStarted: (exercise) => speak(`Next exercise: ${exercise?.name || "next exercise"}.`, "rep"),
    speakWorkoutCompleted: () => speak("Workout complete. Strong work today.", "rep"),
    canSpeakRepFeedback,
    unlockAudioOnce,
    stopAllSpeech,
    setMuted,
    toggleMuted,
    setReady,
    setSpeaking,
    setVoiceUnavailable,
    setBackendFailed,
    getState: snapshot
  };
})(typeof window !== "undefined" ? window : globalThis);
