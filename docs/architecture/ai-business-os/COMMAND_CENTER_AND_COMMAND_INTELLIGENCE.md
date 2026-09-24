# AI Business OS Command Center and Command Intelligence

## Purpose

The Command Center is the authenticated owner cockpit over the same constitutional Brain delivered in Phases 1–9B-A. Its five-section information architecture is **Command, Missions, Intelligence, Operations, System**. The first viewport answers: what needs the human, where the organization is, what happened, what happens next, and why.

## Heritage and design mapping

| Mature heritage | Reuse |
| --- | --- |
| Stepping Into Greatness cinematic photography | Existing `/new/stepintograteness2.jpg` and `/new/stepintograteness3.jpg`, restrained by dark overlays, reduced saturation, and mobile/reduced-motion rules |
| Stepping Into Greatness gold/green/red visual language | Pan-African command palette, gold focus, green observed health, red first failure |
| Existing admin authentication and permissions | `requireAuth` plus `OPS_READ_OBSERVABILITY`; controlled-live mutations retain stronger `OPS_MANAGE_ENFORCEMENT` |
| Phase 2 Model Gateway | Only permitted provider boundary for configured Command Intelligence; no browser provider call |
| Phase 3 Context/Memory | Durable knowledge stays governed; the command screen passes only a selected reference and view type |
| Phase 5/6 runtime and organization contracts | Mission and Kanban mappings use `OrganizationalObjective`, `OrganizationalWorkItem`, role, dependency, artifact, and event semantics; absent runtime data produces empty state |
| Readiness and FIRST FAILURE | Existing readiness service and controlled-live first failure are read directly, with raw records at the deepest inspector level |
| Phase 7/8/9 | Academy status is `UNKNOWN` without a supplied current report; Airlock and controlled-live status map from their canonical evidence |
| Existing Fitness Mufasa/OpenAI integration | Credentials and calls remain server-side. The fitness personality is not reused as Command Intelligence. |

## State architecture

`createCommandCenterService` is an anti-corruption/read-model layer. It accepts canonical readers; it owns no operational database. Production wiring reads controlled-live state, launch readiness, the Phase 7 readiness card, and the explicit Phase 6 organization seam. With no durable Phase 6 activity source configured, that seam reports `NO_ACTIVITY_OBSERVED`; with no Academy run/card it reports `NOT_RUN`. This prevents fixture or certification data from being misrepresented as live company state.

Organism indicators include Brain, Constitution, Memory, Organization, Academy, Airlock, Autonomy, and Live Organism. Constitution is reported as enforcing because the server route remains behind the installed authorization boundary; all other claims require source evidence or show `UNKNOWN`. Live Organism is dormant unless the controlled-live service returns valid authorization.

Mission cards map canonical lifecycle states to `BACKLOG`, `READY`, `ACTIVE`, `BLOCKED`, and `COMPLETE`. QA/human review lanes exist but never receive inferred cards. Activity is generated only from canonical controlled-live audit events.

Economic truth separates quoted, requested, pending, settled, refunded, fees, fulfillment cost, and net observed contribution. Null is presented as `UNKNOWN`; settled defaults to observed zero, never the $50 ceiling.

## Owner-facing personality and worker separation

Command Intelligence is the **top-level owner-facing mentor, executive assistant, advisory board, and wise-counsel interface**. It is intentionally distinct from the lower organizational worker/agent runtime. The worker layer performs governed Work and produces attributable reports/artifacts; Command Intelligence reads governed evidence, interprets what happened, surfaces disagreements and unknowns, mentors the owner, and recommends what deserves attention next. Advice does not itself authorize execution.

Its versioned personality is `maat-council-personality/1.0.0`. The specialist lenses are Clarke (history), Ben-Jochannan (origins/inherited belief), Malcolm X (strategic diagnosis), Garvey (institution building), Payton (economics/ownership), Ali (embodiment/performance), and Thoth (systems architecture). Ma'at is not treated as an eighth competing voice: it is the governing standard for truth, justice, proportion, reciprocity, right order, human dignity, sustainability, and continuity. The router uses the minimum relevant specialties and preserves material disagreement instead of averaging it away.

This is a modern AI reasoning architecture, not a claim that the historical people or ancient Egyptian concepts constituted an AI system. Historical inspiration remains subordinate to current evidence, constitutional controls, safety, law, and canonical state. The assistant does not theatrically impersonate the figures.

## Command tools and conversation

The versioned `command-intelligence/3.0.0` interface registers bounded read tools for command summary, human actions, organism, missions/work, FIRST FAILURE, diagnostics, readiness, Brain/Academy, authority, kill switches, controlled live, evidence/audit, economics, learning/reflection, roles, activity, and evidence search. The canonical Cognitive Core interprets the complete information need and selects names from this allow-list; there is no production keyword router and the entire database is never inserted into a prompt.

