"use strict";

const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");

const ACCESS_GRANTED_STATUSES = new Set(["active", "trialing"]);
const DUPLICATE_PROTECTED_STATUSES = new Set(["active", "trialing", "past_due", "incomplete"]);
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired", "unpaid", "paused"]);
const BILLING_PLAN = "stripe_embedded_subscription";
const SAFE_WEBHOOK_EVENT_MEMORY = 20;

function normalizeTimestamp(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric > 100000000000 ? numeric : numeric * 1000;
}

function nowTimestamp() {
  return Date.now();
}

function hasMembershipAccess(status) {
  return ACCESS_GRANTED_STATUSES.has(String(status || "").toLowerCase());
}

function isDuplicateProtectedStatus(status) {
  return DUPLICATE_PROTECTED_STATUSES.has(String(status || "").toLowerCase());
}

function entitlementForStatus(status) {
  const normalized = String(status || "inactive").toLowerCase();
  return {
    hasAccess: hasMembershipAccess(normalized),
    grantsAccess: hasMembershipAccess(normalized),
    duplicateProtected: isDuplicateProtectedStatus(normalized),
    rules: {
      active: "grants_access",
      trialing: "grants_access",
      past_due: "no_access_until_payment_recovers_but_duplicate_checkout_blocked",
      unpaid: "no_access",
      canceled: "no_access",
      incomplete: "no_access_until_verified_payment_or_subscription_update",
      incomplete_expired: "no_access"
    }
  };
}

function inactiveMembership(userId) {
  const status = "inactive";
  return {
    userId,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    status,
    plan: "free",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    lastInvoiceStatus: null,
    createdAt: null,
    updatedAt: null,
    hasAccess: false,
    entitlement: entitlementForStatus(status)
  };
}

function normalizeMembership(userId, membership) {
  if (!membership || typeof membership !== "object" || Array.isArray(membership)) {
    return inactiveMembership(userId);
  }

  const status = String(membership.status || "inactive").toLowerCase();
  return {
    userId,
    stripeCustomerId: membership.stripeCustomerId || null,
    stripeSubscriptionId: membership.stripeSubscriptionId || null,
    stripePriceId: membership.stripePriceId || null,
    status,
    plan: String(membership.plan || (status === "inactive" ? "free" : BILLING_PLAN)),
    currentPeriodEnd: normalizeTimestamp(membership.currentPeriodEnd),
    cancelAtPeriodEnd: membership.cancelAtPeriodEnd === true,
    lastInvoiceStatus: membership.lastInvoiceStatus || null,
    createdAt: normalizeTimestamp(membership.createdAt),
    updatedAt: normalizeTimestamp(membership.updatedAt),
    hasAccess: hasMembershipAccess(status),
    entitlement: entitlementForStatus(status)
  };
}

function encodeStripeParams(params, prefix = null, body = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null) continue;
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (entry && typeof entry === "object") encodeStripeParams(entry, `${paramKey}[${index}]`, body);
        else body.append(`${paramKey}[${index}]`, String(entry));
      });
    } else if (value && typeof value === "object") {
      encodeStripeParams(value, paramKey, body);
    } else {
      body.append(paramKey, String(value));
    }
  }
  return body;
}

