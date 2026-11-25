const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evaluateProgramme}=require('./programme-evaluator.cjs');
function run(evaluate,cases){return cases.map(([name,input,expected])=>{const before=JSON.stringify(input),r=evaluate(input);return {name,pass:r.status===expected&&r.automatedPrescriptionAllowed===false&&before===JSON.stringify(input)&&(name!=="missing actual"||r.delta===null&&r.record.actual_load===null)&&(name!=="modified approved"||r.delta===800&&r.record.planned_load.value===4500&&r.record.modification_reason==="coach adjustment")&&(name!=="zero actual"||r.delta===-4500)}})}
const results=run(evaluateProgramme,[
  [
    "valid",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        }
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      }
    },
    "RECORDED"
  ],
  [
    "orphan",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "wrong",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        }
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "missing objective",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        }
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "missing actual",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": null
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      }
    },
    "AWAITING_ACTUAL"
  ],
  [
    "unit mismatch",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "km",
          "protocol": "gps-v1",
          "value": 4500
        }
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "calendar change",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        }
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "matchCalendarChanged": true
    },
    "REVIEW_REQUIRED"
  ],
  [
    "referral",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        }
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "refer"
      }
    },
    "REFER"
  ],
  [
    "modified approved",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 5300
        },
        "coach_approval": true,
        "intent_reviewed": true,
        "modification_reason": "coach adjustment"
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      }
    },
    "RECORDED"
  ],
  [
    "modified unapproved",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 5300
        }
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "null",
    null,
    "REVIEW_REQUIRED"
  ],
  [
    "unknown safety",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        }
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": null
    },
    "REVIEW_REQUIRED"
  ],
  [
    "zero actual",
    {
      "season": {
        "id": "s",
        "objective": "development"
      },
      "phase": {
        "id": "p",
        "season_id": "s",
        "objective": "preseason"
      },
      "mesocycle": {
        "id": "m",
        "phase_id": "p",
        "objective": "power"
      },
      "microcycle": {
        "id": "w",
        "mesocycle_id": "m",
        "objective": "power exposure"
      },
      "session": {
        "id": "d",
        "microcycle_id": "w",
        "objective": "field",
        "planned_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 4500
        },
        "actual_load": {
          "metric": "distance",
          "unit": "m",
          "protocol": "gps-v1",
          "value": 0
        },
        "coach_approval": true,
        "intent_reviewed": true,
        "modification_reason": "cancelled"
      },
      "exercise": {
        "id": "e",
        "session_id": "d",
        "objective": "acceleration",
        "athlete_need": "speed"
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      }
    },
    "RECORDED"
  ]
]);
for(const r of results)test(r.name,()=>assert.ok(r.pass,JSON.stringify(r)));