Answers retain intent, context references, tool calls, evidence references, relevant facts/inferences/unknowns/recommendations/authority requirements, safe provider/model telemetry, latency, usage/cost when available, metacognitive result, fallback state, and request/timestamp references. Hidden chain-of-thought is neither requested nor returned or stored. External text and retrieved evidence are explicitly untrusted data and rendered through `textContent` or HTML escaping. Secret-shaped content is redacted server-side.

Explain modes change requested depth only: Executive, Plain Language, Technical, and Deep Dive. They do not change retrieved facts. The current view and selected mission/subsystem reference accompany each request.

## Authorization and security

Read routes require authenticated observability permission. Existing controlled-live authorization and kill-switch routes retain enforcement permission. Command Intelligence has no write tool. Action language is understood semantically but remains a non-authoritative recommendation or authority requirement and leaves authorization unchanged. Customer data is not available without a scoped canonical reader. No key or credential enters browser code, diagnostics, or raw records.

## Live updates and failure model

Bounded 15-second polling is used because it is sufficient and adds no realtime infrastructure. The UI displays the last observed timestamp. Poll failure visibly degrades the sync state.

Cockpit diagnostics use the ordered chain: Authentication → Command State Load → Organism Status → Mission Load → Activity Load → Diagnostic Load → Command Intelligence Context → Model Gateway → Tool Invocation → Response Grounding → Live Update → Render → Human Action Presentation. Stages not actually exercised are `NOT_RUN`, never fabricated as pass. FIRST FAILURE distinguishes browser connectivity, gateway, context, intent, tool selection/authority, evidence/Organization/Academy/memory retrieval, reasoning, grounding, and action-authorization boundaries. FIRST FAILURE is explicitly a diagnostic starting point, not claimed root cause.

## Architecture audit and integration map

| Responsibility | Canonical component reused | Implemented seam |
| --- | --- | --- |
| constitutional/model controls | Phase 1 authority doctrine and Phase 2 `createModelGateway` | `COMMAND_READ_ONLY` admission, model kill switch, invocation audit, provider/model policy |
| reasoning/metacognition | Phase 2 `createCognitiveCore` and `CognitiveResult` | semantic intent and grounded-response cognitive operations; outputs remain non-authoritative |
| context/continuity | Phase 3 `createMemorySystem` and `createContextEngine` | organization/user-scoped, permission-tagged, 24-hour bounded working memory containing safe decision summaries |
| information-needs planning/tools | Phase 4 governed capability pattern | Brain-selected allow-listed readers; invalid selections fail closed |
| action execution | Phase 4/5 runtime and Phase 6 organization | no second executor and no Command write tools; future Work must use the existing runtime |
| organization | Phase 6 coordinator read contract | objectives, Work, roles, artifacts, and events adapter; true absence is `NO_ACTIVITY_OBSERVED` |
| Academy | Phase 7 Academy/readiness | latest canonical evidence; no run is `NOT_RUN`; machine state cannot become human acceptance |
| controlled live | Phase 9 controlled-live service | direct read-only Test A, authority, kill-switch, evidence, economics, learning, and audit readers |
| readiness/diagnostics | canonical readiness and FIRST FAILURE | direct snapshots and ordered pipeline diagnostics |

The audit found missing production construction of the Model Gateway/Cognitive Core, semantic information-needs planning, Phase 3 continuity, response provenance, and explicit Organization/Academy production adapters. Those seams are connected without adding a Brain, state store, execution engine, or authorization store.

Production constructs the canonical gateway only when `COMMAND_INTELLIGENCE_MODEL` and server-only `OPENAI_API_KEY` are configured. Model configuration, provider, context, or reasoning failure is visibly `DETERMINISTIC_FALLBACK`: deterministic canonical status may still be shown, but it is never represented as Brain reasoning.

## CTQs

Regression controls measure semantic intent coverage, evidence grounding, continuity, fallback truthfulness, FIRST FAILURE correctness, and owner-question resolution. Unauthorized authority creation, cross-organization leakage, fabricated evidence, fabricated human approval, and silent fallback masquerading have a zero-tolerance limit. Tool success is not business success; controlled Test A evidence is not independent market or economic validation.

## Mobile and accessibility

Mobile promotes human action, compact organism status, Command Intelligence, and horizontally snapping Kanban lanes. The assistant becomes a full-height sheet, controls meet touch-size intent, content remains semantic and keyboard reachable, focus is gold and visible, and safe-area insets are respected. `prefers-reduced-motion` disables scene and orbit animation; the second background is removed to reduce mobile work.

## Acceptance and Test A

Machine verification can establish route protection, truth mapping, grounding, escaping, and responsive implementation. It cannot approve cinematic quality, emotional impact, physical iPhone usability, or visual clarity. Visual and mobile acceptance remain pending authenticated human review.

This work does **not** authorize or execute Test A. `CONTROLLED_LIVE_TEST_AUTHORIZED` remains whatever the canonical controlled-live store says. `CONTROLLED_LIVE_ORGANISM_VALIDATED` remains `NOT_RUN` unless the separate governed test genuinely completes.
