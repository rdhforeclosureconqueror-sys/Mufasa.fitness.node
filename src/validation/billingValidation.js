"use strict";

const { ApiError } = require("../lib/apiResponse");

function requiredEnv(env, key) {
  const value = String(env?.[key] || "").trim();
  if (!value) {
    throw new ApiError("BILLING_CONFIG_MISSING", `${key} is required for Stripe Checkout`, 503, { missing: key });
  }
  return value;
}

function validateCheckoutConfig(env = process.env) {
  return {
    secretKey: requiredEnv(env, "STRIPE_SECRET_KEY"),
    priceId: requiredEnv(env, "STRIPE_PRICE_ID")
  };
}

function validateWebhookConfig(env = process.env) {
  return {
    secretKey: requiredEnv(env, "STRIPE_SECRET_KEY"),
    webhookSecret: requiredEnv(env, "STRIPE_WEBHOOK_SECRET")
  };
}

function resolvePublicBaseUrl({ env = process.env, req = null } = {}) {
  const configured = String(env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  if (req) {
    const protocol = String(req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim() || "http";
    const host = String(req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
    if (host) return `${protocol}://${host}`;
  }

  throw new ApiError("BILLING_CONFIG_MISSING", "PUBLIC_BASE_URL or request host is required for Stripe Checkout redirects", 503, {
    missing: "PUBLIC_BASE_URL"
  });
}

module.exports = {
  validateCheckoutConfig,
  validateWebhookConfig,
  resolvePublicBaseUrl
};
