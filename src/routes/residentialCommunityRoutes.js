"use strict";
const {asyncHandler}=require("../middleware/requestContext");
const {createRateLimiter}=require("../middleware/rateLimit");
const {ok}=require("../lib/apiResponse");
function installResidentialCommunityRoutes({app,requireAuth,service}){
 const write=createRateLimiter({name:"residential-community-write",windowMs:60_000,max:20});
 app.get("/api/me/residential-community",requireAuth,asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,service.dashboard(req.auth.userId))}));
 app.put("/api/me/residential-community/rsvp/:eventId",requireAuth,write,asyncHandler(async(req,res)=>ok(res,req.requestId,{rsvp:service.rsvp(req.auth.userId,req.params.eventId,req.body?.attending!==false)})));
 app.get("/api/me/residential-community/chat",requireAuth,asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,{messages:service.messages()})}));
 app.post("/api/me/residential-community/chat",requireAuth,write,asyncHandler(async(req,res)=>ok(res,req.requestId,{message:service.post(req.auth.userId,req.body||{})},201)));
 app.get("/api/me/residential-community/diagnostic",requireAuth,asyncHandler(async(req,res)=>ok(res,req.requestId,service.diagnostic(req.auth.userId))));
}
module.exports={installResidentialCommunityRoutes};
