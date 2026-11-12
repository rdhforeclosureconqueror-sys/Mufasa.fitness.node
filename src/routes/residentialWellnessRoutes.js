"use strict";
const { asyncHandler } = require("../middleware/requestContext");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ok } = require("../lib/apiResponse");
const { getPanAfricanAccess,migrateLegacyPanAfricanProgress,getPanAfricanProgress } = require("../services/panAfricanMembershipService");

function installResidentialWellnessRoutes({app,requireAuth,service,userStore}){
  if(!app||!requireAuth||!service) throw new Error("Residential wellness route dependencies are required");
  const writeLimit=createRateLimiter({name:"residential-wellness-write",windowMs:60_000,max:12});
  app.get("/api/me/residential-wellness",requireAuth,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,{profile:service.get(req.auth.userId)});
  }));
  app.put("/api/me/residential-wellness",requireAuth,writeLimit,asyncHandler(async(req,res)=>{
    const profile=service.save(req.auth.userId,req.body||{});
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,{profile});
  }));
  app.get("/api/me/pan-african/access",requireAuth,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,{access:getPanAfricanAccess(userStore,req.auth.userId)});
  }));
  app.get("/api/me/pan-african/progress",requireAuth,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    const access=getPanAfricanAccess(userStore,req.auth.userId);
    if(!access.authorized)return res.status(403).json({error:"PAN_AFRICAN_MEMBERSHIP_REQUIRED"});
    return ok(res,req.requestId,{progress:getPanAfricanProgress(userStore,req.auth.userId)});
  }));
  app.post("/api/me/pan-african/import-legacy-progress",requireAuth,writeLimit,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    const result=migrateLegacyPanAfricanProgress(userStore,req.auth.userId,req.body||{});
    if(result.status==="membership_not_verified")return res.status(403).json({error:"PAN_AFRICAN_MEMBERSHIP_REQUIRED"});
    if(result.status==="invalid_legacy_date")return res.status(400).json({error:"INVALID_LEGACY_START_DATE"});
    return ok(res,req.requestId,result);
  }));
  app.get("/api/me/eight-limbs-yoga",requireAuth,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,{journey:service.getYogaJourney(req.auth.userId)});
  }));
  app.post("/api/me/eight-limbs-yoga/start",requireAuth,writeLimit,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,{journey:service.startYogaJourney(req.auth.userId)});
  }));
  app.post("/api/me/eight-limbs-yoga/complete",requireAuth,writeLimit,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,{journey:service.completeYogaLimb(req.auth.userId,Number(req.body?.limb))});
  }));
  app.get("/api/me/residential-wellness/diagnostic",requireAuth,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,service.diagnostic(req.auth.userId));
  }));
}
module.exports={installResidentialWellnessRoutes};
