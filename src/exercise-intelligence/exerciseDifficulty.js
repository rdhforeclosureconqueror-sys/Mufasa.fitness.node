"use strict";
function compare(a,b){return a.classification.difficultyScore-b.classification.difficultyScore;} function withinCeiling(exercise,level){return exercise.classification.difficultyScore<=({beginner:1,intermediate:2,advanced:3}[level]||1);}
module.exports={compare,withinCeiling};
