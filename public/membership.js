(function initMembershipPage(globalScope) {
  "use strict";

  const global = globalScope || window;
  const STRIPE_JS_SRC = "https://js.stripe.com/v3/";
  const state = { embeddedCheckout: null, mounted: false, plan: null, pendingTrialEnd: null };

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

  function formatDateTime(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return "the displayed trial-end date and time";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZoneName: "short" }).format(new Date(numeric));
  }

  function trialDisclosure(trialEnd) {
    const price = state.plan?.priceLabel || "the monthly price shown above";
    return `7-day free trial. Payment method required. Cancel before ${formatDateTime(trialEnd)} to avoid the first monthly charge. After the trial, membership renews monthly until canceled. Monthly price: ${price}.`;
  }

  function renderTrialDates(trialEnd) {
    if (!trialEnd) return;
    setText("trialEndTimestamp", formatDateTime(trialEnd));
    setText("firstBillingDate", formatDateTime(trialEnd));
    setText("trialDisclosure", trialDisclosure(trialEnd));
  }

  async function loadPlan() {
    try {
      const plan = await requestJSON("/api/billing/plan", { auth: false });
      state.plan = plan || {};
      setText("planName", plan?.name || "Pocket PT Monthly Membership");
      setText("planPrice", plan?.priceLabel || "Official price shown in secure Stripe checkout");
      setText("planInterval", plan?.interval ? `/ ${plan.interval}` : "/ month");
      setText("recurringDisclosure", `${plan?.trialDisclosure || "7-day free trial. Payment method required. Cancel before the displayed trial-end date and time to avoid the first monthly charge. After the trial, membership renews monthly until canceled."} Stripe securely collects payment credentials; Pocket PT never collects raw card numbers, CVC, or expiration dates.`);
      setText("trialDisclosure", plan?.trialDisclosure || trialDisclosure(null));
    } catch (_) {
      setText("planPrice", "Official price shown in secure Stripe checkout");
      setText("trialDisclosure", trialDisclosure(null));
    }
  }

  async function loadMembership() {
    return requestJSON("/api/me/membership");
  }

  function renderMembership(membership) {
    if (!membership) return;
    if (membership.trialEnd) renderTrialDates(membership.trialEnd);
    if (membership.trialReminder?.message) setText("trialReminder", membership.trialReminder.message);
    if (membership.hasAccess) {
      const label = membership.status === "trialing" ? `Trialing until ${formatDateTime(membership.trialEnd)}. No charge today; first billing is scheduled when the trial ends.` : "Membership active. You can continue to the dashboard.";
      setStatus(label, "success");
      show("alreadySubscribed", true);
      show("checkoutShell", false);
      return;
    }
    if (membership.entitlement?.duplicateProtected) {
      const statusMessage = membership.status === "past_due" ? "Payment failed or is past due. Manage billing to restore access." : `Subscription status: ${membership.status}. Manage billing to resolve it.`;
      setStatus(statusMessage, "warn");
      show("alreadySubscribed", true);
      show("checkoutShell", false);
    }
  }

  async function mountCheckout() {
    if (state.mounted) return;
    const key = publishableKey();
    if (!key) {
      setStatus("Stripe publishable key is not configured for this frontend build.", "error");
      return;
    }
    const stripeLoaded = await ensureStripeJs();
    if (!stripeLoaded || typeof global.Stripe !== "function") throw new Error("stripe_js_unavailable");

    const session = await requestJSON("/api/billing/checkout-session", { method: "POST", body: {} });
    if (session?.trialEnd) {
      state.pendingTrialEnd = session.trialEnd;
      renderTrialDates(session.trialEnd);
    }
    if (session?.duplicateProtected) {
      renderMembership(session.membership);
      return;
    }
    if (!session?.clientSecret) throw new Error("embedded_checkout_client_secret_missing");

    const stripe = global.Stripe(key);
    state.embeddedCheckout = await stripe.initEmbeddedCheckout({ clientSecret: session.clientSecret });
    state.embeddedCheckout.mount("#embedded-checkout");
    state.mounted = true;
    setStatus("Start your 7-day free trial below. No charge today; Stripe securely collects the required payment method.");
  }

  async function refreshAndMaybeMount() {
    show("alreadySubscribed", false);
    show("successPanel", false);
    show("checkoutShell", true);
    setStatus("Checking account and membership status…");
    const membership = await loadMembership();
    renderMembership(membership);
    if (!membership?.hasAccess && !membership?.entitlement?.duplicateProtected) await mountCheckout();
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
    await loadPlan();
    $("manageBillingBtn")?.addEventListener("click", manageBilling);
    $("refreshStatusBtn")?.addEventListener("click", refreshAndMaybeMount);
    if (new URLSearchParams(global.location.search).get("checkout") === "return") show("successPanel", true);
    try {
      await refreshAndMaybeMount();
    } catch (err) {
      if (err?.code === "MISSING_AUTH_TOKEN" || err?.status === 401) {
        setStatus("Please log in or create a Pocket PT account before starting membership checkout.", "warn");
        show("checkoutShell", false);
        return;
      }
      setStatus("Membership checkout could not be initialized safely. Please try again later.", "error");
      show("checkoutShell", false);
    }
  }

  global.PocketPTMembership = { boot, publishableKey, backendOrigin };
  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
