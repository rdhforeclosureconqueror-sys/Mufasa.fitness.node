"use strict";

const { BOWLS } = require("./domain");

const INTERVALS = Object.freeze({
  "C-D":"major second","C-E":"major third","C-F":"perfect fourth","C-G":"perfect fifth","C-A":"major sixth","C-B":"major seventh",
  "D-E":"major second","D-F":"minor third","D-G":"perfect fourth","D-A":"perfect fifth","D-B":"major sixth",
  "E-F":"minor second","E-G":"minor third","E-A":"perfect fourth","E-B":"perfect fifth",
  "F-G":"major second","F-A":"major third","F-B":"augmented fourth","G-A":"major second","G-B":"major third","A-B":"major second",
});

const CURATED = Object.freeze({
 "C-D":{name:"Grounded Flow",direction:"stability into emotional movement",anchor:"HIGH",pulse:"Slow alternating pulse; C returns as home.",caution:"Useful when rigidity needs movement; reduce D activity when the participant is already emotionally flooded."},
 "C-E":{name:"Grounded Power",direction:"stability into agency",anchor:"HIGH",pulse:"Steady C foundation with measured E accents.",caution:"Do not use E as an activating push when agitation or anger is already high."},
 "C-F":{name:"Safe Opening",direction:"safety into connection",anchor:"HIGH",pulse:"Long C decay followed by spacious F responses.",caution:"Favor containment and choice when grief or vulnerability is intense."},
 "C-G":{name:"Grounded Truth",direction:"embodiment into expression",anchor:"HIGH",pulse:"Stable C/G call-and-response with generous decay.",caution:"Invite expression; never pressure disclosure."},
 "C-A":{name:"Grounded Clarity",direction:"embodiment into insight",anchor:"HIGH",pulse:"C anchors; A appears as a light, infrequent accent.",caution:"Keep C dominant when the participant is already overthinking or dissociative."},
 "C-B":{name:"Earth & Spirit",direction:"embodiment into transcendence",anchor:"HIGH",pulse:"Sparse B over a strong C reference; use silence deliberately.",caution:"Treat as a polarity/ceremonial pairing; return clearly to C before closing."},
 "D-E":{name:"Flow Into Action",direction:"feeling into purposeful movement",anchor:"CONDITIONAL",pulse:"Gentle D/E alternation with an unhurried tempo.",caution:"Avoid escalating tempo when emotion and activation are both high."},
 "D-F":{name:"Compassionate Flow",direction:"emotional movement into connection",anchor:"CONDITIONAL",pulse:"Rolling D with warm F responses.",caution:"Allow emotional movement without implying that release must occur."},
 "D-G":{name:"Expressed Feeling",direction:"emotion into authentic expression",anchor:"CONDITIONAL",pulse:"D establishes flow; G answers in predictable phrases.",caution:"Expression may be internal; do not require speaking or vocalization."},
 "D-A":{name:"Flowing Insight",direction:"emotional movement into observation",anchor:"CONDITIONAL",pulse:"Soft D bed with occasional A accents and silence.",caution:"If the participant becomes more cerebral, reintroduce C before continuing."},
 "D-B":{name:"Sacred Flow",direction:"feeling into meaning and spiritual connection",anchor:"CONDITIONAL",pulse:"Spacious D/B phrases with long silent intervals.",caution:"Use spiritual language according to participant preference; ground afterward."},
 "E-F":{name:"Courageous Heart",direction:"agency into openness",anchor:"CONDITIONAL",pulse:"Measured E pulse softened by longer F resonance.",caution:"The close interval can feel tense; use lower intensity for overstimulated participants."},
 "E-G":{name:"Courageous Expression",direction:"agency into voice",anchor:"CONDITIONAL",pulse:"Purposeful E/G phrases with consistent spacing.",caution:"Do not equate confidence with volume or pressure the participant to speak."},
 "E-A":{name:"Purposeful Clarity",direction:"agency into discernment",anchor:"CONDITIONAL",pulse:"E establishes intention; A creates reflective space.",caution:"When activation is high, slow the pattern and add C before intensifying."},
 "E-B":{name:"Purpose & Meaning",direction:"agency into spiritual purpose",anchor:"CONDITIONAL",pulse:"Stable E with sparse B accents and silence.",caution:"Avoid framing ordinary uncertainty as spiritual deficiency."},
 "F-G":{name:"Heartfelt Expression",direction:"connection into expression",anchor:"CONDITIONAL",pulse:"F sustains warmth; G enters as a gentle response.",caution:"Keep disclosure optional and participant-led."},
 "F-A":{name:"Compassionate Insight",direction:"connection into clarity",anchor:"CONDITIONAL",pulse:"Long F resonance with light A accents.",caution:"If grief is acute, favor F and grounding rather than pushing interpretation."},
 "F-B":{name:"Heart & Spirit",direction:"connection into transcendence",anchor:"CONDITIONAL",pulse:"Broad F resonance, sparse B, then silence.",caution:"Use participant-compatible spiritual framing and finish with grounding."},
 "G-A":{name:"Clear Expression",direction:"expression into discernment",anchor:"CONDITIONAL",pulse:"Predictable G/A call-and-response.",caution:"For racing thoughts, reduce A emphasis and add grounding."},
 "G-B":{name:"Sacred Voice",direction:"expression into meaning",anchor:"CONDITIONAL",pulse:"G establishes voice; B enters sparingly with silence.",caution:"Never present spiritual interpretation as a diagnosis or demand vocal participation."},
 "A-B":{name:"Insight & Spirit",direction:"inner observation into transcendence",anchor:"LOW",pulse:"Very sparse A/B accents separated by substantial silence.",caution:"Not a default opening foundation for highly mental, ungrounded, or overstimulated states; ground before closing."},
});

