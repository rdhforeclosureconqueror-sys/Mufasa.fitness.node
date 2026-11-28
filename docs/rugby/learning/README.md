# Position and assessment learning guides

Entry: `/rugby-learning.html`. All 15 positions have dedicated static pages under `/rugby-positions/`; all 29 canonical candidates have dedicated pages under `/rugby-assessment-guides/`. Pages explain role demands, test purpose, procedure, limitations, task illustrations, development options and published cohort references. Existing position/candidate menus link directly to the relevant guide; guides link back to capture using the candidate ID.

These are public educational pages without athlete data, records, login credentials or club tactics. Existing save, coach-review and programme authorization stay in their current services. Reading a guide or viewing a benchmark never approves a procedure, participation, score, programme or stage.

## Content and generation

Edit `data/rugby/learning/` for educational explanations and references. Canonical candidate procedures, roles and exercise examples come from the full-XV definitions and exercise catalog. Run `node scripts/build-rugby-learning-guides.js` after changes; commit its generated HTML/SVG outputs. Run with `--check` to detect drift. CSS and accessible search/cohort/speech controls are in `public/rugby-learning.css` and `.js`.

Illustrations are original SVG task schematics. The traditional 505 explicitly shows the untimed 10 m run-in and timed 5 m out/5 m back. Other diagrams are labelled task maps or examples, not validated motion analysis or contact instruction. Exercise/skill examples supply no automatic dose.

## Research interpretation

`benchmarks.v1.json` retains source, publication year, population, sample size, group, metric, units, mean, SD, procedure and comparison limits. Each value is presented as a study reference, not a national or club pass mark. A standard deviation is not a minimum–maximum range or percentile. Do not derive selection thresholds or national-team scores from group means.

Sources reviewed November 28, 2026:

- Posthumus et al. (2020), Sports 8:85, Table 2: NZ male Super Rugby forwards and backs; sprint, broad jump and Yo-Yo IR1 references. Start offset and trial rules remain visible.
- Pasqualetti et al. (2022), Genes 13:969, Table 2: Lazio TOP12 cohort; traditional 505 group means, not side-specific or international standards. Only physical phenotype measures are used; no genetics-based selection or advice is included.
- Gilchrist (2019), AUT master’s thesis, Tables 4.1/4.14: seven adult male club players; historical, small sample, unsplit by position. Start offset and paired testing differ from other cohorts.
- Freitas et al. (2019), Sports 7:2: Brazilian senior men’s national-team relative squat 1RM, explicitly separated from external kg and submaximal tests.
- Lockie (2018), Facta Universitatis 16(1), Table 1: seventeen collegiate women; plant-leg 505 means use the average of two trials, not best trial.
- USA Rugby (2019), Team USA Pro Days: confirms listed events, not individual Eagles/Falcons scores or cutoffs. No verified comparable USA/Falcons score table was found in the reviewed sources; no numbers are invented. NZ professional sprint references are not All Blacks 505 standards.

Studies from different years, teams, levels or methods are separate references, not a precision club-to-international ranking. Source links and population details stay beside the values. Missing reference data remains visibly unavailable. Additional validated cohorts can be added later without changing athlete records.

## Acceptance and rollback

Machine checks cover 15/29 coverage, deterministic output, internal links/assets, reference provenance, incompatible metric labels, missing national-team data, observation boundaries, search/filter behavior and active-menu deep links. Browser viewport checks are technical evidence only. Owner iPhone, speech output and visual/UX acceptance follow deployment; no machine process grants human approval.

Rollback: reviewed revert of the squash commit and redeploy static frontend. Additive pages/assets and navigation changes require no migration or athlete-data recovery. The public content alone does not complete the original assessment/progression milestones; retain the original roadmap count.
