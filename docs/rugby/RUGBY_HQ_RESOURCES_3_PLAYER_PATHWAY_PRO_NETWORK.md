# Rugby HQ Resources 3 — Elite Player Development, Professional Pathway & Scout Network Handoff

**Status:** DESIGN RESOURCE / ACTIVATION-READY / NOT YET IMPLEMENTED  
**Harvest date:** 2026-11-24  
**Source:** Conversation harvest: elite coaching vision, player-development pathway, professional coach relationships, transferable player profile, scout view, placement strategy, business model and agent-compliance boundary.  
**Production home:** Existing Pocket PT / Milele Fit Rugby HQ inside this Node/Express repository.  
**Do not create a second rugby application.**

## 0. Bot activation directive

When an implementation bot encounters this resource:

1. Treat it as product/domain guidance, not proof that the described features already exist.
2. Reuse the existing Pocket PT identity, auth, rugby profile, evidence, readiness, testing, game and coaching-OS architecture.
3. Never create a duplicate athlete identity or a parallel scoring engine.
4. Preserve the existing invariant: **coach records evidence; Pocket PT derives status; safety restrictions override performance.**
5. Preserve historical test results. Never overwrite old measurements.
6. Keep verified coach/tester evidence distinct from athlete self-reported data.
7. Keep simulation evidence, training evidence, scrimmage evidence and match evidence explicitly separated.
8. Do not expose private player data to scouts without explicit player-controlled sharing/consent.
9. Do not implement contract negotiation, commission collection, employment representation or "agent" behavior until a separate compliance gate is explicitly approved.
10. Do not publish club-restricted tactical material from Attack Intelligence into public Scout View or player-marketing artifacts.
11. Verify current professional-team, academy and pathway contacts before outreach. Do not hard-code current league/team status from this document.
12. Prefer an incremental integration into current Rugby HQ routes/services over a new frontend or data store.

## 1. Product thesis

The long-term goal is not merely to be a normal rugby coach or offseason trainer.

The target operating model is an **elite player-development + performance-intelligence + placement pathway**.

Rugby HQ should help a coach:

- find or accept athletes with rugby ambition;
- establish an evidence-based baseline;
- identify movement, strength, speed, conditioning, technical and tactical gaps;
- prescribe development work;
- record progression over time;
- expose the player's current level honestly;
- package verified evidence into a transferable professional prospect profile;
- build trusted relationships with higher-level coaches, academies and recruiters;
- make player introductions when the evidence and level justify it;
- learn what professional programs actually value;
- improve the development system based on placement outcomes.

The desired reputation is:

> "If Rashad sends a player, I need to look at that player."

The system should optimize for **credibility, evidence quality and placement fit**, not for sending the largest number of players.

## 2. Positioning

Preferred initial positioning:

**Rugby Performance & Player Development Coach**  
**Talent Identification & Pathway Director**  
**Elite Development / High Performance Pathway**

Do not default to the title "player agent" until the applicable accreditation, union rules, local law, insurance and contract requirements are satisfied.

The platform can support development, testing, reporting, player-controlled profile sharing and coach introductions before any regulated representation module exists.

## 3. Player pathway

Canonical conceptual pathway:

**ATHLETE ENTRY**  
→ **BASELINE EVALUATION**  
→ **INDIVIDUAL DEVELOPMENT PLAN**  
→ **8–16 WEEK DEVELOPMENT BLOCK**  
→ **REASSESSMENT / PROGRESSION EVIDENCE**  
→ **COMPETITION / MATCH EVIDENCE**  
→ **VERIFIED PLAYER PERFORMANCE PROFILE**  
→ **SCOUT / COACH REVIEW**  
→ **TRIAL / HIGHER CLUB / ACADEMY / PROFESSIONAL OPPORTUNITY**  
→ **OUTCOME FEEDBACK INTO DEVELOPMENT SYSTEM**

This pathway is additive to the existing Rugby Coaching OS. It does not replace Rugby Ready, Backs Rugby Ready, forward/pack readiness, welfare, safeguarding, selection, Adult Activate or Beast Mode.

