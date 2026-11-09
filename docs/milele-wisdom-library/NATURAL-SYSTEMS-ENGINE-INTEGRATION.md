# Natural Systems Discovery Engine — integration v1

The contract lives in `src/milele-wisdom/research-contract.js` and is designed for server-side use. It is **not** yet a public route or a deployed member-facing chat feature.

Usage from an existing authenticated, rate-limited server handler:

```js
const { buildResearchRequest } = require('./src/milele-wisdom/research-contract');
const request = buildResearchRequest(req.body.question, { model: process.env.OPENAI_MODEL });
const response = await openai.responses.create(request);
res.json({ answer: response.output_text });
```

The code above is illustrative: `openai` must be initialized securely on the server, and the route must be protected with existing auth, authorization, rate limiting, request logging with privacy safeguards, and error handling before deployment. The repository currently does not declare the `openai` npm dependency; install and pin it when wiring the actual route.

The contract does not create live research retrieval. Search and source retrieval should be separately connected, with citations and provenance recorded. Only verified registry claims are included in prompt context; provisional leads remain internal. No model-generated response is a verified source by itself.

**Next:** integrate with the actual nutrition AI route after reviewing existing server auth and nutrition data flow; verify against an evaluation suite and test the deployed endpoint.
