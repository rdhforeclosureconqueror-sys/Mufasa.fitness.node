# Member Route and Navigation Matrix

| Feature | Route/navigation | Eligibility / flag | Expected API | Empty/error/mobile behavior | Launch |
|---|---|---|---|---|---|
| Home | `/dashboard.html`, Home | Authenticated | member-home, program, gamification projections | Skeleton, retry, responsive wrap | Hold |
| Program | dashboard `#memberHomeTitle`, My Program | Authenticated | program/member-home APIs | Honest no-program next action | Hold |
| Train | `/workout.html`, Train | Authenticated | sessions/workout APIs | Existing selection/error paths | Hold |
| Exercise Hub | `/exercise-library.html`, Exercises | Authenticated | `/api/me/exercises*` | Bounded/no-results/error; mobile layout | Hold |
| Yoga | `/yoga.html`, Yoga | Auth + membership | `/api/yoga/catalogue`, completion | No sessions, retry, camera optional; responsive | Hold |
| Progress/rewards | dashboard anchor | `GAMIFICATION_READ_API` | `/api/me/gamification` | Skeleton, empty, retry, reduced motion | Hold |
| AI Coach | `/coach.html`, AI Coach | Auth + membership/provider | `/api/me/ai-coach*` | Safe provider fallback/cancel | Hold |
| Profile/settings | `/` | Authenticated | profile APIs | Existing shell; dedicated route absent | Hold |

Internal content routes, diagnostics, administration, policy/replay operations, and authoring/review/publishing are intentionally hidden. Nutrition and Greatness/Trail pages still exist as direct legacy/product surfaces but are excluded from Version 1 primary navigation and must not imply launch reward eligibility.

