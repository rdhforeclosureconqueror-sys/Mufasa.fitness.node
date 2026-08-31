(function installPocketPtGuide(global) {
  "use strict";
  if (global.PocketPTGuide) return;

  const TARGET_TIMEOUT_MS = 5000;
  const PENDING_KEY = "pocketpt.pendingTour.v1";
  const tours = {
    introduction: [
      { target: ".maat-nav-brand", title: "Welcome to Pocket PT", body: "Pocket PT brings your training, movement, nutrition, progress, and coaching tools together in one place. We’ll show you where to start and how to find the tools you’ll use most." },
      { target: '[data-tour="intake-start"]', route: "/workout.html#retentionFlowRoot", title: "Start here — complete your Intake", body: "Your Intake gives Pocket PT the information it needs to personalize your experience around your goals, training history, schedule, available equipment, and preferences. It usually takes about 3–5 minutes." }
    ],
    dashboard: [
      { target: '[data-tour="dashboard-home"]', title: "Your Pocket PT home", body: "This is your Pocket PT home. It brings your next actions and progress together." },
      { target: '[data-tour="profile"]', title: "Your profile and Intake", body: "Start with your Intake so Pocket PT can tailor your experience. It usually takes about 3–5 minutes." },
      { target: '[data-tour="weekly-plan"]', title: "My Program", body: "Review your personalized program and see the next action that fits your plan." },
      { target: '[data-tour="dashboard-navigation"]', title: "Find your tools", body: "Use these links to train, explore exercises, choose Yoga sessions, and review Progress & Rewards." },
      { target: '[data-tour="progress-summary"]', title: "Progress & Rewards", body: "See saved activity, progress, streaks, and rewards earned through your Pocket PT experience." }
    ],
    intake: [
      { target: '[data-tour="intake-start"]', title: "Your Pocket PT Intake", body: "Your Intake helps Pocket PT personalize your experience. Start or continue here; most members finish in about 3–5 minutes." },
      { target: '[data-tour="intake-wizard"], #retentionFlowRoot', title: "Follow your Intake journey", body: "The Intake shows one section at a time. Your answers are saved as you continue, so the next section always matches where you are in the journey." },
      { target: '[data-tour="intake-current-section"], #retentionFlowRoot', title: "Complete the section in front of you", body: "Answer the visible questions at your own pace. Later sections appear only after you save and continue." },
      { target: '[data-tour="intake-actions"], #retentionFlowRoot', title: "Save and continue", body: "Use Save & Continue to move forward, or Return later to keep your place. Review and submit at the end; Pocket PT does not diagnose or provide medical treatment." }
    ],
    training: [
      { target: '[data-tour="weekly-plan"]', title: "Your training area", body: "Review your plan, choose today’s workout, or resume a session you already started." },
      { target: '[data-tour="workout-selection"]', title: "Choose a workout", body: "Use this selection to choose the workout that fits today’s plan." },
      { target: '[data-tour="workout-controls"]', title: "Start or resume", body: "Use the workout controls to begin, move through your session, and finish when you are done." },
      { target: '[data-tour="camera"]', optional: true, title: "Optional camera guidance", body: "Camera guidance is optional. This tour never turns on your camera." },
      { target: '[data-tour="workout-progress"]', optional: true, title: "Session progress", body: "Follow your current exercise and session progress here as you train." }
    ],
    challenge: [
      { target: '[data-tour="challenge-library"]', title: "Choose a challenge", body: "The Challenge Library brings the available strength, bodyweight, mobility, and consistency challenges together." },
      { target: '[data-tour="challenge-filters"]', title: "Find the right challenge", body: "Filter the library by the kind of progress you want to work on." },
      { target: '[data-tour="challenge-results"]', title: "Start or resume", body: "Open a challenge card to review its plan, start it, or return to progress already underway." }
    ],
    "exercise-library": [
      { target: '[data-tour="exercise-search"]', title: "Find an exercise", body: "Search by exercise, muscle, equipment, or training goal." },
      { target: '[data-tour="exercise-filters"]', title: "Narrow the results", body: "Use filters to find exercises that match your equipment, experience, or goal." },
      { target: '[data-tour="exercise-results"]', title: "Explore exercises", body: "Open a result to review its purpose, technique, equipment, and available guidance." }
    ],
    yoga: [
      { target: '[data-tour="yoga-overview"]', title: "Yoga for movement and recovery", body: "Use Yoga sessions for movement, recovery, and focus alongside your training." },
      { target: '[data-tour="yoga-catalog"]', title: "Choose a session", body: "Browse the available sessions and select one that fits your time and focus." },
      { target: '[data-tour="yoga-detail"]', optional: true, title: "Review the session", body: "See the poses and session guidance before you begin. Camera guidance is optional, and video or frames are not stored." }
    ],
    nutrition: [
      { target: '[data-tour="nutrition-scan"]', title: "Scan a packaged food", body: "Scan a supported UPC or EAN barcode, then review the product information before saving it." },
      { target: '[data-tour="nutrition-search"]', title: "Search common foods", body: "Search USDA and common-food results, then choose and review the closest match." },
      { target: '[data-tour="nutrition-natural-language"]', title: "Describe what you ate", body: "Tell Pocket PT what you ate to create a draft. Review and confirm the details before adding it to your journal." },
      { target: '[data-tour="nutrition-recent"]', title: "Repeat recent or saved meals", body: "Quickly reuse a recent food or a meal you previously saved." },
      { target: '[data-tour="nutrition-custom"]', title: "Add or save your own", body: "Add a custom food or save a group of entries as a reusable meal." },
      { target: '[data-tour="nutrition-summary"]', title: "Review today", body: "Check today’s journal and summary, refresh it after changes, and edit entries when needed." },
      { target: '[data-tour="weekly-plan"]', optional: true, title: "Plan your week", body: "Build a practical weekly food plan, grocery options, and daily missions when those tools are useful to you." }
    ],
    "run-club": [{ target: "main", title: "Run Club", body: "Choose an available activity, set a realistic goal, and return here to continue your progress." }],
    progress: [{ target: '[data-tour="progress-summary"]', title: "Progress & Rewards", body: "Review your saved workout history, progress, streaks, rewards, and the next action available to you." }],
    avatar: [{ target: '[data-tour="avatar-controls"]', title: "Your avatar", body: "Use the currently available controls to choose or upload a compatible personalized avatar. Availability can vary by device." }]
  };
  const tourRoutes = Object.freeze({
    introduction: "/dashboard.html", dashboard: "/dashboard.html", intake: "/workout.html#retentionFlowRoot",
    training: "/workout.html", challenge: "/challenges.html", "exercise-library": "/exercise-library.html",
    yoga: "/yoga.html", nutrition: "/nutrition.html", progress: "/dashboard.html#gamificationExperience",
    avatar: "/workout.html#avatarCreateBtn", "run-club": "/greatness.html"
  });
  const contexts = [
    { match: /dashboard\.html$/, tourId: "dashboard" }, { match: /workout\.html$/, tourId: "training" },
    { match: /nutrition\.html$/, tourId: "nutrition" }, { match: /exercise-library\.html$/, tourId: "exercise-library" },
    { match: /yoga\.html$/, tourId: "yoga" }, { match: /challenges\.html$/, tourId: "challenge" },
    { match: /(greatness|stepping-into-greatness)\.html$/, tourId: "run-club" }
  ];
  let active = null, abort = null, previousFocus = null, listeners = false, autoAttempted = false;
  const api = async (method = "GET", body) => { try { const token = global.AuthStateRuntime?.getCanonicalAuthState?.()?.token; const response = await fetch("/api/me/guided-experience", { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); return response.ok ? (await response.json()).data : null; } catch (_) { return null; } };
  const routeMatches = route => { const url = new URL(route, location.origin); return url.pathname === location.pathname && (!url.hash || url.hash === location.hash); };
  const focusables = layer => [...layer.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden && el.getAttribute("aria-hidden") !== "true");
  function remove() { const focus = previousFocus; document.querySelector(".ppt-guide-layer")?.remove(); document.querySelectorAll(".ppt-guide-target").forEach(el => el.classList.remove("ppt-guide-target")); abort?.abort(); abort = null; active = null; previousFocus = null; if (focus?.isConnected) focus.focus(); }
  async function finish(action) { const id = active?.id; remove(); if (id) await api("PATCH", { tourId: id, action }); }
  async function waitForTarget(selector, timeout = TARGET_TIMEOUT_MS) { const deadline = Date.now() + timeout; while (Date.now() < deadline) { const target = document.querySelector(selector); if (target && target.getClientRects().length) return target; await new Promise(resolve => setTimeout(resolve, 100)); } return null; }
  function persistDestination(id) { try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ id, expiresAt: Date.now() + 30000 })); } catch (_) {} }
  function navigateForTour(id, route) { persistDestination(id); location.assign(new URL(route, location.origin).href); }
  function placeCard(card, target) { const rect = target.getBoundingClientRect(), viewport = global.visualViewport?.height || global.innerHeight; card.classList.remove("ppt-guide-above", "ppt-guide-below", "ppt-guide-sheet"); if (global.innerWidth <= 699) { const roomBelow = viewport - rect.bottom, roomAbove = rect.top; if (roomBelow >= 300) card.classList.add("ppt-guide-below"); else if (roomAbove >= 300) card.classList.add("ppt-guide-above"); else card.classList.add("ppt-guide-sheet"); } }
  function showTargetFailure(step) {
    console.warn("[GUIDED_TOUR_TARGET_TIMEOUT]", { tourId: active?.id, route: location.pathname, step: active?.index + 1, selector: step?.target, reason: "target_not_found_or_hidden" });
    const layer = document.querySelector(".ppt-guide-layer") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "ppt-guide-layer" }));
    layer.innerHTML = `<section class="ppt-guide-card ppt-guide-error" role="dialog" aria-modal="true" aria-labelledby="pptGuideTitle"><button class="ppt-guide-close" aria-label="Close guided tour">×</button><small>Step ${active.index + 1} of ${active.steps.length}</small><h2 id="pptGuideTitle">This section is still loading</h2><p>We couldn’t display “${step.title}” yet. You can retry now or go back, retry, or close the guide and continue using this page.</p><div class="ppt-guide-actions"><button data-guide="back" ${active.index === 0 ? "disabled" : ""}>Back</button><button data-guide="skip">Not now</button><button data-guide="retry">Retry</button></div></section>`;
    active.failed = true; layer.querySelector("[data-guide=retry]").focus(); return false;
  }
  async function show() {
    if (!active) return false;
    document.querySelectorAll(".ppt-guide-target").forEach(el => el.classList.remove("ppt-guide-target"));
    let step = active.steps[active.index];
    if (step?.route && !routeMatches(step.route)) { const destination = active.id === "introduction" ? "intake" : active.id; if (active.id === "introduction") await api("PATCH", { tourId: "introduction", action: "complete" }); navigateForTour(destination, step.route); remove(); return true; }
    const existingLayer = document.querySelector(".ppt-guide-layer");
    if (existingLayer) { existingLayer.querySelector("[data-guide=next]")?.setAttribute("disabled", ""); existingLayer.querySelector("#pptGuideBody")?.replaceChildren("Loading the next section…"); }
    let target = await waitForTarget(step.target);
    while (!target && step?.optional && ++active.index < active.steps.length) { step = active.steps[active.index]; target = document.querySelector(step.target); }
    if (!target) return showTargetFailure(step);
    active.failed = false;
    target.classList.add("ppt-guide-target"); target.scrollIntoView({ block: "center", behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    let layer = document.querySelector(".ppt-guide-layer"); if (!layer) { layer = document.createElement("div"); layer.className = "ppt-guide-layer"; document.body.append(layer); }
    layer.innerHTML = `<section class="ppt-guide-card" role="dialog" aria-modal="true" aria-labelledby="pptGuideTitle" aria-describedby="pptGuideBody"><button class="ppt-guide-close" aria-label="Close guided tour">×</button><small>Step ${active.index + 1} of ${active.steps.length}</small><h2 id="pptGuideTitle"></h2><p id="pptGuideBody"></p><div class="ppt-guide-actions"><button data-guide="back" ${active.index === 0 ? "disabled" : ""}>Back</button><button data-guide="skip">Not now</button><button data-guide="next">${active.index === active.steps.length - 1 ? "Finish" : "Next"}</button></div></section>`;
    layer.querySelector("h2").textContent = step.title; layer.querySelector("p").textContent = step.body; placeCard(layer.querySelector(".ppt-guide-card"), target); layer.querySelector("[data-guide=next]").focus(); return true;
  }
  async function start(id, { manual = false } = {}) { if (!tours[id] || active) return false; const readiness = await global.AuthStateRuntime?.whenReady?.(); const auth = readiness?.state || global.AuthStateRuntime?.getCanonicalAuthState?.(); if (!readiness?.ok || !auth?.isAuthenticated) { console.info("[GUIDED_TOUR_WAIT]", { tourId: id, route: location.pathname, reason: readiness?.reason || "auth_restoring" }); return false; } const route = tourRoutes[id]; if (manual && route && !routeMatches(route)) { navigateForTour(id, route); return true; } if (!manual && document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]')) return false; previousFocus = document.activeElement; const state = await api(); if (!manual && (state?.proactiveDisabled || state?.tours?.[id]?.dismissed || state?.tours?.[id]?.completedAt)) return false; active = { id, index: 0, steps: tours[id], manual }; abort = new AbortController(); global.addEventListener("resize", () => active && placeCard(document.querySelector(".ppt-guide-card"), document.querySelector(".ppt-guide-target")), { signal: abort.signal }); return show(); }
  async function showJourney() { if (active) return false; const state = await api(); const prompt = state?.nextGuidance; if (!prompt || state.proactiveDisabled || document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]')) return false; previousFocus = document.activeElement; await api("PATCH", { promptKey: prompt.key, action: "prompt" }); const layer = document.createElement("div"); layer.className = "ppt-guide-layer ppt-journey-layer"; layer.innerHTML = `<section class="ppt-guide-card ppt-journey-card" role="dialog" aria-modal="true" aria-labelledby="pptJourneyTitle"><button class="ppt-guide-close" aria-label="Close next-step guidance">×</button><small>Next Step</small><h2 id="pptJourneyTitle"></h2><p id="pptJourneyBody"></p><div class="ppt-guide-actions"><button data-prompt-dismiss>Not now</button><button data-prompt-disable>Turn off proactive guidance</button><a class="ppt-guide-primary" data-prompt-action>Open</a><button data-prompt-guide>Guide Me</button></div></section>`; layer.querySelector("h2").textContent = prompt.title; layer.querySelector("p").textContent = prompt.explanation; layer.querySelector("[data-prompt-action]").href = prompt.route; layer.dataset.promptKey = prompt.key; layer.dataset.route = prompt.route; layer.dataset.tourId = prompt.tourId; document.body.append(layer); layer.querySelector("[data-prompt-action]").focus(); return true; }
  async function openHelp() { if (active) remove(); previousFocus = document.activeElement; const state = await api(); const layer = document.createElement("div"); layer.className = "ppt-guide-layer"; layer.innerHTML = `<section class="ppt-guide-card ppt-guide-help" role="dialog" aria-modal="true" aria-labelledby="pptGuideTitle"><button class="ppt-guide-close" aria-label="Close guided tours">×</button><h2 id="pptGuideTitle">Guided Tours</h2><p>Replay a tour whenever it is useful.</p><div class="ppt-guide-list">${Object.keys(tours).map(id => `<button data-tour-id="${id}">${id.replace(/(^|-)(\w)/g, (_, a, b) => `${a ? " " : ""}${b.toUpperCase()}`)}</button>`).join("")}</div><label><input type="checkbox" data-guide-disable ${state?.proactiveDisabled ? "checked" : ""}> Don’t show proactive guidance</label></section>`; document.body.append(layer); layer.querySelector("button").focus(); }
  function pendingTour() { try { const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY)); sessionStorage.removeItem(PENDING_KEY); return pending?.expiresAt > Date.now() ? pending.id : null; } catch (_) { return null; } }
  async function autoOrchestrate() { if (autoAttempted) return; autoAttempted = true; const readiness = await global.AuthStateRuntime?.whenReady?.(); const auth = readiness?.state || global.AuthStateRuntime?.getCanonicalAuthState?.(); if (!auth?.token) return; const pending = pendingTour(); if (pending) { await start(pending, { manual: true }); return; } const state = await api(), isHome = /dashboard\.html$/.test(location.pathname) || location.pathname === "/" || /index\.html$/.test(location.pathname); if (isHome && !state?.proactiveDisabled && !state?.tours?.introduction?.dismissed && !state?.tours?.introduction?.completedAt) { await start("introduction"); return; } const context = contexts.find(item => item.match.test(location.pathname)); if (context) await start(context.tourId); }
  function handleLivePerformanceMode(event) { if (event.detail?.active) remove(); }
  function initialize() { if (listeners) return; listeners = true;
    global.addEventListener("pocketpt:live-performance-mode", handleLivePerformanceMode);
    document.addEventListener("keydown", event => { const layer = document.querySelector(".ppt-guide-layer"); if (!layer) return; if (event.key === "Escape") { event.preventDefault(); active ? finish("dismiss") : remove(); return; } if (event.key === "Tab") { const items = focusables(layer); if (!items.length) return; const first = items[0], last = items.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
    document.addEventListener("click", async event => { const layer = event.target.closest(".ppt-guide-layer"); if (event.target.closest(".ppt-guide-close")) { active ? await finish("dismiss") : remove(); return; } const action = event.target.closest("[data-guide]")?.dataset.guide; if (action === "back" && active) { active.index--; await show(); } if (action === "next" && active) { if (active.index === active.steps.length - 1) await finish("complete"); else { active.index++; await show(); } } if (action === "retry" && active) await show(); if (action === "skip") await finish("dismiss"); const id = event.target.closest("[data-tour-id]")?.dataset.tourId; if (id) { remove(); start(id, { manual: true }); } if (event.target.closest("[data-pocketpt-guides]")) openHelp(); if (event.target.closest("[data-prompt-dismiss]")) { await api("PATCH", { promptKey: layer.dataset.promptKey, action: "dismiss-prompt" }); remove(); } if (event.target.closest("[data-prompt-disable]")) { await api("PATCH", { proactiveDisabled: true }); remove(); } if (event.target.closest("[data-prompt-guide]")) { const id = layer.dataset.tourId, route = layer.dataset.route; remove(); if (route && !routeMatches(route)) navigateForTour(id, route); else start(id, { manual: true }); } });
    document.addEventListener("change", event => { if (event.target.matches("[data-guide-disable]")) api("PATCH", { proactiveDisabled: event.target.checked }); }); global.addEventListener("pocketpt:guide-context", event => { const id = event.detail?.tourId; if (id && !active) start(id, { manual: Boolean(event.detail?.manual) }); }); autoOrchestrate();
  }
  global.PocketPTGuide = { initialize, start, showJourney, openHelp, dispose: remove, waitForTarget, tours, tourRoutes, contexts, get active() { return active; } }; initialize();
})(window);
