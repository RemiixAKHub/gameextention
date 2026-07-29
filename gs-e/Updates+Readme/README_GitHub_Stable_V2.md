# Acqueon Media Pauser — Stable V2

A Chrome extension that automatically pauses browser media when an Acqueon call becomes active, then resumes the same media when the call moves into wrap-up.

The project is designed for call-centre/workflow use where music or browser audio is allowed in the background, but must never interfere with live Acqueon or SmartAgent call handling.

---

## Current status

**Stable V2 is functional and approved for continued testing.**

Confirmed working behaviour:

- Spotify pauses automatically when an Acqueon call becomes active.
- Spotify resumes automatically when the call enters wrap-up.
- Pause/resume state survives normal service-worker restarts.
- Acqueon, Amplify-hosted Acqueon workspaces, and SmartAgent tabs are protected from being paused.
- Manual pause/resume controls are available from the popup.
- Diagnostics export is available for bug reports and regression testing.

The codebase still contains some legacy internal version labels such as `v1.5` and `v1.6` comments from the development phases. These are historical implementation markers. The user-facing stable branch is treated as **Stable V2**.

---

## What the extension does

When Acqueon shows an active call state, the extension scans browser tabs for playing media and pauses supported audio/video sources. When the call reaches wrap-up, it resumes only the media it previously paused.

It does **not** pause the call-control tab itself.

It does **not** resume media that the user manually paused.

It does **not** send data to any external server.

---

## Supported media behaviour

| Service / media type | Pause support | Resume support | Method |
|---|---:|---:|---|
| Spotify Web Player | Yes | Yes | Player button controls |
| SoundCloud | Yes | Yes | Player button controls |
| YouTube | Yes | Yes | Video element / player controls |
| Generic audio/video tabs | Yes | Yes | HTML audio/video control |
| Other sites with standard play/pause buttons | Partial | Partial | Generic button fallback |

---

## Protected applications

The following environments are protected and should never be paused by the extension:

- `acqueon.com`
- `amplifyapp.com`
- `smartagent.app`
- Chrome internal pages
- Chrome extension pages

This protection is important because the extension must manage background media only, never the work-call system.

---

## Main features in Stable V2

### Automatic call-state detection

The detector script watches Acqueon for call-state changes using multiple layers:

- CSS selector detection for known Acqueon call badges.
- Text fallback detection for `Ongoing` and `Wrapup` labels.
- MutationObserver detection for DOM changes.
- Targeted badge observation for faster wrap-up transition detection.
- Heartbeat messages so the background worker knows the Acqueon tab is alive.

### Automatic pause and resume

The background worker handles the main media engine:

- Detects active media tabs.
- Skips protected call-control tabs.
- Pauses supported media during an active call.
- Tracks exactly which tabs were paused.
- Resumes only tracked tabs during wrap-up or idle fallback.
- Cleans up tracking when tabs close.

### Wrap-up safe resume

Stable V2 includes a safety delay before resuming media on wrap-up.

This helps prevent audio from resuming too early if another call arrives immediately after the previous call ends.

### ON/OFF toggle

The popup includes an extension toggle.

When switched off:

- Call-state messages are ignored.
- Pause tracking is cleared.
- Managed media state is reset.

When switched back on, the extension resumes normal monitoring.

### Manual controls

The popup includes manual buttons for testing:

- Pause
- Resume
- Refresh status

These are useful for testing media control without waiting for a live call.

### Managed audio display

The popup shows which audio tabs are currently being managed by the extension.

Examples:

- Spotify — Managed
- YouTube — Managed
- SoundCloud — Managed

### Protected tabs display

The popup shows detected protected applications so the user can confirm that Acqueon or SmartAgent is being recognised.

### Statistics

The popup displays local session statistics, including:

- Calls managed
- Media pauses
- Resumes
- Pause/resume rate

### Developer diagnostics

The Developer tab includes:

- Current state
- Acqueon tab detection status
- Paused tab count
- Last state change
- Detection method
- Last action
- Media method
- Last pause time
- Last resume time
- Recent events
- Recent errors

### Diagnostics export

The extension can export a plain-text diagnostics file for debugging.

The export includes:

- Version marker
- Theme
- Current extension state
- Enabled/disabled status
- Acqueon detection status
- Paused tab count
- Last action
- Media method
- Statistics
- Event log
- Error log

---

## Installation

1. Download or clone this repository.
2. Open Chrome.
3. Go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Select **Load unpacked**.
6. Choose the extension folder.
7. Pin **Acqueon Media Pauser** to the toolbar if desired.

No API key, login, or external account is required.

---

## File structure

