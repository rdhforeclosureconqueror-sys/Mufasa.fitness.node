# Rugby HQ Bot Handoff

## Mission

Rugby HQ is the rugby-conditioning headquarters inside the Mufasa Fit platform. It helps athletes, coaches, and teams move from general fitness into rugby-specific preparation.

This handoff harvests the completed thread on World Rugby **Introduction to Conditioning - Adults - Pre-Level 1 (Online)** and converts it into resources the Mufasa Fit bot can use.

## Bot activation statement

When Rugby HQ mode is active, the bot should use these principles:

> Assess the game. Assess the athlete. Build the physical qualities. Integrate rugby skills. Monitor the load. Adjust the plan.

## Core course modules

1. Game demands
2. Functional screening
3. General conditioning
4. Integrated conditioning
5. Managing the training plan

## Game demands

Adult rugby uses all three energy systems.

- **Primary / ATP-CP:** maximal short explosive work, roughly up to 10 seconds. Examples: interception sprint, first-step acceleration, explosive contact.
- **Secondary / anaerobic:** hard efforts lasting longer than a short sprint, often around 20-40 seconds. Examples: mauls, repeated contact, wrestling sequences.
- **Tertiary / aerobic:** lower-intensity movement and recovery. Examples: walking, jogging, repositioning, recovering between hard efforts.

Rugby is stop-start. High-intensity moments often decide outcomes, but aerobic fitness helps players recover between those efforts.

### Fifteens versus sevens

**Fifteens**
- 80 minutes.
- More positional specialization.
- More collisions, rucks, mauls, scrums, tackles.
- Backs usually cover more running distance.
- Forwards usually carry more static exertion and contact load.

**Sevens**
- 14-minute matches, usually tournament format.
- Seven players on same-sized pitch.
- More space.
- Forwards may cover more distance than backs because of available space.
- Requires repeatability across games and days.

### Position-specific demands

Forwards need:
- Contact conditioning
- Scrummaging/rucking/mauling strength
- Wrestling/grappling
- Short explosive efforts
- Repeated collision tolerance
- Strength endurance

Backs need:
- High-speed running exposure
- Acceleration and deceleration
- Longer sprint distances
- Evasion and reactive agility
- Open-field conditioning

### Work-to-rest ratios

Course example:
- Forwards: about 1:4
- Backs: about 1:6

Use these as guides, not fixed rules. Training should expose players to different work-to-rest demands.

## Functional screening

Screening is for coaching and performance monitoring, not diagnosis.

### Screening sequence

1. Overhead squat
2. Hands-behind-head squat if overhead squat shows compensation
3. Latissimus dorsi tightness test if arms fall forward
4. Heels-raised overhead squat if lower-body restriction is suspected
5. Ankle range of motion test
6. Thomas test
7. Glute bridge with leg extension
8. Shoulder mobility test
9. Shoulder clearance test

### AI / MoveNet use

TensorFlow and MoveNet can support Rugby HQ by tracking:
- Joint angles
- Squat depth
- Torso angle
- Knee collapse
- Hip shift
- Heel lift
- Arm fall-forward
- Elbow bend
- Pelvic drop
- Shoulder reach
- Landing mechanics
- Sprint posture
- Deceleration posture
- Left-right asymmetry

Use this label:

**AI-assisted rugby movement screening for coaching and performance monitoring.**

Do not let the bot diagnose injuries. Pain = refer to a qualified professional.

## General conditioning

### Hypertrophy / size

Goal: build useful lean mass and a base for collision performance.

Guidelines:
- 3-6 sets
- 6-12 reps
- 1-3 minutes rest
- 50-85% max load
- Multi-joint exercises preferred
- Usually best in pre-season or foundation blocks

### Maximum strength

Goal: improve ability to produce high force.

Guidelines:
- 80-100% maximum lift
- 1-5 reps
- 2-5 sets
- 2-3 minutes rest
- Big compound lifts: squat, deadlift, bench press, pull-up variations

### Power

Goal: express force quickly.

Guidelines:
- Use heavy, moderate, and light loads
- Move explosively
- Intention should be fast even with heavy loads
- Rest 2-5 minutes
- Stop sets before speed quality drops too much

Slow tempo training supports control, hypertrophy, tendon tolerance, and positional strength. It is not true power if the concentric phase is intentionally slow. Slow down + pause + explode up can bridge strength to power.

### Push-up classification

- High-rep push-ups: strength endurance
- 6-12 hard reps: hypertrophy/general strength
- Weighted push-ups for 1-5 reps: max-strength emphasis
- One-arm push-ups: advanced relative strength, unilateral pushing, anti-rotation trunk stability
- One-arm push-ups are not a perfect bench press replacement because they are less externally measurable and require more trunk/shoulder control.

## Speed and agility

### Resisted sprinting

Methods:
- Sled/harness
- Slight uphill sprint
- Sand sprint
- Partner hold
- Weighted vest
- Stairs
- Parachute

Rule: load the sprint but do not destroy sprint mechanics.