### 3.1 Entry

Capture:

- Pocket PT userId;
- display/player name;
- age/date-of-birth policy-compliant representation;
- current club/team;
- primary position;
- secondary positions;
- preferred roles;
- rugby age/experience;
- current competition level;
- playing history;
- development goal;
- target level;
- availability/time horizon;
- consent for coach assessment;
- consent status for future profile sharing.

### 3.2 Baseline domains

Use the existing evidence architecture.

Baseline should cover, as applicable:

- movement quality and measurable asymmetries/limitations;
- speed and acceleration;
- agility/change of direction;
- power;
- strength;
- conditioning/endurance;
- repeated-sprint ability;
- body mass and relevant non-sensitive anthropometrics;
- technical skills;
- position-specific competencies;
- tackle/contact readiness;
- set-piece role competency where applicable;
- attack and defensive decision-making;
- support-line recognition;
- communication;
- rugby IQ/tactical understanding;
- match evidence;
- availability/welfare restrictions.

Movement observations are coaching/performance observations, not diagnoses.

### 3.3 Individual development plan

The plan should answer:

- What is the athlete's current level?
- What is limiting the next level?
- What are the highest-leverage development targets?
- What evidence would prove improvement?
- What should be reassessed?
- What would make this player more attractive to the next level?
- Which safety or readiness gates must remain independent of performance?

### 3.4 Development blocks

Support 8-, 12- and 16-week blocks.

Each block should have:

- objective;
- start/end;
- target tests;
- target competencies;
- training emphasis;
- relevant strength/power/speed/conditioning work;
- technical/tactical targets;
- game/simulation objectives;
- video objectives;
- attendance/adherence;
- reassessment dates;
- coach notes;
- next action.

Do not fabricate professional readiness from time completed. Readiness must be evidence-derived.

## 4. Professional Prospect Profile

Create a future first-class Rugby HQ object/view called **Professional Prospect Profile**.

It should be a projection from canonical evidence, not a second editable record.

### 4.1 Profile header

- player name;
- photo/avatar where authorized;
- age;
- height;
- body mass;
- primary position;
- secondary positions;
- dominant side if useful;
- current club/team;
- competition level;
- playing history;
- relevant eligibility information;
- current coach;
- profile last verified date;
- profile version.

### 4.2 Athletic testing

Store raw results, not only normalized ratings.

Possible tests include:

- 10 m sprint;
- 20 m sprint;
- 30/40 m sprint where used;
- maximum velocity;
- 505 agility left/right;
- other validated change-of-direction tests;
- countermovement jump;
- broad jump;
- repeated-sprint protocol;
- Bronco;
- Yo-Yo or other conditioning protocol;
- position-appropriate strength testing;
- body mass;
- other protocol-defined metrics.

Every test result must preserve:

- value;
- unit;
- date;
- protocol/version;
- testing surface/conditions when relevant;
- timing method;
- tester;
- verification state;
- evidence link;
- prior result;
- change over time.

Do not compare unlike protocols as if they were identical.

### 4.3 Rugby performance evidence

Potential structured fields:

- tackle completion;
- dominant/positive tackle rate;
- tackle-in-space evidence;
- carry count;
- gain-line success;
- post-contact outcome;
- offload decision/success;
- ruck/breakdown contribution;
- support-line quality;
- line-break involvement;
- defensive positioning;
- scan/decision quality;
- communication;
- execution under pressure;
- kick chase;
- kick receipt/high-ball;
- set-piece role evidence;
- role-specific competency;
- work rate;
- repeat efforts.

Only expose metrics that have a defined data source and method. Do not invent match statistics.

### 4.4 Decision vs execution

Carry forward the current Rugby Coaching OS rule:

**Grade the decision separately from the execution.**

Examples:

- correct pass decision + poor execution;
- poor decision + technically clean execution;
- correct support read + late arrival;
- correct defensive read + missed tackle.

This distinction is especially important for Rugby HQ game/scenario evidence.

### 4.5 Development history

The profile should show longitudinal progression.

Example status language:

- Development Prospect
- Club Ready
- High Performance Prospect
- Professional Trial Recommended

