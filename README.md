# Mufasa Fitness Brain (Node)

Day 1 skeleton for the Mufasa (Node) fitness brain.

- Accepts `/command` POST requests
- Routes `fitness.*` commands to the fitness domain
- Returns simple placeholder responses for:
  - `fitness.startSession`
  - `fitness.repUpdate`
  - `fitness.endSession`

Later days will:
- Add WebSockets for live events
- Connect to Ma’at (Python) for coaching logic
- Add real storage and TTS
