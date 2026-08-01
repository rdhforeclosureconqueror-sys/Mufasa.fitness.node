"use strict";
const fs = require("node:fs");
const path = require("node:path");
function step(state, optional = false) { return { status: state === true ? "STEP_COMPLETED" : state === false ? (optional ? "STEP_OPTIONAL" : "MEMBER_HAS_NOT_COMPLETED") : "MEMBER_EVIDENCE_UNAVAILABLE", platformCapability: "AVAILABLE" }; }
function createMemberJourneyService({ filePath, userStore, memberGamificationService, programService, steppingService, challengeService }) {
  function selected() { try { const value = JSON.parse(fs.readFileSync(filePath, "utf8")); return /^[A-Za-z0-9._-]{1,128}$/.test(value.memberId) ? value.memberId : null; } catch { return null; } }
  function designate(memberId) { if (!/^[A-Za-z0-9._-]{1,128}$/.test(String(memberId || ""))) throw Object.assign(new Error("A valid diagnostic member is required"), { status: 422 }); fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, JSON.stringify({ memberId, designatedAt: new Date().toISOString() })); return { designated: true }; }
  function inspect() {
    const memberId = selected(); if (!memberId) return { status: "UNKNOWN", designated: false, explanation: "No diagnostic member is designated." };
    const user = userStore.loadUser(memberId), game = memberGamificationService?.get(memberId), sessions = Object.values(user.sessions || {}), completed = sessions.filter(x => x.status === "completed" || x.endedAt);
    let program = null; try { program = programService?.getAssignment?.(memberId) || programService?.get?.(memberId); } catch {}
    const greatness = steppingService?.journey(memberId); const pushup = challengeService?.getMyPushupProgress?.(memberId);
    return { status: "READY", designated: true, memberReference: `diagnostic:${memberId.slice(-6)}`, readOnly: true, inspectedAt: new Date().toISOString(),
      steps: { authentication: step(true), onboarding: step(Boolean(user.intake || user.clientIntake)), goal: step(Boolean(user.goal || user.goalsBaseline)), constraints: step(Boolean(user.ohsa?.length || user.constraints), true), programAssignment: step(Boolean(program)), currentPhase: step(Boolean(program?.currentPhase || program?.phase)), todaySession: step(Boolean(program?.today || user.activeSession), true), completedWorkoutCount: { ...step(completed.length > 0), count: completed.length }, yogaCompletionCount: { ...step(Boolean(user.yoga?.history?.length), true), count: user.yoga?.history?.length || 0 }, currentXp: { ...step(Boolean(game?.level)), value: game?.level?.lifetimeXp ?? null }, currentLevel: { ...step(Boolean(game?.level)), value: game?.level?.current ?? null }, firstAchievement: step(Boolean(game?.achievements?.some(x => x.state === "earned"))), firstBadge: step(Boolean(game?.badges?.length)), recentReward: step(Boolean(game?.recentRewards?.length)), progressRewardsProjection: step(Boolean(game)), aiCoachContext: step(Boolean(user.profile || user.intake || user.goalsBaseline), true), steppingIntoGreatness: step(Boolean(greatness?.activities?.length), true), pushUpChallenge: step(Boolean(pushup?.completedSessions || pushup?.best), true) } };
  }
  return Object.freeze({ selected, designate, inspect });
}
module.exports = { createMemberJourneyService, step };
