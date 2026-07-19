# API reference

This reference inventories every HTTP JSON API registered by `server.js` (including compatibility and operations surfaces). Protected HTML/static routes are described separately at the end. Base URL is the deployed origin.

## Conventions

* Send/receive JSON unless a route says otherwise. Authenticated calls use `Authorization: Bearer <signed-token>`.
* Standard service responses are `{ "ok": true, "requestId": "...", "data": <value> }`; standard errors are `{ "ok": false, "requestId": "...", "error": { "code": "...", "message": "...", "details"?: {} } }`. Some compatibility/provider routes return the documented direct object.
* `Self` means authenticated and forcibly scoped to `req.auth.userId`; `Member+` means Self plus active membership entitlement. `Trainer(assign)` means the named permission **and** an active trainer/client assignment. `Admin(permission)` names a required permission. `Builder` means authenticated `admin|trainer|coach` template-builder role. `Critical` means the hardened critical-route auth policy. `Public` requires no bearer token.
* Types use `?` for optional, `[T]` for an array, `{...}` for an object, and `enum(a|b)`. Path parameters are strings; IDs must reference resources within the authorized scope. GET/DELETE bodies are empty.
* Unless narrowed below, common codes are `200`, `400` validation, `401` authentication, `403` permission/ownership, `404` resource, `409` state conflict, `429` limit, and `500`. Membership routes may return `402`; provider routes may return `502/503/504`.

## Authentication

| Method/path | Authentication / permissions | Request schema | Response schema | Common codes | Purpose |
|---|---|---|---|---|---|
| `POST /api/auth/login` | Public; auth limiter | `{email,password}` | `{ok,token,user:{userId,email,name?,role?}}` | 200, 400, 401, 429 | Validate pilot/local credentials and issue token. |
| `POST /api/auth/register` | Public; auth boundary | `{name,email,password(min 8)}` | `{ok,token,user}` | 200, 400, 409 | Create local account and token. |
| `GET /api/auth/me` | Bearer when present/required by handler contract | — | `{ok,authenticated,user?,authz?}` | 200, 401 | Resolve current session identity. |
| `POST /api/auth/logout` | Public client endpoint | `{}` | `{ok:true}` | 200 | Complete client logout flow; does not substitute for JTI revocation. |
| `POST /api/auth/bridge` | Public, strictly validated trust boundary | `{token?|credential?|provider?,identity?}` per configured verified provider; unverified/manual fields rejected unless explicitly enabled | `{ok,token,user,trustMode}` | 200, 400, 401, 403 | Exchange a trusted provider identity for application token. |

## Journey

| Method/path | Auth / permissions | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|---|
| `GET /api/me/retention/intake` | Self | — | `{intake:{version,status,answers,updatedAt,...}}` | 200, 401 | Read current versioned intake/draft. |
| `PATCH /api/me/retention/intake` | Self | `{version?,answers:{allowed intake fields...}}` | `{intake,progress}` | 200, 400, 409 | Merge and validate a draft. |
| `POST /api/me/retention/intake/submit` | Self | `{version?}` | `{intake,journeyProfile,recommendations?}` | 200, 400, 409 | Submit a complete intake and derive Journey state. |
| `GET /api/me/retention/intake/progress` | Self | — | `{version,status,completed,total,missing:[string],percent}` | 200 | Read completion/validation progress. |
| `GET /api/me/journey-profile` | Self | — | `{journeyProfile:{...}|null}` | 200 | Read submitted-intake derived profile. |
| `GET /api/me/personalization` | Self | — | `{personalization:{...}}` | 200, 409 | Read deterministic personalization/recommendations. |
| `GET /api/me/onboarding-status` | Self | — | `{onboardingStatus:{...}}` | 200 | Read combined onboarding readiness. |
| `GET /api/client-intake` | Self, legacy | — | `{clientIntake:object|null}` | 200 | Read legacy retention intake. |
| `POST /api/client-intake` | Self, legacy | Validated client-intake fields | `{clientIntake}` | 200/201, 400 | Replace legacy intake. |
| `GET /api/goals-baseline` | Self, legacy | — | `{goalsBaseline:object|null}` | 200 | Read baseline goals. |
| `POST /api/goals-baseline` | Self, legacy | Validated goal/baseline fields | `{goalsBaseline}` | 200/201, 400 | Save goals/baseline. |

## Member

