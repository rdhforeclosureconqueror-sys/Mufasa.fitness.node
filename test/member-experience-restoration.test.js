"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createChallengeService } = require("../src/services/challengeService");
const { createMemberExperienceCapabilityService } = require("../src/services/memberExperienceCapabilityService");
const { createCoachContextService } = require("../src/ai/coachContextService");
const routeContract = require("../config/route-authorization-contract");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("launch dashboard restores both experiences without changing primary navigation", () => {
  const html = read("public/dashboard.html");
  for (const label of ["Home", "My Program", "Train", "Exercises", "Yoga", "Progress &amp; Rewards", "AI Coach", "Profile &amp; Settings"]) assert.match(html, new RegExp(`>${label}<`));
  assert.match(html, /id="steppingIntoGreatnessCard"[\s\S]+href="\/greatness\.html"/);
  assert.match(html, /id="pushUpChallengeCard"[\s\S]+href="\/push-up-challenge\.html"/);
  const hiddenBlock = html.match(/<div hidden[\s\S]*?<\/div>/)?.[0] || "";
  assert.doesNotMatch(hiddenBlock, /id="(?:steppingIntoGreatnessLink|pushUpChallengeLink)"/);
  assert.match(html, /@media\(max-width:600px\)/);
  assert.match(html, /\.btn:focus-visible/);
});

test("legacy direct URLs redirect to canonical working static pages", () => {
  const server = read("server.js");
  for (const [oldRoute, canonical] of [["/stepping-into-greatness", "/greatness.html"], ["/greatness", "/greatness.html"], ["/push-up-challenge", "/push-up-challenge.html"], ["/pushup-challenge", "/push-up-challenge.html"]]) {
    assert.ok(server.includes(`app.get("${oldRoute}", (_req, res) => res.redirect(308, "${canonical}"))`));
    assert.ok(routeContract.some((entry) => entry.method === "GET" && entry.path === oldRoute && entry.authentication === "public"));
  }
});

test("push-up member summaries are owner-scoped, deterministic, and preserve duplicate protection", () => {
  const service = createChallengeService({ filePath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pushup-restore-")), "results.json") });
  service.savePushupResult({ userId:"member-a", submissionId:"submission-a", displayName:"A", consent:true, validRepCount:12, variant:"standard_pushup" });
  service.savePushupResult({ userId:"member-b", submissionId:"submission-b", displayName:"B", consent:true, validRepCount:20, variant:"standard_pushup" });
  assert.deepEqual({ sessions:service.getMemberPushupSummary("member-a").completedSessions, rank:service.getMemberPushupSummary("member-a").leaderboardRank }, { sessions:1, rank:2 });
  assert.equal(service.getMemberPushupSummary("member-c").bestResult, null);
  assert.throws(() => service.savePushupResult({ userId:"member-a", submissionId:"submission-a", displayName:"A", consent:true }), /already submitted/);
});

test("diagnostics and AI Coach expose bounded authoritative state and honest limitations", () => {
  const user = { userId:"member-a", steppingIntoGreatness:{ activities:[{status:"completed",distanceMeters:1500,endedAt:"2026-07-30T00:00:00Z"}], enrollments:[{status:"active"}] } };
  const userStore = { loadUser:(id) => id === "member-a" ? structuredClone(user) : { userId:id } };
  const challengeService = { getMemberPushupSummary:() => ({ completedSessions:0, bestResult:null, leaderboardRank:null }) };
  const diagnostics = createMemberExperienceCapabilityService({ userStore, challengeService }).get("member-a");
  assert.deepEqual(diagnostics.capabilities.map((item) => item.launchStatus), ["READY_WITH_LIMITATION", "READY_WITH_LIMITATION"]);
  assert.equal(diagnostics.capabilities[0].gamificationConnected, false);
  assert.equal(diagnostics.capabilities[1].leaderboardConnected, true);
  const context = createCoachContextService({ userStore, challengeService, clock:()=>0 }).build("member-a");
  assert.equal(context.memberExperiences.steppingIntoGreatness.lifetimeDistanceMeters, 1500);
  assert.equal(context.memberExperiences.pushUpChallenge.completedSessions, 0);
});