These labels must eventually be versioned and policy-defined. They must not be free-text claims masquerading as objective certification.

Show:

- baseline;
- current result;
- percent/absolute change where mathematically valid;
- trend;
- evidence freshness;
- latest coach verification;
- next required evidence.

### 4.6 Video

Prospect video should be evidence-linked, not merely a highlight reel.

Support:

- 2–4 minute scout reel;
- full-match links where available;
- tagged competency clips;
- testing clips;
- tactical/decision clips;
- clip timestamp;
- context;
- opponent/competition;
- pressure level;
- coach annotation;
- verification status.

### 4.7 Coach report

Structured coach report:

- top strengths;
- current development priorities;
- role/position fit;
- level recommendation;
- readiness caveats;
- evidence confidence;
- coachability/attendance indicators only when supported by documented observations;
- recommended next environment;
- coach contact.

Avoid unsupported personality claims.

### 4.8 Verification badge semantics

Potential states:

- SELF_REPORTED
- COACH_OBSERVED
- TESTER_VERIFIED
- VIDEO_SUPPORTED
- MATCH_EVIDENCE
- THIRD_PARTY_VERIFIED

Do not display "verified" without a provenance record.

## 5. Scout View

Create a future permissioned **Scout View** that projects only the data a player has authorized for external review.

Suggested tabs:

1. **Overview**
2. **Athletic**
3. **Rugby**
4. **Development**
5. **Video**
6. **Coach Report**

### 5.1 Share controls

Required controls:

- player consent;
- share purpose;
- intended recipient;
- created by;
- expiration;
- revocation;
- optional access code/auth;
- fields included/excluded;
- access log;
- download/export policy;
- version viewed.

A scout link must not reveal:

- medical narratives;
- safeguarding information;
- private welfare notes;
- unrelated community/profile information;
- restricted team tactics;
- other players' information.

### 5.2 Scout usefulness principle

A professional coach should be able to answer quickly:

- Who is this player?
- What position can they actually play?
- What level are they currently competing at?
- What can they physically do?
- What have they improved?
- Can I trust the testing?
- What does the film show?
- What are the current limitations?
- What does the coach recommend?
- How do I contact the player/coach?

## 6. Rugby HQ game integration

The existing Rugby HQ game/scenario system can become a source of **simulation evidence**, not a replacement for real rugby evidence.

Potential simulation evidence:

- defensive scan;
- attack read;
- support depth;
- receiving depth;
- timing;
- pass selection;
- short/dummy/skip decision;
- support-line choice;
- space recognition;
- pressure response;
- transition decision;
- tactical role recognition;
- decision latency;
- execution success inside the simulation.

Rules:

1. Label all game-derived evidence as SIMULATION.
2. Do not represent simulation success as match performance.
3. Preserve the scenario version used.
4. Store input/context and outcome.
5. Separate decision score from mechanical execution.
6. Use simulation to identify development targets and assess learning transfer.
7. Require live training/scrimmage/match evidence for higher readiness claims.

Long-term possibility:

**Scenario Lab → Coaching Intervention → Re-test → Live Evidence → Match Evidence**

## 7. Relationship-development strategy

Do not begin professional relationships by immediately asking coaches to sign players.

The first objective is to become useful and learn their evaluation criteria.

### 7.1 Golden opening question

Core relationship-development question:

> "When you evaluate a developmental player, what information would you actually want to see before you spend time scouting them?"

Use answers to improve the data model and Scout View.

### 7.2 First conversation positioning

Suggested framing:

> "I'm developing a high-performance rugby development program in Texas. I'm building a standardized player evaluation system around physical preparation, rugby competencies, position-specific skills and match performance. I want to make sure what we're measuring is actually useful to coaches at the next level."

This is a research/advisory conversation, not a placement pitch.

### 7.3 Network ladder

**Level 1 — Texas / regional**
- club coaches;
- high-level men's/women's club programs;
- Texas Rugby Union contacts;
- college coaches;
- former professional players/coaches;
- strength and conditioning professionals;
- select-side/all-star contacts.

