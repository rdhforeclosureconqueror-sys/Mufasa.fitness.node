(() => {
  "use strict";
  let catalogue, active, stream, startedAt, poseLoop, detector, currentResult, definition;
  let holdTracker;
  const $ = (id) => document.getElementById(id);
  const BI = window.PocketPTBodyIntelligence;
  window.RuntimeState?.initHeadRuntime?.({ initialScripts: ["/runtime-state.js", "/pose-runtime.js", "/body-intelligence.js", "/yoga/yoga.js"] });

  async function api(path, options) {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!response.ok) throw new Error(response.status === 401 ? "Sign in to use Yoga." : "Yoga service is temporarily unavailable.");
    return (await response.json()).data;
  }
  function card(item, type) {
    const node = document.createElement("article"); node.className = "card";
    const title = document.createElement("h3"), copy = document.createElement("p"), meta = document.createElement("p");
    title.textContent = item.name || item.displayName; copy.textContent = item.purpose || item.description;
    meta.textContent = type === "session" ? `${item.durationMinutes} min · ${item.difficulty} · mat` : `${item.category} · ${item.difficulty}`;
    node.append(title, copy, meta);
    if (type === "session") { const button = document.createElement("button"); button.textContent = "Start session"; button.onclick = () => openPlayer(item); node.append(button); }
    return node;
  }
  async function load() {
    try { catalogue = await api("/api/yoga/catalogue"); definition = catalogue.movementDefinitions.find((item) => item.id === "warrior-ii"); $("sessionGrid").replaceChildren(...catalogue.sessions.map((x) => card(x, "session"))); $("poseGrid").replaceChildren(...catalogue.poses.map((x) => card(x, "pose"))); }
    catch (error) { $("sessionGrid").textContent = error.message; }
  }
  function renderAvatar() {
    if (!definition) return;
    const pose = BI.avatarPose(definition), svg = $("avatarDemo"), ns = "http://www.w3.org/2000/svg";
    svg.replaceChildren();
    for (const bone of pose.bones) { const line = document.createElementNS(ns, "line"), a = pose.landmarks[bone.from], b = pose.landmarks[bone.to]; line.setAttribute("x1", a.x * 100); line.setAttribute("y1", a.y * 100); line.setAttribute("x2", b.x * 100); line.setAttribute("y2", b.y * 100); svg.append(line); }
    for (const point of Object.values(pose.landmarks)) { const circle = document.createElementNS(ns, "circle"); circle.setAttribute("cx", point.x * 100); circle.setAttribute("cy", point.y * 100); circle.setAttribute("r", 1.7); svg.append(circle); }
  }
  function openPlayer(session) {
    active = session; startedAt = Date.now(); currentResult = null;
    holdTracker = BI.createHoldTracker(definition?.hold); $("playerTitle").textContent = `${session.name} — Warrior II`; renderAvatar(); $("player").showModal();
  }
  function drawSkeleton(frame, result) {
    const canvas = $("skeleton"), video = $("camera"); canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 360;
    const context = canvas.getContext("2d"); context.clearRect(0, 0, canvas.width, canvas.height); context.lineWidth = 4;
    const failed = new Set((result.failures || []).flatMap((failure) => definition.phases[0].rules.find((rule) => rule.id === failure.ruleId)?.points || []));
    for (const [from, to] of BI.CONNECTIONS) { const a = frame.landmarks[from], b = frame.landmarks[to]; if (!a || !b) continue; context.strokeStyle = failed.has(from) || failed.has(to) ? "#f3c65d" : "#69e6c0"; context.beginPath(); context.moveTo(a.x * canvas.width, a.y * canvas.height); context.lineTo(b.x * canvas.width, b.y * canvas.height); context.stroke(); }
  }
  function showResult(result, hold) {
    $("score").textContent = result.score ?? "—"; $("scoreLabel").textContent = result.status === "insufficient_data" ? "Step back: full body needed" : result.aligned ? "Aligned" : "Adjusting";
    $("hold").textContent = `Hold ${Math.floor(hold.elapsedMs / 1000)} / ${Math.floor(hold.targetMs / 1000)} sec${hold.paused ? " · paused" : ""}`;
    $("cue").textContent = result.feedback.join(" ") || (result.aligned ? "Good alignment. Keep breathing and hold steady." : "Keep your full body visible.");
    const checks = (result.rules || []).slice(0, 4).map((rule) => { const item = document.createElement("li"); item.className = rule.passed ? "pass" : "warn"; item.textContent = `${rule.ruleId.replaceAll("-", " ")}: ${rule.passed ? "acceptable" : "adjust"}`; return item; }); $("checks").replaceChildren(...checks);
  }
  async function camera() {
    if (!navigator.mediaDevices?.getUserMedia) { $("cameraStatus").textContent = "Camera assessment is unsupported on this device. Guided practice remains available."; return; }
    if (!definition) { $("cameraStatus").textContent = "Warrior II coaching definition is unavailable. Guided practice remains available."; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }); $("camera").srcObject = stream;
      $("cameraStatus").textContent = "Camera ready. Keep your full body in the guide. Analysis is local; video is not saved."; $("cameraButton").textContent = "Stop camera";
      detector = await window.PoseRuntime.initMoveNetDetector({ ensurePoseRuntime: window.__ensurePoseRuntime, mobileDevice: matchMedia("(max-width: 700px)").matches });
      poseLoop = window.PoseRuntime.startPoseLoop({ detector, video: $("camera"), isRunning: () => Boolean(stream), onPoseFrame: ({ pose }) => { const frame = BI.adaptMoveNet(pose?.keypoints || [], { timestamp: Date.now(), width: $("camera").videoWidth || 1, height: $("camera").videoHeight || 1 }); currentResult = BI.evaluateMovement(definition, frame); const hold = holdTracker.update(currentResult, frame.timestamp); showResult(currentResult, hold); drawSkeleton(frame, currentResult); } });
    } catch (error) { stop(); $("cameraStatus").textContent = error.name === "NotAllowedError" ? "Camera permission denied. You can complete this session without camera." : "Camera unavailable. Check browser settings or continue without it."; }
  }
  function stop() { poseLoop?.stop(); poseLoop = null; stream?.getTracks().forEach((track) => track.stop()); stream = null; $("camera").srcObject = null; $("cameraButton").textContent = "Start camera"; }
  async function complete() {
    const poseResults = active.poses.map((pose) => ({ poseId: pose.poseId, score: pose.poseId === "warrior-ii" ? currentResult?.score ?? null : null, holdDurationMs: pose.holdSeconds * 1000, confidenceBand: currentResult ? "high" : "low", faultIds: pose.poseId === "warrior-ii" ? (currentResult?.failures || []).map((fault) => fault.ruleId) : [], cuesShown: pose.poseId === "warrior-ii" ? currentResult?.feedback || [] : [] }));
    try { const result = await api("/api/yoga/sessions/complete", { method: "POST", body: JSON.stringify({ sessionId: active.id, startedAt, detectorVersion: stream ? "movenet-browser-v1" : "camera-disabled", poseResults }) }); stop(); $("cue").textContent = `Complete — ${result.summary.posesCompleted} poses. Camera coaching remained ${currentResult ? "active" : "optional"}.`; }
    catch (error) { $("cue").textContent = error.message; }
  }
  async function history() { try { const data = await api("/api/yoga/history"); $("historyList").replaceChildren(...data.sessions.map((session) => { const p = document.createElement("p"); p.textContent = `${new Date(session.completedAt).toLocaleDateString()} · ${session.sessionId} · ${session.summary.averageScore ?? "not assessed"}`; return p; })); if (!data.sessions.length) $("historyList").textContent = "Complete your first session to begin your Yoga history."; } catch (error) { $("historyList").textContent = error.message; } $("history").showModal(); }
  $("cameraButton").onclick = () => stream ? stop() : camera(); $("completeButton").onclick = complete; $("pauseButton").onclick = () => { $("pauseButton").textContent = $("pauseButton").textContent === "Pause" ? "Resume" : "Pause"; }; $("historyButton").onclick = history; $("exploreButton").onclick = () => $("sessionsTitle").scrollIntoView(); $("posesButton").onclick = () => $("posesTitle").scrollIntoView(); document.addEventListener("visibilitychange", () => { if (document.hidden) $("pauseButton").textContent = "Resume"; }); $("player").addEventListener("close", stop); load();
})();
