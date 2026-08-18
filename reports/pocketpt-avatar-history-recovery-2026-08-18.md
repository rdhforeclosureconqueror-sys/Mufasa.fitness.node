# PocketPT avatar history recovery and Phase A closure

**Investigation date:** 2026-08-18  
**Scope:** one bounded, non-destructive recovery attempt for the historical avatar incident. No production code, assets, schemas, refs, or object database were changed.

## 1. PHASE A RESULT

# HISTORY UNAVAILABLE

**PHASE A CLOSED — HISTORICAL ROOT CAUSE NOT RECOVERABLE FROM AVAILABLE EVIDENCE**

Neither `bfae3ec` nor `845f9e2489635794b346988242fa1b76f9df40a6` is present as a Git object. The checkout is shallow, its available history begins at several grafted July 2026 roots, and it contains no reachable April 23–May 14 commit range. Text reports describe avatar work and name the hashes, but textual references are not recoverable commit evidence.

## 2. RECOVERY SOURCES CHECKED

| Source | Method | Result |
| --- | --- | --- |
| Reachable history | `git log --all --full-history --decorate --oneline` and date/path-specific logs | Neither hash and no April 23–May 14 commits. History reaches four shallow/grafted roots rather than their parents. |
| Reflogs | `git reflog --all` and direct inspection of `.git/logs/` | Only the environment's August 18 branch creation/rename/checkouts; no incident refs. |
| Branches, tags, stash, refs | `git branch -a`, `git tag -l`, `git stash list`, `git show-ref`, `.git/refs/`, `.git/packed-refs`, merge/FETCH refs | One local branch (`work`), no remote branches, tags, stash, backup refs, temporary/orphan branches, PR refs, merge refs, or forensic refs. `FETCH_HEAD` records the source of the current shallow snapshot only. |
| Unreachable/dangling objects | `git fsck --full --unreachable --dangling --no-reflogs` plus `git show` of every reported commit | Eleven unreachable commits were readable; all are a July 28 nearby-trails/map chain or shallow roots. None concerns avatars or the incident. Unreachable trees/blobs did not restore either missing commit. |
| Object database and packs | `.git/objects/`, `.git/objects/pack/`, `git count-objects -vH`, `git verify-pack -v` | One pack verified successfully. Exact `git cat-file`/`git rev-parse` checks fail for both hashes. No loose or packed matching object exists. No garbage collection was run. |
| Shallow boundaries and parents | `.git/shallow` and commit parent inspection | Four shallow roots are recorded. Their omitted ancestors are not locally available, which prevents reconstruction across the relevant period. |
| Alternates and worktrees | Git config, `.git/objects/info/alternates`, `git worktree list --porcelain` | No alternate object database; only the active worktree. |
| Repository text and metadata | Exact `rg` search including hidden Git metadata; term searches in source, reports, logs, and reachable history | Both known hashes occur only in `reports/pilot-lock-report.md`. Avatar documents survive, but none contains the missing commit objects or a demonstrated outage trace. |
| Bundles/backups/archives/patches | Workspace search for bundles, patches, diffs, archives, backup files, copied repositories, and IDE local history | None found outside the active repository. The only `.git` directory under `/workspace` is this checkout. |
| Logs and incident artifacts | Search of reports/docs and non-dependency log/artifact names for boot/auth/dashboard/import/Three/WebGL/GLB/render/context-loss failures | No deployment, CI, browser-console, server-crash, hosting, screenshot, or rollback artifact ties an avatar change to an outage. Two unrelated npm debug logs exist under `exercise-generation`; they do not concern the avatar incident. |
| Configured remote | `git remote -v` | No configured remote: **REMOTE HISTORY UNAVAILABLE** through Git configuration. |
| Repository identity and host access | `.git/FETCH_HEAD`, `git ls-remote` and a temporary mirror-clone attempt against the exact URL recorded there | `FETCH_HEAD` establishes `https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node`; both non-destructive network attempts were blocked by the environment proxy with HTTP 403. No active repository was overwritten. |
| GitHub CLI metadata | `gh auth status` | GitHub CLI is installed but has no authenticated host, so PR/deleted-branch metadata is unavailable. The repository identity was not guessed. |

This exhausts the reasonable local, workspace, and available host avenues for this bounded attempt.

## 3. KNOWN HASH STATUS

