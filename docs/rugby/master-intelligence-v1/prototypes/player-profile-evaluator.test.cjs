const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evaluateProfile}=require('./player-profile-evaluator.cjs');
const cases=[
  [
    "valid",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "coachPriority": "DEVELOP"
    },
    "DEVELOP"
  ],
  [
    "missing",
    {},
    "REVIEW_REQUIRED"
  ],
  [
    "referral",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "refer"
      },
      "coachPriority": "DEVELOP"
    },
    "REFER"
  ],
  [
    "hold",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "hold_for_review",
        "decisions": []
      },
      "coachPriority": "DEVELOP"
    },
    "REVIEW_REQUIRED"
  ],
  [
    "format mismatch",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "7s",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "coachPriority": "DEVELOP"
    },
    "REVIEW_REQUIRED"
  ],
  [
    "protocol mismatch",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "manual",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "coachPriority": "DEVELOP"
    },
    "REVIEW_REQUIRED"
  ],
  [
    "unreviewed",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": false
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "coachPriority": "DEVELOP"
    },
    "REVIEW_REQUIRED"
  ],
  [
    "no coach priority",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "coachPriority": null
    },
    "REVIEW_REQUIRED"
  ],
  [
    "invalid value",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": "1.9"
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "coachPriority": "DEVELOP"
    },
    "REVIEW_REQUIRED"
  ],
  [
    "null",
    null,
    "REVIEW_REQUIRED"
  ],
  [
    "trend",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "coachPriority": "DEVELOP",
      "previous": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 2
      }
    },
    "DEVELOP"
  ],
  [
    "incompatible trend",
    {
      "athlete": {
        "position": "Wing",
        "format": "XV",
        "level": "Club",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male"
      },
      "measurement": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.9
      },
      "benchmark": {
        "metric": "10m",
        "unit": "s",
        "protocol": "timing-gates-v1",
        "direction": "lower",
        "value": 1.8,
        "position": "Wing",
        "format": "XV",
        "level": "Elite",
        "targetLevel": "Elite",
        "ageGroup": "adult",
        "sexContext": "male",
        "source": "synthetic test only",
        "reviewed": true
      },
      "safety": {
        "primary": "no_decision",
        "decisions": []
      },
      "coachPriority": "DEVELOP",
      "previous": {
        "metric": "10m",
        "unit": "s",
        "protocol": "manual",
        "direction": "lower",
        "value": 2
      }
    },
    "DEVELOP"
  ]
];
for(const [name,input,expected] of cases)test(name,()=>{const r=evaluateProfile(input);if(r.status!==expected||r.automatedPrescriptionAllowed!==false||(name==='trend'&&Math.abs(r.trend-.1)>1e-9)||(name==='incompatible trend'&&r.trend!==null)||(name==='valid'&&Math.abs(r.gap-.1)>1e-9))throw Error(name);});
