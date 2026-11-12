"use strict";

const { ApiError } = require("../lib/apiResponse");
const ALLOWED_ENGINES = new Set(["love", "loyalty"]);
const safeText = (value, max = 48) => String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const email = value => safeText(value, 254).toLowerCase();

function labelsFromResult(payload, engine) {
  const content = payload?.result_payload || payload || {};
  const candidates = [content.primaryArchetype, content.secondaryArchetype].map(value => safeText(value?.label || value?.name || value?.identity || value?.code)).filter(Boolean);
  for (const item of content.rankedArchetypes || []) {
    const label = safeText(item?.label || item?.name || item?.identity || item?.code);
    if (label && !candidates.includes(label)) candidates.push(label);
    if (candidates.length === 3) break;
  }
  if (!candidates.length) throw new ApiError("GARVEY_RESULT_INVALID", "That assessment result could not provide Community ID cards.", 422);
  return candidates.slice(0, 3).map(label => ({ source: engine, label }));
}
function resultEmail(payload) { const content = payload?.result_payload || payload || {}; return email(content?.attribution?.email || content?.canonical?.attribution?.email); }
function safeAssessmentList(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const engine = safeText(item?.engine, 16).toLowerCase(), resultId = safeText(item?.resultId, 160);
    const cards = Array.isArray(item?.cards) ? item.cards.map(card => safeText(card?.label, 48)).filter(Boolean).slice(0, 3).map(label => ({ source: engine, label })) : [];
    return ALLOWED_ENGINES.has(engine) && /^[A-Za-z0-9_-]{3,160}$/.test(resultId) && cards.length ? [{ engine, resultId, cards, linkedAt: String(item?.linkedAt || "") || null }] : [];
  });
}
function visibleAssessment(record) { return { engine: record.engine, cards: record.cards.map(card => ({ ...card })), linkedAt: record.linkedAt }; }

function createCommunityAssessmentImportService({ cardService, userStore, fetchImpl = globalThis.fetch, origin = process.env.GARVEY_ASSESSMENT_ORIGIN || "https://garveybackend.onrender.com", clock = () => new Date() } = {}) {
  if (!cardService?.get || !userStore?.loadUser || !userStore?.updateUser) throw new Error("Community card and canonical userStore required");
  const linkedAssessments = userId => safeAssessmentList(userStore.loadUser(userId).communityAssessments).map(visibleAssessment);
  async function importResult({ userId, userEmail, engineType, resultId }) {
    const engine = safeText(engineType, 16).toLowerCase(), id = safeText(resultId, 160);
    if (!ALLOWED_ENGINES.has(engine) || !/^[A-Za-z0-9_-]{3,160}$/.test(id)) throw new ApiError("GARVEY_RESULT_INVALID", "Choose a valid Love or Loyalty assessment result.", 400);
    const memberEmail = email(userEmail);
    if (!memberEmail) throw new ApiError("GARVEY_EMAIL_REQUIRED", "Sign in with the same email you used for the assessment before adding cards.", 409);
    let response;
    try { response = await fetchImpl(new URL(`/api/archetype-engines/${encodeURIComponent(engine)}/results/${encodeURIComponent(id)}`, origin), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(7000) }); }
    catch (_) { throw new ApiError("GARVEY_RESULT_UNAVAILABLE", "We could not reach that assessment result right now.", 503); }
    if (!response.ok) throw new ApiError("GARVEY_RESULT_UNAVAILABLE", "That assessment result is unavailable.", response.status === 404 ? 404 : 502);
    const result = await response.json().catch(() => null);
    if (resultEmail(result) !== memberEmail) throw new ApiError("GARVEY_RESULT_OWNERSHIP", "This assessment belongs to a different email address.", 403);
    const assessment = { engine, resultId: id, cards: labelsFromResult(result, engine), linkedAt: clock().toISOString() };
    userStore.updateUser(userId, user => { user.communityAssessments = [...safeAssessmentList(user.communityAssessments).filter(item => item.engine !== engine), assessment]; return user; });
    return { assessment: visibleAssessment(assessment), card: cardService.get(userId) };
  }
  return Object.freeze({ importResult, linkedAssessments, labelsFromResult, resultEmail });
}
module.exports = { createCommunityAssessmentImportService, labelsFromResult, resultEmail };
