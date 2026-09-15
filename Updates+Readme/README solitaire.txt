Solitaire patch: Hint Toggle + Button Match + Double-click Auto-place

Replace this file in your extension:
js/games/solitaire.js

Changes:
- Hint is now an ON/OFF toggle.
- Hint refreshes after each move while enabled.
- Undo, Redo, Auto, Smart Auto, and Hint now use the same sol-auto-btn styling class.
- Double-click waste card: auto-places to foundation if possible, otherwise a legal tableau column.
- Double-click tableau card/stack: auto-places to foundation if top card can go there, otherwise moves the stack to a legal tableau column.
- Double-click foundation card: auto-places it back down to a legal tableau column if possible.
- Shared files are not changed.

Test:
1. Reload the unpacked extension.
2. Open Solitaire.
3. Confirm Undo/Redo/Auto/Smart Auto/Hint buttons visually match.
4. Turn Hint ON, make a move, and confirm the hint updates instead of switching off.
5. Double-click waste, tableau, and foundation cards in legal situations.
6. Confirm Undo/Redo still works.
