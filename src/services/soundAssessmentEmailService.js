"use strict";
const crypto=require("node:crypto");
const DESTINATION="rdhforeclosureconqueror@gmail.com";
function valueText(value){
 if(value==null||value==="")return "";
 if(typeof value==="string"||typeof value==="number")return String(value);
 if(Array.isArray(value))return value.map(valueText).filter(Boolean).join(", ");
 if(typeof value==="object")return value.label||value.name||value.title||value.preview||"";
 return "";
}
function addField(lines,label,value){const text=valueText(value);if(text)lines.push(label+": "+text);}
function buildSoundAssessmentEmailText({assessmentId,mode,createdAt,result}){
 const lines=["Milele Fit — "+(mode==="deep"?"Full":"Quick")+" Sound Assessment","Assessment ID: "+assessmentId,"Received: "+createdAt,"","ASSESSMENT OVERVIEW"];
 addField(lines,"Primary focus",result?.primary);
 addField(lines,"Secondary focus",result?.secondary);
 addField(lines,"Summary",result?.summary);
 if(Array.isArray(result?.sections)&&result.sections.length){
  lines.push("","YOUR ASSESSMENT BREAKDOWN");
  result.sections.forEach((section,index)=>{
   lines.push("",(index+1)+". "+valueText(section.title));
   if(section.preview)lines.push(valueText(section.preview));
   if(section.detail)lines.push(valueText(section.detail));
  });
 }
 if(result?.soundPreview||result?.soundFoundation){
  lines.push("","SOUND SESSION GUIDANCE");
  if(result.soundPreview){
   addField(lines,"Direction",result.soundPreview.title);
   addField(lines,"Starting intention",result.soundPreview.preview);
   addField(lines,"Practitioner notes",result.soundPreview.detail);
  }
  const foundation=result.soundFoundation;
  if(foundation){
   addField(lines,"Foundation",foundation.name);
   if(Array.isArray(foundation.bowls))foundation.bowls.forEach((bowl,index)=>{
    const name=typeof bowl==="string"?bowl:(bowl?.name||bowl?.label||bowl?.chakra||"Bowl "+(index+1));
    lines.push("Bowl "+(index+1)+": "+name);
    if(bowl&&typeof bowl==="object"){
     for(const key of ["note","frequency","role","purpose"])addField(lines,"  "+key[0].toUpperCase()+key.slice(1),bowl[key]);
    }
   });
   for(const [label,key] of [["Direction","direction"],["Accent notes","accentNotes"],["Pulse","pulse"],["Bija mantra","bijaMantra"],["Closing","closing"]])addField(lines,label,foundation[key]);
  }
 }
 if(result?.confidence){
  lines.push("","INTERPRETATION CONFIDENCE");
  addField(lines,"Level",result.confidence.label);
  addField(lines,"Context",result.confidence.note);
 }
 if(result?.cta){
  lines.push("","SUGGESTED NEXT STEP");
  addField(lines,"Next step",result.cta.title);
  addField(lines,"Why",result.cta.preview);
 }
 lines.push("","This message includes the interpretation, not the individual answers.","Assessment records are saved by Milele Fit.");
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
