(function initMembershipPage(globalScope) {
  "use strict";

  const global = globalScope || window;
  const STRIPE_JS_SRC = "https://js.stripe.com/v3/";
  const state = {
    embeddedCheckout: null,
    mounted: false,
    activeCheckoutPlanId: null,
    plans: [],
    selectedPlanId: null,
    membership: null,
    membershipTier: null,
    pendingTrialEnd: null,
    catalog: null
  };

  function $(id) { return global.document.getElementById(id); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function show(id, visible) { const el = $(id); if (el) el.classList.toggle("hidden", !visible); }
  function setStatus(message, tone) {
    const el = $("membershipStatus");
    if (!el) return;
    el.textContent = message;
    if (tone) el.dataset.tone = tone;
    else delete el.dataset.tone;
  }

  function backendOrigin() {
    return global.RuntimeState?.getBackendOrigin?.() || global.__MAAT_RUNTIME_CONFIG?.backendOrigin || global.location.origin;
  }

  function authToken() {
    return global.AuthStateRuntime?.getAuthToken?.() || global.APP_AUTH?.token || global.localStorage?.getItem?.("maatAuthToken") || null;
  }

  function publishableKey() {
    return global.STRIPE_PUBLISHABLE_KEY || global.VITE_STRIPE_PUBLISHABLE_KEY || global.__MAAT_RUNTIME_CONFIG?.stripePublishableKey || global.__STRIPE_PUBLISHABLE_KEY__ || "";
  }

  async function ensureStripeJs() {
    if (typeof global.Stripe === "function") return true;
    if (typeof global.__loadExternalScript === "function") {
      await global.__loadExternalScript(STRIPE_JS_SRC, { async: false, defer: false });
      return typeof global.Stripe === "function";
    }
    return new Promise((resolve, reject) => {
      const existing = Array.from(global.document.scripts || []).find((script) => script.src === STRIPE_JS_SRC);
      if (existing) {
        existing.addEventListener("load", () => resolve(typeof global.Stripe === "function"), { once: true });
        existing.addEventListener("error", () => reject(new Error("stripe_js_load_failed")), { once: true });
        return;
      }
      const script = global.document.createElement("script");
      script.src = STRIPE_JS_SRC;
      script.async = false;
      script.onload = () => resolve(typeof global.Stripe === "function");
      script.onerror = () => reject(new Error("stripe_js_load_failed"));
      global.document.head.appendChild(script);
    });
  }

  async function requestJSON(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = authToken();
    if (options.auth !== false) {
      if (!token) {
        const err = new Error("missing_auth_token");
        err.code = "MISSING_AUTH_TOKEN";
        throw err;
      }
      headers.authorization = `Bearer ${token}`;
    }
    if (options.body) headers["Content-Type"] = "application/json";
    const res = await global.fetch(`${backendOrigin()}${path}`, {
      method: options.method || "GET",
      headers,
      cache: "no-store",
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) {
      const err = new Error(payload?.error?.message || `request_failed_${res.status}`);
      err.status = res.status;
      err.code = payload?.error?.code || "REQUEST_FAILED";
      err.payload = payload;
      throw err;
    }
    return payload?.data || null;
  }

  function planById(planId) {
    return state.plans.find((plan) => plan.id === planId) || null;
  }

  function formatDateTime(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return "the displayed trial-end date and time";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZoneName: "short" }).format(new Date(numeric));
  }

  function trialDisclosure(trialEnd) {
    const plan = planById(state.selectedPlanId);
    const price = plan?.priceLabel || "the selected monthly price";
    return `7-day free trial. Payment method required. Cancel before ${formatDateTime(trialEnd)} to avoid the first monthly charge. After the trial, ${plan?.name || "your membership"} renews monthly at ${price} until canceled.`;
  }

  function renderTrialDates(trialEnd) {
    if (!trialEnd) return;
    setText("trialEndTimestamp", formatDateTime(trialEnd));
    setText("firstBillingDate", formatDateTime(trialEnd));
    setText("trialDisclosure", trialDisclosure(trialEnd));
  }

  function clearNode(node) {
    while (node?.firstChild) node.removeChild(node.firstChild);
  }

  function createTextElement(tag, className, text) {
    const el = global.document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    return el;
  }

  function renderPlans() {
    const grid = $("planGrid");
    if (!grid) return;
    clearNode(grid);

    for (const plan of state.plans) {
      const card = global.document.createElement("article");
      card.className = "plan";
      card.dataset.planId = plan.id;
      card.dataset.selected = String(plan.id === state.selectedPlanId);
      card.dataset.recommended = String(plan.recommended === true);

      if (plan.recommended) card.appendChild(createTextElement("span", "plan-badge", "Best value"));
      card.appendChild(createTextElement("h2", "", plan.name));
      card.appendChild(createTextElement("p", "tagline", plan.tagline));

      const price = global.document.createElement("div");
      price.className = "price";
      price.appendChild(createTextElement("strong", "", plan.priceLabel));
      price.appendChild(createTextElement("span", "", "/ month"));
      card.appendChild(price);

      const benefits = global.document.createElement("ul");
      benefits.className = "benefits";
      for (const benefit of Array.isArray(plan.benefits) ? plan.benefits : []) {
        benefits.appendChild(createTextElement("li", "", benefit));
      }
      card.appendChild(benefits);

      for (const note of Array.isArray(plan.capabilityNotes) ? plan.capabilityNotes : []) {
        card.appendChild(createTextElement("p", "plan-note", note));
      }

      if (!plan.checkoutConfigured) {
        card.appendChild(createTextElement("p", "unavailable", "Checkout setup pending"));
      }

      const button = createTextElement("button", `btn choose ${plan.id === state.selectedPlanId ? "primary" : ""}`.trim(), plan.id === state.selectedPlanId ? "Selected" : `Choose ${plan.shortName}`);
      button.type = "button";
      button.dataset.selectPlan = plan.id;
      button.setAttribute("aria-pressed", String(plan.id === state.selectedPlanId));
      card.appendChild(button);
      grid.appendChild(card);
    }
  }

  async function destroyCheckout() {
    if (state.embeddedCheckout && typeof state.embeddedCheckout.destroy === "function") {
      try { state.embeddedCheckout.destroy(); } catch (_) {}
    }
    state.embeddedCheckout = null;
    state.mounted = false;
    state.activeCheckoutPlanId = null;
    const mount = $("embedded-checkout");
    if (mount) clearNode(mount);
    show("checkoutShell", false);
  }

  function renderSelectedPlan() {
    const plan = planById(state.selectedPlanId);
    if (!plan) return;
    setText("selectedPlanName", plan.name);
    setText("selectedPlanPrice", plan.priceLabel);
    setText("selectedPlanTagline", plan.tagline);
    setText("trialDisclosure", trialDisclosure(state.pendingTrialEnd));

    const start = $("startCheckoutBtn");
    if (start) {
      const blockedByMembership = Boolean(state.membership?.hasAccess || state.membership?.entitlement?.duplicateProtected);
      start.disabled = !plan.checkoutConfigured || blockedByMembership;
      start.textContent = !plan.checkoutConfigured
        ? "Checkout setup pending"
        : (blockedByMembership ? "Manage current membership" : "Start 7-day free trial");
    }
  }

  async function selectPlan(planId, options = {}) {
    const plan = planById(planId);
    if (!plan) return false;
    if (state.activeCheckoutPlanId && state.activeCheckoutPlanId !== plan.id) await destroyCheckout();
    state.selectedPlanId = plan.id;

    if (options.updateUrl !== false) {
      const url = new URL(global.location.href);
      url.searchParams.set("plan", plan.id);
      global.history.replaceState(null, global.document.title, `${url.pathname}${url.search}${url.hash}`);
    }

    renderPlans();
    renderSelectedPlan();
    if (!plan.checkoutConfigured) setStatus(`${plan.name} is defined, but its Stripe checkout price has not been configured yet.`, "warn");
    else if (!state.membership?.hasAccess && !state.membership?.entitlement?.duplicateProtected) setStatus(`${plan.name} selected. Start your free trial when you're ready.`);
    return true;
  }

  async function loadCatalog() {
    const catalog = await requestJSON("/api/billing/plans", { auth: false });
    const plans = Array.isArray(catalog?.plans) ? catalog.plans : [];
    if (plans.length !== 3) throw new Error("membership_plan_catalog_invalid");
    state.catalog = catalog;
    state.plans = plans;
    const requested = new URLSearchParams(global.location.search).get("plan");
    const validRequested = planById(requested) ? requested : null;
    state.selectedPlanId = validRequested || catalog.defaultPlanId || plans[0].id;
    renderPlans();
    renderSelectedPlan();
  }

  async function loadMembership() {
    return requestJSON("/api/me/membership");
  }

  async function loadMembershipTier() {
    try { return await requestJSON("/api/me/membership-tier"); }
    catch (_) { return null; }
  }

  function renderMembership(membership, tier = state.membershipTier) {
    state.membership = membership || null;
    state.membershipTier = tier || null;
    if (!membership) return;
    if (membership.trialEnd) renderTrialDates(membership.trialEnd);
    if (membership.trialReminder?.message) setText("trialReminder", membership.trialReminder.message);

    const currentPlan = tier?.planId ? planById(tier.planId) : null;
    if (membership.status && membership.status !== "inactive") {
      show("currentMembership", true);
      setText("currentMembershipText", `${currentPlan?.name || "Current PocketPT membership"} · ${membership.status}${tier?.legacyOrUnmapped ? " · legacy/unmapped Stripe price" : ""}`);
    } else {
      show("currentMembership", false);
    }

    if (membership.hasAccess) {
      const label = membership.status === "trialing"
        ? `${currentPlan?.name || "Membership"} trialing until ${formatDateTime(membership.trialEnd)}. No charge today; first billing is scheduled when the trial ends.`
        : `${currentPlan?.name || "Membership"} active. Manage billing or continue to the dashboard.`;
      setStatus(label, "success");
      show("alreadySubscribed", true);
      show("checkoutShell", false);
    } else if (membership.entitlement?.duplicateProtected) {
      const statusMessage = membership.status === "past_due"
        ? "Payment failed or is past due. Manage billing to restore access."
        : `Subscription status: ${membership.status}. Manage billing to resolve it.`;
      setStatus(statusMessage, "warn");
      show("alreadySubscribed", true);
      show("checkoutShell", false);
    }
    renderSelectedPlan();
  }

  async function mountCheckout() {
    const plan = planById(state.selectedPlanId);
    if (!plan) throw new Error("membership_plan_not_selected");
    if (!plan.checkoutConfigured) {
      setStatus(`${plan.name} checkout is not configured yet.`, "warn");
      return;
    }
    if (state.membership?.hasAccess || state.membership?.entitlement?.duplicateProtected) {
      renderMembership(state.membership, state.membershipTier);
      return;
    }
    if (state.mounted && state.activeCheckoutPlanId === plan.id) {
      show("checkoutShell", true);
      return;
    }
    if (state.mounted) await destroyCheckout();

    const key = publishableKey();
    if (!key) {
      setStatus("Stripe publishable key is not configured for this frontend build.", "error");
      return;
    }
    const stripeLoaded = await ensureStripeJs();
    if (!stripeLoaded || typeof global.Stripe !== "function") throw new Error("stripe_js_unavailable");

    const startButton = $("startCheckoutBtn");
    if (startButton) { startButton.disabled = true; startButton.textContent = "Preparing secure checkout…"; }
    setStatus(`Preparing secure ${plan.name} checkout…`);

    const session = await requestJSON("/api/billing/tier-checkout-session", {
      method: "POST",
      body: { planId: plan.id }
    });

    if (session?.duplicateProtected) {
      renderMembership(session.membership, await loadMembershipTier());
      return;
    }
    if (session?.selectedPlanId !== plan.id) throw new Error("membership_plan_checkout_mismatch");
    if (!session?.clientSecret) throw new Error("embedded_checkout_client_secret_missing");

    if (session?.trialEnd) {
      state.pendingTrialEnd = session.trialEnd;
      renderTrialDates(session.trialEnd);
    }

    const stripe = global.Stripe(key);
    state.embeddedCheckout = await stripe.initEmbeddedCheckout({ clientSecret: session.clientSecret });
    state.embeddedCheckout.mount("#embedded-checkout");
    state.mounted = true;
    state.activeCheckoutPlanId = plan.id;
    show("checkoutShell", true);
    setStatus(`${plan.name} secure checkout is ready. No charge today; your 7-day trial begins through Stripe.`);
    renderSelectedPlan();
  }

  async function refreshMembership() {
    show("alreadySubscribed", false);
    const [membership, tier] = await Promise.all([loadMembership(), loadMembershipTier()]);
    renderMembership(membership, tier);
    return membership;
  }

  async function manageBilling() {
    try {
      setStatus("Opening secure Stripe billing portal…");
      const portal = await requestJSON("/api/billing/portal-session", { method: "POST", body: {} });
      if (!portal?.url) throw new Error("portal_url_missing");
      global.location.assign(portal.url);
    } catch (err) {
      setStatus(err?.code === "BILLING_CUSTOMER_MISSING" ? "No Stripe customer is linked to this account yet." : "Unable to open billing portal. Try again shortly.", "error");
    }
  }

  async function boot() {
    try {
      await loadCatalog();
    } catch (_) {
      setStatus("PocketPT membership plans could not be loaded safely. Please try again later.", "error");
      return;
    }

    $("planGrid")?.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-select-plan]");
      if (!button) return;
      selectPlan(button.dataset.selectPlan).catch(() => setStatus("Unable to change membership selection.", "error"));
    });
    $("startCheckoutBtn")?.addEventListener("click", () => mountCheckout().catch(() => {
      setStatus("Membership checkout could not be initialized safely. Please try again later.", "error");
      renderSelectedPlan();
    }));
    $("manageBillingBtn")?.addEventListener("click", manageBilling);
    $("refreshStatusBtn")?.addEventListener("click", () => refreshMembership().catch(() => setStatus("Unable to refresh membership status.", "error")));

    if (new URLSearchParams(global.location.search).get("checkout") === "return") show("successPanel", true);

    try {
      await refreshMembership();
      if (!state.membership?.hasAccess && !state.membership?.entitlement?.duplicateProtected) {
        const selected = planById(state.selectedPlanId);
        setStatus(selected?.checkoutConfigured
          ? `${selected.name} selected. Start your 7-day free trial when you're ready.`
          : `${selected?.name || "Selected membership"} is defined, but Stripe checkout setup is still pending.`,
        selected?.checkoutConfigured ? null : "warn");
      }
    } catch (err) {
      if (err?.code === "MISSING_AUTH_TOKEN" || err?.status === 401) {
        setStatus("Choose a plan now. Log in or create a PocketPT account before starting checkout.", "warn");
        renderSelectedPlan();
        return;
      }
      setStatus("Membership status could not be loaded safely. Please try again later.", "error");
    }
  }

  global.PocketPTMembership = {
    boot,
    selectPlan,
    mountCheckout,
    publishableKey,
    backendOrigin,
    getState: () => ({
      plans: state.plans.map((plan) => ({ ...plan })),
      selectedPlanId: state.selectedPlanId,
      activeCheckoutPlanId: state.activeCheckoutPlanId,
      mounted: state.mounted
    })
  };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