**Level 2 — U.S. high performance**
- academy directors;
- directors of player development;
- talent identification staff;
- U20/U23 pathway contacts;
- collegiate high-performance programs;
- national pathway staff.

**Level 3 — Professional**
- academy directors;
- player development;
- recruitment/talent personnel;
- S&C/performance staff;
- assistant coaches;
- head coaches.

**Level 4 — International**
- overseas clubs;
- academies;
- development programs;
- trusted coaches;
- verified recruiting contacts.

**Level 5 — Accredited agents**
- relationship for representation/placement when appropriate;
- potential referral partners;
- potential customers for development/testing services.

### 7.4 Preferred first pro contact

Priority target:

**Academy Director / Director of Player Development / Talent Identification**

Reason: these roles are focused on who can become professional over the next 12–24 months, not only on immediate match selection.

### 7.5 Warm introduction strategy

Prefer:

existing coach → trusted higher-level contact → introduction.

Track:

- who introduced the contact;
- relationship strength;
- prior interactions;
- what that coach values;
- what player profiles they accept;
- preferred communication method;
- follow-up date.

## 8. Recruiter requirements research

Rugby HQ should eventually store a **Recruiter Requirements** knowledge set.

Interview a meaningful sample of:

- professional coaches;
- academy directors;
- S&C/performance coaches;
- college coaches;
- high-level club coaches;
- talent identification staff.

Ask:

- What makes you open a player profile?
- What data do you trust?
- What testing protocols do you prefer?
- Which metrics matter by position?
- What match film do you need?
- How much film?
- What immediately disqualifies a profile?
- What makes you call the coach back?
- How do you judge coachability?
- What level of competition do you need to see?
- Which physical qualities are minimums vs differentiators?
- How do you assess late converts/new rugby athletes?
- What information do you wish player-development coaches supplied more consistently?

Do not convert opinions from one coach into universal thresholds.

Use aggregated recruiter feedback to version Pocket PT prospect standards.

## 9. Relationship CRM fields

Future Rugby HQ professional-network CRM should include:

- contactId;
- name;
- organization;
- role;
- region/country;
- contact source;
- introducedBy;
- email/phone/social only where lawfully collected;
- relationship stage;
- date first contacted;
- last contact;
- next follow-up;
- preferred contact channel;
- position needs;
- age/development-stage preference;
- accepted competition levels;
- preferred testing metrics;
- preferred testing protocols;
- film requirements;
- profile format preference;
- notes;
- players introduced;
- outcomes;
- opt-out/do-not-contact state;
- provenance/source;
- verification date.

Do not scrape or infer private contact data into the system without an approved source and lawful basis.

## 10. Placement workflow

Potential future workflow:

**PLAYER ELIGIBLE FOR OUTREACH**  
→ coach reviews profile  
→ player approves external share  
→ target environment selected  
→ target contact selected  
→ profile version frozen for share  
→ introduction logged  
→ scout access logged  
→ response logged  
→ additional information requested  
→ trial/evaluation opportunity  
→ outcome recorded  
→ next action generated  
→ outcome feeds development plan.

Outcome states may include:

- NOT_SENT
- PLAYER_CONSENT_PENDING
- READY_TO_SEND
- SENT
- VIEWED
- COACH_INTEREST
- MORE_EVIDENCE_REQUESTED
- TRIAL_INVITED
- TRIAL_COMPLETED
- OFFERED
- PLACED
- NOT_SELECTED
- DEFERRED
- WITHDRAWN

A "not selected" outcome should feed learning without degrading or shaming the athlete.

## 11. Business model

Keep three lines conceptually separate.

### 11.1 Development services

Athlete pays for:

- training;
- movement/performance assessment;
- speed/agility;
- strength/power;
- conditioning;
- technical/tactical development;
- video review;
- reassessment.

### 11.2 Prospect Assessment / Profile service

Potential standalone service:

- standardized testing;
- verified measurement;
- video;
- performance dossier;
- development summary;
- share-ready profile.

The conversation floated a future example price range of **$250–$500** for a professional evaluation/profile package. This is a proposal only, not approved pricing.