### Sand training

Sand is **surface-resisted sprint training**.

Use it for:
- Acceleration
- Stability
- Foot and ankle strength
- Deceleration
- Change of direction
- Conditioning
- Lower-impact high-effort work

Thread ranking for acceleration transfer:
1. Sled/harness sprint
2. Slight uphill sprint
3. Sand sprint
4. Partner-resisted sprint
5. Weighted vest sprint
6. Stairs
7. Parachute sprint

Sand sprints = resisted acceleration.  
Sand cone drills = acceleration, deceleration, change of direction, stability.  
Sand ladder drills = footwork, rhythm, coordination, ankle stability, warm-up/accessory.

### Assisted sprinting

Methods:
- Downhill sprinting under 4% grade
- High-speed towing with less than 10% speed increase

Purpose:
- Overspeed
- Turnover
- Max-velocity exposure

Use only after the athlete has a foundation of strength, unassisted sprint mechanics, acceleration, and max-speed training.

### Reactive agility

Planned cones = change of direction.  
Reactive cues = agility.  
Live opponent = rugby-specific agility.  
Fatigued reactive drills = game-realistic agility conditioning.

## Integrated conditioning

Integrated conditioning connects fitness to rugby.

Main methods:
- Game-related high-intensity interval training
- Small-sided games
- Rugby-specific circuits

### GRHITT

Make HIIT rugby-specific by combining high-intensity running with:
- Opposed acceleration
- Controlled tackle
- Ground get-up
- Holding a player down
- Heaving a player away
- Wrestling
- Grappling
- Contact and reload

### Small-sided games

Manipulate:
- Players
- Pitch size
- Rules
- Work duration
- Rest duration
- Contact level
- Scoring constraints
- Ball constraints

More space = more running and high-speed exposure.  
Less space = more contact, acceleration/deceleration, pressure.  
Fewer players = more touches and involvement.  
More players = more tactical realism.

### Rugby-specific circuits

Use stations like:
- Maul ball
- Forward drive
- Get up
- Tackle shuttle
- Sprint
- Grappling
- Ball carry
- Pad drive
- Defensive reload

## Custom Rugby HQ drills

### Ground Fight Sprint Rotation

12 players / 6 pairs.

Start on the ground. On whistle, players fight for safe top/control position. Winner stays. Loser sprints 10 yards, drops to ground, and rotates. Continue until each player completes 6 bouts.

Classification:
- Game-related HIIT
- Contact conditioning
- Wrestling/grappling
- Repeated high-intensity effort
- Get-up and acceleration

Safety:
No throws, slams, joint locks, neck cranks, or twisting knees.

### Beast Mode 3v2 Transition Game

10 players / two groups of 5.

All 5 start on ground. Pop up, sprint 5 yards, drop, change direction, return, repeat twice. First 3 finishers attack; last 2 defend. Immediately play 3v2.

Classification:
- Small-sided game
- Fatigue-based decision-making
- Integrated conditioning
- Acceleration/deceleration
- Rugby intelligence under fatigue

Use competition mode for intensity. Use rotation mode to teach all players attack and defense.

## Managing the training plan

### Periodisation

Plan training, practice, competition, rest, and recovery into blocks.

### Pre-season

Goal: build base and work capacity.

- Higher volume
- Lower to moderate intensity
- General fitness
- Hypertrophy
- Movement quality
- Aerobic base
- Basic speed mechanics

### Transition / specific preparation

Goal: move from general to rugby-specific.

- Volume decreases
- Intensity increases
- More GRHITT
- More rugby circuits
- More small-sided games
- More skill and tactical focus

### In-season

Goal: perform in matches and maintain fitness.

- Lower physical training volume
- High quality/intensity
- More technical/tactical work
- Recovery emphasis

### Unloading

Planned deload.

Common pattern:
- 3 loading weeks + 1 unload week

Reduce volume significantly but keep some quality.

### Tapering

Unloading with a performance target.

- Reduce fatigue
- Maintain speed and sharpness
- Reduce contact fatigue
- Target important games or tournament weekends

## Monitoring

### Session RPE

Formula:

`session_load = session_rpe * duration_minutes`

Example:
- Weights: 14 × 45 = 630
- Pitch: 12 × 90 = 1080
- Daily total = 1710

### Wellness

Track 1-5:
- Fatigue
- Sleep quality
- Muscle soreness
- Stress
- Mood

Total range: 5-25. Higher is better.

Do not overreact to one bad score. Watch trends, sudden drops, repeated low scores, and load spikes.

## Bot rules

When building a session:
1. Identify season phase.
2. Identify player number, level, and position if known.
3. Identify goal.
4. Put speed/power/strength early.
5. Put conditioning later.
6. Include monitoring.
7. Include safety.

When screening:
1. Say it is non-medical.
2. Use the screening sequence.
3. Record observations.
4. Suggest coaching focus/corrective work.
5. Refer out for pain.

When classifying a drill:
Use training category, energy system, rugby specificity, contact level, position fit, season fit, and monitoring method.
