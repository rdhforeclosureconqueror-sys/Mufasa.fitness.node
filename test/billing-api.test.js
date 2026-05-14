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
  setEnv(t, {
    PILOT_LOGIN_PASSWORD: "top-secret",
    NODE_ENV: "test",
    AUTH_TEST_LOGIN_FIXTURE_ENABLED: "true"
  });
}

async function post(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { res, json };
}

async function get(baseUrl, route, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "GET",
    headers
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { res, json };
}

async function loginFixtureToken(baseUrl, testUserId) {
  const { res, json } = await post(baseUrl, "/api/auth/login", {
    email: "fixture-user@example.test",
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
    assert.deepEqual(json?.data, {
      userId: "billing_free_user",
      status: "inactive",
      plan: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      updatedAt: null
    });
  });
});

test("unauthenticated POST /api/billing/create-checkout-session returns 401", async (t) => {
  await withServer(t, {}, async ({ baseUrl }) => {
    const { res, json } = await post(baseUrl, "/api/billing/create-checkout-session", {});
    assert.equal(res.status, 401);
    assert.equal(json?.ok, false);
    assert.equal(json?.error?.code, "UNAUTHENTICATED");
  });
});

test("checkout creation rejects when Stripe env is missing", async (t) => {
  enableTestLoginFixture(t);
  setEnv(t, {
    STRIPE_SECRET_KEY: null,
    STRIPE_PRICE_ID: null,
    PUBLIC_BASE_URL: "https://pilot.example.test"
  });

  let called = false;
  const stripeClient = {
    async createCheckoutSession() {
      called = true;
      return { id: "cs_should_not_be_called", url: "https://stripe.example/checkout" };
    }
  };

  await withServer(t, { stripeClient }, async ({ baseUrl }) => {
    const token = await loginFixtureToken(baseUrl, "billing_missing_env_user");
    const { res, json } = await post(baseUrl, "/api/billing/create-checkout-session", {}, { authorization: `Bearer ${token}` });

    assert.equal(res.status, 503);
    assert.equal(json?.ok, false);
    assert.equal(json?.error?.code, "BILLING_CONFIG_MISSING");
    assert.equal(called, false);
  });
});

test("checkout creation uses server-side STRIPE_PRICE_ID, not a client-supplied price", async (t) => {
  enableTestLoginFixture(t);
  setEnv(t, {
    STRIPE_SECRET_KEY: "sk_test_server_secret",
    STRIPE_PRICE_ID: "price_server_only",
    PUBLIC_BASE_URL: "https://pilot.example.test"
  });

  let observed = null;
  const stripeClient = {
    async createCheckoutSession(args) {
      observed = args;
      return { id: "cs_test_123", url: "https://stripe.example/checkout/cs_test_123" };
    }
  };

  await withServer(t, { stripeClient }, async ({ baseUrl }) => {
    const token = await loginFixtureToken(baseUrl, "billing_checkout_user");
    const { res, json } = await post(baseUrl, "/api/billing/create-checkout-session", {
      priceId: "price_attacker_supplied"
    }, { authorization: `Bearer ${token}` });

    assert.equal(res.status, 201);
    assert.equal(json?.ok, true);
    assert.equal(json?.data?.id, "cs_test_123");
    assert.equal(json?.data?.url, "https://stripe.example/checkout/cs_test_123");
    assert.equal(observed.priceId, "price_server_only");
    assert.equal(observed.userId, "billing_checkout_user");
    assert.equal(observed.successUrl, "https://pilot.example.test/?checkout=success");
    assert.equal(observed.cancelUrl, "https://pilot.example.test/?checkout=cancelled");
  });
});

test("webhook rejects invalid or missing Stripe signature", async (t) => {
  setEnv(t, {
    STRIPE_SECRET_KEY: "sk_test_webhook",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret"
  });

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

test("webhook can update membership active and inactive through signed Stripe events", async (t) => {
  setEnv(t, {
    STRIPE_SECRET_KEY: "sk_test_webhook",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret"
  });

  await withServer(t, {}, async ({ baseUrl, tmpRoot }) => {
    const completedPayload = JSON.stringify({
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_completed",
          customer: "cus_test_123",
          subscription: "sub_test_123",
          client_reference_id: "billing_webhook_user",
          metadata: { userId: "billing_webhook_user" }
        }
      }
    });
    const completed = await post(baseUrl, "/api/billing/webhook", completedPayload, {
      "stripe-signature": stripeSignature(completedPayload, "whsec_test_secret")
    });

    assert.equal(completed.res.status, 200);
    assert.equal(completed.json?.ok, true);
    assert.equal(completed.json?.data?.handled, true);

    const activeUserPath = path.join(tmpRoot, "data", "users", "billing_webhook_user.json");
    const activeUser = JSON.parse(fs.readFileSync(activeUserPath, "utf8"));
    assert.equal(activeUser.membership.status, "active");
    assert.equal(activeUser.membership.plan, "stripe_checkout");
    assert.equal(activeUser.membership.stripeCustomerId, "cus_test_123");
    assert.equal(activeUser.membership.stripeSubscriptionId, "sub_test_123");

    const deletedPayload = JSON.stringify({
      id: "evt_subscription_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_123",
          status: "canceled",
          current_period_end: 1770000000
        }
      }
    });
    const deleted = await post(baseUrl, "/api/billing/webhook", deletedPayload, {
      "stripe-signature": stripeSignature(deletedPayload, "whsec_test_secret")
    });

    assert.equal(deleted.res.status, 200);
    assert.equal(deleted.json?.data?.handled, true);

    const inactiveUser = JSON.parse(fs.readFileSync(activeUserPath, "utf8"));
    assert.equal(inactiveUser.membership.status, "inactive");
    assert.equal(inactiveUser.membership.stripeCustomerId, "cus_test_123");
    assert.equal(inactiveUser.membership.stripeSubscriptionId, "sub_test_123");
    assert.equal(inactiveUser.membership.currentPeriodEnd, 1770000000000);
  });
});

test("webhook requires no bearer auth when Stripe signature verification passes", async (t) => {
  setEnv(t, {
    STRIPE_SECRET_KEY: "sk_test_webhook",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret"
  });

  await withServer(t, {}, async ({ baseUrl }) => {
    const payload = JSON.stringify({
      id: "evt_subscription_created",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_no_auth_123",
          customer: "cus_no_auth_123",
          status: "active",
          current_period_end: 1770000000,
          metadata: { userId: "billing_no_auth_webhook_user" }
        }
      }
    });
    const { res, json } = await post(baseUrl, "/api/billing/webhook", payload, {
      "stripe-signature": stripeSignature(payload, "whsec_test_secret")
    });

    assert.equal(res.status, 200);
    assert.equal(json?.ok, true);
    assert.equal(json?.data?.handled, true);
    assert.equal(json?.data?.userId, "billing_no_auth_webhook_user");
  });
});
