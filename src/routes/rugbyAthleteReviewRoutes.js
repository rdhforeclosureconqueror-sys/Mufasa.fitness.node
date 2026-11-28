'use strict';
function installRugbyAthleteReviewRoutes({app,requireAuth,service}){
 const wrap=handler=>(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try{return res.json({ok:true,data:handler(req)});}catch(error){
   const status=error.message==='Admin required'?403:error.message==='Invalid review selection'?400:error.message==='Athlete unavailable'?404:500;
   return res.status(status).json({ok:false,error:{message:status===500?'Athlete review unavailable':error.message}});
  }
 };
 app.get('/api/admin/rugby/athlete-reviews',requireAuth,wrap(req=>service.list(req.auth)));
 app.get('/api/admin/rugby/athlete-reviews/:athleteId',requireAuth,wrap(req=>service.read(req.auth,req.params.athleteId,req.query.stageId)));
}
module.exports={installRugbyAthleteReviewRoutes};
