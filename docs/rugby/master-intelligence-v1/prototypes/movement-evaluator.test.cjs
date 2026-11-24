const {evaluateMovement}=require('./movement-evaluator.cjs');
function run(fn,cases){return cases.map(([name,input,expected])=>{const before=JSON.stringify(input),r=fn(input);return {name,pass:r.status===expected&&r.automatedPrescriptionAllowed===false&&r.runtimeActivation===false&&before===JSON.stringify(input)&&(name!=="different retest"||r.retestMetadataCompatible===false)&&(name!=="same retest"||r.retestMetadataCompatible===true&&r.change===null)&&(name!=="conflict"||r.conflictingEvidence===true&&r.hypothesisEvidence.conflict[0]==="b")&&(name!=="three trials"||r.score===null)&&(name!=="missing trial"||r.reason==="invalid_trials")}})}
const results=run(evaluateMovement,[
  [
    "pain",
    {
      "pain": true,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      }
    },
    "REFER"
  ],
  [
    "concern",
    {
      "pain": false,
      "clinicalConcern": true,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      }
    },
    "REFER"
  ],
  [
    "unknown pain",
    {
      "pain": null,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "invalid technique",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": false,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "unverified protocol",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "different retest",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      },
      "previous": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "other",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "same retest",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      },
      "previous": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 30
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "conflict",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hip_rotation",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      },
      "hypothesis": {
        "support": [
          "a"
        ],
        "conflict": [
          "b"
        ]
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "missing trial",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "ckcuest",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35,
        "trials": [
          10,
          11
        ]
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "three trials",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "ckcuest",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35,
        "trials": [
          10,
          11,
          12
        ]
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "hamstring compensation",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "hamstring_popliteal",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35,
        "angleConvention": "demo",
        "pelvicControl": false,
        "nonTestLegControl": true
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "missing faults",
    {
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "assessment": {
        "athleteId": "synthetic",
        "test": "tuck_jump",
        "protocol": "demo",
        "method": "goniometer",
        "unit": "deg",
        "metric": "IR",
        "side": "left",
        "assessor": "demo",
        "date": "2026-11-24",
        "value": 35
      }
    },
    "REVIEW_REQUIRED"
  ],
  [
    "null",
    null,
    "REVIEW_REQUIRED"
  ]
]);
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
