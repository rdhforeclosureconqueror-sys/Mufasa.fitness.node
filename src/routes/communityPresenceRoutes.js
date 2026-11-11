"use strict";
const { asyncHandler } = require("../middleware/requestContext");
const { ok } = require("../lib/apiResponse");

function installCommunityPresenceRoutes({ app, requireAuth, service }) {
  if (!app || !requireAuth || !service) throw new Error("Community presence route dependencies required");
  app.post("/api/me/community/presence", requireAuth, asyncHandler(async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, service.heartbeat(req.auth.userId));
  }));
  app.get("/api/me/community/presence", requireAuth, asyncHandler(async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, { members: service.onlineMembers(), expiresInMs: service.ttlMs });
  }));
  app.get("/api/community/members/:userId/card", requireAuth, asyncHandler(async (req, res) => {
    const card = service.memberCard(req.params.userId);
    if (!card) return res.status(404).json({ ok: false, error: { code: "COMMUNITY_CARD_NOT_SHARED", message: "This member has not shared a Community ID." } });
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, { card });
  }));
}

module.exports = { installCommunityPresenceRoutes };
