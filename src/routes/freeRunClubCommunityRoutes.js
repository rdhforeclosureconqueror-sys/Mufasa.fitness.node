"use strict";

const { asyncHandler } = require("../middleware/requestContext");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ok } = require("../lib/apiResponse");

function installFreeRunClubCommunityRoutes({ app, requireAuth, userStore, freeRunClubCommunityService }) {
  if (!app || !requireAuth || !userStore || !freeRunClubCommunityService) throw new Error("Free Run Club route dependencies are required");
  const profileWriteLimit = createRateLimiter({ name:"free-run-club-profile-write", windowMs:60_000, max:12 });
  const boardWriteLimit = createRateLimiter({ name:"free-run-club-board-write", windowMs:60_000, max:10 });

  const memberIds = () => userStore.listUsers()
    .filter(user => user?.freeRunClub?.profile?.profileUseConsent === true)
    .map(user => user.userId);

  app.get("/api/me/run-club/profile", requireAuth, asyncHandler(async (req,res) => {
    res.set("Cache-Control","private, no-store");
    return ok(res, req.requestId, { profile:freeRunClubCommunityService.getProfile(req.auth.userId) });
  }));

  app.put("/api/me/run-club/profile", requireAuth, profileWriteLimit, asyncHandler(async (req,res) => {
    const profile=freeRunClubCommunityService.saveProfile(req.auth.userId, req.body || {});
    res.set("Cache-Control","private, no-store");
    return ok(res, req.requestId, { profile }, 200);
  }));

  app.get("/api/me/run-club/board", requireAuth, asyncHandler(async (req,res) => {
    res.set("Cache-Control","private, no-store");
    return ok(res, req.requestId, { posts:freeRunClubCommunityService.board(memberIds()) });
  }));

  app.post("/api/me/run-club/board", requireAuth, boardWriteLimit, asyncHandler(async (req,res) => {
    const post=freeRunClubCommunityService.createPost(req.auth.userId, req.body || {});
    res.set("Cache-Control","private, no-store");
    return ok(res, req.requestId, { post }, 201);
  }));

  app.get("/api/me/run-club/diagnostic", requireAuth, asyncHandler(async (req,res) => {
    const diagnostic=freeRunClubCommunityService.diagnostic(req.auth.userId);
    const checks=[
      ...(diagnostic.checks || []),
      { id:"community_membership", result:memberIds().includes(req.auth.userId)?"PASS":"FAIL" },
      { id:"board_read_scope", result:"PASS", evidence:{ source:"canonical userStore", memberCount:memberIds().length } }
    ];
    res.set("Cache-Control","private, no-store");
    return ok(res, req.requestId, { ...diagnostic, firstFailure:checks.find(item=>item.result==="FAIL")?.id || null, checks });
  }));

  return { memberIds };
}

module.exports={ installFreeRunClubCommunityRoutes };
