/* =========================================================
   dashboard.js — prefer backend /api/me/history, fallback to localStorage
========================================================= */
(function () {
  "use strict";

  const KEY_HISTORY = "WORKOUT_HISTORY_V1";
  const KEY_ACTIVE  = "ACTIVE_WORKOUT_V1";

  const elPlanned = document.getElementById("kpiPlanned");
  const elCompleted = document.getElementById("kpiCompleted");
  const elConsistency = document.getElementById("kpiConsistency");
  const historyList = document.getElementById("historyList");
  const activeBox = document.getElementById("activeBox");
  const activeMini = document.getElementById("activeMini");
  const resetBtn = document.getElementById("resetBtn");
  const runDiagnosticBtn = document.getElementById("runDiagnosticBtn");
  const diagnosticStatus = document.getElementById("diagnosticStatus");
  const pilotReadinessStatus = document.getElementById("pilotReadinessStatus");
  const openAiSummaryCard = document.getElementById("openAiSummaryCard");
  const deploymentStatus = document.getElementById("deploymentStatus");
  const frontendUrlEl = document.getElementById("frontendUrl");
  const backendUrlEl = document.getElementById("backendUrl");

  const FALLBACK_NODE_BASE_URL = "https://mufasa-fitness-node.onrender.com";
  const nodeBaseUrl = (localStorage.getItem("maatNodeBaseUrl")
    || window.MAAT_NODE_BASE_URL
    || FALLBACK_NODE_BASE_URL)
    .replace(/\/$/, "");
  const client = window.MufasaBackendRead?.createClient({
    baseUrl: nodeBaseUrl,
    storagePrefix: "maat"
  });
  const dashboardApiBaseUrl = nodeBaseUrl;

  function backendUrl(pathname) {
    return `${dashboardApiBaseUrl}${pathname}`;
  }

  function read(key, fallback) {
    return client ? client.readJSON(key, fallback) : fallback;
  }

  function write(key, value) {
    if (client) client.writeJSON(key, value);
  }

  function startOfWeek(d = new Date()) {
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    x.setHours(0,0,0,0);
    return x;
  }

  function isThisWeek(isoDateStr) {
    if (!isoDateStr) return false;
    const d = new Date(isoDateStr + "T00:00:00");
    const sow = startOfWeek(new Date());
    const eow = new Date(sow); eow.setDate(sow.getDate() + 7);
    return d >= sow && d < eow;
  }

  function pill(status) {
    if (status === "completed") return `<span class="pill ok">✅ completed</span>`;
    if (status === "in_progress") return `<span class="pill">⏳ in progress</span>`;
    return `<span class="pill bad">📝 planned</span>`;
  }

  function summarize(session) {
    const strength = session?.blocks?.strength || [];
    const names = strength.slice(0,4).map(s => s.name).filter(Boolean);
    return names.length ? names.join(" • ") : "—";
  }

  function toLocalHistoryShape(serverHistory) {
    const sessions = Array.isArray(serverHistory?.completedSessions) ? serverHistory.completedSessions : [];
    return sessions.map((s) => ({
      id: s.sessionId,
      date: s.endedAt ? new Date(s.endedAt).toISOString().slice(0, 10) : "",
      status: "completed",
      completedAt: s.endedAt || null,
      profileSnapshot: {
        goal: s.programId || "Program tracked"
      },
      blocks: {
        strength: [{
          slot: "A1",
          name: s.exerciseId || "session"
        }]
      },
      serverSummary: {
        repsCompleted: s.repsCompleted ?? null,
        startedAt: s.startedAt || null
      }
    }));
  }

  async function loadData() {
    const active = read(KEY_ACTIVE, null);
    const localHistory = read(KEY_HISTORY, []);
    const token = client?.getAuthToken();

    if (!client || !token) {
      return {
        active,
        history: localHistory,
        source: "local",
        warning: token
          ? "Backend client unavailable; showing local-only history."
          : "Sign in from the main app to sync backend history. Currently local-only."
      };
    }

    try {
      const serverHistory = await client.fetchHistory(25);
      const mapped = toLocalHistoryShape(serverHistory);
      const history = mapped.length ? mapped : localHistory;
      return {
        active,
        history,
        source: mapped.length ? "server" : "local",
        warning: mapped.length ? null : "Server has no completed sessions yet; showing local history."
      };
    } catch (err) {
      if (err?.code === "UNAUTHORIZED") {
        client.clearAuthToken();
        return {
          active,
          history: localHistory,
          source: "local",
          warning: "Session expired. Showing local-only history until you sign in again from the main app."
        };
      }
      return {
        active,
        history: localHistory,
        source: "local",
        warning: "Backend history unavailable. Showing local-only history."
      };
    }
  }

  async function render() {
    const { history, active, source, warning } = await loadData();

    const weekly = history.filter(s => isThisWeek(s.date));
    const planned = weekly.length;
    const completed = weekly.filter(s => s.status === "completed").length;
    const consistency = planned ? Math.round((completed / planned) * 100) : 0;

    elPlanned.textContent = String(planned);
    elCompleted.textContent = String(completed);
    elConsistency.textContent = `${consistency}%`;

    if (active && active.id) {
      activeBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <div>
            <div style="font-size:13px; color:rgba(233,241,255,.9)">${active.date || ""}</div>
            <div class="muted">${pill(active.status)} • ${active.profileSnapshot?.goal || "Goal not set"}</div>
          </div>
        </div>
      `;
      activeMini.textContent = "Strength:\n- " + (active.blocks?.strength || []).map(s => `${s.slot}) ${s.name}`).join("\n- ");
    } else {
      activeBox.textContent = "No active workout found.";
      activeMini.textContent = "";
    }

    historyList.innerHTML = "";
    if (warning) {
      const note = document.createElement("div");
      note.className = "muted";
      note.style.marginBottom = "8px";
      note.textContent = `⚠️ Data source: ${source}. ${warning}`;
      historyList.appendChild(note);
    }

    if (!history.length) {
      historyList.innerHTML += `<div class="muted">No history yet. Complete a workout in the main app and it will appear here.</div>`;
      return;
    }

    for (const s of history.slice(0, 25)) {
      const repsLine = s.serverSummary?.repsCompleted != null
        ? `<div class="muted">Reps: ${s.serverSummary.repsCompleted}</div>`
        : "";
      const left = `
        <div class="left">
          <div style="font-size:13px; color:rgba(233,241,255,.92)">${s.date || ""}</div>
          <div class="muted">${summarize(s)}</div>
          <div class="muted">Goal: ${s.profileSnapshot?.goal || "—"}</div>
          ${repsLine}
        </div>
      `;
      const right = `
        <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
          ${pill(s.status)}
          <div class="muted">${s.completedAt ? ("Done: " + new Date(s.completedAt).toLocaleString()) : ""}</div>
        </div>
      `;
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `${left}${right}`;
      historyList.appendChild(row);
    }
  }

  async function loadFrontendBuildVersion() {
    if (window.FRONTEND_BUILD_VERSION) return String(window.FRONTEND_BUILD_VERSION);
    try {
      const res = await fetch("/__frontend-version.json", { cache: "no-store" });
      if (!res.ok) return "unknown";
      const payload = await res.json();
      return payload?.build || "unknown";
    } catch {
      return "unknown";
    }
  }

  async function updateDeploymentStatus() {
    if (frontendUrlEl) frontendUrlEl.textContent = window.location.origin;
    if (backendUrlEl) backendUrlEl.textContent = dashboardApiBaseUrl || "(relative origin)";
    if (!deploymentStatus) return;

    const frontendBuild = await loadFrontendBuildVersion();
    let backendBuild = "unreachable";
    let backendDiagnosticsReachable = "no";

    try {
      const versionRes = await fetch(backendUrl("/__version"), { cache: "no-store" });
      if (versionRes.ok) {
        const versionJson = await versionRes.json();
        backendBuild = versionJson?.build || "unknown";
      } else {
        backendBuild = `http_${versionRes.status}`;
      }
    } catch {
      backendBuild = "network_error";
    }

    try {
      const smokeRes = await fetch(backendUrl("/__diagnostic-smoke"), { cache: "no-store" });
      if (smokeRes.ok) {
        const smokeJson = await smokeRes.json();
        backendDiagnosticsReachable = smokeJson?.diagnostics === true ? "yes" : "no";
      } else {
        backendDiagnosticsReachable = `http_${smokeRes.status}`;
      }
    } catch {
      backendDiagnosticsReachable = "network_error";
    }

    deploymentStatus.textContent = [
      `Frontend build active: ${frontendBuild}`,
      `Backend build active: ${backendBuild}`,
      `Backend diagnostics reachable: ${backendDiagnosticsReachable}`,
      `Dashboard API base URL: ${dashboardApiBaseUrl || "(relative origin)"}`
    ].join("\n");
  }

  resetBtn?.addEventListener("click", () => {
    write(KEY_HISTORY, []);
    write(KEY_ACTIVE, null);
    render();
  });

  function renderOpenAiSummaryCard(report) {
    if (!openAiSummaryCard) return;
    const summary = report?.openAiSummary || {};
    const evidenceList = Array.isArray(summary?.evidence) ? summary.evidence : [];
    const recommendedNextStep = Array.isArray(summary?.recommendedNextSteps) && summary.recommendedNextSteps.length
      ? summary.recommendedNextSteps[0]
      : (summary?.codexFixMessage || "n/a");
    openAiSummaryCard.style.display = "block";
    openAiSummaryCard.innerHTML = `
      <h4>AI Summary</h4>
      <div class="ai-summary-grid">
        <div class="label">Likely issue</div><div>${summary?.likelyRootCause || "n/a"}</div>
        <div class="label">Recommended next step</div><div>${recommendedNextStep || "n/a"}</div>
        <div class="label">Confidence</div><div>${summary?.confidence ?? "n/a"}</div>
        <div class="label">Technical evidence</div><div>${evidenceList.length ? evidenceList.map((item) => {
          if (typeof item === "string") return item;
          return [item?.field, item?.value, item?.reason].filter(Boolean).join(": ");
        }).join(" • ") : "none provided"}</div>
        <div class="label">Summary</div><div>${summary?.summary || "No OpenAI summary available."}</div>
      </div>
    `;
  }

  async function runDiagnostic() {
    if (!diagnosticStatus) return;
    diagnosticStatus.textContent = "Running diagnostics…";
    const collector = window.__collectDiagnosticReport;
    const payload = typeof collector === "function" ? collector() : { collectorMissing: true };

    try {
      const authToken = client?.getAuthToken?.() || null;
      const res = await fetch(backendUrl("/api/admin/diagnostics/report"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ ...payload, source: "manual" })
      });
      const json = await res.json();
      const report = json?.data || null;
      const summary = report?.openAiSummary || {};
      const pilot = report?.pilotReadiness || {};
      const avatarRuntime = payload?.runtime?.avatarRuntimeStatus || null;
      diagnosticStatus.textContent = [
        `Build: ${report?.buildVersion || "unknown"}`,
        `Avatar runtime: ${avatarRuntime ? "present" : "missing"}`,
        `Form engine: ${payload?.runtime?.formEngineStatus ? "present" : "missing"}`,
        `Camera status: ${payload?.runtime?.cameraStatus || "unknown"}`,
        `Three bridge fix active: ${avatarRuntime?.threeBridgeFixActive === true ? "yes" : "no"}`,
        `window.__AVATAR_THREE exists: ${avatarRuntime?.avatarThreeGlobalOk === true ? "yes" : "no"}`,
        `window.__AVATAR_THREE.THREE exists: ${avatarRuntime?.threeImportOk === true ? "yes" : "no"}`,
        `window.__AVATAR_THREE.GLTFLoader exists: ${avatarRuntime?.gltfLoaderOk === true ? "yes" : "no"}`,
        `Three import started: ${avatarRuntime?.threeImportStarted === true ? "yes" : "no"}`,
        `Three import pending: ${avatarRuntime?.threeImportPending === true ? "yes" : "no"}`,
        `Three import ok: ${avatarRuntime?.threeImportOk === true ? "yes" : "no"}`,
        `Three import error: ${avatarRuntime?.threeImportError || "none"}`,
        `Three import timeout: ${avatarRuntime?.threeImportTimeout === true ? "yes" : "no"}`,
        `Three import path: ${avatarRuntime?.threeImportPathUsed || "none"}`,
        `Three import probe ok: ${avatarRuntime?.threeImportProbeOk === true ? "yes" : (avatarRuntime?.threeImportProbeOk === false ? "no" : "unknown")}`,
        `Three import probe error: ${avatarRuntime?.threeImportProbeError || "none"}`,
        `Three import probe duration ms: ${avatarRuntime?.threeImportProbeDurationMs ?? "n/a"}`,
        `GLTFLoader import started: ${avatarRuntime?.gltfLoaderImportStarted === true ? "yes" : "no"}`,
        `GLTFLoader import pending: ${avatarRuntime?.gltfLoaderImportPending === true ? "yes" : "no"}`,
        `GLTFLoader import ok: ${avatarRuntime?.gltfLoaderImportOk === true ? "yes" : "no"}`,
        `GLTFLoader import error: ${(avatarRuntime?.gltfLoaderImportOk === true || avatarRuntime?.gltfLoaderLoaded === true) ? "none" : (avatarRuntime?.gltfLoaderImportError || "none")}`,
        `GLTFLoader import timeout: ${avatarRuntime?.gltfLoaderImportTimeout === true ? "yes" : "no"}`,
        `GLTFLoader import path: ${avatarRuntime?.gltfLoaderImportPathUsed || "none"}`,
        `GLTFLoader probe ok: ${avatarRuntime?.gltfLoaderImportProbeOk === true ? "yes" : (avatarRuntime?.gltfLoaderImportProbeOk === false ? "no" : "unknown")}`,
        `GLTFLoader probe error: ${avatarRuntime?.gltfLoaderImportProbeError || "none"}`,
        `GLTFLoader probe duration ms: ${avatarRuntime?.gltfLoaderImportProbeDurationMs ?? "n/a"}`,
        `Three module MIME: ${avatarRuntime?.threeModuleMime || "unknown"}`,
        `GLTFLoader module MIME: ${avatarRuntime?.gltfLoaderModuleMime || "unknown"}`,
        `Import map detected: ${avatarRuntime?.importMapDetected === true ? "yes" : (avatarRuntime?.importMapDetected === false ? "no" : "unknown")}`,
        `Avatar model loaded: ${avatarRuntime?.avatarModelLoaded === true ? "yes" : "no"}`,
        `Avatar model mounted: ${avatarRuntime?.avatarModelMounted === true ? "yes" : "no"}`,
        `Avatar model visible: ${avatarRuntime?.avatarModelVisible === true ? "yes" : "no"}`,
        `Avatar scene children: ${avatarRuntime?.avatarSceneChildrenCount ?? "n/a"}`,
        `Avatar canvas width/height: ${avatarRuntime?.avatarCanvasWidth ?? "n/a"} x ${avatarRuntime?.avatarCanvasHeight ?? "n/a"}`,
        `Avatar canvas display/visibility/opacity/z-index: ${avatarRuntime?.avatarCanvasDisplay || "n/a"} / ${avatarRuntime?.avatarCanvasVisibility || "n/a"} / ${avatarRuntime?.avatarCanvasOpacity || "n/a"} / ${avatarRuntime?.avatarCanvasZIndex || "n/a"}`,
        `Avatar overlay container exists: ${avatarRuntime?.avatarOverlayContainerExists === true ? "yes" : "no"}`,
        `Overlay render loop running: ${avatarRuntime?.overlayRenderLoopRunning === true ? "yes" : "no"}`,
        `Avatar overlay visibility reason: ${avatarRuntime?.avatarOverlayVisibilityReason || "visible"}`,
        `Bridge issue classification: ${avatarRuntime?.threeBridgeFixActive !== true ? "deploy_or_static_path_issue" : (avatarRuntime?.threeImportOk === true ? "bridge_fix_active_import_ok" : "import_issue")}`,
        `Route check: pass=${report?.routeCheck?.passCount ?? "n/a"} protected=${report?.routeCheck?.protectedCount ?? "n/a"} fail=${report?.routeCheck?.failCount ?? "n/a"}`,
        `OpenAI status: ${report?.openAiSummaryStatus || "unknown"}`,
        `Likely root cause: ${summary?.likelyRootCause || "n/a"}`,
        `Confidence: ${summary?.confidence ?? "n/a"}`,
        `Suggested Codex fix: ${summary?.codexFixMessage || "n/a"}`,
        `Summary: ${summary?.summary || "No OpenAI summary available."}`
      ].join("\\n");
      renderOpenAiSummaryCard(report);
      if (pilotReadinessStatus) {
        const missingEvidence = (pilot?.missingEvidence || []).map((item) => item?.label || item?.field).filter(Boolean);
        pilotReadinessStatus.textContent = [
          `Pilot Status: ${pilot?.pilotStatus || "BLOCKED_UNKNOWN"}`,
          `Top blockers: ${(pilot?.blockers || []).slice(0, 3).join(" | ") || "none"}`,
          `Top warnings: ${(pilot?.warnings || []).slice(0, 3).join(" | ") || "none"}`,
          `Missing evidence: ${missingEvidence.slice(0, 5).join(" | ") || "none"}`,
          `Recommended next fix: ${(pilot?.recommendedFixes || [pilot?.codexFixMessage || "n/a"])[0] || "n/a"}`,
          `Confidence: ${pilot?.confidence ?? "n/a"}`
        ].join("\\n");
      }
    } catch (error) {
      diagnosticStatus.textContent = `Diagnostic request failed. Raw payload saved locally.\\n${String(error?.message || error)}`;
      if (openAiSummaryCard) openAiSummaryCard.style.display = "none";
      if (pilotReadinessStatus) {
        pilotReadinessStatus.textContent = "Pilot Readiness unavailable because diagnostics request failed.";
      }
      window.__lastDiagnosticReport = payload;
    }
  }

  runDiagnosticBtn?.addEventListener("click", runDiagnostic);

  window.addEventListener("load", async () => {
    await updateDeploymentStatus();
    await render();
  });
})();
