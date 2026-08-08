# Pocket PT Rugby Coaching OS

This package contains an interactive, local-first prototype for Rashad Harbor's rugby coaching and DFW development academy system.

## Open it on your computer

1. Unzip the package.
2. Open the `standalone` folder.
3. Double-click `index.html`.

No login, installation, or internet connection is required for the standalone prototype.

For a local web address instead, open a terminal in the package folder and run:

```bash
python3 -m http.server 8080 -d standalone
```

Then open `http://localhost:8080` in a browser.

## What is included

- Coach Command Center
- Team roster, search, filters, availability, and profile gaps
- Individual player development record
- Transparent starter / bench / developing status
- Coach-verified competency acknowledgments
- Scrum prerequisite graph and staged progression
- Training planner with stage-matched contact groups
- Evidence-informed starting XV board
- Player Welfare and concussion recognition workflow
- Restricted Safeguarding & Athlete Welfare workspace
- World Rugby Level 1 / USA Rugby coach-readiness checklist
- DFW Academy pathway from camps to scrimmage, sevens, and 15s
- Responsive desktop, tablet, and phone layouts
- Device-local demo changes using browser storage


## Coach guide

A coach-facing operating guide is included in two forms:

- Open `standalone/coach-guide.html` for the interactive visual guide.
- Read `COACH_OPERATIONS_GUIDE.md` for the full operating manual.
- `SYSTEM_DATA_ENTRY_SPEC.md` defines how production Add / Edit / Remove / Log Evidence actions should work.

The central rule is: **coaches record evidence; Pocket PT derives status.** Coaches should not invent readiness percentages.

## Important prototype boundaries

This is an independent Pocket PT prototype. It is aligned to concepts and requirements published by USA Rugby and World Rugby, but it is not endorsed by either organization.

Pocket PT coach acknowledgments are internal team records. They do not replace:

- USA Rugby or World Rugby accreditation
- Rugby Xplorer registration or club compliance
- Medical diagnosis or healthcare-provider clearance
- Competition-specific front-row eligibility requirements
- SafeSport, background screening, or other governing-body requirements
- Statutory safeguarding duties or professional safeguarding investigation

The prototype uses fictional sample player records. Do not enter real medical or safeguarding information into this standalone version. It does not yet have production authentication, encryption, server-side permissions, immutable audit storage, notifications, backups, or retention controls.

## Production build priorities

1. Connect the screens to Pocket PT identity and organization roles.
2. Separate performance, medical, and safeguarding data domains.
3. Implement least-privilege permissions and access logging.
4. Add immutable competency evidence and safeguarding action logs.
5. Add governing-body requirement versioning and official-link checks.
6. Add secure document storage and organization-configured emergency pathways.
7. Complete medical, legal, safeguarding, privacy, and USA Rugby compliance review before live athlete use.

## Official requirement sources checked August 7, 2026

- USA Rugby Coaching: https://usa.rugby/coaching
- USA Rugby Courses: https://usa.rugby/courses
- World Rugby face-to-face coaching prerequisites: https://passport.world.rugby/coaching/face-to-face-courses-and-accreditations/

## Full editable source

The `app` folder contains the primary interface source. The `standalone` folder contains the browser-ready local version.

## V4: Backs Rugby Ready

The OS now includes a backline-specific readiness architecture so the system does not overrepresent forward-pack competencies. Source implementation is in `app/page.tsx` under **Backs Rugby Ready**. The standalone package includes `standalone/backs-ready.html`, accessible from the **BR Backs Ready** button in the main prototype.

The module uses one universal backs card plus role overlays for 10/12/13/wing/15, separates Skill/IQ from the Backline Athletic Index, and uses Tackling in Space as a hard starter-eligibility gate. See `UPGRADE_NOTES_V4.md`, `COACH_OPERATIONS_GUIDE.md`, and `SYSTEM_DATA_ENTRY_SPEC.md`.
