"use strict";
/**
 * Fail-closed Quin coaching route. Tactical content is never stored in public/.
 * Preview access requires explicit opt-in; unset or invalid configuration denies unlisted accounts.
 */
const { getPlay } = require("../services/quinsRavensPlaybook");
function allowed(req, env=process.env) {
 const ids=String(env.QUINS_AUTHORIZED_USER_IDS||"").split(",").map(x=>x.trim()).filter(Boolean);
 const emails=String(env.QUINS_AUTHORIZED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 const role=String(req.authz?.role||"").toLowerCase();
 const admin=Boolean(req.authz?.isBootstrapSuperAdmin) || ["admin","super_admin"].includes(role);
 return !!req.auth?.userId && (env.QUINS_BUILD_PREVIEW === "true" || admin || ids.includes(req.auth.userId) || (!!req.auth.email&&emails.includes(req.auth.email.toLowerCase())));
}
function installQuinsProtectedRoutes({app,requireAuth,env=process.env}){
 app.get("/api/quins/ravens/status",requireAuth,(req,res)=>{
  res.set({"Cache-Control":"private, no-store","Vary":"Authorization","X-Content-Type-Options":"nosniff"});
  if(!allowed(req,env))return res.status(403).json({error:"QUINS_TEAM_ACCESS_REQUIRED"});
  return res.json({access:"granted",play:"RAVENS MF",approvedByCoach:true,visualizer:"protected_playback",message:"Authenticated RAVENS MF stages available at /api/quins/ravens/play"});
 });
 app.get("/api/quins/ravens/play",requireAuth,(req,res)=>{
  res.set({"Cache-Control":"private, no-store","Vary":"Authorization","X-Content-Type-Options":"nosniff"});
  if(!allowed(req,env))return res.status(403).json({error:"QUINS_TEAM_ACCESS_REQUIRED"});
  if(req.query.branch && !["wedge","flash"].includes(req.query.branch))return res.status(400).json({error:"INVALID_BRANCH"});
  return res.json(getPlay(req.query.branch||"wedge"));
 });
}
module.exports={allowed,installQuinsProtectedRoutes};
