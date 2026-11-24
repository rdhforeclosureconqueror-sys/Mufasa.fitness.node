# Backs Rugby Ready

## Purpose

Backs Rugby Ready is the backs equivalent of forwards rugby readiness.

It judges whether players from 10 through 15 are ready to play and compete based on skill, rugby IQ, safety, and role understanding.

This module is not primarily a fitness test. Fitness belongs in the separate Backline Athletic Index.

## Universal Backline Skill/IQ Rating

Use a 1–99 rating.

| Category | Weight | What it judges |
|---|---:|---|
| Defensive IQ | 20% | Alignment, spacing, numbering up, edge decisions, communication |
| Tackling in Space | 15% | Tracking, safe contact, body position, finishing tackle, recovery |
| Attack IQ | 20% | Scanning, depth, timing, decision-making, exploiting space |
| Ball Skills | 15% | Catch-pass, passing both ways, receiving under pressure, offload choices |
| Movement & Evasion | 15% | Footwork, acceleration, change of angle, beating defenders |
| Role-Specific Skill | 15% | Responsibilities specific to 10, 12, 13, wing, or 15 |

## Readiness bands

| Score | Meaning |
|---:|---|
| 90–99 | Impact starter / elite within the program |
| 80–89 | Clear starter-ready |
| 70–79 | Match-ready / rotation player |
| 60–69 | Developmental / situational use |
| Below 60 | Not yet rugby-ready for that backline role |

## Defensive IQ

Backs must understand defense in space.

| Competency | What the player must know | Observable evidence |
|---|---|---|
| Alignment | Where to stand based on ball position, numbers, and threat | Stays connected; does not create doglegs |
| Numbering up | Who is mine? Who is inside/outside me? | Identifies correct attacker in phase play |
| Spacing | How much space to leave between defenders | Closes passing lanes without over-compressing |
| Inside shoulder | Protect inside first | Does not get beaten inside repeatedly |
| Drift vs press | When to slide and when to shoot | Chooses correctly based on overlap/underlap |
| Edge defense | Wing/13/15 decisions near touchline | Forces attacker toward sideline; does not bite early |
| Backfield coverage | Covers kicks, chips, grubbers, and deep space | Wings and 15 rotate correctly |
| Communication | Calls numbers, threats, mismatches, and reloads | Organizes others instead of playing silently |
| Reload/fold | Returns to defensive shape after tackle/ruck | Gets up and reconnects quickly |

### Defensive IQ scoring guide

| Score | Meaning |
|---:|---|
| 90–99 | Organizes others and consistently solves defensive pictures |
| 80–89 | Reliable defensive reader; rarely causes structural errors |
| 70–79 | Match-ready; needs reminders but handles most situations |
| 60–69 | Understands basics but creates risk under pressure |
| Below 60 | Not yet reliable in defensive structure |

## Tackling in Space

Backs must tackle safely and effectively in open field.

| Competency | Observable evidence |
|---|---|
| Tracking | Takes correct angle; does not overrun attacker |
| Footwork | Shortens steps before contact; avoids lunging |
| Head placement | Safe head position; does not place head across dangerous side |
| Shoulder connection | Uses shoulder, not arm-only tackling |
| Wrap | Uses arms legally and effectively |
| Finish | Brings player down safely and completes tackle |
| Recovery | Gets back to feet and reloads into defensive line |

### Hard gate

If Tackling in Space is below 70, the player is not starter eligible as a back, even if their speed or attacking ability is high.

## Offense Without the Ball

Backs must understand that offense does not start only when they receive the ball.

| Competency | What it means | Observable evidence |
|---|---|---|
| Depth | Gives self time and space | Not too flat or rushed |
| Width | Stretches the defense | Does not crowd teammates |
| Timing | Arrives onto the ball at pace | Not early, late, or standing still |
| Running lines | Straightens, runs unders/overs/arcs/switches | Manipulates defenders |
| Decoy work | Sells a real threat without touching ball | Defender reacts to them |
| Support lines | Tracks inside/outside shoulder of ball carrier | Available after line breaks |
| Reload | Gets back into attacking shape after pass/contact | Does not disappear after one action |
| Communication | Calls ball, space, mismatch, short/long option | Helps the playmaker make decisions |

## Offense With the Ball

| Competency | Observable evidence |
|---|---|
| Catch quality | Hands up, catches early, moves onto ball |
| Passing both ways | Accurate left and right; short and long |
| Commit defender | Squares hips and fixes defender before passing |
| Decision-making | Chooses pass, carry, kick, offload, or reset correctly |
| Evasion | Uses step, swerve, acceleration, or angle change |
| Contact choice | Avoids contact when space exists; takes contact correctly when needed |
| Ball presentation | Presents clean ball quickly if tackled |
| Continuity | Keeps attack alive without forcing low-percentage plays |

## Role-specific overlays

### 10 — Fly-half

| Attribute | Starter-ready standard |
|---|---|
| Game management | Controls tempo, territory, exits, and attacking shape |
| Passing range | Can hit flat, deep, short, wide, and miss-pass options |
| Kicking | Tactical kicking, touch-finders, grubbers, chips, restarts if assigned |
| Defensive bravery | Can defend channel even against larger runners |
| Communication | Organizes 9, 12, 13, and outside backs |

### 12 — Inside Center

| Attribute | Starter-ready standard |
|---|---|
| Hard-line threat | Can carry direct and hold defenders |
| Second playmaker | Can pass, kick, or distribute under pressure |
| Defensive control | Connects 10 and 13 defensively |
| Contact skill | Wins collisions or presents clean ball |
| Decision under pressure | Does not crash every phase by default |

### 13 — Outside Center

| Attribute | Starter-ready standard |
|---|---|
| Defensive reads | Knows when to press, drift, or hold |
| Edge connection | Connects inside backs to wing |
| Outside break | Can attack outside shoulder |
| Passing to wing | Gives winger usable ball, not hospital passes |
| Transition speed | Turns defense into counterattack quickly |

### 11/14 — Wings

| Attribute | Starter-ready standard |
|---|---|
| Finishing | Scores from limited space |
| Touchline awareness | Uses sideline as friend on attack and defense |
| High ball | Can catch, compete, or pressure kicks |
| Kick chase | Stays in lane, times pressure, tackles catcher |
| Last-pass support | Tracks breaks and stays available |

### 15 — Fullback

| Attribute | Starter-ready standard |
|---|---|
| Backfield organization | Positions wings and covers space |
| High-ball security | Reliable under pressure |
| Counterattack | Knows when to run, pass, kick, or reset |
| Last-line tackling | Makes emergency tackles safely |
| Communication | Talks constantly to the defensive line |

## Coach observation record

Every evaluation should produce a record like this:

```json
{
  "playerId": "player_123",
  "playerName": "Marcus",
  "positionEvaluated": "13",
  "category": "Defensive IQ",
  "competency": "Edge decision-making",
  "score": 64,
  "evidenceType": "scrimmage",
  "coachNote": "Shoots too early when wing has outside threat. Needs to hold connection longer.",
  "nextAction": "13/wing drift drill, 3 reps each side, reassess next week.",
  "clipUrl": null,
  "timestamp": null,
  "evaluator": "Coach",
  "date": "2026-11-24",
  "confidence": "medium"
}
```

## Player-facing message pattern

Do not just show a low score. Always show the work-on.

Example:

```text
You are currently a 64 in Edge Defensive Decision-Making.
You are close to match-ready, but you are shooting early and disconnecting from your wing.
Your next action is the 13/wing drift drill. Coaches will reassess after the next live defensive block.
```
