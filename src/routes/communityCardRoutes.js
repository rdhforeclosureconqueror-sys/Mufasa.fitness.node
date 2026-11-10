"use strict";
const {asyncHandler}=require("../middleware/requestContext");
const {createRateLimiter}=require("../middleware/rateLimit");
const {ok}=require("../lib/apiResponse");
function installCommunityCardRoutes({app,requireAuth,service}) {
  if(!app||!requireAuth||!service) throw new Error("Community card route dependencies required");
  const limiter=createRateLimiter({name:"community-card-write",windowMs:60_000,max:12});
  app.get("/api/me/community-card",requireAuth,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,{card:service.get(req.auth.userId)});
  }));
  app.put("/api/me/community-card",requireAuth,limiter,asyncHandler(async(req,res)=>{
    const card=service.save(req.auth.userId,req.body);
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,{card});
  }));
  // Directory lookup is deliberately absent from foundation release.
  // A privacy/consent-reviewed member discovery endpoint will follow later.
}
module.exports={installCommunityCardRoutes};
