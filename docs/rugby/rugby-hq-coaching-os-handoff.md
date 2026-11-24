# Rugby HQ — Coaching OS & Product Knowledge Handoff

Status: THREAD HARVEST / implementation-ready resource  
Date: 2026-11-24  
Owner: Rashad Harbor / Milele Fit  
Audience: Rugby HQ product, coaching, game, AI, and content systems  
Visibility: INTERNAL PRODUCT KNOWLEDGE. This repository is public. Do not add proprietary club tactics, player medical details, paid-course materials, or unpublished team documents here.

## 1. Why Rugby HQ exists

Rugby HQ is not just a workout library and not just a game. It is the player-development operating system inside Milele Fit:

> Assess the athlete → identify the limiting quality → prescribe the smallest effective development block → practice rugby decisions under pressure → track outcomes → reassess.

Its purpose is to help a coach build an elite development squad and help players become more physically capable, more technically reliable, more tactically intelligent, and more durable.

The experience should unite:
- **Rugby Ready:** movement quality, robustness, stability, strength, power and contact preparation.
- **Advanced rugby conditioning:** needs analysis, training load, testing, speed, repeated-effort conditioning, periodization and monitoring.
- **Position intelligence:** distinct requirements for forwards and backs, then individual roles.
- **SAQ + recovery:** speed, agility, quickness, yoga, mobility, breathing and recovery without adding needless match-week fatigue.
- **Decision practice:** small-sided, repeatable game situations where the player reads a picture, chooses, executes, then reviews.
- **Coach intelligence:** a coach owns the training decision; the system organizes evidence, flags trends and preserves the athlete's history.

The system must never promise selection, diagnose injury, clear return-to-play, or substitute for the player's team coach, qualified medical professional, or concussion protocol.

## 2. Non-negotiable product principles

1. **Individual first, position second, generic last.** A prop and wing may share a development need, while two wings may need completely different work.
2. **Earn the next phase.** Do not automatically advance a player because a calendar week ended.
3. **Quality before volume.** A clean high-quality sprint, cut, lift or rugby decision is worth more than fatigue disguised as work.
4. **Assess the same way each time.** Compare like with like: protocol, surface, timing method, warm-up, footwear, date and readiness.
5. **Team load wins in season.** Club/team practices and matches take priority. Rugby HQ adds what the player can recover from.
6. **Separate capability from execution.** A player can have good speed but poor decision-making; a good decision can still fail because execution was poor.
7. **Teach the rule, not only the answer.** The game should reveal why a decision worked or failed, not simply award points.
8. **Show one useful coaching point at a time.** Avoid clutter, especially on a phone.
9. **Keep source and interpretation separate.** Coach-authored material remains immutable; exercises, UI, AI explanations and lesson summaries are clearly labeled as proposals until approved.
10. **Keep tactical content protected.** No detailed club formations, calls, assignments or playbook diagrams on public routes or in this public repo.

## 3. Athlete-development ladder

Rugby HQ should model a readiness ladder. Names can be player-friendly in the UI, but the underlying sequence stays intact.

| Phase | Primary question | Examples of evidence to progress | System outcome |
|---|---|---|---|
| Functional stability | Can the athlete own safe, pain-free positions? | Movement screen, trunk/hip/ankle control, landing and deceleration observation | Corrective movement, mobility, low-load control |
| Strength stability | Can the athlete maintain position while producing force? | Single-leg control, loaded pattern quality, force tolerance | Foundational resistance and controlled field work |
| Maximum strength | Can the athlete create enough force for the role? | Coach-approved strength tests, relative-strength trend, quality under load | Strength block with carefully managed field exposure |
| Power | Can the athlete apply force quickly? | Jump/throw/sprint/loaded-power quality, no unresolved pain | Low-volume power work and acceleration transfer |
| Maximum power | Can the athlete express power in rugby-relevant actions? | High-quality acceleration, deceleration, COD and contact-transfer observations | Position-specific explosive work with recovery protection |
| Beast Mode | Can the athlete repeatedly express physical and tactical qualities under realistic pressure? | Stable readiness, performance consistency, coach observation, repeat-effort quality | Integrated rugby scenarios, game demands and leadership responsibility |

### Progression rules

- “Beast Mode” is an **earned integrated-performance state**, not a punishment workout and not a generic intensity level.
- Regress the plan when pain/injury concern, major fatigue, falling movement quality, adverse readiness trend, or team-load conflict appears.
- A player can progress in one quality and remain earlier-stage in another.
- No phase is a medical clearance. If the athlete reports pain, concussion symptoms or injury concern, stop the relevant work and refer appropriately.

## 4. The Activate engine for adult players

The Activate engine is the practical delivery system for the ladder. It should create a repeatable flow instead of a random drill feed.

### 4.1 Intake and athlete record

