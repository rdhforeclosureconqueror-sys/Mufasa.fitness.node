/* =========================================================
   fitness.js — Exercise DB + Workout Session State (ACTIVE_WORKOUT)
   Drop-in: place in /public/fitness.js
========================================================= */
(function () {
  "use strict";

  // ---------- CONFIG ----------
  const EXERCISE_INDEX_URL = "/public/exercise-db/index.json"; // ✅ confirmed working

  // ---------- UI HOOKS ----------
  const workoutPlanViewEl = document.getElementById("workoutPlanView");
  const workoutSelectEl   = document.getElementById("workoutSelect");
  const exerciseLabelEl   = document.getElementById("exerciseLabel");
  const brainStatusEl     = document.getElementById("brainStatus");

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

  // ---------- SESSION STATE ----------
  // This is the core upgrade: one source of truth for coaching, tracking, saving.
  function setActiveWorkout(session) {
    window.ACTIVE_WORKOUT = session; // ✅ global access
    // Convenience alias for quick console checks
    window.ACTIVE_WORKOUT_READY = true;
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

    // Strength buckets (prefer common home + gym options)
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

    // Render text (for your current UI)
    const planText =
      `Ma’at 2.0 — Today’s Program (DB)\n` +
      `Schedule: ${daysPerWeek} days/week\n\n` +
      `Warm-up:\n- ${warmup.map(w => `${w.name} ${w.reps}`).join("\n- ")}\n\n` +
      `Corrective:\n- ${corrective.map(c => `${c.name} — ${c.sets}×${c.reps}`).join("\n- ")}\n\n` +
      `Strength (3 rounds):\n` +
      strengthBlock.map(s => `${s.slot}) ${s.ex.name} — ${s.sets} sets × ${s.reps} | rest ${s.restSec}s`).join("\n") +
      `\n\nFinisher:\n- ${finisher.name} — 60–90 sec\n\n` +
      `Coach focus: slow reps, brace first, perfect form.`;

    // Create ACTIVE_WORKOUT session object (this is the upgrade)
    const session = {
      id: `workout_${nowISODate()}`,
      date: nowISODate(),
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
          cue: s.cue
        })),
        finisher: [{ id: finisher.id || null, name: finisher.name, sets: 1, reps: "60–90 sec", restSec: 0 }]
      },
      // Coaching pointer: what the camera coach should start with
      current: { block: "strength", slot: "A1", setIndex: 1 },
      coachingFocus: "brace first; slow reps; knees track; control lowering",
      createdAt: new Date().toISOString()
    };

    const primaryExerciseName = safeText(strengthBlock[0]?.ex?.name, "Bodyweight Squat");

    return { planText, primaryExerciseName, session };
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
      // put near the top
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

      // 1) Render the plan
      if (workoutPlanViewEl) workoutPlanViewEl.textContent = out.planText;

      // 2) Set the label used by your camera coach
      if (exerciseLabelEl) exerciseLabelEl.textContent = out.primaryExerciseName;

      // 3) Store session state globally (this is the upgrade)
      setActiveWorkout(out.session);

      // 4) Status
      setStatus(true, "Workout loaded + ACTIVE_WORKOUT created.");
      console.log("✅ ACTIVE_WORKOUT:", window.ACTIVE_WORKOUT);
    });
  }

  // ---------- BOOT ----------
  window.addEventListener("load", async () => {
    const ok = await loadExerciseIndex();
    if (!ok) return;

    ensureDBOption();
    handleSelectChange();

    // If user already has "db_today" selected on load, auto-run once
    if (workoutSelectEl && workoutSelectEl.value === "db_today") {
      const evt = new Event("change");
      workoutSelectEl.dispatchEvent(evt);
    }
  });

})();
