'use strict';
/**
 * Fail-closed server-only delivery of Quin coaching playbooks.
 * Tactical JSON must be provisioned by the deployment as an environment secret;
 * never commit tactical payload to public/, the frontend bundle, or this module.
 */
function parseAllowlist(value){
 return new Set(String(value||'').split(',').map(v=>v.trim()).filter(Boolean));
}
function authorizeQuins(req,{allowlist,enabled}){
 if(!req.auth?.userId)return {status:401,reason:'Authentication required'};
 if(!enabled)return {status:503,reason:'Private playbook not configured'};
 if(!allowlist.has(req.auth.userId))return {status:403,reason:'Quin team membership required'};
 return {status:200};
}
function installQuinsPlaybookRoutes(app,{requireAuth,env=process.env}={}){
 if(!app||typeof app.get!=='function')throw new TypeError('Express app required');
 const allowed=parseAllowlist(env.QUINS_PLAYBOOK_USER_IDS);
 const enabled=env.QUINS_PLAYBOOK_ENABLED==='true';
 const raw=env.QUINS_RAVENS_PLAYBOOK_JSON||'';
 let payload=null;
 if(enabled&&raw){try{payload=JSON.parse(raw);}catch(_){payload=null;}}
 const check=(req,res,next)=>{
  const decision=authorizeQuins(req,{allowlist:allowed,enabled:enabled&&Boolean(payload)});
  if(decision.status!==200)return res.status(decision.status).set('Cache-Control','no-store').json({error:decision.reason});
  return next();
 };
 app.get('/api/quins/private/playbooks/ravens',requireAuth,check,(_req,res)=>{
  res.set('Cache-Control','no-store, private');
  res.set('X-Content-Type-Options','nosniff');
  return res.json({playbook:payload,visibility:'team-only',approvedByCoach:true});
 });
 return {enabled:enabled&&Boolean(payload),memberCount:allowed.size};
}
module.exports={parseAllowlist,authorizeQuins,installQuinsPlaybookRoutes};
