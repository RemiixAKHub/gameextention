WORDLY integration patch for Mini Games extension

Files included:
- popup.html
- popup.css
- js/popup.js
- js/games/wordly.js

Install:
1. Copy these files into your extension folder, preserving the paths.
2. Do not delete any existing js/games/*.js files.
3. Reload the unpacked extension in chrome://extensions or opera://extensions.
4. Open the popup and select the new Wordly tab.

Notes:
- No manifest.json change is required.
- Storage key added: game_wordly.
- The game is keyboard-routed through popup.js and also supports the on-screen keyboard.
