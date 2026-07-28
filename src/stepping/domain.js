"use strict";

const ACTIVITY_TYPES = Object.freeze(["walk", "jog", "run", "trail_walk", "trail_run"]);
const ACTIVE_CHALLENGE_METRICS = Object.freeze(["distance", "duration", "activity_count", "active_days", "community_distance"]);
const FUTURE_CHALLENGE_METRICS = Object.freeze(["steps", "crew_distance", "route_completion"]);
const DEFAULT_PRIVACY = Object.freeze({
  activityVisibleToCommunity: true,
  routeVisible: false,
  exactStartTimeVisible: false,
  paceVisible: true
});

const GPS_DEFAULTS = Object.freeze({
  maximumAccuracyMeters: 50,
  staleAfterMs: 30_000,
  minimumSegmentMeters: 3,
  jumpDistanceMeters: 250,
  maximumSpeedMetersPerSecond: Object.freeze({ walk: 4, jog: 6, run: 12, trail_walk: 4, trail_run: 10 })
});

const MILE_METERS = 1609.344;
const KILOMETER_METERS = 1000;
const BADGES = Object.freeze([
  ["first_step", "First Step", "journey", "activity_count", 1, "count"],
  ["first_walk", "First Walk", "journey", "walk_count", 1, "count"],
  ["first_run", "First Run", "journey", "run_count", 1, "count"],
  ["first_trail", "First Trail", "trail", "trail_count", 1, "count"],
  ["first_mile", "First Mile", "distance", "single_distance", MILE_METERS, "meters"],
  ["first_5k", "First 5K", "distance", "single_distance", 5000, "meters"],
  ["first_10k", "First 10K", "distance", "single_distance", 10000, "meters"],
  ...[[10,"Finding Your Stride"],[25,"Momentum"],[50,"Going the Distance"],[100,"Century in Motion"],[250,"Pathmaker"],[500,"Greatness in Motion"],[1000,"Thousand-Mile Journey"]]
    .map(([miles, name]) => [`lifetime_${miles}_miles`, name, "distance", "lifetime_distance", miles * MILE_METERS, "meters"]),
  ["three_strong_days", "Three Strong Days", "consistency", "active_day_streak", 3, "days"],
  ["five_day_flow", "Five-Day Flow", "consistency", "active_day_streak", 5, "days"],
  ["seven_day_streak", "Seven-Day Streak", "consistency", "active_day_streak", 7, "days"]
].map(([achievementKey, name, category, metric, threshold, unit]) => Object.freeze({ achievementKey, name, description: name, category, metric, threshold, unit, repeatable: false, enabled: true, requiresVerifiedActivity: true })));

const FUTURE_STEP_BADGES = Object.freeze([1000, 5000, 10000, 25000, 50000, 100000].map((threshold) => Object.freeze({
  achievementKey: `steps_${threshold}`, name: `${threshold.toLocaleString("en-US")} Steps`, description: "Requires a trusted step source", category: "steps", metric: "steps", threshold, unit: "steps", repeatable: false, enabled: false, requiresVerifiedActivity: true
})));

module.exports = { ACTIVITY_TYPES, ACTIVE_CHALLENGE_METRICS, FUTURE_CHALLENGE_METRICS, DEFAULT_PRIVACY, GPS_DEFAULTS, BADGES, FUTURE_STEP_BADGES, MILE_METERS, KILOMETER_METERS };
