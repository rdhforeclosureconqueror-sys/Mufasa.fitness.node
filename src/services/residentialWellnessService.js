"use strict";

const INTERESTS = Object.freeze(["run_walk","yoga","sound_bath","meditation_breathwork","mobility","personal_training","general_wellness"]);
const CAMPAIGNS = Object.freeze({ "LYLE-OCT26": { channel:"nfc", market:"addison", label:"Residential NFC pilot" } });
const iso = clock => new Date(clock()).toISOString();
const clean = (value,max=160) => String(value == null ? "" : value).trim().slice(0,max);

function createResidentialWellnessService({ userStore, clock=()=>Date.now() }) {
  if(!userStore || typeof userStore.loadUser!=="function" || typeof userStore.updateUser!=="function") throw new Error("Residential wellness requires canonical userStore");
  const campaign = value => {
    const code=clean(value,40).toUpperCase();
    return code && CAMPAIGNS[code] ? code : null;
  };
  const normalizeInterests = value => {
    if(!Array.isArray(value)) throw new Error("Choose at least one wellness interest");
    const interests=[...new Set(value.map(v=>clean(v,40)).filter(v=>INTERESTS.includes(v)))];
    if(!interests.length) throw new Error("Choose at least one wellness interest");
    return interests;
  };
  function get(userId){
    const user=userStore.loadUser(userId);
    return user?.residentialWellness || null;
  }
  function save(userId,input={}){
    if(input.communicationConsent!==true) throw new Error("Permission to send wellness and event updates is required");
    const interests=normalizeInterests(input.interests);
    const requestedCampaign=clean(input.campaign,40).toUpperCase();
    if(requestedCampaign && !CAMPAIGNS[requestedCampaign]) throw new Error("Campaign code is not recognized");
    const now=iso(clock());
    let result;
    userStore.updateUser(userId,user=>{
      const previous=user.residentialWellness || {};
      const firstCampaign=previous.attribution?.campaign || campaign(requestedCampaign);
      user.residentialWellness={
        schemaVersion:1,
        interests,
        communicationConsent:true,
        communicationConsentAt:previous.communicationConsentAt || now,
        communityInviteConsent:input.communityInviteConsent===true,
        attribution:firstCampaign ? { campaign:firstCampaign, channel:CAMPAIGNS[firstCampaign].channel, capturedAt:previous.attribution?.capturedAt || now } : null,
        createdAt:previous.createdAt || now,
        updatedAt:now
      };
      result=structuredClone(user.residentialWellness);
      return user;
    });
    return result;
  }
  function diagnostic(userId){
    const profile=get(userId);
    const checks=[
      {id:"profile",result:profile?"PASS":"FAIL"},
      {id:"interests",result:profile?.interests?.length?"PASS":"FAIL"},
      {id:"communication_consent",result:profile?.communicationConsent===true?"PASS":"FAIL"},
      {id:"campaign_allowlist",result:!profile?.attribution?.campaign || Boolean(CAMPAIGNS[profile.attribution.campaign])?"PASS":"FAIL"}
    ];
    return {diagnosticVersion:"residential-wellness-v1",firstFailure:checks.find(x=>x.result==="FAIL")?.id||null,checks};
  }
  return { get,save,diagnostic,INTERESTS,CAMPAIGNS };
}
module.exports={createResidentialWellnessService,INTERESTS,CAMPAIGNS};
