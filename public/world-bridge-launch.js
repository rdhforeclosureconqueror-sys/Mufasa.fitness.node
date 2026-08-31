(function initPocketPTWorldLaunch(global) {
  "use strict";

  const DEBUG_STAGES = [
    ["PUSHUP_PAGE", "Push-Up page loaded"],
    ["AUTH_READY", "PocketPT auth ready"],
    ["BACKEND_RESOLVED", "Backend origin resolved"],
    ["SESSION_CREATE", "Arena session created"],
    ["ARENA_NAVIGATION", "Navigate to arena"]
  ];
  const debugState = new Map(DEBUG_STAGES.map(([id, label]) => [id, { id, label, status: "WAITING", detail: "", at: null }]));

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
      .replace(/ticket=[A-Za-z0-9_-]+/gi, "ticket=[REDACTED]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      .slice(0, 240);
  }

  function mark(stage, status, detail = "") {
    const current = debugState.get(stage);
    if (!current) return;
    current.status = status;
    current.detail = clean(detail);
    current.at = new Date().toISOString();
    renderDebug();
  }

  function firstFailure() {
    return [...debugState.values()].find((step) => step.status === "FAIL") || null;
  }

  function snapshotText() {
    const failure = firstFailure();
    const lines = [
      "PocketPT ↔ Godot World Bridge Debug",
      `Page: ${global.location?.pathname || ""}`,
      `First failure: ${failure ? `${failure.id} — ${failure.detail || failure.label}` : "none"}`,
      ""
    ];
    for (const step of debugState.values()) lines.push(`${step.status.padEnd(7)} ${step.id} — ${step.label}${step.detail ? ` — ${step.detail}` : ""}${step.at ? ` — ${step.at}` : ""}`);
    return lines.join("\n");
  }

  function installDebugBoard() {
    if (!global.document || global.document.getElementById("worldBridgeDebugToggle")) return;
    const style = global.document.createElement("style");
    style.textContent = "#worldBridgeDebugToggle{position:fixed;z-index:99998;right:14px;bottom:14px;border:1px solid #75611f;background:#17130a;color:#ffd35a;border-radius:999px;padding:10px 14px;box-shadow:0 10px 30px #0008;font:700 13px system-ui}#worldBridgeDebugBoard{position:fixed;z-index:99999;right:12px;bottom:60px;width:min(430px,calc(100vw - 24px));max-height:min(72vh,620px);overflow:auto;background:#090b10f5;color:#f5f7fb;border:1px solid #3b4659;border-radius:16px;box-shadow:0 24px 70px #000c;padding:14px;font:13px system-ui;backdrop-filter:blur(12px)}#worldBridgeDebugBoard[hidden]{display:none}#worldBridgeDebugBoard h3{margin:0 0 4px;color:#ffd35a;font-size:17px}#worldBridgeDebugBoard .wb-sub{color:#9aa7bb;margin:0 0 10px}#worldBridgeDebugBoard .wb-first{border:1px solid #445067;background:#111722;border-radius:10px;padding:9px;margin:8px 0 12px}#worldBridgeDebugBoard .wb-first.fail{border-color:#8e3242;background:#2b1117;color:#ffb6c1}#worldBridgeDebugBoard ol{list-style:none;margin:0;padding:0;display:grid;gap:7px}#worldBridgeDebugBoard li{display:grid;grid-template-columns:72px 1fr;gap:8px;border:1px solid #293244;border-radius:9px;padding:8px;background:#0d1119}#worldBridgeDebugBoard .wb-status{font-weight:800;font-size:11px;letter-spacing:.04em}.wb-WAITING{color:#8994a7}.wb-RUNNING{color:#ffd35a}.wb-PASS{color:#4ee19a}.wb-FAIL{color:#ff718b}.wb-SKIP{color:#87b8ff}#worldBridgeDebugBoard small{display:block;color:#96a2b5;margin-top:2px;overflow-wrap:anywhere}#worldBridgeDebugBoard .wb-actions{display:flex;gap:8px;margin-top:12px}#worldBridgeDebugBoard .wb-actions button{min-height:36px;padding:7px 10px;font-size:12px;background:#20283a;border:1px solid #3b4659;color:#fff;border-radius:8px}@media(max-width:600px){#worldBridgeDebugBoard{right:8px;bottom:58px;width:calc(100vw - 16px)}}";
    global.document.head.appendChild(style);
    const toggle = global.document.createElement("button");
    toggle.id = "worldBridgeDebugToggle";
    toggle.type = "button";
    toggle.textContent = "Bridge Debug";
    toggle.setAttribute("aria-controls", "worldBridgeDebugBoard");
    toggle.setAttribute("aria-expanded", "false");
    const board = global.document.createElement("aside");
    board.id = "worldBridgeDebugBoard";
    board.hidden = true;
    board.setAttribute("aria-label", "PocketPT Godot bridge debug command board");
    global.document.body.append(toggle, board);
    toggle.addEventListener("click", () => {
      board.hidden = !board.hidden;
      toggle.setAttribute("aria-expanded", String(!board.hidden));
      renderDebug();
    });
    renderDebug();
  }

  function renderDebug() {
    const board = global.document?.getElementById("worldBridgeDebugBoard");
    if (!board) return;
    const failure = firstFailure();
    board.innerHTML = `<h3>World Bridge Command Board</h3><p class="wb-sub">Launch-side diagnostic trace · credentials are never displayed.</p><div class="wb-first ${failure ? "fail" : ""}">${failure ? `<strong>FIRST FAILURE:</strong> ${escapeHtml(failure.id)} — ${escapeHtml(failure.detail || failure.label)}` : "No failure detected yet."}</div><ol>${[...debugState.values()].map((step) => `<li><span class="wb-status wb-${step.status}">${step.status}</span><div><strong>${escapeHtml(step.label)}</strong><small>${escapeHtml(step.detail || step.id)}${step.at ? ` · ${escapeHtml(step.at.split("T")[1].replace("Z", ""))}` : ""}</small></div></li>`).join("")}</ol><div class="wb-actions"><button type="button" id="copyWorldBridgeDebug">Copy Debug Report</button></div>`;
    board.querySelector("#copyWorldBridgeDebug")?.addEventListener("click", async () => {
      try { await global.navigator?.clipboard?.writeText(snapshotText()); } catch (_) {}
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function createArenaSession() {
    mark("AUTH_READY", "RUNNING", "Waiting for canonical AuthStateRuntime");
    const readiness = await global.AuthStateRuntime?.whenReady?.();
    const token = readiness?.auth?.token || global.AuthStateRuntime?.getAuthToken?.();
    if (!readiness?.ok || !token) {
      mark("AUTH_READY", "FAIL", "Canonical PocketPT authentication is not ready or no token is available");
      throw new Error("Sign in to PocketPT before entering the arena.");
    }
    mark("AUTH_READY", "PASS", "Canonical PocketPT session restored");
    const backendOrigin = global.MaatApiClient?.origin?.()
      || global.RuntimeState?.getEndpoints?.().nodeBaseUrl
      || global.RuntimeState?.getBackendOrigin?.()
      || global.MAAT_BACKEND_ORIGIN
      || global.MAAT_NODE_BASE_URL
      || global.location.origin;
    mark("BACKEND_RESOLVED", backendOrigin ? "PASS" : "FAIL", backendOrigin ? new URL(String(backendOrigin), global.location.href).origin : "No backend origin resolved");
    mark("SESSION_CREATE", "RUNNING", "POST /api/game/sessions");
    let response;
    try {
      response = await global.fetch(`${String(backendOrigin).replace(/\/$/, "")}/api/game/sessions`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ experienceType: "PUSH_UP_ARENA", challengeId: "push_up" })
      });
    } catch (error) {
      mark("SESSION_CREATE", "FAIL", `Network error: ${error?.message || "request failed"}`);
      throw error;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true || !payload?.data?.launchUrl) {
      mark("SESSION_CREATE", "FAIL", `HTTP ${response.status}: ${payload?.error?.message || "launch URL missing"}`);
      throw new Error(payload?.error?.message || `Arena launch failed (${response.status}).`);
    }
    mark("SESSION_CREATE", "PASS", `HTTP ${response.status}; one-time arena launch created`);
    return payload.data;
  }

  function installButton() {
    installDebugBoard();
    mark("PUSHUP_PAGE", "PASS", "World bridge launcher loaded");
    const controls = global.document?.querySelector?.(".controls");
    if (!controls || global.document.getElementById("enterBeastArenaBtn")) return false;
    const button = global.document.createElement("button");
    button.id = "enterBeastArenaBtn";
    button.type = "button";
    button.textContent = "Enter Unleash the Beast";
    button.setAttribute("aria-describedby", "cameraStatus");
    button.addEventListener("click", async () => {
      const original = button.textContent;
      button.disabled = true;
      button.textContent = "Connecting to arena…";
      try {
        const session = await createArenaSession();
        mark("ARENA_NAVIGATION", "PASS", "Opening first-party arena shell");
        global.location.assign(session.launchUrl);
      } catch (error) {
        if (!firstFailure()) mark("ARENA_NAVIGATION", "FAIL", error?.message || "Arena launch failed");
        const target = global.document.getElementById("cameraStatus");
        if (target) {
          target.textContent = error?.message || "Arena launch failed.";
          target.className = "bad";
        }
        button.disabled = false;
        button.textContent = original;
        const board = global.document.getElementById("worldBridgeDebugBoard");
        const toggle = global.document.getElementById("worldBridgeDebugToggle");
        if (board && toggle) { board.hidden = false; toggle.setAttribute("aria-expanded", "true"); renderDebug(); }
      }
    });
    controls.appendChild(button);
    return true;
  }

  global.PocketPTWorldLaunch = { createArenaSession, installButton, debug: { mark, snapshotText } };
  if (global.document?.readyState === "loading") global.document.addEventListener("DOMContentLoaded", installButton, { once: true });
  else installButton();
})(typeof window !== "undefined" ? window : globalThis);
