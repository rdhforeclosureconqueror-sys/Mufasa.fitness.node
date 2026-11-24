-- Rugby HQ Adult Activate + Beast Mode resource harvest schema starter
-- Source boundary: this is proposed Pocket PT/Mufasa software logic, not an official World Rugby schema.

CREATE TABLE IF NOT EXISTS rugby_activate_levels (
  id TEXT PRIMARY KEY,
  programme_type TEXT NOT NULL CHECK (programme_type IN ('adult_training','adult_match_day','beast_mode')),
  level_number INTEGER,
  level_name TEXT NOT NULL,
  stage_name TEXT,
  minimum_weeks INTEGER,
  source_classification TEXT NOT NULL DEFAULT 'proposed_internal'
);

CREATE TABLE IF NOT EXISTS rugby_activate_parts (
  id TEXT PRIMARY KEY,
  level_id TEXT REFERENCES rugby_activate_levels(id),
  part_code TEXT NOT NULL CHECK (part_code IN ('A','B','C','D')),
  focus TEXT NOT NULL,
  target_duration_minutes INTEGER,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rugby_activate_exercises (
  id TEXT PRIMARY KEY,
  part_id TEXT REFERENCES rugby_activate_parts(id),
  name TEXT NOT NULL,
  category TEXT,
  sets INTEGER,
  reps TEXT,
  duration_seconds INTEGER,
  distance_meters INTEGER,
  intensity_percent INTEGER,
  equipment TEXT,
  is_partner_drill BOOLEAN DEFAULT FALSE,
  is_match_day_safe BOOLEAN DEFAULT FALSE,
  source_basis TEXT,
  redistribution_note TEXT,
  coach_notes TEXT
);

CREATE TABLE IF NOT EXISTS rugby_activate_cues (
  id TEXT PRIMARY KEY,
  cue_name TEXT NOT NULL,
  plain_language TEXT,
  domain TEXT
);

CREATE TABLE IF NOT EXISTS rugby_activate_exercise_cues (
  exercise_id TEXT REFERENCES rugby_activate_exercises(id),
  cue_id TEXT REFERENCES rugby_activate_cues(id),
  PRIMARY KEY (exercise_id, cue_id)
);

CREATE TABLE IF NOT EXISTS rugby_athlete_activate_status (
  athlete_id TEXT NOT NULL,
  current_level_id TEXT REFERENCES rugby_activate_levels(id),
  status TEXT NOT NULL,
  weeks_at_level INTEGER DEFAULT 0,
  coach_approved BOOLEAN DEFAULT FALSE,
  last_assessed_at TEXT,
  PRIMARY KEY (athlete_id, current_level_id)
);

CREATE TABLE IF NOT EXISTS rugby_athlete_session_scores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  athlete_id TEXT NOT NULL,
  attendance_status TEXT,
  control_score INTEGER CHECK (control_score BETWEEN 1 AND 5),
  balance_score INTEGER CHECK (balance_score BETWEEN 1 AND 5),
  technique_score INTEGER CHECK (technique_score BETWEEN 1 AND 5),
  trunk_score INTEGER CHECK (trunk_score BETWEEN 1 AND 5),
  lower_limb_alignment_score INTEGER CHECK (lower_limb_alignment_score BETWEEN 1 AND 5),
  landing_score INTEGER CHECK (landing_score BETWEEN 1 AND 5),
  cod_score INTEGER CHECK (cod_score BETWEEN 1 AND 5),
  neck_score INTEGER CHECK (neck_score BETWEEN 1 AND 5),
  fatigue_breakdown_score INTEGER CHECK (fatigue_breakdown_score BETWEEN 1 AND 5),
  pain_flag BOOLEAN DEFAULT FALSE,
  injury_note TEXT,
  coach_note TEXT,
  ready_to_progress BOOLEAN DEFAULT FALSE
);
