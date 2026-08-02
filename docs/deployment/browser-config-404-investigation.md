# Production `/api/browser-config` 404 investigation

## Conclusion

`mufasafitsite.onrender.com` is deployed as a Render **Static Site**, not as the repository's Express process. A Static Site publishes files from `public/`; it does not execute `server.js`, `npm start`, or Express route registration. Because there is no `public/api/browser-config` artifact, Render's static file server returns the observed `404 text/plain` before any repository application code can run.

The Express route is registered only in `server.js`. The repository start chain is `npm start` → the `prestart` script → `node server.js`; the `require.main === module` block then calls `createApp()` and `app.listen()`. That process identifies itself as `mufasa-fitness-node`, and the documented split deployment assigns backend API calls to `https://mufasa-fitness-node.onrender.com`. Therefore the deployed process capable of registering this route belongs to the `mufasa-fitness-node` web service, not the `mufasafitsite` Static Site.

## Evidence by question

| Question | Determination | Evidence |
| --- | --- | --- |
| Is `mufasafitsite` Express or static? | Static Site. | `reports/frontend-deploy-oauth-trace-2026-04-26.md` explicitly records service type **Static Site**, repository root, and publish directory `public`. The production observation is consistent: a missing path returns `404 text/plain`, not the JSON API error envelope produced by Express. |
| Does it execute the route registration? | No. | Static publication copies `public` and starts no Node process. No file exists below `public/api/`. |
| Which file registers the route? | `server.js`. | `createApp()` registers `app.get("/api/browser-config", ...)`; the handler reads only `VITE_GOOGLE_MAPS_BROWSER_API_KEY` for the browser key. |
| Which process starts that server? | `node server.js`, invoked by `npm start`. | `package.json` defines `start`; `server.js` listens only from its `require.main === module` block. |
| Which Render service uses that process? | `mufasa-fitness-node`. | The startup log literal says `mufasa-fitness-node listening`; deployment and split-origin reports name `mufasa-fitness-node.onrender.com` as the backend origin. Repository evidence cannot read the private Render dashboard, so the exact dashboard command must still be confirmed there. |
| Is the route in the frontend deployed artifact? | No. | The frontend artifact is `public`, and `find public -path '*/api/*'` returns no files. `server.js` is outside the publish directory and is not executed by a Static Site. |
| What deployment change removed it? | No such change is proven in repository history. | The checked-in frontend deployment record already specifies a Static Site before the Google map route was introduced. No `render.yaml`/Blueprint or Render dashboard export is committed. Claiming a particular dashboard change, date, or actor would be guessing. |
| How does working architecture differ? | A same-origin Express path requires Greatness assets and `/api/browser-config` to be served by the same running Express application (or a historically proven edge rule). Current architecture serves Greatness from the static `mufasafitsite` origin and runs Express on the separate `mufasa-fitness-node` origin. | The `ab040cc` source contains both the relative browser request and the Express route, but that proves a code contract—not that both were deployed behind one origin. |

## Architecture comparison

### Architecture required by the claimed working contract

```text
iPhone
  └─ https://mufasafitsite.onrender.com
       └─ one Express process
            ├─ public/greatness.html and browser assets
            └─ GET /api/browser-config
                 └─ VITE_GOOGLE_MAPS_BROWSER_API_KEY
```

This is the architecture required for a relative `/api/browser-config` request to reach the committed Express handler. Repository history proves the code needed for it existed at `ab040cc`; it does **not** prove Render used this topology. A proxy/rewrite could also have made the URL resolve, but no historical rule is committed, so none may be asserted.

### Current architecture

```text
iPhone
  ├─ https://mufasafitsite.onrender.com (Render Static Site)
  │    ├─ publishes public/greatness.html and browser assets
  │    ├─ runs no server.js
  │    └─ GET /api/browser-config → static 404 text/plain
  │
  └─ https://mufasa-fitness-node.onrender.com (Node Web Service)
       └─ npm start → node server.js → createApp() → Express routes
```

This also explains why Nearby Trails can return `200` from `mufasa-fitness-node` while the same-origin browser-config request returns `404`: they are requests to different Render services with different artifact and process models.

## Timeline correction

The earlier map regression report overstated what Git could establish. `ab040cc` is the reported last iPhone success and contains the relative loader request plus the Express handler. But the repository's frontend deployment record already calls `mufasafitsite` a Static Site, and it predates the Google map feature in the documented timeline. Consequently:

1. Git proves the route and relative request existed together in source.
2. Production evidence proves the current frontend origin does not execute the route.
3. Git does not prove that `mufasafitsite` ever ran Express, nor which uncommitted Render setting changed.
4. The exact historical deployment transition can only be established from Render service type/configuration history, deploy logs, and any rewrite history.

## Required Render-dashboard verification (no deployment)

An operator with dashboard access should capture, without editing or deploying:

1. `mufasafitsite` service type, branch, root directory, build command, publish directory, redirects/rewrites, and deploy history around `ab040cc`.
2. `mufasa-fitness-node` service type, branch, root directory, build command, start command, and deploy revision.
3. Whether `mufasafitsite` was ever a Web Service or had a same-origin `/api/*` rewrite, including when and by whom it changed.
4. Artifact file lists or deploy logs proving whether `server.js` was packaged and executed in the allegedly working frontend deploy.

Until that evidence exists, the proven root cause of the current 404 is **process/artifact mismatch at the frontend origin**. The identity of the historical deployment change remains **not proven**, and no JavaScript, route fallback, secret move, or deployment should be attempted on the basis of this repository alone.

## Commands used

```bash
find . -maxdepth 3 -type f \( -name 'render.yaml' -o -name 'render.yml' -o -name 'Dockerfile' -o -iname '*deploy*' \) -print
rg -n "mufasafitsite|Static Site|Web Service|npm start|node server.js|Publish Directory|Start Command" docs reports package.json
rg -n 'function createApp|app.get\("/api/browser-config|require.main|listen\(' server.js
find public -maxdepth 3 -type f -path '*/api/*' -print
git show ab040cc:reports/frontend-deploy-oauth-trace-2026-04-26.md
git show ab040cc:package.json
git show ab040cc:server.js
git log --all --follow -- reports/frontend-deploy-oauth-trace-2026-04-26.md
curl -sS -D - https://mufasafitsite.onrender.com/api/browser-config
```

The live `curl` attempt from this environment was blocked by its outbound proxy (`CONNECT tunnel failed, response 403`), so it did not independently replace the supplied production capture. The conclusions above use the supplied `404 text/plain` observation and repository evidence; they do not claim private Render-dashboard access.
