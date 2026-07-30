"use strict";

const { ApiError } = require("../lib/apiResponse");
const { buildCoachPrompt } = require("../ai/coachPromptBuilder");

const SUGGESTIONS = Object.freeze([
  "How did I do in my latest workout?",
  "How close am I to leveling up?",
  "What have I improved recently?",
  "What should I focus on this week?",
  "What achievements am I working toward?",
  "What should I do for recovery?"
]);

function truthfulFallback(context) {
  const facts = [];
  if (context.workouts.latestCompletionSummary) facts.push("I can see your latest workout completion summary and can explain what it contributed.");
  else if (context.workouts.recent.length) facts.push(`I can see ${context.workouts.recent.length} recent workout${context.workouts.recent.length === 1 ? "" : "s"}.`);
  if (context.progress?.currentLevel != null) facts.push(`Your recorded level is ${context.progress.currentLevel} with ${context.progress.lifetimeXp} lifetime XP.`);
  if (context.progress?.xpToNextLevel != null) facts.push(`The platform shows ${context.progress.xpToNextLevel} XP remaining to the next level.`);
  if (context.goals?.goal) facts.push(`Your recorded goal is ${context.goals.goal}.`);
  if (!facts.length) facts.push("I don't have enough recorded platform data to personalize that yet.");
  return `${facts.join(" ")} The live coaching response service is temporarily unavailable, so I won't guess beyond those recorded facts.`;
}

function createAiCoachService({ userStore, contextService, responder = null }) {
  function history(userId) {
    const value = userStore.loadUser(userId).aiCoachConversation;
    return Array.isArray(value) ? value.slice(-24) : [];
  }

  function save(userId, items) {
    userStore.updateUser(userId, (user) => {
      user.aiCoachConversation = items.slice(-24);
      return user;
    });
  }

  function overview(userId) {
    return { context: contextService.build(userId), history: history(userId), suggestions: [...SUGGESTIONS] };
  }

  async function ask(userId, rawMessage) {
    const message = String(rawMessage || "").trim();
    if (!message || message.length > 2000) throw new ApiError("VALIDATION_ERROR", "message must be 1-2000 characters", 400, { field: "message" });
    const context = contextService.build(userId);
    const prior = history(userId);
    const prompt = buildCoachPrompt({ context, history: prior, message });
    let answer;
    if (responder) answer = String(await responder({ userId, prompt, context }) || "").trim();
    if (!answer) answer = truthfulFallback(context);
    const appended = [...prior, { role: "user", content: message }, { role: "assistant", content: answer }];
    save(userId, appended);
    return { answer, history: appended.slice(-24), suggestions: [...SUGGESTIONS], contextUpdatedAt: context.generatedAt };
  }

  function clear(userId) { save(userId, []); return { history: [] }; }
  return Object.freeze({ overview, ask, clear });
}

module.exports = { createAiCoachService, truthfulFallback, SUGGESTIONS };
