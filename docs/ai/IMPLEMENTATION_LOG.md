# AI Coach Integration — Version 1

## Executive summary

The member AI Coach now receives a compact, authenticated snapshot of existing workout, goal, recovery, and gamification read models. It explains those facts through a replaceable response adapter; it does not award XP, determine levels, evaluate achievements, or mutate workout state.

## Context and prompt architecture

`coachContextService` loads the member record once, limits workouts to five, and separately consumes the public member gamification read model. Missing values remain `null`. Context is divided into member, workout, progression, goal, program, and explicitly recorded recovery sections. `coachPromptBuilder` keeps behavior, platform context, member context, workout context, gamification context, and bounded conversation history in distinct messages. History is explicitly non-authoritative.

## Coach integration and components

Authenticated member endpoints provide an overview, submit a message, and clear history. The new responsive coach page presents authoritative context cards, conversation history, suggested follow-ups (including workout completion and progression questions), and accessible status updates. Conversation memory is capped at 24 messages in the existing member store.

## Security

Routes derive identity only from authentication and accept no user ID or client-authored context. Membership checks and per-member rate limiting protect coach access. Prompts exclude event/replay data, internal policies, administration APIs, raw health history, and other members. The system instruction refuses prompt, policy, internal-event, and administrative disclosure. Cross-user isolation is covered by tests.

## Performance

Context generation reuses the user and gamification read models, performs no replay or recalculation, uses one member load for all context sections, caps recent workouts at five, and bounds both message size and history. The response adapter is dependency-injected so provider lifecycle, timeout, and observability can remain infrastructure concerns without coupling platform logic to a model vendor.

## Accessibility

The conversation is a semantic live log; status changes use polite live regions; suggestions and clearing are native buttons; sending uses a labeled form; focus is visible; touch targets are at least 44px; the layout collapses on mobile; and reduced-motion preferences disable animation and transitions.

## Risks and deferred work

Version 1 ships a truthful provider-unavailable response when no response adapter is configured. Provider-specific streaming, durable multi-device conversation threads, member-controlled memory retention periods, richer authoritative achievement projections, and authoritative wearable recovery inputs are deferred. Recovery guidance must remain general until recorded recovery inputs exist. LLM output still requires normal production monitoring and safety review.

## Rollback strategy

Remove the three `/api/me/ai-coach` routes and dashboard link to disable the experience. The context, prompt, and UI modules are isolated; workout, session, gamification, and replay systems require no rollback. Existing `aiCoachConversation` fields are additive and may safely remain or be removed by a later data migration.
