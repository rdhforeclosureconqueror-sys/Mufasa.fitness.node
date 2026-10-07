"use strict";

const { scoreAssessment } = require("./scoring");
const QUICK_BANK_VERSION="0.1.1-phase4";
const QUICK_CONFIDENCE_CEILING=78;
const o=(text,primary,secondary,direction,activation)=>({text,primary_dimension:primary,secondary_dimension:secondary,direction_value:direction,activation_value:activation});

const QUICK_BANK=Object.freeze([
 {id:"SAQ01",class:"ID",prompt:"Right now, how settled do you feel in your body and surroundings?",options:[
  o("Very unsettled or on edge","GR","CL",1,1),o("Restless, but I can settle sometimes","CL","GR",0.6,1),o("Mostly steady and present","CO","GR",0.2,0),o("Calm, grounded, and here","GR","SP",0,-1)]},
 {id:"SAQ02",class:"BH",prompt:"When feelings build up, what usually happens?",options:[
  o("I hold them in until they feel heavy","EF","EX",1,-1),o("They spill out faster than I want","EF","GR",1,1),o("I can feel them without getting pulled under","CO","EF",0,0),o("I disconnect or go numb","GR","EF",1,-1)]},
 {id:"SAQ03",class:"SC",prompt:"After a demanding day, you finally get quiet time. What tends to happen?",options:[
  o("My mind keeps racing even though I want rest","CL","GR",1,1),o("I feel drained and have almost no drive","AG","EX",1,-1),o("Feelings I held back start coming up","EF","CO",1,0),o("I feel okay physically, but something feels missing","SP","CO",1,0)]},
 {id:"SAQ04",class:"BH",prompt:"When you need to say what you really mean, what is most like you?",options:[
  o("I usually hold back","EX","CO",1,-1),o("I say it, but sometimes too sharply","EX","GR",1,1),o("I can speak clearly and stay connected","CO","EX",0,0),o("I struggle to know what I want to say","CL","EX",1,-1)]},
 {id:"SAQ05",class:"ID",prompt:"How does your energy feel most days lately?",options:[
  o("Low, heavy, or hard to start","AG","GR",1,-1),o("Uneven — bursts followed by crashes","GR","AG",1,1),o("Steady enough for what I need to do","AG","CO",0,0),o("High, but hard to switch off","GR","AG",1,1)]},
 {id:"SAQ06",class:"SC",prompt:"When you have an important decision to make, what tends to happen?",options:[
  o("My thoughts get noisy and I second-guess myself","CL","GR",1,1),o("I know what matters but struggle to act","AG","CL",1,-1),o("I can usually see the next useful step","CL","AG",0,0),o("I look for a deeper sense of meaning before moving","SP","CL",1,0)]},
 {id:"SAQ07",class:"BH",prompt:"How connected do you feel to other people lately?",options:[
  o("Guarded or distant","CO","GR",1,-1),o("I want connection, but I do not have much room for it","CO","AG",1,-1),o("Connected without losing myself","GR","CO",0,0),o("I connect easily but sometimes absorb too much","CO","EF",1,1)]},
 {id:"SAQ08",class:"ID",prompt:"How connected do you feel to meaning, purpose, nature, ancestry, or something larger than yourself?",options:[
  o("Disconnected","SP","GR",1,-1),o("I miss that connection","SP","CO",1,-1),o("I feel some connection, but it comes and goes","CL","SP",0.4,0),o("I feel meaningfully connected","SP","CL",0,0)]},
 {id:"SAQ09",class:"ST",prompt:"When pressure rises, what happens first?",options:[
  o("My body gets tense or restless","GR","AG",1,1),o("My emotions become harder to manage","EF","GR",1,1),o("I shut down or lose energy","AG","EF",1,-1),o("I get stuck in my head","CL","EX",1,1)]},
 {id:"SAQ10",class:"DS",prompt:"What would you most like to feel after a sound session?",options:[
  o("Calm, safe, and grounded","GR","CL",1,-1),o("Lighter and more emotionally open","EF","CO",1,0),o("Clear, energized, and ready to move","AG","CL",1,0),o("Connected, expressive, and spiritually restored","SP","EX",1,0)]},
]);

function capQuickConfidence(score){return Math.min(QUICK_CONFIDENCE_CEILING,Math.max(0,Number(score)||0));}
function scoreQuickAssessment(answers={}){
 const scored=scoreAssessment(QUICK_BANK,answers);if(!scored.ok)return scored;
 return {...scored,result:{...scored.result,confidence:capQuickConfidence(scored.result.confidence),confidenceCeiling:QUICK_CONFIDENCE_CEILING,bankVersion:QUICK_BANK_VERSION,mode:"quick"}};
}
module.exports={QUICK_BANK_VERSION,QUICK_CONFIDENCE_CEILING,QUICK_BANK,capQuickConfidence,scoreQuickAssessment};
