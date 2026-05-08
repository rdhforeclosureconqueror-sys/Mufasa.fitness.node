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
    lastSource: null,
    listening: false,
    lastMicError: null,
    lastTranscript: "",
    recognitionSupported: false,
    chatBusy: false,
    lastChatError: null,
    lastQuestion: "",
    lastAnswer: ""
  };

  let refs = {};
  let deps = {};
  let ttsPlayer = null;
  let recognition = null;

  function log(channel, message, details) {
    const tag = channel === "voice" ? "[VOICE_RUNTIME]"
      : channel === "maat" ? "[MAAT_STATUS]"
        : channel === "recognition" ? "[VOICE_RECOGNITION]"
          : channel === "mic" ? "[MIC_RUNTIME]"
            : channel === "command" ? "[COACH_COMMAND]"
              : channel === "chat" ? "[COACH_CHAT]"
                : channel === "ask" ? "[ASK_COACH]"
                  : channel === "response" ? "[COACH_RESPONSE]"
                    : "[COACH_RUNTIME]";
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
      setClass(refs.brainStatusEl, options.mode || (["Coach ready", "Speaking", "Listening", "Thinking"].includes(statusText) ? "ok" : "bad"));
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


  function getChatUrl() {
    return deps.askUrl || deps.chatUrl || null;
  }

  function addChatLog(kind, text) {
    const line = String(text || "").trim();
    if (!line) return;
    if (typeof deps.addLog === "function") {
      deps.addLog(kind, line);
      return;
    }
    const logEl = refs.logEl || global.document?.getElementById?.("coach-log");
    if (!logEl || !global.document?.createElement) return;
    const div = global.document.createElement("div");
    div.className = `log-line ${kind}`;
    div.textContent = line;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setChatError(reason, source = "chat") {
    const normalized = normalizeReason(reason);
    state.lastChatError = normalized;
    setCoachStatus(`Coach chat error: ${normalized}`, { mode: "bad", chipText: "Ma’at 2.0: chat error", source });
    log("chat", "visible error", { error: normalized, source });
    addChatLog("system", `Coach chat error: ${normalized}`);
    return normalized;
  }

  function setChatBusy(isBusy) {
    state.chatBusy = Boolean(isBusy);
    if (refs.askBtn) refs.askBtn.disabled = state.chatBusy;
    if (refs.questionInput) refs.questionInput.setAttribute?.("aria-busy", state.chatBusy ? "true" : "false");
    if (state.chatBusy) setCoachStatus("Thinking", { mode: "ok", chipText: "Ma’at 2.0: thinking", source: "chat" });
  }

  function buildChatContext(options = {}) {
    const context = options.context && typeof options.context === "object" ? options.context : {};
    return {
      ...(context || {}),
      profile: deps.getProfile?.() || context.profile || null,
      userId: deps.getUserId?.() || context.userId || null,
      source: options.source || context.source || "typed-chat"
    };
  }

  function buildAskPayload(question, options = {}) {
    const context = buildChatContext(options);
    return {
      question,
      q: question,
      message: question,
      context,
      user_id: context.userId || undefined,
      profile: context.profile || undefined
    };
  }

  function extractCoachAnswer(payload) {
    if (typeof payload === "string") return payload;
    if (!payload || typeof payload !== "object") return "";
    return payload.answer
      || payload.response
      || payload.reply
      || payload.message
      || payload.text
      || payload?.data?.answer
      || payload?.data?.response
      || payload?.data?.reply
      || payload?.result?.answer
      || payload?.result?.response
      || "";
  }

  function fallbackCoachResponse(question, reason) {
    const topic = String(question || "your question").trim();
    const prefix = reason ? `I could not reach the coach backend (${reason}). ` : "";
    if (/\b(squat|knee|hip|ankle)\b/i.test(topic)) {
      return `${prefix}For now: keep your feet rooted, knees tracking over toes, ribs stacked over hips, and move in a pain-free range. If pain shows up, stop and choose a simpler variation.`;
    }
    if (/\b(workout|plan|program|today|exercise)\b/i.test(topic)) {
      return `${prefix}For now: choose a controlled full-body session, warm up first, keep two reps in reserve, and log how each set feels so Ma’at can adjust when the backend returns.`;
    }
    return `${prefix}I can still help locally: ask for a specific exercise cue, workout adjustment, or recovery suggestion, and I’ll keep the guidance conservative until the backend is available.`;
  }

  async function callCoachBackend(question, options = {}) {
    const url = getChatUrl();
    if (!url) throw new Error("coach_chat_url_missing");
    if (typeof global.fetch !== "function") throw new Error("fetch_unavailable");
    const authToken = deps.getAuthToken?.();
    const res = await global.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify(buildAskPayload(question, options))
    });
    const contentType = res.headers?.get?.("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");
    if (!res.ok) {
      const message = extractCoachAnswer(payload) || (typeof payload === "string" ? payload : "") || `request_failed_${res.status}`;
      throw new Error(message);
    }
    const answer = extractCoachAnswer(payload);
    if (!answer) throw new Error("empty_coach_response");
    return { answer: String(answer), payload };
  }

  async function askCoach(question, options = {}) {
    const cleaned = String(question || "").trim();
    log("ask", "received", { hasQuestion: Boolean(cleaned), source: options.source || options.context?.source || "typed-chat" });
    if (!cleaned) return { ok: false, skipped: true, reason: "empty_question" };
    state.lastQuestion = cleaned;
    state.lastChatError = null;
    if (refs.questionInput && refs.questionInput.value.trim() === cleaned) refs.questionInput.value = "";
    addChatLog("user", `You: ${cleaned}`);
    setChatBusy(true);
    try {
      const backend = await callCoachBackend(cleaned, options);
      state.lastAnswer = backend.answer;
      addChatLog("coach", `Ma’at 2.0: ${backend.answer}`);
      log("response", "backend", { chars: backend.answer.length });
      if (options.speak !== false) speak(backend.answer, "llm").catch((err) => {
        log("voice", "chat speech failed", normalizeReason(err));
      });
      setReady("chat-response");
      return { ok: true, answer: backend.answer, payload: backend.payload, fallback: false };
    } catch (err) {
      const reason = setChatError(err, "chat-backend");
      if (options.fallback === false) return { ok: false, error: reason };
      const answer = deps.localCoachResponse?.(cleaned, { reason, context: buildChatContext(options) }) || fallbackCoachResponse(cleaned, reason);
      state.lastAnswer = answer;
      addChatLog("coach", `Ma’at 2.0: ${answer}`);
      log("response", "local fallback", { reason, chars: answer.length });
      if (options.speak !== false) speak(answer, "llm").catch((speechErr) => {
        log("voice", "fallback speech failed", normalizeReason(speechErr));
      });
      return { ok: true, answer, fallback: true, error: reason };
    } finally {
      setChatBusy(false);
    }
  }

  function handleTypedChatSubmit(event) {
    event?.preventDefault?.();
    const value = refs.questionInput?.value || "";
    log("chat", "submit", { hasValue: Boolean(String(value).trim()) });
    return askCoach(value, { source: "typed-chat" });
  }

  function bindTypedChatHandlers() {
    if (refs.askBtn) refs.askBtn.onclick = handleTypedChatSubmit;
    if (refs.questionInput && !refs.questionInput.__coachRuntimeKeydownBound) {
      refs.questionInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.shiftKey) return;
        handleTypedChatSubmit(event);
      });
      refs.questionInput.__coachRuntimeKeydownBound = true;
    }
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

  function getSpeechRecognitionClass() {
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }

  function updateListenButton() {
    if (!refs.listenBtn) return;
    refs.listenBtn.textContent = state.listening ? "🛑 Voice Off" : "🎙️ Voice On";
    refs.listenBtn.setAttribute?.("aria-pressed", state.listening ? "true" : "false");
  }

  function setListeningStatus(text, ok = true) {
    setVoiceSupport(text, ok);
    log("mic", "status", { listening: state.listening, status: text, ok });
  }

  function updateVoiceCapabilityStatus() {
    const hasSpeechSynth = "speechSynthesis" in global;
    const hasSpeechRecognition = Boolean(getSpeechRecognitionClass());
    state.recognitionSupported = hasSpeechRecognition;
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

  function setMicFailure(reason, source = "mic") {
    const normalized = normalizeReason(reason);
    state.lastMicError = normalized;
    state.listening = false;
    updateListenButton();
    setListeningStatus(`Mic error: ${normalized}`, false);
    setCoachStatus(`Mic error: ${normalized}`, { mode: "bad", chipText: "Ma’at 2.0: mic error", source });
    deps.addLog?.("system", `STT error: ${normalized}`);
    log("mic", "failure", { error: normalized, source });
    return normalized;
  }

  function dispatchCoachCommand(message, transcript) {
    const command = String(message || "").trim();
    if (!command) return false;
    deps.addLog?.("you", `🎙️ ${transcript}`);
    stopAllSpeech();
    log("command", "dispatch", { command, transcript });
    const dispatcher = deps.dispatchCommand || deps.askCoach || global.askCoach;
    if (typeof dispatcher !== "function") {
      deps.addLog?.("system", "Voice command heard, but no coach command handler is available.");
      log("command", "missing dispatcher", { command });
      return false;
    }
    try {
      dispatcher(command, { transcript, source: "speech-recognition" });
      return true;
    } catch (err) {
      const reason = normalizeReason(err);
      deps.addLog?.("system", `Coach command failed: ${reason}`);
      log("command", "dispatch failed", { error: reason, command });
      return false;
    }
  }

  function handleRecognitionResult(event) {
    const results = event?.results;
    const transcript = results?.[results.length - 1]?.[0]?.transcript?.trim?.() || "";
    if (!transcript || transcript === state.lastTranscript) return;
    state.lastTranscript = transcript;
    log("recognition", "transcript", { transcript });

    const lower = transcript.toLowerCase();
    if (!lower.includes("mufasa") && !lower.includes("coach")) return;
    const cleaned = lower.replace("hey", "").replace("mufasa", "").replace("coach", "").trim();
    const message = cleaned || "give me a quick status update on my workout.";
    dispatchCoachCommand(message, transcript);
  }

  function ensureRecognition() {
    if (recognition) return recognition;
    const SpeechRecognitionClass = getSpeechRecognitionClass();
    state.recognitionSupported = Boolean(SpeechRecognitionClass);
    if (!SpeechRecognitionClass) {
      const reason = "speech_recognition_unsupported";
      setListeningStatus("Speech recognition not supported in this browser.", false);
      setCoachStatus("Mic unavailable: speech recognition not supported", { mode: "bad", chipText: "Ma’at 2.0: mic unavailable", source: "speech-recognition" });
      deps.addLog?.("system", "Speech recognition not supported in this browser.");
      log("recognition", "unsupported", { reason });
      return null;
    }

    recognition = new SpeechRecognitionClass();
    recognition.lang = deps.recognitionLang || "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = handleRecognitionResult;
    recognition.onerror = (event) => {
      const exactError = event?.error || normalizeReason(event);
      setMicFailure(exactError, "speech-recognition-error");
    };
    recognition.onend = () => {
      log("recognition", "ended", { listening: state.listening });
      if (!state.listening) return;
      try {
        recognition.start();
        log("recognition", "restarted");
      } catch (err) {
        setMicFailure(normalizeReason(err), "speech-recognition-restart");
      }
    };
    log("recognition", "created", { lang: recognition.lang, continuous: recognition.continuous });
    return recognition;
  }

  function startListening() {
    const stt = ensureRecognition();
    if (!stt) return { ok: false, reason: "speech_recognition_unsupported" };
    try {
      state.listening = true;
      state.lastMicError = null;
      state.lastTranscript = "";
      updateListenButton();
      stt.start();
      setListeningStatus("Listening for 'Mufasa' or 'Coach'...", true);
      setCoachStatus("Listening", { mode: "ok", chipText: "Ma’at 2.0: listening", source: "speech-recognition" });
      deps.addLog?.("system", "Listening for 'Mufasa' or 'Coach'...");
      log("mic", "started");
      return { ok: true, listening: true };
    } catch (err) {
      const reason = setMicFailure(normalizeReason(err), "speech-recognition-start");
      return { ok: false, reason };
    }
  }

  function stopListening() {
    state.listening = false;
    updateListenButton();
    try { recognition?.stop?.(); } catch (err) { log("mic", "stop failed", normalizeReason(err)); }
    setListeningStatus("Stopped listening.", true);
    setReady("speech-recognition-stopped");
    deps.addLog?.("system", "Stopped listening.");
    log("mic", "stopped");
    return { ok: true, listening: false };
  }

  function toggleListening() {
    log("mic", "toggle requested", { listening: state.listening });
    return state.listening ? stopListening() : startListening();
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
    updateListenButton();
    bindTypedChatHandlers();
    if (typeof global.askCoach !== "function" || global.askCoach.__coachRuntimeDelegator) {
      global.askCoach = askCoach;
      global.askCoach.__coachRuntimeDelegator = true;
    }
    state.configured = true;
    setReady("configure");
    log("coach", "configured", { hasVoiceUrl: Boolean(deps.voiceUrl), hasAskUrl: Boolean(getChatUrl()), hasTypedChat: Boolean(refs.askBtn && refs.questionInput), hasSpeechSynth: "speechSynthesis" in global, hasSpeechRecognition: state.recognitionSupported });
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
    askCoach,
    handleTypedChatSubmit,
    canSpeakRepFeedback,
    unlockAudioOnce,
    stopAllSpeech,
    toggleListening,
    startListening,
    stopListening,
    setMuted,
    toggleMuted,
    setReady,
    setSpeaking,
    setVoiceUnavailable,
    setBackendFailed,
    getState: snapshot
  };
})(typeof window !== "undefined" ? window : globalThis);
