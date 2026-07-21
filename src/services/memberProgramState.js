"use strict";

// Canonical member-facing precedence. Recommendations are deliberately kept
// separate: generating one must never activate it.
function resolveMemberProgramState(user = {}) {
  if (user.program) {
    const memberSelected = user.program.assignedBy === user.userId && user.program.source === "api";
    return { activeProgram: user.program, source: memberSelected ? "member_selected" : "coach_assigned", recommendations: recommendations(user) };
  }
  if (user.selectedProgram) return { activeProgram: user.selectedProgram, source: "member_selected", recommendations: recommendations(user) };
  const generated = user.generatedWorkoutPlan;
  if (generated?.plan && generated.recommendationOnly === false && generated.plan.status === "active") return { activeProgram: generated.plan, source: "generated_active", recommendations: recommendations(user) };
  if (user.templateProgram) return { activeProgram: user.templateProgram, source: "template_fallback", recommendations: recommendations(user) };
  return { activeProgram: null, source: "none", recommendations: recommendations(user) };
}

function recommendations(user) {
  return [user.programRecommendation?.recommendedProgram, user.generatedWorkoutPlan?.recommendationOnly !== false ? user.generatedWorkoutPlan?.plan : null].filter(Boolean);
}

module.exports = { resolveMemberProgramState };
