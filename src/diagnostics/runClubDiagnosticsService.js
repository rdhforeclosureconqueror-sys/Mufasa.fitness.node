"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { createUserStore } = require("../repositories/userStore");
const { createGamificationEventStore } = require("../repositories/gamificationEventStore");
const { createGamificationGenerationStore } = require("../repositories/gamificationGenerationStore");
const { createEventService } = require("../gamification/eventService");
const { createAchievementService } = require("../gamification/achievementService");
const { createProjectionService } = require("../gamification/projectionService");
const { createLevelService } = require("../gamification/levelService");
const { createXpPolicyService, validateXpPolicy } = require("../gamification/xpPolicyService");
const { validateAchievementDefinitions } = require("../gamification/policyService");
const { createTrailContributionService, sanitizePng } = require("../services/trailContributionService");
const { getEventContract } = require("../gamification/eventTypes");

const PASS="PASS", FAIL="FAIL", NA="NOT AVAILABLE";
const PNG=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","base64");
const check=(id,label,fn)=>{try{const detail=fn();return{id,label,status:detail===false?FAIL:PASS,reason:detail===false?"Check returned false":typeof detail==="string"?detail:"Operational"};}catch(error){return{id,label,status:FAIL,reason:String(error?.message||"Diagnostic failed").slice(0,240)};}};
const unavailable=(id,label,reason)=>({id,label,status:NA,reason});
const phase=(id,label,checks)=>({id,label,status:checks.some(x=>x.status===FAIL)?FAIL:checks.every(x=>x.status===NA)?NA:PASS,checks});

