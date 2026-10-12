"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
test("event attendee navigation is available to admins on the existing dashboard", () => {
  const html = fs.readFileSync("public/dashboard.html", "utf8");
  const js = fs.readFileSync("public/dashboard.js", "utf8");
  assert.ok(html.includes('id="clientManagementCard"'));
  assert.ok(html.includes('id="eventCheckinsDashboardLink"'));
  assert.ok(html.includes('href="/admin-event-checkins.html"'));
  assert.ok(js.includes('eventCheckinsDashboardLink.hidden = !(roles.includes("admin") || roles.includes("super_admin"))'));
  assert.ok(!js.includes('eventCheckinsDashboardLink.hidden = !roles.includes("super_admin")'));
});
