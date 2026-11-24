# Rugby HQ Conditioning Thread Harvest Handoff

Status: implementation handoff  
Date: 2026-11-24  
Audience: Mufasa bot, Rugby HQ implementation agents, performance-coaching logic owners.

## 1. Why this exists

The discussion connected Advanced Conditioning for Rugby concepts to the existing Rugby HQ website, 3D game, Pocket PT Rugby Coaching OS, and future athlete-assessment engine. The goal is to preserve the useful knowledge in the repository so later agents can continue from the actual decisions instead of reconstructing them.

## 2. Terminology clarified

### Periodisation hierarchy
THREAD-CONFIRMED:
- **Session** — individual training exposure.
- **Microcycle** — commonly about one week.
- **Mesocycle** — multi-week block containing multiple microcycles.
- **Macrocycle** — larger season/year plan.

The user originally remembered "micro / megro / macro"; use **mesocycle**.

### Residual training effect
THREAD-CONFIRMED:
The term the user was reaching for when describing the "leftovers" or "real gains" from a prior block is **residual training effect**.

Programming implication:
- A quality developed in one block does not disappear immediately.
- When emphasis moves to the next quality, keep a minimum effective maintenance exposure for the prior quality.
- Do not assume all qualities decay at the same rate.
- Exact residual-duration numbers were NOT established in this thread. Mark them NEEDS-VERIFICATION before encoding fixed timelines.

### MAS vs repeated sprint ability
THREAD-CONFIRMED:
- **MAS = Maximal Aerobic Speed**, not "how many maximal sprints can be repeated."
- The user's repeated 18 mph example is closer to **Repeated Sprint Ability (RSA)** and, in rugby context, **Repeated High-Intensity Effort ability (RHIE)**.
- **MSS / maximum sprint speed** and maximal-velocity exposure are separate from MAS.

This distinction is critical. Rugby HQ should not merge aerobic speed, maximum sprint speed, and repeated-sprint repeatability into one score.

## 3. Programming philosophy harvested

THREAD-CONFIRMED:
A useful mesocycle should normally have:
- one **primary** adaptation target;
- one **secondary** adaptation target;
- other qualities held with smaller maintenance/cleanup doses.

The user remembers a **3 weeks loading + 1 unloading/retest week** rhythm from the course. Treat this as THREAD-CONFIRMED / NEEDS-VERIFICATION for exact official attribution, not as an immutable rule.

### Governing concept
**Build → maintain → convert → peak.**

Do not attempt to maximally develop hypertrophy, maximal strength, power, maximal velocity, RSA/RHIE, aerobic conditioning and agility all at once.

## 4. Physical-quality "accounts"

Useful Rugby HQ mental model:
- Muscle mass / hypertrophy
- Max strength
- Power
- Acceleration
- Maximum sprint speed
- Aerobic capacity / MAS
- RSA / RHIE
- Agility / change of direction
- Movement capacity / mobility / stability

At any given block:
- 1–2 accounts receive major deposits;
- the others receive minimum effective exposure as appropriate;
- testing and game demands decide the next emphasis.

This should map directly to Rugby HQ states:
- DEVELOP
- MAINTAIN
- RESTORE
- DE-EMPHASIZE

Those states already match the Advanced Conditioning integration specification.

## 5. Speed training distinction

### Max-velocity training
THREAD-CONFIRMED:
Purpose: increase the athlete's highest attainable sprint velocity.

Programming principle:
- quality first;
- long enough recovery to preserve near-maximal output;
- stop when predetermined speed/quality drop occurs;
- do not turn every maximal-speed session into conditioning.

### RSA / RHIE training
THREAD-CONFIRMED:
Purpose: reproduce high-intensity efforts with limited performance decay.

Track:
- best rep;
- mean rep;
- worst rep;
- percentage decrement;
- quality-repetition count;
- recovery interval;
- modality/surface/device.

### Speed reserve
THREAD-CONFIRMED:
A useful performance concept is the gap between maximum capacity and operational game speed.

Example:
If MSS is 20 mph, 17 mph is 85% MSS.
If MSS is 17.5 mph, 17 mph is near-maximal.
Rugby HQ should eventually show this context rather than treating "17 mph" as equally costly for every athlete.

## 6. Order of work inside a session

THREAD-CONFIRMED:
When sprint quality or explosive performance is a priority, default ordering should be:

**warm-up → speed/technical explosive work → power work → resistance training → conditioning/accessory work**

unless a deliberately different method is chosen.

