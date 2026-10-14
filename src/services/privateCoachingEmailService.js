"use strict";
const crypto=require("node:crypto");
const DESTINATION="rdhforeclosureconqueror@gmail.com";
const names={personal_training:"Personal Training",yoga:"Yoga",pranayama:"Breathwork",meditation:"Meditation",sound_bowl:"Sound Bowl",integrated:"Integrated"};
async function sendPrivateCoachingEmail({quote,userId,env=process.env,fetchImpl=globalThis.fetch}){
 const from=env.PRIVATE_SESSION_EMAIL_FROM||env.EVENT_EMAIL_FROM;
 if(!env.RESEND_API_KEY||!from)return{sent:false,reason:"not_configured"};
 const clean=(v)=>String(v??"Not provided").replace(/[\r\n\x00-\x1f]/g," ").slice(0,1200);
 const subject="Milele Fit — New private session request";
 const lines=["A private session request was saved.","Services: "+quote.services.map(s=>names[s]||s).join(", "),"Contact phone: "+clean(quote.contactPhone),"Preferred schedule: "+clean(quote.preferredSchedule),"Location: "+clean(quote.locationPreference),"Sessions per week: "+clean(quote.sessionsPerWeek),"Payment preference: "+clean(quote.paymentPreference),"Budget: "+clean(quote.budgetRange),"Notes: "+clean(quote.notes),"Submitted: "+clean(quote.submittedAt),"View the client's details in your private trainer workspace."];
 const id=crypto.createHash("sha256").update(userId+":"+quote.submittedAt).digest("hex");
 const response=await fetchImpl("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":id},body:JSON.stringify({from,to:[DESTINATION],subject,text:lines.join("\n")})});
 if(!response.ok)throw Error("Email provider HTTP "+response.status);
 return{sent:true};
}
module.exports={sendPrivateCoachingEmail};
