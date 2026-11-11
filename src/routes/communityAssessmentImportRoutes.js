"use strict";
const { asyncHandler } = require("../middleware/requestContext");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ok } = require("../lib/apiResponse");

function installCommunityAssessmentImportRoutes({ app, requireAuth, service }) {
  if (!app || !requireAuth || !service) throw new Error("Community assessment import route dependencies required");
  app.post("/api/me/community-card/import-garvey-result", requireAuth, createRateLimiter({ name: "community-card-garvey-import", windowMs: 60_000, max: 8 }), asyncHandler(async (req, res) => {
    const card = await service.importResult({ userId: req.auth.userId, userEmail: req.auth.email, engineType: req.body?.engineType, resultId: req.body?.resultId });
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, { card });
  }));
}
module.exports = { installCommunityAssessmentImportRoutes };
