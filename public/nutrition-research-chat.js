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
  const mic = document.getElementById("nutritionResearchMic");
  const listen = document.getElementById("nutritionResearchListen");
  const stop = document.getElementById("nutritionResearchStop");
  const voiceStatus = document.getElementById("nutritionResearchVoiceStatus");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  const voiceMessage = message => { if (voiceStatus) voiceStatus.textContent = message; };
  let mediaRecorder = null;
  let recordingStream = null;
  let recordingParts = [];
  const resetMic = () => {
    recording = false;
    if (mic) { mic.setAttribute("aria-pressed", "false"); mic.textContent = "🎙️ Speak question"; }
    if (recordingStream) { recordingStream.getTracks().forEach(track => track.stop()); recordingStream = null; }
  };
  if (mic) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      mic.disabled = true;
      voiceMessage("Microphone recording is unavailable in this browser. Try Safari or use keyboard dictation.");
    } else {
      mic.addEventListener("click", async () => {
        if (recording && mediaRecorder) { mediaRecorder.stop(); return; }
        stopAudio();
        try {
          const token = window.AuthStateRuntime?.getAuthToken?.();
          if (!token) { voiceMessage("Sign in to use voice questions."); return; }
          recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
          const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type));
          if (!mimeType) throw new Error("No supported recording format on this device");
          recordingParts = [];
          mediaRecorder = new MediaRecorder(recordingStream, { mimeType });
          mediaRecorder.ondataavailable = event => { if (event.data.size) recordingParts.push(event.data); };
          mediaRecorder.onerror = () => { resetMic(); voiceMessage("Audio recording failed. Try again."); };
          mediaRecorder.onstop = async () => {
            resetMic();
            const blob = new Blob(recordingParts, { type: mimeType });
            recordingParts = [];
            if (blob.size > 1250000) { voiceMessage("Question too long. Record a shorter question."); return; }
            if (blob.size < 100) { voiceMessage("No audio captured. Try again."); return; }
            voiceMessage("Transcribing your question…");
            try {
              const audioBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              const origin = (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || location.origin).replace(/\\/$/, "");
              const response = await fetch(origin + "/api/me/nutrition/transcribe", {
                method:"POST", headers:{ "content-type":"application/json", authorization:"Bearer " + token },
                body:JSON.stringify({ audioBase64, mimeType })
              });
              const data = await response.json();
              if (!response.ok || data.ok === false) throw new Error(data.error?.message || "Transcription unavailable");
              const spoken = data.transcript || data.data?.transcript || data.result?.transcript;
              if (!spoken) throw new Error("No words detected");
              question.value = spoken;
              voiceMessage("Question captured. Review it, then tap Ask Nutrition Intelligence.");
            } catch (error) { voiceMessage("Speech input failed: " + String(error.message || "Please try again.")); }
          };
          mediaRecorder.start();
          recording = true;
          mic.setAttribute("aria-pressed", "true");
          mic.textContent = "Stop listening";
          voiceMessage("Listening… tap Stop listening when finished.");
        } catch (error) { resetMic(); voiceMessage("Could not record: " + String(error.message || "Check microphone permission.")); }
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
    if (recording && mediaRecorder) { mediaRecorder.stop(); return; }
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
        body: JSON.stringify({ question: "[RESPONSE_MODE:" + mode + "]\n" + (mode === "QUICK" && conversationContext ? "Previous exchange for context:\n" + conversationContext.slice(-3500) + "\n\nNew user question: " + text : text) })
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
