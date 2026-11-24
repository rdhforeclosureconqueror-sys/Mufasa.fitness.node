const { evaluateSafety } = require('./safety-evaluator.cjs');
const cases = [
  [
    "pain",
    {
      "screening": true,
      "pain": true
    },
    "block_and_refer"
  ],
  [
    "unknown pain",
    {
      "screening": true
    },
    "hold_for_review"
  ],
  [
    "reference",
    {
      "screening": true,
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "belowReference": true
    },
    "contextual_flag_only"
  ],
  [
    "no improvement",
    {
      "screening": true,
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "progress": "unchanged"
    },
    "review"
  ],
  [
    "pain with progress",
    {
      "screening": true,
      "pain": true,
      "progress": "improved"
    },
    "block_and_refer"
  ],
  [
    "clinical nutrition",
    {
      "clinicalNutritionConcern": true
    },
    "refer"
  ],
  [
    "supplement",
    {
      "supplementRequested": true
    },
    "hold_recommendation"
  ],
  [
    "privacy",
    {
      "youthDataProcessing": true
    },
    "hold_processing"
  ],
  [
    "sleep persistent",
    {
      "persistentSleepProblem": true
    },
    "human_followup"
  ],
  [
    "short sleep",
    {
      "shortSleep": true
    },
    "no_standalone_injury_prediction"
  ],
  [
    "medical scope",
    {
      "medicalInterventionRequested": true
    },
    "refer"
  ],
  [
    "unknown scope",
    {
      "coachScreeningRequested": true
    },
    "hold_for_review"
  ],
  [
    "conflict",
    {
      "screening": true,
      "pain": true,
      "belowReference": true,
      "supplementRequested": true
    },
    "block_and_refer"
  ],
  [
    "empty",
    {},
    "no_decision"
  ],
  [
    "invalid technique",
    {
      "screening": true,
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": false
    },
    "hold_for_review"
  ],
  [
    "worsening",
    {
      "screening": true,
      "pain": false,
      "clinicalConcern": false,
      "validTechnique": true,
      "progress": "worse"
    },
    "review"
  ]
];
function runTests(evaluate) { return cases.map(([name,input,expected])=>{const result=evaluate(input);return {name,expected,actual:result.primary,pass:result.primary===expected && result.automatedPrescriptionAllowed===false};}); }
const results = runTests(evaluateSafety);
console.log(JSON.stringify(results,null,2));
if(results.some(r=>!r.pass)) process.exitCode=1;
