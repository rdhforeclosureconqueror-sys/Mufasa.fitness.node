'use strict';
function installRugbyDevelopmentPriorityRoutes({app,requireAuth,writeLimit,service}){
 const wrap=(fn,created=false)=>(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try{return res.status(created?201:200).json({ok:true,data:fn(req)});}catch(error){
   const status=[400,403,404,409].includes(error.status)?error.status:500;
   return res.status(status).json({ok:false,error:{message:status===500?'Development review unavailable':error.message}});
  }
 };
 app.get('/api/admin/rugby/athletes/:athleteId/development-priorities',requireAuth,wrap(req=>service.view(req.auth,req.params.athleteId)));
 app.post('/api/admin/rugby/athletes/:athleteId/development-priorities',requireAuth,writeLimit,wrap(req=>service.save(req.auth,req.params.athleteId,req.body),true));
}
module.exports={installRugbyDevelopmentPriorityRoutes};