| Hash | Git object present? | Text reference? | Parent available? | Tree available? | Diff reconstructable? | Provenance |
| --- | --- | --- | --- | --- | --- | --- |
| `bfae3ec` | **No.** Abbreviation cannot resolve as a commit or any object. | **Yes.** `reports/pilot-lock-report.md` calls it “Phase 1 avatar quarantine” and lists it in rollback order. | **No** | **No** | **No** | A report imported into this checkout by a later shallow snapshot; not an original Git ref or object. |
| `845f9e2489635794b346988242fa1b76f9df40a6` | **No.** Exact commit/object lookup fails. | **Yes.** The same report identifies it as the source locked immediately before its Phase 9 report. | **No** | **No** | **No** | The same later imported report; not an original Git ref or object. |

The report containing these strings first appears locally at shallow commit `d37169d31e0aa2e46676ec1fe42307237bbac7dd` (“Add files via upload”, July 28, 2026). That import proves only that the document survives, not that its referenced objects were included.

## 4. RECOVERED AVATAR HISTORY

**NOT RECOVERED**

The following is a documentary sequence only and must not be mistaken for reconstructed Git history:

1. An April 23 report says profile/avatar-provider metadata, launch, persistence, and procedural fallback worked, while true GLB/VRM rendering was not yet implemented.
2. Another April 23 report describes a later GLB upload, probe, `GLTFLoader`, rig, and camera-fallback path as present. This is surviving source/report evidence, but the commits connecting the two states are absent.
3. May 6 documentation says avatar frame consumption and render ownership had been extracted behind an isolated failure boundary, while lower-level Three/GLB primitives and render-loop setup remained inline.
4. A May 13 source-lock report says `/avatar-runtime.js` loaded only when the feature flag was enabled.
5. The May 14 pilot-lock report labels `bfae3ec` as the Phase 1 quarantine commit and requires the avatar feature to remain false/unset.

This sequence shows implementation and later quarantine in surviving documents. It does **not** establish when PocketPT became unusable, which change caused that condition, whether a deployment differed from source, or what the missing commits changed.

## 5. INCIDENT ARTIFACTS

### Found

* Planning, route-trace, live-verification, extraction, source-lock, and pilot-lock Markdown reports.
* Current avatar runtime/source and focused avatar visibility/lazy-load tests.
* A later Phase 11 report documenting that a missing optional calendar element could throw a `ReferenceError` and stop app activation; it does not connect this fault to avatar code.

### Not found

* Deployment/build/CI logs from the incident window.
* Browser console captures, server crash logs, monitoring/error reports, or saved screenshots of the failure.
* Evidence of auth or dashboard failure caused by an avatar dependency.
* Three.js import exceptions, WebGL/context-loss events, missing model responses, GLB parser failures, renderer-loop exhaustion, or memory-pressure records from the incident.
* Deployment manifests that map the historical failure to either known hash.
* Original rollback/quarantine diffs and their parent trees.

## 6. UPDATED FAILURE ANALYSIS

The historical outage root cause remains **NOT VERIFIED**. No hypothesis reaches `ROOT CAUSE CONFIRMED`, `LIKELY CONTRIBUTING CAUSE`, or `RULED OUT` from the available incident evidence.

| Hypothesis | Evidence level | Finding |
| --- | --- | --- |
| Avatar/Three initialization broke application boot | **NOT VERIFIED** | Surviving code/docs show feature gating and later isolation, but there is no failure trace or missing diff connecting initialization to the outage. |
| Avatar work broke authentication or dashboard hydration | **NOT VERIFIED** | No incident artifact establishes this dependency or failure. Current architecture reports discuss separation but cannot prove historical behavior. |
| Module/ESM/deployment import failure | **NOT VERIFIED** | Dependency/version and lazy-loading sensitivity are architectural risks; no historical import error was found. |
| Missing/invalid GLB caused the incident | **NOT VERIFIED** | A route trace documents probe and camera fallback. There is no incident-time 404/parser/error trace, and the missing revisions prevent verification of earlier behavior. |
| Render-loop, listener, or subscription leakage destabilized the app | **POSSIBLE CONTRIBUTING CAUSE** | Current/surviving documentation identifies split ownership and incomplete cleanup as technically plausible risks, but there is no chronological runtime evidence. “Possible” is not an outage attribution. |
| WebGL/context loss or mobile GPU pressure caused the incident | **NOT VERIFIED** | No device log, context-loss event, memory profile, or incident screenshot exists. |
| Global inline script conflict stopped activation | **POSSIBLE CONTRIBUTING CAUSE** | Surviving reports document dangerous inline ownership and an unrelated activation-stopping calendar reference. They do not demonstrate that avatar code triggered the historical outage. |

