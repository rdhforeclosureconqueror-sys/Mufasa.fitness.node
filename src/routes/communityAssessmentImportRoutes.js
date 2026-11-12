"use strict";
const { asyncHandler } = require("../middleware/requestContext");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ok } = require("../lib/apiResponse");

function installCommunityAssessmentImportRoutes({ app, requireAuth, service }) {
  if (!app || !requireAuth || !service) throw new Error("Community assessment import route dependencies required");
  const limiter = createRateLimiter({ name: "community-card-garvey-import", windowMs: 60_000, max: 8 });
  app.get("/api/me/community-assessments", requireAuth, asyncHandler(async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, { assessments: service.linkedAssessments(req.auth.userId) });
  }));
  app.post("/api/me/community-card/import-garvey-result", requireAuth, limiter, asyncHandler(async (req, res) => {
    const linked = await service.importResult({ userId: req.auth.userId, userEmail: req.auth.email, engineType: req.body?.engineType, resultId: req.body?.resultId });
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, linked);
  }));
}
module.exports = { installCommunityAssessmentImportRoutes };
