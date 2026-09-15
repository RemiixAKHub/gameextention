# Jewel Drop Development Roadmap

## Phase 1 — Playable Foundation
- 1.1 Group detection, clearing, gravity/refill, score, moves, save/resume, persistent best score. COMPLETE.
- 1.2 Clear animation, falling animation and chain/cascade feedback.
- 1.3 No-move detection, controlled reshuffle animation and board validation tests.
- 1.4 Mobile/popup sizing and input polish.

## Phase 2 — Level Rules
- 2.1 Move-limited score objective.
- 2.2 Colour collection objective.
- 2.3 Win/loss screen and next-level flow.
- 2.4 Level data structure and first 10 levels.

## Phase 3 — Power Jewels
- 3.1 Row clear jewel.
- 3.2 Column clear jewel.
- 3.3 Area blast jewel.
- 3.4 Colour clear jewel.
- 3.5 Power-jewel chain reactions.

## Phase 4 — Obstacles
- 4.1 Ice tiles.
- 4.2 Stone blockers.
- 4.3 Locked jewels.
- 4.4 Treasure-drop objective.

## Phase 5 — Modes and Content
- 5.1 20–40 level campaign.
- 5.2 Endless mode.
- 5.3 Relaxed mode.
- 5.4 Daily seeded puzzle.

## Phase 6 — Polish
- 6.1 Sound toggle and effects.
- 6.2 Statistics and records.
- 6.3 Visual themes and accessibility.
- 6.4 Regression testing and stable release.

## High-score rule
Every score-based mode must keep its own best-score storage key. Starting a new run may reset the current run only; it must never overwrite the saved best score with a lower value.
