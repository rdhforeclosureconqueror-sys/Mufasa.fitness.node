/* =========================================================
   dashboard.js — backend-authoritative dashboard renderer
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
  const launchHealthSections = document.getElementById("launchHealthSections");
  const runExternalChecksBtn = document.getElementById("runExternalChecksBtn");
  const exportDiagnosticBtn = document.getElementById("exportDiagnosticBtn");
  const copyRepairSummaryBtn = document.getElementById("copyRepairSummaryBtn");
  const refreshDiagnosticBtn = document.getElementById("refreshDiagnosticBtn");
  const runClubDiagnosticsNav = document.getElementById("runClubDiagnosticsNav");
  const pilotReadinessStatus = document.getElementById("pilotReadinessStatus");
  const openAiSummaryCard = document.getElementById("openAiSummaryCard");
  const deploymentStatus = document.getElementById("deploymentStatus");
  const launchHealthStatus = document.getElementById("launchHealthStatus");
  const frontendUrlEl = document.getElementById("frontendUrl");
  const backendUrlEl = document.getElementById("backendUrl");

  const nodeBaseUrl = (window.RuntimeState?.getBackendOrigin?.()
    || window.MAAT_BACKEND_ORIGIN
    || window.MAAT_NODE_BASE_URL
    || window.location.origin)
    .replace(/\/$/, "");
  const client = window.MufasaBackendRead?.createClient({
    baseUrl: nodeBaseUrl,
    storagePrefix: "maat"
  });
  const dashboardApiBaseUrl = nodeBaseUrl;

  function backendUrl(pathname) {
    return `${dashboardApiBaseUrl}${pathname}`;
  }

  function getDashboardAuthToken() {
    return window.AuthStateRuntime?.getAuthToken?.() || client?.getAuthToken?.() || null;
  }

  async function revealRunClubDiagnosticsForAdmin() {
    if (!runClubDiagnosticsNav) return;
    const auth = await window.AuthStateRuntime?.whenReady?.();
    const roles = auth?.user?.roles || (auth?.user?.role ? [auth.user.role] : []);
    runClubDiagnosticsNav.hidden = !roles.some((role) => role === "admin" || role === "super_admin");
  }

  revealRunClubDiagnosticsForAdmin().catch(() => {
    if (runClubDiagnosticsNav) runClubDiagnosticsNav.hidden = true;
  });

  async function memberExperience(pathname) {
    const token = getDashboardAuthToken();
    if (!token) throw new Error("Sign in to view member progress.");
    const response = await fetch(backendUrl(pathname), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error?.message || "Authoritative progress is unavailable.");
    return body?.data ?? body;
  }

  async function renderMemberExperiences() {
    await window.AuthStateRuntime?.whenReady?.();
    const greatness = document.getElementById("greatnessSummary");
    const pushup = document.getElementById("pushupSummary");
    const showError = (element, error) => { if (element) element.textContent = error.message; };
    memberExperience("/api/me/greatness/journey").then((journey) => {
      const activities = journey.activities || [];
      greatness.textContent = activities.length
        ? `${activities.length} saved activit${activities.length === 1 ? "y" : "ies"} · ${Math.round((journey.lifetimeDistanceMeters || 0) / 100) / 10} km lifetime distance. Continue your journey.`
        : "No saved movement yet. Start your first journey activity when you are ready.";
    }).catch((error) => showError(greatness, error));
    memberExperience("/api/me/challenges/pushup").then((summary) => {
      pushup.textContent = summary.completedSessions
        ? `${summary.completedSessions} saved session${summary.completedSessions === 1 ? "" : "s"} · best score ${summary.bestResult.totalScore} · all-time rank ${summary.leaderboardRank}.`
        : "Not started. Open the challenge to practice or submit your first consented result.";
    }).catch((error) => showError(pushup, error));
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

  function formatDashboardError(err) {
    return err?.message || String(err || "unknown_error");
  }

  async function loadData() {
    await window.AuthStateRuntime?.whenReady?.();
    const active = read(KEY_ACTIVE, null);
    const token = getDashboardAuthToken();

    if (!client) {
      throw new Error("/api/me/history: backend read client unavailable");
    }
    if (!token) {
      throw new Error("/api/me/history: missing_auth_token");
    }

    const serverHistory = window.MufasaDashboardRuntime?.refreshHistory
      ? await window.MufasaDashboardRuntime.refreshHistory({ limit: 25, visibleErrors: false })
      : await client.fetchHistory(25);
    const mapped = toLocalHistoryShape(serverHistory);
    return {
      active,
      history: mapped,
      source: "server",
      warning: null
    };
  }

  async function render() {
    let data;
    try {
      data = await loadData();
    } catch (err) {
      console.error("[DASHBOARD_RUNTIME] render failed", err);
      window.MufasaDashboardRuntime?.renderVisibleError?.(err);
      elPlanned.textContent = "0";
      elCompleted.textContent = "0";
      elConsistency.textContent = "0%";
      activeBox.textContent = "No active workout found.";
      activeMini.textContent = "";
      historyList.innerHTML = `<div class="muted">⚠️ ${formatDashboardError(err)}</div>`;
      return;
    }

    const { history, active, source, warning } = data;

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

    const dashboardRuntimeStatus = document.getElementById("dashboardRuntimeStatus");
    if (dashboardRuntimeStatus) dashboardRuntimeStatus.textContent = `Backend history loaded from /api/me/history (${history.length} completed sessions).`;

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
      window.FRONTEND_BUILD_VERSION = payload?.build || null;
      window.FRONTEND_COMMIT = payload?.commit || null;
      window.FRONTEND_ASSET_CACHE_TOKEN = payload?.assetCacheToken || null;
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
      const authToken = getDashboardAuthToken();
      if (!authToken) {
        const missingTokenError = new Error("missing_auth_token");
        missingTokenError.code = "MISSING_AUTH_TOKEN";
        throw missingTokenError;
      }
      const res = await fetch(backendUrl("/api/admin/diagnostics/report"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ ...payload, source: "manual" })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const requestError = new Error(json?.error?.message || json?.error || `request_failed_${res.status}`);
        requestError.status = res.status;
        requestError.payload = json;
        throw requestError;
      }
      const report = json?.data || null;
      const launchHealthRes = await fetch(backendUrl("/api/admin/launch-health"), {
        cache: "no-store",
        headers: { authorization: `Bearer ${authToken}` }
      });
      const launchHealthJson = await launchHealthRes.json().catch(() => null);
      if (launchHealthStatus) {
        const health = launchHealthJson?.data;
        launchHealthStatus.textContent = health?.checks?.map((entry) => {
          const marker = entry.status === "ready" ? "✅" : entry.status === "blocked" ? "❌" : "⚠️";
          return `${marker} ${entry.id.replaceAll("_", " ")}: ${entry.status}`;
        }).join("\n") || `Launch health unavailable (HTTP ${launchHealthRes.status}).`;
      }
      const summary = report?.openAiSummary || {};
      const pilot = report?.pilotReadiness || {};
      const launchHealth = report?.launchHealth || null;
      window.__lastLaunchHealth = launchHealth;
      const avatarRuntime = payload?.runtime?.avatarRuntimeStatus || null;
      diagnosticStatus.textContent = [
        `Build: ${report?.buildVersion || "unknown"}`,
        `Avatar runtime: ${launchHealth?.avatar?.enabled === false ? "DISABLED_INTENTIONALLY" : (avatarRuntime ? "present" : "not initialized")}`,
        `Form engine: ${payload?.runtime?.formEngineStatus ? "present" : "capability not requested on this page"}`,
        `Camera status: ${payload?.runtime?.cameraStatus || "capability not requested on this page"}`,
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
        `Bridge issue classification: ${avatarRuntime?.threeBridgeFixActive !== true ? "deploy_or_static_path_issue" : (avatarRuntime?.threeImportStarted !== true ? "not_loaded_yet" : (avatarRuntime?.threeImportOk === true ? "bridge_fix_active_import_ok" : "import_issue"))}`,
        `Route check: pass=${report?.routeCheck?.passCount ?? "n/a"} protected=${report?.routeCheck?.protectedCount ?? "n/a"} fail=${report?.routeCheck?.failCount ?? "n/a"}`,
        `OpenAI status: ${report?.openAiSummaryStatus || "unknown"}`,
        `Likely root cause: ${summary?.likelyRootCause || "n/a"}`,
        `Confidence: ${summary?.confidence ?? "n/a"}`,
        `Suggested Codex fix: ${summary?.codexFixMessage || "n/a"}`,
        `Summary: ${summary?.summary || "No OpenAI summary available."}`
      ].filter(line => launchHealth?.avatar?.enabled !== false || !/Three|GLTF|Avatar model|Avatar scene|Avatar canvas|Avatar overlay|Bridge issue|Import map/.test(line)).join("\\n");
      renderOpenAiSummaryCard(report);
      renderLaunchHealth(launchHealth);
      if (pilotReadinessStatus) {
        const missingEvidence = (pilot?.missingEvidence || []).map((item) => item?.label || item?.field).filter(Boolean);
        pilotReadinessStatus.textContent = [
          `Retention Motivation Status: ${pilot?.pilotStatus || "NOT_READY"}`,
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

  const healthDomains = ["Deployment", "Environment", "Security", "Authentication", "Storage", "Program", "Workout", "Exercise Intelligence", "Yoga and Movement", "Gamification", "Notifications", "Leaderboards", "AI Coach", "Stripe", "Optional/Excluded Systems", "Member Journey", "Launch Readiness"];
  function renderLaunchHealth(health) {
    if (!launchHealthSections || !health) return;
    launchHealthSections.replaceChildren(...healthDomains.map((domain) => {
      const section = document.createElement("section"); section.className = "card";
      const title = document.createElement("h3"); title.textContent = domain;
      const rows = domain === "Launch Readiness" ? [{ id: "overall", status: health.launchReadiness?.status, explanation: `Blockers: ${(health.launchReadiness?.blockers || []).join(", ") || "none"}`, blocking: (health.launchReadiness?.blockers || []).length > 0, lastCheckedAt: health.generatedAt }] : (health.checks || []).filter(item => item.domain === domain);
      const body = document.createElement("div"); body.className = "diagPre";
      body.textContent = rows.length ? rows.map(item => `${item.status || "UNKNOWN"} — ${item.affectedFeature || item.id}\n${item.explanation || ""}\nBlocking: ${item.blocking ? "yes" : "no"}${item.remediation ? `\nRemediation: ${item.remediation}` : ""}\nChecked: ${item.lastCheckedAt || health.generatedAt}`).join("\n\n") : "No applicable Version 1 checks.";
      section.append(title, body); return section;
    }));
  }
  async function adminDiagnosticFetch(route, options = {}) {
    const token = getDashboardAuthToken();
    const response = await fetch(backendUrl(route), { ...options, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
    const json = await response.json(); if (!response.ok) throw new Error(json?.error?.message || `Diagnostic request failed (${response.status})`); return json.data;
  }
  runExternalChecksBtn?.addEventListener("click", async () => { runExternalChecksBtn.disabled = true; try { const result = await adminDiagnosticFetch("/api/admin/diagnostics/external-checks", { method: "POST", body: JSON.stringify({ stripe: true }) }); alert(`Safe external checks: Stripe ${result?.stripe?.status || "unknown"}. No resources modified.`); } catch (error) { alert(error.message); } finally { runExternalChecksBtn.disabled = false; } });
  exportDiagnosticBtn?.addEventListener("click", async () => { const report = await adminDiagnosticFetch("/api/admin/diagnostics/export"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })); link.download = "mufasa-launch-health-redacted.json"; link.click(); URL.revokeObjectURL(link.href); });
  copyRepairSummaryBtn?.addEventListener("click", async () => { const health = window.__lastLaunchHealth; await navigator.clipboard.writeText(`Launch health: ${health?.launchReadiness?.status || "UNKNOWN"}. Blockers: ${(health?.launchReadiness?.blockers || []).join(", ") || "none"}. Warnings: ${(health?.launchReadiness?.warnings || []).join(", ") || "none"}. This summary is redacted.`); });
  refreshDiagnosticBtn?.addEventListener("click", async () => { try { const health = await adminDiagnosticFetch("/api/admin/diagnostics/summary"); window.__lastLaunchHealth = health; renderLaunchHealth(health); } catch (error) { diagnosticStatus.textContent = error.message; } });

  runDiagnosticBtn?.addEventListener("click", runDiagnostic);
  renderMemberExperiences();

  window.addEventListener("load", async () => {
    await window.AuthStateRuntime?.whenReady?.();
    window.AuthStateRuntime?.renderSafeDiagnostics?.("authContinuityStatus");
    await updateDeploymentStatus();
    await render();
  });
  window.addEventListener("auth:changed", () => window.AuthStateRuntime?.renderSafeDiagnostics?.("authContinuityStatus"));
})();
