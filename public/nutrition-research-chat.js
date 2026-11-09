(function () {
  "use strict";
  const button = document.getElementById("nutritionResearchAsk");
  const question = document.getElementById("nutritionResearchQuestion");
  const output = document.getElementById("nutritionResearchAnswer");
  const deepButton = document.getElementById("nutritionResearchDeep");
  const referencesButton = document.getElementById("nutritionResearchReferences");
  if (!button || !question || !output) return;
  let lastQuestion = "";
  let lastAnswer = "";
  let conversationContext = "";
  let recording = false;
  let wakeArmed = true;
  let wakeExpiryTimer = null;
  const WAKE_PATTERN = /(?:^|[,.!?\s])(?:hey\s+)?mufasa\b\s*[,!?.-]*/i;
  const WAKE_WINDOW_MS = 30000;
  const mic = document.getElementById("nutritionResearchMic");
  const listen = document.getElementById("nutritionResearchListen");
  const stop = document.getElementById("nutritionResearchStop");
  const voiceStatus = document.getElementById("nutritionResearchVoiceStatus");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  const voiceMessage = message => { if (voiceStatus) voiceStatus.textContent = message; };

  const setMicUi = active => {
    if (!mic) return;
    mic.setAttribute("aria-pressed", String(active));
    mic.textContent = active ? "Stop listening" : "🎙️ Turn on “Hey Mufasa”";
  };
  const clearWakeWindow = () => {
    if (wakeExpiryTimer) window.clearTimeout(wakeExpiryTimer);
    wakeExpiryTimer = null;
  };
  const armWakeWindow = () => {
    wakeArmed = false;
    clearWakeWindow();
    wakeExpiryTimer = window.setTimeout(() => {
      wakeArmed = true;
      voiceMessage("Still listening. Say “Hey Mufasa” when you’re ready.");
    }, WAKE_WINDOW_MS);
  };
  const stopWakeListening = () => {
    recording = false;
    wakeArmed = true;
    clearWakeWindow();
    try { recognition?.stop(); } catch (_) {}
    setMicUi(false);
  };
  const startWakeListening = () => {
    if (!recognition) return;
    recording = true;
    wakeArmed = true;
    clearWakeWindow();
    try {
      recognition.start();
      setMicUi(true);
      voiceMessage("Listening for “Hey Mufasa”…");
    } catch (error) {
      if (error?.name !== "InvalidStateError") {
        recording = false;
        setMicUi(false);
        voiceMessage("Unable to start the microphone. Try again.");
      }
    }
  };
  const submitSpokenQuestion = spoken => {
    const clean = String(spoken || "").trim();
    if (!clean) {
      voiceMessage("I heard “Hey Mufasa.” What nutrition question would you like to ask?");
      return;
    }
    question.value = clean;
    voiceMessage("Question captured. Nutrition Intelligence is thinking…");
    stopWakeListening();
    ask("QUICK");
  };

  if (mic) {
    if (!SpeechRecognition) {
      mic.disabled = true;
      voiceMessage("Speech input isn't supported in this browser. You can still type your question.");
    } else {
      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = event => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          if (!event.results[index]?.isFinal) continue;
          const transcript = event.results[index]?.[0]?.transcript?.trim() || "";
          if (!transcript) continue;
          if (wakeArmed) {
            const match = transcript.match(WAKE_PATTERN);
            if (!match) {
              voiceMessage("Listening for “Hey Mufasa”…");
              continue;
            }
            const remainder = transcript.slice((match.index || 0) + match[0].length).trim();
            armWakeWindow();
            if (remainder) submitSpokenQuestion(remainder);
            else voiceMessage("I’m listening. Ask your nutrition question.");
          } else {
            submitSpokenQuestion(transcript);
          }
        }
      };
      recognition.onerror = event => {
        const reason = String(event?.error || "unknown");
        const guidance = reason === "not-allowed" || reason === "service-not-allowed"
          ? "Allow microphone and speech recognition access in Safari settings."
          : reason === "audio-capture"
            ? "The microphone could not be opened. Close other apps using it and try again."
            : reason === "network"
              ? "The iPhone speech recognition service could not connect. Try Safari or use keyboard dictation."
              : reason === "no-speech"
                ? "No speech was detected. I’m still listening for “Hey Mufasa”."
                : "Try again in Safari or use the iPhone keyboard microphone.";
        voiceMessage("Speech input failed (" + reason + "). " + guidance);
        if (reason === "not-allowed" || reason === "service-not-allowed" || reason === "audio-capture") {
          recording = false;
          setMicUi(false);
        }
      };
      recognition.onend = () => {
        if (!recording) { setMicUi(false); return; }
        window.setTimeout(() => {
          if (recording) startWakeListening();
        }, 250);
      };
      mic.addEventListener("click", () => {
        if (recording) stopWakeListening();
        else startWakeListening();
      });
    }
  }
  // Match Mufasa's configured backend voice via /api/speak, not device speech synthesis.
  let audioPlayer = null;
  let speechAbort = null;
  let playbackId = 0;
  let activeObjectUrl = null;
  const canSpeak = true;
  
  const stopAudio = () => {
    playbackId += 1;
    if (speechAbort) { speechAbort.abort(); speechAbort = null; }
    if (audioPlayer) { audioPlayer.pause(); audioPlayer.removeAttribute("src"); audioPlayer.load(); }
    if (activeObjectUrl) { URL.revokeObjectURL(activeObjectUrl); activeObjectUrl = null; }
    if (stop) stop.disabled = true;
  };
  const speechChunks = text => {
    const cleaned = String(text || "").replace(/[#*]/g, "").trim();
    const chunks = [];
    let remaining = cleaned;
    while (remaining.length) {
      if (remaining.length <= 950) { chunks.push(remaining); break; }
      const candidate = remaining.slice(0, 950);
      let cut = Math.max(candidate.lastIndexOf(". "), candidate.lastIndexOf("? "), candidate.lastIndexOf("! "), candidate.lastIndexOf(" "));
      if (cut < 300) cut = 950;
      else cut += 1;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    return chunks;
  };
  if (listen) listen.addEventListener("click", async () => {
    if (!lastAnswer) return;
    stopAudio();
    const currentId = playbackId;
    const token = window.AuthStateRuntime?.getAuthToken?.();
    if (!token) { voiceMessage("Sign in to listen to the AI voice."); return; }
    if (!audioPlayer) audioPlayer = new Audio();
    if (stop) stop.disabled = false;
    voiceMessage("Connecting to Mufasa AI voice service…");
    try {
      const origin = (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || location.origin).replace(/\/$/, "");
      for (const text of speechChunks(lastAnswer)) {
        if (currentId !== playbackId) return;
        speechAbort = new AbortController();
        const response = await fetch(origin + "/api/speak", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer " + token },
          body: JSON.stringify({ text, format: "mp3" }),
          signal: speechAbort.signal
        });
        if (!response.ok) throw new Error("AI voice service unavailable (" + response.status + ")");
        const type = response.headers.get("content-type") || "";
        if (!type.toLowerCase().startsWith("audio/")) throw new Error("Voice endpoint did not return audio");
        const blob = await response.blob();
        if (currentId !== playbackId) return;
        activeObjectUrl = URL.createObjectURL(blob);
        audioPlayer.src = activeObjectUrl;
        voiceMessage("Playing audio from Mufasa AI voice service.");
        await new Promise((resolve, reject) => {
          audioPlayer.onended = resolve;
          audioPlayer.onerror = () => reject(new Error("Audio playback failed"));
          audioPlayer.play().catch(reject);
        });
        URL.revokeObjectURL(activeObjectUrl);
        activeObjectUrl = null;
      }
      if (currentId === playbackId) voiceMessage("Finished reading.");
    } catch (error) {
      if (currentId === playbackId) voiceMessage(error.name === "NotAllowedError"
        ? "Tap Read answer again to allow audio playback."
        : "AI voice failed: " + String(error.message || "Unknown error").slice(0, 110));
    } finally {
      if (currentId === playbackId) { speechAbort = null; if (stop) stop.disabled = true; }
    }
  });
  if (stop) stop.addEventListener("click", () => { stopAudio(); voiceMessage("Reading stopped."); });

  // Render a small, safe Markdown subset without injecting untrusted HTML.
  function renderAnswer(value) {
    output.replaceChildren();
    const lines = String(value || "").split(/\r?\n/);
    let list = null;
    const addInline = (element, value) => {
      const parts = value.split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
        if (part.startsWith("**") && part.endsWith("**")) {
          const strong = document.createElement("strong");
          strong.textContent = part.slice(2, -2);
          element.append(strong);
        } else element.append(document.createTextNode(part));
      }
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { list = null; continue; }
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      const item = line.match(/^(?:[-*]|\d+[.)])\s+(.+)$/);
      if (heading) {
        list = null;
        const el = document.createElement(heading[1].length <= 2 ? "h4" : "h5");
        addInline(el, heading[2]);
        output.append(el);
      } else if (item) {
        if (!list) { list = document.createElement("ul"); output.append(list); }
        const li = document.createElement("li");
        addInline(li, item[1]);
        list.append(li);
      } else {
        list = null;
        const p = document.createElement("p");
        addInline(p, line);
        output.append(p);
      }
    }
  }
  async function ask(mode) {
    const text = mode !== "QUICK" ? lastQuestion : question.value.trim();
    if (!text) { output.textContent = "Enter a question first."; return; }
    const token = window.AuthStateRuntime?.getAuthToken?.();
    if (!token) { output.textContent = "Sign in to use Nutrition Intelligence."; return; }
    if (recording && recognition) { recognition.stop(); recording = false; }
    stopAudio();
    if (stop) stop.disabled = true;
    if (listen) listen.disabled = true;
    button.disabled = true;
    if (deepButton) deepButton.disabled = true;
    if (referencesButton) referencesButton.disabled = true;
    output.textContent = mode === "DEEP" ? "Digging a little deeper…" : mode === "REFERENCES" ? "Checking the available references…" : "Looking into that…";
    try {
      const origin = (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || location.origin).replace(/\/$/, "");
      const response = await fetch(origin + "/api/me/nutrition/research", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + token },
        body: JSON.stringify({
          question: "[RESPONSE_MODE:" + mode + "]\n" + (mode === "QUICK" && conversationContext ? "Previous exchange for context:\n" + conversationContext.slice(-3500) + "\n\nNew user question: " + text : text),
          localDate: document.getElementById("journalDate")?.value || null
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.ok === false) throw new Error(json.error?.message || "Research unavailable");
      lastAnswer = json.data?.answer || "No answer returned.";
      conversationContext = "User: " + text + "\nAssistant: " + lastAnswer;
      if (mode !== "QUICK") question.value = "";
      question.placeholder = "Ask a follow-up by typing or tapping the microphone…";
      renderAnswer(lastAnswer);
      if (listen && canSpeak) listen.disabled = false;
      lastQuestion = text;
      if (deepButton) deepButton.hidden = false;
      if (referencesButton) referencesButton.hidden = false;
    } catch (error) {
      output.textContent = error.message || "Unable to answer right now.";
      if (deepButton && lastQuestion && mode === "QUICK") deepButton.hidden = false;
    } finally { button.disabled = false; if (deepButton) deepButton.disabled = false; if (referencesButton) referencesButton.disabled = false; }
  }
  button.addEventListener("click", () => ask("QUICK"));
  if (deepButton) deepButton.addEventListener("click", () => ask("DEEP"));
  if (referencesButton) referencesButton.addEventListener("click", () => ask("REFERENCES"));
})();
