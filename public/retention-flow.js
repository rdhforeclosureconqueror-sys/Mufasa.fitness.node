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
    onboardingStatus: null
    ,journeyIntake: null, journeyProgress: null, journeySaveState: "Saved"
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
      throw new Error(`${path}: ${payload?.error?.message || `request_failed_${res.status}`}`);
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

  const JOURNEY_STEPS = ["pathway_selection","identity_profile","goals","health_safety","training_context","schedule","pathway_details","final_review"];
  const PATHWAY_LABELS = { general_fitness:"General Fitness", yoga_wellness:"Yoga & Wellness", athlete_performance:"Athlete Performance" };
  const field = (label, path, value="", type="text") => `<label>${label}<input type="${type}" data-journey-field="${path}" value="${esc(value ?? "")}" /></label>`;
  const checks = (label, path, options, selected=[]) => `<fieldset><legend>${label}</legend>${options.map(([v,l])=>`<label><input type="checkbox" data-journey-array="${path}" value="${v}" ${selected.includes(v)?"checked":""}> ${l}</label>`).join("")}</fieldset>`;
  function renderJourneyWizard() {
    const r=state.journeyIntake, p=state.journeyProgress; if(!r||!p)return;
    const step=r.currentStep||p.nextRequiredStep||"pathway_selection"; const selected=r.pathwaySelection.selected||[];
    let body="";
    if(step==="pathway_selection") body=`<h3>What brings you to the academy?</h3><p class="retention-muted">Choose one or two pathways.</p><div class="retention-pathways">${Object.entries(PATHWAY_LABELS).map(([v,l])=>`<label class="retention-pathway"><input type="checkbox" data-pathway="${v}" ${selected.includes(v)?"checked":""}> <strong>${l}</strong></label>`).join("")}</div><fieldset><legend>Primary pathway</legend>${selected.map(v=>`<label><input type="radio" name="journeyPrimary" value="${v}" ${r.pathwaySelection.primary===v?"checked":""}> ${PATHWAY_LABELS[v]}</label>`).join("")}</fieldset>`;
    if(step==="identity_profile") body=`<div class="retention-grid">${field("Full name","identity.fullName",r.identity.fullName)}${field("Preferred name","identity.preferredName",r.identity.preferredName)}${field("Phone","identity.phone",r.identity.phone,"tel")}${field("City/state","identity.cityState",r.identity.cityState)}${field("Preferred communication","identity.preferredCommunication",r.identity.preferredCommunication)}${field("Emergency contact name","identity.emergencyContactName",r.identity.emergencyContactName)}${field("Emergency contact phone","identity.emergencyContactPhone",r.identity.emergencyContactPhone,"tel")}${field("Date of birth","profile.dateOfBirth",r.profile.dateOfBirth,"date")}${field("Gender identity","profile.genderIdentity",r.profile.genderIdentity)}${field("Height (cm)","profile.heightCm",r.profile.heightCm,"number")}${field("Weight (kg)","profile.weightKg",r.profile.weightKg,"number")}</div>`;
    if(step==="goals") body=`${field("Primary goal","goals.primaryGoal",r.goals.primaryGoal)}${checks("Secondary goals (up to three)","goals.secondaryGoals",[["strength","Build strength"],["endurance","Improve endurance"],["mobility","Improve mobility"],["health","Improve general health"],["recovery","Return to activity"]],r.goals.secondaryGoals)}${field("What would success look like?","goals.successDefinition",r.goals.successDefinition)}${field("Important date","goals.importantDate",r.goals.importantDate,"date")}`;
    if(step==="health_safety") body=`<p class="retention-muted">These answers help coaches plan cautious follow-up; they do not provide diagnosis or medical clearance.</p>${field("Current pain or injury","healthSafety.currentPainOrInjury",r.healthSafety.currentPainOrInjury)}<label>Receiving treatment or rehab?<select data-journey-field="healthSafety.receivingTreatmentOrRehab"><option value="">Select</option><option value="true" ${r.healthSafety.receivingTreatmentOrRehab===true?"selected":""}>Yes</option><option value="false" ${r.healthSafety.receivingTreatmentOrRehab===false?"selected":""}>No</option></select></label>${field("Exercise restrictions","healthSafety.instructedToAvoidStrenuousExercise",r.healthSafety.instructedToAvoidStrenuousExercise)}${field("Concussion history","healthSafety.concussionHistory",r.healthSafety.concussionHistory)}${checks("Reported health conditions","healthSafety.conditions",[["cardiovascular","Cardiovascular"],["respiratory","Respiratory"],["metabolic","Metabolic"],["other","Other"]],r.healthSafety.conditions)}<label>Do you believe exercise is safe for you?<select data-journey-field="healthSafety.believesExerciseIsSafe"><option value="">Select</option><option value="yes" ${r.healthSafety.believesExerciseIsSafe==="yes"?"selected":""}>Yes</option><option value="unsure" ${r.healthSafety.believesExerciseIsSafe==="unsure"?"selected":""}>Unsure</option><option value="no" ${r.healthSafety.believesExerciseIsSafe==="no"?"selected":""}>No</option></select></label><label><input type="checkbox" data-journey-boolean="healthSafety.medicalDisclaimerConsent" ${r.healthSafety.medicalDisclaimerConsent?"checked":""}> I understand this is fitness guidance, not medical care.</label>`;
    if(step==="training_context") body=`${field("Active days per week","trainingContext.activeDaysPerWeek",r.trainingContext.activeDaysPerWeek)}${checks("Current training types","trainingContext.currentTrainingTypes",[["strength","Strength"],["cardio","Cardio"],["sport","Sport"],["yoga","Yoga"],["mobility","Mobility"]],r.trainingContext.currentTrainingTypes)}${field("Self-rated fitness level","trainingContext.selfRatedFitnessLevel",r.trainingContext.selfRatedFitnessLevel)}${field("Gym access","trainingContext.gymAccess",r.trainingContext.gymAccess)}${field("Field or track access","trainingContext.fieldTrackAccess",r.trainingContext.fieldTrackAccess)}${checks("Available equipment","trainingContext.availableEquipment",[["bodyweight","Bodyweight"],["dumbbells","Dumbbells"],["barbell","Barbell"],["bands","Bands"],["machines","Machines"]],r.trainingContext.availableEquipment)}`;
    if(step==="schedule") body=`${field("Preferred start date","schedule.preferredStartDate",r.schedule.preferredStartDate,"date")}${checks("Available days","schedule.availableDays",["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(x=>[x.toLowerCase(),x]),r.schedule.availableDays)}${checks("Available times","schedule.availableTimes",[["morning","Morning"],["midday","Midday"],["evening","Evening"]],r.schedule.availableTimes)}${field("Realistic sessions per week","schedule.realisticSessionsPerWeek",r.schedule.realisticSessionsPerWeek)}${field("Schedule limitations","schedule.limitations",r.schedule.limitations)}`;
    if(step==="pathway_details") { body=""; if(selected.includes("general_fitness"))body+=`<h3>General Fitness</h3><label>Main objective<select data-journey-field="generalFitness.weightChangeGoal"><option value="">Select</option>${[["lose_body_fat","Lose body fat"],["build_strength","Build strength"],["improve_endurance","Improve endurance"],["improve_mobility","Improve mobility"],["general_health","Improve general health"],["return_activity","Return to activity"]].map(([v,l])=>`<option value="${v}" ${r.generalFitness.weightChangeGoal===v?"selected":""}>${l}</option>`).join("")}</select></label>${field("Optional desired weight change","generalFitness.desiredWeightChange",r.generalFitness.desiredWeightChange,"number")}${field("Motivation","generalFitness.motivation",r.generalFitness.motivation)}`; if(selected.includes("yoga_wellness"))body+=`<h3>Yoga & Wellness</h3>${field("Experience level","yogaWellness.experienceLevel",r.yogaWellness.experienceLevel)}${checks("Intentions","yogaWellness.primaryIntentions",[["flexibility","Flexibility"],["mobility","Mobility"],["stress_management","Stress management"],["recovery","Recovery"],["balance","Balance"],["breathing","Breathing practice"],["wellness","General wellness"]],r.yogaWellness.primaryIntentions)}${checks("Preferred practices","yogaWellness.preferredPracticeTypes",[["gentle","Gentle"],["flow","Flow"],["restorative","Restorative"],["breathwork","Breathwork"]],r.yogaWellness.preferredPracticeTypes)}${field("Mobility limitations","yogaWellness.mobilityLimitations",r.yogaWellness.mobilityLimitations)}`; if(selected.includes("athlete_performance"))body+=`<h3>Athlete Performance</h3><label>Sport<select data-journey-field="athletePerformance.sport"><option value="">Select</option>${["Rugby","Football","Soccer","Basketball","Track and field","Combat sports","Other"].map(v=>`<option ${r.athletePerformance.sport===v?"selected":""}>${v}</option>`).join("")}</select></label>${field("Other sport","athletePerformance.sportOther",r.athletePerformance.sportOther)}${field("Current level","athletePerformance.currentLevel",r.athletePerformance.currentLevel)}${field("Current team or club","athletePerformance.currentTeamOrClub",r.athletePerformance.currentTeamOrClub)}${checks("Performance priorities (up to three)","athletePerformance.performancePriorities",[["speed","Speed"],["strength","Strength"],["power","Power"],["conditioning","Conditioning"],["mobility","Mobility"]],r.athletePerformance.performancePriorities)}${String(r.athletePerformance.sport).toLowerCase()==="rugby"?`<h4>Rugby supplement</h4>${field("Rugby experience (years)","rugbySupplement.experienceYears",r.rugbySupplement.experienceYears)}${checks("Formats","rugbySupplement.formats",[["sevens","Sevens"],["fifteens","Fifteens"]],r.rugbySupplement.formats)}${field("Club connection","rugbySupplement.clubStatus",r.rugbySupplement.clubStatus)}${field("Current or prospective club","rugbySupplement.currentOrProspectiveClub",r.rugbySupplement.currentOrProspectiveClub)}${field("Playing status","rugbySupplement.playingStatus",r.rugbySupplement.playingStatus)}${field("Primary position","rugbySupplement.primaryPosition",r.rugbySupplement.primaryPosition)}${field("Secondary position","rugbySupplement.secondaryPosition",r.rugbySupplement.secondaryPosition)}${field("Highest level played","rugbySupplement.highestLevelPlayed",r.rugbySupplement.highestLevelPlayed)}${field("Previous teams","rugbySupplement.previousTeams",r.rugbySupplement.previousTeams)}${field("Performance limiters","rugbySupplement.performanceLimiters",r.rugbySupplement.performanceLimiters)}${field("Previous test results","rugbySupplement.previousTestResults",r.rugbySupplement.previousTestResults)}${field("Preferred coaching style","rugbySupplement.preferredCoachingStyle",r.rugbySupplement.preferredCoachingStyle)}${field("Additional athlete context","rugbySupplement.additionalContext",r.rugbySupplement.additionalContext)}`:""}`; }
    if(step==="final_review")body=`<h3>Review and submit</h3><p>Selected pathways: ${selected.map(x=>PATHWAY_LABELS[x]).join(" + ")}</p><p>Health review: ${p.healthReviewStatus==="review_required"?"Coach follow-up will be requested.":"No follow-up flags currently detected."}</p><button id="rfSubmitJourney" type="button">Submit intake</button>`;
    const idx=JOURNEY_STEPS.indexOf(step); contentEl.innerHTML+=`<section class="retention-card" id="rfJourneyWizard"><div class="retention-journey-head"><strong>Intake Journey · ${p.completedCount}/${p.totalRequiredSteps}</strong><span id="rfJourneySaveState">${state.journeySaveState}</span></div><progress max="${p.totalRequiredSteps}" value="${p.completedCount}"></progress><div id="rfJourneyErrors" class="status-bad" role="alert"></div>${body}<div class="retention-wizard-actions"><button id="rfJourneyBack" type="button" ${idx<=0?"disabled":""}>Back</button><button id="rfJourneySave" type="button">Save and exit</button>${step!=="final_review"?`<button id="rfJourneyContinue" type="button">Continue</button>`:""}</div></section>`;
    bindJourneyWizard(step,idx);
  }
  function setPath(target,path,value){const [section,key]=path.split(".");target[section]=target[section]||{};target[section][key]=value;}
  function collectJourneyPatch(nextStep) { const patch={currentStep:nextStep}; document.querySelectorAll("[data-journey-field]").forEach(el=>{let v=el.value||null;if(el.type==="number"&&v!==null)v=Number(v);if(v==="true"||v==="false")v=v==="true";setPath(patch,el.dataset.journeyField,v)});document.querySelectorAll("[data-journey-array]").forEach(el=>{const path=el.dataset.journeyArray;if(!patch[path.split('.')[0]]?.[path.split('.')[1]])setPath(patch,path,[]);if(el.checked)patch[path.split('.')[0]][path.split('.')[1]].push(el.value)});document.querySelectorAll("[data-journey-boolean]").forEach(el=>setPath(patch,el.dataset.journeyBoolean,el.checked));return patch; }
  async function saveJourney(patch){state.journeySaveState="Saving…";document.getElementById("rfJourneySaveState").textContent=state.journeySaveState;try{const saved=await authedRequest("/api/me/retention/intake",{method:"PATCH",body:patch});state.journeyIntake=saved.intake;state.journeyProgress=saved.progress;state.journeySaveState="Saved";return true}catch(e){state.journeySaveState="Save failed";document.getElementById("rfJourneyErrors").textContent=e.message;document.getElementById("rfJourneySaveState").textContent=state.journeySaveState;return false}}
  function bindJourneyWizard(step,idx){const pathway=()=>{const selected=[...document.querySelectorAll("[data-pathway]:checked")].map(x=>x.dataset.pathway);if(selected.length>2){document.getElementById("rfJourneyErrors").textContent="Choose no more than two pathways.";return null}return{currentStep:step,pathwaySelection:{selected,primary:document.querySelector('[name="journeyPrimary"]:checked')?.value||selected[0]||null}}};document.querySelectorAll("[data-pathway],[name=journeyPrimary]").forEach(el=>el.onchange=async()=>{const p=pathway();if(p&&await saveJourney(p))refreshAndRender("pathway-change")});document.getElementById("rfJourneyBack").onclick=async()=>{await saveJourney(step==="pathway_selection"?pathway():collectJourneyPatch(JOURNEY_STEPS[idx-1]));refreshAndRender("back")};document.getElementById("rfJourneyContinue")?.addEventListener("click",async()=>{const p=step==="pathway_selection"?pathway():collectJourneyPatch(JOURNEY_STEPS[idx+1]);if(p&&await saveJourney(p))refreshAndRender("continue")});let autosaveTimer; document.querySelectorAll("#rfJourneyWizard [data-journey-field],#rfJourneyWizard [data-journey-array],#rfJourneyWizard [data-journey-boolean]").forEach(el=>el.addEventListener("change",()=>{clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>saveJourney(collectJourneyPatch(step)),500)}));document.getElementById("rfJourneySave").onclick=()=>saveJourney(step==="pathway_selection"?pathway():collectJourneyPatch(step));document.getElementById("rfSubmitJourney")?.addEventListener("click",async()=>{try{await saveJourney(collectJourneyPatch(step));const saved=await authedRequest("/api/me/retention/intake/submit",{method:"POST"});state.journeyIntake=saved.intake;state.journeyProgress=saved.progress;refreshAndRender("submitted")}catch(e){document.getElementById("rfJourneyErrors").textContent=e.message}});}

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

    const [intake, goals, currentProgram, checkIns, dashboard, onboardingStatus, journey] = await Promise.all([
      authedRequest("/api/client-intake"),
      authedRequest("/api/goals-baseline"),
      authedRequest("/api/programs/current"),
      authedRequest("/api/check-ins"),
      authedRequest("/api/progress/dashboard"),
      authedRequest("/api/me/onboarding-status"), authedRequest("/api/me/retention/intake")
    ]);

    state.intake = intake.intake || null;
    state.goalsBaseline = goals.goalsBaseline || null;
    state.currentProgram = currentProgram.program || null;
    state.checkIns = Array.isArray(checkIns.items) ? checkIns.items : [];
    state.progressDashboard = dashboard;
    state.onboardingStatus = onboardingStatus;
    state.journeyIntake=journey.intake; state.journeyProgress=journey.progress;
  }

  async function refreshAndRender(reason = "runtime") {
    try {
      await refreshState();
      renderStatus();
      contentEl.innerHTML = "";
      renderJourneyWizard();
      contentEl.innerHTML += `<div class="retention-grid" aria-label="Later journey stages"><div class="retention-card"><strong>Assessment</strong><div class="retention-muted">${state.onboardingStatus?.sections?.overheadSquatAssessment?.status === "complete" ? "Complete" : "Optional · not started"}</div></div><div class="retention-card"><strong>First Workout</strong><div class="retention-muted">${state.onboardingStatus?.sections?.firstWorkout?.status === "complete" ? "Complete" : "Not started"}</div></div><div class="retention-card"><strong>Weekly Habits</strong><div class="retention-muted">Available after your program begins.</div></div></div>`;
      if (state.goalsBaseline?.goal) renderProgramCards();
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
