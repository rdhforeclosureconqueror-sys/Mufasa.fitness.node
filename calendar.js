// calendar.js
// Ma'at 2.0 profile + calendar + today's workout view

"use strict";

const MAAT_BASE_URL = "https://mufasabrain.onrender.com";

let currentUserId = "rashad";
let currentProgram = null;
let schedule = []; // flattened list of { date, week, dayIndex, label, focus, summary }
let completedDates = []; // ISO date strings we've marked done

// --- DOM hooks ---
const userIdInput      = document.getElementById("userIdInput");
const setUserBtn       = document.getElementById("setUserBtn");
const currentUserLabel = document.getElementById("currentUserLabel");
const profileStatusEl  = document.getElementById("profileStatus");
const calendarRoot     = document.getElementById("calendarRoot");
const daySelect        = document.getElementById("daySelect");
const todayWorkoutCard = document.getElementById("todayWorkoutCard");
const nextDayBtn       = document.getElementById("nextDayBtn");

// ---- helpers ----
function loadCompletedFromStorage() {
  const key = "mf_completed_" + currentUserId;
  try {
    completedDates = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    completedDates = [];
  }
}

function saveCompletedToStorage() {
  const key = "mf_completed_" + currentUserId;
  localStorage.setItem(key, JSON.stringify(completedDates));
}

function markWorkoutDoneToday() {
  const today = new Date().toISOString().slice(0, 10);
  if (!completedDates.includes(today)) {
    completedDates.push(today);
    saveCompletedToStorage();
    renderCalendar();
  }
}

// expose so main script can call it when a session ends
window.markWorkoutDoneToday = markWorkoutDoneToday;

// Format a day from a program into readable text
function formatDaySummary(day) {
  if (!day) return "No details for this day.";

  const lines = [];
  lines.push(`**${day.label}** — ${day.focus}`);

  if (Array.isArray(day.blocks)) {
    for (const block of day.blocks) {
      lines.push("");
      lines.push(block.type.toUpperCase() + ": " + (block.description || ""));
      if (Array.isArray(block.items)) {
        for (const it of block.items) {
          lines.push(" • " + it);
        }
      }
    }
  }
  return lines.join("\n");
}

