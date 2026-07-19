"use strict";

// Application-facing adapter for Journey Profile decisions. Recommendation
// consumers depend on this service rather than interpreting intake/profile data.
function createPersonalizationService({ journeyIntakeService }) {
  function getJourneyProfile(userId) {
    return journeyIntakeService.get(userId).journeyProfile;
  }

  function getPersonalization(userId) {
    const profile = getJourneyProfile(userId);
    const recommendations = profile.recommendations;
    const flags = Object.freeze({
      hasAthleteFeatures: profile.pathways.includes("athlete_performance"),
      hasYogaFeatures: profile.pathways.includes("yoga_wellness"),
      hasRugbyFeatures: profile.rugbyEnabled === true,
      requiresHealthReview: profile.healthReviewRequired === true,
      hasNutritionRecommendations: recommendations.nutrition.items.length > 0,
      hasAssessmentRecommendations: recommendations.assessments.items.length > 0
    });

    return {
      version: profile.version,
      recommendedWorkoutCategory: recommendations.workouts.category,
      recommendedDashboard: { ...recommendations.dashboard, modules: [...recommendations.dashboard.modules] },
      recommendedAssessments: [...recommendations.assessments.items],
      nutritionPriorities: [...recommendations.nutrition.items],
      equipmentProfile: {
        ...profile.equipmentAvailability,
        equipment: [...profile.equipmentAvailability.equipment]
      },
      trainingProfile: {
        experienceLevel: profile.experienceLevel,
        availability: {
          ...profile.trainingAvailability,
          days: [...profile.trainingAvailability.days],
          times: [...profile.trainingAvailability.times]
        }
      },
      healthReviewState: recommendations.reviewStatus,
      featureFlags: flags
    };
  }

  return {
    getPersonalization,
    getWorkoutRecommendation: userId => {
      const personalization = getPersonalization(userId);
      return { category: personalization.recommendedWorkoutCategory, equipmentProfile: personalization.equipmentProfile, trainingProfile: personalization.trainingProfile, healthReviewState: personalization.healthReviewState };
    },
    getDashboardConfiguration: userId => getPersonalization(userId).recommendedDashboard,
    getNutritionPriorities: userId => getPersonalization(userId).nutritionPriorities,
    getAssessmentRecommendations: userId => getPersonalization(userId).recommendedAssessments,
    getFeatureFlags: userId => getPersonalization(userId).featureFlags
  };
}

module.exports = { createPersonalizationService };
