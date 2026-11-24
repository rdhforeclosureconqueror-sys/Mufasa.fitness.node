# Rugby HQ Resources 5 — Thread Harvest Handoff

Status: implementation handoff  
Date: 2026-11-24  
Audience: Mufasa bot, Rugby HQ implementation agents, Codex, coaching-system designers.

## 1. Why this exists

This thread began as a notebook while the user completed World Rugby coaching prerequisites and evolved into the design of a full Rugby Coaching Operating System inside Pocket PT / Rugby HQ.

The harvest connects:
- Rugby Ready;
- concussion management;
- safeguarding;
- safe tackle / ruck / maul / scrum / lineout progressions;
- physical preparation;
- player profiling;
- coach operations;
- Backs Rugby Ready;
- Activate;
- evidence logging;
- club-level compliance framing;
- launch-ready production architecture.

The intent is to preserve both the course learning and the product decisions that came from applying that learning.

---

## 2. Coaching OS vision

THREAD-CONFIRMED:

Pocket PT Rugby Coaching OS should not be a workout list or playbook.

It should become a rugby athlete / player-welfare operating system with major layers:

1. **Player Welfare Center**
2. **Movement & Readiness Engine**
3. **Technical Skills Engine**
4. **Tactical Intelligence Engine**
5. **Coach Command Center**

Core philosophy:

> Competency-based progression, not attendance-based progression.

The system should be able to answer:
- Why is this player not ready for a role?
- Which competency blocks safe progression?
- What evidence supports the player's current status?
- What drill or corrective pathway should happen next?
- What safety restriction overrides selection?
- What should the team train today based on actual gaps?

---

## 3. Rugby Ready — player welfare foundation

COURSE-DERIVED:

Rugby Ready emphasizes player welfare, duty of care, safe participation, development, and risk management.

Important themes harvested:
- Rugby has inherent risk; risk must be actively managed.
- Core values include Integrity, Passion, Solidarity, Discipline, Respect.
- Long-term player development matters.
- Players should have appropriate physical qualities, technical ability, rehabilitation status, law knowledge, and readiness for their level.
- Player profiling should be repeated over time rather than treated as a one-time form.

### Player profiling

Useful profile domains:
- identity and emergency contacts;
- next of kin;
- medical history and medications;
- cardiac screening questions;
- lifestyle / fitness;
- injury history;
- rugby exposure;
- previous concussion;
- front-row / neck history;
- age/development stage;
- position;
- training age.

Possible qualified physical assessment areas:
- functional ability;
- speed;
- balance;
- flexibility;
- aerobic / anaerobic endurance;
- biomechanics / observable movement quality.

POCKET-PT-STANDARD:
Create a longitudinal Master Rugby Player Profile rather than overwriting latest values.

---

## 4. Long-term player development (LTPD)

COURSE-DERIVED:

Example developmental stages discussed:
- Fun (roughly 6–12): player plays; coach guides.
- Development (roughly 12–16): player explores; coach teaches.
- Participation (roughly 15–18): player focuses; coach challenges.
- Preparation (roughly 17–21): player specializes; coach facilitates.
- Performance (20+): player innovates; coach empowers.
- Re-investment: any age.

Earlier youth stages may be better informed by biological maturity rather than chronological age alone.

POCKET-PT-STANDARD:
Store developmental stage and allow recommendations / coaching style to adapt to stage.

---

## 5. Environment, equipment, emergency readiness

COURSE-DERIVED:

Club/team preparation should consider:
- field condition;
- obstacles;
- lighting;
- hard / slippery / waterlogged surfaces;
- post padding;
- tackle/scrum equipment;
- weather;
- appropriate footwear/studs;
- mouthguards;
- hygiene;
- emergency access;
- emergency contacts;
- first-aid capability;
- AED where appropriate;
- incident recording.

Important course distinctions:
- headgear may reduce soft-tissue injury but is not a concussion-prevention guarantee;
- padding is not a substitute for healing or safe technique.

POCKET-PT-STANDARD:
Create event/practice safety checklists and venue-specific Emergency Action Plans.

---

## 6. Physical conditioning foundation

COURSE-DERIVED:

Key physical qualities:
- speed;
- strength;
- endurance;
- functional competence / stability + mobility;
- power.

Training principles:
- individuality;
- adaptation;
- overload;
- work/rest balance;
- specificity;
- detraining / reconditioning.