| Method/path | Auth / permissions | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|---|
| `GET /api/me` | Self | — | Sanitized current user aggregate/read model | 200 | Read current member data. |
| `GET /api/me/member-home` | Self | — | `{memberHome:{onboarding,personalization,today,progression,adaptation,nutrition,...}}` | 200 | Aggregate Member Home. |
| `GET /api/me/profile` | Self | — | `{profile:object|null}` | 200 | Read profile. |
| `PUT /api/me/profile` | Self | Validated profile allowlist (identity/contact/fitness fields; unknown/security fields rejected) | `{profile}` | 200, 400 | Upsert own profile. |
| `POST /api/ohsa` | Self | Validated OHSA answers/acknowledgements | `{ohsa}` | 201, 400 | Append health/safety assessment. |
| `GET /api/me/ohsa` | Self | — | `{ohsa:[object]}` | 200 | Read own assessments. |
| `GET /api/me/history` | Self | — | `{history:[event]}` | 200 | Read member activity history. |
| `GET /api/check-ins` | Self | Query `?limit?` | `{checkIns:[object]}` | 200 | List weekly check-ins. |
| `POST /api/check-ins` | Self | Validated `{week?,weight?,energy?,sleep?,adherence?,notes?}` | `{checkIn}` | 201, 400 | Append weekly check-in. |
| `GET /api/visual-progress-scans` | Self | — | `{visualProgressScans:[object]}` | 200 | List visual scans. |
| `POST /api/visual-progress-scans` | Self | Validated scan metadata/image references (bounded; no arbitrary ownership) | `{visualProgressScan}` | 201, 400 | Record scan. |
| `GET /api/me/membership` | Self | — | `{membership,hasAccess,trial?}` | 200 | Read trial/membership entitlement. |
| `GET /api/billing/plan` | Public plan metadata in implementation (no secret output) | — | `{plan:{name,priceId?,priceLabel,currency,billingEnabled,publishableKey?}}` | 200, 503 | Read public checkout configuration. |
| `POST /api/billing/checkout-session` | Self | `{returnUrl?}`; raw card/payment credential fields prohibited | `{clientSecret?,sessionId?,url?}` | 200/201, 400, 503 | Create embedded checkout session. |
| `POST /api/billing/create-checkout-session` | Self, compatibility | `{returnUrl?}` | `{clientSecret?,sessionId?,url?}` | 200/201, 400, 503 | Checkout compatibility alias. |
| `POST /api/billing/portal-session` | Self | `{returnUrl?}` | `{url}` | 200, 400, 404, 503 | Create Stripe customer portal session. |
| `POST /api/billing/webhook` | Public; Stripe signature required, raw body semantics | Stripe event body + `Stripe-Signature` | `{received:true}` | 200, 400 | Apply signed membership events idempotently. |
| `POST /api/challenges/pushup/results` | Critical; challenge limiter | `{reps,durationMs?,displayName?,metadata?}` bounded | `{result,rank?}` | 201, 400, 429 | Save push-up result. |
| `GET /api/challenges/pushup/leaderboard` | Public | Query `?limit?` | `{leaderboard:[result]}` | 200, 400 | Return sanitized leaderboard. |
| `POST /api/pilot/events` | Critical; telemetry limiter | `{event|type,payload?,timestamp?}` sanitized/bounded | `{accepted:true}` | 202, 400, 429 | Append pilot telemetry. |
| `POST /api/avatar/upload` | Self; `ENABLE_AVATAR_FEATURE` | JSON image payload/data URL and allowed metadata, bounded MIME/size | `{avatarUrl,...}` | 201, 400, 404, 413 | Store optional avatar asset. |
| `POST /api/speak` | Critical; TTS limiter | `{text,voice?,rate?}` allowlist; JSON only | audio/provider response | 200, 400, 415, 429, 502 | Proxy bounded speech request without exposing provider secret. |

## Nutrition

All routes below are `Member+`; they are self-owned and may also return `402`.

