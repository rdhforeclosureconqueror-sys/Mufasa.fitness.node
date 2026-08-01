# Designated member journey checks

An operator with `ops.read_observability` designates one safe member ID through `PUT /api/admin/diagnostics/member-journey/designation`. Subsequent GET reads inspect only that designation and return a masked reference. The read never saves or repairs member data. Each step is `STEP_COMPLETED`, `MEMBER_HAS_NOT_COMPLETED`, `MEMBER_EVIDENCE_UNAVAILABLE`, or `STEP_OPTIONAL`; capability availability is separate. A new member with no workout is incomplete, not broken. Mutation belongs only in a separately approved acceptance-fixture workflow.
