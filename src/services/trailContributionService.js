"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { ApiError } = require("../lib/apiResponse");
const { ensureDomain } = require("./steppingIntoGreatnessService");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["scenery", "selfie_group", "achievement", "conditions"]);
const CONDITIONS = new Set(["dry", "muddy", "flooded", "icy", "crowded", "construction", "obstruction", "great_condition"]);

function publicContribution(item) {
  return {
    contributionId:item.contributionId, trailId:item.trailId, contributionType:item.contributionType,
    caption:item.caption, imageUrl:item.imageUrl, createdAt:item.createdAt, moderationStatus:item.moderationStatus,
    visibilityStatus:item.visibilityStatus, approvedAt:item.approvedAt || null, verifiedTrailVisit:item.verifiedTrailVisit,
    verificationLabel:item.verifiedTrailVisit ? "Ran here" : null, helpfulCount:item.helpfulBy?.length || 0,
    condition:item.condition && Date.parse(item.condition.expiresAt) > Date.now() ? item.condition : null
  };
}

function sanitizePng(buffer) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) throw new ApiError("UNSUPPORTED_IMAGE_TYPE", "Only PNG images are supported", 415);
  let offset=8; const chunks=[signature];
  while(offset + 12 <= buffer.length) {
    const length=buffer.readUInt32BE(offset), end=offset+12+length;
    if(end>buffer.length) throw new ApiError("MALFORMED_IMAGE", "Image data is malformed", 400);
    const type=buffer.toString("ascii",offset+4,offset+8);
    if(["IHDR","PLTE","IDAT","IEND","tRNS"].includes(type)) chunks.push(buffer.subarray(offset,end));
    offset=end; if(type==="IEND") break;
  }
  if(!chunks.some(chunk=>chunk.toString("ascii",4,8)==="IEND")) throw new ApiError("MALFORMED_IMAGE", "Image data is malformed", 400);
  return Buffer.concat(chunks); // ancillary EXIF/text/location chunks are deliberately removed
}

