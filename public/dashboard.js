/* =========================================================
   dashboard.js — renders client-facing dashboard from localStorage
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

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function startOfWeek(d = new Date()) {
    const x = new Date(d);
    const day = x.getDay(); // 0 Sun .. 6 Sat
    const diff = (day + 6) % 7; // Monday=0
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

  function render() {
    const history = read(KEY_HISTORY, []);
    const active = read(KEY_ACTIVE, null);

    // KPIs
    const weekly = history.filter(s => isThisWeek(s.date));
    const planned = weekly.length;
    const completed = weekly.filter(s => s.status === "completed").length;
    const consistency = planned ? Math.round((completed / planned) * 100) : 0;

    elPlanned.textContent = String(planned);
    elCompleted.textContent = String(completed);
    elConsistency.textContent = `${consistency}%`;

    // Active
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

    // History list
    historyList.innerHTML = "";
    if (!history.length) {
      historyList.innerHTML = `<div class="muted">No history yet. Generate a workout in the main app and it will appear here.</div>`;
      return;
    }

    for (const s of history.slice(0, 25)) {
      const left = `
        <div class="left">
          <div style="font-size:13px; color:rgba(233,241,255,.92)">${s.date || ""}</div>
          <div class="muted">${summarize(s)}</div>
          <div class="muted">Goal: ${s.profileSnapshot?.goal || "—"}</div>
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
