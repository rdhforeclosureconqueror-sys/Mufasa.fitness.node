"use strict";

const { DIMENSIONS, ACTIVATION_STATES } = require("./domain");
const { scoreQuickAssessment } = require("./quick-bank");

const CUSTOMER_DIMENSIONS=Object.freeze({
 GR:{label:"Grounding & Calm",preview:"How steady, safe, and present you feel in your body and surroundings.",detail:"This area reflects how easily you can settle, feel present, and return to a sense of steadiness when life feels demanding."},
 EF:{label:"Emotional Release",preview:"How freely feelings can move without becoming overwhelming or getting stuck.",detail:"This area reflects your relationship with emotion — whether feelings can be noticed and expressed, or tend to build up, spill over, or go numb."},
 AG:{label:"Energy & Motivation",preview:"How available your energy, drive, and ability to take the next step feel right now.",detail:"This area reflects your sense of usable energy and forward movement, including feeling depleted, inconsistent, steady, or ready for action."},
 CO:{label:"Connection & Openness",preview:"How connected and receptive you feel while still maintaining your own center.",detail:"This area reflects your experience of closeness, trust, openness, and healthy boundaries with other people and with yourself."},
 EX:{label:"Expression & Voice",preview:"How easily you can recognize and communicate what is true for you.",detail:"This area reflects authentic expression — including holding back, struggling to find words, speaking reactively, or communicating with clarity."},
 CL:{label:"Mental Clarity",preview:"How clear, focused, and able to discern your next step your mind feels.",detail:"This area reflects mental noise, second-guessing, focus, perspective, and your ability to notice what matters without becoming trapped in thought."},
 SP:{label:"Meaning & Inner Connection",preview:"How connected you feel to purpose, nature, ancestry, spirituality, or something larger than the moment.",detail:"This area reflects your felt sense of meaning and inner connection. It does not assume any particular religion or spiritual belief."}
});
const ACTIVATION_COPY=Object.freeze({
 UNDERACTIVATED:{label:"Low or Resting Energy",preview:"Your answers suggest your system may benefit from gentle support, warmth, and gradual activation.",detail:"Some of your responses point toward lower energy, withdrawal, heaviness, or difficulty mobilizing. The sound approach can begin gently rather than asking for more intensity immediately."},
 REGULATED:{label:"Steady Energy",preview:"Your answers suggest a relatively balanced level of activation right now.",detail:"Your responses do not strongly lean toward either shutdown or overstimulation. The session can focus more directly on your leading areas of support."},
 OVERACTIVATED:{label:"High or Busy Energy",preview:"Your answers suggest you may benefit from settling, slowing, and grounding before opening further.",detail:"Some of your responses point toward restlessness, tension, racing thoughts, or difficulty switching off. The sound approach can emphasize predictability and grounding first."}
});
const SECTION_ORDER=["why","answers","activation","journey","bowls","rhythm","symbolism"];
const SECTION_META=Object.freeze({
 why:{title:"Why this foundation"},
 answers:{title:"What your answers suggest"},
 activation:{title:"Your energy pattern"},
 journey:{title:"Your sound journey"},
 bowls:{title:"Bowl-by-bowl meaning"},
 rhythm:{title:"Rhythm & flow"},
 symbolism:{title:"Meaning & symbolism"}
});
function expandable(id,preview,detail){return {id,title:SECTION_META[id].title,preview,detail,collapsedByDefault:true,actionLabel:"Read more"};}
function topDimensions(scores){return Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([id,score])=>({id,score,...CUSTOMER_DIMENSIONS[id]}));}
function confidenceLabel(score){return score>=70?"Good directional confidence":score>=50?"Moderate directional confidence":"Early directional signal";}
function buildQuickResult(answers,{foundation=null}={}){
 const scored=scoreQuickAssessment(answers);if(!scored.ok)return scored;
 const top=topDimensions(scored.result.dimension_normalized),activation=ACTIVATION_COPY[scored.result.activation.state]||ACTIVATION_COPY.REGULATED;
 const primary=top[0],secondary=top[1];
 const foundationName=foundation?.publicName||"Your personalized sound foundation";
 const sections=[
  expandable("why",`${primary.label} is the strongest area showing up in this Quick Assessment.`,`${primary.detail} ${secondary?secondary.label+" also appears as a supporting theme.":""} Your sound foundation is intended as a wellness direction based on your responses, not a medical diagnosis.`),
  expandable("answers",`Your responses point most strongly toward ${primary.label.toLowerCase()}.`,`Your two leading themes are ${primary.label} and ${secondary?.label||"a secondary supporting area"}. These labels translate the assessment's internal scoring into everyday language; internal dimension codes are never shown to customers.`),
  expandable("activation",activation.preview,activation.detail),
  expandable("journey","Your session can move from support and settling toward the state you want to leave with.","The full sound journey can use a clear beginning, middle, and grounding close. Later recipe phases determine the exact anchor, partner bowl, accents, pulse, and closing sequence."),
  expandable("bowls",`${foundationName} will be explained in plain language before any technical detail.`,"Each recommended bowl can be described by its role in the session, the experience it is intended to support, and its symbolic association. Internal scoring codes remain hidden."),
  expandable("rhythm","A predictable pulse can help the session feel intentional rather than random.","The rhythm section explains how sustained anchor tones and repeating accents shape the flow of the session without making unsupported medical claims."),
  expandable("symbolism","Spiritual and symbolic meaning is available if you want to explore it.","Symbolic language is presented as an interpretive tradition, not as medical fact. Customers can choose how deeply they want to engage with this layer.")
 ];
 return {ok:true,result:{title:"Your Sound Profile",summary:`Your strongest current theme is ${primary.label}. ${activation.preview}`,primaryIntention:primary.label,secondaryTheme:secondary?.label||null,recommendedFoundation:foundationName,confidence:{score:scored.result.confidence,label:confidenceLabel(scored.result.confidence),note:"A Quick Assessment gives a directional result. The Deep Assessment can refine it with more evidence."},sections,deepAssessmentCTA:{title:"Want a deeper reading?",preview:"Take the 25-question Deep Assessment for a more detailed Sound Profile.",actionLabel:"Go deeper"},presentation:{progressiveDisclosure:true,sectionOrder:SECTION_ORDER,voiceEnabled:false,voiceReservedForPremium:true},internal:{mode:scored.result.mode,bankVersion:scored.result.bankVersion}}};
}
module.exports={CUSTOMER_DIMENSIONS,ACTIVATION_COPY,SECTION_ORDER,SECTION_META,expandable,topDimensions,confidenceLabel,buildQuickResult};
