# Pocket PT Rugby Coaching OS — V2 Upgrade Notes

This revision keeps the original prototype architecture and adds the missing coaching-engine layers identified during the Rugby Ready, Concussion Management, Safeguarding Essentials, and Level 1 coaching study.

## Added

- Movement Intelligence page
  - overhead squat, single-leg balance, lunge, tackle stance, push-up/shoulder control
  - pose-model UI concept with joint-angle evidence
  - corrective pathway and clinical-boundary language
- Testing & Conditioning page
  - longitudinal testing metrics
  - position needs analysis
  - season periodization
  - 48-hour post-match planning concept
- Technical Skills Engine
  - passing, catching, ground pickup, tackle, ruck, maul, lineout and scrum competencies
  - Tackle Ready stage progression instead of one aggregate number
  - hard safety failure concept for unsafe tackle mechanics
- Rugby IQ & Tactical Intelligence page
  - scanning, decision quality, communication, support and pressure execution
  - attack/defense/transition curriculum
  - scenario-lab tactical board
- Video Review & Evidence page
  - tagged video evidence tied to competencies
  - coach annotation and pressure-level metadata
- Safeguarding privacy improvement
  - ordinary command-center language no longer reveals that a safeguarding case/review exists
- Selection clarity
  - renamed “Starter Ready” composite presentation to “Selection Evidence” so medical, concussion, front-row, and safeguarding restrictions remain hard gates rather than being averaged into a selection score

## Preserved

- Rugby Readiness domains
- Scrum Ready 10-stage progression
- Concussion recognize/remove/recover/return pathway
- Safeguarding restricted-data architecture
- Coach credential tracking
- Team roster, training planner, match selection and academy concept

## Important implementation boundary

The new pose-analysis screens are UI/architecture prototypes. TensorFlow/pose estimation, databases, authentication, medical/safeguarding encryption, audit infrastructure, notifications and production-grade persistence are not implemented in this artifact.