Collect only what is necessary and protect it:
- identity, club, competition level, age band and preferred position(s)
- training age and available equipment
- match/practice schedule, recent minutes and perceived load
- goals: performance, position, return-to-training support, durability, body composition, etc.
- self-reported pain/injury concern and medical referral notice
- assessment results with protocol metadata
- coach observations, player reflections and adherence

### 4.2 Session logic

Every session should have five blocks:

1. **Readiness:** player check-in; sleep/fatigue/soreness optional; team workload; pain/injury concern.
2. **Prepare:** tissue temperature, joint range, coordination and position-specific movement preparation.
3. **Develop:** the current limiting quality from the development ladder.
4. **Transfer:** a controlled rugby-related movement, skill or decision constraint appropriate to the player's stage.
5. **Reflect:** RPE/readiness response, quality note, symptoms, coach observation and next action.

The AI may summarize patterns and offer options, but it must not make a medical decision or overwrite a coach's prescribed plan.

### 4.3 Decision rules

- **Pain/injury concern:** do not prescribe high-risk progression; show stop-and-seek-evaluation guidance.
- **Heavy team load or match proximity:** recovery/mobility/breathing and short technical quality only, unless the coach explicitly schedules more.
- **Fatigued:** reduce volume and complexity before reducing technical standards.
- **Fresh + no load conflict + phase criteria met:** allow a small progression in one variable only (load, speed, complexity, density or decision pressure).
- **No meaningful baseline:** guide to a coach-supervised/manual assessment before assigning an advancement plan.

## 5. Assessment and monitoring framework

### 5.1 Use an assessment battery, not one magic score

Keep raw result, protocol and trend. Do not hide a weak domain inside a single “overall rugby rating.”

**Movement / robustness**
- ankle knee-to-wall left/right
- hip and trunk movement observations
- squat, hinge, lunge, push, pull, brace and landing quality
- single-leg balance/control
- deceleration observation
- neck/contact-preparation work only when overseen by qualified staff

**Speed / acceleration**
- 10 m sprint
- 20 m sprint
- optional 30–40 m sprint when appropriate
- split times where equipment and protocol allow

**Change of direction / reactive agility**
- 505 left and right
- planned COD test
- separate reactive agility observation; ladder drills alone do not prove reactive agility

**Power**
- coach-selected jump/throw measures
- asymmetry and landing quality are context, not an automatic diagnosis

**Conditioning**
- sport-appropriate repeat-effort or aerobic field test selected by the coach
- attendance, match minutes, sRPE/load and recovery trend

**Rugby performance**
- position rubric, coach observation, game review and scenario decisions
- distinguish decision quality, technical execution, physical capacity and outcome

### 5.2 Minimum data model

```json
{
  "athleteId": "string",
  "assessment": {
    "type": "sprint_10m | sprint_20m | agility_505_left | agility_505_right | mobility | power | conditioning | rugby_rubric",
    "value": 0,
    "unit": "seconds | centimeters | score | note",
    "assessedAt": "ISO-8601",
    "protocolVersion": "string",
    "surface": "string",
    "timingMethod": "manual | electronic | estimated",
    "verifiedBy": "self | coach | practitioner",
    "readinessContext": "string"
  },
  "decision": {
    "currentPhase": "functional_stability | strength_stability | maximum_strength | power | maximum_power | beast_mode",
    "primaryNeed": "string",
    "confidence": "low | medium | high",
    "coachApprovalRequired": true
  }
}
```

Never compare raw results across materially different protocols as if they are interchangeable. Professional or combine benchmarks must be stored with their exact source, population, date, protocol and intended use; they are reference bands, not pass/fail standards for club athletes.

## 6. Position framework

### 6.1 Shared rugby foundations

Every player needs:
- robust movement and contact-safe coaching
- acceleration, deceleration and re-acceleration
- passing, catching and scanning under pressure
- tackle technique and legal defensive decision-making under qualified coaching
- communication, work rate, reload and transition awareness
- recovery habits and availability
- rugby laws awareness, including legal support lines and obstruction risk

### 6.2 Forward profiles

Forwards share contact, set-piece and work-capacity demands, but must still be separated by role.

| Group | Primary performance themes | Evidence / observations to track |
|---|---|---|
| Front row | Scrum posture/force transfer, neck/shoulder robustness, short-area power, tackle/carry technique | Coach scrum observation, contact readiness, strength quality, repeat short-effort capacity |
| Locks | Lineout contribution, lift/jump coordination, collision work, ruck arrival, repeat effort | Lineout role quality, jump/lift coaching notes, landing control, work-rate trends |
| Back row | Tackle density, jackal/ruck decisions, carry footwork, link play, field coverage | Tackle/carry efficiency, arrival/reload, decision quality, speed/COD and conditioning |
| Hooker | Throwing, front-row demands, communication, ruck/carry work | Throwing accuracy context, scrum/lineout notes, contact and repeat-effort readiness |