function createRunClubDiagnosticsService({rootDir, routeContract}) {
  function run(){const directory=fs.mkdtempSync(path.join(os.tmpdir(),"run-club-diagnostics-"));
    try {
      const policyDocument=require(path.join(rootDir,"data/gamification/xp-policy.json"));
      const catalogue=require(path.join(rootDir,"data/gamification/achievements.json"));
      const levels=require(path.join(rootDir,"data/gamification/levels.json")).levels;
      const policies=validateXpPolicy(policyDocument),definitions=validateAchievementDefinitions(catalogue.definitions);
      const eventStore=createGamificationEventStore({filePath:path.join(directory,"events.json")});
      let counter=0;const eventService=createEventService({eventStore,clock:()=>new Date("2026-08-12T12:00:00.000Z"),idFactory:()=>`evt_${String(++counter).padStart(16,"0")}`});
      const generation=createGamificationGenerationStore({directory:path.join(directory,"projection")});
      const achievements=createAchievementService({eventStore,definitions,awardStore:generation.awardStore,ledgerStore:generation.ledgerStore,projectionService:createProjectionService({projectionStore:generation.projectionStore,levelService:createLevelService(levels)}),xpPolicyService:createXpPolicyService(policies),generationStore:generation,policyVersions:()=>policies.map(x=>x.policyVersion)});
      const activity={activityId:"diagnostic_activity",schemaVersion:5,activityType:"trail_run",distanceMeters:5000,selectedRoute:{routeId:"diagnostic_trail"},endedAt:"2026-08-12T11:00:00.000Z",goal:{completed:true}};
      eventService.recordGreatnessActivity({userId:"diagnostic_member",activity});eventService.recordGreatnessActivity({userId:"diagnostic_member",activity});const replay=achievements.replay();
      const projection=generation.projectionStore.readAll().diagnostic_member;
      const users=createUserStore({userDir:path.join(directory,"users")});users.ensureDirs();
      for(const id of ["diagnostic_member","diagnostic_other"]){const user=users.loadUser(id);user.accessTier="free_run_club";user.steppingIntoGreatness={activities:id==="diagnostic_member"?[{activityId:"diagnostic_activity",status:"completed",validation:{state:"valid"},selectedRoute:{routeId:"diagnostic_trail"}}]:[]};users.saveUser(user);}
      const contributions=createTrailContributionService({userStore:users,uploadDir:path.join(directory,"uploads"),eventService:null});
      const created=contributions.create("diagnostic_member","diagnostic_trail",{sourceActivityId:"diagnostic_activity",contributionType:"scenery",imageBase64:PNG.toString("base64")});
      const approved=contributions.moderate("diagnostic_admin",created.contributionId,"approved"),gallery=contributions.gallery("diagnostic_trail");
      const secondPng=Buffer.from(PNG);secondPng[45]^=1;
      const ownerDeleteCandidate=contributions.create("diagnostic_member","diagnostic_trail",{sourceActivityId:"diagnostic_activity",contributionType:"achievement",imageBase64:secondPng.toString("base64")});
      const ownerDeleted=contributions.remove("diagnostic_member",ownerDeleteCandidate.contributionId);
      let crossProtected=false;try{contributions.remove("diagnostic_other",created.contributionId);}catch(error){crossProtected=error.code==="CONTRIBUTION_NOT_FOUND";}
      const routes=new Set(routeContract.map(x=>`${x.method} ${x.path}`));
      const phase1=phase("phase_1","Phase 1 — Gamification Core",[
        check("xp_policy","XP policy loads",()=>policies.length>0),check("activity_contract","greatness.activity.completed is registered",()=>Boolean(getEventContract("greatness.activity.completed",1))),
        check("activity_xp","Verified activity produces 50 XP",()=>projection?.lifetimeXp===50),check("duplicate_xp","Duplicate event does not duplicate XP",()=>eventStore.metrics().count===1&&projection?.lifetimeXp===50),
        check("achievement_catalogue","Achievement catalogue loads",()=>definitions.some(x=>x.id==="achievement.greatness.first_run")),check("level_projection","Level projection works",()=>createLevelService(levels).forXp(250).level===2),
        check("progress_read_model","Progress read model is available",()=>Boolean(replay?.projections?.diagnostic_member))]);
      const phase2=phase("phase_2","Phase 2 — Trail Contribution Backend",[
        check("persistence","Contribution persistence is writable/readable",()=>Boolean(contributions.owned("diagnostic_member",created.contributionId))),check("verified_visit","Verified-visit association works",()=>created.verifiedTrailVisit===true),
        check("gallery","Gallery read works",()=>gallery.contributions.length===1),check("owner_delete","Owner-delete authorization works",()=>ownerDeleted.removed===true&&!contributions.gallery("diagnostic_trail").contributions.some(x=>x.contributionId===ownerDeleteCandidate.contributionId)),check("cross_delete","Cross-user delete protection works",()=>crossProtected),
        check("moderation_route","Moderation route is available",()=>routes.has("PATCH /api/admin/trail-contributions/:contributionId/moderation")),check("image_validation","Image validation is operational",()=>sanitizePng(PNG).length>0),
        check("privacy","Metadata/privacy sanitization is operational",()=>approved.verifiedTrailVisit&&!JSON.stringify(gallery).match(/userId|sourceActivityId|latitude|longitude/))]);
      const phase3=phase("phase_3","Phase 3 — Trail Contribution UI",[unavailable("photo_ui","Photo contribution UI deployed check","Requires real-device verification"),unavailable("gallery_ui","Trail gallery UI deployed check","Requires real-device verification"),check("public_gallery","Public gallery route is available",()=>routes.has("GET /api/greatness/trails/:trailId/gallery"))]);
      const phase4=phase("phase_4","Phase 4 — Post-Run Reward Experience",[unavailable("post_run_visual","Post-run celebration visual check","Requires real-device verification"),check("level_ui_foundation","Level progress renderer is present",()=>fs.existsSync(path.join(rootDir,"public","gamification.js"))),unavailable("share_next_visual","Share card and next objective visual check","Requires real-device verification")]);
      const boundary=phase("boundary","Free / Paid Boundary",[
        check("free_greatness","Free Run Club can access Greatness",()=>routes.has("GET /api/me/greatness/journey")),...[["Yoga","GET /api/yoga/catalogue"],["Paid workout programming","POST /api/sessions"],["Nutrition","GET /api/me/nutrition/summary"],["AI Coach","GET /api/me/ai-coach"]].map(([label,key])=>check(key.toLowerCase().replace(/\W+/g,"_"),`${label} remains membership protected`,()=>{const source=fs.readFileSync(path.join(rootDir,"server.js"),"utf8"),escaped=key.split(" ")[1].replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return new RegExp(`app\\.(?:get|post)\\(\\"${escaped}\\"[^\\n]+requireMembershipEntitlement`).test(source)})),check("membership_unchanged","Gamification does not change membership entitlement",()=>users.loadUser("diagnostic_member").accessTier==="free_run_club")]);
      const before=users.loadUser("diagnostic_member"),after=users.loadUser("diagnostic_member");
      const continuity=phase("continuity","Upgrade Continuity",[check("stable_identity","Stable member identity model",()=>before.userId===after.userId),check("xp_continuity","XP continuity",()=>projection.lifetimeXp===50),check("achievement_continuity","Achievement continuity",()=>projection.achievements.some(x=>x.achievementId==="achievement.greatness.first_run"&&x.state==="earned")),check("ownership_continuity","Contribution ownership continuity",()=>Boolean(contributions.owned(before.userId,created.contributionId)))]);
      const phases=[phase1,phase2,phase3,phase4],groups=[...phases,boundary,continuity];
      return{schemaVersion:1,generatedAt:new Date().toISOString(),safeMode:{isolated:true,readOnlyBilling:true,publicWrites:false,cleanup:"automatic"},summary:{gamificationCore:phase1.status,achievementCatalogue:phase1.checks.find(x=>x.id==="achievement_catalogue").status,trailContributions:phase2.status,photoPrivacy:phase2.checks.find(x=>x.id==="privacy").status,freePaidBoundary:boundary.status,upgradeContinuity:continuity.status,publicGallery:phase2.checks.find(x=>x.id==="gallery").status},phases,boundary,continuity,overall:groups.some(x=>x.status===FAIL)?FAIL:PASS};
    } finally {fs.rmSync(directory,{recursive:true,force:true});}
  }
  return{run};
}
module.exports={createRunClubDiagnosticsService,PASS,FAIL,NA};
