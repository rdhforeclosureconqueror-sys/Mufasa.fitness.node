'use strict';
const {validateProfile}=require('../rugby/profileValidation');
function installRugbyProfileRoutes({app,requireAuth,userStore}) {
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
