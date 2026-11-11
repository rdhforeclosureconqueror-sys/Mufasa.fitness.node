"use strict";

const { ApiError } = require("../lib/apiResponse");

const ALLOWED_ENGINES = new Set(["love", "loyalty"]);
const safeText = (value, max = 48) => String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const email = value => safeText(value, 254).toLowerCase();

function labelsFromResult(payload, engine) {
  const content = payload?.result_payload || payload || {};
  const candidates = [content.primaryArchetype, content.secondaryArchetype]
    .map(value => safeText(value?.label || value?.name || value?.identity || value?.code))
    .filter(Boolean);
  for (const item of content.rankedArchetypes || []) {
    const label = safeText(item?.label || item?.name || item?.identity || item?.code);
    if (label && !candidates.includes(label)) candidates.push(label);
    if (candidates.length === 3) break;
  }
  if (!candidates.length) throw new ApiError("GARVEY_RESULT_INVALID", "That assessment result could not provide Community ID cards.", 422);
  return candidates.slice(0, 3).map(label => ({ source: engine, label }));
}

function resultEmail(payload) {
  const content = payload?.result_payload || payload || {};
  return email(content?.attribution?.email || content?.canonical?.attribution?.email);
}

function createCommunityAssessmentImportService({ cardService, fetchImpl = globalThis.fetch, origin = process.env.GARVEY_ASSESSMENT_ORIGIN || "https://garveybackend.onrender.com" } = {}) {
  if (!cardService?.get || !cardService?.save) throw new Error("Community card service required");
  async function importResult({ userId, userEmail, engineType, resultId }) {
    const engine = safeText(engineType, 16).toLowerCase();
    const id = safeText(resultId, 160);
    if (!ALLOWED_ENGINES.has(engine) || !/^[A-Za-z0-9_-]{3,160}$/.test(id)) throw new ApiError("GARVEY_RESULT_INVALID", "Choose a valid Love or Loyalty assessment result.", 400);
    const memberEmail = email(userEmail);
    if (!memberEmail) throw new ApiError("GARVEY_EMAIL_REQUIRED", "Sign in with the same email you used for the assessment before adding cards.", 409);
    let response;
    try { response = await fetchImpl(new URL(`/api/archetype-engines/${encodeURIComponent(engine)}/results/${encodeURIComponent(id)}`, origin), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(7000) }); }
    catch (_) { throw new ApiError("GARVEY_RESULT_UNAVAILABLE", "We could not reach that assessment result right now.", 503); }
    if (!response.ok) throw new ApiError("GARVEY_RESULT_UNAVAILABLE", "That assessment result is unavailable.", response.status === 404 ? 404 : 502);
    const result = await response.json().catch(() => null);
    if (resultEmail(result) !== memberEmail) throw new ApiError("GARVEY_RESULT_OWNERSHIP", "This assessment belongs to a different email address.", 403);
    const card = cardService.get(userId);
    if (!card) throw new ApiError("COMMUNITY_CARD_REQUIRED", "Create your Community ID first, then add your assessment cards.", 409);
    const imported = labelsFromResult(result, engine);
    const assessmentHighlights = [...(card.assessmentHighlights || []).filter(item => (typeof item === "string" ? true : item.source !== engine)), ...imported];
    const { displayName, bioShort, interests, goals, visibility, animationClip, colorTheme, backgroundImage, useHubBackground } = card;
    return cardService.save(userId, { displayName, bioShort, interests, goals, visibility, animationClip, colorTheme, backgroundImage, useHubBackground, assessmentHighlights });
  }
  return Object.freeze({ importResult, labelsFromResult, resultEmail });
}

module.exports = { createCommunityAssessmentImportService, labelsFromResult, resultEmail };
