/* =========================================================
   fitness.js — connects Exercise DB + UI + coaching (V2)
   Drop-in file. Works with your existing index.html IDs/state.
========================================================= */

(function () {
  // ---- Where the DB index lives ----
  // Your repo shows: /public/exercise-db/index.json
  const EXERCISE_INDEX_URL = "/public/exercise-db/index.json";

  // ---- UI hooks from your index.html ----
  const workoutPlanViewEl = document.getElementById("workoutPlanView");
  const workoutSelectEl   = document.getElementById("workoutSelect");
  const defineExerciseBtn = document.getElementById("defineExerciseBtn");
  const exerciseLabelEl   = document.getElementById("exerciseLabel");

  // Optional status element (if it exists)
  const brainStatusEl = document.getElementById("brainStatus");

  // ---- In-memory DB ----
  let EXERCISES = [];
  let EX_BY_ID  = {};

  // ---- Utility ----
  function safeText(v, fallback = "") {
    return (typeof v === "string" && v.trim()) ? v : fallback;
  }

  function normalize(str) {
    return (str || "").toLowerCase().trim();
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function setStatusOk(msg) {
    if (!brainStatusEl) return;
    brainStatusEl.textContent = msg;
    brainStatusEl.classList.remove("status-bad");
    brainStatusEl.classList.add("status-ok");
  }

  function setStatusBad(msg) {
    if (!brainStatusEl) return;
    brainStatusEl.textContent = msg;
    brainStatusEl.classList.remove("status-ok");
    brainStatusEl.classList.add("status-bad");
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

      setStatusOk(`Exercise DB loaded (${EXERCISES.length} exercises).`);
      return true;
    } catch (e) {
      console.warn("Exercise DB load error:", e);
      setStatusBad("Exercise DB not loaded.");

      if (workoutPlanViewEl) {
        workoutPlanViewEl.textContent =
          "Exercise DB failed to load. Confirm /public/exercise-db/index.json exists and is deployed.";
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
      const lvl = normalize(ex.level);

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

      if (level && lvl !== level) return false;
      if (category && cat !== category) return false;
      if (equipment && eq !== equipment) return false;
      if (muscle && !prim.includes(muscle) && !sec.includes(muscle)) return false;

      return true;
    });
  }

  // ---- Workout generator (V1: simple + reliable) ----
  function generateWorkout({
    level = "beginner",
    strengthCount = 4,
    stretchCount = 1,
    equipmentAllowed = ["body only", "dumbbell", "bands", "kettlebells"]
  } = {}) {

    if (!EXERCISES || EXERCISES.length === 0) {
      console.warn("generateWorkout called before DB loaded");
      return { title: "Workout", warmup: [], corrective: [], blocks: [], finisher: [] };
    }

    const strengthPool = searchExercises("", { category: "strength", level })
      .filter(ex => equipmentAllowed.includes(normalize(ex.equipment)));

    const stretchPool = searchExercises("", { category: "stretching" })
      .filter(ex => normalize(ex.equipment) === "body only");

    const pickN = (pool, n) => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(n, shuffled.length));
    };

    const strength = pickN(strengthPool, strengthCount);
    const finisher = pickN(stretchPool, stretchCount);

    const blocks = strength.map((ex, i) => ({
      slot: `A${i + 1}`,
      id: ex.id,
      name: ex.name,
      sets: 3,
      reps: "10–12",
      rest: "60s",
      equipment: ex.equipment,
      primaryMuscles: ex.primaryMuscles || [],
      instructions: ex.instructions || [],
      images: ex.images || [],
      category: ex.category,
      level: ex.level
    }));

    const finisherBlock = finisher.map(ex => ({
      slot: "MOB",
      id: ex.id,
      name: ex.name,
      sets: 1,
      reps: "60–90 sec",
      rest: "—",
      equipment: ex.equipment,
      primaryMuscles: ex.primaryMuscles || [],
      instructions: ex.instructions || [],
      images: ex.images || [],
      category: ex.category,
      level: ex.level
    }));

    return {
      title: "Ma’at 2.0 — Today’s Program (DB)",
      warmup: [
        "Cat–cow x10",
        "Hip circles x10/side",
        "Ankle rocks x10/side",
        "Arm swings x20"
      ],
      corrective: [
        "90/90 breathing — 2×5 breaths",
        "Dead bug — 2×8/side"
      ],
      blocks,
      finisher: finisherBlock
    };
  }

  // ---- OHSA → corrective emphasis (simple) ----
  function buildCorrectivesFromOhsa(ohsaSummary) {
    const findingsStr = (ohsaSummary && Array.isArray(ohsaSummary.findings))
      ? ohsaSummary.findings.join(" ").toLowerCase()
      : "";

    const correctives = [];

    if (findingsStr.includes("valgus")) {
      correctives.push("Glute med: lateral band walks — 2×12/side");
    }
    if (findingsStr.includes("trunk") || findingsStr.includes("lean")) {
      correctives.push("Core brace: dead bug — 2×8/side");
    }

    if (!correctives.length) {
      correctives.push("90/90 breathing — 2×5 breaths");
      correctives.push("Brace drill: slow air squat — 2×6");
    }

    return correctives;
  }

  // ---- UI rendering (cards) ----
  function renderWorkoutToUI(workout) {
    if (!workoutPlanViewEl) return;

    const lines = [];

    lines.push(`${workout.title}`);
    lines.push("");
    lines.push("Warm-up:");
    workout.warmup.forEach(x => lines.push(`- ${x}`));
    lines.push("");
    lines.push("Corrective:");
    workout.corrective.forEach(x => lines.push(`- ${x}`));
    lines.push("");
    lines.push("Strength (3 rounds):");
    workout.blocks.forEach(b => {
      lines.push(`${b.slot}) ${b.name} — ${b.sets} sets × ${b.reps} | rest ${b.rest}`);
    });
    lines.push("");
    lines.push("Finisher:");
    workout.finisher.forEach(b => {
      lines.push(`- ${b.name} — ${b.reps}`);
    });
    lines.push("");
    lines.push("Coach focus: slow reps, brace first, perfect form.");

    workoutPlanViewEl.textContent = lines.join("\n");

    // Update camera coach label to first strength exercise
    const primary = workout.blocks[0]?.name || "Bodyweight Squat";
    if (exerciseLabelEl) exerciseLabelEl.textContent = primary;
  }

  // ---- Hook into your existing UI ----
  function attachWorkoutOptions() {
    if (!workoutSelectEl) return;

    // Add DB option if not already there
    const exists = Array.from(workoutSelectEl.options).some(o => o.value === "db_today");
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = "db_today";
      opt.textContent = "Ma’at 2.0 – Today’s Program (Exercise DB)";
      workoutSelectEl.insertBefore(opt, workoutSelectEl.options[1] || null);
    }

    workoutSelectEl.addEventListener("change", () => {
      if (workoutSelectEl.value !== "db_today") return;

      const profile = window.USER_PROFILE || null;
      const ohsa = window.lastOhsaSummary || null;

      const level = safeText(profile?.fitness_level, "beginner").toLowerCase();
      const workout = generateWorkout({ level });

      // Replace corrective block with OHSA-aware block (if present)
      workout.corrective = buildCorrectivesFromOhsa(ohsa);

      renderWorkoutToUI(workout);
    });
  }

  // ---- Self-test (so you KNOW it works) ----
  function runSelfTest() {
    try {
      console.log("[fitness.js] DB count:", EXERCISES.length);
      const w = generateWorkout({ level: "beginner" });
      console.log("[fitness.js] Generated workout sample:", w);
      if (brainStatusEl) {
        brainStatusEl.textContent += " | Self-test OK ✅";
      }
    } catch (e) {
      console.warn("[fitness.js] Self-test FAILED:", e);
      if (brainStatusEl) {
        brainStatusEl.textContent += " | Self-test FAILED ❌";
      }
    }
  }

  // ---- Boot ----
  window.addEventListener("load", async () => {
    const ok = await loadExerciseIndex();
    if (ok) {
      attachWorkoutOptions();
      runSelfTest();
    }

    if (defineExerciseBtn) {
      defineExerciseBtn.title = "DB loaded: next step is mapping form coaching to exercise IDs.";
    }
  });

})();
