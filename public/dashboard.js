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

  const nodeBaseUrl = localStorage.getItem("maatNodeBaseUrl") || "";
  const client = window.MufasaBackendRead?.createClient({
    baseUrl: nodeBaseUrl,
    storagePrefix: "maat"
  });

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
        warning: token ? null : "Sign in from the main app to sync server history."
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
          warning: "Session expired. Please sign in again from the main app."
        };
      }
      return {
        active,
        history: localHistory,
        source: "local",
        warning: "Server history unavailable. Showing local history."
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
      note.textContent = `Data source: ${source}. ${warning}`;
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

  resetBtn?.addEventListener("click", () => {
    write(KEY_HISTORY, []);
    write(KEY_ACTIVE, null);
    render();
  });

  window.addEventListener("load", render);
})();
