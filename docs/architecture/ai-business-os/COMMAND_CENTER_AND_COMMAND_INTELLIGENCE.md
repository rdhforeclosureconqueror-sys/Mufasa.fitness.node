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

`createCommandCenterService` is an anti-corruption/read-model layer. It accepts canonical readers; it owns no operational database. The initial production wiring reads controlled-live state and launch readiness. Organization and Academy adapters are explicit seams and report empty/`UNKNOWN` until authoritative runtime readers are wired. This prevents fixture or certification data from being misrepresented as live company state.

Organism indicators include Brain, Constitution, Memory, Organization, Academy, Airlock, Autonomy, and Live Organism. Constitution is reported as enforcing because the server route remains behind the installed authorization boundary; all other claims require source evidence or show `UNKNOWN`. Live Organism is dormant unless the controlled-live service returns valid authorization.

Mission cards map canonical lifecycle states to `BACKLOG`, `READY`, `ACTIVE`, `BLOCKED`, and `COMPLETE`. QA/human review lanes exist but never receive inferred cards. Activity is generated only from canonical controlled-live audit events.

Economic truth separates quoted, requested, pending, settled, refunded, fees, fulfillment cost, and net observed contribution. Null is presented as `UNKNOWN`; settled defaults to observed zero, never the $50 ceiling.

## Command tools and conversation

The versioned `command-intelligence/1.0.0` interface registers bounded read tools for command summary, human actions, organism, missions/work, FIRST FAILURE, diagnostics, readiness, Brain/Academy, authority, kill switches, controlled live, evidence/audit, economics, learning/reflection, roles, activity, and evidence search. Tool selection is question- and screen-context-driven; the entire database is never inserted into a prompt.

Answers return grounding tool names, uncertainty, safe provider/model telemetry, latency, usage/cost when available, fallback state, and request reference. Hidden chain-of-thought is neither requested nor returned. External text is treated as data and rendered through `textContent` or HTML escaping. Secret-shaped content is redacted server-side.

Explain modes change requested depth only: Executive, Plain Language, Technical, and Deep Dive. They do not change retrieved facts. The current view and selected mission/subsystem reference accompany each request.

## Authorization and security

Read routes require authenticated observability permission. Existing controlled-live authorization and kill-switch routes retain enforcement permission. Command Intelligence has no write tool. A “do it” request returns a structured, non-authoritative action card and leaves authorization unchanged. Customer data is not available without a scoped canonical reader. No key or credential enters browser code, diagnostics, or raw records.

## Live updates and failure model

Bounded 15-second polling is used because it is sufficient and adds no realtime infrastructure. The UI displays the last observed timestamp. Poll failure visibly degrades the sync state.

Cockpit diagnostics use the ordered chain: Authentication → Command State Load → Organism Status → Mission Load → Activity Load → Diagnostic Load → Command Intelligence Context → Model Gateway → Tool Invocation → Response Grounding → Live Update → Render → Human Action Presentation. Stages not actually exercised are `NOT_RUN`, never fabricated as pass. FIRST FAILURE is explicitly a diagnostic starting point, not claimed root cause.

## Mobile and accessibility

Mobile promotes human action, compact organism status, Command Intelligence, and horizontally snapping Kanban lanes. The assistant becomes a full-height sheet, controls meet touch-size intent, content remains semantic and keyboard reachable, focus is gold and visible, and safe-area insets are respected. `prefers-reduced-motion` disables scene and orbit animation; the second background is removed to reduce mobile work.

## Acceptance and Test A

Machine verification can establish route protection, truth mapping, grounding, escaping, and responsive implementation. It cannot approve cinematic quality, emotional impact, physical iPhone usability, or visual clarity. Visual and mobile acceptance remain pending authenticated human review.

This work does **not** authorize or execute Test A. `CONTROLLED_LIVE_TEST_AUTHORIZED` remains whatever the canonical controlled-live store says. `CONTROLLED_LIVE_ORGANISM_VALIDATED` remains `NOT_RUN` unless the separate governed test genuinely completes.
