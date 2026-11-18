(function () {
  "use strict";
  const button = document.getElementById("nutritionResearchAsk");
  const question = document.getElementById("nutritionResearchQuestion");
  const output = document.getElementById("nutritionResearchAnswer");
  const deepButton = document.getElementById("nutritionResearchDeep");
  const referencesButton = document.getElementById("nutritionResearchReferences");
  const mealPlanSaveButton = document.getElementById("nutritionMealPlanSave");
  if (!button || !question || !output) return;
  let lastQuestion = "";
  let lastAnswer = "";
  let conversationContext = "";
  let pendingMealPlan = null;
  let recording = false;
  let listeningMode = "";
  let pendingDirectStart = false;
  let wakeArmed = true;
  let wakeExpiryTimer = null;
  const WAKE_PATTERN = /(?:^|[,.!?\s])(?:hey\s+)?mufasa\b\s*[,!?.-]*/i;
  const WAKE_WINDOW_MS = 30000;
  const mic = document.getElementById("nutritionResearchMic");
  const speak = document.getElementById("nutritionResearchSpeak");
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
    listeningMode = "";
    pendingDirectStart = false;
    wakeArmed = true;
    clearWakeWindow();
    try { recognition?.stop(); } catch (_) {}
    setMicUi(false);
    if (speak) { speak.setAttribute("aria-pressed", "false"); speak.textContent = "🎙️ Speak my question"; }
  };
  const startWakeListening = () => {
    if (!recognition) return;
    recording = true;
    listeningMode = "wake";
    wakeArmed = true;
    clearWakeWindow();
    try {
      recognition.start();
      setMicUi(true);
      voiceMessage("Listening for “Hey Mufasa”…");
    } catch (error) {
      if (error?.name !== "InvalidStateError") {
        recording = false; listeningMode = "";
        setMicUi(false);
        voiceMessage("Unable to start the microphone. Try again.");
      }
    }
  };
  const beginDirectListening = () => {
    if (!recognition) return;
    recording = true;
    listeningMode = "direct";
    wakeArmed = false;
    clearWakeWindow();
    if (speak) { speak.setAttribute("aria-pressed", "true"); speak.textContent = "Listening… tap to stop"; }
    try {
      recognition.start();
      voiceMessage("Speak your nutrition question now.");
    } catch (error) {
      if (error?.name !== "InvalidStateError") {
        recording = false; listeningMode = ""; wakeArmed = true;
        if (speak) { speak.setAttribute("aria-pressed", "false"); speak.textContent = "🎙️ Speak my question"; }
        voiceMessage("Unable to start the microphone. Try again or use the iPhone keyboard microphone.");
      }
    }
  };
  const startDirectListening = () => {
    if (!recognition) return;
    if (recording) {
      if (listeningMode === "direct") { stopWakeListening(); return; }
      // Safari only allows one SpeechRecognition session. End the wake-word
      // session first, then start direct dictation from its onend callback.
      pendingDirectStart = true;
      recording = false;
      listeningMode = "";
      clearWakeWindow();
      setMicUi(false);
      if (speak) { speak.setAttribute("aria-pressed", "true"); speak.textContent = "Switching to direct listening…"; }
      voiceMessage("Switching to direct listening…");
      try { recognition.stop(); } catch (_) { pendingDirectStart = false; beginDirectListening(); }
      return;
    }
    beginDirectListening();
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
      if (speak) speak.disabled = true;
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
        if (reason === "aborted" && (pendingDirectStart || !recording)) return;
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
        if (pendingDirectStart) {
          pendingDirectStart = false;
          window.setTimeout(beginDirectListening, 0);
          return;
        }
        if (!recording) { setMicUi(false); return; }
        window.setTimeout(() => {
          if (recording) {
            if (listeningMode === "direct") beginDirectListening();
            else startWakeListening();
          }
        }, 250);
      };
      mic.addEventListener("click", () => {
        if (recording) stopWakeListening();
        else startWakeListening();
      });
      if (speak) speak.addEventListener("click", () => {
        if (recording) stopWakeListening();
        else startDirectListening();
      });
    }
  }
  // Match Mufasa's configured backend voice via /api/speak, not device speech synthesis.
  let audioPlayer = null;
  let speechAbort = null;
  let playbackId = 0;
  let activeObjectUrl = null;
  const canSpeak = true;
  // Safari can reject audio that starts after an awaited network request because
  // the original button tap is no longer considered a user gesture. Prime the
  // same player synchronously while that gesture is still active.
  const AUDIO_UNLOCK_DATA = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  const primeAudioPlayback = player => {
    try {
      player.muted = true;
      player.src = AUDIO_UNLOCK_DATA;
      const play = player.play();
      return Promise.resolve(play).catch(() => {}).then(() => {
        player.pause();
        player.removeAttribute("src");
        player.load();
        player.muted = false;
      });
    } catch (_) {
      player.muted = false;
      return Promise.resolve();
    }
  };
  
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
    const audioPrimed = primeAudioPlayback(audioPlayer);
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
        await audioPrimed;
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
  const isMealPlanRequest = value => /\b(?:meal\s*plan|nutrition\s*plan|diet\s*plan|meal\s*calendar|what\s+should\s+i\s+eat)\b/i.test(String(value || ""));
  const apiOrigin = () => (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || location.origin).replace(/\/$/, "");
  function renderMealPlanDraft(draft, message) {
    output.replaceChildren();
    const heading = document.createElement("h4"); heading.textContent = draft.title; output.append(heading);
    const intro = document.createElement("p"); intro.textContent = message; output.append(intro);
    const goals = draft.dailyTargets || {}; const meta = document.createElement("p");
    meta.textContent = `Starts ${draft.startDate} · ${draft.durationDays} days${goals.calories ? ` · ${goals.calories} kcal/day` : ""}${goals.proteinGrams ? ` · ${goals.proteinGrams}g protein/day` : ""}.`; output.append(meta);
    for (const day of (draft.days || []).slice(0, 3)) { const item = document.createElement("p"); item.textContent = `Day ${day.dayNumber} · ${day.date}: ` + day.meals.map(meal => `${meal.mealType}: ${meal.title}`).join(" · "); output.append(item); }
    if ((draft.days || []).length > 3) { const more = document.createElement("p"); more.textContent = `Plus ${draft.days.length - 3} more days will populate your calendar after you save.`; output.append(more); }
    if ((draft.assumptions || []).length) { const assumptions = document.createElement("p"); assumptions.textContent = "Assumptions to review: " + draft.assumptions.join("; "); output.append(assumptions); }
  }
  function mealPlanReadAloudText(draft, message) {
    const targets = draft.dailyTargets || {};
    const targetLine = [targets.calories ? `${targets.calories} calories per day` : "", targets.proteinGrams ? `${targets.proteinGrams} grams of protein per day` : ""].filter(Boolean).join(" and ");
    const days = (draft.days || []).map(day => `Day ${day.dayNumber}, ${day.date}. ` + (day.meals || []).map(meal => `${meal.mealType}: ${meal.title}. ${Array.isArray(meal.items) && meal.items.length ? meal.items.join(", ") + "." : ""}`).join(" ")).join(" ");
    return [draft.title || "Your meal plan", message || "Your meal plan is ready to review.", `It starts ${draft.startDate} and covers ${draft.durationDays} days.${targetLine ? " Your daily target is " + targetLine + "." : ""}`, days, "Review the plan, then tap Review and save this plan to add it to your calendar."].filter(Boolean).join(" ");
  }
  function renderSavedMealPlan(plan) {
    const root = document.getElementById("mealPlanCalendar"); if (!root) return;
    root.replaceChildren(); if (!plan) { root.textContent = "No saved meal plan yet."; return; }
    const days = plan.days || []; let weekIndex = 0; let selectedIndex = 0;
    const shell = document.createElement("div"); shell.className = "meal-calendar-shell";
    const heading = document.createElement("div"); const title = document.createElement("strong"); title.textContent = plan.title; heading.append(title, document.createTextNode(` · ${plan.durationDays} days starting ${plan.startDate}`)); shell.append(heading);
    const toolbar = document.createElement("div"); toolbar.className = "meal-calendar-toolbar";
    const previous = document.createElement("button"); previous.type = "button"; previous.className = "btn"; previous.textContent = "← Week";
    const weekLabel = document.createElement("div"); weekLabel.className = "meal-calendar-week";
    const next = document.createElement("button"); next.type = "button"; next.className = "btn"; next.textContent = "Week →";
    toolbar.append(previous, weekLabel, next); shell.append(toolbar);
    const grid = document.createElement("div"); grid.className = "meal-calendar-grid"; shell.append(grid);
    const detail = document.createElement("section"); detail.className = "meal-calendar-detail"; shell.append(detail); root.append(shell);
    const formatDate = date => { const value = new Date(`${date}T12:00:00`); return { weekday: value.toLocaleDateString(undefined, { weekday:"short" }), month: value.toLocaleDateString(undefined, { month:"short" }), day: value.getDate() }; };
    function paint() {
      const start = weekIndex * 7, visible = days.slice(start, start + 7); const selected = days[selectedIndex] || visible[0];
      weekLabel.textContent = `Week ${weekIndex + 1} of ${Math.ceil(days.length / 7)}`; previous.disabled = weekIndex === 0; next.disabled = start + 7 >= days.length;
      grid.replaceChildren(); visible.forEach((day, offset) => { const date = formatDate(day.date); const tile = document.createElement("button"); tile.type = "button"; tile.className = "meal-calendar-day" + (day.dayNumber === selected.dayNumber ? " active" : ""); tile.setAttribute("aria-pressed", String(day.dayNumber === selected.dayNumber)); const label = document.createElement("small"); label.textContent = `${date.weekday} · ${date.month}`; const number = document.createElement("strong"); number.textContent = String(date.day); const count = document.createElement("small"); count.textContent = `Day ${day.dayNumber}`; tile.append(label, number, count); tile.onclick = () => { selectedIndex = start + offset; paint(); }; grid.append(tile); });
      detail.replaceChildren(); const dayTitle = document.createElement("h3"); dayTitle.textContent = `Day ${selected.dayNumber} · ${selected.date}`; const theme = document.createElement("p"); theme.className = "muted"; theme.textContent = selected.theme || "Your meal guide"; detail.append(dayTitle, theme);
      const meals = document.createElement("div"); meals.className = "meal-calendar-meals"; (selected.meals || []).forEach(meal => { const card = document.createElement("div"); card.className = "meal-calendar-meal"; const type = document.createElement("small"); type.textContent = meal.mealType; const name = document.createElement("strong"); name.textContent = meal.title; const items = document.createElement("p"); items.textContent = (meal.items || []).join(" · "); card.append(type, name, items); if (meal.notes) { const note = document.createElement("p"); note.textContent = meal.notes; card.append(note); } meals.append(card); }); detail.append(meals);
    }
    previous.onclick = () => { weekIndex -= 1; selectedIndex = weekIndex * 7; paint(); }; next.onclick = () => { weekIndex += 1; selectedIndex = weekIndex * 7; paint(); }; paint();
  }
  async function loadSavedMealPlan() { const token = window.AuthStateRuntime?.getAuthToken?.(); if (!token) return; try { const response = await fetch(apiOrigin() + "/api/me/nutrition/meal-plans/current", { headers: { authorization: "Bearer " + token } }); const json = await response.json(); if (response.ok) renderSavedMealPlan(json.data?.mealPlan || null); } catch (_) {} }
  async function createMealPlan(text, token) {
    const response = await fetch(apiOrigin() + "/api/me/nutrition/meal-plans/ai-draft", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ request: text, startDate: document.getElementById("journalDate")?.value || null }) });
    const json = await response.json().catch(() => ({})); if (!response.ok || json.ok === false) throw new Error(json.error?.message || "Meal-plan creation unavailable");
    pendingMealPlan = json.data?.draft; if (!pendingMealPlan) throw new Error("Meal-plan draft was empty"); renderMealPlanDraft(pendingMealPlan, json.data?.summary || "Review the plan before saving it to your calendar."); if (mealPlanSaveButton) mealPlanSaveButton.hidden = false;
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
      if (mode === "QUICK" && isMealPlanRequest(text)) {
        await createMealPlan(text, token);
        lastAnswer = mealPlanReadAloudText(pendingMealPlan, "Your meal plan is ready to review."); lastQuestion = text;
        conversationContext = "User: " + text + "\nAssistant: " + lastAnswer;
        if (listen && canSpeak) listen.disabled = false;
        if (deepButton) deepButton.hidden = true; if (referencesButton) referencesButton.hidden = true;
        return;
      }
      pendingMealPlan = null; if (mealPlanSaveButton) mealPlanSaveButton.hidden = true;
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
      if (!response.ok || json.ok === false) {
        const detail = json.error || {};
        const message = detail.code === "NUTRITION_AI_CAPACITY"
          ? "Mufasa is temporarily unavailable due to an AI provider usage limit. Your question is saved in the box above; try again later."
          : (detail.message || "Research unavailable");
        const reference = typeof detail.requestId === "string" && /^[a-f0-9-]{36}$/i.test(detail.requestId) ? " Reference: " + detail.requestId : "";
        throw new Error(message + reference);
      }
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
  if (mealPlanSaveButton) mealPlanSaveButton.addEventListener("click", async () => {
    if (!pendingMealPlan) return;
    const token = window.AuthStateRuntime?.getAuthToken?.(); if (!token) { output.textContent = "Sign in to save this plan."; return; }
    mealPlanSaveButton.disabled = true; mealPlanSaveButton.textContent = "Saving plan…";
    try {
      const response = await fetch(apiOrigin() + "/api/me/nutrition/meal-plans", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify(pendingMealPlan) });
      const json = await response.json().catch(() => ({})); if (!response.ok || json.ok === false) throw new Error(json.error?.message || "Unable to save plan");
      renderSavedMealPlan(json.data?.mealPlan); pendingMealPlan = null; mealPlanSaveButton.hidden = true;
      const saved = document.createElement("p"); saved.textContent = "Saved to My meal calendar. Log what you actually eat in Today’s entries."; output.append(saved);
      document.getElementById("myNutritionPlan")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) { output.textContent = error.message || "Unable to save plan."; }
    finally { mealPlanSaveButton.disabled = false; mealPlanSaveButton.textContent = "Review & save this plan"; }
  });
  window.addEventListener("DOMContentLoaded", loadSavedMealPlan);
})();
