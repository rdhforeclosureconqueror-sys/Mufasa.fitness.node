# Pocket PT Intake Pathway Front Door — Audit

Base main SHA: `fd09e8b0367c46c86cd3a33e41412a1f962a38b1`

## What already exists

Pocket PT already has a canonical versioned Journey intake. It owns shared identity/profile, goals, health/safety, training context, schedule and final review. It already supports three canonical pathways: `general_fitness`, `yoga_wellness`, and `athlete_performance`; Rugby is a supplement inside Athlete Performance rather than a parallel user profile.

The current weakness is discovery and client classification, not absence of an intake backend. The existing first question says “What brings you to the academy?” but exposes technical pathway labels. General Fitness contains weight-change fields, yet the entry experience does not immediately distinguish modest loss/gain/toning from a major transformation. Yoga & Wellness includes breathing but does not present meditation/pranayama as a first-class reason for arriving.

## Organization chosen

The user-facing front door uses four brackets while preserving the three canonical backend pathways:

1. Everyday fitness — lose/gain about 15–20 lb, tone/recompose, strength/general fitness → `general_fitness`.
2. Major transformation — major loss, major gain, major recomposition, lifestyle reset → `general_fitness` with transformation goal context.
3. Athlete development → `athlete_performance`; Rugby continues to use the existing Rugby supplement.
4. Yoga, meditation & breathwork → `yoga_wellness`, with the selected wellness intention pre-seeded.

This avoids creating competing authentication, profile, intake, athlete, rugby or wellness systems.

## Implementation

`/intake-start.html` is a goal-first public front door. A selection PATCHes `/api/me/retention/intake` and then sends the member into the existing Journey runtime at `/workout.html?journey=1`. If the member is not authenticated, the page routes through the existing login surface and returns to the selector.

## Important scope boundary

This PR intentionally does **not** rewrite the canonical Journey schema or recommendation engine. It adds classification before the existing intake. Before merge, an independent reviewer should verify whether the current landing page should link directly to `/intake-start.html` in this same PR or whether that navigation change belongs to the guided-launch/landing-page workstream, because `public/index.html` is an active product surface with recent concurrent changes.

## Merge gates

Do not merge on author approval alone. Required: (1) author review, (2) independent bot review of diff + API contract + current main drift, (3) owner visual/browser approval. Reviewer must specifically test authenticated and unauthenticated entry, switching pathways on an existing draft, Rugby behavior, Yoga intention preservation, and modest gain/loss direction.