### 11.3 Representation

Separate future business line:

- employment representation;
- contract negotiation;
- commission;
- endorsements;
- formal agency agreements.

Do not mix this into the development product until compliance is explicitly resolved.

## 12. Agent / representation compliance boundary

World Rugby Regulation 5 defines "Agency Activity" around acting as an agent, representative or adviser in negotiation, arrangement or execution of an employment transaction or employment contract negotiation. Clubs/players using an agent must use an Accredited Agent under the regulation.

For Rugby HQ product safety, default to this boundary:

### Allowed development-pathway behavior until separate approval

- athlete development;
- testing;
- evidence collection;
- profile generation;
- video packaging;
- player-controlled sharing;
- introductions;
- factual coach-to-coach communication;
- communicating development evidence;
- recording recruiting interest;
- referral to accredited representation.

### Blocked until explicit compliance enablement

- negotiating employment terms;
- negotiating player contracts;
- representing the athlete in an employment transaction;
- collecting agent commission;
- presenting the operator as an accredited rugby agent without valid accreditation;
- creating agency contracts;
- making legal/contractual promises for a club or player.

Before enabling representation, independently verify:

- World Rugby Regulation 5 current version;
- applicable USA Rugby / union rules;
- any approved national agent scheme;
- applicable U.S. federal/state athlete-agent laws;
- Texas requirements;
- insurance requirements;
- written agency-contract requirements;
- commission rules;
- conflict-of-interest rules.

This resource is not legal advice.

## 13. Reputation and quality control

The pathway should reward **selectivity**.

Do not send every paying athlete to professional contacts.

Track:

- number of athletes in development;
- number reaching internal prospect threshold;
- number shared externally;
- coach response rate;
- profiles viewed;
- additional evidence requests;
- trial invitations;
- trial completion;
- offers;
- placements;
- level at placement;
- time-to-placement;
- false-positive send rate;
- coach feedback;
- reasons for non-selection;
- athlete development after non-selection.

Goal: increase trust so professional contacts learn that a Rugby HQ referral is worth reviewing.

## 14. Texas pathway strategy

Do not make the system dependent on one Texas professional franchise.

Build an independent Texas development hub capable of feeding multiple environments.

Potential pathway concept:

**Texas club / new athlete**  
→ Rugby HQ development  
→ stronger local club / select competition  
→ academy/high-performance opportunity  
→ professional trial  
→ professional contract / higher pathway.

Current professional league/team structures change. Verify all current organizations and contacts at time of outreach.

## 15. Integration with existing repository architecture

This resource extends, not replaces:

- docs/architecture/RUGBY_COACHING_OS_INTEGRATION_PLAN.md
- exercise-generation/COACH_OPERATIONS_GUIDE.md
- exercise-generation/SYSTEM_DATA_ENTRY_SPEC.md
- exercise-generation/ACTIVATE_ADULT_HANDOFF_V1.md
- public/rugby.html
- public/rugby-player.html
- docs/rugby/attack-intelligence/
- godot/rugby-hq-web/

### 15.1 Reuse

Reuse:

- existing userId;
- auth/permissions;
- rugby profile;
- assessment history;
- append-only evidence concepts;
- readiness projections;
- position overlays;
- movement/testing;
- technical skills;
- Rugby IQ;
- video evidence;
- existing game;
- welfare restrictions;
- safeguarding separation;
- notifications;
- future organization/team/roster primitives.

### 15.2 New bounded concepts

Future additions:

- prospect_profile_projection;
- prospect_profile_version;
- scout_share;
- scout_share_access_event;
- recruiter_requirement;
- recruiting_contact;
- player_introduction;
- placement_opportunity;
- placement_outcome;
- prospect_level_policy;
- external_profile_export.

Do not store these as arbitrary fields on the general user record.

## 16. Data-source hierarchy

Suggested evidence authority, strongest to weakest depending on domain:

1. official match/stat provider evidence;
2. verified match video + coach review;
3. live competition observation;
4. scrimmage/live training evidence;
5. standardized coach/tester measurement;
6. controlled drill evidence;
7. Rugby HQ simulation evidence;
8. self-reported result.

