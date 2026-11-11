"use strict";
const { ApiError } = require("../lib/apiResponse");

const INTERESTS = Object.freeze(["yoga","meditation","sound_healing","pranayama","fitness","nutrition","community"]);
const GOALS = Object.freeze(["make_friends","reduce_stress","build_consistency","mindfulness","strength","confidence","recovery"]);
const OWN = Object.freeze(["displayName","bioShort","interests","goals","visibility","animationClip","colorTheme","backgroundImage"]);
const COLOR_THEMES = Object.freeze(["kente","indigo","sunset","earth","royal"]);
function invalid(field){ throw new ApiError("COMMUNITY_CARD_INVALID", "Invalid community card field: " + field, 400); }
function cleanText(v,field,max,required=false) {
  if (typeof v !== "string" || v.length > max*3) invalid(field);
  const value=v.trim();
  if ((required && !value) || value.length>max || /[\u0000-\u001f\u007f]/.test(value)) invalid(field);
  return value;
}
function choices(v, field, allowed) {
  if (!Array.isArray(v) || v.length>3 || new Set(v).size!==v.length || v.some(x=>typeof x!=="string" || !allowed.includes(x))) invalid(field);
  return v;
}
function optionalBackground(v) {
  if (v === null || v === undefined || v === "") return null;
  // The browser resizes uploads before sending. Keeping the encoded image bounded
  // protects the authenticated JSON endpoint and the canonical user record.
  if (typeof v !== "string" || v.length > 600000 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) invalid("backgroundImage");
  return v;
}
function createCommunityCardService({userStore,clock=()=>new Date()}) {
  if (!userStore?.loadUser || !userStore?.updateUser) throw new Error("Canonical userStore required");
  function get(userId) { const value=userStore.loadUser(userId).communityCard; return value && typeof value==="object" ? {...value} : null; }
  function save(userId,input) {
    if (!input || typeof input!=="object" || Array.isArray(input)) invalid("body");
    if (Object.keys(input).some(k=>!OWN.includes(k))) invalid("unknown");
    const card={
      schemaVersion:2,
      displayName:cleanText(input.displayName,"displayName",48,true),
      bioShort:cleanText(input.bioShort??"","bioShort",180),
      interests:choices(input.interests??[],"interests",INTERESTS),
      goals:choices(input.goals??[],"goals",GOALS),
      animationClip:input.animationClip==null || input.animationClip==="" ? null : cleanText(input.animationClip,"animationClip",120),
      colorTheme:COLOR_THEMES.includes(input.colorTheme) ? input.colorTheme : input.colorTheme==null ? "kente" : invalid("colorTheme"),
      backgroundImage:optionalBackground(input.backgroundImage),
      visibility:input.visibility==="members"?"members":input.visibility==="private"?"private":invalid("visibility"),
      updatedAt:clock().toISOString()
    };
    userStore.updateUser(userId,user=>{user.communityCard=card;return user;});
    return card;
  }
  // Only voluntary member-facing fields. Never return the canonical user record.
  function visibleToMember(userId){
    const card=get(userId);
    if (!card || card.visibility!=="members") return null;
    return {displayName:card.displayName,bioShort:card.bioShort,interests:[...card.interests],goals:[...card.goals]};
  }
  return Object.freeze({get,save,visibleToMember,INTERESTS,GOALS});
}
module.exports={createCommunityCardService,INTERESTS,GOALS};
