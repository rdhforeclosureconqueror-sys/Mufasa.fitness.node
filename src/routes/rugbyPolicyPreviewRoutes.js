'use strict';
// Explicit dependency injection: no default store, no production activation.
function installRugbyPolicyPreviewRoutes({app,requireAuth,policyService}){
 if(!policyService||typeof requireAuth!=='function')throw Error('Trusted policy dependencies required');
 const wrap=fn=>async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try{return res.json({ok:true,data:await fn(req)});}
  catch(e){
   const message=e.message;
   if(message==='Policy admin required')return res.status(403).json({ok:false,error:'Admin required'});
   if(message==='Policy owner required')return res.status(403).json({ok:false,error:'Owner required'});
   if(message==='Version conflict')return res.status(409).json({ok:false,error:'Version conflict'});
   if(/^(Invalid stage sequence|Invalid minimum score|Invalid observation window|Invalid competency dimensions|Invalid contexts|Audit context required)$/.test(message))return res.status(400).json({ok:false,error:message});
   return res.status(500).json({ok:false,error:'Policy preview unavailable'});
  }
 };
 app.get('/api/admin/rugby/policy-preview',requireAuth,wrap(async req=>{
  const current=(await policyService.read(req.auth)).at(-1);
  return {version:current.version,policy:current.policy};
 }));
 app.post('/api/admin/rugby/policy-preview',requireAuth,wrap(async req=>{
  const body=req.body||{};
  return policyService.preview(req.auth,{policy:body.policy,expectedVersion:body.expectedVersion,reason:body.reason});
 }));
}
module.exports={installRugbyPolicyPreviewRoutes};
