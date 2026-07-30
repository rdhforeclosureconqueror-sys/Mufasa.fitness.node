# Exercise content lifecycle

## Authority and states

The immutable catalog remains the identity authority. Editorial content moves through **Draft → Validated → Reviewed → Published**; published releases can only become Deprecated or Archived. A rollback creates a new published release from an earlier checksum rather than mutating either release. Display names, aliases, and browser state never become identity.

Authors require `exercise.content.manage`, reviewers require `exercise.content.review`, publishers require `exercise.content.publish`, and inspection requires `exercise.content.read`. Every route also requires bearer authentication. Because these APIs reject ambient cookie authority, CSRF is not applicable; deployments must not convert them to cookie authentication without adding CSRF tokens and origin validation.

## Review boundary

Validation proves structure and policy compliance, not professional review. A review records type, authenticated reviewer identifier, timestamp, scope, source version, notes, and approval. Member projections say `expertReviewed: false` until a qualified review is explicitly attached; the system never invents credentials.

## Operator flow

```bash
curl -H "Authorization: Bearer $TOKEN" https://HOST/internal/exercises/push_up
curl -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' https://HOST/internal/exercises/push_up/drafts -d '{"content":{"description":"Approved draft copy"}}'
curl -X POST -H "Authorization: Bearer $TOKEN" https://HOST/internal/exercises/push_up/drafts/$DRAFT_ID/validate
curl -X POST -H "Authorization: Bearer $REVIEWER_TOKEN" -H 'Content-Type: application/json' https://HOST/internal/exercises/push_up/drafts/$DRAFT_ID/review -d '{"approvalStatus":"approved","reviewType":"editorial","reviewScope":"public_content"}'
curl -X POST -H "Authorization: Bearer $PUBLISHER_TOKEN" https://HOST/internal/exercises/push_up/drafts/$DRAFT_ID/publish
```
