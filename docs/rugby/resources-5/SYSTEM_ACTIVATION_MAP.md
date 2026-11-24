# Rugby HQ Resources 5 — System Activation Map

Status: product activation reference  
Audience: Mufasa bot, Codex, Rugby HQ implementation agents.

## 1. Goal

Map the harvested coaching/welfare knowledge into concrete Rugby HQ modules without duplicating existing Pocket PT systems.

## 2. Primary modules

### Rugby Command Center
Consumes real authoritative records from:
- teams;
- seasons;
- roster;
- staff;
- player profiles;
- readiness/evidence;
- wellness;
- sessions;
- match selection.

Never manually edit summary percentages.

### Players / Rugby Profile
Add rugby-specific layer on existing Pocket PT athlete:
- primary/secondary/development positions;
- rugby age/experience;
- team/season membership;
- readiness/evidence history;
- coach notes;
- development stage.

### Evidence & Competency Engine
Shared foundation for all future technical/tactical/readiness systems.

Competency ladder:
Not Assessed → Introduced → Assisted → Independent Controlled → Independent Live → Repeatable Under Pressure → Verified/Current.

### Movement Ready
Inputs:
- movement screens;
- Activate quality;
- balance/stability;
- video/pose evidence;
- corrective pathway;
- retest.

### Conditioning Ready
Inputs:
- speed;
- aerobic/MAS;
- RSA/RHIE;
- strength/power;
- position demands;
- fatigue/load history.

Do not collapse all qualities into one universal score.

### Scrum Ready
10-stage internal evidence pathway.
Hard-gate role where current law/competition requires suitable front-row training/experience.

### Tackle Ready
Separate technical competencies and live-pressure evidence.
Hard safety flags override selection.

### Ruck / Maul / Lineout Ready
Independent competency graphs.

### Backs Rugby Ready
Universal backs card + position overlays.
Separate Skill/IQ from Athletic Index.

### Activate-Aligned Adult Foundation
Training/match-day preparation, 7 levels, 4-part session, Activate 8 cues.
Feeds Movement Ready / preparation history.

### Pocket PT Beast Mode
Proprietary performance extension above quality foundation.

### Player Wellness
- soreness;
- fatigue;
- pain flag;
- injury;
- concussion concern;
- restrictions;
- return status.

### Concussion Center
Recognise → Remove → Record → Refer/Follow-up → Recover → Return.
No diagnosis / no medical clearance by AI.

### Safeguarding Center
Protected domain:
- policies;
- code of conduct;
- concern intake;
- poor-practice pathway;
- possible-abuse pathway;
- safeguarding officer;
- audit trail;
- role-based access.

### Coach Ready
Credential tracker + club-level access/role readiness.

### Sessions
Coach creates session from actual player/team needs.
Future generated session can group players by competency stage.

### Match Selection
Selection evidence + hard safety gates + coach decision.
No single magic readiness score.

### Coach Guide
Persistent contextual help:
- explain metric;
- explain what evidence changes it;
- show how to enter/edit data;
- show next action.

## 3. Bot action logic

When asked to improve/build Rugby HQ:
1. Read Resource 5.
2. Read architecture integration plan.
3. Reuse existing Pocket PT athlete/auth/exercise/wellness/media systems.
4. Avoid duplicate domains.
5. Preserve evidence history.
6. Keep official/recommended/internal labels visible.
7. Apply safety gates before performance.
8. Keep medical/safeguarding data permission-separated.
9. Build production-first, restricted while unfinished.
10. Do not create temporary pilot persistence.

## 4. Data objects implied by the harvest

Core:
- rugby_organization
- rugby_team
- rugby_season
- rugby_roster_membership
- rugby_staff_assignment
- rugby_player_profile
- rugby_position

Evidence:
- competency_definition
- competency_dependency
- athlete_competency_status
- competency_evidence
- assessment_protocol
- assessment_result
- coach_override_history

Preparation:
- activate_level
- activate_part
- activate_exercise
- activate_cue
- activate_session
- athlete_activate_score

Welfare:
- injury_restriction
- concussion_incident
- return_to_rugby_stage
- emergency_action_plan

Safeguarding (protected):
- code_of_conduct_version
- conduct_acknowledgment
- safeguarding_risk_assessment
- safeguarding_concern
- safeguarding_action_log
- safeguarding_assignment

Selection/session:
- rugby_session
- session_participant
- session_plan_item
- match_fixture
- match_squad
- match_selection_decision

Exact names should follow the production repository's conventions.

## 5. Explainability requirement

Every derived readiness decision should answer:
- What evidence changed the status?
- Which rule/dependency applied?
- Which safety gate applied?
- What is the next action?
- When should the athlete be reassessed?

## 6. Suggested Rugby HQ UI hierarchy

Rugby HQ
- Command Center
- Players
- Teams / Seasons / Rosters
- Development
- Readiness
  - Movement
  - Conditioning
  - Contact/Tackle
  - Scrum
  - Ruck/Maul/Lineout
  - Backs Rugby Ready
- Activate
- Sessions
- Match
- Welfare
  - Injury
  - Concussion
- Safeguarding (restricted)
- Coach Ready
- Coach Guide
- 3D Training Simulator / Game

## 7. 3D game connection

Future game scenarios may consume validated attributes:
- acceleration;
- max velocity;
- repeat-effort capacity;
- tackle competency;
- defensive spacing;
- support-line decisions;
- position role logic.

The game can train decisions and visualize evidence; it must not issue medical clearance or official competition eligibility.

## 8. Implementation sequence

Recommended dependencies:
1. production persistence / auth foundation;
2. rugby domain (org/team/season/roster/roles);
3. shared evidence/competency engine;
4. readiness modules;
5. Activate;
6. sessions / development;
7. match selection;
8. welfare integration;
9. safeguarding protected domain;
10. Coach Guide;
11. Beast Mode / advanced performance;
12. deeper game/simulator integration.

## 9. Acceptance rule

A module is not complete just because a card is visible.

It is complete when:
- coach can enter authoritative evidence;
- data persists;
- permissions are enforced;
- status derives correctly;
- history is preserved;
- the coach can understand why the status exists;
- live production flow can be verified.
