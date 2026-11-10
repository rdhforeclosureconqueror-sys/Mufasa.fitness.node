"use strict";

const crypto = require("node:crypto");

const OWNER_EMAIL = "rdhforeclosureconqueror@gmail.com";

function clean(value, fallback = "Not available") {
  const text = String(value ?? "").replace(/[\r\n\x00-\x1f]/g, " ").trim().slice(0, 1200);
  return text || fallback;
}

function bulletList(items) {
  const safe = Array.isArray(items) ? items.slice(0, 3) : [];
  return safe.length ? safe.map((item) => `• ${clean(item)}`).join("\n") : "• Available in the full Garvey result";
}

function buildGarveyAssessmentEmailText(notification = {}) {
  return [
    `Garvey — New ${clean(notification.assessmentName, "Archetype Assessment")}`,
    `Name: ${clean(notification.participantName)}`,
    `Email: ${clean(notification.participantEmail)}`,
    `Primary result: ${clean(notification.primaryResult)}`,
    notification.secondaryResult ? `Secondary pattern: ${clean(notification.secondaryResult)}` : null,
    "",
    "SUMMARY",
    clean(notification.summary, "Open the full result for the complete breakdown."),
    "",
    "STRENGTHS",
    bulletList(notification.strengths),
    "",
    "GROWTH EDGES",
    bulletList(notification.growthEdges),
    "",
    `Open result: ${clean(notification.resultUrl)}`,
  ].filter(Boolean).join("\n");
}

async function sendGarveyAssessmentNotification({ notification, env = process.env, fetchImpl = globalThis.fetch }) {
  const from = env.PRIVATE_SESSION_EMAIL_FROM || env.EVENT_EMAIL_FROM;
  if (!env.RESEND_API_KEY || !from) return { sent: false, reason: "not_configured" };
  const resultId = clean(notification?.resultId, "unknown-result");
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.createHash("sha256").update(`garvey-assessment:${resultId}`).digest("hex"),
    },
    body: JSON.stringify({
      from,
      to: [env.GARVEY_ASSESSMENT_NOTIFICATION_TO || OWNER_EMAIL],
      subject: `Garvey — New ${clean(notification?.assessmentName, "Archetype Assessment")}: ${clean(notification?.participantName, "Participant")}`,
      text: buildGarveyAssessmentEmailText(notification),
    }),
  });
  if (!response.ok) throw new Error(`GARVEY_EMAIL_PROVIDER_HTTP_${response.status}`);
  return { sent: true };
}

module.exports = { buildGarveyAssessmentEmailText, sendGarveyAssessmentNotification };
