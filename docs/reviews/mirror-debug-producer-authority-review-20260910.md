# Review checklist — mobile Mirror Debug producer authority

- Confirm runtime-config installs the presentation guard before requesting Mirror Debug Center.
- Confirm legacy `mirrorMotion*` producer nodes remain in DOM but cannot independently display.
- Confirm Mirror Debug Center and launcher are exempt from suppression.
- Confirm no producer-detection polling race remains in runtime-config.
- Confirm deployment diagnostics remain hidden/data-only.
- Run `node --test test/mirror-debug-producer-presentation-authority.test.js` plus existing Mirror Debug Center/deployment tests.
- Physical iPhone Safari is the decisive acceptance test: one Debug launcher/panel only; no Camera Review, Live Acceptance, or phase panel independently visible.
