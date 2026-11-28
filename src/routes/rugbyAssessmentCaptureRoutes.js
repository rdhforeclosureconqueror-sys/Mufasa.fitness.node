'use strict';
function installRugbyAssessmentCaptureRoutes({app,requireAuth,writeLimit,service}){
 const wrap=(fn,created=false)=>(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try{return res.status(created?201:200).json({ok:true,data:fn(req)});}catch(error){
   const status=[400,403,404,409].includes(error.status)?error.status:500;
   return res.status(status).json({ok:false,error:{message:status===500?'Assessment service unavailable':error.message}});
  }
 };
 app.get('/api/me/rugby/assessment-catalog',requireAuth,wrap(req=>service.catalog(req.auth)));
 app.get('/api/me/rugby/assessment-positions',requireAuth,wrap(req=>service.getPositions(req.auth,req.auth.userId)));
 app.post('/api/me/rugby/assessment-positions',requireAuth,writeLimit,wrap(req=>service.savePositions(req.auth,req.auth.userId,req.body)));
 app.get('/api/admin/rugby/athletes/:athleteId/assessment-positions',requireAuth,wrap(req=>service.adminGetPositions(req.auth,req.params.athleteId)));
 app.post('/api/admin/rugby/athletes/:athleteId/assessment-positions',requireAuth,writeLimit,wrap(req=>service.adminSavePositions(req.auth,req.params.athleteId,req.body)));
 app.get('/api/me/rugby/assessment-records',requireAuth,wrap(req=>service.read(req.auth,req.auth.userId)));
 app.post('/api/me/rugby/assessment-records',requireAuth,writeLimit,wrap(req=>service.record(req.auth,req.auth.userId,req.body),true));
 app.post('/api/admin/rugby/assessment-catalog',requireAuth,writeLimit,wrap(req=>service.configure(req.auth,req.body),true));
 app.get('/api/admin/rugby/athletes/:athleteId/assessment-records',requireAuth,wrap(req=>service.adminRead(req.auth,req.params.athleteId)));
 app.post('/api/admin/rugby/athletes/:athleteId/assessment-records',requireAuth,writeLimit,wrap(req=>service.adminRecord(req.auth,req.params.athleteId,req.body),true));
}
module.exports={installRugbyAssessmentCaptureRoutes};
