[README.md](https://github.com/user-attachments/files/29742222/README.md)
# Mini Games Chrome Extension

A lightweight offline Chrome extension that brings a collection of classic mini-games into one popup window. The extension is designed as a compact games hub, letting users switch between multiple games without needing internet access or separate browser tabs.

This README describes the current stable version of the extension. Contexto and Wordle are not included in this version.

---

## Current Version

**Stable Version:** `1.0.0`  
**Extension Name:** `Mini Games`  
**Manifest Version:** Chrome Extension Manifest V3

---

## What This Extension Does

Mini Games is a browser extension that opens from the Chrome toolbar and displays a tabbed mini-game interface. Each game runs inside the extension popup and is loaded through the shared popup controller.

The extension currently includes multiple classic and puzzle-style games, with shared navigation, shared styling, and shared local storage support.

---

## Included Games

The stable version currently includes:

- **2048** — Classic number merging puzzle.
- **Minesweeper** — Classic grid-based mine detection game with difficulty levels.
- **Sudoku** — Number puzzle with pen and pencil modes.
- **Tetris** — Falling block puzzle with scoring, levels, next-piece preview, and saved progress.
- **Connect 4** — Drop-disc board game with AI opponent support.
- **Chess** — Full chess game with legal moves, check/checkmate detection, castling, en passant, promotion, and AI.
- **Yahtzee** — Dice game with full scorecard, bonuses, and saved game state.
- **Blackjack** — Card game with betting, hit, stand, double down, split, and insurance.
- **Solitaire** — Klondike Solitaire with undo/redo support and auto-play to foundation.
- **Lights Out** — Toggle puzzle with 3×3, 5×5, and 7×7 board sizes.
- **15 Puzzle** — Sliding tile puzzle with solvable shuffles.
- **Picture Poker** — Picture-card poker mini-game with betting and hand ranking.
- **Traffic Jam** — Rush Hour-style car sliding puzzle with level progression.
- **Marble Run** — Holographic-style marble racing game with track obstacles, camera/race systems, and ongoing refinement work.

---

## Not Included in This Version

The following games are not part of this stable version:

- Contexto
- Wordle

They may exist as separate experiments or future additions, but they are intentionally excluded from this README and from the described stable release.

---

## Key Features

### Offline Play

The games are built into the extension files and run locally inside the browser popup.

### Single Popup Interface

All games are accessible from the extension popup through a tab-based layout. The central popup controller handles game switching and only initializes a game when it is first opened.

### Saved Progress

The extension uses Chrome local storage to save supported game states. This allows games to resume after closing and reopening the popup.

### Shared Game Framework

The extension uses shared files for:

- Popup layout
- Game tab navigation
- Styling
- Local save/load helpers
- Undo/redo history support where implemented
- Context menu blocking inside the popup

### Lightweight Permissions

The extension only requires the `storage` permission so game progress and settings can be saved locally.

---

## File Structure Overview

```text
Mini Games Extension
├── manifest.json
├── popup.html
├── popup.css
└── js/
    ├── popup.js
    ├── storage.js
    ├── history.js
    ├── no-contextmenu.js
    └── games/
        ├── game2048.js
        ├── minesweeper.js
        ├── sudoku.js
        ├── tetris.js
        ├── connect4.js
        ├── chess.js
        ├── yahtzee.js
        ├── blackjack.js
        ├── solitaire.js
        ├── lightsout.js
        ├── puzzle15.js
        ├── picpoker.js
        ├── trafficjam.js
        └── marblerun.js
```

---

## How to Install Locally

1. Download or clone the repository.
2. Open Chrome or a Chromium-based browser.
3. Go to:

```text
chrome://extensions/
```

4. Enable **Developer mode**.
5. Select **Load unpacked**.
6. Choose the extension project folder.
7. Click the extension icon in the toolbar to open the games popup.

---

## How to Use

1. Open the extension from the browser toolbar.
2. Select a game from the tab bar.
3. Play using the mouse, keyboard, or game-specific controls.
4. Progress is saved automatically for supported games.
5. Reopen the popup later to continue from the saved state.

---

## Controls

Controls vary by game. Common examples include:

- **2048:** Arrow keys
- **Tetris:** Arrow keys, Space, Shift
- **Connect 4:** Left/Right to move, Space/Enter/Down to drop
- **15 Puzzle:** Click tiles or use arrow keys
- **Minesweeper:** Left click to reveal, right click to flag
- **Solitaire:** Mouse controls, undo/redo buttons
- **Traffic Jam:** Mouse/drag controls
- **Marble Run:** Mouse controls and race UI buttons

---

## Storage and Persistence

The extension uses `chrome.storage.local` through a shared storage helper. Game files can save and load their own state using unique storage keys. Writes can be debounced to avoid excessive storage calls during rapid moves.

Saved progress is local to the browser profile and does not require an account or online service.

---

## Development Notes

This extension contains many games inside one shared popup system. Because several files are global, changes should be made carefully.

High-risk shared files include:

- `manifest.json`
- `popup.html`
- `popup.js`
- `popup.css`
- `storage.js`
- `history.js`

When adding or changing a game, prefer isolated game-specific changes where possible. Avoid rewriting shared files unless required.

---

## Current Project Status

The extension is in a stable multi-game state with the main game hub working and many games already integrated. Some games may still have active improvement work or balancing tasks, especially larger games such as Traffic Jam, Solitaire, and Marble Run.

Current focus areas include:

- Preserving the existing stable games.
- Avoiding regressions in shared popup/navigation files.
- Improving game-specific bugs in isolated patches.
- Continuing Marble Run polish and gameplay refinement separately from the stable base.

---

## Safe Change Rules for Future Development

When modifying the extension:

1. Do not remove existing games from the popup.
2. Do not rewrite shared files unless absolutely necessary.
3. Do not rename storage keys without migration logic.
4. Do not add permissions unless they are required.
5. Test every existing game after changing shared navigation or layout.
6. Keep new games isolated in their own files where possible.
7. Use additive changes instead of full replacements.

---

## Regression Test Checklist

After any code change, test the following:

- Extension loads without manifest errors.
- Popup opens correctly.
- All existing games appear in the tab list.
- Each game can be opened.
- The changed game works as expected.
- Basic input works in several other games.
- Saved progress still loads correctly.
- Browser console shows no new obvious errors.

---

## License

No license has been specified yet.

