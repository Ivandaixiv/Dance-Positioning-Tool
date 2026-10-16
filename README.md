# Dance Tool

Desktop choreography charting app built with Electron.

## Features

- Paste a YouTube URL to load it immediately, or press Enter/use Load Video.
- Use a local MP4/MOV/WebM rehearsal video as an offline fallback.
- Add up to 30 dancers in the current UI, with the default layout tuned for 12.
- Click dancers to toggle an additive selection, or drag a selection box in 2D, then move or delete the group together.
- Undo and redo stage edits with the toolbar or `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, and `Ctrl+Y`.
- Apply and preview 10 formation templates and optionally snap moves to a configurable grid.
- Switch between an editable 2D plan and a perspective 3D Plan.
- Switch between light and dark themes, with the preference remembered locally.
- Open the built-in Help guide for a first-project walkthrough on desktop or mobile.
- Select dancers from the left roster and assign one of 12 standard dance poses.
- Map color-coded dancer pathways between each pair of formation cues.
- During video playback, dancer bubbles and sprite-stage characters animate along the saved transition paths.
- Save and open portable project JSON files from desktop or mobile browsers.
- Add, duplicate, and delete formations; cue displays stay ordered by timestamp.
- Sync formation cues and labelled song sections on a BPM-aware, draggable 8-count timeline.
- Save and open choreography projects as JSON.
- Persist the last working state, stage settings, musical timing, and schema version locally between launches.

## Run locally

Node.js 22 or newer is required. Node.js 24 LTS is recommended.

### macOS

If you already have [nvm](https://github.com/nvm-sh/nvm) installed, run these commands from the project folder:

```bash
nvm install 24
nvm use
npm install
npm start
```

The included `.nvmrc` makes `nvm use` select Node.js 24. To use it by default in new Terminal windows, run:

```bash
nvm alias default 24
```

If you do not use nvm, install the macOS package for the current [Node.js LTS release](https://nodejs.org/en/download), reopen Terminal, and then verify the version and run the app:

```bash
node --version
npm --version
npm install
npm start
```

If `node --version` still reports an old release after installing a current one, an existing nvm configuration is probably taking precedence. Use `nvm install 24` followed by `nvm use` as shown above.

Do not use `sudo npm install`. If npm reports that `~/.npm` contains root-owned files from an earlier sudo install, repair that directory once and retry:

```bash
sudo chown -R "$(id -u)":"$(id -g)" "$HOME/.npm"
npm install
```

If npm instead prints an update-check permission warning for `~/.config`, repair that folder without running npm itself as root:

```bash
sudo chown -R "$(id -un)":"$(id -gn)" "$HOME/.config"
```

### Windows and Linux

1. Install dependencies:

```bash
npm install
```

2. Start the desktop app:

```bash
npm start
```

## Tests

Run the dependency-free core test suite with Node.js 22 or newer:

```bash
npm test
```

## Notes

- YouTube playback requires an internet connection.
- The app accepts standard YouTube watch URLs, short URLs, embed URLs, and Shorts URLs.
- A YouTube uploader can disable embedding for a particular video; those videos cannot play inside third-party apps.
- Project files are plain JSON so they can be versioned or edited manually if needed.
- Local video files are not embedded in project JSON. Select the video again after moving a project to another device.

## GitHub Pages

1. Push the project to a GitHub repository using main as the default branch.
2. In the repository settings, open **Pages** and select **GitHub Actions** as the source.
3. The included workflow publishes the static app after each push to main.

The hosted version uses browser downloads and file pickers for JSON projects and local video files. The Electron-only files are ignored by the browser.
