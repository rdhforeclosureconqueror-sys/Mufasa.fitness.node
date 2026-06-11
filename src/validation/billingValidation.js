"use strict";

const { ApiError } = require("../lib/apiResponse");

function requiredEnv(env, key) {
  const value = String(env?.[key] || "").trim();
  if (!value) {
    throw new ApiError("BILLING_CONFIG_MISSING", `${key} is required for Stripe Embedded Checkout`, 503, { missing: key });
  }
  return value;
}

function validatePrefix(value, key, prefix) {
  if (!String(value || "").startsWith(prefix)) {
    throw new ApiError("BILLING_CONFIG_INVALID", `${key} must use the expected Stripe prefix`, 503, { key, expectedPrefix: prefix });
  }
}


const RAW_PAYMENT_FIELD_NAMES = new Set([
  "card",
  "cardnumber",
  "card_number",
  "number",
  "cvc",
  "cvv",
  "securitycode",
  "security_code",
  "expiration",
  "expiry",
  "exp",
  "expmonth",
  "exp_month",
  "expyear",
  "exp_year"
]);

function containsRawPaymentCredentialField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsRawPaymentCredentialField);
  for (const [key, nested] of Object.entries(value)) {
    const normalized = String(key || "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    if (RAW_PAYMENT_FIELD_NAMES.has(normalized)) return true;
    if (containsRawPaymentCredentialField(nested)) return true;
  }
  return false;
}

function rejectRawPaymentCredentialFields(body) {
  if (containsRawPaymentCredentialField(body)) {
    throw new ApiError("RAW_PAYMENT_DETAILS_FORBIDDEN", "Payment credentials must be entered only in Stripe-hosted secure components", 400);
  }
}

function validateCheckoutConfig(env = process.env) {
  const secretKey = requiredEnv(env, "STRIPE_SECRET_KEY");
  const priceId = requiredEnv(env, "STRIPE_PRICE_ID");
  validatePrefix(priceId, "STRIPE_PRICE_ID", "price_");
  return { secretKey, priceId };
}

function validatePortalConfig(env = process.env) {
  return {
    secretKey: requiredEnv(env, "STRIPE_SECRET_KEY")
  };
}

function validateWebhookConfig(env = process.env) {
  const secretKey = requiredEnv(env, "STRIPE_SECRET_KEY");
  const webhookSecret = requiredEnv(env, "STRIPE_WEBHOOK_SECRET");
  validatePrefix(webhookSecret, "STRIPE_WEBHOOK_SECRET", "whsec_");
  return { secretKey, webhookSecret };
}

function resolvePublicBaseUrl({ env = process.env, req = null } = {}) {
  const configured = String(env.FRONTEND_PUBLIC_URL || env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  if (req) {
    const protocol = String(req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim() || "http";
    const host = String(req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
    if (host) return `${protocol}://${host}`;
  }

  throw new ApiError("BILLING_CONFIG_MISSING", "FRONTEND_PUBLIC_URL, PUBLIC_BASE_URL, or request host is required for Stripe Embedded Checkout return URLs", 503, {
    missing: "FRONTEND_PUBLIC_URL"
  });
}

function resolveMembershipReturnUrl({ env = process.env, req = null } = {}) {
  return `${resolvePublicBaseUrl({ env, req })}/membership.html?checkout=return`;
}

function getPublicBillingPlan(env = process.env) {
  return {
    name: String(env.MEMBERSHIP_PLAN_NAME || "Pocket PT Monthly Membership").trim(),
    priceLabel: String(env.MEMBERSHIP_PRICE_LABEL || "Official monthly price shown in secure Stripe checkout").trim(),
    interval: "month",
    currency: String(env.MEMBERSHIP_PRICE_CURRENCY || "usd").trim().toLowerCase(),
    recurringDisclosure: "Recurring monthly subscription. Manage or cancel from the secure Stripe billing portal.",
    trialPeriodDays: 7,
    trialDisclosure: "7-day free trial. Payment method required. Cancel before the displayed trial-end date and time to avoid the first monthly charge. After the trial, membership renews monthly until canceled."
  };
}

module.exports = {
  validateCheckoutConfig,
  validatePortalConfig,
  validateWebhookConfig,
  rejectRawPaymentCredentialFields,
  resolvePublicBaseUrl,
  resolveMembershipReturnUrl,
  getPublicBillingPlan
};
