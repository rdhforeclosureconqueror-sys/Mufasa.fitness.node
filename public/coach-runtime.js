(function initCoachRuntime(globalScope) {
  const global = globalScope || window;
  const DEFAULT_VOICES = ["alloy", "verse", "aria", "ember", "coral"];
  const GOOD_REP_COOLDOWN_MS = 2500;
  const DEFAULT_CONVERSATION_TIMEOUT_MS = 30000;
  const DEFAULT_CONVERSATION_WARNING_MS = 20000;

  const state = {
    configured: false,
    muted: true,
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
    conversationActive: false,
    conversationState: "IDLE",
    recognitionSupported: false,
    chatBusy: false,
    lastChatError: null,
    lastQuestion: "",
    lastAnswer: "",
    activeSpeech: null,
    warningIssued: false
  };

  let refs = {};
  let deps = {};
  let ttsPlayer = null;
  let recognition = null;
  let voiceActivation = null;
  let conversationTimer = null;
  let conversationWarningTimer = null;
  let recognitionActive = false;
  let utteranceSequence = 0;
  let activeSpeech = null;
  const lifecycleTrace = [];
  const TRACE_LIMIT = 100;

  function trace(module, event, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      module,
      event,
      state: {
        muted: state.muted,
        listening: state.listening,
        conversationState: state.conversationState,
        audioUnlocked: state.audioUnlocked,
        speechLock: state.speechLock
      },
      ...details,
      error: details.error ? normalizeReason(details.error) : null
    };
    lifecycleTrace.push(entry);
    if (lifecycleTrace.length > TRACE_LIMIT) lifecycleTrace.shift();
    console.debug("[SPEECH_LIFECYCLE]", entry);
    return entry;
  }

  function setConversationState(nextState, reason) {
    const previousState = state.conversationState;
    if (previousState === nextState) return;
    state.conversationState = nextState;
    state.conversationActive = nextState !== "IDLE";
    trace("conversation", "conversation.state_changed", { previousState, nextState, reason });
  }

  function clearConversationTimer() {
    if (conversationTimer != null) global.clearTimeout?.(conversationTimer);
    if (conversationWarningTimer != null) global.clearTimeout?.(conversationWarningTimer);
    conversationTimer = null;
    conversationWarningTimer = null;
  }

  function endConversation(reason = "ended") {
    clearConversationTimer();
    setConversationState("IDLE", reason);
  }

  function touchConversation(reason = "interaction") {
    if (!state.conversationActive) return;
    clearConversationTimer();
    const timeoutMs = Number(deps.conversationTimeoutMs) || DEFAULT_CONVERSATION_TIMEOUT_MS;
    const warningEnabled = deps.conversationWarningEnabled !== false;
    const warningMs = Number(deps.conversationWarningMs) || DEFAULT_CONVERSATION_WARNING_MS;
    state.warningIssued = false;
    if (warningEnabled && warningMs > 0 && warningMs < timeoutMs) {
      conversationWarningTimer = global.setTimeout?.(() => {
        if (!state.conversationActive || activeSpeech || state.warningIssued) return;
        state.warningIssued = true;
        trace("conversation", "conversation.warning_started");
        speak("I'm still here if you need me.", "system", { owner: "system", interruptible: false, timerNeutral: true });
      }, warningMs) ?? null;
      conversationWarningTimer?.unref?.();
    }
    conversationTimer = global.setTimeout?.(() => {
      if (activeSpeech) {
        touchConversation("speech-active-at-timeout");
        return;
      }
      trace("conversation", "conversation.timeout");
      const finish = () => { endConversation("inactivity-timeout"); stopRecognitionCleanly("inactivity-timeout"); };
      if (state.muted) finish();
      else speak("Okay, I'll stop listening.", "system", { owner: "system", interruptible: false, timerNeutral: true }).finally(finish);
    }, timeoutMs) ?? null;
    conversationTimer?.unref?.();
    trace("conversation", "timeout-armed", { reason, timeoutMs });
  }

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

  function tracePermissionState() {
    const query = global.navigator?.permissions?.query;
    if (typeof query !== "function") {
      trace("permission", "query-unavailable");
      return;
    }
    Promise.resolve(query.call(global.navigator.permissions, { name: "microphone" }))
      .then((status) => {
        trace("permission", "microphone-state", { permissionState: status?.state || "unknown" });
        if (status) status.onchange = () => trace("permission", "microphone-change", { permissionState: status.state || "unknown" });
      })
      .catch((error) => trace("permission", "query-error", { error }));
  }

  function traceSpeechSynthesis() {
    const synthesis = global.speechSynthesis;
    if (!synthesis || typeof synthesis.getVoices !== "function") {
      trace("tts-browser", "unavailable");
      return;
    }
    const reportVoices = (event) => {
      const voices = synthesis.getVoices() || [];
      trace("tts-browser", event, { voiceCount: voices.length, defaultVoice: voices.find((voice) => voice.default)?.name || null });
    };
    reportVoices("voices-initial");
    synthesis.addEventListener?.("voiceschanged", () => reportVoices("voiceschanged"));
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
    const sessionId = options.sessionId || context.sessionId || global.__ACTIVE_WORKOUT_STATE?.sessionId || null;
    const mode = options.mode || context.mode || "chat";
    const contextPayload = typeof context === "string" ? context : JSON.stringify(context || {});
    return {
      question,
      user_id: context.userId || undefined,
      session_id: sessionId,
      telemetry: options.telemetry || context.telemetry || null,
      context: contextPayload,
      mode,
      // Backward-compatible aliases for older chat services; canonical fields above match the Node proxy.
      q: question,
      message: question,
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
    const requestBody = buildAskPayload(question, options);
    console.log("[COACH_BACKEND_TRACE] /ask request", { url, body: requestBody });
    const res = await global.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify(requestBody)
    });
    const contentType = res.headers?.get?.("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[COACH_BACKEND_TRACE] /ask validation error", { url, status: res.status, body: requestBody, response: payload });
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

  function speechOwnerFor(source, options = {}) {
    if (options.owner) return options.owner;
    if (/conversation|llm/.test(source)) return "conversation";
    if (/guided/.test(source)) return "guided_coach";
    if (/rep|workout|cadence|encouragement/.test(source)) return "workout_voice";
    return "system";
  }

  function stopAllSpeech(reason = "explicit-cleanup") {
    if (activeSpeech) cancelActiveSpeech(reason, { acknowledge: false, force: true });
    try { global.speechSynthesis?.cancel?.(); } catch (err) { log("voice", "speechSynthesis cancel failed", normalizeReason(err)); }
    try {
      const player = ensureAudioPlayer();
      player?.pause?.();
      if (player) player.currentTime = 0;
    } catch (err) {
      log("voice", "audio player stop failed", normalizeReason(err));
    }
  }

  function cancelActiveSpeech(reason, options = {}) {
    const response = activeSpeech;
    if (!response || (!response.interruptible && !options.force) || response.cancelRequested) return false;
    response.cancelRequested = true;
    response.cancelReason = reason;
    response.controller?.abort?.();
    trace("speech", "speech.response_cancel_requested", { speechOwner: response.owner, utteranceId: response.id, cancellationReason: reason });
    try { global.speechSynthesis?.cancel?.(); } catch (error) { trace("speech", "speech.cancel_error", { error, utteranceId: response.id }); }
    try { const player = ensureAudioPlayer(); player?.pause?.(); if (player) { player.currentTime = 0; player.removeAttribute?.("src"); } }
    catch (error) { trace("speech", "speech.cancel_error", { error, utteranceId: response.id }); }
    response.settle?.({ cancelled: true });
    finishSpeech(response, "cancelled");
    if (options.acknowledge && !response.acknowledged && !state.muted && state.listening) {
      response.acknowledged = true;
      trace("speech", "speech.stop_acknowledged", { utteranceId: response.id });
      speak("Stopped.", "system", { owner: "system", interruptible: false }).catch(() => {});
    }
    return true;
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
      trace("audio-context", "created", { contextState: ctx.state || "unknown" });
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
      await ctx.resume();
      trace("audio-context", "resumed", { contextState: ctx.state || "unknown" });
      state.audioUnlocked = true;
      setVoiceSupport("Audio unlocked ✅ Voice will play now.", true);
      log("voice", "audio unlocked");
      return true;
    } catch (err) {
      trace("audio-context", "resume-error", { error: err });
      setVoiceUnavailable(`audio_unlock_failed: ${normalizeReason(err)}`, "unlock");
      return false;
    }
  }

  function releaseLocks(source, timerNeutral = false) {
    if (source === "llm") {
      state.speechLock = false;
      state.repFeedbackAllowed = true;
    }
    if (state.lastStatus === "Speaking") setReady("speech-ended");
    if (state.conversationActive) {
      setConversationState("LISTENING", "speech-ended");
      if (!timerNeutral) touchConversation("assistant-response-ended");
    }
  }

  function finishSpeech(response, completionReason = "completed") {
    if (!response || response.finished) return;
    response.finished = true;
    if (activeSpeech === response) activeSpeech = null;
    state.activeSpeech = null;
    trace("speech", completionReason === "cancelled" ? "speech.response_cancelled" : "speech.response_completed", {
      speechOwner: response.owner, utteranceId: response.id, cancellationReason: response.cancelReason || null
    });
    releaseLocks(response.source, response.timerNeutral);
  }

  async function speakWithBackend(text, source, response) {
    if (global.__workoutPerformance) global.__workoutPerformance.voiceRequests += 1;
    const url = deps.voiceUrl;
    if (!url) throw new Error("/api/speak url missing");
    if (typeof global.fetch !== "function") throw new Error("fetch_unavailable");
    const authToken = deps.getAuthToken?.();
    const voice = refs.voiceSelectEl?.value || DEFAULT_VOICES[0];
    const format = "mp3";
    const requestBody = { text, voice, format };
    trace("tts-backend", "request", { source, voice, textLength: text.length });
    console.log("[COACH_BACKEND_TRACE] /api/speak request", { url, operation: "synthesize_speech", textLength: requestBody.text.length });
    const controller = typeof global.AbortController === "function" ? new global.AbortController() : null;
    response.controller = controller;
    const timeoutId = controller ? global.setTimeout?.(() => controller.abort(), 8000) : null;
    let res;
    try { res = await global.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify(requestBody),
      ...(controller ? { signal: controller.signal } : {})
    }); } finally { if (timeoutId != null) global.clearTimeout?.(timeoutId); }
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      console.error("[COACH_BACKEND_TRACE] /api/speak validation error", { url, status: res.status, operation: "synthesize_speech_failed" });
      throw new Error(`HTTP ${res.status}${errTxt ? ` ${errTxt}` : ""}`);
    }
    const blob = await res.blob();
    if (response.cancelRequested) throw new Error("speech_cancelled");
    trace("tts-backend", "response", { source, bytes: blob.size ?? null });
    const urlObj = global.URL?.createObjectURL?.(blob);
    if (!urlObj) throw new Error("object_url_unavailable");
    const player = ensureAudioPlayer();
    if (!player) throw new Error("audio_player_unavailable");
    player.src = urlObj;
    await new Promise(async (resolve, reject) => {
      response.settle = resolve;
      player.onended = () => {
        trace("audio-player", "ended", { source });
        global.URL?.revokeObjectURL?.(urlObj);
        finishSpeech(response);
        resolve();
      };
      player.onerror = () => {
        trace("audio-player", "error", { source, error: "audio_playback_error" });
        global.URL?.revokeObjectURL?.(urlObj);
        setVoiceUnavailable("audio_playback_error", source);
        reject(new Error("audio_playback_error"));
      };
      try { await player.play(); trace("audio-player", "playing", { source }); } catch (error) { trace("audio-player", "play-rejected", { source, error }); reject(error); }
    });
  }

  function speakWithBrowserFallback(text, source, response) {
    if (!("speechSynthesis" in global) || typeof global.SpeechSynthesisUtterance !== "function") {
      throw new Error("browser_speech_synthesis_unavailable");
    }
    const utterance = new global.SpeechSynthesisUtterance(text);
    response.utterance = utterance;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    return new Promise((resolve, reject) => {
      utterance.onstart = () => trace("tts-browser", "start", { source });
      response.settle = resolve;
      utterance.onend = () => { trace("tts-browser", "end", { source }); finishSpeech(response); resolve(); };
      utterance.onerror = (event) => {
        trace("tts-browser", "error", { source, error: event?.error || "unknown_error" });
        setVoiceUnavailable(`browser_speech_error: ${event?.error || "unknown_error"}`, source);
        finishSpeech(response, response.cancelRequested ? "cancelled" : "completed");
        reject(new Error(event?.error || "browser_speech_error"));
      };
      global.speechSynthesis.speak(utterance);
      trace("tts-browser", "queued", { source, textLength: text.length });
    });
  }

  async function speak(text, source = "system", options = {}) {
    const phrase = String(text || "").trim();
    if (!phrase) return { ok: false, skipped: true, reason: "empty_text" };
    state.lastSource = source;
    if (state.muted) {
      const reason = setVoiceUnavailable("muted", source);
      return { ok: false, reason };
    }
    if (activeSpeech) return { ok: false, skipped: true, reason: "speech_in_progress" };
    if (state.speechLock && source === "rep") return { ok: false, skipped: true, reason: "speech_lock" };

    const unlocked = await unlockAudioOnce();
    if (!unlocked) return { ok: false, reason: state.lastVoiceError || "audio_unlock_failed" };

    const response = {
      id: `speech-${++utteranceSequence}`, source, owner: speechOwnerFor(source, options),
      interruptible: options.interruptible ?? /conversation|llm|guided/.test(source),
      startedAt: new Date().toISOString(), cancelRequested: false, finished: false, timerNeutral: Boolean(options.timerNeutral)
    };
    activeSpeech = response;
    state.activeSpeech = { id: response.id, source: response.owner, interruptible: response.interruptible, startedAt: response.startedAt };
    trace("speech", "speech.response_started", { speechOwner: response.owner, utteranceId: response.id, interruptible: response.interruptible });
    if (state.conversationActive && state.listening) {
      if (!response.timerNeutral) clearConversationTimer();
      setConversationState("RESPONDING", source);
      trace("speech", "speech.interrupt_mode_started", { speechOwner: response.owner, utteranceId: response.id });
    }
    if (source === "llm") {
      state.speechLock = true;
      state.repFeedbackAllowed = false;
    }

    setSpeaking(source);
    try {
      await speakWithBackend(phrase, source, response);
      if (response.cancelRequested) return { ok: false, cancelled: true, reason: response.cancelReason };
      log("voice", "backend speaking", { source, chars: phrase.length });
      return { ok: true, backend: true };
    } catch (backendErr) {
      if (global.__workoutPerformance && /abort/i.test(normalizeReason(backendErr))) global.__workoutPerformance.abortedVoiceRequests += 1;
      if (response.cancelRequested) return { ok: false, cancelled: true, reason: response.cancelReason };
      const backendReason = setBackendFailed(normalizeReason(backendErr), source);
      try {
        await speakWithBrowserFallback(phrase, source, response);
        log("voice", "browser fallback speaking", { source, backendReason });
        return { ok: true, backend: false, fallback: true, backendReason };
      } catch (fallbackErr) {
        const reason = setVoiceUnavailable(`browser_fallback_failed: ${normalizeReason(fallbackErr)}`, source);
        finishSpeech(response, response.cancelRequested ? "cancelled" : "completed");
        return { ok: false, reason, backendReason };
      }
    }
  }

  function setMicFailure(reason, source = "mic") {
    const normalized = normalizeReason(reason);
    state.lastMicError = normalized;
    state.listening = false;
    recognitionActive = false;
    endConversation("mic-failure");
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
    log("command", "dispatch", { command, transcript });
    const dispatcher = deps.dispatchCommand || deps.askCoach || global.askCoach;
    if (typeof dispatcher !== "function") {
      deps.addLog?.("system", "Voice command heard, but no coach command handler is available.");
      log("command", "missing dispatcher", { command });
      return false;
    }
    try {
      setConversationState("PROCESSING", "intent-dispatched");
      touchConversation("intent-dispatched");
      Promise.resolve(dispatcher(command, { transcript, source: "speech-recognition" }))
        .then(() => {
          if (state.conversationActive && state.conversationState === "PROCESSING") {
            setConversationState("LISTENING", "intent-processed");
            touchConversation("intent-processed");
          }
        })
        .catch((err) => log("command", "async dispatch failed", { error: normalizeReason(err), command }));
      return true;
    } catch (err) {
      const reason = normalizeReason(err);
      deps.addLog?.("system", `Coach command failed: ${reason}`);
      log("command", "dispatch failed", { error: reason, command });
      return false;
    }
  }

  function normalizedWords(transcript) {
    return String(transcript || "").toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']+/g, " ").trim().split(/\s+/).filter(Boolean);
  }

  function classifySpeechIntent(transcript) {
    const words = normalizedWords(transcript);
    const joined = words.join(" ");
    if (["goodbye", "cancel", "stop listening", "end conversation", "that's all", "that is all"].includes(joined)) return "exit";
    const prefixes = [[], ["mufasa"], ["coach"], ["hey", "mufasa"], ["hey", "coach"]];
    if (prefixes.some((prefix) => words.length === prefix.length + 1 && prefix.every((word, index) => words[index] === word) && words.at(-1) === "stop")) return "stop";
    return "other";
  }

  function handleRecognitionResult(event) {
    trace("stt", "result", { resultIndex: event?.resultIndex ?? null, resultCount: event?.results?.length ?? 0 });
    const results = event?.results;
    const transcript = results?.[results.length - 1]?.[0]?.transcript?.trim?.() || "";
    if (!transcript || transcript === state.lastTranscript) return;
    state.lastTranscript = transcript;
    log("recognition", "transcript classified", { classification: "recognized_transcript" });

    const lower = transcript.toLowerCase();
    const intent = classifySpeechIntent(transcript);
    if (activeSpeech && state.conversationActive) {
      if (intent === "exit") {
        cancelActiveSpeech("conversation-exit", { force: true });
        endConversation("user-exit");
        return;
      }
      if (intent === "stop") {
        trace("speech", "speech.stop_intent_detected", { normalizedIntent: "stop", speechOwner: activeSpeech.owner, utteranceId: activeSpeech.id });
        setConversationState("STOPPING", "stop-intent");
        cancelActiveSpeech("member-stop", { acknowledge: true });
        return;
      }
      trace("speech", "speech.transcript_ignored_during_response", { normalizedIntent: "ignored_non_stop_transcript", speechOwner: activeSpeech.owner, utteranceId: activeSpeech.id });
      return;
    }
    if (state.conversationActive && intent === "exit") {
      endConversation("user-exit");
      return;
    }
    const hasWakePhrase = lower.includes("mufasa") || lower.includes("coach");
    if (!hasWakePhrase && !state.conversationActive) return;
    if (hasWakePhrase) {
      setConversationState("WAKE_DETECTED", "wake-phrase");
      touchConversation("wake-phrase");
    }
    const cleaned = hasWakePhrase
      ? lower.replace(/hey coach/g, "").replace(/hey/g, "").replace(/mufasa/g, "").replace(/coach/g, "").trim()
      : transcript.trim();
    if (!cleaned) {
      speak("Hi, how can I help?", "conversation-wake")
        .catch((err) => log("voice", "wake greeting failed", normalizeReason(err)));
      return;
    }
    const message = cleaned;
    dispatchCoachCommand(message, transcript);
  }

  function ensureRecognition() {
    if (recognition) return recognition;
    const SpeechRecognitionClass = getSpeechRecognitionClass();
    state.recognitionSupported = Boolean(SpeechRecognitionClass);
    if (!SpeechRecognitionClass) {
      const reason = "speech_recognition_unsupported";
      const message = "Speech recognition not supported in this browser. On iPhone/Safari, Web Speech API dictation may be unavailable.";
      setListeningStatus(message, false);
      setCoachStatus("Mic unavailable: speech recognition not supported", { mode: "bad", chipText: "Ma’at 2.0: mic unavailable", source: "speech-recognition" });
      deps.addLog?.("system", message);
      log("recognition", "unsupported", { reason });
      return null;
    }

    recognition = new SpeechRecognitionClass();
    recognition.lang = deps.recognitionLang || "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    const traceRecognitionEvent = (eventName) => (event) => trace("stt", eventName, {
      error: eventName === "error" ? (event?.error || "unknown_error") : null,
      resultIndex: eventName === "result" ? (event?.resultIndex ?? null) : undefined
    });
    recognition.onstart = (event) => {
      recognitionActive = true;
      traceRecognitionEvent("start")(event);
    };
    recognition.onaudiostart = traceRecognitionEvent("audiostart");
    recognition.onsoundstart = traceRecognitionEvent("soundstart");
    recognition.onspeechstart = traceRecognitionEvent("speechstart");
    recognition.onresult = handleRecognitionResult;
    recognition.onnomatch = traceRecognitionEvent("nomatch");
    recognition.onspeechend = traceRecognitionEvent("speechend");
    recognition.onsoundend = traceRecognitionEvent("soundend");
    recognition.onaudioend = traceRecognitionEvent("audioend");
    recognition.onerror = (event) => {
      const exactError = event?.error || normalizeReason(event);
      trace("stt", "error", { error: exactError, message: event?.message || null });
      setMicFailure(exactError, "speech-recognition-error");
    };
    recognition.onend = () => {
      recognitionActive = false;
      trace("stt", "end");
      log("recognition", "ended", { listening: state.listening });
      if (!state.listening) return;
      if (activeSpeech) trace("recognition", "recognition.resume_requested", { speechOwner: activeSpeech.owner, utteranceId: activeSpeech.id });
      try {
        if (recognitionActive) return;
        recognition.start();
        trace("recognition", "recognition.resumed");
        log("recognition", "restarted");
      } catch (err) {
        setMicFailure(normalizeReason(err), "speech-recognition-restart");
      }
    };
    log("recognition", "created", { lang: recognition.lang, continuous: recognition.continuous });
    return recognition;
  }

  function startListening() {
    tracePermissionState();
    const stt = ensureRecognition();
    if (!stt) return { ok: false, reason: "speech_recognition_unsupported" };
    try {
      state.listening = true;
      state.lastMicError = null;
      state.lastTranscript = "";
      endConversation("listening-started");
      updateListenButton();
      if (!recognitionActive) stt.start();
      trace("stt", "start-requested");
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

  function stopRecognitionCleanly(reason = "voice-off") {
    state.listening = false;
    recognitionActive = false;
    endConversation(reason);
    updateListenButton();
    try { recognition?.stop?.(); trace("stt", "stop-requested"); } catch (err) { trace("stt", "stop-error", { error: err }); log("mic", "stop failed", normalizeReason(err)); }
    setListeningStatus("Stopped listening.", true);
    setReady("speech-recognition-stopped");
    deps.addLog?.("system", "Stopped listening.");
    log("mic", "stopped");
    return { ok: true, listening: false };
  }

  function stopListening() {
    cancelActiveSpeech("voice-off", { force: true });
    const result = stopRecognitionCleanly("voice-off");
    setReady("speech-recognition-stopped");
    return result;
  }

  function toggleListening() {
    log("mic", "toggle requested", { listening: state.listening });
    return state.listening ? stopListening() : startListening();
  }

  function teardownVoiceServices(reason = "application-teardown") {
    if (state.listening || state.conversationActive) stopListening();
    else endConversation(reason);
    stopAllSpeech();
    trace("voice-control", "services-torn-down", { reason });
  }

  function activateVoice() {
    if (voiceActivation) return voiceActivation;
    if (state.listening && !state.muted) {
      trace("voice-control", "activation-already-active");
      return Promise.resolve({ ok: true, listening: true, alreadyActive: true });
    }
    voiceActivation = (async () => {
      trace("voice-control", "activation-requested");
      // Startup remains muted. Only this explicit user action enables output, and
      // it must do so before the iOS audio prime is attempted.
      setMuted(false);
      trace("voice-control", "unmuted");
      const unlocked = await unlockAudioOnce();
      const speech = unlocked
        ? await speak("Voice is on.", "rep")
        : { ok: false, reason: state.lastVoiceError || "audio_unlock_failed" };
      const listening = startListening();
      trace("voice-control", "activation-complete", {
        speechOk: Boolean(speech?.ok),
        listeningOk: Boolean(listening?.ok)
      });
      return { ok: Boolean(listening?.ok), unlocked, speech, ...listening };
    })().finally(() => { voiceActivation = null; });
    return voiceActivation;
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
    if (state.configured) {
      if (new URLSearchParams(global.location?.search || '').get('debugWorkoutPerformance') === '1') console.info('[WORKOUT_PERF] duplicate voice runtime initialization ignored');
      return snapshot();
    }
    refs = { ...refs, ...(config.refs || {}) };
    deps = { ...deps, ...(config.deps || {}) };
    ensureAudioPlayer();
    initVoiceDropdown();
    updateVoiceCapabilityStatus();
    traceSpeechSynthesis();
    updateListenButton();
    bindTypedChatHandlers();
    global.addEventListener?.("pagehide", () => teardownVoiceServices("pagehide"), { once: true });
    if (typeof global.askCoach !== "function" || global.askCoach.__coachRuntimeDelegator) {
      global.askCoach = askCoach;
      global.askCoach.__coachRuntimeDelegator = true;
    }
    state.configured = true;
    setMuted(true);
    setReady("configure");
    log("coach", "configured", { hasVoiceUrl: Boolean(deps.voiceUrl), hasAskUrl: Boolean(getChatUrl()), hasTypedChat: Boolean(refs.askBtn && refs.questionInput), hasSpeechSynth: "speechSynthesis" in global, hasSpeechRecognition: state.recognitionSupported });
    return snapshot();
  }

  function setMuted(muted) {
    state.muted = Boolean(muted);
    if (refs.muteBtn) refs.muteBtn.textContent = state.muted ? "🔇 Unmute" : "🔊 Mute";
    if (state.muted) {
      stopAllSpeech("voice-off");
      if (state.listening || state.conversationActive) stopRecognitionCleanly("voice-off");
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
    activateVoice,
    startListening,
    stopListening,
    teardownVoiceServices,
    setMuted,
    toggleMuted,
    setReady,
    setSpeaking,
    setVoiceUnavailable,
    setBackendFailed,
    getState: snapshot,
    getSpeechTrace: () => lifecycleTrace.map((entry) => ({ ...entry, state: { ...entry.state } }))
  };
})(typeof window !== "undefined" ? window : globalThis);
