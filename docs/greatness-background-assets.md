# Stepping Into Greatness background assets

The deployed originals were audited on 2026-07-29 and intentionally retained without renaming:

| Asset | Dimensions | Size |
| --- | ---: | ---: |
| `public/new/stepintograteness1.jpg` | 1536 × 1024 | 245,650 bytes |
| `public/new/stepintograteness2.jpg` | 1536 × 1024 | 256,489 bytes |
| `public/new/stepintograteness3.jpg` | 1536 × 1024 | 182,199 bytes |

At roughly 178–250 KiB each, the JPEGs are appropriately compressed for a full-viewport photographic background. Their 3:2 source ratio and 1536-pixel width are sufficient for the current mobile and typical desktop presentation without obvious quality loss. AVIF/WebP or responsive derivatives would add six or more cache entries and format-selection complexity for modest savings, so they were not generated. Revisit derivatives if source artwork becomes materially larger or real-user performance data shows transfer cost is a bottleneck.

Only the first JPEG is preloaded. The runtime decodes the next JPEG asynchronously and does not prefetch subsequent images for reduced-motion, Save-Data, or detected 2G users.