function createFetchStripeClient({ fetchImpl = global.fetch } = {}) {
  async function stripeRequest(secretKey, path, params, options = {}) {
    if (typeof fetchImpl !== "function") {
      throw new ApiError("STRIPE_CLIENT_UNAVAILABLE", "Fetch is unavailable for Stripe API calls", 500);
    }

    const headers = {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded"
    };
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

    const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
      method: options.method || "POST",
      headers,
      body: encodeStripeParams(params || {})
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

  async function createCustomer({ secretKey, userId, email, idempotencyKey }) {
    return stripeRequest(secretKey, "/customers", {
      email: email || undefined,
      metadata: { userId }
    }, { idempotencyKey });
  }

  async function createCheckoutSession({ secretKey, priceId, userId, email, customerId, returnUrl, idempotencyKey }) {
    return stripeRequest(secretKey, "/checkout/sessions", {
      mode: "subscription",
      ui_mode: "embedded",
      return_url: returnUrl,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : email || undefined,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, authenticatedEmail: email || undefined },
      subscription_data: {
        metadata: { userId, authenticatedEmail: email || undefined }
      }
    }, { idempotencyKey });
  }

  async function createPortalSession({ secretKey, customerId, returnUrl, idempotencyKey }) {
    return stripeRequest(secretKey, "/billing_portal/sessions", {
      customer: customerId,
      return_url: returnUrl
    }, { idempotencyKey });
  }

  return {
    createCustomer,
    createCheckoutSession,
    createPortalSession
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

function extractPriceIdFromSubscription(subscription) {
  const item = subscription?.items?.data?.[0] || null;
  return typeof item?.price === "string" ? item.price : item?.price?.id || subscription?.plan?.id || null;
}

function subscriptionMembershipPatch(subscription) {
  const stripeStatus = String(subscription?.status || "").toLowerCase();
  let status = "inactive";
  if (stripeStatus) status = stripeStatus;
  if (INACTIVE_SUBSCRIPTION_STATUSES.has(stripeStatus)) status = stripeStatus === "canceled" ? "canceled" : stripeStatus;

  return {
    status,
    plan: BILLING_PLAN,
    stripeCustomerId: typeof subscription?.customer === "string" ? subscription.customer : subscription?.customer?.id || null,
    stripeSubscriptionId: subscription?.id || null,
    stripePriceId: extractPriceIdFromSubscription(subscription),
    currentPeriodEnd: normalizeTimestamp(subscription?.current_period_end),
    cancelAtPeriodEnd: subscription?.cancel_at_period_end === true
  };
}

function extractUserIdFromInvoice(invoice, findUserIdByStripeIds) {
  return invoice?.metadata?.userId || invoice?.subscription_details?.metadata?.userId || findUserIdByStripeIds({
    customerId: typeof invoice?.customer === "string" ? invoice.customer : invoice?.customer?.id || null,
    subscriptionId: typeof invoice?.subscription === "string" ? invoice.subscription : invoice?.subscription?.id || null
  });
}

function sanitizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return value && value.includes("@") ? value : null;
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
      const now = nowTimestamp();
      membership = {
        ...previous,
        ...patch,
        userId,
        createdAt: previous.createdAt || now,
        updatedAt: now
      };
      user.membership = membership;
      return user;
    });
    return normalizeMembership(userId, membership);
  }

  function markWebhookEventProcessed(userId, eventId) {
    if (!eventId) return { duplicate: false };
    let duplicate = false;
    userStore.updateUser(userId, (user) => {
      const billing = user.billing || {};
      const processed = Array.isArray(billing.processedStripeWebhookEventIds)
        ? billing.processedStripeWebhookEventIds.filter(Boolean)
        : [];
      duplicate = processed.includes(eventId);
      if (!duplicate) processed.push(eventId);
      user.billing = {
        ...billing,
        processedStripeWebhookEventIds: processed.slice(-SAFE_WEBHOOK_EVENT_MEMORY)
      };
      return user;
    });
    return { duplicate };
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

  async function ensureStripeCustomer({ userId, email, secretKey }) {
    const membership = getMembership(userId);
    if (membership.stripeCustomerId) return { customerId: membership.stripeCustomerId, membership };

    const customer = await stripeClient.createCustomer({
      secretKey,
      userId,
      email: sanitizeEmail(email),
      idempotencyKey: `pocket-pt-customer-${userId}`
    });
    const customerId = customer?.id || null;
    if (!customerId) throw new ApiError("STRIPE_CUSTOMER_CREATE_FAILED", "Stripe customer creation did not return a customer id", 502);
    const updated = updateMembership(userId, {
      stripeCustomerId: customerId,
      plan: BILLING_PLAN,
      status: membership.status || "inactive"
    });
    return { customerId, membership: updated };
  }

  async function createCheckoutSession({ userId, email = null, secretKey, priceId, returnUrl }) {
    const membership = getMembership(userId);
    if (isDuplicateProtectedStatus(membership.status)) {
      return {
        duplicateProtected: true,
        reason: "existing_subscription_state",
        membership
      };
    }

    const { customerId } = await ensureStripeCustomer({ userId, email, secretKey });
    const session = await stripeClient.createCheckoutSession({
      secretKey,
      priceId,
      userId,
      email: sanitizeEmail(email),
      customerId,
      returnUrl,
      idempotencyKey: `pocket-pt-embedded-checkout-${userId}-${priceId}`
    });

    return {
      clientSecret: session?.client_secret || session?.clientSecret || null,
      duplicateProtected: false,
      membership: getMembership(userId)
    };
  }

  async function createPortalSession({ userId, secretKey, returnUrl }) {
    const membership = getMembership(userId);
    if (!membership.stripeCustomerId) {
      throw new ApiError("BILLING_CUSTOMER_MISSING", "No Stripe customer is linked to this Pocket PT account", 404);
    }
    const session = await stripeClient.createPortalSession({
      secretKey,
      customerId: membership.stripeCustomerId,
      returnUrl,
      idempotencyKey: `pocket-pt-portal-${userId}-${Date.now()}`
    });
    return {
      url: session?.url || null,
      membership
    };
  }

  function handleStripeEvent(event) {
    const eventType = String(event?.type || "");
    const eventId = event?.id || null;
    const object = event?.data?.object || {};

    if (eventType === "checkout.session.completed") {
      const userId = object?.metadata?.userId || object?.client_reference_id || null;
      if (!userId) return { handled: false, reason: "missing_user_id" };
      const eventState = markWebhookEventProcessed(userId, eventId);
      if (eventState.duplicate) return { handled: true, duplicate: true, userId, membership: getMembership(userId) };
      const paymentStatus = String(object?.payment_status || "").toLowerCase();
      const sessionStatus = String(object?.status || "").toLowerCase();
      const verifiedActive = paymentStatus === "paid" || paymentStatus === "no_payment_required" || sessionStatus === "complete";
      const membership = updateMembership(userId, {
        status: verifiedActive ? "active" : "incomplete",
        plan: BILLING_PLAN,
        stripeCustomerId: typeof object.customer === "string" ? object.customer : object.customer?.id || null,
        stripeSubscriptionId: typeof object.subscription === "string" ? object.subscription : object.subscription?.id || null,
        stripePriceId: object?.metadata?.stripePriceId || null,
        lastInvoiceStatus: paymentStatus || null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      });
      return { handled: true, duplicate: false, userId, membership };
    }

    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(eventType)) {
      const patch = subscriptionMembershipPatch(object);
      if (eventType === "customer.subscription.deleted") patch.status = "canceled";
      const userId = object?.metadata?.userId || findUserIdByStripeIds({
        customerId: patch.stripeCustomerId,
        subscriptionId: patch.stripeSubscriptionId
      });
      if (!userId) return { handled: false, reason: "missing_user_id" };
      const eventState = markWebhookEventProcessed(userId, eventId);
      if (eventState.duplicate) return { handled: true, duplicate: true, userId, membership: getMembership(userId) };
      const membership = updateMembership(userId, patch);
      return { handled: true, duplicate: false, userId, membership };
    }

    if (["invoice.paid", "invoice.payment_failed"].includes(eventType)) {
      const userId = extractUserIdFromInvoice(object, findUserIdByStripeIds);
      if (!userId) return { handled: false, reason: "missing_user_id" };
      const eventState = markWebhookEventProcessed(userId, eventId);
      if (eventState.duplicate) return { handled: true, duplicate: true, userId, membership: getMembership(userId) };
      const invoicePriceId = object?.lines?.data?.[0]?.price?.id || null;
      const patch = {
        plan: BILLING_PLAN,
        lastInvoiceStatus: eventType === "invoice.paid" ? "paid" : "payment_failed",
        stripeCustomerId: typeof object.customer === "string" ? object.customer : object.customer?.id || null,
        stripeSubscriptionId: typeof object.subscription === "string" ? object.subscription : object.subscription?.id || null,
        ...(invoicePriceId ? { stripePriceId: invoicePriceId } : {})
      };
      if (eventType === "invoice.paid") patch.status = "active";
      if (eventType === "invoice.payment_failed") patch.status = "past_due";
      const membership = updateMembership(userId, patch);
      return { handled: true, duplicate: false, userId, membership };
    }

    return { handled: false, reason: "ignored_event_type" };
  }

  return {
    getMembership,
    updateMembership,
    createCheckoutSession,
    createPortalSession,
    verifyStripeWebhookSignature,
    handleStripeEvent,
    hasMembershipAccess,
    entitlementForStatus
  };
}

module.exports = {
  createMembershipService,
  createFetchStripeClient,
  verifyStripeWebhookSignature,
  inactiveMembership,
  normalizeMembership,
  hasMembershipAccess,
  entitlementForStatus,
  ACCESS_GRANTED_STATUSES,
  DUPLICATE_PROTECTED_STATUSES
};