### 6.3 Back profiles

Backs need a parallel, equally serious evaluation system—not a watered-down forward rubric.

| Group | Attack intelligence | Defense intelligence | Physical / technical evidence |
|---|---|---|---|
| Halfbacks (9/10) | Scan, tempo, passing/kicking choice, organize shape, manage territory | Identify threats, communicate, fit into line, make tackle decisions | Pass/kick accuracy in context, decision clips, acceleration, repeat efforts |
| Centers (12/13) | Carry/pass balance, manipulate space, distribute or win gainline, support lines | Read shape, line speed, shoulder choice, communication, tackle completion | Contact skill, footwork, acceleration, COD, decision/execution separation |
| Wings (11/14) | Finish, chase, kick-return decisions, touchline awareness, support timing | Backfield/edge positioning, aerial/chase decisions, tackle and cover | Max-velocity exposure, acceleration, evasiveness, aerial skill notes, repeat sprint |
| Fullback (15) | Backfield scanning, counterattack, kick return, organize attack, connect wide space | Backfield coverage, communication, last-defender decision and tackle choice | Catch/kick/pass under pressure, speed, reactive agility, defensive communication |

The UI should let an athlete choose a primary and secondary position. A coach can weight attributes by role without making the player “bad” at an unweighted attribute.

## 7. Rugby decision intelligence and game design

### 7.1 Training loop

Each game scenario must follow:

> Picture → scan → decision → execution → consequence → one coaching point → replay or progress.

The game scores and reviews these separately:
1. defender committed
2. usable space created
3. ball moved into opportunity
4. support positioned
5. execution outcome

A try or line-break is not automatic evidence that every decision was correct. Likewise, a sound decision can be scored as sound even if a pass is slightly inaccurate.

### 7.2 Small-sided progression

Use the existing Rugby HQ progression:
- **2v1:** draw and pass / hold and beat / timing and support line
- **2v2:** create and exploit space against cover
- **3v2:** identify the overlap, preserve width/depth and sequence decisions

Build from constrained, readable pictures to changing pictures. AI defenders should vary press, drift, hold, recover and cover behavior. The player should learn to read—not memorize an answer.

Keep the current product contract:
- deterministic scenario seed and replay
- solo uses AI for unclaimed roles
- multiplayer becomes server-authoritative; clients cannot author possession, location or score
- private rooms max four human players, with AI fill
- mobile Safari first; no modal obscuring play; controls safe-area-aware; lazy-load heavier assets
- existing working drill links remain untouched until a gated release passes acceptance

### 7.3 Structure and chaos teaching model

Use the approved lesson architecture:
- **Structure:** roles, position, timing, communication and repeated execution.
- **Chaos:** pressure at pace, adaptability, creativity, problem-solving and response to changing pictures.
- Both are required. Structure supplies a foundation; chaos develops adaptation.

A scenario may first reveal a predictable defender behavior, then use the same movement pattern with an unpredictable press/drift/hold choice. Label conceptual diagrams as teaching examples unless a coach has approved them as official material.

### 7.4 Legal and ethical gameplay

- Do not reward illegal obstruction.
- Teach legal support and running lines.
- Do not model dangerous contact, concussion return, or illegal tackle technique as gameplay rewards.
- Avoid turning player self-report into a public leaderboard.
- Use a calm, specific post-play review rather than shame-based scoring.

## 8. In-season SAQ and recovery system

Rugby HQ's recovery-first approach remains foundational:
- yoga, mobility, breathing and relaxation support recovery and body awareness
- short, high-quality speed/COD exposure can maintain qualities when readiness and team schedule permit
- avoid adding fatigue merely to make a session feel hard
- no automatic weekly progression during congested fixtures
- recovery basics—sleep, food, hydration and comfortable movement—come before optional add-ons

Existing eight-week in-season themes can remain:
1. baseline and readiness
2. ankle and hip mobility
3. single-leg control
4. recheck and adjust
5. deceleration mechanics
6. agility maintenance
7. individual focus
8. review and next phase

These are themes, not a rigid program. The bot should contextualize every recommendation with match week, team practices, reported fatigue and coach plan.

## 9. Coach dashboard requirements

The coach view should answer these questions quickly:
- Who is available, fatigued, in pain or overdue for review?
- What is each athlete's current phase and primary limiting quality?
- Are results improving under comparable protocols?
- Is there a meaningful left/right or quality asymmetry worth observing?
- What did the athlete do, report and learn this week?
- Is a player accumulating team load plus extra Rugby HQ load?
- Is a game decision issue physical, technical, tactical, or confidence/communication related?
- Which athletes are ready for a higher-complexity scenario—not merely a harder workout?

