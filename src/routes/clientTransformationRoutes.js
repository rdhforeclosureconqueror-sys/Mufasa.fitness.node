"use strict";
const {asyncHandler}=require("../middleware/requestContext");
const {ok}=require("../lib/apiResponse");
function installClientTransformationRoutes({app,requireAuth,service}){
  app.get("/api/me/transformation-profile",requireAuth,asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,{profile:service.read(req.auth.userId)});}));
  app.put("/api/me/transformation-profile/return-agreement",requireAuth,asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,{profile:service.saveAgreement(req.auth.userId,req.body||{})});}));
  app.post("/api/me/transformation-profile/check-ins",requireAuth,asyncHandler(async(req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,{checkIn:service.addCheckIn(req.auth.userId,req.body||{})},201);}));
}
module.exports={installClientTransformationRoutes};