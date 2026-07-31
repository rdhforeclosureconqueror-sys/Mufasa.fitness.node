"use strict";

function createMemberExperienceCapabilityService({ userStore, challengeService }) {
  function get(userId) {
    const user = userStore.loadUser(userId);
    const greatness = user.steppingIntoGreatness || null;
    const pushup = challengeService.getMemberPushupSummary(userId);
    return {
      schemaVersion: 1,
      capabilities: [
        {
          capabilityId: "stepping_into_greatness",
          name: "Stepping Into Greatness",
          implementationPresent: true,
          routePresent: true,
          navigationPresent: true,
          apiHealthy: true,
          persistenceHealthy: true,
          memberStateAvailable: Boolean(greatness),
          gamificationConnected: false,
          notificationsConnected: false,
          leaderboardConnected: false,
          aiCoachContextConnected: true,
          launchStatus: "READY_WITH_LIMITATION",
          remediation: "Authoritative journey state is restored; gamification and notification event contracts remain intentionally unconfigured."
        },
        {
          capabilityId: "push_up_challenge",
          name: "Push-Up Challenge",
          implementationPresent: true,
          routePresent: true,
          navigationPresent: true,
          apiHealthy: true,
          persistenceHealthy: true,
          memberStateAvailable: pushup.completedSessions > 0,
          gamificationConnected: false,
          notificationsConnected: false,
          leaderboardConnected: true,
          aiCoachContextConnected: true,
          launchStatus: "READY_WITH_LIMITATION",
          remediation: "Leaderboard is all-time and consent-gated; rewards and external notifications remain intentionally unconfigured."
        }
      ]
    };
  }

  return Object.freeze({ get });
}

module.exports = { createMemberExperienceCapabilityService };
