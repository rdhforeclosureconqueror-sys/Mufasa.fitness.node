'use strict';
const {validateProfile}=require('../rugby/profileValidation');
const {validateAssessment}=require('../rugby/assessmentValidation');
const {randomUUID}=require('node:crypto');
const {validateCheckin}=require('../rugby/checkinValidation');
const {makePlan}=require('../rugby/inSeasonPlan');
function installRugbyProfileRoutes({app,requireAuth,userStore}) {
 app.get('/api/me/rugby/checkins',requireAuth,(req,res)=>{
  res.set('Cache-Control','private, no-store');
  const user=userStore.loadUser(req.auth.userId);
  return res.json({ok:true,data:user.rugbyCheckins||[]});
 });
 app.post('/api/me/rugby/checkins',requireAuth,(req,res)=>{
  res.set('Cache-Control','private, no-store');
  let input;
  try{input=validateCheckin(req.body);}catch(error){return res.status(400).json({ok:false,error:{message:error.message}});}
  // No club match schedule has been verified for this player yet. Do not assume a match-free week.
  const plan=makePlan({week:input.week,today:input.date,readiness:input.readiness,injuryConcern:input.injuryConcern,teamHighLoad:input.teamHighLoad,matchDates:[]});
  const entry={...input,plan,recordedAt:new Date().toISOString()};
  try{userStore.updateUser(req.auth.userId,user=>{
   const existing=user.rugbyCheckins||[];
   const next=existing.filter(item=>item.date!==input.date);
   if(next.length>=180)throw Error('Check-in limit reached');
   user.rugbyCheckins=[...next,entry];
   return user;
  });}catch(error){return res.status(400).json({ok:false,error:{message:'Unable to save check-in'}});}
  return res.status(201).json({ok:true,data:entry,matchScheduleVerified:false});
 });
 app.get('/api/me/rugby/assessments',requireAuth,(req,res)=>{
  res.set('Cache-Control','private, no-store');
  const user=userStore.loadUser(req.auth.userId);
  return res.json({ok:true,data:user.rugbyAssessments||[]});
 });
 app.post('/api/me/rugby/assessments',requireAuth,(req,res)=>{
  res.set('Cache-Control','private, no-store');
  let item;
  try{item=validateAssessment(req.body);}
  catch(error){return res.status(400).json({ok:false,error:{message:error.message}});}
  const entry={...item,id:randomUUID(),source:'athlete_self_report',verified:false,recordedAt:new Date().toISOString()};
  try{userStore.updateUser(req.auth.userId,user=>{
   const existing=user.rugbyAssessments||[];
   if(existing.length>=200)throw Error('Assessment limit reached');
   user.rugbyAssessments=[...existing,entry];
   return user;
  });}catch(error){return res.status(400).json({ok:false,error:{message:'Unable to save assessment'}});}
  return res.status(201).json({ok:true,data:entry});
 });
 app.get('/api/me/rugby/profile',requireAuth,(req,res)=>{
  res.set('Cache-Control','private, no-store');
  const user=userStore.loadUser(req.auth.userId);
  return res.json({ok:true,data:user.rugbyProfile||null});
 });
 app.put('/api/me/rugby/profile',requireAuth,(req,res)=>{
  res.set('Cache-Control','private, no-store');
  let profile;
  try {profile=validateProfile(req.body);}
  catch(error){return res.status(400).json({ok:false,error:{message:error.message}});}
  userStore.updateUser(req.auth.userId,user=>{user.rugbyProfile=profile;return user;});
  return res.json({ok:true,data:profile});
 });
}
module.exports={installRugbyProfileRoutes};
