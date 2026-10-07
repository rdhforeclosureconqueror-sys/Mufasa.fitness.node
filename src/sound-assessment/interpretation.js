"use strict";
const {CUSTOMER_DIMENSIONS,ACTIVATION_COPY,confidenceLabel}=require("./quick-result");
const {scoreQuickAssessment}=require("./quick-bank");
const {scoreDeepAssessment}=require("./deep-bank");
const {selectSoundStrategy}=require("./recipe-engine");
const INTERACTIONS={
 "CL|GR":"When mental activity and grounding show up together, clearer thinking may be easier after your attention and body have had a chance to settle.",
 "EF|GR":"When emotional pressure and grounding show up together, creating steadiness may make it easier to notice feelings without becoming overwhelmed by them.",
 "AG|GR":"When energy and grounding show up together, the useful question is often whether you need gentle activation or a steadier place to direct the energy you already have.",
 "CO|GR":"When connection and grounding show up together, feeling centered in yourself may support openness without feeling pulled too far outward.",
 "EX|GR":"When expression and grounding show up together, settling first may make it easier to recognize and communicate what you actually want to say.",
 "CL|EF":"When mental clarity and emotional flow show up together, thoughts and feelings may be competing for attention. Naming what is present can sometimes make the next step easier to see.",
 "AG|CL":"When clarity and motivation show up together, knowing the next step and having the energy to take it may be influencing one another.",
 "CO|EF":"When emotional flow and connection show up together, how much you are carrying internally may affect how open or available you feel with other people.",
 "EF|EX":"When emotion and expression show up together, the pattern may involve not only what you feel, but how easily those feelings can be recognized or communicated.",
 "CL|SP":"When clarity and meaning show up together, uncertainty may be less about a single decision and more about reconnecting with what matters to you."
};
function interaction(a,b){const key=[a,b].sort().join("|");return INTERACTIONS[key]||`${CUSTOMER_DIMENSIONS[a].label} and ${CUSTOMER_DIMENSIONS[b].label} both appeared strongly. The Full Assessment helps determine whether one is driving the other or whether they are separate needs showing up at the same time.`;}
function ranked(result){return Object.entries(result.dimension_normalized).sort((a,b)=>b[1]-a[1]);}
function section(title,preview,detail){return {title,preview,detail,actionLabel:"Read more",collapsedByDefault:true};}
function interpret(scored,{mode="quick"}={}){
 const r=ranked(scored),[p,s]=[r[0][0],r[1][0]],P=CUSTOMER_DIMENSIONS[p],S=CUSTOMER_DIMENSIONS[s],act=ACTIVATION_COPY[scored.activation.state]||ACTIVATION_COPY.REGULATED;
 const quick=mode==="quick";
 return {primary:{label:P.label},secondary:{label:S.label},
 summary:`Based on your answers, ${P.label} appears to be one of the stronger areas asking for support right now. ${S.label} also showed up as a meaningful secondary pattern.`,
 sections:[
  section(`Why ${P.label} showed up`,P.preview,`${P.detail} Several of your responses contributed to this pattern. This does not mean something is wrong; it means this area stood out relative to the other areas measured in this assessment.`),
  section(`How ${S.label} connects`,interaction(p,s),`${S.detail} Looking at these two patterns together gives more context than either score alone. ${quick?"The Full Assessment checks the relationship from additional angles before treating it as a stable pattern.":"Your longer assessment gives us more evidence for interpreting how these themes interact."}`),
  section("Your energy pattern",act.preview,`${act.detail} This matters because two people can want the same outcome while needing a different starting direction.`)
 ],
 confidence:{score:scored.confidence,label:confidenceLabel(scored.confidence),note:quick?"This 10-question reading is directional rather than final. The Full Assessment checks the pattern from more angles and adds consistency evidence.":"The longer assessment uses more evidence and consistency checks, but it remains a wellness interpretation rather than a diagnosis."},
 cta:quick?{title:"Want to know what's underneath the pattern?",preview:"Your Quick Assessment identified a possible direction. The Full Sound Assessment checks related answers from multiple angles, compares patterns for consistency, and looks more closely at your current state and how you want to feel.",actionLabel:"Take the Full Assessment"}:null};
}
function buildQuickInterpretation(answers){const x=scoreQuickAssessment(answers);if(!x.ok)return x;if(x.result.answeredCountTotal!==x.result.questionCountTotal)return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_ANSWER_MISSING",STAGE:"PROFILE",DETAIL:"Complete all 10 Quick Assessment questions before building an interpretation."}};return {ok:true,result:interpret(x.result,{mode:"quick"})};}
function buildDeepInterpretation(answers){const x=scoreDeepAssessment(answers);if(!x.ok)return x;if(x.result.answeredCountTotal!==x.result.questionCountTotal)return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_ANSWER_MISSING",STAGE:"PROFILE",DETAIL:"Complete all 25 Deep Assessment questions before building an interpretation."}};const interpretation=interpret(x.result,{mode:"deep"}),recipe=selectSoundStrategy(x.result,{desiredDimensions:(x.result.desiredState||[]).map(d=>d.dimension)});return recipe.ok?{ok:true,result:{...interpretation,soundFoundation:recipe.result}}:recipe;}
module.exports={INTERACTIONS,interaction,interpret,buildQuickInterpretation,buildDeepInterpretation};
