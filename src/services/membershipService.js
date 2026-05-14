"use strict";

const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired", "unpaid", "paused"]);

function inactiveMembership(userId) {
  return {
    userId,
    status: "inactive",
    plan: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    updatedAt: null
  };
}

function normalizeTimestamp(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric > 100000000000 ? numeric : numeric * 1000;
}

function normalizeMembership(userId, membership) {
  if (!membership || typeof membership !== "object" || Array.isArray(membership)) {
    return inactiveMembership(userId);
  }

  return {
    userId,
    status: String(membership.status || "inactive"),
    plan: String(membership.plan || "free"),
    stripeCustomerId: membership.stripeCustomerId || null,
    stripeSubscriptionId: membership.stripeSubscriptionId || null,
    currentPeriodEnd: normalizeTimestamp(membership.currentPeriodEnd),
    updatedAt: normalizeTimestamp(membership.updatedAt)
  };
}

function createFetchStripeClient({ fetchImpl = global.fetch } = {}) {
  async function stripeRequest(secretKey, path, params) {
    if (typeof fetchImpl !== "function") {
      throw new ApiError("STRIPE_CLIENT_UNAVAILABLE", "Fetch is unavailable for Stripe API calls", 500);
    }

    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        value.forEach((entry) => body.append(key, entry));
      } else {
        body.append(key, String(value));
      }
    }

    const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new ApiError("STRIPE_REQUEST_FAILED", data?.error?.message || "Stripe request failed", 502, {
        stripeStatus: response.status,
        stripeCode: data?.error?.code || null
      });
    }

    return data;
  }

  async function createCheckoutSession({ secretKey, priceId, userId, successUrl, cancelUrl }) {
    return stripeRequest(secretKey, "/checkout/sessions", {
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      client_reference_id: userId,
      "metadata[userId]": userId,
      "subscription_data[metadata][userId]": userId
    });
  }

  return {
    createCheckoutSession
  };
}

function parseStripeSignatureHeader(header) {
  const parts = String(header || "").split(",");
  const parsed = { t: null, v1: [] };
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=");
    if (key === "t") parsed.t = value;
    if (key === "v1" && value) parsed.v1.push(value);
  }
  return parsed;
}

function timingSafeEqualHex(a, b) {
  const left = Buffer.from(String(a || ""), "hex");
  const right = Buffer.from(String(b || ""), "hex");
  if (left.length !== right.length || left.length === 0) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifyStripeWebhookSignature({ rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300, nowSeconds = Math.floor(Date.now() / 1000) }) {
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""));
  const signature = parseStripeSignatureHeader(signatureHeader);
  const timestamp = Number(signature.t);
  if (!Number.isFinite(timestamp) || signature.v1.length === 0) {
    throw new ApiError("STRIPE_WEBHOOK_SIGNATURE_INVALID", "Missing or invalid Stripe webhook signature", 400);
  }
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    throw new ApiError("STRIPE_WEBHOOK_SIGNATURE_INVALID", "Stripe webhook signature timestamp is outside tolerance", 400);
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${signature.t}.`)
    .update(payload)
    .digest("hex");

  const valid = signature.v1.some((candidate) => timingSafeEqualHex(candidate, expected));
  if (!valid) {
    throw new ApiError("STRIPE_WEBHOOK_SIGNATURE_INVALID", "Stripe webhook signature verification failed", 400);
  }

  try {
    return JSON.parse(payload.toString("utf8"));
  } catch {
    throw new ApiError("STRIPE_WEBHOOK_PAYLOAD_INVALID", "Stripe webhook payload must be JSON", 400);
  }
}

function subscriptionMembershipPatch(subscription) {
  const stripeStatus = String(subscription?.status || "").toLowerCase();
  let status = "inactive";
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(stripeStatus)) status = "active";
  else if (!INACTIVE_SUBSCRIPTION_STATUSES.has(stripeStatus) && stripeStatus) status = stripeStatus;

  return {
    status,
    plan: "stripe_checkout",
    stripeCustomerId: typeof subscription?.customer === "string" ? subscription.customer : subscription?.customer?.id || null,
    stripeSubscriptionId: subscription?.id || null,
    currentPeriodEnd: normalizeTimestamp(subscription?.current_period_end)
  };
}

function createMembershipService({ userStore, stripeClient = createFetchStripeClient() }) {
  function getMembership(userId) {
    const user = userStore.loadUser(userId);
    return normalizeMembership(userId, user.membership);
  }

  function updateMembership(userId, patch) {
    let membership = null;
    userStore.updateUser(userId, (user) => {
      const previous = normalizeMembership(userId, user.membership);
      membership = {
        ...previous,
        ...patch,
        userId,
        updatedAt: Date.now()
      };
      user.membership = membership;
      return user;
    });
    return normalizeMembership(userId, membership);
  }

  function findUserIdByStripeIds({ customerId = null, subscriptionId = null } = {}) {
    if (!customerId && !subscriptionId) return null;
    const users = typeof userStore.listUsers === "function" ? userStore.listUsers() : [];
    const match = users.find((user) => {
      const membership = user?.membership || {};
      return (customerId && membership.stripeCustomerId === customerId)
        || (subscriptionId && membership.stripeSubscriptionId === subscriptionId);
    });
    return match?.userId || null;
  }

  async function createCheckoutSession({ userId, secretKey, priceId, baseUrl }) {
    const successUrl = `${baseUrl}/?checkout=success`;
    const cancelUrl = `${baseUrl}/?checkout=cancelled`;
    const session = await stripeClient.createCheckoutSession({
      secretKey,
      priceId,
      userId,
      successUrl,
      cancelUrl
    });

    return {
      id: session?.id || null,
      url: session?.url || null
    };
  }

  function handleStripeEvent(event) {
    const eventType = String(event?.type || "");
    const object = event?.data?.object || {};
    if (eventType === "checkout.session.completed") {
      const userId = object?.metadata?.userId || object?.client_reference_id || null;
      if (!userId) return { handled: false, reason: "missing_user_id" };
      const membership = updateMembership(userId, {
        status: "active",
        plan: "stripe_checkout",
        stripeCustomerId: typeof object.customer === "string" ? object.customer : object.customer?.id || null,
        stripeSubscriptionId: typeof object.subscription === "string" ? object.subscription : object.subscription?.id || null,
        currentPeriodEnd: null
      });
      return { handled: true, userId, membership };
    }

    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(eventType)) {
      const patch = subscriptionMembershipPatch(object);
      if (eventType === "customer.subscription.deleted") patch.status = "inactive";
      const userId = object?.metadata?.userId || findUserIdByStripeIds({
        customerId: patch.stripeCustomerId,
        subscriptionId: patch.stripeSubscriptionId
      });
      if (!userId) return { handled: false, reason: "missing_user_id" };
      const membership = updateMembership(userId, patch);
      return { handled: true, userId, membership };
    }

    return { handled: false, reason: "ignored_event_type" };
  }

  return {
    getMembership,
    updateMembership,
    createCheckoutSession,
    verifyStripeWebhookSignature,
    handleStripeEvent
  };
}

module.exports = {
  createMembershipService,
  createFetchStripeClient,
  verifyStripeWebhookSignature,
  inactiveMembership,
  normalizeMembership
};
