"use strict";
const crypto=require("crypto");
const {ApiError}=require("../lib/apiResponse");
const PHOTO_RE=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
const MAX_PHOTO_CHARS=900000;
const clean=(v,max=1200)=>String(v??"").trim().slice(0,max);
const numberOrNull=v=>v===""||v==null?null:Number(v);
function normalizeMeasurements(input={}){
  const out={};
  for(const key of ["bicep","chest","waist","hips","thigh"]){const n=numberOrNull(input[key]);out[key]=Number.isFinite(n)&&n>=0&&n<=200?n:null;}
  return out;
}
function normalizePhoto(value,label){if(!value)return null;if(typeof value!=="string"||value.length>MAX_PHOTO_CHARS||!PHOTO_RE.test(value))throw new ApiError("TRANSFORMATION_PHOTO_INVALID",`${label} photo must be a resized JPEG, PNG, or WebP image`,422);return value;}
function createClientTransformationService({userStore,clock=()=>Date.now()}){
  function read(userId){const u=userStore.loadUser(userId);return structuredClone(u?.transformationProfile||{schemaVersion:1,returnAgreement:null,checkInPreference:"weekly",checkIns:[]});}
  function saveAgreement(userId,input={}){
    const answers={
      returnProcess:clean(input.returnProcess,1600),
      why:clean(input.why,1200),
      whyImportant:clean(input.whyImportant,1200),
      whoAffected:clean(input.whoAffected,1200)
    };
    if(Object.values(answers).some(v=>!v))throw new ApiError("RETURN_AGREEMENT_INCOMPLETE","Complete all Return Agreement questions",422);
    const pref=["weekly","biweekly"].includes(input.checkInPreference)?input.checkInPreference:"weekly";
    const at=new Date(clock()).toISOString();let result;
    userStore.updateUser(userId,u=>{const p=u.transformationProfile||{schemaVersion:1,checkIns:[]};p.returnAgreement={...answers,createdAt:p.returnAgreement?.createdAt||at,updatedAt:at};p.checkInPreference=pref;p.updatedAt=at;u.transformationProfile=p;result=structuredClone(p);return u;});return result;
  }
  function addCheckIn(userId,input={}){
    const at=new Date(clock()).toISOString();const weight=numberOrNull(input.weight);
    if(weight!=null&&(!Number.isFinite(weight)||weight<40||weight>1000))throw new ApiError("TRANSFORMATION_WEIGHT_INVALID","Enter a valid weight in pounds",422);
    const photos={front:normalizePhoto(input.photos?.front,"Front"),side:normalizePhoto(input.photos?.side,"Side")};
    if(input.baseline===true&&(!photos.front||!photos.side))throw new ApiError("TRANSFORMATION_BASELINE_PHOTOS_REQUIRED","Baseline requires front and side photos. Face may be cropped or covered.",422);
    const checkIn={id:crypto.randomUUID(),createdAt:at,baseline:Boolean(input.baseline),weight:weight??null,measurements:normalizeMeasurements(input.measurements),photos,notes:clean(input.notes,1200)||null,photoPrivacy:"client_and_assigned_trainer_only",similarClothingAcknowledged:Boolean(input.similarClothingAcknowledged),transformationVideoConsent:Boolean(input.transformationVideoConsent)};
    if(!checkIn.similarClothingAcknowledged)throw new ApiError("TRANSFORMATION_PHOTO_STANDARD_REQUIRED","Confirm that progress photos should use similar clothing and a similar pose when practical",422);
    userStore.updateUser(userId,u=>{const p=u.transformationProfile||{schemaVersion:1,checkInPreference:"weekly",checkIns:[]};p.checkIns=Array.isArray(p.checkIns)?p.checkIns:[];p.checkIns.push(checkIn);p.updatedAt=at;u.transformationProfile=p;return u;});return structuredClone(checkIn);
  }
  return {read,saveAgreement,addCheckIn};
}
module.exports={createClientTransformationService};