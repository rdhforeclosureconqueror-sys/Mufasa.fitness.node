"use strict";

const crypto = require("crypto");
const DAY_MS = 24 * 60 * 60 * 1000;
const id = prefix => `${prefix}_${crypto.randomUUID()}`;
const iso = value => new Date(value).toISOString();
const text = (value,max=500) => String(value == null ? "" : value).trim().slice(0,max);

function createFreeRunClubCommunityService({ userStore, clock = () => Date.now() }) {
  function ensure(user) {
    user.freeRunClub ||= { schemaVersion:1, profile:null, joinedAt:null, boardPosts:[] };
    user.freeRunClub.boardPosts ||= [];
    prune(user.freeRunClub);
    return user.freeRunClub;
  }
  function prune(domain) {
    const cutoff = clock() - DAY_MS;
    domain.boardPosts = (domain.boardPosts || []).filter(post => Date.parse(post.createdAt) >= cutoff);
  }
  function validateProfile(input={}) {
    const required = ["displayName","age","sex","state","runningGoal","experienceLevel","notRunningProbably"];
    for (const key of required) if (!text(input[key])) throw new Error(`Missing required field: ${key}`);
    if (Number(input.age) < 13 || Number(input.age) > 120) throw new Error("Age must be between 13 and 120");
    if (input.profileUseConsent !== true) throw new Error("Profile information permission is required");
    return {
      displayName:text(input.displayName,120), age:Number(input.age), sex:text(input.sex,60), state:text(input.state,80),
      runningGoal:text(input.runningGoal,500), experienceLevel:text(input.experienceLevel,120),
      currentRunClub:text(input.currentRunClub,200)||null, priorRunClubExperience:text(input.priorRunClubExperience,800)||null,
      typicalWeeklyMileage:text(input.typicalWeeklyMileage,80)||null, longestRecentRun:text(input.longestRecentRun,80)||null,
      injuryHistory:text(input.injuryHistory,1000)||null, preferredRunTypes:text(input.preferredRunTypes,500)||null,
      notRunningProbably:text(input.notRunningProbably,280), communityJoke:text(input.communityJoke,280)||null,
      profileUseConsent:true, profileUseConsentAt:iso(clock()), photoSharingConsent:input.photoSharingConsent===true,
      updatedAt:iso(clock())
    };
  }
  function saveProfile(userId,input) {
    let result;
    userStore.updateUser(userId,user=>{ const d=ensure(user); d.profile=validateProfile(input); d.joinedAt ||= iso(clock()); result={...d.profile,joinedAt:d.joinedAt}; return user; });
    return result;
  }
  function getProfile(userId) { const user=userStore.getUser(userId); if(!user) return null; const d=ensure(user); return d.profile ? {...d.profile,joinedAt:d.joinedAt} : null; }
  function createPost(userId,input={}) {
    let post;
    userStore.updateUser(userId,user=>{ const d=ensure(user); if(!d.profile) throw new Error("Complete Free Run Club profile first");
      const body=text(input.text,1500), imageUrl=text(input.imageUrl,1000)||null;
      if(!body&&!imageUrl) throw new Error("Post must include text or an image");
      if(imageUrl && d.profile.photoSharingConsent!==true) throw new Error("Photo sharing permission is required");
      post={postId:id("runclub_post"),userId,displayName:d.profile.displayName,state:d.profile.state,text:body||null,imageUrl,createdAt:iso(clock()),expiresAt:iso(clock()+DAY_MS)};
      d.boardPosts.push(post); prune(d); return user; });
    return post;
  }
  function board(userIds=[]) {
    const posts=[];
    for(const userId of userIds){ const user=userStore.getUser(userId); if(!user) continue; const d=ensure(user); if(!d.profile) continue; posts.push(...d.boardPosts); }
    return posts.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  }
  function diagnostic(userId) {
    const user=userStore.getUser(userId); if(!user) return {firstFailure:"user_not_found",checks:[{id:"user",result:"FAIL"}]};
    const d=ensure(user), checks=[
      {id:"domain",result:"PASS"},
      {id:"profile",result:d.profile?"PASS":"FAIL"},
      {id:"profile_permission",result:d.profile?.profileUseConsent===true?"PASS":"FAIL"},
      {id:"board_retention",result:d.boardPosts.every(p=>Date.parse(p.createdAt)>=clock()-DAY_MS)?"PASS":"FAIL"}
    ];
    return {diagnosticVersion:"free-run-club-first-failure-v1",firstFailure:checks.find(x=>x.result==="FAIL")?.id||null,checks,postCount:d.boardPosts.length};
  }
  return { saveProfile,getProfile,createPost,board,diagnostic,DAY_MS };
}

module.exports={createFreeRunClubCommunityService,DAY_MS};
