# SMART_SCOUT Platinum certification

Platinum is an evidence state, not a feature flag. The certification runner executes all 24 canonical Academy scenarios and then evaluates four external gates.

## Automated architecture gate

Run:

```bash
npm run scout:certify -- --evidence config/scout-platinum-evidence.example.json
```

The command exits with code 2 while any gate is blocked. The architecture gate can pass locally because it uses the production Scout decision engine through the canonical Academy runner. It does not create market evidence.

## Google Search Console

Required configuration:

- Enable the Search Console API in the selected Google Cloud project.
- Authorize the official read-only scope `https://www.googleapis.com/auth/webmasters.readonly`.
- Give the authorized identity access to the exact Search Console property.
- Set `GOOGLE_SEARCH_CONSOLE_SITE_URL` to the exact URL-prefix property or `sc-domain:example.com`.
- Set `GOOGLE_SCOUT_ACCESS_TOKEN` through the secret manager, never source control.
- Set `GOOGLE_SCOUT_AUTHORIZATION_VERIFIED=true` and `GOOGLE_SEARCH_CONSOLE_RESOURCE_VERIFIED=true` only after a human verifies the identity and property.

The connector calls the official Search Analytics query endpoint. Its clicks and impressions are observed demand signals, not purchases.

## Google Analytics 4

Required configuration:

- Enable the Google Analytics Data API.
- Authorize the official read-only scope `https://www.googleapis.com/auth/analytics.readonly`.
- Give the authorized identity Viewer access to the GA4 property.
- Set `GOOGLE_GA4_PROPERTY_ID` to the numeric GA4 property ID.
- Store `GOOGLE_SCOUT_ACCESS_TOKEN` in the secret manager.
- Set `GOOGLE_SCOUT_AUTHORIZATION_VERIFIED=true` and `GOOGLE_GA4_RESOURCE_VERIFIED=true` only after human verification.

The connector calls `properties.runReport` and records aggregate acquisition/behavior evidence. A successful API call is not a conversion or profitability claim.

## Live-evidence gate

This gate passes only after an official connector returns a successful provider response and `verifiedGoogleEvidence` creates:

- a canonical `ScoutSourceHealth` record;
- a canonical `ScoutLiveEvidence` record;
- provider-derived evidence references;
- verified authorization and complete pagination state.

Synthetic records, Test A, mocks, strings, and manually asserted booleans are rejected.

## Independent outcome-feedback gate

Complete a real campaign or product experiment, then create a canonical `ScoutOutcomeFeedback` record containing:

- experiment reference and observation window;
- audience and product;
- qualified-interest, conversion, completion, continuation, and refund counts;
- aggregate revenue and contribution classifications;
- evidence references;
- provenance classification `INDEPENDENT_EXPERIMENT` or `VERIFIED_CUSTOMER_OUTCOME`;
- uncertainty and limitations.

This record should be produced from the Learning/Economics outcome pipeline after the experiment, not authored by Scout.

## Human acceptance gate

After reviewing the Academy run, source evidence, and independent outcomes, an authenticated authorized administrator records a canonical `ScoutHumanAcceptance` with:

- human actor identity;
- authority reference;
- acceptance scope;
- timestamp;
- evidence references.

The AI, CLI, test suite, and Scout role cannot create or infer this approval.
