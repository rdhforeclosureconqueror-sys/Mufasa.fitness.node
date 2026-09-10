# Gym compatibility activation checkpoint

The current Motion Lab page still loads the canonical bootstrap directly. This reorganization deliberately does not edit or replace that bootstrap.

Activation is a one-line page-entry change:

`<script src="/dev/motion-lab-gym-compatibility-entry.js" defer></script>`

Place it as a deferred sibling after `/dev/motion-lab-bootstrap.js`. The entry script is idempotent and loads the isolated integration module; the integration waits for the canonical runtime READY boundary before loading compatibility authority -> controller -> panel.

This checkpoint is kept explicit so reviewers can distinguish architecture reorganization from page activation. Until that one-line entrypoint is present, the feature is staged but not visible in the live Motion Lab page.
