"use strict";

const { BOWLS } = require("./domain");

const INTERVALS = Object.freeze({
  "C-D":"major second","C-E":"major third","C-F":"perfect fourth","C-G":"perfect fifth","C-A":"major sixth","C-B":"major seventh",
  "D-E":"major second","D-F":"minor third","D-G":"perfect fourth","D-A":"perfect fifth","D-B":"major sixth",
  "E-F":"minor second","E-G":"minor third","E-A":"perfect fourth","E-B":"perfect fifth",
  "F-G":"major second","F-A":"major third","F-B":"augmented fourth",
  "G-A":"major second","G-B":"major third","A-B":"major second",
});

const INTENT = Object.freeze({
  GR:"ground and stabilize", EF:"restore emotional movement", AG:"support agency and purposeful energy",
  CO:"support openness and connection", EX:"support authentic expression", CL:"create space for clarity",
  SP:"support meaning and spiritual connection",
});

function makePair(left,right) {
  const key=`${left.note}-${right.note}`;
  return Object.freeze({
    id:`SA_PAIR_${left.note}_${right.note}`,
    publicName:`${left.chakra} + ${right.chakra}`,
    bowls:Object.freeze([left.note,right.note]),
    interval:INTERVALS[key],
    dimensions:Object.freeze([left.dimension,right.dimension]),
    symbolism:`${left.element} + ${right.element}; ${left.chakra} + ${right.chakra}`,
    experientialDirection:`${INTENT[left.dimension]}; then ${INTENT[right.dimension]}`,
    underactivationUse:`Use ${left.note} as a steady foundation and introduce ${right.note} gradually to invite engagement.`,
    overactivationUse:`Slow the pulse, increase silence, and favor the more regulating of ${left.note}/${right.note}; do not intensify by default.`,
    anchorSuitability:left.note === "C" ? "HIGH" : "CONDITIONAL",
    accentSuitability:"YES",
    transitionSuitability:"YES",
    cautions:"Do not interpret this pairing as diagnosis or guaranteed treatment; adjust intensity to participant response.",
    suggestedPulse:"Slow, spacious strikes with full decay; increase silence when activation is high.",
    bijaMantra:`${left.bija} → ${right.bija}`,
    closingGroundingSequence:`${right.note} → ${left.note} → C`,
    shortCustomerDescription:`A ${left.chakra.toLowerCase()} and ${right.chakra.toLowerCase()} pairing intended to move from ${INTENT[left.dimension]} toward ${INTENT[right.dimension]}.`,
    practitionerInterpretation:`Use ${left.note} as the initial reference and ${right.note} as partner/accent when the profile combines ${left.dimension} and ${right.dimension}. Activation state controls pacing and intensity.`,
  });
}
const PAIRS=[];
for(let i=0;i<BOWLS.length;i++) for(let j=i+1;j<BOWLS.length;j++) PAIRS.push(makePair(BOWLS[i],BOWLS[j]));
const PAIR_LIBRARY=Object.freeze(PAIRS);
function validatePairLibrary(library=PAIR_LIBRARY){
  const ids=new Set(), combos=new Set();
  for(const pair of library){
    if(!pair.id||!pair.publicName||!pair.interval||pair.bowls.length!==2||pair.dimensions.length!==2) return {STATUS:"FAIL",FIRST_FAILURE:"SA_PAIR_MISSING",STAGE:"PAIR_LIBRARY",DETAIL:"Pair record missing required identity, interval, bowls, or dimensions."};
    const combo=[...pair.bowls].sort().join("-");
    if(ids.has(pair.id)||combos.has(combo)) return {STATUS:"FAIL",FIRST_FAILURE:"SA_PAIR_MISSING",STAGE:"PAIR_LIBRARY",DETAIL:"Duplicate pair identity or unordered bowl combination."};
    ids.add(pair.id); combos.add(combo);
  }
  if(library.length!==21) return {STATUS:"FAIL",FIRST_FAILURE:"SA_PAIR_MISSING",STAGE:"PAIR_LIBRARY",DETAIL:`Expected 21 curated pair records; received ${library.length}.`};
  return {STATUS:"PASS",FIRST_FAILURE:"NONE",STAGE:"PAIR_LIBRARY",DETAIL:"21/21 unique unordered bowl pairs loaded.",pairCount:library.length};
}
module.exports={PAIR_LIBRARY,validatePairLibrary};