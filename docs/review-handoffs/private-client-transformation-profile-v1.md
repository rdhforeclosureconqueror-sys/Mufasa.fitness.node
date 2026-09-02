# Independent Review Handoff — Private Client Transformation Profile v1

Review this PR independently before merge.

## Verify
- Transformation data stays on the canonical user record; no parallel identity/profile store exists.
- `/api/me/transformation-profile*` requires canonical authentication and cannot read another member's data.
- Assigned-trainer detail exposes transformation data only through the existing trainer-client authorization boundary.
- Baseline requires front + side progress photos; face is not required and client-facing copy says face may be cropped/covered.
- Photos are client + assigned trainer only; no public/community surface uses them.
- Transformation-video consent is separate and does not imply public/social sharing permission.
- Client photo resizing keeps each request under the production JSON body limit on representative iPhone photos.
- Measurements are optional and restricted to bicep, chest, waist, hips, thigh plus weight.
- Weekly is the preferred check-in cadence; biweekly is available.
- Return Agreement contains all four prompts: return process, why, why it matters, who else is affected by success.
- Dashboard exposes Transformation Profile only for Private Sessions clients.
- Admin First-Failure Debug checks both the Transformation Profile UI and API.
- Run `node --test test/client-transformation-profile.test.js` and relevant route/security tests.

## Special review concern
This v1 stores resized image data inside the canonical user record for authenticated private use. Review payload/file growth and recommend a private object/file-store migration before high-volume rollout if needed. Do not move images into the public static directory.
