# Environment Checks

The validator returns only variable name, configured state, classification, sensitivity, requirement, and restart metadata. It never returns values. Production runtime/security, AI Coach, gamification, billing, avatar, and visual-scan settings are covered. `missing`, `invalid`, and `placeholder` are failures only when applicable; optional unset values are `not_required`. `PUBLIC_BASE_URL` plus `FRONTEND_PUBLIC_URL` is reported as a duplicate alias. Run `npm run env:validate -- --profile=production` in the deployed backend environment.
