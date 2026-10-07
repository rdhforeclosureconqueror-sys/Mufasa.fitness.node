"use strict";
const {PAIR_LIBRARY,validatePairLibrary}=require("./pair-library");
const {DIMENSIONS}=require("./domain");
const RECIPE_VERSION="0.1.0-phase7";
const GROUND="GR";
function pairFor(a,b){const notes=[DIMENSIONS[a].bowl,DIMENSIONS[b].bowl].sort();return PAIR_LIBRARY.find(p=>[...p.bowls].sort().join("-")===notes.join("-"))||null;}
function rank(scores){return Object.entries(scores||{}).sort((a,b)=>b[1]-a[1]);}
function selectSoundStrategy(scored,{desiredDimensions=[]}={}){
 const valid=validatePairLibrary();if(valid.STATUS!=="PASS")return {ok:false,diagnostic:valid};
 const ranked=rank(scored?.dimension_normalized);if(ranked.length<2)return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_RECIPE_UNRESOLVED",STAGE:"RECIPE",DETAIL:"At least two normalized dimensions are required."}};
 const [primary,secondary]=[ranked[0][0],ranked[1][0]];const activation=scored?.activation?.state||"REGULATED";
 let anchor=primary,partner=secondary,reasons=["PRIMARY_STATE","SECONDARY_STATE"];
 if(activation==="OVERACTIVATED"&&primary!==GROUND){anchor=GROUND;partner=primary;reasons.unshift("GROUND_BEFORE_EXPANSION");}
 else if(activation==="UNDERACTIVATED"&&primary===GROUND&&secondary==="AG"){anchor=GROUND;partner="AG";reasons.unshift("GENTLE_ACTIVATION");}
 if(anchor===partner)partner=secondary===anchor?(desiredDimensions.find(x=>x!==anchor)||"CO"):secondary;
 const pair=pairFor(anchor,partner);if(!pair)return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_RECIPE_UNRESOLVED",STAGE:"RECIPE",DETAIL:`No curated pair resolves ${anchor} + ${partner}.`}};
 const accents=ranked.map(([d])=>d).filter(d=>d!==anchor&&d!==partner).slice(0,2).map(d=>DIMENSIONS[d].bowl);
 return {ok:true,result:{recipeVersion:RECIPE_VERSION,primaryDimension:primary,secondaryDimension:secondary,activation,anchorDimension:anchor,partnerDimension:partner,pairId:pair.id,publicName:pair.publicName,bowls:pair.bowls,experientialDirection:pair.experientialDirection,accentNotes:accents,pulse:pair.suggestedPulse,bijaMantra:pair.bijaMantra,closing:pair.closingGroundingSequence,caution:pair.cautions,reasonCodes:reasons},diagnostic:{STATUS:"PASS",FIRST_FAILURE:"NONE",STAGE:"RECIPE",DETAIL:"Deterministic curated sound strategy resolved.",recipeVersion:RECIPE_VERSION}};
}
module.exports={RECIPE_VERSION,selectSoundStrategy,pairFor};
