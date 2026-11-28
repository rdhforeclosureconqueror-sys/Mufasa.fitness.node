# Movement, physical testing and combines

The live entry point is `/rugby-assessments.html`. It supports both descriptive movement observations and measured physical performance. It uses the existing authenticated user store; there is no new database migration or activation flag.

## How the coach uses it

Open Assessments and combines from Rugby HQ. A verified admin can record for an athlete already present in the Rugby roster. Choosing My account records a self-report, even if the signed-in person is an admin. This preserves the difference between personal reporting and an admin recording another athlete's test.

The initial catalog contains the existing 10 m and 20 m sprints, left and right 505 agility, ankle knee-to-wall, and an overhead squat observation screen. For the squat, describe depth in the notes and record the listed compensations as observed, not observed or not assessed. There is no automatic diagnosis, motion-camera score or hidden pass mark.

Under Admin configuration, define additional physical tests by name, measurement unit and procedure. Supported units are seconds, centimetres, metres, kilograms and repetitions. A test currently captures one measured outcome; define separate metrics as separate tests where necessary. Save a new definition when changing the procedure. Each definition has its own stable ID, and results retain the definition used at capture time.

Create a named combine battery by selecting its tests and recording the combine instructions. Select that battery in the capture form. Its test dropdown includes only the selected tests. Record the session name, actual local test date, trial number, measurement or observations, pain response and actual procedure notes. Unknown pain remains explicitly unknown. The save button reloads the athlete history and checks that the new record is present. Retrying a failed readback with the same submission does not append a duplicate.

## How it connects

The athlete review loads these same saved movement and physical records, including combine/session context. Selecting a Beast Mode stage remains an inspection of candidate requirements, not a stage assignment. Old scalar assessment records and old evidence are preserved without backfilling new observations, protocol versions or verification.

Movement screens describe execution; physical tests measure outputs. Both are needed for the intended development workflow. A training drill is not automatically an assessment result. Repeating the same named test is not by itself a valid improvement comparison: procedure, units, conditions and trial selection still need review.

## What is active and what remains

Capture, admin test/combine configuration, persistence, readback and athlete-review display are enabled in production startup. Admin-recorded results are not labelled independently verified. New capture records do not automatically enter the progression evaluator as confirmed evidence.

Next integrations are independent/assigned-coach review, approved protocol and stage criteria, explicit development priorities, exercise/programme selection, immutable programme completion, comparable retesting, field transfer and authorized stage changes. No workout dose or automatic progression is inferred from capture alone.

## Verification and rollback

Service, route and UI tests exercise real persistence, member/admin boundaries, forged authority, invalid measurements/dates, partial movement observations, combine membership, definition snapshots, readback failure and duplicate retry handling. Owner iPhone and speech/UX acceptance remains a post-deployment human check.

Revert the squash commit and redeploy backend and static frontend to roll back. Existing athlete records and legacy routes remain intact. New `rugbyAssessmentRecords` and `rugbyAssessmentConfig` fields are retained but ignored by the previous application version; do not delete or rewrite them during rollback.
