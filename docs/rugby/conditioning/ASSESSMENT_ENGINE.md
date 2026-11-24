# Rugby HQ Assessment Engine Resource

Status: source-grounded inventory + implementation contract  
Primary source basis: Pocket PT × Advanced Conditioning Integration Specification v1.0 plus the conditioning thread.

## 1. Assessment domains explicitly represented in the integration specification

### Body profile
SPEC-CONFIRMED:
- mass;
- height;
- composition method/result;
- longitudinal trend.

Output concept:
- functional mass context;
- never generic "bigger is better."

### Strength
SPEC-CONFIRMED:
- absolute strength;
- relative strength;
- upper/lower;
- 1RM/e1RM where appropriate.

Outputs:
- force priority;
- DEVELOP / MAINTAIN / RESTORE context;
- competency and load context.

### Power
SPEC-CONFIRMED:
- jump outputs;
- throw outputs;
- VBT outputs;
- peak output;
- trend;
- quality loss.

Named example:
- CMJ.

### Speed
SPEC-CONFIRMED:
- 0–5 m;
- 10 m;
- 20 m;
- MSS;
- high-speed exposure.

Outputs:
- acceleration state;
- max-velocity state;
- exposure freshness.

Named example:
- 10 m sprint.

### Conditioning
SPEC-CONFIRMED:
- MAS / aerobic;
- RSA;
- RHIE;
- peak game passages;
- repeatability;
- recovery.

Named example:
- MAS time trial.

### Movement
SPEC-CONFIRMED:
- global screen;
- local ROM;
- dynamic tests;
- optional standardized video/camera evidence.

Named examples represented in the spec:
- hip ROM;
- CKCUEST.

THREAD-DERIVED candidate screens discussed:
- hip internal/external rotation ROM;
- hamstring popliteal test;
- tuck jump;
- shoulder stabilization / CKCUEST;
- ankle mobility.

Exact administration and scoring for these must be marked NEEDS-VERIFICATION unless the official protocol is stored.

### Readiness / response
SPEC-CONFIRMED:
- sleep quantity/quality;
- fatigue;
- soreness;
- life stress;
- mental fatigue/mood;
- fueling/hydration;
- match minutes;
- running/contact load.

These modify context and dose. They are not diagnoses.

## 2. Required data contract for every assessment

The integration specification already defines a versioned protocol model. Preserve at minimum:

### Assessment event
- athlete_id
- occurred_at
- protocol_id
- protocol_version
- assessor/source
- device
- surface/setup where relevant
- validity
- confidence
- pain_flag
- notes
- visibility domain

### Assessment values
For every metric:
- metric_id
- side if applicable
- raw_value
- derived_value
- unit

Never overwrite old assessment values. Corrections create amended/superseding events.

## 3. Speed-specific data model

For maximal speed testing:
- split times;
- peak velocity;
- distance;
- start type;
- device;
- surface;
- footwear if material;
- wind/environment for outdoor testing if relevant;
- best rep;
- valid reps;
- quality-stop reason.

For repeated sprint / RHIE:
- rep number;
- rep time/peak velocity;
- recovery interval;
- best;
- mean;
- worst;
- percentage decrement;
- reps completed before quality stop;
- stop reason;
- heart-rate/recovery data if available and protocol-defined.

Do not label RSA/RHIE as MAS.

## 4. Same-protocol comparison rule

SPEC-CONFIRMED:
Trend panels should compare same-protocol results wherever possible.

A changed:
- surface;
- test distance;
- device;
- timing method;
- start method;
- footwear/setup;
- protocol version

must reduce confidence or trigger a protocol warning.

## 5. Camera/video boundary

SPEC-CONFIRMED:
Camera analysis may estimate observed motion/joint angles with confidence/image-quality flags.

It may NOT:
- diagnose injury;
- infer a muscle is definitively "overactive" or "underactive";
- declare medical clearance.

Standardization should preserve:
- camera position;
- height;
- distance;
- athlete orientation;
- landmarks;
- reps/frame;
- surface/footwear.

## 6. Assessment interpretation flow

1. Validate permissions and protocol.
2. Validate data quality and units.
3. Append immutable assessment event.
4. Calculate derived metrics.
5. Apply hard safety gates.
6. Apply interpretation/confidence rules.
7. Compare with personal baseline.
8. Compare with position/current-level/target-level demand.
9. Classify each physical quality:
   - DEVELOP
   - MAINTAIN
   - RESTORE
   - DE-EMPHASIZE
10. Rank priorities transparently.
11. Build or modify programme.
12. Schedule retest.
13. Record actual response.

## 7. Priority model

SPEC-CONFIRMED concept:
Priority is driven by:
- demand importance;
- gap magnitude;
- evidence confidence;
- trainability;
- timing opportunity;
- readiness modifier;
subject to safety gates.

Treat this as a planning scaffold, not a validated physiological probability.

## 8. Assessments still needing exact official protocol capture

The current resources identify test families, but do NOT yet provide a complete official manual for every test.

Before an assessment is marked production-ready, store:
- authoritative source URL/document;
- source version/date;
- equipment;
- warm-up;
- athlete setup;
- exact instructions;
- number of trials;
- rest intervals;
- validity/fault criteria;
- calculation;
- interpretation bands if legitimately sourced;
- retest standardization;
- contraindications/safety notes;
- licensing/attribution status.

Do not invent missing pass/fail thresholds.

## 9. Recommended assessment battery for Athlete #001 pilot

This is a proposed implementation battery, not a claim that every item is an official World Rugby mandatory battery.

### Baseline
- body mass;
- composition method/result if available;
- movement/local ROM screen;
- 10 m acceleration;
- 20 m or longer split as available;
- MSS/peak speed;
- CMJ or selected jump test;
- repeat-effort test;
- MAS/aerobic test;
- safe baseline strength estimates in selected movement patterns.

### Ongoing
- weekly body mass trend;
- speed exposure;
- top speed;
- session RPE;
- soreness/readiness;
- joint response;
- planned vs actual volume;
- strength/power progression.

### Block retest
Retest only the qualities needed to answer the next programming decision. Do not create a testing burden with no decision value.