| Method/path | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|
| `GET /api/nutrition/barcodes/:barcode` | — | `{food}` normalized Open Food Facts product | 200, 404, 502/504 | Barcode lookup. |
| `GET /api/nutrition/foods/search` | Query `?q=<text>&pageSize?` | `{foods:[food],...}` | 200, 400, 502/504 | USDA food search. |
| `GET /api/nutrition/foods/:fdcId` | — | `{food}` | 200, 404, 502/504 | USDA food detail. |
| `POST /api/nutrition/drafts/natural-language` | `{text}` | `{draft:{items:[normalized item],...}}` | 200, 400 | Parse a meal-entry draft; caller confirms before persistence. |
| `GET /api/me/nutrition/entries` | Query date/range filters | `{entries:[entry]}` | 200, 400 | List journal entries. |
| `POST /api/me/nutrition/entries` | `{food,serving,quantity,mealType?,consumedAt?}` | `{entry}` | 201, 400 | Create journal entry. |
| `PUT /api/me/nutrition/entries/:entryId` | Full validated mutable entry fields | `{entry}` | 200, 400, 404 | Replace journal entry. |
| `DELETE /api/me/nutrition/entries/:entryId` | — | `{deleted:true,entryId}` | 200/204, 404 | Delete own entry. |
| `GET /api/me/nutrition/summary` | Query `?date?` | `{summary:{calories,macros,...}}` | 200, 400 | Daily/range summary. |
| `GET /api/me/nutrition/recent` | Query `?limit?` | `{recent:[food|entry]}` | 200 | Recent foods/entries. |
| `POST /api/me/nutrition/meals` | `{name,items:[food item]}` | `{meal}` | 201, 400 | Save reusable meal. |
| `GET /api/me/nutrition/meals` | — | `{meals:[meal]}` | 200 | List saved meals. |
| `POST /api/me/nutrition/meals/:mealId/log` | `{consumedAt?,mealType?,servings?}` | `{meal,entries:[entry]}` | 201, 400, 404 | Log saved meal. |
| `GET /api/me/nutrition/grocery-options` | — | `{options:[grocery option]}` | 200 | Read normalized grocery choices. |
| `GET /api/me/nutrition/weekly-plan/current` | — | `{weeklyPlan:null|weeklyPlan}` | 200 | Read current plan. |
| `POST /api/me/nutrition/weekly-plans` | `{weekStart?,goals?,days?,source?}` | `{weeklyPlan}` | 201, 400 | Create weekly plan. |
| `PATCH /api/me/nutrition/weekly-plans/:planId` | Partial mutable plan/status fields | `{weeklyPlan}` | 200, 400, 404 | Update plan. |
| `POST /api/me/nutrition/weekly-plans/:planId/grocery-items` | `{name,quantity?,unit?,category?}` | `{groceryItem,weeklyPlan}` | 201, 400, 404 | Add grocery item. |
| `PATCH /api/me/nutrition/weekly-plans/:planId/grocery-items/:itemId` | `{checked?,quantity?,name?,category?}` | `{groceryItem,weeklyPlan}` | 200, 400, 404 | Update grocery item. |
| `POST /api/me/nutrition/weekly-plans/:planId/generate-missions` | `{replace?}` | `{missions:[mission]}` | 200/201, 400, 404 | Deterministically create missions. |
| `GET /api/me/nutrition/weekly-plans/:planId/missions` | — | `{missions:[mission]}` | 200, 404 | List plan missions. |
| `PATCH /api/me/nutrition/missions/:missionId` | `{status?,target?,title?,...allowed fields}` | `{mission}` | 200, 400, 404 | Update mission. |
| `POST /api/me/nutrition/missions/:missionId/manual-progress` | `{amount?}` | `{mission,progress}` | 200, 400, 404 | Advance mission manually. |
| `GET /api/me/nutrition/weekly-plans/:planId/review` | — | `{review:{adherence,missions,summary,...}}` | 200, 404 | Weekly review. |
| `POST /api/me/nutrition/weekly-plans/ai-draft/validate` | Weekly AI draft matching documented JSON schema | `{valid:true,draft}` or validation error details | 200, 400 | Validate, never implicitly persist, AI plan draft. |
| `GET /api/me/nutrition/education` | Query contextual filters | `{education:[content card]}` | 200 | Read educational content/recommendations. |

## Workout

