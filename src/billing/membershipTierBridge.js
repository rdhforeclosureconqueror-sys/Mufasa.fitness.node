"use strict";

const path = require("path");
const { createUserStore } = require("../repositories/userStore");
const { createMembershipService } = require("../services/membershipService");
const {
  validateCheckoutConfig,
  rejectRawPaymentCredentialFields,
  resolveMembershipReturnUrl,
  getPublicBillingPlan
} = require("../validation/billingValidation");
const { resolvePlanIdFromStripePrice } = require("./membershipPlans");

function createMembershipTierBridge(options = {}) {
  const env = options.env || process.env;
  const rootDir = options.rootDir || process.cwd();
  const dataDir = path.resolve(options.dataDir || env.POCKET_PT_DATA_DIR || path.join(rootDir, "data"));
  const userStore = options.userStore || createUserStore({ userDir: path.join(dataDir, "users") });
  const membershipService = options.membershipService || createMembershipService({
    userStore,
    stripeClient: options.stripeClient
  });

  function requireCanonicalAuth(req, res, next) {
    if (!req.auth?.userId) {
      return res.status(401).json({
        ok: false,
        requestId: req.requestId || null,
        error: { code: "UNAUTHENTICATED", message: "Authentication required" }
      });
    }
    return next();
  }

  function sendBridgeError(res, req, error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const safeStatus = status >= 400 && status <= 599 ? status : 500;
    return res.status(safeStatus).json({
      ok: false,
      requestId: req.requestId || null,
      error: {
        code: error?.code || "MEMBERSHIP_CHECKOUT_FAILED",
        message: safeStatus >= 500 ? "Membership checkout could not be initialized safely." : (error?.message || "Membership checkout request is invalid."),
        details: safeStatus < 500 ? (error?.details || null) : null
      }
    });
  }

  function register(app) {
    app.get("/api/billing/plans", (req, res) => {
      res.set("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, data: getPublicBillingPlan(env), requestId: req.requestId || null });
    });

    app.get("/api/me/membership-tier", requireCanonicalAuth, (req, res) => {
      const membership = membershipService.getMembership(req.auth.userId);
      const planId = resolvePlanIdFromStripePrice(membership.stripePriceId, env);
      res.set("Cache-Control", "private, no-store");
      return res.status(200).json({
        ok: true,
        data: {
          planId,
          status: membership.status,
          hasAccess: membership.hasAccess,
          stripePriceIdKnown: Boolean(membership.stripePriceId),
          legacyOrUnmapped: Boolean(membership.stripePriceId && !planId)
        },
        requestId: req.requestId || null
      });
    });

    app.post("/api/billing/tier-checkout-session", requireCanonicalAuth, async (req, res) => {
      try {
        rejectRawPaymentCredentialFields(req.body);
        const checkoutConfig = validateCheckoutConfig(env, req.body?.planId);
        const returnUrl = resolveMembershipReturnUrl({ env, req, planId: checkoutConfig.planId });
        const checkout = await membershipService.createCheckoutSession({
          userId: req.auth.userId,
          email: req.auth.email,
          secretKey: checkoutConfig.secretKey,
          priceId: checkoutConfig.priceId,
          returnUrl
        });
        const status = checkout.duplicateProtected ? 200 : 201;
        return res.status(status).json({
          ok: true,
          data: {
            ...checkout,
            selectedPlanId: checkoutConfig.planId,
            selectedPlan: {
              id: checkoutConfig.plan.id,
              name: checkoutConfig.plan.name,
              priceLabel: checkoutConfig.plan.priceLabel,
              interval: checkoutConfig.plan.interval
            }
          },
          requestId: req.requestId || null
        });
      } catch (error) {
        return sendBridgeError(res, req, error);
      }
    });
  }

  return Object.freeze({ register, membershipService });
}

module.exports = { createMembershipTierBridge };
