"use strict";

const TAXONOMY = Object.freeze({
  movementPatterns: ["squat", "hinge", "horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "lunge", "carry", "rotation", "anti_rotation", "core", "mobility", "yoga", "other"],
  difficulties: ["beginner", "intermediate", "advanced"],
  planes: ["sagittal", "frontal", "transverse", "multi_planar"],
  goals: ["general_fitness", "strength", "muscle_gain", "fat_loss", "mobility", "movement_quality", "rehabilitation"],
  equipment: ["bodyweight", "dumbbell", "barbell", "band", "machine", "kettlebell", "cable", "other"]
});

const NORMALIZE_EQUIPMENT = Object.freeze({ body_only: "bodyweight", none: "bodyweight", bands: "band", exercise_ball: "other", e_z_curl_bar: "barbell" });
const PATTERN_BY_ID = Object.freeze({ squat:"squat", lunge:"lunge", deadlift:"hinge", rdl:"hinge", bridge:"hinge", bench_press:"horizontal_push", push_up:"horizontal_push", row:"horizontal_pull", pull_up:"vertical_pull", pulldown:"vertical_pull", press:"vertical_push", plank:"core", crunch:"core", sit_up:"core", yoga:"yoga", stretch:"mobility" });
function slug(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function equipment(value) { const key=slug(value); return NORMALIZE_EQUIPMENT[key] || (TAXONOMY.equipment.includes(key) ? key : "other"); }
function movementPattern(source={}) { const hay=slug(`${source.id} ${source.name}`); return Object.entries(PATTERN_BY_ID).find(([token])=>hay.includes(token))?.[1] || (source.category === "stretching" ? "mobility" : "other"); }
function classify(source={}) { const difficulty=TAXONOMY.difficulties.includes(source.level) ? source.level : "beginner"; const pattern=source.movementPattern || movementPattern(source); return Object.freeze({ movementPattern:pattern, primaryMuscles:[...(source.primaryMuscles||[])].map(slug), secondaryMuscles:[...(source.secondaryMuscles||[])].map(slug), equipment:equipment(source.equipment), difficulty, difficultyScore:TAXONOMY.difficulties.indexOf(difficulty)+1, movementPlane:["rotation","anti_rotation"].includes(pattern)?"transverse":pattern==="other"?"multi_planar":"sagittal", bodyRegion:(source.primaryMuscles||[]).some(m=>["quadriceps","hamstrings","glutes","calves"].includes(m))?"lower_body":(source.primaryMuscles||[]).includes("abdominals")?"core":"upper_body", mechanic:source.mechanic === "isolation" ? "isolation" : "compound", trainingGoals:source.category === "stretching" ? ["mobility","movement_quality"] : ["general_fitness","strength","muscle_gain"], executionStyle:["plyometrics","olympic weightlifting"].includes(source.category)?"explosive":"controlled", rehabilitationSuitability:pattern === "mobility" ? "conditional" : "screen_required" }); }
module.exports={TAXONOMY,slug,equipment,movementPattern,classify};
