"use strict";
const express=require("express");
const {QUICK_BANK,QUICK_BANK_VERSION}=require("../sound-assessment/quick-bank");
const {DEEP_BANK,DEEP_BANK_VERSION}=require("../sound-assessment/deep-bank");
const {buildQuickInterpretation,buildDeepInterpretation}=require("../sound-assessment/interpretation");
const {createAssessmentStore}=require("../sound-assessment/assessment-store");
const {sendSoundAssessmentEmail}=require("../services/soundAssessmentEmailService");
function publicBank(bank,mode,version){return {mode,bankVersion:version,questions:bank.map(q=>({id:q.id,prompt:q.prompt,options:q.options.map(o=>o.text)}))};}
function publicResult(result,mode){
 const out={mode,primary:result.primary,secondary:result.secondary,summary:result.summary,sections:result.sections,confidence:result.confidence,cta:result.cta||null,soundPreview:result.soundPreview||null};
 if(result.soundFoundation)out.soundFoundation={name:result.soundFoundation.publicName,bowls:result.soundFoundation.bowls,direction:result.soundFoundation.experientialDirection,accentNotes:result.soundFoundation.accentNotes,pulse:result.soundFoundation.pulse,bijaMantra:result.soundFoundation.bijaMantra,closing:result.soundFoundation.closing};
 return out;
}
function validateAnswers(bank,answers){
 if(!answers||typeof answers!=="object"||Array.isArray(answers))return "Answers must be an object.";
 const ids=new Set(bank.map(q=>q.id));

 for(const [id,index] of Object.entries(answers)){const q=bank.find(x=>x.id===id);if(!ids.has(id)||!q||!Number.isInteger(index)||index<0||index>=q.options.length)return `Invalid answer for ${id}.`;}

 return null;
}
function installSoundAssessmentRoutes({app,store=createAssessmentStore(),sendEmail=sendSoundAssessmentEmail}){
 const router=express.Router();
 router.get("/bank/:mode",(req,res)=>{const deep=req.params.mode==="deep";if(!deep&&req.params.mode!=="quick")return res.status(404).json({ok:false,error:{code:"SA_MODE_INVALID"}});return res.json({ok:true,data:deep?publicBank(DEEP_BANK,"deep",DEEP_BANK_VERSION):publicBank(QUICK_BANK,"quick",QUICK_BANK_VERSION)});});
 router.post("/result/:mode",express.json({limit:"32kb"}),(req,res)=>{const deep=req.params.mode==="deep";if(!deep&&req.params.mode!=="quick")return res.status(404).json({ok:false,error:{code:"SA_MODE_INVALID"}});const bank=deep?DEEP_BANK:QUICK_BANK,answers=req.body?.answers||{},invalid=validateAnswers(bank,answers);if(invalid)return res.status(422).json({ok:false,error:{code:"SA_ANSWER_INVALID",message:invalid}});if(Object.keys(answers).length!==bank.length)return res.status(422).json({ok:false,error:{code:"SA_ANSWER_INCOMPLETE",message:"Every question must be answered."}});const built=deep?buildDeepInterpretation(answers):buildQuickInterpretation(answers);if(!built.ok)return res.status(422).json({ok:false,error:{code:built.diagnostic?.FIRST_FAILURE||"SA_RESULT_FAILED",message:built.diagnostic?.DETAIL||"Unable to build sound profile."}});
 let saved;try{saved=store.save({mode:deep?"deep":"quick",bankVersion:deep?DEEP_BANK_VERSION:QUICK_BANK_VERSION,answers,result:publicResult(built.result,deep?"deep":"quick")});}catch(error){console.error("[sound-assessment] FIRST_FAILURE=PERSISTENCE",error.code||error.message);return res.status(503).json({ok:false,error:{code:"SA_PERSISTENCE_FAILED",message:"Unable to securely save your assessment. Please try again."}});}
 Promise.resolve().then(()=>sendEmail({assessmentId:saved.id,mode:deep?"deep":"quick",createdAt:saved.createdAt,result:publicResult(built.result,deep?"deep":"quick")})).then(status=>{if(!status.sent)console.warn("[sound-assessment] FIRST_FAILURE=NOTIFICATION_CONFIG",status.reason);}).catch(error=>console.error("[sound-assessment] FIRST_FAILURE=NOTIFICATION_DELIVERY",error.message));
 return res.json({ok:true,data:{...publicResult(built.result,deep?"deep":"quick"),assessmentId:saved.id,savedAt:saved.createdAt}});
 });
 app.use("/api/sound-assessment",router);return router;
}
module.exports={installSoundAssessmentRoutes,publicBank,publicResult,validateAnswers};
