(function initYogaWorkoutRuntime(global) {
  "use strict";

  const STORAGE_KEY = "mufasa.activeWorkout.v1";
  const $ = (id) => global.document?.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  let active = null;
  let session = null;
  let definitions = [];
  let tracker = null;
  let paused = false;
  let lastManualTick = null;
  let lastSpokenCue = "";
  let latestEvaluation = null;

  function readState(storage = global.localStorage) {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
      return value?.workoutType === "yoga" && value.sessionId ? value : null;
    } catch (_) { return null; }
  }

  function writeState(value, storage = global.localStorage) {
    active = value;
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
    global.__ACTIVE_WORKOUT_SELECTION = value;
    global.dispatchEvent?.(new CustomEvent("workout:selected", { detail: value }));
    return value;
  }

  function stateFromSession(value, previous = null) {
    const index = Math.max(0, Math.min(Number(previous?.currentPoseIndex || 0), value.steps.length - 1));
    const pose = value.steps[index];
    return {
      schemaVersion: 1, workoutType: "yoga", sessionId: value.id, sessionName: value.name,
      currentPoseIndex: index, poseId: pose.poseId, poseName: pose.name,
      holdSeconds: Number(pose.holdSeconds || 0), restSeconds: Number(pose.restSeconds || 0),
      transition: pose.transition || "Move comfortably into the next pose.",
      movementDefinitionId: pose.movementDefinitionId || pose.poseId,
      startedAt: previous?.startedAt || Date.now(), poseResults: previous?.poseResults || [],
      holdElapsedMs: Number(previous?.poseId === pose.poseId ? previous.holdElapsedMs : 0) || 0
    };
  }

  async function request(route, options = {}) {
    const result = await global.MaatApiClient.request(route, options);
    if (!result.ok) throw new Error(result.payload?.error?.message || result.payload?.message || "Yoga is temporarily unavailable.");
    return result.payload.data;
  }

  function renderTarget(definition) {
    const host = $("yogaAvatarTarget");
    if (!host) return;
    if (!definition || !global.PocketPTBodyIntelligence) {
      host.textContent = "Avatar target loads when a canonical movement definition is available.";
      return;
    }
    const adapter = global.PocketPTBodyIntelligence;
    const pose = adapter.avatarPose(definition);
    const points = pose.landmarks;
    const lines = adapter.CONNECTIONS.filter(([a, b]) => points[a] && points[b]).map(([a, b]) =>
      `<line x1="${points[a].x * 100}" y1="${points[a].y * 100}" x2="${points[b].x * 100}" y2="${points[b].y * 100}" />`).join("");
    const joints = Object.entries(points).map(([name, point]) => `<circle cx="${point.x * 100}" cy="${point.y * 100}" r="2"><title>${name.replaceAll("_", " ")}</title></circle>`).join("");
    host.innerHTML = `<svg viewBox="0 0 100 100" style="height:180px;width:100%;stroke:currentColor;stroke-width:2;fill:#facc15" aria-hidden="true">${lines}${joints}</svg><small>Avatar expected pose · ${esc(definition.name)}</small>`;
    global.dispatchEvent?.(new CustomEvent("yoga:movement-changed", { detail: { movementDefinition: definition, targetBodyFrame: adapter.targetBodyFrame(definition), avatarPose: pose } }));
  }

  function updateHold(elapsedMs, isPaused = paused) {
    active.holdElapsedMs = Math.min(active.holdSeconds * 1000, Math.max(0, elapsedMs));
    const seconds = Math.floor(active.holdElapsedMs / 1000);
    $("yogaHoldProgress").max = active.holdSeconds * 1000 || 1;
    $("yogaHoldProgress").value = active.holdElapsedMs;
    $("yogaHoldText").textContent = `${seconds} / ${active.holdSeconds} sec${isPaused ? " · paused" : ""}`;
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  }

  function render() {
    const pose = session.steps[active.currentPoseIndex];
    $("yogaExecutionPanel").hidden = false;
    $("yogaExecutionTitle").textContent = active.sessionName;
    $("yogaPosePosition").textContent = `Pose ${active.currentPoseIndex + 1} of ${session.steps.length}`;
    $("yogaPoseName").textContent = active.poseName;
    $("yogaPoseInstructions").textContent = pose.description || "Move within a comfortable range.";
    $("yogaHoldDuration").textContent = `${active.holdSeconds} seconds`;
    $("yogaRestDuration").textContent = active.restSeconds ? `${active.restSeconds} seconds` : "None";
    $("yogaTransition").textContent = active.transition;
    $("exerciseLabel").textContent = active.poseName;
    $("repCount").textContent = "Hold mode";
    $("workoutPlanView").textContent = `${active.sessionName}\nYoga\nPose ${active.currentPoseIndex + 1} of ${session.steps.length}\n${active.poseName}\n${active.holdSeconds} sec hold`;
    $("yogaNextBtn").hidden = active.currentPoseIndex === session.steps.length - 1;
    $("yogaCompleteBtn").hidden = active.currentPoseIndex !== session.steps.length - 1;
    $("yogaPauseBtn").textContent = paused ? "Resume hold" : "Pause hold";
    updateHold(active.holdElapsedMs || 0, paused);
    const definition = definitions.find((item) => item.id === active.movementDefinitionId || item.id === active.poseId);
    tracker = definition ? global.PocketPTBodyIntelligence.createHoldTracker({ ...definition.hold, targetMs: active.holdSeconds * 1000 }) : null;
    renderTarget(definition);
    $("formRuleStatus").textContent = `movement pattern: yoga static hold\npose: ${active.poseId}\nmovement definition: ${definition?.id || "instruction-only"}\nform: ${definition ? "waiting for camera" : "manual guidance"}\nkeypoint confidence: waiting`;
  }

  function warningJoints(result, frame) {
    const host = $("yogaWarningJoints");
    const names = [...new Set((result.failures || []).flatMap((failure) => {
      const definition = definitions.find((item) => item.id === active.poseId);
      return definition?.phases?.[0]?.rules?.find((rule) => rule.id === failure.ruleId)?.points || [];
    }).filter((name) => /knee|elbow|wrist|shoulder/.test(name)))];
    host.replaceChildren(...names.map((name) => {
      const tag = document.createElement("span");
      tag.textContent = `⚠ ${name.replaceAll("_", " ")}`;
      tag.style.cssText = "display:inline-block;border:2px dashed currentColor;border-radius:999px;padding:3px 7px;margin:2px;font-weight:700";
      tag.dataset.joint = name;
      tag.title = frame.landmarks[name] ? "Highlighted from the live skeleton" : "Joint needs attention";
      return tag;
    }));
  }

  function speakCue(cue) {
    if (!cue || cue === lastSpokenCue) return;
    lastSpokenCue = cue;
    global.WorkoutCoachRuntime?.advisoryCue?.(cue);
    global.CoachRuntime?.speakRepFeedback?.(cue, "workout");
  }

  function onPoseFrame(event) {
    if (!active || paused) return;
    const definition = definitions.find((item) => item.id === active.poseId);
    if (!definition || !global.PocketPTBodyIntelligence) return;
    const packet = event.detail?.posePacket;
    const frame = global.PocketPTBodyIntelligence.adaptMoveNet(packet?.keypoints, { width: packet?.video?.width || 1, height: packet?.video?.height || 1, mirrored: true });
    const result = global.PocketPTBodyIntelligence.evaluateMovement(definition, frame);
    latestEvaluation = result;
    const primary = result.feedback[0] || (result.aligned ? "Good. Hold steady." : "Move fully into view.");
    $("yogaFormStatus").textContent = result.aligned ? "Good" : result.status === "insufficient_data" ? "Camera needs a clearer view" : "Adjust";
    $("yogaPrimaryCue").textContent = primary;
    $("yogaSecondaryCue").textContent = result.feedback[1] || "";
    $("yogaConfidence").textContent = `${Math.round(frame.confidence * 100)}%`;
    warningJoints(result, frame);
    const progress = tracker.update(result);
    updateHold(progress.elapsedMs, progress.paused);
    $("formRuleStatus").textContent = `movement pattern: yoga static hold\npose: ${active.poseId}\nmovement definition: ${definition.id}\nform: ${result.status}\nkeypoint confidence: ${Math.round(frame.confidence * 100)}%\nprimary correction: ${primary}`;
    speakCue(primary);
  }

  function manualTick(now = Date.now()) {
    if (!active) return;
    const cameraActive = Boolean(global.PoseRuntime?.getState?.().loopRunning);
    if (!paused && !cameraActive) {
      if (lastManualTick !== null) updateHold((active.holdElapsedMs || 0) + Math.min(1000, now - lastManualTick));
      $("yogaFormStatus").textContent = "Camera off · guided hold";
      $("yogaPrimaryCue").textContent = "Hold steadily at a comfortable range. Camera coaching is optional.";
    }
    lastManualTick = now;
  }

  function nextPose() {
    const result = { poseId: active.poseId, score: latestEvaluation?.score ?? null, holdDurationMs: active.holdElapsedMs || 0, confidenceBand: latestEvaluation ? "high" : "low", faultIds: (latestEvaluation?.failures || []).map((item) => item.ruleId), cuesShown: latestEvaluation?.feedback || [] };
    active.poseResults = [...active.poseResults.filter((item) => item.poseId !== active.poseId), result];
    active.currentPoseIndex += 1;
    active = stateFromSession(session, active);
    paused = false; latestEvaluation = null; lastSpokenCue = ""; lastManualTick = null;
    writeState(active); render();
  }

  async function complete() {
    const button = $("yogaCompleteBtn"); button.disabled = true;
    const finalResult = { poseId: active.poseId, score: latestEvaluation?.score ?? null, holdDurationMs: active.holdElapsedMs || 0, confidenceBand: latestEvaluation ? "high" : "low", faultIds: (latestEvaluation?.failures || []).map((item) => item.ruleId), cuesShown: latestEvaluation?.feedback || [] };
    const poseResults = session.steps.map((step) => active.poseResults.find((item) => item.poseId === step.poseId) || (step.poseId === active.poseId ? finalResult : { poseId: step.poseId, score: null, holdDurationMs: 0, confidenceBand: "low", faultIds: [], cuesShown: [] }));
    try {
      await request("/api/yoga/sessions/complete", { method: "POST", body: { sessionId: session.id, startedAt: active.startedAt, idempotencyKey: `train-yoga-${session.id}-${active.startedAt}`, poseResults, detectorVersion: global.PoseRuntime?.getState?.().detectorReady ? "movenet-browser-v1" : "camera-disabled" } });
      global.localStorage.removeItem(STORAGE_KEY); active = null;
      global.dispatchEvent?.(new CustomEvent("mufasa:gamification-refresh"));
      $("yogaExecutionPanel").innerHTML = `<h2>Session complete</h2><p>${esc(session.name)} was saved to Yoga history and progress.</p><a class="button-link" href="/dashboard.html">View Home progress</a> <a class="button-link secondary" href="/yoga.html">Yoga library</a>`;
    } catch (error) { button.disabled = false; $("yogaPrimaryCue").textContent = `Completion could not be saved: ${error.message}`; }
  }

  async function launch(sessionId) {
    session = await request(`/api/yoga/sessions/${encodeURIComponent(sessionId)}`);
    const catalogue = await request("/api/yoga/catalogue");
    definitions = catalogue.movementDefinitions || [];
    active = stateFromSession(session, readState());
    writeState(active); render();
  }

  async function boot() {
    const auth = await global.AuthStateRuntime?.whenReady?.();
    if (auth && !auth.ok) return;
    const catalogue = await request("/api/yoga/catalogue");
    const select = $("workoutSelect");
    (catalogue.sessions || []).forEach((item) => {
      if (select.querySelector(`option[value="yoga:${item.id}"]`)) return;
      const option = document.createElement("option"); option.value = `yoga:${item.id}`; option.textContent = `${item.name} (Yoga)`; select.append(option);
    });
    select.addEventListener("change", (event) => { if (!event.target.value.startsWith("yoga:")) return; event.stopImmediatePropagation(); launch(event.target.value.slice(5)).catch(showError); }, true);
    const queryId = new URLSearchParams(global.location.search).get("yogaSession");
    const restored = readState();
    if (queryId || restored?.sessionId) await launch(queryId || restored.sessionId);
  }

  function showError(error) { const host = $("workoutPlanView"); if (host) host.textContent = `Yoga session could not load: ${error.message}`; }
  global.addEventListener?.("pose-runtime:frame", onPoseFrame);
  if (global.document) global.setInterval?.(() => manualTick(), 250);
  global.addEventListener?.("load", () => boot().catch(showError));
  $("yogaNextBtn")?.addEventListener("click", nextPose);
  $("yogaCompleteBtn")?.addEventListener("click", complete);
  $("yogaPauseBtn")?.addEventListener("click", () => { paused = !paused; lastManualTick = null; $("yogaPauseBtn").textContent = paused ? "Resume hold" : "Pause hold"; updateHold(active.holdElapsedMs || 0, paused); });

  global.YogaWorkoutRuntime = Object.freeze({ STORAGE_KEY, readState, writeState, stateFromSession, launch, nextPose, complete, getState: () => ({ active, session, latestEvaluation }) });
})(typeof window !== "undefined" ? window : globalThis);