Needs analysis should consider:
- current condition;
- injury history;
- training age;
- S&C age;
- position demands;
- game demands.

COURSE-DERIVED:
A functional base should precede aggressive progression into speed/power.

SAFETY-BOUNDARY:
Movement screens can identify observable compensations or limitations; they should not automatically diagnose exact muscle imbalance or predict injury.

---

## 7. Warm-up / preparation

COURSE-DERIVED:

Warm-up generally progresses from lower to higher intensity and includes:
- general mobility / light movement;
- transit/dynamic mobility;
- skill preparation connected to the session.

POCKET-PT-STANDARD:
Every session template should connect preparation to the technical/tactical goal of the day.

---

## 8. Principles of play

COURSE-DERIVED:

Rugby is an invasion/evasion game:
- gain possession;
- advance;
- use space;
- carry/pass/kick;
- maintain continuity;
- score.

Coaching implications:
- teach decisions, not just isolated mechanics;
- use conditioned games;
- observe/analyze;
- give constructive feedback;
- build positive environments.

---

## 9. Open-field/contact decision logic

COURSE-DERIVED:

Primary attacking idea:
- evade / attack space before choosing contact where possible.

Pre-contact:
- run into space;
- use evasive footwork;
- carry securely;
- maintain stable body position;
- force side-on contact when possible;
- drive feet;
- offload when safe.

If held + grounded: tackle situation.
If grounded but not held: not necessarily a tackle; get up if lawful.
If held but not grounded: can continue driving/offloading; support may create maul conditions.

POCKET-PT-STANDARD:
Technical assessment should include decision-making, not only body shape.

---

## 10. Tackle development

COURSE-DERIVED:

General tackle themes:
- track;
- close space;
- stable body;
- safe head position;
- shoulder connection;
- wrap;
- leg drive / finish as appropriate;
- release;
- regain feet;
- contest/reload.

Course material included front-on, side-on, smother, tap, rear and multi-tackler concepts plus dangerous tackle warnings.

Progression should move from controlled low-intensity shapes to live/game-speed contexts.

POCKET-PT-STANDARD:
Build independent tackle competencies rather than one generic tackle percentage:
- General Tackle Ready;
- front-on;
- side-on;
- smother;
- tap;
- rear;
- ball-carrier contact;
- arrival;
- breakdown entry;
- clearout.

Potential AI/video observables:
- head relative position;
- trunk;
- hip/knee angles;
- foot placement;
- base;
- shoulder connection;
- arm wrap;
- leg drive;
- finish;
- release / get-up.

SAFETY-BOUNDARY:
Pose estimation cannot reliably infer eye gaze, internal forces, pain, intent, or legal/medical status by itself.

---

## 11. Ruck

COURSE-DERIVED:

Ruck coaching points:
- legal entry;
- strong stable posture;
- eyes up;
- appropriate binding;
- shoulders/head position;
- feet/bodyweight control;
- support / drive;
- ball presentation;
- recycle.

POCKET-PT-STANDARD:
Track gate entry, body height, binding, drive, recycle, and live decision quality.

---

## 12. Maul

COURSE-DERIVED:

Maul themes:
- ball carrier held but not grounded;
- support binds;
- maintain forward momentum;
- secure/transfer ball;
- stable posture;
- legal binding;
- do not collapse;
- safe head/body position.

POCKET-PT-STANDARD:
Track formation, bind, body position, ball transfer, decision-making and finish.

---

## 13. Scrum and Scrum Ready

COURSE-DERIVED:

The course strongly emphasized competence-based scrum progression and the principle:

> Do not scrum until Scrum Ready.

Ten-stage progression harvested:
1. Solo kneeling
2. Solo standing
3. Machine/shield
4. 1v1
5. 3v3
6. Prop + support vs machine
7. Second-row/flanker supporting prop vs machine
8. Five-player unit vs machine
9. 5v5
10. 8v8 / appropriate full opposition or machine context

Key themes:
- neutral head;
- stable spine/body shape;
- shoulder/hip control;
- feet/base;
- safe binding;
- controlled engagement;
- progressive opposition;
- competence before advancement.

CURRENT-RULE-VERIFY:
Exact scrum law wording, engagement sequence, replacement consequences, and age/competition variations must be checked against current World Rugby / USA Rugby / competition rules.

Important law-level concept from thread:
- teams are responsible for fielding suitably trained/experienced front-row players for contested scrums;
- if suitable front-row capability is unavailable, laws/competition rules may require uncontested scrums.