// Flatten Ma'at program into schedule array
function buildScheduleFromProgram(program) {
  if (!program || !Array.isArray(program.plan)) {
    schedule = [];
    return;
  }

  const out = [];
  const startDate = new Date(); // today = Week 1 Day 1

  let cursor = new Date(startDate);
  const weeks = [...program.plan].sort((a, b) => (a.week || 0) - (b.week || 0));

  for (const w of weeks) {
    const days = [...(w.days || [])].sort(
      (a, b) => (a.day_index || 0) - (b.day_index || 0)
    );
    for (const d of days) {
      const dateStr = cursor.toISOString().slice(0, 10);
      out.push({
        date: dateStr,
        week: w.week,
        dayIndex: d.day_index,
        label: d.label,
        focus: d.focus,
        summary: formatDaySummary(d),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  schedule = out;
}

// Render simple month-style calendar
function renderCalendar() {
  calendarRoot.innerHTML = "";

  if (!schedule.length) {
    calendarRoot.textContent = "No program loaded yet.";
    return;
  }

  const firstDate = new Date(schedule[0].date);
  const monthName = firstDate.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "4px";
  header.innerHTML = `<span style="font-weight:600;">${monthName}</span>
    <span style="font-size:0.75rem; color:#9ca3af;">Gold = done • Green = planned</span>`;
  calendarRoot.appendChild(header);

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(7, 1fr)";
  grid.style.gap = "4px";
  grid.style.fontSize = "0.75rem";
  grid.style.marginTop = "4px";

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  for (const d of weekdays) {
    const cell = document.createElement("div");
    cell.textContent = d;
    cell.style.textAlign = "center";
    cell.style.color = "#9ca3af";
    grid.appendChild(cell);
  }

  // figure out all days we need for this month
  const year = firstDate.getFullYear();
  const month = firstDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDayIndex = firstOfMonth.getDay();
  const nextMonth = new Date(year, month + 1, 1);
  const daysInMonth = Math.round(
    (nextMonth - firstOfMonth) / (1000 * 60 * 60 * 24)
  );

  // quick lookup: dateStr -> schedule record
  const byDate = new Map();
  for (const e of schedule) byDate.set(e.date, e);

  // blanks before month start
  for (let i = 0; i < startDayIndex; i++) {
    const empty = document.createElement("div");
    grid.appendChild(empty);
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().slice(0, 10);
    const cell = document.createElement("div");
    cell.style.textAlign = "center";
    cell.style.padding = "4px 0";
    cell.style.borderRadius = "999px";
    cell.style.cursor = "pointer";
    cell.style.border = "1px solid rgba(31,41,55,0.9)";
    cell.style.background = "#020617";

    const entry = byDate.get(dateStr);
    const isCompleted = completedDates.includes(dateStr);
    const isToday = dateStr === todayStr;

    if (entry) {
      // planned workout day = green outline
      cell.style.border = "1px solid #22c55e";
      cell.title = entry.label || "Workout";

      if (isCompleted) {
        // done = gold ring
        cell.style.border = "2px solid #eab308";
      }
    }

    if (isToday) {
      // today = red text highlight
      cell.style.color = "#f97316";
      cell.style.fontWeight = "600";
    } else {
      cell.style.color = entry ? "#e5e7eb" : "#6b7280";
    }

    cell.textContent = String(day);
    cell.onclick = () => {
      // when you click, find matching schedule item and show in card
      const match = schedule.find((s) => s.date === dateStr);
      if (match) {
        setDaySelectionByDate(match.date);
      }
    };

    grid.appendChild(cell);
  }

  calendarRoot.appendChild(grid);
}

// populate dropdown of schedule days
function renderDayDropdown() {
  daySelect.innerHTML = "";

  if (!schedule.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No program loaded yet";
    daySelect.appendChild(opt);
    return;
  }

  schedule.forEach((entry, idx) => {
    const opt = document.createElement("option");
    opt.value = entry.date;
    opt.textContent = `Day ${idx + 1} • ${entry.label}`;
    daySelect.appendChild(opt);
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntry = schedule.find((s) => s.date === todayStr);
  daySelect.value = todayEntry ? todayEntry.date : schedule[0].date;
  updateTodayWorkoutFromDropdown();
}

function setDaySelectionByDate(dateStr) {
  if (!schedule.length) return;
  const exists = schedule.find((s) => s.date === dateStr);
  if (!exists) return;
  daySelect.value = dateStr;
  updateTodayWorkoutFromDropdown();
}

function updateTodayWorkoutFromDropdown() {
  const dateStr = daySelect.value;
  if (!dateStr) {
    todayWorkoutCard.textContent =
      "No program loaded yet. Run an Overhead Squat Assessment to generate your first plan.";
    return;
  }
  const entry = schedule.find((s) => s.date === dateStr);
  if (!entry) return;
  todayWorkoutCard.textContent = entry.summary;
}

// ---- Ma'at API calls ----
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// load profile + latest program for current user
async function loadProfileAndProgram() {
  if (!currentUserId) return;
  profileStatusEl.textContent = "Loading profile…";

  loadCompletedFromStorage();

  try {
    // profile (optional, just to confirm)
    const prof = await fetchJSON(
      `${MAAT_BASE_URL}/users/profile/get?user_id=${encodeURIComponent(
        currentUserId
      )}`
    );
    profileStatusEl.textContent = "Profile loaded.";
    console.log("Profile", prof);

    // program list
    const listResp = await fetchJSON(
      `${MAAT_BASE_URL}/coach/program/list?user_id=${encodeURIComponent(
        currentUserId
      )}`
    );
    const items = (listResp && listResp.programs) || [];
    if (!items.length) {
      todayWorkoutCard.textContent =
        "No program found yet. Run an Overhead Squat Assessment to let Ma'at 2.0 build your first plan.";
      calendarRoot.textContent = "No program yet.";
      daySelect.innerHTML =
        '<option value="">No program loaded yet</option>';
      return;
    }

    // newest program is first
    const latest = items[0];
    const progResp = await fetchJSON(
      `${MAAT_BASE_URL}/coach/program/get?program_id=${encodeURIComponent(
        latest.id
      )}`
    );
    currentProgram = progResp.program;
    buildScheduleFromProgram(currentProgram);
    renderDayDropdown();
    renderCalendar();
  } catch (err) {
    console.error("Error loading profile/program", err);
    profileStatusEl.textContent = "Error loading profile/program.";
    todayWorkoutCard.textContent =
      "Could not load program. Check Ma'at server or network.";
  }
}

// ---- event wiring ----
if (setUserBtn) {
  setUserBtn.onclick = () => {
    const id = (userIdInput.value || "").trim();
    currentUserId = id || "guest";
    currentUserLabel.textContent = currentUserId;
    loadProfileAndProgram();
  };
}

if (daySelect) {
  daySelect.onchange = updateTodayWorkoutFromDropdown;
}

if (nextDayBtn) {
  nextDayBtn.onclick = () => {
    if (!schedule.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const idx = schedule.findIndex((s) => s.date >= today);
    const chosen = schedule[Math.max(0, idx)];
    setDaySelectionByDate(chosen.date);
  };
}

// initial load for default user
window.addEventListener("load", () => {
  if (userIdInput) {
    currentUserId = (userIdInput.value || "rashad").trim();
    currentUserLabel.textContent = currentUserId;
    loadProfileAndProgram();
  }
});
