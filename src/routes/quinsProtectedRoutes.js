"use strict";
/**
 * Fail-closed Quin coaching route. Tactical content is never stored in public/.
 * Access requires a signed platform bearer token AND explicit server-side enrollment.
 */
function allowed(req, env=process.env) {
 const ids=String(env.QUINS_AUTHORIZED_USER_IDS||"").split(",").map(x=>x.trim()).filter(Boolean);
 const emails=String(env.QUINS_AUTHORIZED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 return !!req.auth?.userId && (ids.includes(req.auth.userId) || (!!req.auth.email&&emails.includes(req.auth.email.toLowerCase())));
}
function installQuinsProtectedRoutes({app,requireAuth,env=process.env}){
 app.get("/api/quins/ravens/status",requireAuth,(req,res)=>{
  res.set({"Cache-Control":"private, no-store","Vary":"Authorization","X-Content-Type-Options":"nosniff"});
  if(!allowed(req,env))return res.status(403).json({error:"QUINS_TEAM_ACCESS_REQUIRED"});
  return res.json({access:"granted",play:"RAVENS MF",approvedByCoach:true,visualizer:"integration_pending",message:"Protected route is active; private simulator content is not yet served."});
 });
}
module.exports={allowed,installQuinsProtectedRoutes};
