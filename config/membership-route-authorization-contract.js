"use strict";

module.exports = Object.freeze([
  Object.freeze({
    method: "GET",
    path: "/api/billing/plans",
    authentication: "public",
    membership: "not-required",
    ownership: "no-member-data",
    publicOutput: "membership-plan-catalog-with-checkout-configured-boolean-only",
    notes: "Never exposes Stripe price IDs or secret configuration."
  }),
  Object.freeze({
    method: "GET",
    path: "/api/me/membership-tier",
    authentication: "canonical-pocketpt-bearer",
    membership: "not-required",
    ownership: "authenticated-member-self",
    publicOutput: "owner-scoped-tier-and-subscription-status",
    notes: "Plan identity is derived from the Stripe price ID already persisted by canonical membership state."
  }),
  Object.freeze({
    method: "POST",
    path: "/api/billing/tier-checkout-session",
    authentication: "canonical-pocketpt-bearer",
    membership: "not-required",
    ownership: "authenticated-member-self",
    writes: "stripe-embedded-checkout-session",
    publicOutput: "stripe-client-secret-and-selected-public-plan-metadata",
    notes: "Server resolves the submitted canonical planId to an environment-owned Stripe Price ID. Raw payment fields remain forbidden."
  })
]);
