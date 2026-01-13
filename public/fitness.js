/* =========================================================
   fitness.js — Exercise DB + Workout Session State (ACTIVE_WORKOUT)
   + Local history tracking (WORKOUT_HISTORY)
   + Dashboard connector (/public/dashboard.html)
   Drop-in: place in /public/fitness.js
========================================================= */
(function () {
  "use strict";

  // ---------- CONFIG ----------
  const EXERCISE_INDEX_URL = "/public/exercise-db/index.json";
  const STORAGE_KEYS = {
    HISTORY: "WORKOUT_HISTORY_V1",   // array of workout sessions (completed or not)
    ACTIVE: "ACTIVE_WORKOUT_V1"      // active session snapshot
  };

  // ---------- UI HOOKS ----------
  const workoutPlanViewEl = document.getElementById("workoutPlanView");
  const workoutSelectEl   = document.getElementById("workoutSelect");
  const exerciseLabelEl   = document.getElementById("exerciseLabel");
  const brainStatusEl     = document.getElementById("brainStatus");

  // Optional UI hooks (if they exist in your index.html, we’ll use them)
  const dashboardLinkEl   = document.getElementById("dashboardLink");     // <a id="dashboardLink">
  const completeBtnEl     = document.getElementById("completeWorkoutBtn"); // <button id="completeWorkoutBtn">

  // ---------- IN-MEMORY DB ----------
  let EXERCISES = [];
  let EX_BY_ID = {};

  // ---------- HELPERS ----------
  const nowISODate = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  function normalize(v) {
    return (v || "").toString().toLowerCase().trim();
  }

  function safeText(v, fallback = "") {
    return (typeof v === "string" && v.trim()) ? v : fallback;
  }

  function pickRandom(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function setStatus(ok, msg) {
    if (!brainStatusEl) return;
    brainStatusEl.textContent = msg;
    brainStatusEl.classList.remove("status-ok", "status-bad");
    brainStatusEl.classList.add(ok ? "status-ok" : "status-bad");
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("localStorage write failed:", e);
      return false;
    }
  }

  function uid(prefix="id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  // ---------- LOAD DB ----------
  async function loadExerciseIndex() {
    try {
      const res = await fetch(EXERCISE_INDEX_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`index fetch failed (${res.status})`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.exercises || []);
      EXERCISES = list;

      EX_BY_ID = {};
      for (const ex of EXERCISES) {
        if (ex && ex.id) EX_BY_ID[ex.id] = ex;
      }

      setStatus(true, `Exercise DB loaded (${EXERCISES.length}).`);
      return true;
    } catch (err) {
      console.warn("Exercise DB load error:", err);
      setStatus(false, "Exercise DB not loaded.");
      if (workoutPlanViewEl) {
        workoutPlanViewEl.textContent =
          "Exercise DB failed to load. Check /public/exercise-db/index.json deployment.";
      }
      return false;
    }
  }

  // ---------- FILTER/SEARCH ----------
  function searchExercises(query = "", filters = {}) {
    const q = normalize(query);
    const category = normalize(filters.category);
    const equipment = normalize(filters.equipment);
    const muscle = normalize(filters.muscle);

    return EXERCISES.filter(ex => {
      if (!ex) return false;

      const name = normalize(ex.name);
      const id = normalize(ex.id);
      const force = normalize(ex.force);
      const mech = normalize(ex.mechanic);
      const eq = normalize(ex.equipment);
      const cat = normalize(ex.category);

      const prim = Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles.map(normalize) : [];
      const sec  = Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles.map(normalize) : [];

      const matchesQuery =
        !q ||
        name.includes(q) ||
        id.includes(q) ||
        force.includes(q) ||
        mech.includes(q) ||
        cat.includes(q) ||
        eq.includes(q) ||
        prim.some(m => m.includes(q)) ||
        sec.some(m => m.includes(q));

      if (!matchesQuery) return false;
      if (category && cat !== category) return false;
      if (equipment && eq !== equipment) return false;
      if (muscle && !prim.includes(muscle) && !sec.includes(muscle)) return false;

      return true;
    });
  }

  // ---------- HISTORY TRACKING ----------
  function getHistory() {
    return readJSON(STORAGE_KEYS.HISTORY, []);
  }

  function saveHistory(history) {
    writeJSON(STORAGE_KEYS.HISTORY, history);
  }

  function upsertHistorySession(session) {
    const history = getHistory();
    const i = history.findIndex(x => x && x.id === session.id);
    if (i >= 0) history[i] = session;
    else history.unshift(session); // newest first
    saveHistory(history.slice(0, 90)); // keep last 90 sessions
  }

  function markActiveSnapshot(session) {
    writeJSON(STORAGE_KEYS.ACTIVE, session);
  }

  // ---------- SESSION STATE ----------
  function setActiveWorkout(session) {
    window.ACTIVE_WORKOUT = session;
    window.ACTIVE_WORKOUT_READY = true;
    markActiveSnapshot(session);
    upsertHistorySession(session);
  }

  // ---------- PLAN GENERATION (v1) ----------
  function generateTodayWorkout(profile, ohsaSummary) {
    const daysPerWeek = profile?.goals?.frequency_days_per_week || 4;

    const findings = (ohsaSummary && Array.isArray(ohsaSummary.findings))
      ? ohsaSummary.findings.join(" ")
      : "";

    const hasKneeValgus = normalize(findings).includes("valgus");
    const hasTrunkLean  = normalize(findings).includes("trunk") || normalize(findings).includes("lean");

    const warmup = [
      { name: "Cat–cow", sets: 1, reps: "x10", restSec: 0 },
      { name: "Hip circles", sets: 1, reps: "x10/side", restSec: 0 },
      { name: "Ankle rocks", sets: 1, reps: "x10/side", restSec: 0 },
      { name: "Arm swings", sets: 1, reps: "x20", restSec: 0 },
    ];

    const corrective = [];
    if (hasKneeValgus) corrective.push({ name: "Lateral band walks", sets: 2, reps: "x12/side", restSec: 30, cue: "Knees track over toes." });
    if (hasTrunkLean) corrective.push({ name: "Dead bug", sets: 2, reps: "x8/side", restSec: 30, cue: "Ribs down. Slow." });
    if (!corrective.length) corrective.push({ name: "90/90 breathing", sets: 2, reps: "x5 breaths", restSec: 15, cue: "Exhale fully. Brace gently." });

    const lower = searchExercises("", { category: "strength" })
      .filter(ex => ["body only", "dumbbell", "bands", "kettlebells", "barbell", "machine"].includes(normalize(ex.equipment)))
      .filter(ex => (ex.primaryMuscles || []).some(m => ["quadriceps","glutes","hamstrings"].some(t => normalize(m).includes(t))));

    const push = searchExercises("", { category: "strength" })
      .filter(ex => ["body only", "dumbbell", "bands", "barbell", "machine"].includes(normalize(ex.equipment)))
      .filter(ex => (ex.primaryMuscles || []).some(m => ["chest","shoulders","triceps"].some(t => normalize(m).includes(t))));

    const pull = searchExercises("", { category: "strength" })
      .filter(ex => ["body only", "dumbbell", "bands", "barbell", "machine"].includes(normalize(ex.equipment)))
      .filter(ex => (ex.primaryMuscles || []).some(m => ["back","lats","biceps"].some(t => normalize(m).includes(t))));

    const accessory = searchExercises("", { category: "strength" })
      .filter(ex => ["dumbbell", "bands", "machine", "body only"].includes(normalize(ex.equipment)));

    const a1 = pickRandom(push)  || { name: "Push-Up", id: "push-up", equipment: "body only" };
    const a2 = pickRandom(pull)  || { name: "Row (band/backpack)", id: "row", equipment: "bands" };
    const a3 = pickRandom(accessory) || { name: "Dumbbell Curl", id: "dumbbell-curl", equipment: "dumbbell" };
    const a4 = pickRandom(lower) || { name: "Bodyweight Squat", id: "bodyweight-squat", equipment: "body only" };

    const stretch = searchExercises("", { category: "stretching" })
      .filter(ex => normalize(ex.equipment) === "body only");
    const finisher = pickRandom(stretch) || { name: "Child’s Pose", id: "child-pose" };

    const strengthBlock = [
      { slot: "A1", ex: a1, sets: 3, reps: "10–12", restSec: 60, cue: "Brace first. Smooth reps." },
      { slot: "A2", ex: a2, sets: 3, reps: "10–12", restSec: 60, cue: "Pull elbows back, no shrug." },
      { slot: "A3", ex: a3, sets: 3, reps: "10–12", restSec: 60, cue: "Control the lowering." },
      { slot: "A4", ex: a4, sets: 3, reps: "10–12", restSec: 60, cue: "Knees over toes, chest tall." },
    ];

    const planText =
      `Ma’at 2.0 — Today’s Program (DB)\n` +
      `Schedule: ${daysPerWeek} days/week\n\n` +
      `Warm-up:\n- ${warmup.map(w => `${w.name} ${w.reps}`).join("\n- ")}\n\n` +
      `Corrective:\n- ${corrective.map(c => `${c.name} — ${c.sets}×${c.reps}`).join("\n- ")}\n\n` +
      `Strength (3 rounds):\n` +
      strengthBlock.map(s => `${s.slot}) ${s.ex.name} — ${s.sets} sets × ${s.reps} | rest ${s.restSec}s`).join("\n") +
      `\n\nFinisher:\n- ${finisher.name} — 60–90 sec\n\n` +
      `Coach focus: slow reps, brace first, perfect form.`;

    const session = {
      id: uid(`workout_${nowISODate()}`),
      date: nowISODate(),
      status: "planned",            // planned | in_progress | completed
      completedAt: null,
      source: "exercise_db_v1",
      profileSnapshot: {
        name: profile?.name || profile?.display_name || "",
        goal: profile?.goals?.primary_goal || profile?.goal || "",
        injuries: profile?.injuries || []
      },
      blocks: {
        warmup,
        corrective,
        strength: strengthBlock.map(s => ({
          slot: s.slot,
          id: s.ex.id || null,
          name: s.ex.name,
          equipment: s.ex.equipment || null,
          sets: s.sets,
          reps: s.reps,
          restSec: s.restSec,
          cue: s.cue,
          // tracking for results (future-proof)
          performed: [] // push {set:1,reps:12,weight:25,notes:""} later
        })),
        finisher: [{ id: finisher.id || null, name: finisher.name, sets: 1, reps: "60–90 sec", restSec: 0, performed: [] }]
      },
      current: { block: "strength", slot: "A1", setIndex: 1 },
      coachingFocus: "brace first; slow reps; knees track; control lowering",
      createdAt: new Date().toISOString()
    };

    const primaryExerciseName = safeText(strengthBlock[0]?.ex?.name, "Bodyweight Squat");
    return { planText, primaryExerciseName, session };
  }

  // ---------- COMPLETE WORKOUT (minimal v1) ----------
  function completeActiveWorkout() {
    const s = window.ACTIVE_WORKOUT;
    if (!s || !s.id) return;

    s.status = "completed";
    s.completedAt = new Date().toISOString();

    setActiveWorkout(s);
    setStatus(true, "Workout marked completed ✅ (saved to dashboard).");
  }

  // ---------- DASHBOARD CONNECTOR ----------
  function wireDashboardLink() {
    // If user already has a link element, set it.
    if (dashboardLinkEl) {
      dashboardLinkEl.href = "/public/dashboard.html";
      dashboardLinkEl.target = "_blank";
      dashboardLinkEl.rel = "noopener";
      dashboardLinkEl.textContent = dashboardLinkEl.textContent || "Open Dashboard";
    }
  }

  function wireCompleteButton() {
    if (!completeBtnEl) return;
    completeBtnEl.addEventListener("click", () => {
      completeActiveWorkout();
    });
  }

  // ---------- UI WIRING ----------
  function ensureDBOption() {
    if (!workoutSelectEl) return;

    const value = "db_today";
    const exists = Array.from(workoutSelectEl.options).some(o => o.value === value);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = "Ma’at 2.0 – Today’s Program (Exercise DB)";
      workoutSelectEl.insertBefore(opt, workoutSelectEl.options[1] || null);
    }
  }

  function handleSelectChange() {
    if (!workoutSelectEl) return;

    workoutSelectEl.addEventListener("change", () => {
      if (workoutSelectEl.value !== "db_today") return;

      const profile = window.USER_PROFILE || null;
      const ohsa = window.lastOhsaSummary || null;

      const out = generateTodayWorkout(profile, ohsa);

      if (workoutPlanViewEl) workoutPlanViewEl.textContent = out.planText;
      if (exerciseLabelEl) exerciseLabelEl.textContent = out.primaryExerciseName;

      // Mark as in progress + persist
      out.session.status = "in_progress";
      setActiveWorkout(out.session);

      setStatus(true, "Workout loaded + ACTIVE_WORKOUT saved.");
      console.log("✅ ACTIVE_WORKOUT:", window.ACTIVE_WORKOUT);
    });
  }

  // ---------- BOOT ----------
  window.addEventListener("load", async () => {
    const ok = await loadExerciseIndex();
    if (!ok) return;

    ensureDBOption();
    handleSelectChange();

    wireDashboardLink();
    wireCompleteButton();

    // If user already has "db_today" selected on load, auto-run once
    if (workoutSelectEl && workoutSelectEl.value === "db_today") {
      workoutSelectEl.dispatchEvent(new Event("change"));
    }
  });

})();
