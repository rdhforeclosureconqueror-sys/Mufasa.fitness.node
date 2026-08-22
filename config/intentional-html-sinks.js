"use strict";
// Temporary, reviewed template-rendering sinks. Every entry requires escaping of interpolated untrusted values.
module.exports = Object.freeze({
  "public/challenges.js": "Challenge library templates escape every definition-derived string with safe(); structural URLs use encodeURIComponent().",
  "public/challenge-page.js": "Challenge detail and mission templates escape every definition and progress string with safe(); structural identifiers are server-generated and URL components are encoded.",
  "public/kettlebell-workout-runtime.js": "Active workout templates escape every canonical workout, education, progress, and error string with safe(); URLs are fixed application routes or encoded identifiers.",
  "public/gamification.js": "Member progression templates encode every projection-derived string with esc(); numeric and state values are validated server projections.",
  "public/generated-workout-runtime.js": "Member workout templates use the local esc() encoder for all persisted display values.",
  "public/retention-journey-wizard.js": "Journey review templates encode persisted answers with esc().",
  "public/nutrition-runtime.js": "Nutrition templates encode provider/member strings with escapeHtml(); structural templates are constants.",
  "public/workout-runtime.js": "Challenge table template is reviewed and member strings must remain encoded.",
  "public/retention-flow.js": "Legacy retention structural templates use esc() for interpolated member data.",
  "public/dashboard.js": "Dashboard structural templates require follow-up consolidation; error formatter escapes text.",
  "public/profile-runtime.js": "Profile summary uses escaped fixed status output only.",
  "public/member-home-runtime.js": "Member home template uses local esc() for API strings.",
  "public/exercise-library.js": "Exercise cards encode catalog data; error output is rendered as text.",
  "public/app-hydration-runtime.js": "Only clears an existing container.",
  "public/coach-runtime.js": "Only clears a select before createElement option rendering."
  ,"public/notifications.js": "Constant structural shell only; all notification fields are rendered with textContent and action URLs are allow-listed."
  ,"public/leaderboards.js": "Constant structural shell and table header only; every ranking field is rendered with textContent."
  ,"public/workout.html": "Compatibility bootstrap writes a constant local script tag only; no untrusted interpolation."
  ,"public/greatness.js": "Greatness templates render server-controlled activity enums, identifiers, numeric metrics, and fixed application copy; route geometry is drawn to canvas."
  ,"public/map-diagnostics.js": "Temporary diagnostics templates escape every browser, URL, error, and event value; structural markup is fixed."
  ,"public/admin-trail-routes.js": "Admin route templates encode every persisted value before rendering; structural markup is fixed."
  ,"public/yoga.js": "Yoga session templates encode every catalog string with esc(); structural empty, error, and completion templates are fixed."
  ,"public/pocketpt-youth-program.js": "Youth program templates encode all server and participant strings with esc(); numeric values are canonical projections and inline actions are fixed same-origin reloads."
});