POCKET-PT-STANDARD:
Pocket PT can provide an internal evidence pathway for front-row competency, but must not claim its Scrum Ready badge is an official USA Rugby credential unless formally recognized.

---

## 14. Lineout

COURSE-DERIVED:

Thrower:
- stable stance;
- controlled two-hand throw;
- repeatable release/follow-through.

Jumper:
- communication;
- controlled takeoff;
- body extension;
- high catch;
- controlled descent/landing.

Support/lifters:
- stable posture;
- synchronized movement;
- safe grip;
- controlled lift/descent.

CURRENT-RULE-VERIFY:
Age/competition rules for lifting and lineout variations must be verified before hard-coding.

---

## 15. Passing / catching / continuity skills

COURSE-DERIVED:

Technical skills harvested:
- catching kicked ball;
- ground pickup;
- two-hand passing;
- receiving while moving;
- spin pass;
- clearing pass;
- pass out of tackle;
- screen pass;
- kick starts/restarts;
- counterattack.

POCKET-PT-STANDARD:
Create distinct competency records rather than one "handling" score.

Evidence should include:
- technique;
- accuracy;
- decision;
- consistency;
- pressure level;
- video where available.

---

## 16. Backline attack and defense

COURSE-DERIVED + THREAD-CONFIRMED:

Attack concepts:
- scan;
- width;
- depth;
- alignment;
- timing;
- support;
- commit defenders;
- continuity;
- exploit space.

Defense:
- alignment;
- spacing;
- communication;
- line integrity;
- move forward;
- deny time/space;
- tackle;
- reload/reorganize.

This became a major product gap because the early readiness model was forward-heavy.

---

## 17. Backs Rugby Ready

THREAD-CONFIRMED / POCKET-PT-STANDARD:

Create a first-class **Backs Rugby Ready** module, not "backs fitness."

Universal Backline Skill/IQ categories:
- Defensive IQ — 20%
- Tackling in Space — 15%
- Attack IQ — 20%
- Ball Skills — 15%
- Movement & Evasion — 15%
- Role-Specific Skill — 15%

Suggested internal bands:
- 90–99: impact starter / elite within program
- 80–89: clear starter-ready
- 70–79: match-ready / rotation
- 60–69: developmental / situational
- below 60: not yet ready for that role

POCKET-PT-STANDARD:
These are internal program bands, not official governing-body ratings.

### Defensive IQ rubric

Assess:
- alignment;
- numbering up;
- spacing;
- inside shoulder;
- drift vs press;
- edge defense;
- backfield coverage;
- communication;
- reload/fold.

### Tackling in space

Assess:
- tracking angle;
- footwork / deceleration;
- head placement;
- shoulder connection;
- wrap;
- finish;
- recovery/reload.

POCKET-PT-STANDARD:
Internal hard gate proposed: Tackling in Space < 70 prevents starter eligibility regardless of speed/ball skills.

### Offense without the ball

Assess:
- depth;
- width;
- timing;
- running lines;
- decoy quality;
- support lines;
- reload;
- communication.

Important coaching message:
> You are being evaluated even when you do not touch the ball.

### Offense with the ball

Assess:
- catch quality;
- passing both ways;
- commit defender;
- decision-making;
- evasion;
- contact choice;
- ball presentation;
- continuity.

### Position overlays

10 Fly-half:
- game management;
- passing range;
- kicking;
- defensive courage/competence;
- communication.

12 Inside centre:
- hard-line threat;
- second-playmaker ability;
- defensive connection;
- contact skill;
- decision under pressure.

13 Outside centre:
- defensive reads;
- edge connection;
- outside break;
- pass quality to wing;
- transition speed.

11/14 Wings:
- finishing;
- touchline awareness;
- high-ball;
- kick chase;
- last-pass support.

15 Fullback:
- backfield organization;
- high-ball security;
- counterattack;
- last-line tackling;
- communication.

---

## 18. Backline Athletic Index

THREAD-CONFIRMED / POCKET-PT-STANDARD:

Keep athleticism separate from rugby IQ.

Suggested backs weighting:
- Speed — 25%
- Agility — 25%
- Repeat effort — 20%
- Endurance — 15%
- Power — 10%
- Strength — 5%

