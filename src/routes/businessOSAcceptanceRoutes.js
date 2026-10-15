"use strict";
const express=require("express");
const {scenarios}=require("../../scripts/business-os-acceptance-lab");
const {execute}=require("../../scripts/business-os-acceptance-report");
function requireLabAdmin(req,res,next){
 if(!req.auth?.userId)return res.status(401).json({ok:false,error:{code:"UNAUTHENTICATED"}});
 if(!["admin","super_admin"].includes(req.authz?.role))return res.status(403).json({ok:false,error:{code:"FORBIDDEN"}});
 return next();
}
function installBusinessOSAcceptanceRoutes({app,requireAuth}){
 if(!app||typeof requireAuth!=="function")throw Error("acceptance_route_dependencies_required");
 const router=express.Router();
 router.use(requireAuth,requireLabAdmin);
 router.use((_req,res,next)=>{res.set("Cache-Control","no-store");next()});
 router.get("/scenarios",(_req,res)=>res.json({ok:true,mode:"SIMULATED_NO_SIDE_EFFECTS",scenarios:scenarios.map(({id,expected})=>({id,expected}))}));
 router.post("/run",express.json({limit:"4kb"}),(req,res)=>{
  if(!req.is("application/json"))return res.status(415).json({ok:false,error:{code:"JSON_REQUIRED"}});
  const body=req.body;
  if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(k=>k!=="scenarioIds"))return res.status(400).json({ok:false,error:{code:"INVALID_REQUEST"}});
  try{
   const report=execute({scenarioIds:body.scenarioIds,commitSha:process.env.RENDER_GIT_COMMIT||process.env.GITHUB_SHA||"UNKNOWN",deployment:"SERVER_SIMULATION"});
   return res.json({ok:true,report});
  }catch(error){return res.status(422).json({ok:false,error:{code:"INVALID_SCENARIO",firstFailure:error.message}})}
 });
 app.use("/api/admin/business-os/acceptance",router);
 return router;
}
module.exports={installBusinessOSAcceptanceRoutes,requireLabAdmin};