Do not default to hard hypertrophy work followed by "max-speed" sprinting under heavy fatigue.

## 7. Hypertrophy and "functional muscle"

THREAD-CONFIRMED:
The goal is not arbitrary bodyweight gain. The useful target is **functional mass**:
- more lean mass;
- more force;
- more power;
- preserved or improved acceleration and maximum velocity;
- acceptable movement quality and joint/tendon response.

The athlete should not be judged only by scale weight.

Useful Rugby HQ question after each block:
> Did the added mass improve the athlete, or merely make the athlete heavier?

### Power clean
THREAD-CONFIRMED:
The power clean is a useful power-development / force-transfer exercise, but it should not be treated as the primary hypertrophy tool.

Role:
- rate of force development;
- triple extension;
- explosive transfer.

Hypertrophy can be built with controlled loading through movement families such as split squats, lunges, step-ups, hinges/RDLs, hip extension, hamstring work, calf work, pulls/rows, presses and carries, adjusted to athlete competency and tolerance.

Do not require a barbell back squat simply because rugby uses squat patterns. Exercise selection should serve the adaptation and athlete, not loyalty to one lift.

## 8. Curved treadmill rule

THREAD-CONFIRMED:
A curved/non-motorized treadmill can be useful for controlled indoor speed exposure, but treadmill mph must NOT be assumed equivalent to field/GPS mph.

Every speed record should preserve:
- modality;
- device;
- surface;
- setup;
- date;
- protocol version.

Example:
- 18.2 mph — curved treadmill
- 18.7 mph — outdoor turf / GPS

Rugby HQ should compare like-for-like tests whenever possible and warn when protocol/device changes make direct trend comparison weak.

## 9. Assessment-to-programming loop

SPEC-CONFIRMED + THREAD-CONFIRMED:

For every meaningful assessment:
1. Store raw values.
2. Store protocol/version.
3. Store assessor/device and units.
4. Store validity/confidence and pain flag when relevant.
5. Derive metrics without deleting raw values.
6. Compare against personal baseline and contextual demand.
7. Classify DEVELOP / MAINTAIN / RESTORE / DE-EMPHASIZE.
8. Produce explainable priority.
9. Generate feasible plan.
10. Capture actual training response.
11. Retest with the same protocol where possible.
12. Preserve recommendation and coach-override history.

## 10. What Rugby HQ can become

This discussion supports a Rugby HQ product stack containing:

### Assessment Lab
Capture:
- body profile;
- strength;
- power;
- speed;
- conditioning;
- movement;
- readiness;
- game-demand fit.

### Preseason Block Builder
Inputs:
- athlete goals;
- position;
- season timing;
- assessment gaps;
- training age;
- equipment;
- availability;
- current readiness.

Outputs:
- primary target;
- secondary target;
- maintenance qualities;
- microcycle structure;
- retest date;
- stop/quality criteria.

### Speed Lab
Separate views for:
- acceleration;
- MSS/max velocity;
- high-speed exposure;
- RSA;
- RHIE;
- speed reserve.

### Athlete Timeline
Show:
- assessment;
- block;
- session;
- actual completion;
- readiness;
- speed exposure;
- retest;
- recommendation;
- coach override.

### Game / simulator integration — FUTURE
The 3D Rugby HQ game may eventually consume athlete-performance attributes for training scenarios, but do not make unvalidated physical scores directly control selection or medical eligibility.

Possible future hooks:
- acceleration rating;
- max-velocity rating;
- repeat-effort decay;
- fatigue/recovery model;
- position-specific demand profile.

These are implementation opportunities, not validated game-physiology models yet.

## 11. Quins group-chat pilot concept

THREAD-CONFIRMED:
A simple player-engagement question can begin profiling:

> If you could improve TWO physical qualities before the season, what would they be?

Candidate options:
- muscle mass;
- max strength;
- explosive power;
- acceleration;
- top speed;
- agility;
- aerobic fitness;
- repeated sprint / RHIE;
- mobility / movement quality.

The system should not immediately prescribe from preference alone. Player-selected goals become one input alongside testing, position demands, season timing and readiness.

## 12. Important boundaries

- Exact official World Rugby test instructions and thresholds must be versioned and verified before hard-coding.
- Course completion is not medical accreditation.
- Performance screening does not diagnose injury.
- Selection remains a coach decision.
- Pain/medical flags can block automated progression but do not let AI issue medical clearance.
- No universal fitness score should collapse all domains.
