# Botanical Wisdom — historical source foundation

This is a **source-first research module**, not a deployed chatbot or a clinical advice engine.

The initial catalog records URLs and provenance categories only. **No lecture transcript, verified quotations, product ingredient lists, or medical outcomes have been ingested yet.** A URL alone is not evidence of a particular claim.

## Source ingestion protocol
1. Obtain an authorized copy of a lecture, historical publication, original product label, or court document.
2. Preserve title, author/speaker, publication date, original URL, version, and page or timestamp.
3. Index short attributed excerpts with a source ID, topic, and location; respect copyright and licensing.
4. Separate Bowman's own words from third-party recollections, modern site copy, and unverified product claims.
5. Record contradictions across editions rather than silently reconciling them.
6. Do not generate a historical answer when no supporting passage exists.

## Next integration
Inspect the live nutrition-guide request handler and authenticated member routes before connecting the historicalAnswer module. The existing nutrition journal, scanner, membership gate, and food lookup must remain unchanged. For disease-related questions, distinguish attributed historical beliefs from demonstrated treatment and avoid instructions to replace prescribed care.

## Acceptance
Run `node --test test/botanical-wisdom.test.js` in CI. Production integration requires authenticated API tests, historical source citation tests, and live acceptance verification.
