(function initChallengeRouteContract(global) {
  "use strict";

  const CHALLENGE_PAGE_PATH = "/challenge.html";

  function challengePageUrl(slug) {
    const value = String(slug || "").trim();
    if (!value) throw new TypeError("A challenge slug is required");
    return `${CHALLENGE_PAGE_PATH}?slug=${encodeURIComponent(value)}`;
  }

  function challengeSlug(locationLike) {
    const url = new URL(locationLike.href, locationLike.origin);
    const querySlug = url.searchParams.get("slug");
    if (querySlug) return querySlug;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "challenges" && parts[1] ? decodeURIComponent(parts[1]) : "";
  }

  const contract = Object.freeze({ CHALLENGE_PAGE_PATH, challengePageUrl, challengeSlug });
  global.ChallengeRouteContract = contract;
  if (typeof module !== "undefined" && module.exports) module.exports = contract;
})(typeof window !== "undefined" ? window : globalThis);
