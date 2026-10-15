"use strict";
// Counts recorded guest check-ins, not taps, visitors, RSVPs, or bookings.
// Aggregate-only output: no names, emails, reflections, tokens, or row identifiers.
const SAFE=/^[a-z0-9_-]{1,64}$/;
function aggregateGuestCampaigns(records,eventId){
 const groups=new Map();let checkedIn=0,attributed=0;
 for(const record of records){
  if(record?.event!==eventId)continue;
  checkedIn++;
  const a=record.attribution;
  if(!a||typeof a!=="object")continue;
  const source=typeof a.utm_source==="string"&&SAFE.test(a.utm_source)?a.utm_source:null;
  const medium=typeof a.utm_medium==="string"&&SAFE.test(a.utm_medium)?a.utm_medium:null;
  const campaign=typeof a.utm_campaign==="string"&&SAFE.test(a.utm_campaign)?a.utm_campaign:null;
  if(!source&&!medium&&!campaign)continue;
  attributed++;
  const key=JSON.stringify([source,medium,campaign]);
  groups.set(key,(groups.get(key)||0)+1);
 }
 const campaigns=[...groups].map(([key,checkIns])=>{const [utm_source,utm_medium,utm_campaign]=JSON.parse(key);return{utm_source,utm_medium,utm_campaign,checkIns}}).sort((a,b)=>b.checkIns-a.checkIns||JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return{eventId,checkedIn,attributedCheckIns:attributed,unattributedCheckIns:checkedIn-attributed,campaigns};
}
module.exports={aggregateGuestCampaigns};
