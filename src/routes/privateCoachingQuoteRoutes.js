"use strict";
const { asyncHandler } = require("../middleware/requestContext");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ok } = require("../lib/apiResponse");
function installPrivateCoachingQuoteRoutes({app,requireAuth,service}){
  const writeLimit=createRateLimiter({name:"private-coaching-quote",windowMs:60_000,max:8});
  app.get("/api/me/private-coaching/quote",requireAuth,asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,{quote:service.get(req.auth.userId)});}));
  app.put("/api/me/private-coaching/quote",requireAuth,writeLimit,asyncHandler(async(req,res)=>{const quote=service.save(req.auth.userId,req.body||{});res.set("Cache-Control","private, no-store");return ok(res,req.requestId,{quote},200);}));
}
module.exports={installPrivateCoachingQuoteRoutes};