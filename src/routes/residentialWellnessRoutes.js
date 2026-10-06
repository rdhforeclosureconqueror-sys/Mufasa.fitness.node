"use strict";
const { asyncHandler } = require("../middleware/requestContext");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ok } = require("../lib/apiResponse");

function installResidentialWellnessRoutes({app,requireAuth,service}){
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
  app.get("/api/me/residential-wellness/diagnostic",requireAuth,asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,service.diagnostic(req.auth.userId));
  }));
}
module.exports={installResidentialWellnessRoutes};
