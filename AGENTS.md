# Ali Dance Tool agent guide

## Architecture

- `index.html`, `styles.css`, and `renderer.js` implement the browser UI and also run inside Electron. Keep renderer behavior compatible with static hosting and mobile browsers.
- `dance-core.js` contains shared, dependency-free choreography helpers. `tests/core.test.js` covers their behavior.
- `main.js`, `preload.js`, and `launcher.js` provide the Electron desktop shell; `media-range.js` handles local video delivery and has tests in `tests/media-range.test.js`.
- Project files are portable JSON. Local video files are selected separately on each device.

## Commands

- Use Node.js 22 or newer. `npm install` installs the existing Electron dependency; `npm start` launches the desktop app.
- `npm test` runs the Node test suite. The GitHub Pages workflow runs it before deployment.
- For browser-only changes, open `index.html` locally and check the affected desktop and phone layouts.

## Change guidelines

- Follow existing plain JavaScript, HTML, and CSS patterns; add dependencies only when they solve a concrete problem.
- Keep video cue synchronization, freeform stage dragging, mobile JSON import/export, and sprite-based 3D Plan behavior intact.
- Reuse `dance-core.js` helpers for logic shared by UI views and add focused tests for behavior changes.
- Preserve the existing visual palette and opt-in Help flow unless the task explicitly changes them.
- Review the diff for unrelated changes and run `npm test` before committing.
