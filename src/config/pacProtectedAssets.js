"use strict";
// Never publish these files through the unauthenticated static frontend.
// The backend authenticates verified group members before serving them.
const PAC_PROTECTED_ASSETS=Object.freeze([
 "eight-limbs-adinkra.html",
 "eight-limbs-adinkra.js",
 "eight-pillars-story-review.html",
 "eight-pillars-story-review.js",
 "eight-pillars-review-stories.json",
 "eight-pillars-week-01-approved.txt"
]);
module.exports={PAC_PROTECTED_ASSETS};
