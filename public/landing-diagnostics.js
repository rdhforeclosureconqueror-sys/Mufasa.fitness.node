(function () {
  "use strict";

  const NODE_BASE_URL = "https://mufasa-fitness-node.onrender.com";
  const VERSION_URL = `${NODE_BASE_URL}/__version`;
  const SMOKE_URL = `${NODE_BASE_URL}/__diagnostic-smoke`;
  const REPORT_URL = `${NODE_BASE_URL}/api/admin/diagnostics/report`;

  const runBtn = document.getElementById("runSystemDiagnosticBtn");
  const probeStatusEl = document.getElementById("landingBackendProbeStatus");
  const resultEl = document.getElementById("landingDiagnosticResult");

  function getAuthToken() {
    const clientToken = window.MufasaBackendRead?.createClient?.({
      baseUrl: NODE_BASE_URL,
      storagePrefix: "maat"
    })?.getAuthToken?.();
    if (clientToken) return clientToken;
    try {
      return localStorage.getItem("maatAuthToken") || null;
    } catch {
      return null;
    }
  }

  async function probeBackend() {
    let connected = false;
    let build = "unreachable";
    let diagnosticsReachable = "no";
    try {
      const versionRes = await fetch(VERSION_URL, { cache: "no-store" });
      if (versionRes.ok) {
        connected = true;
        const versionJson = await versionRes.json();
        build = versionJson?.build || "unknown";
      } else {
        build = `http_${versionRes.status}`;
      }
    } catch {
      build = "network_error";
    }

    try {
      const smokeRes = await fetch(SMOKE_URL, { cache: "no-store" });
      if (smokeRes.ok) {
        const smokeJson = await smokeRes.json();
        diagnosticsReachable = smokeJson?.diagnostics === true ? "yes" : "no";
      } else {
        diagnosticsReachable = `http_${smokeRes.status}`;
      }
    } catch {
      diagnosticsReachable = "network_error";
    }

    probeStatusEl.textContent = [
      `Backend: ${connected ? "Connected" : "Not connected"}`,
      `Build: ${build}`,
      `Diagnostics reachable: ${diagnosticsReachable}`
    ].join(" | ");
  }

  function renderReport(report, payload) {
    const pilot = report?.pilotReadiness || {};
    const summary = report?.openAiSummary || {};
    const avatarRuntime = payload?.runtime?.avatarRuntimeStatus || null;
    const warnings = Array.isArray(pilot?.warnings) ? pilot.warnings : [];
    const blockers = Array.isArray(pilot?.blockers) ? pilot.blockers : [];
    const missingEvidence = Array.isArray(pilot?.missingEvidence) ? pilot.missingEvidence : [];
    const nextFix = (pilot?.recommendedFixes || [summary?.codexFixMessage || "n/a"])[0] || "n/a";
    const openAiStatus = report?.openAiSummaryStatus || "unavailable";
    const openAiKeyMissing = report?.openAiApiKeyMissing === true;
    const fallbackNextAction = "Run a live workout test, then rerun diagnostic.";
    resultEl.textContent = [
      `Backend build status: ${report?.buildVersion || "unknown"}`,
      `Diagnostics reachable: ${report?.routeCheck ? "yes" : "unknown"}`,
      `Pilot readiness status: ${pilot?.pilotStatus || "BLOCKED_UNKNOWN"}`,
      `Blockers: ${blockers.length ? blockers.join(" | ") : "none"}`,
      `Warnings: ${warnings.length ? warnings.join(" | ") : "none"}`,
      `Missing evidence: ${missingEvidence.length ? missingEvidence.map((item) => item.label || item.field || "unknown").join(" | ") : "none"}`,
      `Recommended next fix: ${nextFix}`,
      `OpenAI summary status: ${openAiStatus}`,
      `OPENAI_API_KEY missing: ${openAiKeyMissing ? "yes" : "no"}`,
      `OpenAI likely root cause: ${summary?.likelyRootCause || "n/a"}`,
      `Next action: ${fallbackNextAction}`,
      `Raw route check: pass=${report?.routeCheck?.passCount ?? "n/a"} fail=${report?.routeCheck?.failCount ?? "n/a"}`,
      `Raw runtime avatar status: ${avatarRuntime ? "present" : "missing"}`,
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
      `Avatar failureReason: ${avatarRuntime?.failureReason || avatarRuntime?.failedReason || "n/a"}`,
      `Bridge issue classification: ${avatarRuntime?.threeBridgeFixActive !== true ? "deploy_or_static_path_issue" : (avatarRuntime?.threeImportOk === true ? "bridge_fix_active_import_ok" : "import_issue")}`,
      `Avatar glbLoadError: ${avatarRuntime?.glbLoadError || "n/a"}`,
      `Avatar WebGL status: ok=${avatarRuntime?.webglOk ?? "n/a"} available=${avatarRuntime?.webglAvailable ?? "n/a"}`,
      `Avatar renderer status: created=${avatarRuntime?.rendererCreated ?? "n/a"} scene=${avatarRuntime?.sceneCreated ?? "n/a"} camera=${avatarRuntime?.cameraCreated ?? "n/a"}`,
      `Avatar canvas status: found=${avatarRuntime?.canvasFound ?? "n/a"} ok=${avatarRuntime?.canvasOk ?? "n/a"} created=${avatarRuntime?.canvasCreated ?? "n/a"}`,
      `Avatar GLTFLoader status: ok=${avatarRuntime?.gltfLoaderOk ?? "n/a"} loaded=${avatarRuntime?.gltfLoaderLoaded ?? "n/a"}`,
      `Avatar model loaded/mounted/visible: ${avatarRuntime?.avatarModelLoaded ?? "n/a"} / ${avatarRuntime?.avatarModelMounted ?? "n/a"} / ${avatarRuntime?.avatarModelVisible ?? "n/a"}`,
      `Avatar scene children: ${avatarRuntime?.avatarSceneChildrenCount ?? "n/a"}`,
      `Avatar canvas width/height: ${avatarRuntime?.avatarCanvasWidth ?? "n/a"} x ${avatarRuntime?.avatarCanvasHeight ?? "n/a"}`,
      `Avatar canvas display/visibility/opacity/z-index: ${avatarRuntime?.avatarCanvasDisplay || "n/a"} / ${avatarRuntime?.avatarCanvasVisibility || "n/a"} / ${avatarRuntime?.avatarCanvasOpacity || "n/a"} / ${avatarRuntime?.avatarCanvasZIndex || "n/a"}`,
      `Avatar overlay container exists: ${avatarRuntime?.avatarOverlayContainerExists ?? "n/a"}`,
      `Avatar overlay render loop running: ${avatarRuntime?.overlayRenderLoopRunning ?? "n/a"}`,
      `Avatar overlay visibility reason: ${avatarRuntime?.avatarOverlayVisibilityReason || "visible"}`,
      `Avatar lastAvatarUrl: ${avatarRuntime?.lastAvatarUrl || "n/a"}`,
      `Avatar fetch status: ${avatarRuntime?.lastAvatarFetchStatus ?? "n/a"}`,
      `Avatar fetch bytes: ${avatarRuntime?.lastAvatarFetchBytes ?? "n/a"}`,
      `Avatar fetch MIME: ${avatarRuntime?.lastAvatarFetchMime || "n/a"}`
    ].join("\n");
  }

  async function runDiagnostic() {
    resultEl.textContent = "Running system diagnostic…";
    const collector = window.__collectDiagnosticReport;
    const payload = typeof collector === "function" ? collector() : { collectorMissing: true };
    const token = getAuthToken();
    try {
      const res = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...payload, source: "landing_manual" })
      });

      if (res.status === 401 || res.status === 403) {
        resultEl.textContent = "Diagnostic endpoint requires admin/operator permission.";
        return;
      }

      const json = await res.json();
      const report = json?.data || null;
      if (!res.ok || !report) {
        resultEl.textContent = `Diagnostic request failed (${res.status}).`;
        return;
      }
      renderReport(report, payload);
    } catch (error) {
      resultEl.textContent = `Diagnostic request failed: ${String(error?.message || error)}`;
    }
  }

  runBtn?.addEventListener("click", runDiagnostic);
  probeBackend();
})();