function bowl(note){return BOWLS.find(x=>x.note===note);}
const PAIR_LIBRARY=Object.freeze(Object.entries(CURATED).map(([key,c])=>{
 const [a,b]=key.split("-"),left=bowl(a),right=bowl(b);
 return Object.freeze({
  id:`SA_PAIR_${a}_${b}`,publicName:c.name,bowls:Object.freeze([a,b]),interval:INTERVALS[key],
  dimensions:Object.freeze([left.dimension,right.dimension]),symbolism:`${left.element} + ${right.element}; ${left.chakra} + ${right.chakra}`,
  experientialDirection:c.direction,
  underactivationUse:`Use ${a} as the reference and introduce ${b} gradually; allow the pulse to become slightly more present only when engagement is welcome.`,
  overactivationUse:`Reduce density, lengthen silence, and favor grounding/regulation before increasing ${b} activity.`,
  anchorSuitability:c.anchor,accentSuitability:"YES",transitionSuitability:"YES",cautions:c.caution,suggestedPulse:c.pulse,
  bijaMantra:`${left.bija} → ${right.bija}`,closingGroundingSequence:`${b} → ${a} → C`,
  shortCustomerDescription:`${c.name}: a sound journey from ${c.direction}.`,
  practitionerInterpretation:`Pair ${a}/${b} when the profile combines ${left.dimension} and ${right.dimension}. ${c.caution} Activation state controls pacing, density, and whether grounding precedes the pair.`,
 });
}));

function validatePairLibrary(library=PAIR_LIBRARY){
 const required=["id","publicName","interval","symbolism","experientialDirection","underactivationUse","overactivationUse","anchorSuitability","accentSuitability","transitionSuitability","cautions","suggestedPulse","bijaMantra","closingGroundingSequence","shortCustomerDescription","practitionerInterpretation"];
 const ids=new Set(),combos=new Set(),names=new Set();
 for(const pair of library){
  if(!pair||!Array.isArray(pair.bowls)||!Array.isArray(pair.dimensions)||pair.bowls.length!==2||pair.dimensions.length!==2||required.some(k=>!pair[k]))
   return {STATUS:"FAIL",FIRST_FAILURE:"SA_PAIR_MISSING",STAGE:"PAIR_LIBRARY",DETAIL:"Pair record missing required curated content."};
  const combo=[...pair.bowls].sort().join("-");
  if(ids.has(pair.id)||combos.has(combo)||names.has(pair.publicName))
   return {STATUS:"FAIL",FIRST_FAILURE:"SA_PAIR_MISSING",STAGE:"PAIR_LIBRARY",DETAIL:"Duplicate pair ID, name, or unordered bowl combination."};
  ids.add(pair.id);combos.add(combo);names.add(pair.publicName);
 }
 if(library.length!==21) return {STATUS:"FAIL",FIRST_FAILURE:"SA_PAIR_MISSING",STAGE:"PAIR_LIBRARY",DETAIL:`Expected 21 curated pair records; received ${library.length}.`};
 return {STATUS:"PASS",FIRST_FAILURE:"NONE",STAGE:"PAIR_LIBRARY",DETAIL:"21/21 unique curated unordered bowl pairs loaded.",pairCount:21};
}
module.exports={PAIR_LIBRARY,validatePairLibrary};
