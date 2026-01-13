/* =========================================================
   fitness.js — connects Exercise DB + UI + coaching
   Works with your existing index.html IDs and state
========================================================= */

(function () {
  // ---- Where the DB index lives ----
  const EXERCISE_INDEX_URL = "/public/exercise-db/index.json"; // served from /public/exercise-db

  // ---- UI hooks from your index.html ----
  const workoutPlanViewEl = document.getElementById("workoutPlanView");
  const workoutSelectEl   = document.getElementById("workoutSelect");
  const defineExerciseBtn = document.getElementById("defineExerciseBtn");
  const exerciseLabelEl   = document.getElementById("exerciseLabel");

  // Optional: a place to show DB status (if you want)
  const brainStatusEl = document.getElementById("brainStatus");

  // ---- In-memory DB ----
  let EXERCISES = [];     // full list
  let EX_BY_ID  = {};     // lookup

  // ---- Utility ----
  function safeText(v, fallback="") {
    return (typeof v === "string" && v.trim()) ? v : fallback;
  }

  function normalize(str) {
    return (str || "").toLowerCase().trim();
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---- Load Exercise DB ----
  async function loadExerciseIndex() {
    try {
      const res = await fetch(EXERCISE_INDEX_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch index.json: " + res.status);
      const data = await res.json();

      // Support either {exercises:[...]} or [...]
      const list = Array.isArray(data) ? data : (data.exercises || []);
      EXERCISES = list;
      EX_BY_ID = {};
      for (const ex of EXERCISES) {
        if (ex && ex.id) EX_BY_ID[ex.id] = ex;
      }

      if (brainStatusEl) {
        brainStatusEl.textContent = `Exercise DB loaded (${EXERCISES.length} exercises).`;
        brainStatusEl.classList.add("status-ok");
      }

      return true;
    } catch (e) {
      console.warn("Exercise DB load error:", e);
      if (brainStatusEl) {
        brainStatusEl.textContent = "Exercise DB not loaded.";
        brainStatusEl.classList.add("status-bad");
      }
      if (workoutPlanViewEl) {
        workoutPlanViewEl.textContent =
          "Exercise DB failed to load. Make sure /public/exercise-db/index.json exists and is deployed.";
      }
      return false;
    }
  }

  // ---- Search / filter ----
  function searchExercises(query, filters = {}) {
    const q = normalize(query);
    const level = normalize(filters.level);
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

      // query match
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

      if (level && normalize(ex.level) !== level) return false;
      if (category && cat !== category) return false;
      if (equipment && eq !== equipment) return false;
      if (muscle && !prim.includes(muscle) && !sec.includes(muscle)) return false;

      return true;
    });
  }

  // ---- Simple “Today workout” generator (frontend-side) ----
  // This is a v1. It uses your profile goals + OHSA findings (if present)
  // Later, we can move this into your Node backend as a real API.
  function generateTodayWorkout(profile, ohsaSummary) {
    const daysPerWeek = profile?.goals?.frequency_days_per_week || 4;

    // Fault-aware emphasis (basic)
    const findings = (ohsaSummary && Array.isArray(ohsaSummary.findings)) ? ohsaSummary.findings.join(" ") : "";
    const hasKneeValgus = findings.toLowerCase().includes("valgus");
    const hasTrunkLean  = findings.toLowerCase().includes("trunk") || findings.toLowerCase().includes("leans");

    // Buckets
    const warmup = [
      "Cat–cow x10",
      "Hip circles x10/side",
      "Ankle rocks x10/side",
      "Arm swings x20"
    ];

    const corrective = [];
    if (hasKneeValgus) corrective.push("Glute med activation: lateral band walks 2×12/side");
    if (hasTrunkLean) corrective.push("Core brace: dead bug 2×8/side");
    if (!corrective.length) corrective.push("Breathing + brace: 90/90 breathing 2×5 breaths");

    // Strength picks (home-friendly)
    const lower = searchExercises("", { category: "strength" })
      .filter(ex => ["body only", "dumbbell", "bands", "kettlebells"].includes(normalize(ex.equipment)))
      .filter(ex => (ex.primaryMuscles || []).some(m => normalize(m).includes("quadriceps") || normalize(m).includes("glutes") || normalize(m).includes("hamstrings")));

    const push = searchExercises("", { category: "strength" })
      .filter(ex => ["body only", "dumbbell", "bands"].includes(normalize(ex.equipment)))
      .filter(ex => (ex.primaryMuscles || []).some(m => normalize(m).includes("chest") || normalize(m).includes("shoulders") || normalize(m).includes("triceps")));

    const pull = searchExercises("", { category: "strength" })
      .filter(ex => ["body only", "dumbbell", "bands"].includes(normalize(ex.equipment)))
      .filter(ex => (ex.primaryMuscles || []).some(m => normalize(m).includes("back") || normalize(m).includes("lats") || normalize(m).includes("biceps")));

    const core = searchExercises("", { category: "strength" })
      .filter(ex => normalize(ex.equipment) === "body only")
      .filter(ex => (ex.primaryMuscles || []).some(m => normalize(m).includes("abdominals")));

    // Pick a few
    const a1 = pickRandom(lower) || { name: "Bodyweight Squat", id: "bodyweight_squat" };
    const a2 = pickRandom(push)  || { name: "Push-Up", id: "push_up" };
    const a3 = pickRandom(pull)  || { name: "Row (band/backpack)", id: "row" };
    const a4 = pickRandom(core)  || { name: "Dead Bug", id: "dead_bug" };

    // Yoga finisher (stretching category)
    const stretch = searchExercises("", { category: "stretching" })
      .filter(ex => normalize(ex.equipment) === "body only");
    const y1 = pickRandom(stretch) || { name: "Child’s Pose", id: "child_pose" };

    const plan =
      `Ma’at 2.0 — Today’s Workout (Home)\n` +
      `Schedule: ${daysPerWeek} days/week\n\n` +
      `Warm-up (5–8 min):\n- ${warmup.join("\n- ")}\n\n` +
      `Corrective (6–8 min):\n- ${corrective.join("\n- ")}\n\n` +
      `Strength (3 rounds):\n` +
      `1) ${a1.name} — 10–12 reps\n` +
      `2) ${a2.name} — 8–12 reps\n` +
      `3) ${a3.name} — 10–12 reps\n` +
      `4) ${a4.name} — 8–12 reps\n\n` +
      `Finisher (Mobility):\n- ${y1.name} — 60–90 sec\n\n` +
      `Coach focus today:\n- Move slow, keep brace, perfect form.`;

    // Return both the text + “primary exercise” for the camera coach label
    return { planText: plan, primaryExerciseName: safeText(a1.name, "Bodyweight Squat") };
  }

  // ---- Hook into your existing UI ----
  function attachWorkoutOptions() {
    if (!workoutSelectEl) return;

    // Add an option for DB-powered plan if it isn’t there
    const exists = Array.from(workoutSelectEl.options).some(o => o.value === "db_today");
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = "db_today";
      opt.textContent = "Ma’at 2.0 – Today’s Program (Exercise DB)";
      workoutSelectEl.insertBefore(opt, workoutSelectEl.options[1] || null);
    }

    workoutSelectEl.addEventListener("change", () => {
      if (workoutSelectEl.value === "db_today") {
        // Pull from globals your index already uses
        const profile = window.USER_PROFILE || null;
        const ohsa = window.lastOhsaSummary || null;

        const out = generateTodayWorkout(profile, ohsa);
        if (workoutPlanViewEl) workoutPlanViewEl.textContent = out.planText;
        if (exerciseLabelEl) exerciseLabelEl.textContent = out.primaryExerciseName;
      }
    });
  }

  // ---- Boot ----
  window.addEventListener("load", async () => {
    const ok = await loadExerciseIndex();
    if (ok) attachWorkoutOptions();

    // Optional: once DB is loaded, enable “New Exercise” flow to eventually pick from DB
    if (defineExerciseBtn) {
      defineExerciseBtn.title = "DB loaded: later we will map new exercises to DB IDs.";
    }
  });

})();
