# Performance Acceptance

No unsupported production latency claim is made. Existing performance/lazy-load tests cover bundle and request behavior, but this environment did not collect representative authenticated production measurements.

Launch thresholds requiring deployment measurement: dashboard usable content ≤2.5s p75 mobile and no duplicate projection requests; Exercise Hub search/detail ≤500ms p95 server; Yoga/program catalog ≤500ms p95; workout/Yoga completion ≤1s p95 excluding provider work; projection refresh ≤1s p95; cached repeat navigation faster than cold navigation; AI first token ≤3s p75 with circuit-breaker fallback. Record actual p50/p75/p95, query counts, asset bytes, image failures, and mobile throttling results before GO.

