"use strict";

const GOALS = Object.freeze(["general_fitness", "muscle_gain", "strength", "fat_loss", "mobility"]);
const DIFFICULTIES = Object.freeze(["beginner", "intermediate", "advanced"]);

const EXERCISES = Object.freeze({
  squat: [{ id:"bodyweight_squat", equipment:"bodyweight", difficulty:1 }, { id:"goblet_squat", equipment:"dumbbell", difficulty:2 }, { id:"back_squat", equipment:"barbell", difficulty:3 }],
  hinge: [{ id:"glute_bridge", equipment:"bodyweight", difficulty:1 }, { id:"dumbbell_rdl", equipment:"dumbbell", difficulty:2 }, { id:"barbell_deadlift", equipment:"barbell", difficulty:3 }],
  push: [{ id:"incline_push_up", equipment:"bodyweight", difficulty:1 }, { id:"push_up", equipment:"bodyweight", difficulty:2 }, { id:"bench_press", equipment:"barbell", difficulty:3 }],
  pull: [{ id:"prone_snow_angel", equipment:"bodyweight", difficulty:1 }, { id:"band_row", equipment:"band", difficulty:1 }, { id:"one_arm_row", equipment:"dumbbell", difficulty:2 }, { id:"barbell_row", equipment:"barbell", difficulty:3 }],
  core: [{ id:"dead_bug", equipment:"bodyweight", difficulty:1 }, { id:"plank", equipment:"bodyweight", difficulty:2 }]
});

const GOAL_RULES = Object.freeze({
  general_fitness:{ sets:3, reps:10, intensity:6, cardio:true }, muscle_gain:{ sets:4, reps:10, intensity:7 },
  strength:{ sets:4, reps:5, intensity:8 }, fat_loss:{ sets:3, reps:12, intensity:6, cardio:true },
  mobility:{ sets:2, reps:8, intensity:4, yoga:true }
});

module.exports = { GOALS, DIFFICULTIES, EXERCISES, GOAL_RULES };