Recommended cards:
- roster / availability
- player profile and position weighting
- assessment history with protocol note
- readiness and load trend
- current development phase / coach override
- individual session plan and completion
- scenario decision review
- coach notes and next review date

Use private coach/team roles. Players see their own information and coach-approved learning content; they do not see teammates' private records.

## 10. Bot behavior contract

When asked to plan, explain or recommend, the Rugby HQ bot should:

1. identify context: athlete, position, phase, goal, team-load/match context, recent readiness and data confidence;
2. state the limiting quality in plain language;
3. offer the smallest effective next step with a reason;
4. distinguish **verified data**, **self-reported data**, **coach observation**, and **general education**;
5. ask for a coach decision when data is insufficient or the choice affects tactical/medical risk;
6. never invent test results, professional benchmarks, team tactics or player history;
7. use calm, direct, coach-like language; do not shame a player for fatigue or missed work;
8. reference private tactical material only after server-side authorization.

Example output shape:

```json
{
  "summary": "Your 10 m time is improving, but your latest check-in reports heavy team load.",
  "focus": "Maintain acceleration quality; do not add volume this week.",
  "nextStep": "One coach-approved, low-volume acceleration exposure after a full warm-up if you feel normal.",
  "why": "Match-week load has priority, and speed quality falls when fatigue rises.",
  "confidence": "medium",
  "requiresCoachApproval": true,
  "dataBasis": ["self-reported readiness", "coach-verified sprint protocol v1"]
}
```

## 11. Content and asset intake rules

For every new coaching source or asset, record:
- unique ID and title
- source/author, date received and ownership
- visibility: public education, authenticated member, team, coach-only
- immutable original source
- derived principles
- proposed lesson/game interpretation
- required coach approval
- expiration/review date
- tactical sensitivity and publication authorization
- media rights and accessibility (caption/transcript/alt text)

Do not paste full paid-course content, team Discord exports, proprietary playbooks or personal medical details into this repository. Store sensitive sources in an access-controlled private location, then reference their ID and authorization state from Rugby HQ.

## 12. Delivery roadmap

### Now: make current Rugby HQ smarter without destabilizing it
1. Keep the current landing page, player dashboard, recovery check-in and manual assessments intact.
2. Add this resource to the bot's Rugby HQ knowledge index.
3. Surface the athlete-development phase, primary need, data confidence and coach override in the authenticated dashboard.
4. Add position-profile intake with primary/secondary position and non-medical coach rubric.
5. Add assessment protocol metadata and trend display before adding a composite score.
6. Keep 2v1 / 2v2 / 3v2 learning content as conceptual, coach-reviewed scenarios.

### Next: build the usable coaching OS
1. Coach roster and individual athlete page.
2. Manual coach assessment workflow and like-for-like comparison.
3. Development-ladder planning rules with explicit coach approval.
4. Player session plan + check-in + reflection loop.
5. Position-specific rubrics for forwards and backs.
6. Scenario review that separates decision, execution and outcome.

### Later: advanced arena and team deployment
1. Feature-gated 3D training arena vertical slice.
2. Deterministic rules engine and replay.
3. Coach-authored scenario editor with private access controls.
4. Server-authoritative multiplayer rooms.
5. Authorized private tactical lesson/media delivery only after the access audit passes.

## 13. Definition of done / acceptance

A Rugby HQ feature is ready only when:
- it protects current working routes and has a rollback path;
- it works on iPhone/mobile, not just desktop;
- it uses server-side access checks for private/team material;
- it clearly distinguishes education from medical/tactical authorization;
- it does not advance an athlete solely because time elapsed;
- it captures enough protocol/context to make trends meaningful;
- it exposes one useful player action and one useful coach action;
- it has tests for core rules and an actual live verification path;
- coach-reviewed content cannot be confused with generic AI-generated material.

## 14. Existing repository connections

- Player entry/dashboard: `public/rugby-player.html`
- Public landing: `public/rugby.html`
- Existing game entry: `public/game/rugby-hq/index.html`
- In-season player records/check-in: `public/rugby-records.js`, `public/rugby-checkin.js`
- Attack-learning sources: `docs/rugby/attack-intelligence/`
- Arena contract: `docs/rugby/quin-nation-3d-arena-contract.md`
- Web build and rollback process: `docs/rugby/web-integration.md`

## 15. Open decisions for Rashad / coach review

1. Which assessment protocols become the Rugby HQ standard for each age/competition band?
2. Which role-specific rubrics are coach-owned versus player self-reflection?
3. What exact professional/combine datasets may be licensed or cited as reference bands?
4. What permissions identify a Quins/team player, coach and admin in deployed infrastructure?
5. Which tactical content belongs in a private team space versus generic Rugby HQ education?
6. What are the team’s weekly practice/match rhythms so workload rules reflect reality?

Until these are resolved, use conservative, coach-approved defaults rather than invented benchmarks or automated tactical prescriptions.
