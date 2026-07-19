(function () {
  try {
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
    exerciseIndex: null,
    latestRewardSummary: null,
    onboardingStatus: null,
    journeyIntake: null,
    journeyProgress: null,
    journeySaveState: "Saved",
    personalization: null
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

  const NODE_BASE_URL = window.RuntimeState?.getBackendOrigin?.() || window.location.origin;

  function getNodeBaseUrl() {
    return NODE_BASE_URL;
  }

  function getCanonicalAuth() {
    const auth = window.APP_AUTH && typeof window.APP_AUTH === "object" ? window.APP_AUTH : null;
    if (!auth) return { isAuthenticated: false, token: null, user: null };
    return { isAuthenticated: Boolean(auth.isAuthenticated), token: auth.token || null, user: auth.user || null };
  }

  function saveCompletionDates() {
    writeJSON("RETENTION_COMPLETION_DATES", state.completionDates);
  }

  async function authedRequest(path, { method = "GET", body = null } = {}) {
    const client = window.MufasaBackendRead?.createClient({
      baseUrl: getNodeBaseUrl(),
      storagePrefix: "maat"
    });
    const canonicalAuth = getCanonicalAuth();
    const token = canonicalAuth.token || state.authToken;
    if (!token) throw new Error("missing_auth_token");
    state.authToken = token || state.authToken;

    console.log("[RETENTION_RUNTIME] route", method, path);
    const res = await fetch(`${getNodeBaseUrl()}${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        "content-type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok) {
      const error = new Error(`${path}: ${payload?.error?.message || `request_failed_${res.status}`}`);
      error.details = payload?.error?.details || null;
      throw error;
    }
    return payload.data || {};
  }

  async function loadExerciseIndex() {
    if (state.exerciseIndex) return state.exerciseIndex;
    const base = getNodeBaseUrl();
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
    const sections = state.onboardingStatus?.sections || {};
    if (sections.goals?.status !== "complete") return 1;
    if (sections.intake?.status !== "complete" || sections.medicalHistory?.status !== "complete") return 2;
    if (!["complete", "skipped_for_pilot"].includes(sections.overheadSquatAssessment?.status)) return 3;
    if (sections.firstWorkout?.status !== "complete") return 4;
    return 4;
  }

  function getOnboardingProgress() {
    const sections = state.onboardingStatus?.sections || {};
    return [
      { label: "Intake", complete: sections.intake?.status === "complete", message: "Now we have your intake basics." },
      { label: "Goals", complete: sections.goals?.status === "complete", message: "Now we know what motivates you." },
      { label: "Medical/history basics", complete: sections.medicalHistory?.status === "complete", message: "Now we have the basics needed to guide safer training." },
      { label: "Overhead Squat Assessment", complete: ["complete", "skipped_for_pilot"].includes(sections.overheadSquatAssessment?.status), message: sections.overheadSquatAssessment?.status === "skipped_for_pilot" ? "Pilot starter workouts are not blocked by OHSA." : "Now we have a movement baseline." },
      { label: "First Workout", complete: sections.firstWorkout?.status === "complete", message: "Now we have your first performance baseline." }
    ];
  }

  function renderStatus() {
    if (state.journeyProgress) {
      const p=state.journeyProgress;
      statusEl.textContent=`Intake Journey ${p.completedCount}/${p.totalRequiredSteps} · Current: ${String(p.currentStep||"complete").replaceAll("_"," ")} · ${state.journeySaveState} · ${p.overallStatus}${p.healthReviewStatus==="review_required"?" · Health review needed":""}`;
      return;
    }
    const step = inferStep();
    const retentionStatus = state.progressDashboard?.retentionMotivationStatus || "NOT_READY";
    const progress = getOnboardingProgress()
      .map((item) => `${item.complete ? "✓" : "○"} ${item.label}`)
      .join(" • ");
    const count = state.onboardingStatus?.completionCount ?? getOnboardingProgress().filter((item) => item.complete).length;
    const total = state.onboardingStatus?.totalCount ?? getOnboardingProgress().length;
    statusEl.textContent = `Onboarding progress (${count}/${total}, next step ${step}): ${progress}. Retention Motivation Status: ${retentionStatus}`;
  }

  function renderProgressCard() {
    contentEl.innerHTML += `
      <div class="retention-card" id="rfOnboardingProgress">
        <strong>Onboarding Progress</strong>
        <div class="retention-muted">Complete your intake so Ma’at can build a safer, more personalized program.</div>
        <ul>${getOnboardingProgress().map((item) => `<li><strong>${item.complete ? "Complete" : "Pending"}:</strong> ${esc(item.label)}${item.complete ? ` — ${esc(item.message)}` : ""}</li>`).join("")}</ul>
        <div class="retention-muted">Overhead Squat Assessment is available after camera connects, but pilot starter workouts are not blocked by OHSA.</div>
      </div>`;
  }

  /* The retired client-intake forms below remain reachable from the legacy
     onboarding cards. Universal Intake is exclusively owned by
     retention-journey-wizard.js so the two forms cannot render together. */
  function renderJourneyWizard() {
    if (!state.journeyIntake || !state.journeyProgress || !window.RetentionJourneyWizard) return;
    window.__retentionJourneyWizard?.destroy?.();
    window.__retentionJourneyWizard = window.RetentionJourneyWizard.create({
      container: contentEl,
      intake: state.journeyIntake,
      progress: state.journeyProgress,
      request: authedRequest,
      onState: ({ intake, progress, saveStatus }) => {
        if (intake) state.journeyIntake = intake;
        if (progress) state.journeyProgress = progress;
        state.journeySaveState = saveStatus;
        renderStatus();
      },
      onComplete: () => refreshAndRender("journey-complete")
    });
  }

  function renderRetentionMetricsCard() {
    const streak = state.progressDashboard?.streak || {};
    const weekly = state.progressDashboard?.weeklyReview || {};
    const prompts = state.progressDashboard?.habitLoopPrompts || {};
    contentEl.innerHTML += `
      <div class="retention-card">
        <strong>Retention Motivation</strong>
        <div class="retention-grid">
          <div class="retention-card"><strong>${esc(streak.currentStreak || 0)}-day streak</strong><div class="retention-muted">Current streak</div></div>
          <div class="retention-card"><strong>${esc(streak.weeklyWorkoutsCompleted || 0)} of ${esc(streak.weeklyTarget || 4)} workouts completed this week</strong><div class="retention-muted">Weekly completion</div></div>
          <div class="retention-card"><strong>${esc(streak.consistencyPercentage || 0)}% consistent this week</strong><div class="retention-muted">Consistency</div></div>
          <div class="retention-card"><strong>${esc(streak.missedWorkouts || 0)} missed workouts</strong><div class="retention-muted">${esc(streak.comebackStatus || "on_track")}</div></div>
        </div>
        <div class="retention-card">
          <strong>Habit loop prompts</strong>
          <ul>
            <li><strong>Before:</strong> ${esc(prompts.beforeWorkout || "Today’s mission: complete your assigned workout.")}</li>
            <li><strong>During:</strong> ${esc(prompts.duringWorkout || "Set 2 of 3 — stay steady.")}</li>
            <li><strong>After:</strong> ${esc(prompts.afterWorkout || "You completed today’s mission.")}</li>
            <li><strong>Weekly:</strong> ${esc(prompts.weekly || "Review your week and lock in next week.")}</li>
          </ul>
          <div class="retention-muted">${esc(weekly.weekSummary || "Weekly summary will appear after check-in.")}</div>
        </div>
      </div>`;
  }

  function renderRewardSummaryCard() {
    const reward = state.latestRewardSummary || state.progressDashboard?.rewardSummary || null;
    if (!reward) return;
    contentEl.innerHTML += `
      <div class="retention-card" style="border-color:rgba(74,222,128,.8);background:rgba(22,163,74,.2);">
        <strong>🏆 Post-workout reward</strong>
        <div class="retention-grid">
          <div><strong>Workout completed:</strong> ${reward.workoutCompleted ? "Yes" : "No"}</div>
          <div><strong>Exercises completed:</strong> ${esc(reward.exercisesCompleted || 0)}</div>
          <div><strong>Total reps:</strong> ${esc(reward.totalReps || 0)}</div>
          <div><strong>Form score:</strong> ${esc(reward.formScoreSummary ?? "n/a")}</div>
        </div>
        <div><strong>Best form cue improved:</strong> ${esc(reward.bestFormCueImproved || "Rep quality improved.")}</div>
        <div><strong>Streak update:</strong> ${esc(reward.streakUpdate || "Streak updated")}</div>
        <div><strong>Next scheduled workout:</strong> ${esc(reward.nextScheduledWorkout || "See calendar")}</div>
        <div style="margin-top:6px;"><strong>${esc(reward.momentumMessage || "You’re building momentum.")}</strong></div>
      </div>`;
  }

  function renderIntakeForm() {
    contentEl.innerHTML += `
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
        <div class="retention-muted">You can return and edit these intake basics later.</div>
      </div>`;

    document.getElementById("rfSaveIntakeBtn").onclick = async () => {
      try {
        const payload = {
          name: document.getElementById("rfIntakeName").value.trim() || "N/A",
          age: Number(document.getElementById("rfIntakeAge").value) || null,
          sex: document.getElementById("rfIntakeSex").value.trim() || "N/A",
          heightCm: Number(document.getElementById("rfIntakeHeight").value) || null,
          weightKg: Number(document.getElementById("rfIntakeWeight").value) || null,
          goals: document.getElementById("rfIntakeGoals").value.split(",").map((x) => x.trim()).filter(Boolean),
          injuries: document.getElementById("rfIntakeInjuries").value.split(",").map((x) => x.trim()).filter(Boolean),
          limitations: ["N/A"],
          trainingExperience: "N/A",
          equipment: document.getElementById("rfIntakeEquipment").value.split(",").map((x) => x.trim()).filter(Boolean),
          schedule: null,
          preferredWorkoutDays: [],
          medicalDisclaimerConsent: document.getElementById("rfDisclaimer").checked,
          notes: "N/A"
        };
        if (!payload.goals.length) payload.goals = ["N/A"];
        if (!payload.injuries.length) payload.injuries = ["N/A"];
        if (!payload.equipment.length) payload.equipment = ["bodyweight"];
        const saved = await authedRequest("/api/client-intake", { method: "POST", body: payload });
        state.intake = saved.intake;
        statusEl.textContent = "Now we have the basics needed to guide safer training.";
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
        statusEl.textContent = "Now we know what motivates you.";
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
        <strong>8) Weekly Review ${stale ? "(Prompted)" : "(Up to date)"}</strong>
        <div class="retention-muted">Latest check-in: ${latestTs ? new Date(latestTs).toLocaleDateString() : "none"}</div>
        <div class="retention-grid">
          <label>Workouts completed this week<input id="rfWeekWorkouts" type="number" min="0" max="14" value="${esc(state.progressDashboard?.streak?.weeklyWorkoutsCompleted || 0)}"></label>
          <label>Energy (1-10)<input id="rfEnergy" type="number" min="1" max="10" value="${esc(latest?.energy || 7)}"></label>
          <label>Soreness (1-10)<input id="rfSoreness" type="number" min="1" max="10" value="${esc(latest?.soreness || 4)}"></label>
          <label>Sleep (hours)<input id="rfSleep" type="number" min="0" max="24" value="${esc(latest?.sleep || 7)}"></label>
          <label>Motivation (1-10)<input id="rfMotivation" type="number" min="1" max="10" value="${esc(latest?.motivation || 8)}"></label>
          <label>Adherence %<input id="rfAdherence" type="number" min="0" max="100" value="${esc(latest?.adherence || 80)}"></label>
        </div>
        <label>Form score trend<textarea id="rfFormTrendNotes" rows="2">${esc(latest?.formTrendNotes || "")}</textarea></label>
        <label>Strength/progression notes<textarea id="rfStrengthNotes" rows="2">${esc(latest?.strengthProgressionNotes || "")}</textarea></label>
        <label>Progress notes<textarea id="rfCheckinNotes" rows="2">${esc(latest?.progressNotes || "")}</textarea></label>
        <label>Body measurements (optional)<input id="rfBodyMeasurementsOptional" value="${esc(latest?.bodyMeasurementsOptional || "")}"></label>
        <label>Visual scan link (optional)<input id="rfVisualScanOptional" value="${esc(latest?.visualScanOptional || "")}"></label>
        <label>Next week focus<input id="rfNextWeekFocus" value="${esc(latest?.nextWeekFocus || "")}"></label>
        <button id="rfSaveCheckinBtn">Save Weekly Review</button>
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
            strengthProgressionNotes: document.getElementById("rfStrengthNotes").value.trim() || null,
            formTrendNotes: document.getElementById("rfFormTrendNotes").value.trim() || null,
            bodyMeasurementsOptional: document.getElementById("rfBodyMeasurementsOptional").value.trim() || null,
            visualScanOptional: document.getElementById("rfVisualScanOptional").value.trim() || null,
            nextWeekFocus: document.getElementById("rfNextWeekFocus").value.trim() || null,
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

  function renderProgressNarrative() {
    const story = state.progressDashboard?.progressNarrative || {};
    const coachMessages = state.progressDashboard?.coachMessaging?.messages || [];
    contentEl.innerHTML += `
      <div class="retention-card">
        <strong>Your Progress Story</strong>
        <div class="retention-grid">
          <div class="retention-card"><strong>Starting point</strong><div class="retention-muted">${esc(JSON.stringify(story.startingPoint || {}))}</div></div>
          <div class="retention-card"><strong>Current week</strong><div>${esc(story.currentWeek || 1)}</div></div>
          <div class="retention-card"><strong>Workouts completed</strong><div>${esc(story.workoutsCompleted || 0)}</div></div>
          <div class="retention-card"><strong>Streak</strong><div>${esc(story.streak || 0)} days</div></div>
          <div class="retention-card"><strong>Form improvement</strong><div>${esc(story.formImprovement ?? "n/a")}</div></div>
          <div class="retention-card"><strong>Strength improvement</strong><div>${esc(JSON.stringify(story.strengthImprovement || {}))}</div></div>
          <div class="retention-card"><strong>Check-in trend</strong><div>${esc((story.checkInTrend || []).length)} check-ins tracked</div></div>
          <div class="retention-card"><strong>Visual progress scan</strong><div>${story.visualProgressScanLink ? `<a href="${esc(story.visualProgressScanLink)}" target="_blank" rel="noopener">Open latest scan</a>` : "n/a"}</div></div>
          <div class="retention-card"><strong>Next milestone</strong><div>${esc(story.nextMilestone || "Keep building momentum.")}</div></div>
        </div>
        <div class="retention-card">
          <strong>Coach messages</strong>
          <ul>${coachMessages.map((msg) => `<li><strong>${esc(msg.type)}:</strong> ${esc(msg.text)}</li>`).join("")}</ul>
        </div>
      </div>`;
  }

  async function refreshState() {
    const client = window.MufasaBackendRead?.createClient({
      baseUrl: getNodeBaseUrl(),
      storagePrefix: "maat"
    });
    const auth = getCanonicalAuth();
    state.authToken = auth.token || client?.getAuthToken?.() || null;
    try {
      const me = await client?.fetchProfile?.();
      state.userId = me?.userId || auth?.user?.userId || auth?.user?.id || state.userId || null;
    } catch (_) {
      state.userId = state.userId || null;
    }

    if (!state.authToken || !state.userId) {
      throw new Error("Sign in to begin onboarding flow.");
    }

    const [intake, goals, currentProgram, checkIns, dashboard, onboardingStatus, journey, personalization] = await Promise.all([
      authedRequest("/api/client-intake"),
      authedRequest("/api/goals-baseline"),
      authedRequest("/api/programs/current"),
      authedRequest("/api/check-ins"),
      authedRequest("/api/progress/dashboard"),
      authedRequest("/api/me/onboarding-status"),
      authedRequest("/api/me/retention/intake"),
      authedRequest("/api/me/personalization")
    ]);

    state.intake = intake.intake || null;
    state.goalsBaseline = goals.goalsBaseline || null;
    state.currentProgram = currentProgram.program || null;
    state.checkIns = Array.isArray(checkIns.items) ? checkIns.items : [];
    state.progressDashboard = dashboard;
    state.onboardingStatus = onboardingStatus;
    state.journeyIntake = journey.intake;
    state.journeyProgress = journey.progress;
    state.personalization = personalization;
  }

  async function refreshAndRender(reason = "runtime") {
    try {
      await refreshState();
      renderStatus();
      contentEl.innerHTML = "";
      renderJourneyWizard();
      const assessmentStatus = state.onboardingStatus?.sections?.overheadSquatAssessment?.status === "complete"
        ? "Complete"
        : state.personalization?.featureFlags?.requiresHealthReview
          ? "Pending health review"
          : state.personalization?.featureFlags?.hasAssessmentRecommendations
            ? "Recommended · not started"
            : "Optional · not started";
      contentEl.innerHTML += `<div class="retention-grid" aria-label="Later journey stages"><div class="retention-card"><strong>Assessment</strong><div class="retention-muted">${assessmentStatus}</div></div><div class="retention-card"><strong>First Workout</strong><div class="retention-muted">${state.onboardingStatus?.sections?.firstWorkout?.status === "complete" ? "Complete" : "Not started"}</div></div><div class="retention-card"><strong>Weekly Habits</strong><div class="retention-muted">Available after your program begins.</div></div></div>`;
      if (state.personalization?.recommendedWorkoutCategory || state.goalsBaseline?.goal) renderProgramCards();
      if (state.currentProgram?.programId) {
        renderRewardSummaryCard();
        renderCalendar();
        await renderDailyWorkoutDetail();
        renderRetentionMetricsCard();
        renderWeeklyCheckIn();
        renderProgressDashboard();
        renderProgressNarrative();
      }
      window.__retentionMotivationStatus = {
        intakeComplete: state.onboardingStatus?.sections?.intake?.status === "complete",
        goalSet: state.onboardingStatus?.sections?.goals?.status === "complete",
        programAssigned: Boolean(state.currentProgram?.programId),
        firstWorkoutCompleted: state.onboardingStatus?.sections?.firstWorkout?.status === "complete",
        weeklyReviewReady: Boolean(state.progressDashboard?.weeklyReview?.weekSummary),
        coachMessagingReady: Array.isArray(state.progressDashboard?.coachMessaging?.messages) && state.progressDashboard.coachMessaging.messages.length > 0,
        progressNarrativeReady: Boolean(state.progressDashboard?.progressNarrative?.nextMilestone),
        postWorkoutRewardScreenReady: Boolean(state.progressDashboard?.rewardSummary?.workoutCompleted),
        streakSystemReady: Number.isFinite(Number(state.progressDashboard?.streak?.consistencyPercentage)),
        habitLoopReady: Boolean(state.progressDashboard?.habitLoopPrompts?.beforeWorkout),
        visualScanEnabled: true,
        visualScanUsed: Array.isArray(state.progressDashboard?.visualProgressScans) && state.progressDashboard.visualProgressScans.length > 0,
        dashboard: state.progressDashboard
      };
    } catch (err) {
      renderStatus();
      contentEl.innerHTML = `<div class="retention-muted">${esc(err.message || "Sign in required.")}</div>`;
    }
  }

  window.__retentionFlowRefresh = (reason = 'manual') => refreshAndRender(reason);

  window.addEventListener("load", () => {
    refreshAndRender('window:load');
  });
  window.addEventListener("auth:changed", () => refreshAndRender('auth:changed'));
  window.addEventListener("auth:ready", () => refreshAndRender('auth:ready'));
  window.addEventListener("workout:completed", async (event) => {
    const detail = event?.detail || {};
    if (!detail?.scheduledWorkoutId && !detail?.workoutId) return;
    try {
      if (window.MufasaDashboardRuntime?.propagateCompletion) {
        await window.MufasaDashboardRuntime.propagateCompletion(detail, {
          currentProgram: state.currentProgram,
          selectedDate: state.selectedDate
        });
      } else {
        throw new Error("dashboard-runtime.js unavailable for retention completion propagation");
      }
      const runtimeState = window.MufasaDashboardRuntime?.getState?.() || {};
      state.latestRewardSummary = runtimeState.latestReward?.rewardSummary || runtimeState.latestReward || null;
      if (state.selectedDate && !state.completionDates.includes(state.selectedDate)) {
        state.completionDates.push(state.selectedDate);
        saveCompletionDates();
      }
      statusEl.textContent = "Now we have your first performance baseline.";
      await refreshAndRender('workout:completed');
    } catch (err) {
      console.error("[RETENTION_RUNTIME] workout completion sync failed", err);
      statusEl.textContent = `Completion sync failed: ${err?.message || err}`;
      statusEl.classList?.add?.("status-bad");
    }
  });
  } catch (err) {
    console.error("[retention-flow] bootstrap failed", err);
  }
})();
