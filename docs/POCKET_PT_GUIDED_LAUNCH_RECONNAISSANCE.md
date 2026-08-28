# Pocket PT guided experience and launch reconnaissance

## Canonical systems reused

- Authentication and sessions: `public/auth-state-runtime.js`, `public/auth-navigation.js`, and `src/middleware/auth.js`.
- Global navigation: `public/global-nav.js`.
- Intake and personalization: `journeyIntakeService`, `/api/me/retention/intake`, `/api/me/journey-profile`, and `personalizationService`.
- Training: `public/workout.html`, session APIs, generated workout services, and `/pocketpt/my-program`.
- Nutrition and exercise intelligence: `public/nutrition.html`, `nutritionService`, `public/exercise-library.html`, and `memberExerciseService`.
- Progress and rewards: `/api/progress/dashboard`, workout history/check-ins, and the gamification services.
- Run Club/activity: `public/stepping-into-greatness.html` and the Greatness activity APIs.
- Avatar/camera/motion: `avatar-runtime.js`, `pose-runtime.js`, normalized-pose and live-avatar solver modules. Existing tests provide source/fixture evidence only; physical acceptance remains explicitly open.
- Admin authorization: canonical `requireAuth`, authorization resolver permissions, and durable `data/ops` storage.

## Deliberate gaps and boundaries

- No production-ready Apple Health, HealthKit, Google Health Connect, smartwatch sync, or native phone synchronization is claimed by a tour.
- Progress-photo and baseline-measurement capture are not presented as complete customer tour steps pending end-to-end product verification.
- The Run Club tour only points to its current entry surface; it does not promise every potential GPS/community feature.
- Avatar physical iPhone proof, full live-body mirror acceptance, loss/recovery, and physical cleanup validation remain `HUMAN_TEST_REQUIRED`.
- The guide uses canonical UI targets and skips missing/asynchronously unavailable targets rather than manufacturing controls.

## Persistence choices

Member guide preferences live in the existing per-user durable store, so dismissal and completion follow the authenticated user rather than a browser. Launch board state lives in the existing durable operations directory (`data/ops/launch-readiness.json`), using atomic file replacement. This matches current deployment persistence conventions and avoids introducing a project-management database.
