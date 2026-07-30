# Stepping Into Greatness cinematic HUD root-fix audit

Date: 2026-07-30

## Root cause

The merged glass custom properties were active; they were not the primary visual
bottleneck. Cascade inspection found three compounding rendering stages:

1. The artwork itself was graded before it reached the interface. The winning
   `.cinematic-color-wash` contained 72–86% black/green stops and the winning
   `.cinematic-vignette` added another 47–73% black layer.
2. Major cards then applied a translucent fill and 12px blur. Nested telemetry,
   GPS, route selector, route card, and control fills painted again inside those
   cards. The opacity tokens therefore described individual layers, not the
   effective composited result.
3. `.panel:not(#move)` painted a page-sized 66% black wrapper behind every
   non-Move section. Mobile also restored a legacy, nearly opaque `.card`
   gradient before the later rule happened to override it.

There were no inline `background`, `filter`, or `opacity` declarations on the
audited static elements, and no `!important` background declaration won. Both
standard and WebKit backdrop-filter declarations followed the same path. The
no-filter fallback was itself dark (34% on parents plus 28% on children), so it
also compounded. The HTML referenced the merged stylesheet, but under the old
`cinematic-glass-20260730` cache key.

The fix lightens the artwork grading, makes section wrappers layout-only, limits
blur to the authoritative major pane, and removes tint/blur from nested HUD
readouts. Opaque map canvases remain intentional because map labels and routes
must not compete with the photograph.

## Cascade-resolved representative audit

Values below are the declarations that won immediately before this root fix.
“Stacked” identifies another painted ancestor covering the same pixels.

| Representative | Intended tier | Winning selector and computed paint before fix | Computed filter before fix | Stacked? | Root-fix rendering path |
| --- | --- | --- | --- | --- | --- |
| Activity configuration panel | medium | `.glass-surface,.glass-panel,.card,…`: two-part gradient over `--glass-surface-medium` | `blur(12px) saturate(118%)` (standard + WebKit) | artwork grade + card | single 13–18% HUD gradient, 4px blur |
| Live Activity parent | medium/blue | same shared rule; `.recorder` only changed border after the shared background won | `blur(12px) saturate(118%)` | artwork grade + recorder + children | single 16–19% HUD gradient, 4px blur |
| Telemetry tile | soft | `.glass-surface--soft,.metrics>div` | `none` | recorder + tile | 10% tint, no nested blur |
| GPS panel | soft/emerald | `.gps` gradient plus `--glass-surface-soft` | `none` | recorder + GPS | 10% tint, no nested blur |
| Nearby Trails parent | medium/emerald | `.trail-planner` gradient plus `--glass-surface-medium` | `blur(16px) saturate(120%)` | artwork grade + planner | single 16–19% HUD gradient, 4px blur |
| Nearby Trails input | control | `select,input:not([type=checkbox])`: `--glass-control` | `blur(8px)` | planner + input | 16% control tint, 2px blur |
| Recovered activity | strong/gold | `.glass-surface--strong,…` gradient plus `--glass-surface-strong` | `blur(18px) saturate(120%)` | artwork grade + card | 27–34% alert pane, 6px blur |
| Generated route card | soft | `.planning-status,…,.route-option,…`: gradient plus `--glass-surface-soft` | inherited initial `none` | planner + workspace + selector + card | 16% card tint; workspace/selector transparent |
| Warning panel | local contrast | `.warning` gold-to-green gradient | `none` | containing pane + warning | local 22%-to-transparent scrim only |
| Top navigation | strong | `nav`: 34%-to-24% gradient | `blur(18px) saturate(120%)` | artwork grade + nav | 25%-to-16% HUD strip, 6px blur |
| Bottom navigation | not present | No bottom-navigation element exists in the rendered HTML | n/a | n/a | no invented UI; sticky action dock audited separately |
| Sticky action dock | strong | `.glass-surface--strong,.route-details-drawer,.selected-action-dock` | `blur(18px) saturate(120%)` | trail planner + generated workspace + dock | 30%-to-36% action-local pane, 6px blur |

The recovered panel, generated route card, and action dock are state-dependent;
their selectors were traced against the markup produced by `greatness.js`. Maps
continue to resolve to `#081c17` with both backdrop-filter properties set to
`none`.

## Production asset

`greatness.html` now loads
`greatness.css?v=cinematic-hud-root-fix-20260730`, providing a new production
cache identity for the corrected cascade.
