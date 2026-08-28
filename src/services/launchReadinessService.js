"use strict";
const fs = require("fs");
const path = require("path");
const STATUSES = Object.freeze(["BACKLOG", "READY", "IN_PROGRESS", "BLOCKED", "HUMAN_TEST_REQUIRED", "DONE"]);
const launchCategories = ["Entry + Authentication","Intake + Personalization","Baseline + Transformation Start","Program Creation","Workout Execution","Camera + Body Intelligence","Progress + Return Loop","Nutrition","Exercise Library","Run Club / GPS / Activity","AI Coach","Membership + Stripe","Mobile Experience","Production Reliability","Launch Content + Trust","Human Pilot"];
const avatarCards = ["Personalized Avatar Load","Skeleton Detection","Programmatic Manipulation","Physical MoveNet Proof","Normalized Pose Contract","Upper-Body Mirror","Lower-Body Mirror","Torso / Root Response","Full Live Vertical Slice","Tracking Loss + Recovery","Runtime Cleanup","Physical Acceptance","Pause Documentation"];
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const card = (title, category, extra={}) => ({ id: slug(`${category}-${title}`), title, category, status:"BACKLOG", definitionOfDone:`Verify ${title.toLowerCase()} through the canonical Pocket PT flow.`, evidence:"", automated:"NOT_RUN", humanRequired:false, humanVerified:false, codeComplete:false, blocker:"", implementationRef:"", ...extra });
function seed() {
  const launch = launchCategories.map(category => card(category, category, { status: category === "Human Pilot" || category === "Mobile Experience" || category === "Camera + Body Intelligence" ? "HUMAN_TEST_REQUIRED" : "READY", humanRequired:["Human Pilot","Mobile Experience","Camera + Body Intelligence"].includes(category) }));
  const avatar = avatarCards.map(title => card(title,"Avatar Phased Pause", { status:["Physical MoveNet Proof","Upper-Body Mirror","Lower-Body Mirror","Torso / Root Response","Full Live Vertical Slice","Physical Acceptance"].includes(title)?"HUMAN_TEST_REQUIRED":"READY", humanRequired:["Physical MoveNet Proof","Upper-Body Mirror","Lower-Body Mirror","Torso / Root Response","Full Live Vertical Slice","Physical Acceptance"].includes(title), implementationRef:"public/avatar-runtime.js; public/pose-runtime.js; public/normalized-pose.js" }));
  return { version:1, updatedAt:null, boards:{ launch, avatar } };
}
function effectiveStatus(c) { if(c.status==="DONE" && c.humanRequired && !c.humanVerified) return "HUMAN_TEST_REQUIRED"; return c.status; }
function summary(cards) { const counts=Object.fromEntries(STATUSES.map(s=>[s,0])); cards.forEach(c=>counts[effectiveStatus(c)]++); return { counts, remaining:cards.length-counts.DONE, total:cards.length }; }
function createLaunchReadinessService({ filePath }) {
  const read=()=>{ if(!fs.existsSync(filePath)) return seed(); const stored=JSON.parse(fs.readFileSync(filePath,"utf8")); return { ...seed(), ...stored, boards:{...seed().boards,...stored.boards} }; };
  const write=value=>{fs.mkdirSync(path.dirname(filePath),{recursive:true}); const next={...value,updatedAt:new Date().toISOString()}; const temp=`${filePath}.${process.pid}.tmp`;fs.writeFileSync(temp,JSON.stringify(next,null,2));fs.renameSync(temp,filePath);return next;};
  const snapshot=()=>{const value=read();return {...value,summaries:{launch:summary(value.boards.launch),avatar:summary(value.boards.avatar)}}};
  const update=(board,id,patch)=>{if(!["launch","avatar"].includes(board))throw Object.assign(new Error("unknown_board"),{status:404});const value=read(),target=value.boards[board].find(c=>c.id===id);if(!target)throw Object.assign(new Error("unknown_card"),{status:404}); if(patch.status&&!STATUSES.includes(patch.status))throw Object.assign(new Error("invalid_status"),{status:422});Object.assign(target,Object.fromEntries(Object.entries(patch).filter(([key])=>["status","evidence","automated","humanRequired","humanVerified","codeComplete","blocker","implementationRef"].includes(key))));return write(value);};
  return { snapshot, update, effectiveStatus, summary };
}
module.exports={createLaunchReadinessService,effectiveStatus,summary,seed,STATUSES};
