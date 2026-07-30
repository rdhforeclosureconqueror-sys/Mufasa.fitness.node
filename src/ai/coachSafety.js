"use strict";
const RULES = [
  ["emergency", /(?:chest pain|can't breathe|cannot breathe|unconscious|medical emergency)/i, "This may be an emergency. Stop exercising and contact local emergency services now. I cannot diagnose or provide emergency care."],
  ["self_harm", /(?:kill myself|suicide|self[- ]harm)/i, "I'm sorry you're dealing with this. Please contact local emergency services or a crisis service now, and stay with someone you trust. I can't safely coach this situation."],
  ["acute_injury", /(?:severe pain|acute injury|bone (?:is|looks) broken|torn ligament)/i, "Stop the exercise and seek prompt assessment from a qualified medical professional. I cannot diagnose an injury."],
  ["eating_disorder", /(?:starve myself|purge|vomit after eating|dangerous restriction)/i, "I can't help with dangerous restriction or purging. Please speak with a qualified clinician or eating-disorder support service."],
  ["clinical", /(?:diagnose me|what medication|dosage|steroid cycle|how much insulin)/i, "I can offer general fitness education, but not diagnosis, medication, or prohibited-substance instructions. Please consult a qualified clinician."],
  ["injection", /(?:ignore (?:all |previous |your )?(?:instructions|rules)|reveal (?:the )?(?:system prompt|secret|policy|events?)|admin(?:istrative)? access|other users?)/i, "I can't expose or override private prompts, policies, secrets, administrative systems, or another member's information. I can still help with an ordinary fitness question."],
  ["authority_override", /(?:award me|change my (?:xp|level)|mark (?:my )?workout complete|invent (?:a )?workout)/i, "I can't change or invent workouts, XP, levels, or achievements. Those results only come from Mufasa's authoritative services."]
];
function inspectInput(value) { for (const [category, pattern, response] of RULES) if (pattern.test(value)) return { blocked: true, category, response }; return { blocked: false }; }
function inspectOutput(value) {
  if (/(?:system prompt|OPENAI_API_KEY|authorization: bearer|administrative event stream)/i.test(value)) return { approved: false, response: "I can't provide internal prompts, credentials, policies, or administrative details." };
  return { approved: true, response: value };
}
module.exports = { inspectInput, inspectOutput };
