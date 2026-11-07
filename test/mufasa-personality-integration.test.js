"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCoachPrompt, SYSTEM_BEHAVIOR, wellnessPersonalityInstruction } = require("../src/ai/coachPromptBuilder");
const profile = require("../src/ai/personalities/mufasa-wellness.draft.json");

test("draft personality cannot activate even if feature flag is enabled", () => {
  assert.equal(wellnessPersonalityInstruction({ MUFASA_WELLNESS_PERSONALITY_ENABLED: "true" }), null);
  assert.equal(wellnessPersonalityInstruction({ MUFASA_WELLNESS_PERSONALITY_ENABLED: "false" }), null);
});

test("existing coach behavior and grounding remain unchanged", () => {
  const context = { generatedAt: "2026-11-06", member: {}, goals: {}, recovery: {}, workouts: {}, yoga: {}, memberExperiences: {}, progress: {} };
  const original = process.env.MUFASA_WELLNESS_PERSONALITY_ENABLED;
  try {
    process.env.MUFASA_WELLNESS_PERSONALITY_ENABLED = "true";
    const messages = buildCoachPrompt({ context, history: [], message: "How do I begin?" });
    assert.equal(messages[0].content, SYSTEM_BEHAVIOR);
    assert.equal(messages.some(m => m.name === "wellness_personality"), false);
    assert.equal(messages.at(-1).content, "How do I begin?");
    assert.equal(messages.find(m => m.name === "conversation_contract").role, "system");
    assert.equal(profile.enabled, false);
  } finally {
    if (original === undefined) delete process.env.MUFASA_WELLNESS_PERSONALITY_ENABLED;
    else process.env.MUFASA_WELLNESS_PERSONALITY_ENABLED = original;
  }
});
