# Contractor Implementation Tasks

## Objective

Add Rugby HQ resources and build the Backs Rugby Ready system into the Mufasa Fit / Pocket PT node repo.

## Phase 1 — Resource ingestion

- [ ] Confirm `resources/rugby-hq` is included in the deployed repo.
- [ ] Add a server or build-time loader for `evaluation-rubric.json`.
- [ ] Add bot retrieval/indexing for all markdown files in `resources/rugby-hq`.
- [ ] Confirm the bot can answer: "What makes a 13 starter-ready?"

## Phase 2 — Data model

- [ ] Create player table or connect to existing player model.
- [ ] Create `backline_evaluations`.
- [ ] Create `athletic_tests`.
- [ ] Create `readiness_snapshots`.
- [ ] Create `audit_log`.
- [ ] Ensure restricted welfare/safeguarding data is not stored in normal coaching tables.

## Phase 3 — Coach UI

- [ ] Add coach evaluation form.
- [ ] Add category selector.
- [ ] Add competency selector based on rubric JSON.
- [ ] Add 1–99 score input.
- [ ] Add evidence type.
- [ ] Add coach note and next action.
- [ ] Add video clip/timestamp fields.
- [ ] Add confidence level.

## Phase 4 — Player UI

- [ ] Add Backline Skill/IQ Rating card.
- [ ] Add Backline Athletic Index card.
- [ ] Add readiness status.
- [ ] Add blocker reason where permission allows.
- [ ] Add next-action panel.
- [ ] Add trend over time.

## Phase 5 — Readiness engine

- [ ] Calculate weighted Skill/IQ score.
- [ ] Calculate Athletic Index separately.
- [ ] Apply hard gates.
- [ ] Generate status.
- [ ] Generate lowest-category next-action recommendation.
- [ ] Store readiness snapshot.

## Phase 6 — Fitness tests

- [ ] Add 10m/20m/40m sprint.
- [ ] Add T-test.
- [ ] Add 5-10-5 shuttle.
- [ ] Add get-up sprint repeat drill.
- [ ] Add Bronco.
- [ ] Add beep test.
- [ ] Add broad jump.
- [ ] Add vertical jump.
- [ ] Add medicine ball throw.

## Acceptance criteria

- A coach can evaluate a wing, 13, 12, 10, or 15.
- A player can see why they are or are not starter eligible.
- A fast player with unsafe tackling is blocked from starter eligibility.
- Athletic Index does not override Skill/IQ hard gates.
- Bot can explain a player's score and next action.
- Audit log records rating changes.