| Method/path | Auth / permissions | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|---|
| `GET /api/me/generated-workout-plan` | Self | — | `{plan:null|generatedPlan}` | 200 | Read current generated plan. |
| `POST /api/me/generated-workout-executions` | Self | `{planId,workoutId|dayId,startedAt?}` | `{execution}` | 201, 400, 404, 409 | Start generated execution. |
| `PATCH /api/me/generated-workout-executions/:executionId` | Self | Partial validated execution progress/sets/feedback | `{execution}` | 200, 400, 404, 409 | Persist in-progress execution. |
| `POST /api/me/generated-workout-executions/:executionId/complete` | Self | `{completedAt?,feedback?,summary?}` validated | `{execution,progression?,adaptation?}` | 200, 400, 404, 409 | Complete execution once. |
| `POST /api/sessions` | Member+ | `{exerciseId|slug,startedAt?,plan/workout context?}` | `{session}` | 201, 400, 404 | Start live/legacy session. |
| `POST /api/sessions/:id/reps` | Member+ | `{reps?,set?,metrics?,form?}` validated | `{session}` | 200, 400, 404, 409 | Append/update rep evidence. |
| `POST /api/sessions/:id/complete` | Member+ | `{completedAt?,summary?,feedback?}` | `{session}` | 200, 400, 404, 409 | Complete session. |
| `GET /api/programs/current` | Self | — | `{program:null|program}` | 200 | Read legacy/current assigned program. |
| `POST /api/programs` | Self | Validated `{name?,weeks?,days?,exercises?...}` program assignment | `{program}` | 201, 400 | Save program. |
| `POST /api/workouts/track` | Member+ | Validated workout tracking `{workoutId?,exercises,completedAt,...}` | `{workout,reward?}` | 201, 400 | Track compatibility workout. |
| `GET /api/workouts/reward/latest` | Member+ | — | `{reward:null|reward}` | 200 | Read latest workout reward. |
| `GET /api/exercises/index` | Public | — | `{ok:true,exercises:[exerciseMeta],count}` | 200, 404 | Read exercise index. |
| `GET /api/exercises/search` | Public | Query `?q=<text>` | `{ok:true,q,results:[exerciseMeta],count}` | 200, 404 | Search exercise catalog. |
| `GET /api/exercises/:slug` | Public | — | `{ok:true,meta,data}` | 200, 404, 500 | Read exercise definition. |
| `POST /api/exercise-templates` | Builder | Template definition fields | `{template}` | 201, 400 | Create draft exercise template. |
| `GET /api/exercise-templates` | Builder | Query filters | `{templates:[template]}` | 200 | List templates. |
| `GET /api/exercise-templates/active/scoring` | Self | — | `{template|scoringConfig}` | 200, 404 | Read active scoring config for workout runtime. |
| `GET /api/exercise-templates/:id` | Builder | — | `{template}` | 200, 404 | Read template. |
| `PUT /api/exercise-templates/:id` | Builder | Full mutable template definition | `{template}` | 200, 400, 404, 409 | Update draft/version. |
| `POST /api/exercise-templates/:id/demo-captures` | Builder | `{capture/landmarks metadata}` bounded | `{template,capture}` | 201, 400, 404 | Add demo capture. |
| `POST /api/exercise-templates/:id/test-runs` | Builder | `{metrics,observations?}` | `{template,testRun}` | 201, 400, 404 | Record test run. |
| `POST /api/exercise-templates/:id/approve` | Builder | `{notes?}` | `{template}` | 200, 400, 404, 409 | Approve/activate template. |

## Progression

| Method/path | Auth | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|---|
| `GET /api/me/generated-workout-progression` | Self | — | `{progression:{state,proposal?,history,...}}` | 200 | Read progression. |
| `POST /api/me/generated-workout-progression/evaluate` | Self | `{executionId?}` | `{progression,proposal?}` | 200, 400, 404, 409 | Evaluate deterministic progression evidence. |
| `POST /api/me/generated-workout-progression/accept` | Self | `{proposalId?}` | `{progression,plan?}` | 200, 400, 404, 409 | Accept current proposal. |
| `GET /api/me/training-adaptation` | Self | — | `{adaptation:{recommendation,evidence,...}}` | 200 | Read adaptation state. |
| `GET /api/progress/dashboard` | Member+ | — | `{dashboard:{workouts,streaks,metrics,...}}` | 200, 402 | Read progress dashboard. |

## Trainer

| Method/path | Auth / permission | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|---|
| `GET /api/trainer/workspace` | `trainer.workspace.read` | — | `{workspace:{trainer,counts,recentClients,...}}` | 200, 403 | Trainer overview. |
| `GET /api/trainer/clients` | `trainer.clients.read` | Query `?q?&limit?` | `{clients:[sanitized client summary]}` | 200, 403 | Search/list assigned clients only. |
| `GET /api/trainer/clients/:clientUserId` | Trainer(assign), `trainer.clients.read` | — | `{client:{profile,intake/progress/workout summary,...}}` | 200, 403, 404 | Assigned client detail. |
| `GET /api/trainer/clients/:clientUserId/program` | Trainer(assign), `trainer.clients.read` | — | `{program:null|trainerProgram}` | 200, 403, 404 | Read client program. |
| `PUT /api/trainer/clients/:clientUserId/program` | Trainer(assign), `trainer.clients.programs.write`; trainer-write limit | Validated `{title?,status?,schedule/weeks/workouts,...}` | `{program}` | 200, 400, 403, 429 | Replace assigned trainer program. |
| `GET /api/trainer/clients/:clientUserId/notes` | Trainer(assign), `trainer.clients.notes.read` | — | `{notes:[{id,body,createdAt,...}]}` | 200, 403 | Read own notes for client. |
| `POST /api/trainer/clients/:clientUserId/notes` | Trainer(assign), `trainer.clients.notes.write`; trainer-write limit | `{body}` nonempty/bounded | `{note}` | 201, 400, 403, 429 | Append private trainer note. |

