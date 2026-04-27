(function () {
  "use strict";

  const root = document.getElementById("retentionFlowRoot");
  const statusEl = document.getElementById("retentionFlowStatus");
  const contentEl = document.getElementById("retentionFlowContent");
  if (!root || !statusEl || !contentEl) return;

  const GOAL_OPTIONS = [
    "fat_loss",
    "muscle_gain",
    "strength",
    "mobility",
    "endurance",
    "rehab_prehab",
    "general_fitness"
  ];

  const PROGRAM_LIBRARY = [
    {
      title: "Balanced Strength Builder",
      goal: "strength",
      durationWeeks: 8,
      daysPerWeek: 4,
      movementFocus: ["squat", "hinge", "push", "pull", "core"],
      exercises: ["Barbell Squat", "Romanian Deadlift", "Dumbbell Bench Press", "Pullups", "Plank"],
      progressionRules: ["Add 1-2 reps weekly", "Increase load when RPE < 8"]
    },
    {
      title: "Lean Mobility Flow",
      goal: "fat_loss",
      durationWeeks: 6,
      daysPerWeek: 5,
      movementFocus: ["full_body", "conditioning", "mobility"],
      exercises: ["Bodyweight Squat", "Pushups", "Mountain Climbers", "Lunge", "Cat Stretch"],
      progressionRules: ["Shorten rest by 5 seconds weekly", "Add one round every 2 weeks"]
    },
    {
      title: "Resilience + Rehab",
      goal: "rehab_prehab",
      durationWeeks: 10,
      daysPerWeek: 3,
      movementFocus: ["core_stability", "single_leg", "posture"],
      exercises: ["Dead Bug", "Side Bridge", "Split Squats", "Face Pull", "Hip Lift with Band"],
      progressionRules: ["Prioritize form score > 85", "Progress tempo before load"]
    }
  ];

  const state = {
    authToken: null,
    userId: null,
    intake: null,
    goalsBaseline: null,
    currentProgram: null,
    selectedDate: todayKey(),
    completionDates: readJSON("RETENTION_COMPLETION_DATES", []),
    checkIns: [],
    progressDashboard: null,
    exerciseIndex: null
  };

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
    } catch (_) {}
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getNodeBaseUrl() {
    const configured = localStorage.getItem("maatNodeBaseUrl") || window.NODE_BASE_URL || "";
    return String(configured || "").replace(/\/$/, "");
  }

  function saveCompletionDates() {
    writeJSON("RETENTION_COMPLETION_DATES", state.completionDates);
  }

  async function authedRequest(path, { method = "GET", body = null } = {}) {
    const client = window.MufasaBackendRead?.createClient({
      baseUrl: getNodeBaseUrl(),
      storagePrefix: "maat"
    });
    const token = client?.getAuthToken?.() || state.authToken;
    if (!token) throw new Error("missing_auth_token");
    state.authToken = token;

    const res = await fetch(`${getNodeBaseUrl()}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok) {
      throw new Error(payload?.error?.message || `request_failed_${res.status}`);
    }
    return payload.data || {};
  }

  async function loadExerciseIndex() {
    if (state.exerciseIndex) return state.exerciseIndex;
    const base = getNodeBaseUrl() || window.location.origin;
    try {
      const res = await fetch(`${base}/exercise-db/index.json`, { cache: "no-store" });
      const raw = await res.json();
      const list = Array.isArray(raw) ? raw : raw.exercises || [];
      state.exerciseIndex = list;
      return list;
    } catch {
      state.exerciseIndex = [];
      return [];
    }
  }

  function inferStep() {
    if (!state.intake?.completedAt) return 1;
    if (!state.goalsBaseline?.goal) return 2;
    if (!state.currentProgram?.programId) return 3;
    if (!state.completionDates.includes(todayKey())) return 6;
    return 9;
  }

  function renderStatus() {
    const step = inferStep();
    statusEl.textContent = `Flow: Profile → Intake → Goals → Program → Calendar → Daily Workout → Complete → Dashboard. Current step ${step}/9.`;
  }

  function renderIntakeForm() {
    contentEl.innerHTML = `
      <div class="retention-card">
        <strong>1) Client Intake</strong>
        <div class="retention-grid">
          <label>Name<input id="rfIntakeName" value="${esc(state.intake?.name || "")}" /></label>
          <label>Age<input id="rfIntakeAge" type="number" min="1" max="120" value="${esc(state.intake?.age || "")}" /></label>
          <label>Sex<input id="rfIntakeSex" value="${esc(state.intake?.sex || "")}" /></label>
          <label>Height (cm)<input id="rfIntakeHeight" type="number" min="50" max="300" value="${esc(state.intake?.heightCm || "")}" /></label>
          <label>Weight (kg)<input id="rfIntakeWeight" type="number" min="20" max="450" value="${esc(state.intake?.weightKg || "")}" /></label>
        </div>
        <label>Goals (comma-separated)<input id="rfIntakeGoals" value="${esc((state.intake?.goals || []).join(", "))}" /></label>
        <label>Injuries (comma-separated)<input id="rfIntakeInjuries" value="${esc((state.intake?.injuries || []).join(", "))}" /></label>
        <label>Equipment (comma-separated)<input id="rfIntakeEquipment" value="${esc((state.intake?.equipment || []).join(", "))}" /></label>
        <label><input id="rfDisclaimer" type="checkbox" ${state.intake?.medicalDisclaimerConsent ? "checked" : ""}/> I consent to medical disclaimer.</label>
        <button id="rfSaveIntakeBtn">Save Intake</button>
      </div>`;

    document.getElementById("rfSaveIntakeBtn").onclick = async () => {
      try {
        const payload = {
          name: document.getElementById("rfIntakeName").value.trim(),
          age: Number(document.getElementById("rfIntakeAge").value),
          sex: document.getElementById("rfIntakeSex").value.trim() || null,
          heightCm: Number(document.getElementById("rfIntakeHeight").value),
          weightKg: Number(document.getElementById("rfIntakeWeight").value) || null,
          goals: document.getElementById("rfIntakeGoals").value.split(",").map((x) => x.trim()).filter(Boolean),
          injuries: document.getElementById("rfIntakeInjuries").value.split(",").map((x) => x.trim()).filter(Boolean),
          limitations: [],
          trainingExperience: null,
          equipment: document.getElementById("rfIntakeEquipment").value.split(",").map((x) => x.trim()).filter(Boolean),
          schedule: null,
          preferredWorkoutDays: [],
          medicalDisclaimerConsent: document.getElementById("rfDisclaimer").checked,
          notes: null
        };
        const saved = await authedRequest("/api/client-intake", { method: "POST", body: payload });
        state.intake = saved.intake;
        await refreshAndRender();
      } catch (err) {
        alert(`Unable to save intake: ${err.message}`);
      }
    };
  }

  function renderGoalsBaselineForm() {
    contentEl.innerHTML += `
      <div class="retention-card">
        <strong>2) Goals + Baseline</strong>
        <label>Primary Goal
          <select id="rfGoalSelect">${GOAL_OPTIONS.map((goal) => `<option value="${goal}" ${state.goalsBaseline?.goal === goal ? "selected" : ""}>${goal}</option>`).join("")}</select>
        </label>
        <label>Baseline strength tests (comma-separated)<input id="rfBaselineTests" value="${esc((state.goalsBaseline?.baseline?.startingStrengthTests || []).join(", "))}" /></label>
        <label>Form score baseline<input id="rfBaselineForm" type="number" min="0" max="100" value="${esc(state.goalsBaseline?.baseline?.formScoreBaseline || "")}" /></label>
        <label>Measurements (comma-separated)<input id="rfMeasurements" value="${esc((state.goalsBaseline?.baseline?.measurements || []).join(", "))}" /></label>
        <label>Visual scan link<input id="rfVisualScan" value="${esc(state.goalsBaseline?.baseline?.visualProgressScan || "")}" /></label>
        <button id="rfSaveGoalBtn">Save Goals + Baseline</button>
      </div>`;

    document.getElementById("rfSaveGoalBtn").onclick = async () => {
      try {
        const payload = {
          goal: document.getElementById("rfGoalSelect").value,
          baseline: {
            startingStrengthTests: document.getElementById("rfBaselineTests").value.split(",").map((x) => x.trim()).filter(Boolean),
            formScoreBaseline: Number(document.getElementById("rfBaselineForm").value) || null,
            measurements: document.getElementById("rfMeasurements").value.split(",").map((x) => x.trim()).filter(Boolean),
            visualProgressScan: document.getElementById("rfVisualScan").value.trim() || null
          }
        };
        const saved = await authedRequest("/api/goals-baseline", { method: "POST", body: payload });
        state.goalsBaseline = saved.goalsBaseline;
        await refreshAndRender();
      } catch (err) {
        alert(`Unable to save goals/baseline: ${err.message}`);
      }
    };
  }

  function renderProgramCards() {
    contentEl.innerHTML += `
      <div class="retention-card">
        <strong>3) Programs</strong>
        <div class="retention-muted">Pick one and assign it to your account.</div>
        ${PROGRAM_LIBRARY.map((program, index) => `
          <div class="retention-card">
            <div><strong>${esc(program.title)}</strong></div>
            <div class="retention-muted">Goal: ${esc(program.goal)} • ${program.daysPerWeek} days/week • ${program.durationWeeks} weeks</div>
            <div class="retention-muted">Focus: ${esc(program.movementFocus.join(", "))}</div>
            <button data-rf-program-index="${index}">Use this program</button>
          </div>
        `).join("")}
      </div>`;

    Array.from(contentEl.querySelectorAll("[data-rf-program-index]")).forEach((btn) => {
      btn.onclick = async () => {
        const program = PROGRAM_LIBRARY[Number(btn.getAttribute("data-rf-program-index"))];
        try {
          const assigned = await authedRequest("/api/programs", {
            method: "POST",
            body: {
              clientId: state.userId,
              goal: program.goal,
              durationWeeks: program.durationWeeks,
              daysPerWeek: program.daysPerWeek,
              movementFocus: program.movementFocus,
              exercises: program.exercises,
              progressionRules: program.progressionRules
            }
          });
          state.currentProgram = assigned.program;
          await refreshAndRender();
        } catch (err) {
          alert(`Unable to assign program: ${err.message}`);
        }
      };
    });
  }

  function renderCalendar() {
    const program = state.currentProgram;
    if (!program) return;
    const start = new Date(program.assignedAt || Date.now());
    const totalDays = (program.durationWeeks || 1) * 7;
    const today = todayKey();
    let html = `<div class="retention-card"><strong>4) Schedule Calendar</strong><div class="retention-cal">`;

    for (let i = 0; i < totalDays; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateKey = date.toISOString().slice(0, 10);
      const scheduled = dayOfWeek > 0 && dayOfWeek <= (program.daysPerWeek || 3);
      const done = state.completionDates.includes(dateKey);
      const classes = ["retention-cal-day"];
      if (scheduled) classes.push("scheduled");
      if (done) classes.push("done");
      if (dateKey === today) classes.push("today");
      html += `<button type="button" class="${classes.join(" ")}" data-rf-date="${dateKey}">${date.slice(5, 10)}</button>`;
    }

    html += "</div><div class=\"retention-muted\">Click a scheduled day to open daily workout detail.</div></div>";
    contentEl.innerHTML += html;

    Array.from(contentEl.querySelectorAll("[data-rf-date]")).forEach((btn) => {
      btn.onclick = () => {
        state.selectedDate = btn.getAttribute("data-rf-date") || todayKey();
        renderDailyWorkoutDetail();
      };
    });
  }

  function findExerciseEntry(name, exerciseIndex) {
    const normalized = String(name || "").trim().toLowerCase();
    return exerciseIndex.find((entry) => {
      const id = String(entry?.id || "").toLowerCase();
      const title = String(entry?.name || "").toLowerCase();
      return id === normalized || title === normalized || title.includes(normalized) || normalized.includes(id);
    }) || null;
  }

  function buildSessionExercise(exerciseName, entry, index) {
    const instructions = Array.isArray(entry?.instructions) ? entry.instructions : [];
    const formCues = instructions.slice(0, 2);
    const commonMistakes = Array.isArray(entry?.commonMistakes) ? entry.commonMistakes : [];
    return {
      exerciseId: entry?.id || `exercise_${index + 1}`,
      name: entry?.name || exerciseName,
      sets: 3,
      targetReps: 12,
      targetTime: null,
      restSeconds: 60,
      tempo: "3-1-1",
      instructions,
      formCues,
      commonMistakes,
      targetMuscles: Array.isArray(entry?.primaryMuscles) ? entry.primaryMuscles : [],
      media: Array.isArray(entry?.images) && entry.images.length
        ? `${getNodeBaseUrl() || window.location.origin}/exercise-db/${entry.images[0]}`
        : null
    };
  }

  async function renderDailyWorkoutDetail() {
    const program = state.currentProgram;
    if (!program) return;
    const exercises = Array.isArray(program.exercises) ? program.exercises : [];
    const indexData = await loadExerciseIndex();
    const cards = exercises.map((exerciseName) => {
      const entry = findExerciseEntry(exerciseName, indexData) || {};
      const instructionList = Array.isArray(entry.instructions) ? entry.instructions.slice(0, 3) : [];
      const firstImage = Array.isArray(entry.images) && entry.images.length
        ? `${getNodeBaseUrl() || window.location.origin}/exercise-db/${entry.images[0]}`
        : null;
      return `
        <div class="retention-card">
          <div><strong>${esc(entry.name || exerciseName)}</strong></div>
          ${firstImage ? `<img src="${esc(firstImage)}" alt="${esc(entry.name || exerciseName)}" style="width:100%;max-width:260px;border-radius:8px;margin-top:6px;"/>` : ""}
          <div class="retention-muted">${esc((entry.primaryMuscles || []).join(", "))}</div>
          <ol>${instructionList.map((step) => `<li>${esc(step)}</li>`).join("") || "<li>Follow your trainer guidance for controlled tempo and quality reps.</li>"}</ol>
        </div>`;
    }).join("");

    const detailsMarkup = `
      <div class="retention-card" id="rfDailyWorkoutCard">
        <strong>5-6) Daily Workout • ${esc(state.selectedDate)}</strong>
        <div class="retention-muted">Program ID: ${esc(program.programId || "pending")}</div>
        ${cards || "<div class=\"retention-muted\">No exercises configured yet.</div>"}
        <label>Session notes<textarea id="rfSessionNotes" rows="2" placeholder="How did today's workout feel?"></textarea></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="rfStartWorkoutBtn">Start Workout</button>
          <button id="rfCompleteWorkoutBtn">Complete Workout</button>
        </div>
      </div>`;

    const existing = document.getElementById("rfDailyWorkoutCard");
    if (existing) {
      existing.outerHTML = detailsMarkup;
    } else {
      contentEl.innerHTML += detailsMarkup;
    }

    const startBtn = document.getElementById("rfStartWorkoutBtn");
    if (startBtn) {
      startBtn.onclick = () => {
        const sessionExercises = exercises.map((exerciseName, index) => {
          const entry = findExerciseEntry(exerciseName, indexData) || {};
          return buildSessionExercise(exerciseName, entry, index);
        });
        const payload = {
          programId: state.currentProgram?.programId || null,
          scheduledWorkoutId: `scheduled_${state.selectedDate}`,
          title: `${state.currentProgram?.goal || "Program"} • ${state.selectedDate}`,
          selectedDate: state.selectedDate,
          exercises: sessionExercises,
          currentExercise: sessionExercises[0] || null,
          notes: document.getElementById("rfSessionNotes")?.value.trim() || null
        };
        writeJSON("ACTIVE_WORKOUT_SELECTION_V1", payload);
        window.dispatchEvent(new CustomEvent("workout:selected", { detail: payload }));
        const cameraStart = document.getElementById("startBtn");
        if (cameraStart) cameraStart.scrollIntoView({ behavior: "smooth", block: "center" });
      };
    }

    const completeBtn = document.getElementById("rfCompleteWorkoutBtn");
    if (completeBtn) {
      completeBtn.onclick = async () => {
        try {
          const formScore = Number(state.goalsBaseline?.baseline?.formScoreBaseline || 80);
          const notes = document.getElementById("rfSessionNotes")?.value.trim() || null;
          const workoutId = `workout_${state.selectedDate}`;
          await authedRequest("/api/workouts/track", {
            method: "POST",
            body: {
              programId: state.currentProgram.programId,
              workoutId,
              exercisesCompleted: exercises,
              reps: exercises.length * 10,
              sets: exercises.length * 3,
              formScore,
              sessionDurationMinutes: 45,
              notes,
              completionStatus: "completed"
            }
          });
          if (!state.completionDates.includes(state.selectedDate)) {
            state.completionDates.push(state.selectedDate);
            saveCompletionDates();
          }
          await refreshAndRender();
        } catch (err) {
          alert(`Unable to track workout: ${err.message}`);
        }
      };
    }
  }

  function renderWeeklyCheckIn() {
    const latest = state.checkIns[0];
    const latestTs = latest?.ts ? Number(latest.ts) : 0;
    const stale = !latestTs || (Date.now() - latestTs) > (7 * 24 * 60 * 60 * 1000);

    contentEl.innerHTML += `
      <div class="retention-card">
        <strong>8) Weekly Check-in ${stale ? "(Prompted)" : "(Up to date)"}</strong>
        <div class="retention-muted">Latest check-in: ${latestTs ? new Date(latestTs).toLocaleDateString() : "none"}</div>
        <div class="retention-grid">
          <label>Energy (1-10)<input id="rfEnergy" type="number" min="1" max="10" value="${esc(latest?.energy || 7)}"></label>
          <label>Soreness (1-10)<input id="rfSoreness" type="number" min="1" max="10" value="${esc(latest?.soreness || 4)}"></label>
          <label>Sleep (hours)<input id="rfSleep" type="number" min="0" max="24" value="${esc(latest?.sleep || 7)}"></label>
          <label>Motivation (1-10)<input id="rfMotivation" type="number" min="1" max="10" value="${esc(latest?.motivation || 8)}"></label>
          <label>Adherence %<input id="rfAdherence" type="number" min="0" max="100" value="${esc(latest?.adherence || 80)}"></label>
        </div>
        <label>Progress notes<textarea id="rfCheckinNotes" rows="2">${esc(latest?.progressNotes || "")}</textarea></label>
        <button id="rfSaveCheckinBtn">Save Weekly Check-in</button>
      </div>`;

    document.getElementById("rfSaveCheckinBtn").onclick = async () => {
      try {
        await authedRequest("/api/check-ins", {
          method: "POST",
          body: {
            energy: Number(document.getElementById("rfEnergy").value),
            soreness: Number(document.getElementById("rfSoreness").value),
            sleep: Number(document.getElementById("rfSleep").value),
            motivation: Number(document.getElementById("rfMotivation").value),
            weightKg: state.intake?.weightKg || null,
            measurements: [],
            progressNotes: document.getElementById("rfCheckinNotes").value.trim() || null,
            adherence: Number(document.getElementById("rfAdherence").value),
            painFlag: false
          }
        });
        await refreshAndRender();
      } catch (err) {
        alert(`Unable to save check-in: ${err.message}`);
      }
    };
  }

  function renderProgressDashboard() {
    const dash = state.progressDashboard || {};
    const consistency = Array.isArray(dash.weeklyConsistency) ? dash.weeklyConsistency : [];
    const formScores = Array.isArray(dash.formScoreTrend) ? dash.formScoreTrend : [];
    const checkIns = Array.isArray(dash.checkInTrend) ? dash.checkInTrend : [];
    const scans = Array.isArray(dash.visualProgressScans) ? dash.visualProgressScans : [];

    const avg = (arr) => {
      if (!arr.length) return "n/a";
      return Math.round(arr.reduce((sum, value) => sum + Number(value || 0), 0) / arr.length);
    };

    contentEl.innerHTML += `
      <div class="retention-card">
        <strong>9) Progress Dashboard</strong>
        <div class="retention-grid">
          <div class="retention-card"><strong>Consistency</strong><div>${avg(consistency.map((item) => item.adherence))}%</div></div>
          <div class="retention-card"><strong>Form score</strong><div>${avg(formScores)}</div></div>
          <div class="retention-card"><strong>Workouts completed</strong><div>${dash.workoutsCompleted || 0}</div></div>
          <div class="retention-card"><strong>Check-ins</strong><div>${checkIns.length}</div></div>
        </div>
        <div class="retention-muted">Visual scan links:</div>
        <ul>
          ${scans.length ? scans.map((scan) => `<li><a href="${esc(scan.frontImageUrl || scan.sideImageUrl || scan.backImageUrl || "#")}" target="_blank" rel="noopener">${esc(scan.captureLabel || scan.scanId || "scan")}</a></li>`).join("") : "<li>No visual scans yet. Add baseline scan link in Goals + Baseline.</li>"}
        </ul>
      </div>`;
  }

  async function refreshState() {
    const client = window.MufasaBackendRead?.createClient({
      baseUrl: getNodeBaseUrl(),
      storagePrefix: "maat"
    });
    state.authToken = client?.getAuthToken?.() || null;
    try {
      const me = await client?.fetchProfile?.();
      state.userId = me?.userId || state.userId || null;
    } catch (_) {
      state.userId = state.userId || null;
    }

    if (!state.authToken || !state.userId) {
      throw new Error("Please sign in to access retention flow.");
    }

    const [intake, goals, currentProgram, checkIns, dashboard] = await Promise.all([
      authedRequest("/api/client-intake"),
      authedRequest("/api/goals-baseline"),
      authedRequest("/api/programs/current"),
      authedRequest("/api/check-ins"),
      authedRequest("/api/progress/dashboard")
    ]);

    state.intake = intake.intake || null;
    state.goalsBaseline = goals.goalsBaseline || null;
    state.currentProgram = currentProgram.program || null;
    state.checkIns = Array.isArray(checkIns.items) ? checkIns.items : [];
    state.progressDashboard = dashboard;
  }

  async function refreshAndRender() {
    try {
      await refreshState();
      renderStatus();
      contentEl.innerHTML = "";
      renderIntakeForm();
      if (state.intake?.completedAt) renderGoalsBaselineForm();
      if (state.goalsBaseline?.goal) renderProgramCards();
      if (state.currentProgram?.programId) {
        renderCalendar();
        await renderDailyWorkoutDetail();
        renderWeeklyCheckIn();
        renderProgressDashboard();
      }
    } catch (err) {
      renderStatus();
      contentEl.innerHTML = `<div class="retention-muted">${esc(err.message || "Sign in required.")}</div>`;
    }
  }

  window.addEventListener("load", () => {
    refreshAndRender();
  });
  window.addEventListener("workout:completed", async (event) => {
    if (!state.currentProgram) return;
    const detail = event?.detail || {};
    if (!detail?.scheduledWorkoutId) return;
    try {
      await authedRequest("/api/workouts/track", {
        method: "POST",
        body: {
          programId: state.currentProgram.programId,
          workoutId: detail.scheduledWorkoutId,
          exercisesCompleted: detail.completedExercises || [],
          reps: detail.repsCompleted || 0,
          sets: detail.completedSets || 0,
          formScore: detail.formScoreSummary || null,
          sessionDurationMinutes: Math.max(1, Math.round((detail.durationSeconds || 0) / 60)),
          notes: detail.notes || null,
          completionStatus: "completed"
        }
      });
      if (state.selectedDate && !state.completionDates.includes(state.selectedDate)) {
        state.completionDates.push(state.selectedDate);
        saveCompletionDates();
      }
      await refreshAndRender();
    } catch (err) {
      console.warn("workout completion sync failed", err);
    }
  });
})();