Example test families:
- 10m / 20m acceleration;
- 40m or verified max-speed protocol;
- T-test / 5-10-5 / reaction COD;
- repeated get-up sprint;
- Bronco / beep or current approved conditioning test;
- broad jump / vertical / medicine-ball throw;
- tackle-get-up-reload circuit.

Internal rugby-specific drill discussed:
ground → pop up → sprint 5 yards → down → pop up → sprint back → repeat x3.

Protocol/device must be stored for trend validity.

---

## 19. Concussion Management

COURSE-DERIVED:

Core principles:
- concussion is a traumatic brain injury;
- loss of consciousness is not required;
- symptoms may appear later;
- Recognise and Remove;
- suspected concussion = remove from play/training;
- no same-day return;
- healthcare assessment;
- do not leave vulnerable person unsupported;
- urgent red-flag escalation when indicated;
- graduated return-to-sport.

Course examples included:
- first 24–48h relative rest / activities that do not meaningfully worsen symptoms;
- graded exercise progression;
- later rugby-risk activities only after appropriate recovery criteria;
- persistent symptoms may require targeted specialist rehabilitation.

CURRENT-RULE-VERIFY:
Exact return-to-sport timelines, stand-down periods, youth/adult variations and Union protocols change and must be versioned.

POCKET-PT-STANDARD:
Player Welfare Center — Concussion Management should record:
- incident;
- mechanism;
- signs/symptoms;
- observers;
- removal;
- red flags;
- referrals;
- follow-up;
- recovery stages;
- medical documentation;
- return-stage history;
- clearance documentation;
- days missed;
- protocol version.

SAFETY-BOUNDARY:
AI does not diagnose concussion and does not issue medical clearance.

---

## 20. Injury management

COURSE-DERIVED:

Course material included:
- take control;
- prevent further harm;
- avoid unnecessary movement;
- call appropriate help;
- document incidents;
- use structured injury assessment only within competence.

Historical course tools included TOTAPS and PRICED/HARM.

CURRENT-RULE-VERIFY:
Acute soft-tissue injury guidance has evolved; do not hard-code older frameworks as current clinical standard without medical review.

POCKET-PT-STANDARD:
General injury/welfare module should support:
- injury record;
- restriction;
- rehab stage;
- qualified medical supervision;
- return-to-rugby evidence;
- historical comparison.

---

## 21. Safeguarding Essentials

COURSE-DERIVED:

Safeguarding = prevention + response.

A safeguarding concern is a worry about a child/adult's safety or wellbeing based on something seen, heard, disclosed or reported.

Important principle:
> A concern does not require proof before reporting.

Concerns may involve:
- actual harm;
- risk of future harm;
- unsafe environments;
- poor supervision;
- boundary violations;
- behavior inconsistent with code of conduct.

### Codes of conduct

Purpose:
- define acceptable/unacceptable behavior;
- reduce ambiguity;
- create accountability;
- show organizational commitment;
- provide a reference point;
- define good practice.

Applies to everyone:
- coaches;
- players;
- parents;
- volunteers;
- staff;
- officials;
- administrators;
- leaders.

Nobody is exempt because of status, success or authority.

### Boundaries

Course themes:
- adults should avoid unnecessary one-on-one isolation with children who are not their own;
- staff-athlete sexual relationships are incompatible with trusted positions/power;
- no sexualized language/humor around children;
- sexual abuse/harassment prohibited;
- avoid secret/private personal social-media communication with children;
- use approved, visible, accountable communication channels.

### Why people may not speak

Children/players may fear:
- retaliation;
- deselection;
- not being believed;
- teammates' reaction;
- getting coach in trouble;
- disappointing family;
- losing privileges/opportunities.

Adults may fear:
- job loss;
- consequences;
- harming colleagues;
- not being believed.

Important principle:
> Silence does not equal safety.

### Grooming / power

Possible concerning patterns discussed:
- special attention;
- gifts;
- privileges;
- promises of travel/fame/opportunity;
- secret communication;
- isolation;
- threats tied to selection;
- manipulating athlete/family expectations.

Software must not automatically declare grooming; it can record concerns/patterns for qualified review.

### Poor practice

Poor practice = behavior below expected code-of-conduct standard.

Examples discussed:
- repeated shouting;
- discriminatory language;
- ignoring health/safety;
- deliberately unsafe conditions;
- inappropriate one-on-one meetings;
- secrecy demands;
- coercive "do everything I say" behavior.

