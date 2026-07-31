# Legacy Diagnostic Reconciliation

| Legacy check | Classification | Resolution |
|---|---|---|
| Route health and protected-route classification | still valid | Retained; admin routes remain authorization-tested. |
| Browser runtime/camera/form evidence | still valid with context | Retained in raw report; does not replace server health. |
| Three bridge globals and GLTFLoader probes | misleading when avatar disabled | Browser output is bypassed by launch-health classification; probes are skipped when `ENABLE_AVATAR_FEATURE=false`. Retained for enabled-avatar troubleshooting. |
| Weekly check-in launch gate | obsolete Version 1 criterion | Replaced with `EXCLUDED_FROM_V1`. |
| Visual scan evidence gate | optional feature | Replaced with flag-aware exclusion. |
| Old progress dashboard/reward booleans | update required | Mapped to Progress & Rewards and the current first-reward journey. |
| Missing intake/goal/workout evidence as backend failure | misleading | Reclassified as member-state limitation unless a runtime operation fails. |
| Legacy route count | duplicate/incomplete | Retained as low-level evidence; capability health is the launch criterion. |
| AI plain-text parser | unsafe/misleading | Replaced with strict schema validation and deterministic fallback. |
| Avatar bridge root-cause guess | obsolete as universal diagnosis | Replaced with feature-aware status and build/static checks. |

No working feature, route, configuration, or file was deleted.
