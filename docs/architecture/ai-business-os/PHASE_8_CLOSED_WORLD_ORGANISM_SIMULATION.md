# Phase 8 — Closed-World Organism Simulation

**Contract:** `ai-business-os.closed-world-simulation/1.0.0`  
**Machine gate:** `CLOSED_WORLD_ORGANISM_VALIDATED`  
**Boundary:** synthetic, deterministic, offline; Phase 9 and economic validation are excluded.

## Four authorities

The **Brain** chooses among observations and proposes actions. The Phase 6 **Organization** turns proposals into governed Work, role assignments, runtime-produced artifacts, handoffs, and independent review. The **World** alone changes customer, offer, order, obligation, capacity, delivery, and synthetic-economic truth. The Phase 7 **Academy/Observer** reads a completed run and evaluates invariants; it neither supplies role answers nor mutates the World. This preserves the constitutional kernel as the permission authority and reuses organizational Work and provenance rather than inventing parallel truth.

## Deterministic World

`src/business-os/simulation/` contains versioned contracts, an explicit queue-based clock, seeded LCG randomness, the World engine, ledger, runner, scenario fixtures, diagnostics, an Academy adapter, and readiness gate. Simulated time advances only when the runner asks the clock to advance. Equal-time events use insertion sequence. Each run records the seed, scenario/world/probability-model versions, and ordering rule. No `Math.random`, network, payment, message, publishing, advertising, vendor, or other irreversible adapter exists.

Checkpoints contain World state, clock and scheduled-event queue, random state, ledger, event cursor, and cycle number. These values explain full replay from the scenario seed; this implementation does not claim distributed durability or crash-safe mid-action resume.

## State and information asymmetry

Scenario fixtures declare customers, opportunities, capabilities, capacity, starting cash, and scheduled events. Customer hidden fields (including budget and acceptance behavior) and opportunity hidden truth remain inside the World. Public state exposes declared statements and evidence; inspection can disclose only `discoverable` fields. The World evaluates offers against declared customer rules. A model assertion cannot create acceptance, payment, delivery, cash, or capacity.

Opportunities exist before Brain reasoning and include source, segment, problem, observable evidence, potential value, urgency, risk, expiration, required capability, and uncertainty. The Brain receives choices, not a fixture-authored “correct” choice. Deterministic scenarios constrain consequences but do not embed managerial selection answers.

## Actions and consequences

Only `SimulationAction` crosses the boundary: `OBSERVE_MARKET`, `INSPECT_OPPORTUNITY`, `RUN_SYNTHETIC_EXPERIMENT`, `MAKE_SYNTHETIC_OFFER`, `ACCEPT_SYNTHETIC_ORDER`, `ALLOCATE_CAPACITY`, `PRODUCE_SYNTHETIC_OUTPUT`, `REQUEST_QA`, `DELIVER_SYNTHETIC_OUTPUT`, `ISSUE_SYNTHETIC_REFUND`, and `CANCEL_WORK`. Every action requires an allowed authority decision plus actor and Work references. Roles never receive a mutable World object.

Offers progress independently from orders. An accepted offer creates an idempotent persistent obligation with customer, acceptance criteria, deadline, price, refund terms, production requirements, and QA requirements. Finite capacity is reserved against that obligation and released only after valid delivery. Production creates a synthetic output and incurs declared cost. A different actor must request QA; `QA_REJECTED` cannot be delivered. Delivery after `QA_PASSED` settles synthetic revenue and updates the obligation to `CUSTOMER_ACCEPTED`.

## Synthetic economic truth

The ledger distinguishes `PROJECTED`, `QUOTED`, `COMMITTED`, `INCURRED`, `PENDING`, `SETTLED`, and `REFUNDED`. A quote and pending payment do not affect cash. Unknown cost throws `ECONOMIC_UNCERTAINTY`; it is never recorded as zero. Idempotency keys prevent duplicate settlement, refunds, production costs, and obligations on replay.

The reconciliation is:

`starting cash + settled synthetic revenue - incurred/settled synthetic costs - refunds = ending simulated cash`.

Committed or pending values remain visible but separate. These records are simulation facts, not real payments and not proof of profitability.

## Vertical organizational cycle

`createSimulationRunner` accepts two ports. The Brain port receives public state and retained cycle history, then proposes actions. The Organization port must process each proposal through governed Work and return a Work reference, actor, policy/grant decision, and evidence. The focused integration uses the real Phase 6 coordinator and role registry; the World executes only after organizational completion. Later cycles retain obligations, capacity, customer state, ledger entries, transition history, and prior decisions. Learning receives observed history as input and remains proposal-only.

The golden integration covers observation, analysis, authorized synthetic offer, World acceptance, obligation creation, capacity allocation, production, independent QA, delivery, settlement, learning visibility, and subsequent-cycle management. Negative scenarios prove that a rejected offer is a market result, a tool outage is technical, unknown cost is economic uncertainty, and prohibited profit remains prohibited.

## Scenario library

The deterministic library contains golden cycle, market rejection, technical failure, QA rejection, capacity conflict, unknown economics, cancellation/refund, profitable-but-prohibited, contradictory signals, recovery/replan, and a multi-pressure adversarial fixture. The adversarial fixture combines limited capacity, competing opportunities, unknown cost, defective output, and a scheduled capacity event. It presents pressure; it does not script a role answer.

## Observability and failure

Each meaningful transition records previous/new state, triggering action, actor and Work, simulated time, correlation/causation, economic effect, and evidence. Metrics remain separate dimensions: fulfillment, misses, QA rejection, settled revenue, incurred expense, refunds, capacity utilization, and market/technical failures. There is no magic organism score.

Simulation failure classes are Brain, policy/authority, technical, production, QA, delivery, measurement, market result, customer cancellation, economic uncertainty, and harness failure. Diagnostics evaluate `WORLD_SETUP` through `REPORTING` in dependency order and preserve three separate pointers: simulation FIRST FAILURE, Academy FIRST FAILURE, and Brain/Organization FIRST FAILURE. An invalid fixture is a harness failure; it is not blamed on the Brain.

## Academy and gate

The organism adapter evaluates a completed `SimulationReport` and explicitly leaves Phase 7 Brain certification unchanged. Phase 8 readiness requires all deterministic architecture, continuity, reconciliation, replay, failure, Academy, regression, and canonical-readiness checks. Machine success sets `CLOSED_WORLD_ORGANISM_VALIDATED`; human acceptance stays `PENDING_HUMAN`, so the overall result is `CONDITIONAL_GO` until authorized Admin evidence exists.

The gate never marks `ECONOMIC_VALIDATION` or `REAL_WORLD_ORGANISM_VALIDATION`. It always reports `phase9Authorized: false`. Synthetic profit is not commercial proof, a synthetic loss can still be an architecturally correct run, and Phase 9 requires a separate explicit handoff.

## Known limitations and human requirements

The product model is intentionally one simple digital-artifact capability. Customer rules are declared deterministic fixtures rather than a statistically calibrated market. Checkpoint data supports explainable replay inputs but not durable distributed resume. The Brain/Organization ports permit richer runtime policies, memory, experiments, and replanning without placing business intelligence in the World.

Humans must review architectural fitness, scenario realism, organizational behavior quality, and any future user/market interpretation. Machine tooling must not self-approve those criteria. No browser, production, physical-device, real-customer, or financial QA applies to this closed-world module.