Key principle:
> Lower-level concerns should be addressed because normalization can create environments where more serious harm becomes easier.

### Reporting

Course guidance:
- report child-related concern immediately or within 24 hours;
- poor practice → safeguarding officer/internal review as appropriate;
- suspected abuse → safeguarding officer and appropriate statutory/local authorities;
- possible crime → authorities;
- investigation belongs to trained professionals / authorities.

Coach role:
**Recognize → Listen → Protect immediate safety → Record facts → Report.**

Do not:
- investigate;
- interrogate;
- ask leading questions;
- confront accused person;
- promise secrecy;
- share widely.

POCKET-PT-STANDARD:
Safeguarding must live in a separately permissioned protected data domain.

---

## 22. Safeguarding software architecture

THREAD-CONFIRMED / POCKET-PT-STANDARD:

Create:
- restricted Safeguarding Dashboard;
- role-specific Codes of Conduct;
- digital acknowledgment/version history;
- safeguarding risk assessment;
- obvious Report a Concern entry;
- multiple intake sources;
- fact-focused concern form;
- poor-practice pathway;
- possible-abuse pathway;
- immediate danger escalation;
- action log;
- audit history;
- restricted exports;
- safeguarding officer configuration;
- player/parent/coach education centers.

Potential reporter sources:
- athlete;
- parent;
- coach;
- staff;
- volunteer;
- another club;
- recruitment/background information;
- public/media report.

AI may:
- organize reports;
- flag missing administrative fields;
- summarize for authorized personnel;
- detect multiple related records;
- surface policy;
- remind on overdue workflow.

AI must not:
- determine lying/truth;
- determine guilt;
- diagnose abuse/trauma;
- interrogate children;
- auto-punish;
- auto-close;
- replace reporting obligations.

---

## 23. Coach credentials / Coach Ready

THREAD-CONFIRMED:

Track relevant coach credentials and status in one place.

Possible items:
- USA Rugby registration;
- SafeSport;
- background check;
- Rugby's Safety Basics / Rugby Ready;
- Concussion Management;
- World Rugby / USA Rugby coaching accreditation;
- First Aid;
- Union / competition-required credentials;
- optional/recommended development credentials.

CURRENT-RULE-VERIFY:
Exact USA Rugby requirements, cadence, and qualification naming must be checked against current published rules before enforcement.

Important thread distinction:
- background check can be required before actual coaching/athlete contact even if a clinic/education event can be attended while processing, depending on current rules/course wording.
- in-person Level 1 course was described as a practical clinic requiring participation/demonstration, not clearly as a separate written final exam.

---

## 24. Club-level compliance vs education

THREAD-CONFIRMED:

Critical product distinction:

**Coach certification is one thing. Club operationalization is another.**

A coach can take a safeguarding or Rugby Ready course, but the club still needs processes that make the education real.

Rugby HQ should therefore distinguish:

### A. CLUB / GOVERNING REQUIREMENT
Examples may include:
- club registration/compliance;
- appropriate registered/compliant coaching coverage;
- safeguarding/SafeSport reporting obligations;
- eligible/registered players;
- suitably trained/experienced front row;
- concussion safety obligations;
- competition-specific rules.

CURRENT-RULE-VERIFY:
The exact legal/governing source and wording must be revalidated before presenting any item as mandatory.

### B. GOVERNING-BODY BEST PRACTICE
Examples:
- Activate;
- Tackle Ready methodology;
- structured Rugby Ready application;
- risk assessments;
- player-welfare preparation processes.

### C. POCKET PT INTERNAL STANDARD
Examples:
- Scrum Ready stage evidence;
- Backs Rugby Ready;
- Movement Ready;
- Conditioning Ready;
- Tackle competency;
- Backline Athletic Index;
- competency graph;
- Beast Mode;
- video evidence expectations.

Product positioning:
> Pocket PT does not replace USA Rugby / Rugby Xplorer. It operationalizes coaching, welfare, competency and compliance responsibilities inside the club.

---

## 25. Activate Adult Foundation

COURSE/THREAD-DERIVED:

Adult Activate engine should be labeled:
**Activate-Aligned Adult Foundation**

Do not represent Pocket PT as replacing World Rugby Activate.

Structure discussed:
- training-session Activate;
- match-day Activate;
- seven adult progression levels;
- four-part session structure;
- coaching cues;
- movement-quality tracking;
- progress/hold/regress logic.

