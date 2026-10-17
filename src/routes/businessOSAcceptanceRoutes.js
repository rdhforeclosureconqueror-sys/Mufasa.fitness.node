"use strict";
const express=require("express");
const {scenarios}=require("../../scripts/business-os-acceptance-lab");
const {execute}=require("../../scripts/business-os-acceptance-report");
const {run:runWellness}=require("../../scripts/wellness-synthetic-journey");
const {runIsolatedHttpJourney}=require("../../scripts/acceptance-isolated-http-runner");
const {assessLiveJourneyPreflight}=require("../services/liveJourneySafetyContract");
const {evaluateFullJourney}=require("../services/fullProductionJourneyEvidence");
const {assessExecutionRequest}=require("../services/liveJourneyExecutionGate");
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
 router.post("/isolated-http/run",express.json({limit:"1kb"}),async(req,res)=>{
  if(!req.is("application/json"))return res.status(415).json({ok:false,error:{code:"JSON_REQUIRED"}});
  if(!req.body||Object.keys(req.body).length!==1||req.body.confirm!=="RUN_ISOLATED_HTTP_ONLY")return res.status(400).json({ok:false,error:{code:"EXPLICIT_ISOLATED_CONFIRMATION_REQUIRED"}});
  const report=await runIsolatedHttpJourney();
  return res.status(report.passed?200:422).json({ok:report.passed,report});
 });
 router.get("/live/full-journey/status",(_req,res)=>res.json({ok:true,report:evaluateFullJourney()}));
 router.post("/live/execute",express.json({limit:"2kb"}),(req,res)=>{
  if(!req.is("application/json"))return res.status(415).json({ok:false,error:{code:"JSON_REQUIRED"}});
  const report=assessExecutionRequest(req.body,{adminAuthorized:true});
  return res.status(409).json({ok:false,report});
 });
 router.get("/live/preflight",(_req,res)=>res.json({ok:true,report:assessLiveJourneyPreflight({adminAuthorized:true})}));
 router.post("/wellness/run",express.json({limit:"1kb"}),(req,res)=>{
  if(!req.is("application/json"))return res.status(415).json({ok:false,error:{code:"JSON_REQUIRED"}});
  if(!req.body||typeof req.body!=="object"||Array.isArray(req.body)||Object.keys(req.body).length)return res.status(400).json({ok:false,error:{code:"INVALID_REQUEST"}});
  try{return res.json({ok:true,report:runWellness()})}
  catch(error){return res.status(500).json({ok:false,error:{code:"WELLNESS_HARNESS_ERROR",firstFailure:error.message}})}
 });
 app.use("/api/admin/business-os/acceptance",router);
 return router;
}
module.exports={installBusinessOSAcceptanceRoutes,requireLabAdmin};
