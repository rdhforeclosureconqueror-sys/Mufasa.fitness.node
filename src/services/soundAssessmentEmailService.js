"use strict";
const crypto=require("node:crypto");
const DESTINATION="rdhforeclosureconqueror@gmail.com";
async function sendSoundAssessmentEmail({assessmentId,mode,createdAt,env=process.env,fetchImpl=globalThis.fetch}){
 const from=env.PRIVATE_SESSION_EMAIL_FROM||env.EVENT_EMAIL_FROM;
 if(!env.RESEND_API_KEY||!from)return {sent:false,reason:"not_configured"};
 const response=await fetchImpl("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":crypto.createHash("sha256").update("sound:"+assessmentId).digest("hex")},body:JSON.stringify({from,to:[DESTINATION],subject:"Milele Fit — "+(mode==="deep"?"Full":"Quick")+" Sound Assessment received",text:"A new "+mode+" sound assessment was saved.\nAssessment ID: "+assessmentId+"\nReceived: "+createdAt+"\nSign in to your administrator dashboard to review the record. No sensitive answers are included in this email."})});
 if(!response.ok)throw new Error("SOUND_EMAIL_PROVIDER_HTTP_"+response.status);
 return {sent:true};
}
module.exports={sendSoundAssessmentEmail};