### Activate 8 cues harvested
1. Head neutral / lifted
2. Chest up
3. Pinch shoulders together
4. Shoulders level with hips
5. Brace through trunk
6. Soft knees
7. Hip, knee, ankle in line
8. Knee over toes

### Coach tracking
1–5 quality dimensions:
- control;
- balance;
- technique;
- trunk stability;
- lower-limb alignment;
- landing;
- change of direction;
- neck control;
- fatigue breakdown.

Readiness flags:
- soreness;
- pain;
- injury concern;
- concussion concern;
- fatigue;
- notes.

Status:
- Not assessed
- Learning
- Needs regression
- Hold current level
- Ready with reduced volume
- Ready to progress
- Advanced / Beast Mode candidate

THREAD-CONFIRMED default logic proposal:
progress when attendance >=75%, control/balance/technique >=4, no active pain/injury flag, coach approval true.

This is an internal product rule, not an official World Rugby threshold unless separately verified.

---

## 26. Beast Mode extension

POCKET-PT-STANDARD:

Activate is the floor; Beast Mode is the ceiling.

Proprietary progression:
Functional Stability
→ Maximum Stability
→ Strength Stabilization
→ Maximum Strength
→ Power
→ Maximum Power
→ Beast Mode

Concept:
An athlete does not progress merely because a drill is harder. They progress when they can preserve quality under greater force, speed, fatigue, chaos, contact and decision demand.

Never label Beast Mode as World Rugby content.

---

## 27. Coach Operations Guide

THREAD-CONFIRMED:

The system must explain itself to coaches.

Coach Guide should answer:
- how to add/remove/archive player;
- how to assign team/season;
- how to set primary/secondary/development positions;
- what each readiness domain means;
- what competency means;
- how to log evidence;
- how status is derived;
- how to update wellness;
- how safeguarding works;
- how sessions are created/edited;
- how match selections are created/edited;
- how Command Center cards derive from underlying records.

Core rule:
> Coach records evidence → Pocket PT derives status → safety restrictions override performance.

Suggested competency ladder:
- Not Assessed
- Introduced
- Assisted
- Independent in Controlled Environment
- Independent in Live Play
- Repeatable Under Pressure
- Verified / Current

---

## 28. Command Center

THREAD-CONFIRMED:

Command Center should summarize authoritative data, not be a manually edited dashboard.

Potential real-data cards:
- organization;
- team;
- season;
- roster count;
- staff count;
- position distribution;
- missing profiles;
- readiness bottlenecks;
- unresolved safety/admin actions;
- upcoming sessions/matches;
- evidence/retest needs.

Sensitive safeguarding details should not be exposed to ordinary coaches merely because they exist.

---

## 29. Match selection

THREAD-CONFIRMED:

Selection should distinguish:
- roster status;
- availability;
- safety restrictions;
- role readiness;
- selection evidence;
- coach decision.

Avoid a misleading "magic readiness percentage."

A composite selection-evidence score can exist, but hard safety gates override it.

Example:
97% selection evidence + active concussion restriction = NOT ELIGIBLE.

Coach remains final selector where policy/law allows.

---

## 30. Evidence architecture

THREAD-CONFIRMED:

Evidence should be first-class, timestamped, longitudinal and explainable.

Minimum record:
- athlete;
- organization/team/season;
- position;
- domain/category;
- competency;
- rubric/score;
- evidence type;
- evidence source;
- video/clip/timestamp if applicable;
- coach note;
- evaluator;
- date;
- confidence;
- next action;
- reassessment date;
- protocol/version;
- safety flag if relevant.

Do not overwrite old evidence with latest status.

---

## 31. Movement Intelligence / computer vision

THREAD-CONFIRMED:

Major missing capability identified in prototype:
- overhead squat;
- balance;
- lunge;
- tackle stance;
- shoulder control;
- pose-angle concepts;
- corrective pathways.

Potential observable movement variables:
- heel lift;
- knee medial/lateral displacement;
- hip shift;
- torso lean;
- thoracic/arm position;
- left/right asymmetry.

SAFETY-BOUNDARY:
Computer vision provides observable kinematic evidence, not diagnosis, internal force measurement or medical clearance.

---

## 32. Production-first implementation philosophy

THREAD-CONFIRMED:

Do not build a disposable pilot that later needs a rewrite.

Implementation rule:
**production architecture from day one + restricted access while unfinished + live controlled validation.**

