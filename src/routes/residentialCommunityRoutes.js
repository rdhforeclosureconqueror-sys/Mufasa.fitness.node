"use strict";
const {asyncHandler}=require("../middleware/requestContext");
const {createRateLimiter}=require("../middleware/rateLimit");
const {ok,ApiError}=require("../lib/apiResponse");
function installResidentialCommunityRoutes({app,requireAuth,service}){
 const write=createRateLimiter({name:"residential-community-write",windowMs:60_000,max:20});
 app.get("/api/me/residential-community",requireAuth,asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,service.dashboard(req.auth.userId))}));
 app.put("/api/me/residential-community/rsvp/:eventId",requireAuth,write,asyncHandler(async(req,res)=>ok(res,req.requestId,{rsvp:service.rsvp(req.auth.userId,req.params.eventId,req.body?.attending!==false)})));
 app.get("/api/admin/community/events/:eventId/attendance",requireAuth,(req,res,next)=>{if(!["admin","super_admin"].includes(req.authz?.role))throw new ApiError("FORBIDDEN","Administrator access required",403);next()},asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,service.attendance(req.params.eventId))}));
 app.post("/api/admin/community/events/:eventId/attendance/:userId/check-in",requireAuth,(req,res,next)=>{if(!["admin","super_admin"].includes(req.authz?.role))throw new ApiError("FORBIDDEN","Administrator access required",403);next()},write,asyncHandler(async(req,res)=>ok(res,req.requestId,{checkIn:service.checkIn(req.params.eventId,req.params.userId)})));
 app.put("/api/me/residential-community/wednesday-interest",requireAuth,write,asyncHandler(async(req,res)=>ok(res,req.requestId,{vote:service.interest(req.auth.userId,req.body||{})})));
 app.get("/api/me/residential-community/chat",requireAuth,asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,{messages:service.messages(req.auth.userId)})}));
 app.post("/api/me/residential-community/chat",requireAuth,write,asyncHandler(async(req,res)=>ok(res,req.requestId,{message:service.post(req.auth.userId,req.body||{})},201)));
 app.get("/api/me/residential-community/diagnostic",requireAuth,asyncHandler(async(req,res)=>ok(res,req.requestId,service.diagnostic(req.auth.userId))));
}
module.exports={installResidentialCommunityRoutes};