The system must retain source type. A weaker source cannot silently overwrite a stronger source.

## 17. Prospect readiness is not one score

Do not create a single "Pro Ready 87%" number.

Use a multi-domain decision:

- athletic readiness;
- rugby technical readiness;
- position readiness;
- tactical/decision readiness;
- live evidence quality;
- competition level;
- evidence freshness;
- welfare/availability;
- coach recommendation;
- target-team fit.

A professional opportunity is a human decision informed by evidence.

## 18. Proposed activation sequence

### Phase R3-0 — Resource registration
- preserve this handoff;
- preserve machine-readable companion;
- no user-facing claim that features are live.

### Phase R3-1 — Prospect data contract
- define versioned prospect projection;
- map existing assessment/evidence fields;
- define verification states;
- define share/privacy model;
- test no duplicate identity/scoring system.

### Phase R3-2 — Player Professional Profile
- authenticated player/coach view;
- longitudinal tests;
- evidence provenance;
- coach report;
- video references;
- no external sharing yet.

### Phase R3-3 — Scout View
- player consent;
- field-level projection;
- expiring/revocable share;
- access logging;
- privacy tests;
- restricted-data leakage tests.

### Phase R3-4 — Professional Network CRM
- contacts;
- relationship stages;
- recruiter requirements;
- follow-ups;
- source/provenance;
- no automated spam.

### Phase R3-5 — Placement workflow
- player-approved introductions;
- frozen profile version;
- interest/trial/outcome tracking;
- development feedback loop.

### Phase R3-6 — Agent module only after compliance gate
- explicitly separate;
- no implementation until approved.

## 19. Acceptance tests for future implementation

Minimum non-negotiable tests:

1. Prospect profile reuses existing Pocket PT user identity.
2. Old test results remain visible after reassessment.
3. Self-reported and verified evidence cannot be confused.
4. Simulation evidence cannot render as match evidence.
5. Readiness/status cannot be directly edited when it is derived.
6. Scout View excludes welfare narratives.
7. Scout View excludes safeguarding data.
8. Scout View excludes restricted Attack Intelligence.
9. Revoked share links stop resolving.
10. Expired share links stop resolving.
11. Scout access is auditable.
12. Player consent is required before external share.
13. Contact/outreach records preserve provenance.
14. "Agent" functionality is absent/blocked unless the compliance gate is enabled.
15. Team/league status used for outreach is current-verified, not hard-coded from this document.
16. Profile exports show protocol/date/tester for verified physical metrics.
17. A single high athletic score cannot override a safety/readiness gate.
18. A professional prospect recommendation remains a coach/human decision.
19. Game-derived tactical evidence is labeled SIMULATION.
20. No second rugby app or duplicate player database is created.

## 20. First-failure diagnostic targets

When building this pathway, surface the first failing gate in order:

1. identity/authorization;
2. player consent;
3. evidence provenance;
4. data freshness;
5. required prospect fields;
6. safety/welfare eligibility;
7. target-level evidence requirement;
8. share projection/privacy;
9. target-contact verification;
10. outreach/placement state.

Do not collapse failures into a generic "profile incomplete."

## 21. External-source verification captured at harvest

Verified on 2026-11-24:

- World Rugby Regulation 5 — Agents:
  https://www.world.rugby/organisation/governance/regulations/reg-5
- World Rugby Passport — Rugby Agents:
  https://passport.world.rugby/rugby-agents/
- World Rugby Passport — Rugby Agents resources:
  https://passport.world.rugby/rugby-agents/resources/
- Major League Rugby 2026 schedule announcement:
  https://www.majorleague.rugby/news/major-league-rugby-announces-full-2026-schedule

The 2026 MLR schedule announcement listed six participating teams for that season. This is date-specific historical context, not a permanent roster. Re-verify current league structure whenever Rugby HQ performs real outreach.

## 22. Core phrase for the system

**Develop → Measure → Compete → Verify → Place → Learn**

The last step matters: every scouting response, trial and placement outcome should improve the next athlete's development pathway without turning one club's opinion into universal truth.
