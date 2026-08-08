# Pocket PT Rugby Coaching OS — Data Entry & Editing Specification

This specification converts the Coach Operations Guide into implementation behavior.

## UX rule

Every operational screen must answer three questions without training:

1. **What does this mean?** — contextual help / definition.
2. **Where did this status come from?** — evidence/source link.
3. **How do I change it?** — explicit permitted action such as Edit profile, Log evidence, Update availability, Add block, Assign shirt.

## Status ownership

Use three labels in the UI where helpful:

- **Coach entered**
- **System calculated**
- **Restricted / authorized role only**

Never show an editable pencil on a system-derived score if the source records should be edited instead.

## Required production actions

### Roster
- Add player
- Edit player
- Archive/remove player from active roster
- Restore archived player
- Search/filter
- Import roster later

Removal should normally archive rather than erase historical evidence.

### Player Development
- Edit identity/development fields
- Add/remove goals
- Add next action
- Log observation/evidence
- View evidence history
- View current restrictions without exposing restricted narratives

### Readiness
- Select player
- Select domain
- Open rubric/pathway
- Record assessment/evidence
- Verify criterion/stage if authorized
- Regress/reopen criterion with reason
- Set reassessment due date
- View calculation breakdown

### Competency Graph
- Open node
- See prerequisites
- See evidence requirement
- Add evidence
- Verify/reopen node
- Show unlocked nodes
- Preserve history; never silently overwrite

### Sessions
- Create/edit/duplicate/archive session
- Add/edit/remove/reorder block
- Assign player group and coach
- Add competency observation targets
- Run safety checklist
- Publish/unpublish
- Record attendance

### Selection
- Create match/event
- Choose format (15s/7s/etc.)
- Assign eligible player to shirt/role
- Move player Starter ↔ Bench ↔ Competing ↔ Not selected
- Add selection reason / next action
- Enforce hard restrictions
- Publish status

### Welfare
- Update participation status within role permissions
- Record injury/possible head injury
- Create restriction
- Attach authorized clearance
- Advance return stage only when protocol/role allows
- Full audit history

### Safeguarding
- Submit concern
- Immediate-danger prompt
- Officer-only queue
- Officer action log
- External referral marker
- Restricted access/audit
- No automated guilt/credibility determination

### Command Center
No manual editing of derived totals. Every card links to the source workflow that changes it.

## Competency scoring implementation

Prefer discrete states over arbitrary numbers:

- LOCKED
- NOT_ASSESSED
- INTRODUCED
- ASSISTED
- INDEPENDENT_CONTROLLED
- INDEPENDENT_LIVE
- REPEATABLE_PRESSURE
- VERIFIED
- REASSESSMENT_DUE

For a staged pathway:

`completion_percent = verified_required_nodes / total_required_nodes * 100`

For a criterion rubric, calculate a display percentage from explicit criteria while preserving each criterion result. A safety-critical failed criterion can force the domain to Developing/Not Ready regardless of average.

Evidence record minimum schema:

- evidence_id
- player_id
- competency_id
- observer_id
- timestamp
- environment
- pressure_level
- independence_level
- result
- factual_note
- video/file refs
- protocol/rubric version
- acknowledgment state

## Help system

Add a persistent **Coach Guide** entry plus contextual `?` help on complex sections. Help content should deep-link to:

- Player setup
- Evidence rubric
- Readiness
- Competency graph
- Training planner
- Match selection
- Welfare
- Safeguarding
- Command Center

The guide should be accessible on mobile and should not require leaving the system.

# Backs Rugby Ready — Data Entry / Production Spec

## New records

`backline_assessment`
- assessment_id
- player_id
- evaluated_position: 10 | 12 | 13 | 11 | 14 | 15
- defensive_iq_score (1–99)
- tackling_in_space_score (1–99)
- attack_iq_score (1–99)
- ball_skills_score (1–99)
- movement_evasion_score (1–99)
- role_specific_score (1–99)
- calculated_skill_iq_rating
- calculated_readiness_band
- starter_gate_status
- evaluator_id
- assessed_at
- notes

`backline_evidence`
- evidence_id
- player_id
- evaluated_position
- category
- competency
- score
- evidence_type: drill | scrimmage | match | video
- coach_note
- media_ref / timestamp (optional)
- evaluator_id
- evidence_date
- confidence_level
- pressure_level
- next_action

`backline_athletic_test`
- test_id
- player_id
- test_type
- raw_value
- unit
- normalized_score (1–99)
- test_date
- evaluator_id
- context / conditions

## Calculations

Backline Skill/IQ Rating = Defensive IQ × .20 + Tackling in Space × .15 + Attack IQ × .20 + Ball Skills × .15 + Movement & Evasion × .15 + Role-Specific Skill × .15.

Backline Athletic Index = Speed × .25 + Agility × .25 + Repeat Effort × .20 + Endurance × .15 + Power × .10 + Strength × .05.

Do not let a coach directly type the calculated totals in production. Coaches enter category evidence/scores; the system calculates totals and bands.

## Starter eligibility rule

`starter_eligible = false` when any hard restriction is active, including tackling_in_space_score < 70, active medical/concussion restriction, or another program-defined participation lock. A high total rating must never average away a hard gate.

## UI actions required

Backs Rugby Ready must support: choose player → choose evaluated position → open category → see criteria → log evidence → edit factual record within permissions → attach clip/timestamp → set next action → calculate current score/band → show hard-gate reason → compare recent evidence → view role overlay → view Athletic Index separately.

---

# Adult Activate Data Entry

## Records
`activate_levels`: programme_type, level_number, level_name, stage_name, minimum_weeks, description

`activate_parts`: level_id, part_code, focus, target_duration_minutes, sort_order

`activate_exercises`: part_id, name, description, sets, reps, duration_seconds, distance_meters, intensity_percent, equipment, is_partner_drill, is_match_day_safe, video_url, coach_notes

`activate_cues`: cue_name, description

`exercise_cues`: exercise_id, cue_id

`athlete_activate_status`: athlete_id, current_level_id, status, weeks_at_level, coach_approved, last_assessed_at

`session_logs`: session_date, session_type, level_id, coach_id, notes

`athlete_session_scores`: session_id, athlete_id, attendance_status, control_score, balance_score, technique_score, trunk_score, landing_score, cod_score, neck_score, fatigue_score, pain_flag, injury_note, coach_note, ready_to_progress

## Data-entry rule
Coaches enter evidence and observations. Pocket PT calculates recommendations. Readiness status must not be a free-form percentage field.
