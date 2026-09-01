# INDEPENDENT REVIEW HANDOFF — FREE RUN CLUB COMMUNITY PHASE 1

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Scope: Free Run Club only. **Stepping Into Greatness is paid and must not become the Free Run Club community container.** Reuse canonical GPS/activity systems where appropriate, but keep free community/onboarding ownership separate.

## Product requirements to review
- Run-club questionnaire/history: age, sex, state, running goal, experience, current/prior club experience, mileage/recent-run context, preferred run types, injury/history notes.
- Human profile prompts: `If I’m not running, I’m probably…` plus a memorable joke/saying.
- Explicit permission before profile information is used for the community profile.
- Separate permission for intentionally shared photos.
- One Free Run Club group board for members, text + picture-capable.
- Board retention is 24 hours; expired posts must disappear from reads and persistence pruning paths.
- First-failure diagnostics must identify the earliest broken boundary.

## Phase 1 files
Inspect actual PR diff, including at minimum:
- `src/services/freeRunClubCommunityService.js`
- `public/free-run-club.html`
- `public/free-run-club.js`
- `test/free-run-club-community-phase1.test.js`

## Critical warning
This is deliberately a phased PR. Phase 1 establishes the domain/service/UI contract. Verify whether server route wiring is present in the actual PR. If it is absent, verdict must state that Phase 1 is **NOT production-complete** and specify the exact Phase 2 API/server integration required:
- `GET/PUT /api/me/run-club/profile`
- `GET/POST /api/me/run-club/board`
- `GET /api/me/run-club/diagnostic`
- authenticated Free Run Club membership enumeration for board reads
- rate limits / input validation
- image upload/reference ownership and content-type/size policy
- route-authorization contract updates
- Retention Journey Free Run Club entry/wiring
- direct Free Run Club nav/login routing that does not send free members into paid Stepping Into Greatness.

## Privacy review
Confirm community-facing fields are intentionally scoped. State-level location only for Phase 1; do not expose exact GPS/home location. Confirm age/sex/state visibility is explicitly covered by the consent copy before production. Recommend per-field visibility controls if needed.

## Diagnostic review
The rule is earliest failure first. Check auth -> membership/profile -> profile consent -> board read -> board write -> media reference -> retention cleanup. A downstream failure must not hide an earlier failed boundary.

## Tests
Run focused test plus relevant user-store/auth/run-club/greatness regression tests. Do not claim browser acceptance from static tests.

## Final verdict
Use exactly one:
- `APPROVE PHASE 1 FOUNDATION`
- `CHANGES REQUIRED`

Even if approving Phase 1, explicitly state whether a Phase 2 production-wiring PR is still required. Do not merge automatically.