Avoid:
- temporary localStorage;
- fake JSON persistence;
- pilot-only database;
- separate beta app that must later migrate;
- client-side-only authorization.

Use:
- production runtime;
- production routing;
- production auth;
- production authorization;
- durable persistence;
- server validation;
- audit/history;
- controlled feature access.

---

## 33. Persistence discovery / PostgreSQL direction

THREAD-CONFIRMED / IMPLEMENTATION-DEPENDENCY:

Codex architecture work found that file-backed persistence was insufficient for launch-ready Rugby authorization/history.

Selected direction:
- managed PostgreSQL;
- Node pg/node-postgres;
- connection pooling;
- parameterized queries;
- transactions/rollback;
- ordered migrations;
- checksums;
- schema constraints;
- health checks;
- audit history.

Schema foundation planned for:
- organizations;
- teams;
- seasons;
- positions;
- rugby profiles;
- rosters;
- staff assignments;
- audit history.

The Codex environment's outbound proxy blocked public npm/Ubuntu requests with HTTP 403; this was an environment limitation, not necessarily a repository configuration error.

Repository-side persistence foundation and migrations were prepared, but live Rugby runtime remained dependent on:
- supported `pg` installation;
- managed PostgreSQL instance;
- backend-only `DATABASE_URL`;
- production migration execution;
- backup/restore strategy.

Do not substitute a temporary database merely to "get it working."

---

## 34. Rugby domain foundation

THREAD-CONFIRMED:

Permanent domain should distinguish:
- Organization / Club
- Team
- Season
- Roster Membership
- Staff Assignment
- Rugby Player Profile
- Rugby Position

Canonical positions 1–15 plus groups:
- Front Row
- Second Row
- Back Row
- Forwards
- Halfbacks
- Centres
- Outside Backs
- Backs

Roster status must remain distinct from readiness.

A player can belong to multiple teams/seasons/formats over time while preserving history.

Staff roles should be scoped, not one global "coach" boolean.

Potential roles:
- organization_admin;
- rugby_director;
- head_coach;
- assistant_coach;
- strength_conditioning_coach;
- team_manager;
- analyst;
- medical_staff;
- safeguarding_officer.

---

## 35. Technical safety/privacy boundaries

SAFETY-BOUNDARY:

Medical and safeguarding information require stricter access than ordinary performance data.

Do not expose:
- safeguarding narratives;
- sensitive medical records;
- allegation details;
- protected case data

through ordinary team dashboards.

Use least privilege, audit logging, secure storage, controlled export, and jurisdiction-aware retention policies.

---

## 36. Game / Rugby HQ simulator connection

THREAD-CONFIRMED:

Rugby HQ already includes a 3D game/simulator. Future integration may use coaching-system evidence to drive scenarios, but only after validation.

Potential hooks:
- acceleration;
- max velocity;
- repeat-effort decay;
- position-specific decision profile;
- tactical scenarios;
- tackle/spacing decision scenarios.

Do not allow simulator ratings to become medical eligibility or official selection authority.

---

## 37. Final operating model

Rugby HQ should ultimately support:

**PLAYER**
Who is the player?
What is their development stage?
What positions do they play?
What evidence exists?

**PREPARATION**
Are they prepared to train?
What does Activate / movement preparation show?

**PHYSICAL**
What are movement, speed, strength, power, conditioning gaps?

**TECHNICAL**
What skills have been demonstrated?

**TACTICAL**
Can they make the right decisions under pressure?

**FORWARDS**
Are front-row / scrum / contact / breakdown competencies demonstrated?

**BACKS**
Can they defend space, tackle in space, attack with/without ball, communicate, and execute role responsibilities?

**WELFARE**
Are there injury/concussion restrictions?

**SAFEGUARDING**
Does the club have safe behavior/reporting processes and protected workflows?

**SELECTION**
Is the player available, safe, role-ready, and supported by current evidence?

**COACH**
Are required credentials current? What development/support is needed?

**CLUB**
Are obligations, best practices and internal standards visible and documented?

---

## 38. Non-negotiable truth labels

When the bot uses this resource, it must not blur:

1. **Official governing-body requirement**
2. **Competition/law requirement**
3. **Governing-body recommended best practice**
4. **Pocket PT internal competency standard**
5. **Course-derived historical guidance needing current verification**

If uncertain, label the item CURRENT-RULE-VERIFY rather than claiming it is mandatory.
