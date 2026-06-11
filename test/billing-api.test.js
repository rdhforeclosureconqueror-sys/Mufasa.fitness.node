"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server");

async function withServer(t, { stripeClient = null } = {}, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-billing-test-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");

  const app = createApp({ rootDir: tmpRoot, stripeClient });
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => server.close());
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return fn({ baseUrl, tmpRoot });
}

function setEnv(t, values) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] == null) delete process.env[key];
    else process.env[key] = values[key];
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function enableTestLoginFixture(t) {
  setEnv(t, { PILOT_LOGIN_PASSWORD: "top-secret", NODE_ENV: "test", AUTH_TEST_LOGIN_FIXTURE_ENABLED: "true" });
}

async function post(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function get(baseUrl, route, headers = {}) {
  const res = await fetch(baseUrl + route, { method: "GET", headers });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function loginFixtureToken(baseUrl, testUserId) {
  const { res, json } = await post(baseUrl, "/api/auth/login", {
    email: `${testUserId}@example.test`,
    password: "top-secret",
    testUserId
  });
  assert.equal(res.status, 200);
  assert.equal(json?.ok, true);
  assert.ok(json?.token);
  return json.token;
}

function stripeSignature(payload, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function baseBillingEnv(t) {
  setEnv(t, {
    STRIPE_SECRET_KEY: "sk_test_server_secret",
    STRIPE_PRICE_ID: "price_server_only",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    FRONTEND_PUBLIC_URL: "https://mufasafitsite.onrender.com",
    MEMBERSHIP_PRICE_LABEL: "$29 / month",
    NODE_ENV: "test",
    MEMBERSHIP_GATE_TEST_ENFORCED: "true"
  });
}

test("unauthenticated GET /api/me/membership returns 401", async (t) => {
  await withServer(t, {}, async ({ baseUrl }) => {
    const { res, json } = await get(baseUrl, "/api/me/membership");
    assert.equal(res.status, 401);
    assert.equal(json?.ok, false);
    assert.equal(json?.error?.code, "UNAUTHENTICATED");
  });
});

test("authenticated GET /api/me/membership returns inactive/free when no membership exists", async (t) => {
  enableTestLoginFixture(t);
  await withServer(t, {}, async ({ baseUrl }) => {
    const token = await loginFixtureToken(baseUrl, "billing_free_user");
    const { res, json } = await get(baseUrl, "/api/me/membership", { authorization: `Bearer ${token}` });
    assert.equal(res.status, 200);
    assert.equal(json?.ok, true);
    assert.equal(json?.data?.userId, "billing_free_user");
    assert.equal(json?.data?.status, "inactive");
    assert.equal(json?.data?.plan, "free");
    assert.equal(json?.data?.stripeCustomerId, null);
    assert.equal(json?.data?.stripeSubscriptionId, null);
    assert.equal(json?.data?.stripePriceId, null);
    assert.equal(json?.data?.cancelAtPeriodEnd, false);
    assert.equal(json?.data?.lastInvoiceStatus, null);
    assert.equal(json?.data?.hasAccess, false);
  });
});

test("public billing plan returns backend configured official price label", async (t) => {
  baseBillingEnv(t);
  await withServer(t, {}, async ({ baseUrl }) => {
    const { res, json } = await get(baseUrl, "/api/billing/plan");
    assert.equal(res.status, 200);
    assert.equal(json?.data?.name, "Pocket PT Monthly Membership");
    assert.equal(json?.data?.priceLabel, "$29 / month");
    assert.equal(json?.data?.interval, "month");
  });
});

test("unauthenticated POST /api/billing/checkout-session returns 401", async (t) => {
  await withServer(t, {}, async ({ baseUrl }) => {
    const { res, json } = await post(baseUrl, "/api/billing/checkout-session", {});
    assert.equal(res.status, 401);
    assert.equal(json?.ok, false);
    assert.equal(json?.error?.code, "UNAUTHENTICATED");
  });
});

test("embedded checkout creation rejects when Stripe env is missing", async (t) => {
  enableTestLoginFixture(t);
  setEnv(t, { STRIPE_SECRET_KEY: null, STRIPE_PRICE_ID: null, FRONTEND_PUBLIC_URL: "https://pilot.example.test" });
  let called = false;
  const stripeClient = {
    async createCustomer() { called = true; return { id: "cus_should_not_be_called" }; },
    async createCheckoutSession() { called = true; return { id: "cs_should_not_be_called", client_secret: "cs_secret" }; }
  };
  await withServer(t, { stripeClient }, async ({ baseUrl }) => {
    const token = await loginFixtureToken(baseUrl, "billing_missing_env_user");
    const { res, json } = await post(baseUrl, "/api/billing/checkout-session", {}, { authorization: `Bearer ${token}` });
    assert.equal(res.status, 503);
    assert.equal(json?.ok, false);
    assert.equal(json?.error?.code, "BILLING_CONFIG_MISSING");
    assert.equal(called, false);
  });
});

test("embedded checkout uses server-side STRIPE_PRICE_ID and returns only client secret", async (t) => {
  enableTestLoginFixture(t);
  baseBillingEnv(t);
  let observedCustomer = null;
  let observedCheckout = null;
  const stripeClient = {
    async createCustomer(args) { observedCustomer = args; return { id: "cus_test_123" }; },
    async createCheckoutSession(args) { observedCheckout = args; return { id: "cs_test_123", client_secret: "cs_test_secret_123", url: "https://stripe.example/should-not-return" }; }
  };
  await withServer(t, { stripeClient }, async ({ baseUrl, tmpRoot }) => {
    const token = await loginFixtureToken(baseUrl, "billing_checkout_user");
    const { res, json } = await post(baseUrl, "/api/billing/checkout-session", { priceId: "price_attacker_supplied" }, { authorization: `Bearer ${token}` });
    assert.equal(res.status, 201);
    assert.equal(json?.ok, true);
    assert.equal(json?.data?.id, undefined);
    assert.equal(json?.data?.clientSecret, "cs_test_secret_123");
    assert.equal(json?.data?.url, undefined);
    assert.equal(observedCheckout.priceId, "price_server_only");
    assert.equal(observedCheckout.userId, "billing_checkout_user");
    assert.equal(observedCheckout.returnUrl, "https://mufasafitsite.onrender.com/membership.html?checkout=return");
    assert.equal(observedCheckout.customerId, "cus_test_123");
    assert.equal(observedCustomer.email, "billing_checkout_user@example.test");
  });
});

test("checkout route rejects raw payment credential fields before contacting Stripe", async (t) => {
  enableTestLoginFixture(t);
  baseBillingEnv(t);
  let called = false;
  const stripeClient = {
    async createCustomer() { called = true; return { id: "cus_forbidden" }; },
    async createCheckoutSession() { called = true; return { client_secret: "should_not_happen" }; }
  };
  await withServer(t, { stripeClient }, async ({ baseUrl }) => {
    const token = await loginFixtureToken(baseUrl, "billing_raw_card_user");
    const { res, json } = await post(baseUrl, "/api/billing/checkout-session", { card: { number: "4242424242424242", cvc: "123" } }, { authorization: `Bearer ${token}` });
    assert.equal(res.status, 400);
    assert.equal(json?.error?.code, "RAW_PAYMENT_DETAILS_FORBIDDEN");
    assert.equal(called, false);
  });
});

test("legacy checkout route now serves embedded checkout without redirect url", async (t) => {
  enableTestLoginFixture(t);
  baseBillingEnv(t);
  const stripeClient = {
    async createCustomer() { return { id: "cus_legacy_123" }; },
    async createCheckoutSession() { return { id: "cs_legacy_123", client_secret: "cs_legacy_secret" }; }
  };
  await withServer(t, { stripeClient }, async ({ baseUrl }) => {
    const token = await loginFixtureToken(baseUrl, "billing_legacy_user");
    const { res, json } = await post(baseUrl, "/api/billing/create-checkout-session", {}, { authorization: `Bearer ${token}` });
    assert.equal(res.status, 201);
    assert.equal(json?.data?.clientSecret, "cs_legacy_secret");
    assert.equal(json?.data?.url, undefined);
  });
});

test("duplicate subscriptions are prevented for active, trialing, past_due, and incomplete statuses", async (t) => {
  enableTestLoginFixture(t);
  baseBillingEnv(t);
  let checkoutCalls = 0;
  const stripeClient = {
    async createCustomer() { return { id: "cus_duplicate" }; },
    async createCheckoutSession() { checkoutCalls += 1; return { id: "cs_duplicate", client_secret: "secret" }; }
  };
  await withServer(t, { stripeClient }, async ({ baseUrl, tmpRoot }) => {
    const statuses = ["active", "trialing", "past_due", "incomplete"];
    for (const status of statuses) {
      const userId = `billing_dup_${status}`;
      const token = await loginFixtureToken(baseUrl, userId);
      const userPath = path.join(tmpRoot, "data", "users", `${userId}.json`);
      fs.mkdirSync(path.dirname(userPath), { recursive: true });
      const user = fs.existsSync(userPath) ? JSON.parse(fs.readFileSync(userPath, "utf8")) : { userId };
      user.membership = { userId, status, plan: "stripe_embedded_subscription", stripeCustomerId: `cus_${status}`, stripeSubscriptionId: `sub_${status}`, updatedAt: Date.now() };
      fs.writeFileSync(userPath, JSON.stringify(user, null, 2));
      const { res, json } = await post(baseUrl, "/api/billing/checkout-session", {}, { authorization: `Bearer ${token}` });
      assert.equal(res.status, 200);
      assert.equal(json?.data?.duplicateProtected, true);
      assert.equal(json?.data?.membership?.status, status);
    }
    assert.equal(checkoutCalls, 0);
  });
});

test("portal sessions require auth and use only authenticated user's stored Stripe customer", async (t) => {
  enableTestLoginFixture(t);
  baseBillingEnv(t);
  let observedPortal = null;
  const stripeClient = {
    async createPortalSession(args) { observedPortal = args; return { url: "https://billing.stripe.com/session/test" }; }
  };
  await withServer(t, { stripeClient }, async ({ baseUrl, tmpRoot }) => {
    const unauth = await post(baseUrl, "/api/billing/portal-session", { customerId: "cus_attacker" });
    assert.equal(unauth.res.status, 401);

    const token = await loginFixtureToken(baseUrl, "billing_portal_user");
    const userPath = path.join(tmpRoot, "data", "users", "billing_portal_user.json");
    fs.mkdirSync(path.dirname(userPath), { recursive: true });
    const user = fs.existsSync(userPath) ? JSON.parse(fs.readFileSync(userPath, "utf8")) : { userId: "billing_portal_user" };
    user.membership = { userId: "billing_portal_user", status: "active", stripeCustomerId: "cus_real_user", stripeSubscriptionId: "sub_real", updatedAt: Date.now() };
    fs.writeFileSync(userPath, JSON.stringify(user, null, 2));

    const { res, json } = await post(baseUrl, "/api/billing/portal-session", { customerId: "cus_attacker" }, { authorization: `Bearer ${token}` });
    assert.equal(res.status, 201);
    assert.equal(json?.data?.url, "https://billing.stripe.com/session/test");
    assert.equal(observedPortal.customerId, "cus_real_user");
    assert.equal(observedPortal.returnUrl, "https://mufasafitsite.onrender.com/membership.html?checkout=return");
  });
});

test("webhook rejects invalid or missing Stripe signature", async (t) => {
  setEnv(t, { STRIPE_SECRET_KEY: "sk_test_webhook", STRIPE_WEBHOOK_SECRET: "whsec_test_secret" });
  await withServer(t, {}, async ({ baseUrl }) => {
    const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });
    const missing = await post(baseUrl, "/api/billing/webhook", payload);
    assert.equal(missing.res.status, 400);
    assert.equal(missing.json?.error?.code, "STRIPE_WEBHOOK_SIGNATURE_INVALID");
    const invalid = await post(baseUrl, "/api/billing/webhook", payload, { "stripe-signature": "t=123,v1=bad" });
    assert.equal(invalid.res.status, 400);
    assert.equal(invalid.json?.error?.code, "STRIPE_WEBHOOK_SIGNATURE_INVALID");
  });
});

test("frontend success alone cannot activate membership", async (t) => {
  enableTestLoginFixture(t);
  await withServer(t, {}, async ({ baseUrl }) => {
    const token = await loginFixtureToken(baseUrl, "billing_frontend_success_user");
    const { res, json } = await get(baseUrl, "/api/me/membership?checkout=return", { authorization: `Bearer ${token}` });
    assert.equal(res.status, 200);
    assert.equal(json?.data?.status, "inactive");
    assert.equal(json?.data?.hasAccess, false);
  });
});

test("signed webhooks update subscription state, invoice state, cancellation, and are idempotent", async (t) => {
  enableTestLoginFixture(t);
  setEnv(t, { STRIPE_SECRET_KEY: "sk_test_webhook", STRIPE_WEBHOOK_SECRET: "whsec_test_secret" });
  await withServer(t, {}, async ({ baseUrl, tmpRoot }) => {
    await loginFixtureToken(baseUrl, "billing_webhook_user");
    const completedPayload = JSON.stringify({
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      data: { object: { customer: "cus_test_123", subscription: "sub_test_123", client_reference_id: "billing_webhook_user", payment_status: "paid", metadata: { userId: "billing_webhook_user" } } }
    });
    const completed = await post(baseUrl, "/api/billing/webhook", completedPayload, { "stripe-signature": stripeSignature(completedPayload, "whsec_test_secret") });
    assert.equal(completed.res.status, 200);
    assert.equal(completed.json?.data?.membership?.status, "active");

    const duplicate = await post(baseUrl, "/api/billing/webhook", completedPayload, { "stripe-signature": stripeSignature(completedPayload, "whsec_test_secret") });
    assert.equal(duplicate.res.status, 200);
    assert.equal(duplicate.json?.data?.duplicate, true);

    const updatedPayload = JSON.stringify({
      id: "evt_subscription_updated",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_test_123", customer: "cus_test_123", status: "trialing", current_period_end: 1770000000, cancel_at_period_end: true, metadata: { userId: "billing_webhook_user" }, items: { data: [{ price: { id: "price_server_only" } }] } } }
    });
    await post(baseUrl, "/api/billing/webhook", updatedPayload, { "stripe-signature": stripeSignature(updatedPayload, "whsec_test_secret") });

    const failedPayload = JSON.stringify({
      id: "evt_invoice_failed",
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_test_123", subscription: "sub_test_123" } }
    });
    await post(baseUrl, "/api/billing/webhook", failedPayload, { "stripe-signature": stripeSignature(failedPayload, "whsec_test_secret") });

    let user = JSON.parse(fs.readFileSync(path.join(tmpRoot, "data", "users", "billing_webhook_user.json"), "utf8"));
    assert.equal(user.membership.status, "past_due");
    assert.equal(user.membership.lastInvoiceStatus, "payment_failed");
    assert.equal(user.membership.cancelAtPeriodEnd, true);
    assert.equal(user.membership.stripePriceId, "price_server_only");
    assert.equal(user.membership.currentPeriodEnd, 1770000000000);

    const paidPayload = JSON.stringify({
      id: "evt_invoice_paid",
      type: "invoice.paid",
      data: { object: { customer: "cus_test_123", subscription: "sub_test_123", lines: { data: [{ price: { id: "price_server_only" } }] } } }
    });
    await post(baseUrl, "/api/billing/webhook", paidPayload, { "stripe-signature": stripeSignature(paidPayload, "whsec_test_secret") });
    user = JSON.parse(fs.readFileSync(path.join(tmpRoot, "data", "users", "billing_webhook_user.json"), "utf8"));
    assert.equal(user.membership.status, "active");
    assert.equal(user.membership.lastInvoiceStatus, "paid");

    const deletedPayload = JSON.stringify({
      id: "evt_subscription_deleted",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_test_123", customer: "cus_test_123", status: "canceled", current_period_end: 1770000000, metadata: { userId: "billing_webhook_user" } } }
    });
    await post(baseUrl, "/api/billing/webhook", deletedPayload, { "stripe-signature": stripeSignature(deletedPayload, "whsec_test_secret") });
    user = JSON.parse(fs.readFileSync(path.join(tmpRoot, "data", "users", "billing_webhook_user.json"), "utf8"));
    assert.equal(user.membership.status, "canceled");
  });
});

test("webhook does not require bearer auth when Stripe signature is valid", async (t) => {
  setEnv(t, { STRIPE_SECRET_KEY: "sk_test_webhook", STRIPE_WEBHOOK_SECRET: "whsec_test_secret" });
  await withServer(t, {}, async ({ baseUrl }) => {
    const payload = JSON.stringify({
      id: "evt_subscription_created",
      type: "customer.subscription.created",
      data: { object: { id: "sub_no_auth", customer: "cus_no_auth", status: "active", metadata: { userId: "billing_no_auth_webhook_user" } } }
    });
    const { res, json } = await post(baseUrl, "/api/billing/webhook", payload, { "stripe-signature": stripeSignature(payload, "whsec_test_secret") });
    assert.equal(res.status, 200);
    assert.equal(json?.ok, true);
    assert.equal(json?.data?.userId, "billing_no_auth_webhook_user");
  });
});

test("membership page uses Stripe Embedded Checkout and does not include raw card inputs", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "membership.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "..", "public", "membership.js"), "utf8");
  assert.match(html, /https:\/\/js\.stripe\.com\/v3\//);
  assert.match(html, /embedded-checkout/);
  assert.match(js, /initEmbeddedCheckout/);
  assert.match(js, /\/api\/billing\/checkout-session/);
  assert.doesNotMatch(html, /name=["'](?:card|number|cvc|cvv|exp|expiration)/i);
  assert.doesNotMatch(js, /cardNumber|card_number|securityCode|exp_month|exp_year/i);
  assert.doesNotMatch(html + js, /sk_live_|sk_test_|whsec_/);
});

test("seven-day card-required checkout, membership gate, trial reminders, and access statuses", async (t) => {
  enableTestLoginFixture(t);
  baseBillingEnv(t);
  let observedCheckout = null;
  const stripeClient = {
    async createCustomer() { return { id: "cus_trial_user" }; },
    async createCheckoutSession(args) { observedCheckout = args; return { id: "cs_trial", client_secret: "cs_trial_secret" }; }
  };
  await withServer(t, { stripeClient }, async ({ baseUrl, tmpRoot }) => {
    const memberToken = await loginFixtureToken(baseUrl, "billing_trial_member");
    const blocked = await get(baseUrl, "/api/progress/dashboard", { authorization: `Bearer ${memberToken}` });
    assert.equal(blocked.res.status, 402);
    assert.equal(blocked.json?.code, "membership_required");
    assert.equal(blocked.json?.membershipUrl, "/membership.html");

    const checkout = await post(baseUrl, "/api/billing/checkout-session", { priceId: "price_bad", trialPeriodDays: 30 }, { authorization: `Bearer ${memberToken}` });
    assert.equal(checkout.res.status, 201);
    assert.equal(checkout.json?.data?.clientSecret, "cs_trial_secret");
    assert.equal(checkout.json?.data?.trialPeriodDays, 7);
    assert.ok(Number.isFinite(checkout.json?.data?.trialEnd));
    assert.equal(observedCheckout.priceId, "price_server_only");
    assert.equal(observedCheckout.trialPeriodDays, 7);
    assert.equal(observedCheckout.paymentMethodCollection, "always");

    const subscriptionPayload = JSON.stringify({
      id: "evt_trial_subscription_created",
      type: "customer.subscription.created",
      data: { object: { id: "sub_trial", customer: "cus_trial_user", status: "trialing", trial_start: 1770000000, trial_end: 1770604800, current_period_end: 1770604800, cancel_at_period_end: false, metadata: { userId: "billing_trial_member" }, items: { data: [{ price: { id: "price_server_only" } }] } } }
    });
    await post(baseUrl, "/api/billing/webhook", subscriptionPayload, { "stripe-signature": stripeSignature(subscriptionPayload, "whsec_test_secret") });

    const allowedTrial = await get(baseUrl, "/api/progress/dashboard", { authorization: `Bearer ${memberToken}` });
    assert.equal(allowedTrial.res.status, 200);
    let membership = await get(baseUrl, "/api/me/membership", { authorization: `Bearer ${memberToken}` });
    assert.equal(membership.json?.data?.status, "trialing");
    assert.equal(membership.json?.data?.hasAccess, true);
    assert.equal(membership.json?.data?.trialEnd, 1770604800000);

    const reminderPayload = JSON.stringify({
      id: "evt_trial_will_end",
      type: "customer.subscription.trial_will_end",
      data: { object: { id: "sub_trial", customer: "cus_trial_user", status: "trialing", trial_start: 1770000000, trial_end: 1770604800, current_period_end: 1770604800, metadata: { userId: "billing_trial_member" }, items: { data: [{ price: { id: "price_server_only" } }] } } }
    });
    const reminder = await post(baseUrl, "/api/billing/webhook", reminderPayload, { "stripe-signature": stripeSignature(reminderPayload, "whsec_test_secret") });
    assert.equal(reminder.res.status, 200);
    assert.equal(reminder.json?.data?.notificationPrepared, true);
    membership = await get(baseUrl, "/api/me/membership", { authorization: `Bearer ${memberToken}` });
    assert.match(membership.json?.data?.trialReminder?.message, /trial ends/i);

    const canceledPayload = JSON.stringify({
      id: "evt_trial_canceled",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_trial", customer: "cus_trial_user", status: "canceled", canceled_at: 1770500000, trial_end: 1770604800, current_period_end: 1770604800, metadata: { userId: "billing_trial_member" } } }
    });
    await post(baseUrl, "/api/billing/webhook", canceledPayload, { "stripe-signature": stripeSignature(canceledPayload, "whsec_test_secret") });
    membership = await get(baseUrl, "/api/me/membership", { authorization: `Bearer ${memberToken}` });
    assert.equal(membership.json?.data?.status, "canceled");
    assert.equal(membership.json?.data?.hasAccess, false);
    assert.equal(membership.json?.data?.canceledAt, 1770500000000);

    const adminToken = await loginFixtureToken(baseUrl, "pilot_admin");
    const adminAllowed = await get(baseUrl, "/api/progress/dashboard", { authorization: `Bearer ${adminToken}` });
    assert.equal(adminAllowed.res.status, 200);
    const user = JSON.parse(fs.readFileSync(path.join(tmpRoot, "data", "users", "billing_trial_member.json"), "utf8"));
    assert.equal(user.membership.hasAccess, false);
    assert.equal(user.membership.status, "canceled");
  });
});
