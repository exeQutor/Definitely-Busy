# Definitely Busy

A small Electron desktop app that moves your mouse cursor to a random
position on screen every X seconds (default: 30).

## How it works

- `main.js` — Electron main process. Owns the timer, picks a random point
  within the primary display's work area, and moves the cursor using
  `@nut-tree-fork/nut-js` (Electron itself can only *read* cursor position,
  not set it, so a native automation library is required). The move itself
  is animated — an eased path sampled at ~60fps — instead of teleporting.
- `preload.js` — Exposes a small, safe `window.cursorAPI` bridge to the
  renderer (contextIsolation is on, nodeIntegration is off).
- `renderer/` — The settings window UI: set the interval, Start/Stop,
  see a live countdown and status.
- `assets/` — Tray icon (16px + @2x for retina).
- `build/` — App icon used when packaging (`icon.png` for mac/linux,
  `icon.ico` for Windows).

## System tray

The app lives in the system tray/menu bar:

- Closing the window (the "×" in the top-right corner) minimizes it to the
  tray instead of quitting — the timer keeps running in the background.
- Click the tray icon to show/hide the window.
- Right-click (or click, on mac) the tray icon for a menu: Show window,
  Start, Stop, Quit. **Quit is the only way to actually close the app.**
- The tray tooltip and menu update live to reflect whether it's running.

## Window

The window is frameless (no OS title bar) and draggable from anywhere on
its surface — click and drag any empty part of the window to move it.
Interactive elements (the interval field, Start/Stop, the "×" button) are
excluded from the drag region so they stay clickable, via
`-webkit-app-region: no-drag` in `renderer/style.css`.

## Setup

```bash
npm install
npm start
```

That's it — a window opens with an interval field (defaults to 30s), a
Start button, and a live log of cursor moves.

## Notes

- **Native module**: `@nut-tree-fork/nut-js` ships prebuilt binaries for
  Windows, macOS, and Linux, so `npm install` should work without a
  compiler toolchain in most cases. If `npm install` fails on your
  machine, you likely need build tools installed (Xcode Command Line
  Tools on macOS, `build-essential` on Linux, or the "Desktop
  development with C++" workload on Windows) as a fallback for npm to
  compile native deps.
- **macOS permissions**: macOS will ask you to grant Accessibility
  permissions (System Settings → Privacy & Security → Accessibility) the
  first time the app tries to move the cursor. Without this, moves will
  silently fail.
- **Changing the interval while running**: the input is locked while the
  timer is running — hit Stop, change the value, then Start again. (Easy
  to change if you'd rather allow live updates.)
- **Packaging**: `electron-builder` is already wired up in
  `package.json`. Run `npm run build` to produce an installer/AppImage
  for your platform once you're ready to distribute it.

## Possible next steps

- Add "pause after N minutes of real user activity" so it only kicks in
  when you're actually idle.
- Restrict the random movement to a smaller region instead of the full
  screen.
- Launch at login / start minimized to tray automatically.
