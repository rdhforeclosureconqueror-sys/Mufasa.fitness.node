"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PLAN_IDS,
  listPublicPlans,
  resolveStripePriceId,
  resolvePlanIdFromStripePrice
} = require("../src/billing/membershipPlans");
const {
  validateCheckoutConfig,
  resolveMembershipReturnUrl,
  getPublicBillingPlan
} = require("../src/validation/billingValidation");

const tierEnv = Object.freeze({
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_PRICE_ESSENTIAL_ID: "price_essential",
  STRIPE_PRICE_PERFORMANCE_ID: "price_performance",
  STRIPE_PRICE_UNLEASHED_ID: "price_unleashed",
  FRONTEND_PUBLIC_URL: "https://pocketpt.example"
});

test("PocketPT exposes exactly three canonical monthly value packages", () => {
  const plans = listPublicPlans(tierEnv);
  assert.equal(plans.length, 3);
  assert.deepEqual(plans.map((plan) => [plan.id, plan.monthlyCents, plan.priceLabel]), [
    ["essential", 999, "$9.99"],
    ["performance", 1999, "$19.99"],
    ["unleashed", 3999, "$39.99"]
  ]);
  assert.equal(plans.find((plan) => plan.id === "performance").recommended, true);
  assert.ok(plans.every((plan) => plan.interval === "month" && plan.currency === "usd"));
});

test("public plan catalog never exposes Stripe price IDs or secret env names", () => {
  const serialized = JSON.stringify(getPublicBillingPlan(tierEnv));
  assert.doesNotMatch(serialized, /price_essential|price_performance|price_unleashed|sk_test_example/);
  assert.doesNotMatch(serialized, /STRIPE_PRICE_[A-Z_]+_ID/);
  assert.match(serialized, /checkoutConfigured/);
});

test("tier-specific Stripe prices map in both directions", () => {
  assert.equal(resolveStripePriceId(PLAN_IDS.ESSENTIAL, tierEnv), "price_essential");
  assert.equal(resolveStripePriceId(PLAN_IDS.PERFORMANCE, tierEnv), "price_performance");
  assert.equal(resolveStripePriceId(PLAN_IDS.UNLEASHED, tierEnv), "price_unleashed");
  assert.equal(resolvePlanIdFromStripePrice("price_essential", tierEnv), "essential");
  assert.equal(resolvePlanIdFromStripePrice("price_performance", tierEnv), "performance");
  assert.equal(resolvePlanIdFromStripePrice("price_unleashed", tierEnv), "unleashed");
});

test("legacy STRIPE_PRICE_ID is a Performance-only compatibility fallback", () => {
  const env = { STRIPE_SECRET_KEY: "sk_test_example", STRIPE_PRICE_ID: "price_legacy" };
  assert.equal(resolveStripePriceId("performance", env), "price_legacy");
  assert.equal(resolveStripePriceId("essential", env), null);
  assert.equal(resolveStripePriceId("unleashed", env), null);
  assert.equal(resolvePlanIdFromStripePrice("price_legacy", env), "performance");
});

test("checkout validation resolves the selected canonical tier and rejects unknown tiers", () => {
  const performance = validateCheckoutConfig(tierEnv, "performance");
  assert.equal(performance.planId, "performance");
  assert.equal(performance.priceId, "price_performance");
  assert.throws(() => validateCheckoutConfig(tierEnv, "vip"), (error) => error?.code === "MEMBERSHIP_PLAN_INVALID");
});

test("checkout fails closed when a selected tier has no configured Stripe price", () => {
  assert.throws(
    () => validateCheckoutConfig({ STRIPE_SECRET_KEY: "sk_test_example", STRIPE_PRICE_PERFORMANCE_ID: "price_performance" }, "essential"),
    (error) => error?.code === "BILLING_CONFIG_MISSING" && error?.details?.planId === "essential"
  );
});

test("membership return URL preserves selected tier without accepting arbitrary destinations", () => {
  const url = resolveMembershipReturnUrl({ env: tierEnv, planId: "unleashed" });
  assert.equal(url, "https://pocketpt.example/membership.html?checkout=return&plan=unleashed");
  const invalid = resolveMembershipReturnUrl({ env: tierEnv, planId: "not-a-plan" });
  assert.equal(invalid, "https://pocketpt.example/membership.html?checkout=return");
});
