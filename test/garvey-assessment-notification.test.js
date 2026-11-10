"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGarveyAssessmentDeliveryTest, sendGarveyAssessmentNotification } = require("../src/services/garveyAssessmentNotificationService");

test("Garvey assessment verification uses the production notification contract", async () => {
  const notification = buildGarveyAssessmentDeliveryTest();
  const calls = [];
  const delivery = await sendGarveyAssessmentNotification({
    notification,
    env: { RESEND_API_KEY: "test-key", EVENT_EMAIL_FROM: "Mufasa Fit <notifications@example.test>" },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, text: async () => JSON.stringify({ id: "email_test_123" }) };
    },
  });

  assert.equal(delivery.sent, true);
  assert.equal(delivery.providerMessageId, "email_test_123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  const body = JSON.parse(calls[0].options.body);
  assert.match(body.subject, /Email Verification/);
  assert.equal(body.to[0], "rdhforeclosureconqueror@gmail.com");
  assert.match(body.text, /synthetic delivery check/i);
});

