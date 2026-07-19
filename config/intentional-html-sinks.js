"use strict";
// Temporary, reviewed template-rendering sinks. Every entry requires escaping of interpolated untrusted values.
module.exports = Object.freeze({
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
  ,"public/workout.html": "Compatibility bootstrap writes a constant local script tag only; no untrusted interpolation."
});
