"use strict";

const PLAN_IDS = Object.freeze({
  ESSENTIAL: "essential",
  PERFORMANCE: "performance",
  UNLEASHED: "unleashed"
});

const PLAN_ORDER = Object.freeze([
  PLAN_IDS.ESSENTIAL,
  PLAN_IDS.PERFORMANCE,
  PLAN_IDS.UNLEASHED
]);

const PLAN_DEFINITIONS = Object.freeze({
  [PLAN_IDS.ESSENTIAL]: Object.freeze({
    id: PLAN_IDS.ESSENTIAL,
    name: "PocketPT Essential",
    shortName: "Essential",
    monthlyCents: 999,
    priceLabel: "$9.99",
    interval: "month",
    currency: "usd",
    tagline: "Your personalized training foundation.",
    recommended: false,
    stripePriceEnv: "STRIPE_PRICE_ESSENTIAL_ID",
    benefits: Object.freeze([
      "Personalized training plan and workout calendar",
      "Guided workout execution with saved history",
      "Exercise Library and movement education",
      "Challenges, personal bests, progress, streaks, and rewards",
      "Core member dashboard and return-to-training experience"
    ]),
    capabilityNotes: Object.freeze([])
  }),
  [PLAN_IDS.PERFORMANCE]: Object.freeze({
    id: PLAN_IDS.PERFORMANCE,
    name: "PocketPT Performance",
    shortName: "Performance",
    monthlyCents: 1999,
    priceLabel: "$19.99",
    interval: "month",
    currency: "usd",
    tagline: "Training plus coaching intelligence for faster progress.",
    recommended: true,
    stripePriceEnv: "STRIPE_PRICE_PERFORMANCE_ID",
    benefits: Object.freeze([
      "Everything in Essential",
      "AI Coach with authoritative PocketPT training context",
      "Camera-based pose and form feedback on supported movements",
      "Nutrition journal, nutrition missions, and connected nutrition guidance",
      "Yoga, mobility, recovery, and adaptive training recommendations"
    ]),
    capabilityNotes: Object.freeze([
      "Camera/form intelligence is available only on supported exercises and compatible devices."
    ])
  }),
  [PLAN_IDS.UNLEASHED]: Object.freeze({
    id: PLAN_IDS.UNLEASHED,
    name: "PocketPT Unleashed",
    shortName: "Unleashed",
    monthlyCents: 3999,
    priceLabel: "$39.99",
    interval: "month",
    currency: "usd",
    tagline: "The complete PocketPT experience, including premium immersive capabilities as they become production-ready.",
    recommended: false,
    stripePriceEnv: "STRIPE_PRICE_UNLEASHED_ID",
    benefits: Object.freeze([
      "Everything in Performance",
      "Personalized avatar and premium 3D training experiences where supported",
      "Premium challenge and arena experiences as they are released",
      "Run Club and GPS performance tools on supported platforms",
      "Early access to new premium PocketPT experiences after production acceptance"
    ]),
    capabilityNotes: Object.freeze([
      "Immersive world, GPS, and other device-dependent experiences are included only when their production readiness requirements are satisfied; the membership page must not represent unfinished capabilities as currently available."
    ])
  })
});

function normalizePlanId(value) {
  const planId = String(value || "").trim().toLowerCase();
  return PLAN_ORDER.includes(planId) ? planId : null;
}

function publicPlan(plan, env = process.env) {
  if (!plan) return null;
  const configuredPriceId = String(env?.[plan.stripePriceEnv] || "").trim();
  const legacyPerformancePrice = plan.id === PLAN_IDS.PERFORMANCE
    ? String(env?.STRIPE_PRICE_ID || "").trim()
    : "";
  return {
    id: plan.id,
    name: plan.name,
    shortName: plan.shortName,
    monthlyCents: plan.monthlyCents,
    priceLabel: plan.priceLabel,
    interval: plan.interval,
    currency: plan.currency,
    tagline: plan.tagline,
    recommended: plan.recommended,
    benefits: [...plan.benefits],
    capabilityNotes: [...plan.capabilityNotes],
    checkoutConfigured: Boolean(configuredPriceId || legacyPerformancePrice)
  };
}

function getPlan(planId) {
  const normalized = normalizePlanId(planId);
  return normalized ? PLAN_DEFINITIONS[normalized] : null;
}

function listPublicPlans(env = process.env) {
  return PLAN_ORDER.map((id) => publicPlan(PLAN_DEFINITIONS[id], env));
}

function resolveStripePriceId(planId, env = process.env) {
  const plan = getPlan(planId);
  if (!plan) return null;
  const configured = String(env?.[plan.stripePriceEnv] || "").trim();
  if (configured) return configured;
  if (plan.id === PLAN_IDS.PERFORMANCE) {
    const legacy = String(env?.STRIPE_PRICE_ID || "").trim();
    if (legacy) return legacy;
  }
  return null;
}

function resolvePlanIdFromStripePrice(priceId, env = process.env) {
  const candidate = String(priceId || "").trim();
  if (!candidate) return null;
  for (const id of PLAN_ORDER) {
    if (resolveStripePriceId(id, env) === candidate) return id;
  }
  return null;
}

module.exports = {
  PLAN_IDS,
  PLAN_ORDER,
  PLAN_DEFINITIONS,
  normalizePlanId,
  getPlan,
  listPublicPlans,
  resolveStripePriceId,
  resolvePlanIdFromStripePrice
};
