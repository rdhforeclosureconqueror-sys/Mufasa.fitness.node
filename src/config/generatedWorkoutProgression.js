"use strict";

module.exports = Object.freeze({
  evaluatorVersion: 1,
  lifecycleVersion: 1,
  minimumSessionAdherencePercent: 50,
  progressSessionAdherencePercent: 80,
  adequateCheckInAdherencePercent: 70,
  poorRecovery: Object.freeze({ painFlag: true, sorenessAtLeast: 7, energyAtMost: 3, sleepHoursBelow: 6 }),
  acceptableRecovery: Object.freeze({ sorenessAtMost: 6, energyAtLeast: 4, sleepHoursAtLeast: 6 }),
  boundaries: Object.freeze({ maxSets: 5, minSets: 1, maxReps: 20, minReps: 1, maxWeeklyFrequency: 6, maxSessionMinutes: 120, deloadVolumeFactor: 0.75 })
});