## Administration

| Method/path | Auth / permission | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|---|
| `GET /api/admin/trainer-assignments` | `admin.trainer_assignments.manage` | Query `?q?&status?&trainerUserId?&clientUserId?` | `{assignments:[...],directory?:{trainers,clients}}` | 200, 403 | List/search assignment directory. |
| `POST /api/admin/trainer-assignments` | Same; trainer-write limit | `{trainerUserId,clientUserId}` | `{assignment,created}` | 200/201, 400, 403, 404, 429 | Idempotently create active assignment. |
| `DELETE /api/admin/trainer-assignments/:assignmentId` | Same; trainer-write limit | — | `{assignment}` (inactive) | 200, 403, 404, 429 | Deactivate, not erase, assignment. |

## Diagnostics and operations

| Method/path | Auth / permission | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|---|
| `GET /health` | Public | — | `{ok,service,hasExerciseIndex,authConfigured,...,degraded,startupWarnings,time}` | 200 | Liveness/readiness/config summary. |
| `GET /__version` | Self | — | Build/runtime version object | 200, 401 | Authenticated release identification. |
| `GET /__diagnostic-smoke` | Self | — | Sanitized diagnostic smoke object | 200, 401 | Authenticated route/runtime smoke. |
| `POST /api/admin/diagnostics/report` | `ops.read_observability` | Browser diagnostic `{build?,source?,errors?,systems?...}` | Standard envelope with stored report/readiness/summary | 201, 400, 403, 502-tolerant | Run route checks and store diagnostic report. |
| `GET /api/admin/diagnostics/recent` | `ops.read_observability` | Query `?limit=1..100` | `{reports:[report]}` envelope | 200, 403 | Read recent diagnostics. |
| `GET /api/ops/write-observability` | `ops.read_observability` | — | Health/config/write counters/catalog | 200, 403 | Inspect operational write state. |
| `GET /api/ops/enforcement-config` | `ops.read_authz` | — | `{trustPolicy,tokenRevocation,actionFallbackEnforcement,authorization,...}` | 200, 403 | Read enforcement state (audited). |
| `PUT /api/ops/enforcement-config` | `ops.manage_enforcement` | `{enabledByAction:{profile?|session_start?|session_complete?|ohsa?|rep_update?:boolean},ifVersion?}` | `{actionFallbackEnforcement,currentVersion,updatedActions}` | 200, 400, 403, 409 | Versioned enforcement update. |
| `PUT /api/ops/enforcement-config/break-glass` | `ops.manage_enforcement` **and bootstrap super-admin** | `{enabledByAction,reason|reasonCode}` | `{breakGlass:true,reason,...}` | 200, 400, 403 | Forced, alerted, audited override. |
| `POST /api/ops/auth/token-revocations` | `ops.manage_enforcement` | `{jti,expiresAt:<epoch ms>,reason?}` | `{revoked,tokenRevocation}` envelope | 201, 400, 403 | Revoke token ID. |
| `GET /api/ops/admin-audit` | `ops.read_authz` | Query `?limit?&before?` | `{ok,audit:{events,page,integrity}}` | 200, 403 | Page integrity-linked audit. |
| `GET /api/ops/admin-audit/verify` | `ops.read_authz` | — | `{ok,auditIntegrity}` | 200, 403 | Verify full audit chain and alert on failure. |

## Compatibility command API

| Method/path | Auth | Request schema | Response schema | Codes | Purpose |
|---|---|---|---|---|---|
| `POST /command` | Critical; legacy limiter; availability/action depends on legacy enforcement flags | `{domain,command,userId,payload?|data?}`; `userId` must match authenticated scope | `{ok:true,saved:true,domain,command,userId,...}` | 200, 400, 401, 403, 404, 429, 500 | Deprecated command bus for older clients. New extensions must use explicit validated routes. |

## Protected pages and non-JSON surfaces

`GET /` is public. `GET /dashboard.html`, `/exercise-library.html`, and `/nutrition.html` require authentication; `/trainer.html` requires `trainer.workspace.read`; `/admin-trainer-assignments.html` requires assignment-management permission. `/avatar-runtime.js` requires authentication and the avatar feature. Static files are then served from `public/`. These are browser delivery surfaces, not JSON APIs, but their ordering is security-relevant.
