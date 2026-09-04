# Mirror Motion Intelligence Phase 12 — Live Occlusion Activation

Base: hardened Phase 11 head `ebbcd58e334255bc86195e9d338885eb406c669f`.

## Scope

Activate the hardened Phase 11 side/quarter-view occlusion authority in the live avatar runtime chain, with explicit first-failure diagnostics.

## Pipeline

MoveNet raw -> Phase 2 stabilization -> Phase 3 structure -> Phase 4 exercise/contact constraints -> Phase 5 IK -> Phase 6 adaptive live curves -> Phase 7 facing intent -> Phase 8 bounded yaw -> Phase 9 foreshortening -> Phase 10 activation monitor -> Phase 11 occlusion authority -> Phase 12 activation monitor -> existing Avaturn solver/render.

## Requirements

- load Phase 11 after Phase 10 in the avatar startup chain;
- load Phase 12 after Phase 11;
- preserve Phase 11 as the sole occlusion authority;
- expose Phase 11 load/patch/bind/runtime failure state;
- expose suppression count, active overlap pairs, authority switches, ambiguity releases, protected upstream bypasses, and context resets;
- keep `measuredDepth: false` explicit;
- do not create another solver, camera, detector, exercise authority, or depth reconstruction path.

## Review focus

Attack side-on push-ups, overlapping squat knees, arm crossings, jumping jacks, fast turns, confidence ties, temporary left/right confidence reversal, tracker reacquisition, and upstream IK/contact protected joints.

Return GO or CHANGES REQUIRED with exact evidence. Do not merge without owner approval.
