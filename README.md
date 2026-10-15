# Ali Dance Tool

Desktop choreography charting app built with Electron.

## Features

- Paste a YouTube URL to load it immediately, or press Enter/use Load Video.
- Use a local MP4/MOV/WebM rehearsal video as an offline fallback.
- Add up to 30 dancers in the current UI, with the default layout tuned for 12.
- Drag dancers on the stage for each formation.
- Switch between an editable 2D plan and a perspective sprite stage.
- Select dancers from the left roster and assign one of 18 labeled, distinct sprite poses.
- Map color-coded dancer pathways between each pair of formation cues.
- During video playback, dancer bubbles and sprite-stage characters animate along the saved transition paths.
- Save and open portable project JSON files from desktop or mobile browsers.
- Add, duplicate, sort, and delete formations.
- Save and open choreography projects as JSON.
- Persist the last working state locally between launches.

## Run

1. Install dependencies:

```powershell
npm install
```

2. Start the desktop app:

```powershell
npm start
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
