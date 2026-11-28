# Milele Fit Anatomy Engine
Independent platform workstream; coordinate with PR #1449 without changing its branch.
## Roadmap
- [x] Define original asset policy and proposed integration boundary
- [ ] Audit existing canonical exercise taxonomy and reconcile identifiers
- [ ] Create original anterior/posterior SVGs with separately addressable bilateral regions
- [ ] Validate anatomical accuracy and mobile accessibility
- [ ] Map exercise records; report unknown and unverified classifications
- [ ] Compare prescribed and completed muscle exposure
- [ ] Develop original 3D model and layered isolation
- [ ] Animate documented exercise mechanics
## Proposed contract (not yet reconciled with existing schema)
Versioned payload: exerciseId, taxonomyVersion, mappingStatus (verified, unverified, missing), muscles: [{muscleId, side (left/right/bilateral/unspecified), role (primary/secondary/stabilizer), evidenceRef}]. Unknown IDs are reported, never silently inferred. Gray means not identified as a target, not inactive. Gold #D4AF37, emerald #10B981, blue #3B82F6, gray #808080. Provide text labels independent of color. Exposure is not measured activation or recovery readiness.
## Asset policy
Create original geometry and rendering code; do not trace proprietary illustrations or import unauthorized meshes/textures. Record creator, creation method, references, rights, license, version and review status for every asset. Verify tool and reference terms. Require qualified anatomical review before production. Preserve contributor rights documentation. No claim of exclusive ownership of anatomical facts.
## Acceptance
Unique region IDs; bilateral support; versioned taxonomy; unknown mapping tests; keyboard/touch access; readable mobile layout; no external asset dependency; no production deployment before validation.
## Integration
PocketPT, Beast Mode, Rugby HQ, recovery, athlete profiles and program generator consume a shared renderer and mapping adapter. No database migration or production changes in this foundation PR. Existing exercise taxonomy is authoritative until reconciliation is reviewed.
