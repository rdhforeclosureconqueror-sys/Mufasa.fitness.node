"use strict";
// Phase 12B reviewed browser sink baseline. Counts make additions fail the repository check.
module.exports = Object.freeze({
  "public/app-hydration-runtime.js": { count: 1, safety: "Clears an existing container; no HTML is interpolated." },
  "public/coach-runtime.js": { count: 1, safety: "Clears a select before createElement option rendering." },
  "public/dashboard.js": { count: 6, safety: "Structural templates only; API/member strings pass the local HTML encoder." },
  "public/exercise-library.js": { count: 3, safety: "Catalog display values pass esc(); failures render encoded text." },
  "public/generated-workout-runtime.js": { count: 6, safety: "Persisted workout display values pass esc(); remaining markup is constant." },
  "public/member-home-runtime.js": { count: 1, safety: "API display strings pass the local esc() encoder." },
  "public/nutrition-runtime.js": { count: 19, safety: "Provider/member strings pass escapeHtml(); structural templates are constants." },
  "public/profile-runtime.js": { count: 1, safety: "Renders only fixed status markup and encoded output." },
  "public/retention-flow.js": { count: 15, safety: "Persisted/member values pass esc(); structural markup is constant." },
  "public/retention-journey-wizard.js": { count: 3, safety: "Journey answers pass esc() before template insertion." },
  "public/workout-runtime.js": { count: 2, safety: "Challenge display values pass escapeHtml(); structural table markup is constant." }
});