```text
acqueon-media-pauser/
├── manifest.json      # Chrome extension manifest
├── background.js      # Main pause/resume engine and diagnostics state
├── detector.js        # Acqueon call-state detector content script
├── popup.html         # Popup layout and styling
├── popup.js           # Popup rendering, controls, theme, diagnostics export
└── README.md          # Project documentation
```

---

## Permissions

The extension uses the following Chrome permissions:

| Permission | Why it is needed |
|---|---|
| `tabs` | To detect audible tabs and identify protected Acqueon/SmartAgent tabs |
| `scripting` | To run pause/resume code inside media tabs |
| `storage` | To save diagnostics, toggle state, and paused-tab tracking |
| `<all_urls>` | To control media across different supported websites |

Host permissions include Acqueon, Amplify, and SmartAgent domains so the detector can monitor the correct call-control pages.

---

## How to use

### Normal workflow

1. Start music or audio in a supported browser tab.
2. Open the Acqueon workspace in another tab.
3. Keep the extension switched **ON**.
4. When a call becomes active, media should pause automatically.
5. When the call enters wrap-up, media should resume automatically.

### Manual testing

Use the popup buttons:

- **Pause** — manually triggers the pause engine.
- **Resume** — manually triggers the resume engine.
- **Refresh** — refreshes popup diagnostics.

Manual testing is useful after browser reloads, extension updates, or UI changes.

---

## Known stable behaviours

These behaviours should be treated as protected regression areas:

- Spotify must pause automatically during an active call.
- Spotify must resume automatically in wrap-up.
- Acqueon must never be paused.
- SmartAgent must never be paused.
- Amplify-hosted Acqueon workspaces must be protected.
- The ON/OFF toggle must stop automation when disabled.
- Media manually paused by the user should not be resumed by the extension.
- Diagnostics export should continue to work after UI changes.

---

## Current Stable V2 position

Stable V2 currently sits between the original production-stable pause/resume engine and the planned full V2 professional dashboard.

### Completed / working

- Core pause/resume engine.
- Acqueon active/wrap/idle detection.
- Amplify Acqueon protection.
- SmartAgent protection.
- ON/OFF toggle.
- Compact mode.
- Manual pause/resume buttons.
- Developer diagnostics.
- Human-readable log translation.
- Managed audio panel.
- Protected tabs panel.
- Statistics panel.
- Diagnostics export.
- Toast notifications.
- Wrap-up safe-resume delay.

### Approved polish still pending

- Rename the **Simple** tab to **Main Dashboard**.
- Keep the **Developer** tab name unchanged.
- Change visible version labels from legacy `v1.5` to **V2**.
- Continue polishing layout spacing and wording.
- Keep UI changes separate from the core pause/resume engine.

### Future roadmap

The longer-term V2 roadmap includes:

- System health dashboard.
- Activity timeline.
- Health check button.
- Smarter diagnostics messages.
- Now-playing display.
- Improved protected applications display.
- Performance metrics.
- Optional notification centre.
- Centralised settings page.
- Final UI polish.

These roadmap items should be built carefully, preferably as UI/diagnostics improvements only.

---

## Development rules

The pause/resume engine is production-stable and should be treated as a locked subsystem.

Before changing `background.js`, `detector.js`, or `manifest.json`, confirm:

1. Why the change is required.
2. Which exact function or section needs editing.
3. Why the change cannot be handled in popup-only code.
4. What regression risks exist.
5. How the change will be tested.

UI-only changes should stay UI-only wherever possible.

---

## Regression test checklist

After every change, test the following:

### Core call behaviour

- Start Spotify or another supported media source.
- Trigger or wait for an Acqueon active call.
- Confirm media pauses automatically.
- Move to wrap-up.
- Confirm media resumes automatically.

### Protected tabs

- Confirm Acqueon is detected.
- Confirm Acqueon audio/call controls are never paused.
- Confirm SmartAgent remains protected if open.

### Toggle behaviour

- Turn the extension OFF.
- Confirm active call changes do not trigger media control.
- Turn the extension ON.
- Confirm normal behaviour resumes.

### UI behaviour

- Confirm Main Dashboard/Simple dashboard values update.
- Confirm Developer tab updates.
- Confirm event logs appear.
- Confirm diagnostics export downloads correctly.
- Confirm compact mode still works.

### Browser lifecycle

- Reload the extension.
- Reload Acqueon.
- Reload the media tab.
- Confirm no protected tab is accidentally paused.
- Confirm service-worker restart does not break resume tracking.

---

## Privacy

The extension runs locally in the browser.

It does not use analytics.

It does not send diagnostics to a server.

It does not require an external account.

Diagnostics exports are generated locally by the user.

---

## Project note

This extension is separate from any game-extension or unrelated browser-extension work. It should remain isolated because it interacts with work-call tabs, media playback, and protected call-control systems.