## 7. PREVIOUS FORENSIC FINDINGS CROSS-CHECK

| Previous concern | Historical evidence | Status |
| --- | --- | --- |
| Render-loop ownership | May 6 documentation says lower-level scene/render-loop creation remained inline while avatar frame rendering was extracted. No incident diff or runtime trace survives. | **POSSIBLE CONTRIBUTING CAUSE** |
| Listener/subscription cleanup | Current runtime subscribes to pose frames and surviving docs claim a single subscription, but prior revisions and teardown observations are absent. | **NOT VERIFIED** |
| Resource cleanup | Current technical audit identifies disposal gaps in imported viewer material; no recovered historical revision connects that material or leak to the old runtime. | **NOT VERIFIED** |
| Global initialization/lifecycle isolation | Surviving extraction notes explicitly add an isolated avatar failure boundary and document substantial remaining inline ownership. This confirms a structural concern, not historical causation. | **POSSIBLE CONTRIBUTING CAUSE** |
| Auth/dashboard dependency | No incident evidence connects avatar health to authentication or dashboard hydration. | **NOT VERIFIED** |
| Asset/model failure | Reports describe GLB probing, signature checks, and camera fallback, but no historical failure event or missing-object diff exists. | **NOT VERIFIED** |
| Deployment/import issue | Source reports note lazy CDN/ESM and version sensitivity; no deployment log or rejected import was found. | **NOT VERIFIED** |
| WebGL/mobile issue | Manual real-browser/mobile verification remained outstanding; no incident device evidence survives. | **NOT VERIFIED** |

The architectural defects remain useful risk indicators. They must not be represented as confirmed causes of the historical outage.

## 8. OLD AVATAR REUSE CONSEQUENCES

No reuse classification becomes safer because no history was recovered. Existing avatar runtime pieces remain **REUSE WITH MODIFICATION / HIGH RISK** only as referenceable primitives, not as a trusted boot-integrated subsystem. Imported models and anatomy assets retain their existing licensing, rigging, and validation classifications. In particular, no old initialization, renderer-loop, listener, or global integration path should be reconnected to auth/dashboard on the strength of the surviving reports.

## 9. IMPACT ON MUSCLE MOTION ENGINE PLAN

The prior plan must change only in ordering: a dependency firewall now precedes all Three.js, model, anatomy, conversion, and animation work. The asset/taxonomy/rigging findings remain technically useful, but no renderer or avatar spike should cross into PocketPT core until the optional viewer boundary proves that absent, disabled, failed, or rejected viewer dependencies cannot affect authentication, dashboard, workouts, programs, coaching, or the exercise library.

No Muscle Motion Engine, Motion Lab, Three.js renderer, model conversion, anatomy rigging, schema change, or catalog change is part of this closure.

## 10. PHASE A CLOSURE DECISION

# COMPLETE

Phase A is complete, not indefinitely blocked. An external full clone/bundle containing the missing objects, authenticated host access to historical refs/PRs, or incident/deployment artifacts could justify reopening the historical analysis later, but those unavailable artifacts are not required to proceed safely.

**PHASE A CLOSED — HISTORICAL ROOT CAUSE NOT RECOVERABLE FROM AVAILABLE EVIDENCE**

## 11. EXACT NEXT ENGINEERING ACTION

**Implement Phase B’s no-Three fail-safe `MotionViewerBoundary` contract, fallback ownership, feature flag, and dependency-edge tests.**

Phase B begins with no Three.js renderer and no avatar model. Its sole objective is to establish this dependency direction:

```text
POCKETPT CORE
├── Authentication
├── Dashboard
├── Workouts
├── Programs
├── Coaching
├── Exercise Library
└── Optional Motion Capability
        ↓
MotionViewerBoundary
        ↓
future lazy-loaded 3D implementation
```

Core behavior must remain operational when the viewer is disabled, absent, loading, rejected, timed out, or failed. Do not execute this action as part of Phase A.
