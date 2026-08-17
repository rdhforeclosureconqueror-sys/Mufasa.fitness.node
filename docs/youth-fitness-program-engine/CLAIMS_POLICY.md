# Youth Fitness Presentation Claims Policy

## Principle

Member-, guardian-, coach-, administrator-, and AI-facing text must preserve the distinction between consensus, research support, conservative product policy, and configuration. Citation presence does not permit causal, clinical, diagnostic, or guaranteed-result language. A `CONSERVATIVE_PROGRAM_POLICY` rule must not be presented as “science proves this exact threshold.”

## Responsible statements

With appropriate context, the software may state that:

- appropriately designed youth resistance training can support fitness;
- bodyweight exercise can develop muscular fitness;
- youth benefit from regular physical activity;
- technique and supervision matter;
- recovery and sleep matter;
- standardized testing can track change; and
- fitness can improve over time.

These are bounded general statements, not promises about an individual.

## Prohibited unsupported statements

Without specific appropriate evidence and approved review, the software shall not state that:

- this program prevents all injuries;
- this program guarantees weight loss;
- a movement screen predicts injury;
- a squat compensation diagnoses a particular muscle;
- a proprietary score is clinically validated; or
- the program solely caused an individual's result because performance improved during participation.

The small Phase 1 `inspectPresentationClaim` helper rejects recognizable forms of these seeded prohibited claims. It is defense-in-depth for controlled text, not a complete natural-language safety classifier and not authorization for generative output. Later AI and presentation integrations must use controlled templates, provenance metadata, review, and fail-closed boundaries rather than relying on the helper alone.
