"use strict";

module.exports = Object.freeze([
  Object.freeze({ method: "GET", path: "/arena/push-up", authentication: "public-launch-shell", ownership: "no-protected-data", notes: "Requires an exchanged arena session before bootstrap succeeds." }),
  Object.freeze({ method: "POST", path: "/api/game/sessions", authentication: "canonical-pocketpt-bearer", ownership: "authenticated-member-self", writes: "ephemeral-world-session", notes: "Creates a short-lived one-time launch ticket scoped to PUSH_UP_ARENA/push_up." }),
  Object.freeze({ method: "POST", path: "/api/game/session-exchange", authentication: "one-time-arena-launch-ticket", ownership: "ticket-bound-member", writes: "http-only-arena-cookie", notes: "Consumes the ticket exactly once and never accepts canonical PocketPT credentials." }),
  Object.freeze({ method: "GET", path: "/api/game/bootstrap", authentication: "http-only-arena-session", ownership: "session-bound-member", publicOutput: "PocketPTWorldProtocol-v1-minimum-bootstrap" }),
  Object.freeze({ method: "DELETE", path: "/api/game/session", authentication: "http-only-arena-session", ownership: "session-bound-member", writes: "revoke-ephemeral-world-session" }),
  Object.freeze({ method: "GET", path: "/api/game/build", authentication: "public-build-readiness", ownership: "no-member-data", publicOutput: "Godot-build-availability-only" }),
  Object.freeze({ method: "GET", path: "/game/push-up-arena/*", authentication: "public-static-artifact", ownership: "generated-Godot-build-must-contain-no-member-data" })
]);
