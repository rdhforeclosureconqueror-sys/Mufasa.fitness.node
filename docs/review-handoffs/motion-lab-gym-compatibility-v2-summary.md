# Summary

PR #776 mixed a small feature integration with ownership of the entire Motion Lab bootstrap. v2 separates them.

The canonical bootstrap remains untouched. A tiny entry module owns feature activation. A dedicated integration module owns readiness/dependency ordering/panel installation. Existing compatibility, mapping controller, and panel modules keep their existing responsibilities. This is the stable architecture for the personalized avatar before Idle/Walk/Run work begins.
