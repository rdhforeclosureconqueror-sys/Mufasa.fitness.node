# Public UI source-of-truth and deployment contract

`https://mufasafitsite.onrender.com` is the canonical public visual portal.
Render builds it with `npm ci && npm run build:frontend` and publishes `dist/`.
`scripts/build-frontend.js` creates that artifact solely by copying `public/`;
there is no separately maintained frontend workout or avatar runtime tree.

`https://mufasa-fitness-node.onrender.com` is the canonical API, authentication,
authorization, persistence, and protected-asset service. It runs `npm ci` and
`npm start`. Express still serves `public/` as a legacy compatibility surface,
but that surface is not a second source tree and is not the public production
entry point. New public navigation must remain relative to the frontend origin.

The frontend runtime config names the backend origin explicitly. The canonical
API client resolves API paths against that origin and obtains `maatAuthToken`
through `AuthStateRuntime` before constructing the Bearer Authorization header.
The backend CORS allowlist contains the canonical frontend origin.

Avatar presentation controls are always available in the public frontend during
this testing phase; no second browser environment flag is required. Backend
avatar upload and retrieval continue to require authentication, ownership, GLB
validation, and the server capability setting `ENABLE_AVATAR_FEATURE=true`.

Build identity is available without secrets at `/__frontend-version.json` on
the frontend and `/__version` on the backend. The frontend artifact manifest
records the source commit supplied by Render (`RENDER_GIT_COMMIT`) or local Git.
