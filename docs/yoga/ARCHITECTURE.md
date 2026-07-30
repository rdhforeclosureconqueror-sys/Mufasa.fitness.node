# Yoga and Movement Intelligence architecture

## Audit and legacy decisions

The connected platform uses browser TensorFlow.js MoveNet, authoritative user-file writes, post-commit gamification capture, shared completion projections, and authoritative AI Coach context. The detailed pre-implementation comparison is preserved in `YOGA_SYSTEM_AUDIT.md`. The legacy 33-point MediaPipe CSVs are **reference-only pending provenance and expert labels**; their combined exports are duplicates, directed/mislabeled angles are unsafe, Python scripts and broken SQLite API are archive-only, prose cues are reusable only after normalization, and current MoveNet/session/gamification capabilities supersede the legacy architecture. No MediaPipe adapter was added because no approved launch rule needs those 33-point datasets. Stored rows are isolated poses, not time-ordered frames, so landmark animation is **not launchable**: density, transitions, orientation and provenance are insufficient.

## Runtime

`src/movement-engine` implements the shared detector adapter → validation → normalization → measurements → deterministic rules/faults → prioritized stable cues → transparent score pipeline. Identical inputs are deterministic. Identification has visibility, unknown and ambiguity outcomes. A stability window suppresses flicker and caps output at two cues. Future strength, mobility, gymnastics and screens can supply definitions without replacing the engine.

Scoring is `round(100 × (0.15 confidence + 0.65 angle compliance + 0.10 stability + 0.10 hold compliance) − 20 critical-fault penalty)`, clamped 0–100. Angle deviation is tolerance-relative and capped; output is rounded to avoid false precision. Progression is never unlocked by one frame: a qualifying completed session reports that three consistent completions remain required.

## Privacy, security, accessibility and performance

Camera permission is explicit and optional. Browser video is mirrored only for presentation, processed locally when MoveNet is available, stopped on close, and never uploaded. The API accepts only bounded derived results; auth, entitlement, user scoping, safe JSON rendering and per-user storage are inherited. It stores no frame or raw-landmark fields. Camera-disabled members can complete every guide. UI includes semantic regions, text cues, keyboard/touch controls, focus styling, non-color score labels, permission/error states, responsive layout and reduced-motion handling.

Analysis should be bounded to the detector's existing lifecycle and paused while hidden; resources must be released on stop. Operational metrics are model initialization, analyzed/dropped frames, identification latency, memory where supported and completion latency. The initial browser surface gracefully degrades when detector support is unavailable.

## Safety and AI

Stop guidance covers pain, dizziness and instability. Pregnancy, surgery, acute injury and medical questions must be referred to an appropriate clinician before practice. Scores are fitness feedback, not diagnosis or injury-risk measures. AI receives only persisted deterministic summaries/fault IDs, may explain them, and may not recalculate or override them.
