"use strict";
function deriveExerciseAnalytics(events=[]){const result={popularity:{},completions:{},substitutions:{},cameraUsage:{},programUsage:{}};for(const event of events){const id=event.exerciseId;if(!id)continue;const bucket=event.type==="completed"?"completions":event.type==="substituted"?"substitutions":event.type==="camera_used"?"cameraUsage":event.type==="program_scheduled"?"programUsage":"popularity";result[bucket][id]=(result[bucket][id]||0)+1;}return result;}
module.exports={deriveExerciseAnalytics};