function createTrailContributionService({ userStore, uploadDir, eventService, onCommitted=()=>{}, clock=()=>new Date() }) {
  fs.mkdirSync(uploadDir,{recursive:true});
  const owned = (userId,id) => ensureDomain(userStore.loadUser(userId)).trailContributions?.find(x=>x.contributionId===id);
  function create(userId, trailId, input={}) {
    if(!TYPES.has(input.contributionType)) throw new ApiError("INVALID_CONTRIBUTION_TYPE", "Choose a supported contribution type", 400);
    if(typeof input.imageBase64!=="string") throw new ApiError("IMAGE_REQUIRED", "A PNG image is required", 400);
    const raw=Buffer.from(input.imageBase64.replace(/^data:image\/png;base64,/,""),"base64");
    if(!raw.length) throw new ApiError("MALFORMED_IMAGE", "Image data is malformed",400);
    if(raw.length>MAX_IMAGE_BYTES) throw new ApiError("IMAGE_TOO_LARGE", "Images must be 5 MB or smaller",413);
    const image=sanitizePng(raw), hash=crypto.createHash("sha256").update(image).digest("hex");
    let result;
    userStore.updateUser(userId,user=>{const d=ensureDomain(user);d.trailContributions ||= [];
      const duplicate=d.trailContributions.find(x=>x.trailId===trailId&&x.imageHash===hash&&!x.removedAt);
      if(duplicate){result={...publicContribution(duplicate),duplicate:true};return user;}
      const activity=d.activities.find(x=>x.activityId===input.sourceActivityId&&!x.deletedAt&&x.validation?.state==="valid"&&[x.selectedRoute?.routeId,x.selectedRoute?.routeFingerprint].includes(trailId));
      const contributionId=`trailcon_${crypto.randomUUID()}`, filename=`${contributionId}.png`;
      fs.writeFileSync(path.join(uploadDir,filename),image,{flag:"wx"});
      const now=clock().toISOString(),condition=input.condition&&CONDITIONS.has(input.condition)?{value:input.condition,reportedAt:now,expiresAt:new Date(clock().getTime()+48*3600000).toISOString()}:null;
      const item={contributionId,userId,trailId,sourceActivityId:activity?.activityId||null,contributionType:input.contributionType,caption:String(input.caption||"").trim().slice(0,500),imageStorageReference:filename,imageUrl:`/uploads/trail-contributions/${filename}`,imageHash:hash,createdAt:now,moderationStatus:"pending",visibilityStatus:"private",approvedAt:null,removedAt:null,verifiedTrailVisit:Boolean(activity),helpfulBy:[],condition};
      d.trailContributions.push(item);result=publicContribution(item);return user;
    }); return result;
  }
  function remove(userId,id){let result;userStore.updateUser(userId,user=>{const d=ensureDomain(user),item=d.trailContributions?.find(x=>x.contributionId===id);if(!item)throw new ApiError("CONTRIBUTION_NOT_FOUND","Contribution not found",404);item.removedAt ||= clock().toISOString();item.visibilityStatus="removed";try{fs.unlinkSync(path.join(uploadDir,item.imageStorageReference));}catch(error){if(error.code!=="ENOENT")throw error;}result={contributionId:id,removed:true};return user;});return result;}
  function moderate(moderatorId,id,status){if(!["approved","removed"].includes(status))throw new ApiError("INVALID_MODERATION_STATUS","Status must be approved or removed",400);let result;
    for(const user of userStore.listUsers()){const item=ensureDomain(user).trailContributions?.find(x=>x.contributionId===id);if(!item)continue;userStore.updateUser(user.userId,current=>{const found=ensureDomain(current).trailContributions.find(x=>x.contributionId===id);found.moderationStatus=status;found.moderatedBy=moderatorId;found.moderatedAt=clock().toISOString();found.visibilityStatus=status==="approved"?"public":"removed";if(status==="removed"){found.removedAt ||= found.moderatedAt;try{fs.unlinkSync(path.join(uploadDir,found.imageStorageReference));}catch(error){if(error.code!=="ENOENT")throw error;}}if(status==="approved"){found.approvedAt ||= found.moderatedAt;if(found.verifiedTrailVisit&&eventService){eventService.recordTrailPhotoApproved({userId:user.userId,contribution:found});onCommitted();}}result=publicContribution(found);return current;});break;}if(!result)throw new ApiError("CONTRIBUTION_NOT_FOUND","Contribution not found",404);return result;}
  function gallery(trailId,sort="recent"){let items=userStore.listUsers().flatMap(u=>(ensureDomain(u).trailContributions||[]).filter(x=>x.trailId===trailId&&x.moderationStatus==="approved"&&x.visibilityStatus==="public"&&!x.removedAt)).map(publicContribution);items.sort(sort==="helpful"?(a,b)=>b.helpfulCount-a.helpfulCount:(a,b)=>b.createdAt.localeCompare(a.createdAt));return{trailId,sort,contributions:items.slice(0,50)};}
  function report(userId,id,reason){let result;for(const user of userStore.listUsers()){const item=ensureDomain(user).trailContributions?.find(x=>x.contributionId===id&&!x.removedAt);if(!item)continue;userStore.updateUser(user.userId,current=>{const found=ensureDomain(current).trailContributions.find(x=>x.contributionId===id);found.reports ||= [];if(!found.reports.some(x=>x.reporterId===userId))found.reports.push({reporterId:userId,reason:String(reason||"other").slice(0,100),createdAt:clock().toISOString()});result={reported:true};return current;});break;}if(!result)throw new ApiError("CONTRIBUTION_NOT_FOUND","Contribution not found",404);return result;}
  return {create,remove,moderate,gallery,report,owned,MAX_IMAGE_BYTES};
}
module.exports={createTrailContributionService,publicContribution,sanitizePng,MAX_IMAGE_BYTES};
