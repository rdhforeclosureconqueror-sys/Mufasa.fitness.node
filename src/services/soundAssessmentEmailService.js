"use strict";
const crypto=require("node:crypto");
const DESTINATION="rdhforeclosureconqueror@gmail.com";
function describe(value){
 if(value==null||value==="")return "Not available";
 if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value);
 if(Array.isArray(value))return value.map((item,i)=>"  "+(i+1)+". "+describe(item)).join("\n");
 if(typeof value==="object")return Object.entries(value).map(([key,item])=>key+": "+describe(item)).join("\n");
 return String(value);
}
function buildSoundAssessmentEmailText({assessmentId,mode,createdAt,result}){
 const lines=[
  "Milele Fit — "+(mode==="deep"?"Full":"Quick")+" Sound Assessment",
  "Assessment ID: "+assessmentId,
  "Received: "+createdAt,
  "",
  "ASSESSMENT INTERPRETATION",
  "Primary: "+describe(result?.primary),
  "Secondary: "+describe(result?.secondary),
  "Summary: "+describe(result?.summary),
  "",
  "SECTION BREAKDOWN",
  describe(result?.sections),
  "",
  "SOUND SESSION GUIDANCE",
  "Sound preview: "+describe(result?.soundPreview),
  "Sound foundation: "+describe(result?.soundFoundation),
  "",
  "Confidence: "+describe(result?.confidence),
  "Suggested next step: "+describe(result?.cta),
  "",
  "This email contains the interpretation, not the raw question-by-question answers.",
  "Assessment records are also saved by the Milele Fit backend."
 ];
 return lines.join("\n");
}
async function sendSoundAssessmentEmail({assessmentId,mode,createdAt,result,env=process.env,fetchImpl=globalThis.fetch}){
 const from=env.PRIVATE_SESSION_EMAIL_FROM||env.EVENT_EMAIL_FROM;
 if(!env.RESEND_API_KEY||!from)return {sent:false,reason:"not_configured"};
 const response=await fetchImpl("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":crypto.createHash("sha256").update("sound:"+assessmentId).digest("hex")},body:JSON.stringify({from,to:[DESTINATION],subject:"Milele Fit — "+(mode==="deep"?"Full":"Quick")+" Sound Assessment received",text:buildSoundAssessmentEmailText({assessmentId,mode,createdAt,result})})});
 if(!response.ok)throw new Error("SOUND_EMAIL_PROVIDER_HTTP_"+response.status);
 return {sent:true};
}
module.exports={sendSoundAssessmentEmail,buildSoundAssessmentEmailText};
