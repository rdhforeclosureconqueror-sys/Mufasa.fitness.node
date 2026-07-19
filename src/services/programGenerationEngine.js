"use strict";

const GENERATOR_VERSION = 1;
const norm = value => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
const unique = values => [...new Set(values.filter(Boolean))];
const hasGoal = (goals, terms) => goals.some(goal => terms.some(term => norm(goal).includes(term)));
const ALIASES = { bodyweight:"bodyweight", none:"bodyweight", bands:"resistance_bands", resistance_band:"resistance_bands", resistance_bands:"resistance_bands", dumbbell:"dumbbells", dumbbells:"dumbbells", barbell:"barbell", machine:"machines", machines:"machines", kettlebell:"kettlebells", kettlebells:"kettlebells" };
const TITLES = { general_fitness:"General Fitness Foundation", yoga:"Yoga & Mobility Foundation", athlete_performance:"Athlete Performance Foundation", general_fitness_yoga:"Strength & Yoga Foundation", general_fitness_athlete:"Fitness & Performance Foundation", yoga_athlete:"Athletic Mobility Foundation", athlete_rugby:"Rugby Performance Foundation" };

function equipmentFor(profile) {
  const items = (profile.equipmentAvailability?.equipment || []).map(item => ALIASES[norm(item)]).filter(Boolean);
  if (["yes","true","full","gym","available"].includes(norm(profile.equipmentAvailability?.gymAccess))) items.push("dumbbells", "barbell", "resistance_bands", "machines");
  return unique(["bodyweight", ...items]);
}
function pathwayFor(profile) {
  const paths = profile.pathways || [], general=paths.includes("general_fitness"), yoga=paths.includes("yoga_wellness"), athlete=paths.includes("athlete_performance");
  if (athlete && profile.rugbyEnabled) return "athlete_rugby";
  if (general && yoga) return "general_fitness_yoga";
  if (general && athlete) return "general_fitness_athlete";
  if (yoga && athlete) return "yoga_athlete";
  if (athlete) return "athlete_performance";
  if (yoga) return "yoga";
  return "general_fitness";
}
const exercise = (name, movement, equipment="bodyweight") => ({ name, movement, equipment });
function strengthMovements(equipment) {
  const has = item => equipment.includes(item);
  return {
    squat: has("barbell") ? exercise("Barbell box squat","squat","barbell") : has("dumbbells") ? exercise("Goblet squat","squat","dumbbells") : exercise("Tempo bodyweight squat","squat"),
    hinge: has("barbell") ? exercise("Barbell Romanian deadlift","hinge","barbell") : has("dumbbells") ? exercise("Dumbbell Romanian deadlift","hinge","dumbbells") : exercise("Glute bridge","hinge"),
    pull: has("machines") ? exercise("Cable row","pull","machines") : has("dumbbells") ? exercise("One-arm dumbbell row","pull","dumbbells") : has("resistance_bands") ? exercise("Band row","pull","resistance_bands") : exercise("Prone W raise","pull"),
    press: has("dumbbells") ? exercise("Dumbbell floor press","push","dumbbells") : has("resistance_bands") ? exercise("Band chest press","push","resistance_bands") : exercise("Incline push-up","push")
  };
}

function generateProgram(profile={}) {
  const pathway=pathwayFor(profile), equipment=equipmentFor(profile), goals=profile.goals || [];
  const available=Number(profile.trainingAvailability?.sessionsPerWeek || profile.trainingAvailability?.activeDaysPerWeek);
  const frequency=Math.max(2,Math.min(6,Number.isFinite(available)?Math.round(available):3));
  const requested=Number(profile.trainingAvailability?.sessionLengthMinutes);
  const duration=Math.max(20,Math.min(90,Number.isFinite(requested)?Math.round(requested):(pathway==="yoga"?40:45)));
  const experience=["advanced","intermediate"].includes(norm(profile.experienceLevel))?norm(profile.experienceLevel):"beginner";
  const healthReview=profile.healthReviewRequired===true, yoga=pathway.includes("yoga"), athlete=pathway.includes("athlete") || pathway==="athlete_rugby", moves=strengthMovements(equipment);
  const strengthDays=pathway==="yoga"?0:Math.min(3,Math.max(2,frequency-(yoga?1:0))), sessions=[];
  for(let day=0;day<frequency;day++) {
    const mobilityDay=pathway==="yoga" || (yoga && day===frequency-1), conditioningDay=!mobilityDay && day>=strengthDays;
    const focus=mobilityDay?"mobility_and_recovery":conditioningDay?"conditioning":athlete&&day===1?"power_and_strength":"full_body_strength";
    const exercises=mobilityDay?[exercise("Breathing reset","breathing"),exercise("Cat-cow flow","spinal_mobility"),exercise("Low lunge flow","hip_mobility"),exercise("Supported relaxation","recovery")]:conditioningDay?[exercise("Low-impact intervals","conditioning"),exercise("Dead bug","core"),exercise("Mobility cooldown","mobility")]:[moves.squat,moves.hinge,moves.press,moves.pull,exercise(athlete?"Acceleration mechanics":"Dead bug",athlete?"speed":"core")];
    sessions.push({day:day+1,focus,durationMinutes:duration,exercises});
  }
  const progression=healthReview?"No progression until health review clearance":experience==="advanced"?"Weekly load or complexity progression when all reps are controlled":experience==="intermediate"?"Add repetitions, then small load increases every 1–2 weeks":"Build technique first; add repetitions before resistance";
  const recovery={restDaysPerWeek:experience==="advanced"?1:2,focus:unique(["sleep","hydration",(yoga||hasGoal(goals,["mobility","recovery","return"]))&&"mobility",athlete&&"sport_readiness",hasGoal(goals,["recovery"])&&"active_recovery"]),guidance:healthReview?"Use only comfortable breathing and gentle mobility approved for you; full programming requires health review.":"Keep at least one low-load day between demanding strength sessions."};
  const safeSessions=healthReview?[{day:1,focus:"gentle_recovery",durationMinutes:Math.min(20,duration),exercises:[exercise("Comfortable breathing practice","breathing"),exercise("Gentle range-of-motion practice","mobility")]}]:sessions;
  return { recommendedProgram:{id:`journey_starter_${pathway}_v${GENERATOR_VERSION}`,title:healthReview?"Health Review Starter Recommendation":TITLES[pathway],pathway,experience,equipment,goalEmphasis:{conditioning:hasGoal(goals,["weight_loss","lose_body","fat_loss","performance","endurance"]),mobility:yoga||hasGoal(goals,["mobility","recovery","return"]),strength:pathway!=="yoga"||hasGoal(goals,["strength","muscle"]),performance:athlete},sessions:safeSessions,volume:healthReview?"Gentle activity only within comfortable limits":experience==="advanced"?"4 sets of 6–10":experience==="intermediate"?"3 sets of 8–12":"2 sets of 8–12",unrestricted:!healthReview}, recommendedPhase:healthReview?"health_review_limited_start":"foundation", recommendedFrequency:healthReview?1:frequency, recommendedSessionLength:healthReview?Math.min(20,duration):duration, recommendedSplit:healthReview?"review_gated_recovery_only":pathway==="yoga"?"yoga_mobility":yoga?"strength_mobility_hybrid":athlete?"strength_power_conditioning":"full_body", recommendedProgression:progression, recommendedRecovery:recovery };
}
module.exports={GENERATOR_VERSION,generateProgram};
