const STORAGE_KEY = "ali-dance-tool-project";
const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";

const colorPalette = [
  "#E85D5D",
  "#4F6BED",
  "#2F9E78",
  "#D18E29",
  "#A855F7",
  "#0D9488",
  "#EC4899",
  "#4B5563",
  "#F97316",
  "#14B8A6",
  "#7C3AED",
  "#2563EB",
  "#CA8A04",
  "#059669",
  "#DC2626",
  "#9333EA"
];

const spriteColumns = [-194, -262, -332, -402, -472, -527, -596, -657];
const spriteRows = [-67, -191, -310, -432, -546];
const spritePoseOptions = [
  { frame: 0, name: "Walk Left" },
  { frame: 3, name: "Side Groove" },
  { frame: 6, name: "Reach Left" },
  { frame: 7, name: "Walk Right" },
  { frame: 8, name: "Hands Up Left" },
  { frame: 10, name: "Hands Overhead" },
  { frame: 16, name: "Low Sweep" },
  { frame: 17, name: "Deep Crouch" },
  { frame: 19, name: "Knee Lift" },
  { frame: 20, name: "Airplane Balance" },
  { frame: 22, name: "Right Lean" },
  { frame: 24, name: "Hands Behind Head" },
  { frame: 26, name: "Open Arms" },
  { frame: 30, name: "Elbows Up" },
  { frame: 31, name: "Reach Right" },
  { frame: 32, name: "Ready Stance" },
  { frame: 34, name: "Hands to Heart" },
  { frame: 38, name: "Open Welcome" }
];

const elements = {
  projectTitleInput: document.querySelector("#projectTitleInput"),
  youtubeUrlInput: document.querySelector("#youtubeUrlInput"),
  loadVideoButton: document.querySelector("#loadVideoButton"),
  chooseLocalVideoButton: document.querySelector("#chooseLocalVideoButton"),
  videoStatus: document.querySelector("#videoStatus"),
  currentTimeLabel: document.querySelector("#currentTimeLabel"),
  activeFormationLabel: document.querySelector("#activeFormationLabel"),
  mediaSourceLabel: document.querySelector("#mediaSourceLabel"),
  playerFrame: document.querySelector("#playerFrame"),
  stageSurface: document.querySelector("#stageSurface"),
  dancerLegend: document.querySelector("#dancerLegend"),
  dancerCountInput: document.querySelector("#dancerCountInput"),
  addDancerButton: document.querySelector("#addDancerButton"),
  removeDancerButton: document.querySelector("#removeDancerButton"),
  formationNameInput: document.querySelector("#formationNameInput"),
  formationTimeInput: document.querySelector("#formationTimeInput"),
  formationNotesInput: document.querySelector("#formationNotesInput"),
  transitionToolbar: document.querySelector("#transitionToolbar"),
  transitionTitle: document.querySelector("#transitionTitle"),
  transitionHint: document.querySelector("#transitionHint"),
  addWaypointButton: document.querySelector("#addWaypointButton"),
  clearPathButton: document.querySelector("#clearPathButton"),
  finishTransitionButton: document.querySelector("#finishTransitionButton"),
  timelineList: document.querySelector("#timelineList"),
  view2dButton: document.querySelector("#view2dButton"),
  view3dButton: document.querySelector("#view3dButton"),
  addFormationButton: document.querySelector("#addFormationButton"),
  duplicateFormationButton: document.querySelector("#duplicateFormationButton"),
  deleteFormationButton: document.querySelector("#deleteFormationButton"),
  sortTimelineButton: document.querySelector("#sortTimelineButton"),
  autoArrangeButton: document.querySelector("#autoArrangeButton"),
  captureTimestampButton: document.querySelector("#captureTimestampButton"),
  jumpToFormationButton: document.querySelector("#jumpToFormationButton"),
  saveProjectButton: document.querySelector("#saveProjectButton"),
  loadProjectButton: document.querySelector("#loadProjectButton"),
  newProjectButton: document.querySelector("#newProjectButton"),
  projectFileInput: document.querySelector("#projectFileInput"),
  videoFileInput: document.querySelector("#videoFileInput")
};

let nextFormationId = 1;
let project = loadState();
let youtubePlayer = null;
let htmlVideo = null;
let youtubeApiReady = false;
let pendingYouTubeVideoId = project.youtubeVideoId || "";
let playbackTimer = null;
let activeDrag = null;
let activeTransitionKey = null;
let isAddingWaypoint = false;

function buildDefaultDancers(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Dancer ${index + 1}`,
    color: colorPalette[index % colorPalette.length],
    spriteFrame: spritePoseOptions[index % spritePoseOptions.length].frame
  }));
}

function normalizeSpriteFrame(value, dancerIndex) {
  const frame = Number(value);
  return spritePoseOptions.some((pose) => pose.frame === frame)
    ? frame
    : spritePoseOptions[dancerIndex % spritePoseOptions.length].frame;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function autoPositions(count) {
  const columns = Math.min(4, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const startX = 18;
  const startY = 22;
  const usableWidth = 64;
  const usableHeight = 58;

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = startX + (columns === 1 ? usableWidth / 2 : (usableWidth / (columns - 1)) * column);
    const y = startY + (rows === 1 ? usableHeight / 2 : (usableHeight / Math.max(rows - 1, 1)) * row);
    return {
      dancerId: index + 1,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    };
  });
}

function createFormation(name, time, dancerCount) {
  return {
    id: nextFormationId++,
    name,
    time,
    notes: "",
    positions: autoPositions(dancerCount)
  };
}

function defaultProject() {
  nextFormationId = 1;
  return {
    title: "Untitled Choreography",
    mediaType: "none",
    youtubeUrl: "",
    youtubeVideoId: "",
    localVideoPath: "",
    localVideoUrl: "",
    localVideoName: "",
    stageView: "2d",
    dancerCount: 12,
    dancers: buildDefaultDancers(12),
    formations: [createFormation("Formation 1", 0, 12)],
    transitions: {},
    activeFormationId: 1,
    selectedDancerId: 1
  };
}

function normalizePositions(positions, dancerCount) {
  const fallback = autoPositions(dancerCount);
  const map = new Map((positions || []).map((position) => [Number(position.dancerId), position]));
  return fallback.map((position) => {
    const existing = map.get(position.dancerId);
    return {
      dancerId: position.dancerId,
      x: clamp(Number(existing?.x ?? position.x), 4, 96),
      y: clamp(Number(existing?.y ?? position.y), 6, 94)
    };
  });
}

function normalizeTransitions(transitions, formations, dancerCount) {
  if (!transitions || typeof transitions !== "object") {
    return {};
  }

  const formationIds = new Set(formations.map((formation) => formation.id));
  const normalized = {};

  Object.values(transitions).forEach((transition) => {
    const fromFormationId = Number(transition?.fromFormationId);
    const toFormationId = Number(transition?.toFormationId);
    if (!formationIds.has(fromFormationId) || !formationIds.has(toFormationId)) {
      return;
    }

    const key = `${fromFormationId}:${toFormationId}`;
    const paths = {};
    for (let dancerId = 1; dancerId <= dancerCount; dancerId += 1) {
      const rawPath = transition?.paths?.[dancerId];
      if (!Array.isArray(rawPath)) {
        continue;
      }
      paths[dancerId] = rawPath.map((point) => ({
        x: clamp(Number(point.x) || 0, 4, 96),
        y: clamp(Number(point.y) || 0, 6, 94)
      }));
    }

    normalized[key] = { fromFormationId, toFormationId, paths };
  });

  return normalized;
}

function normalizeProject(data) {
  const dancerCount = clamp(Number(data.dancerCount) || 12, 1, 30);
  const dancers = Array.isArray(data.dancers) && data.dancers.length
    ? data.dancers.slice(0, dancerCount).map((dancer, index) => ({
      id: index + 1,
      name: dancer.name || `Dancer ${index + 1}`,
      color: dancer.color || colorPalette[index % colorPalette.length],
      spriteFrame: normalizeSpriteFrame(dancer.spriteFrame, index)
    }))
    : buildDefaultDancers(dancerCount);

  const formations = (data.formations || []).map((formation, index) => ({
    id: Number(formation.id) || index + 1,
    name: formation.name || `Formation ${index + 1}`,
    time: Math.max(0, Number(formation.time) || 0),
    notes: formation.notes || "",
    positions: normalizePositions(formation.positions, dancerCount)
  }));

  if (!formations.length) {
    return defaultProject();
  }

  nextFormationId = Math.max(...formations.map((formation) => formation.id), 0) + 1;

  const normalized = {
    title: data.title || "Untitled Choreography",
    mediaType: data.mediaType || (data.youtubeVideoId ? "youtube" : "none"),
    youtubeUrl: data.youtubeUrl || "",
    youtubeVideoId: data.youtubeVideoId || "",
    localVideoPath: data.localVideoPath || "",
    localVideoUrl: data.localVideoUrl || "",
    localVideoName: data.localVideoName || "",
    stageView: data.stageView === "3d" ? "3d" : "2d",
    dancerCount,
    dancers,
    formations,
    transitions: normalizeTransitions(data.transitions, formations, dancerCount),
    activeFormationId: formations.some((formation) => formation.id === data.activeFormationId)
      ? data.activeFormationId
      : formations[0].id,
    selectedDancerId: clamp(Number(data.selectedDancerId) || 1, 1, dancerCount)
  };

  if (normalized.mediaType === "file") {
    normalized.mediaType = "none";
    normalized.localVideoPath = "";
    normalized.localVideoUrl = "";
  }

  return normalized;
}

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeProject(JSON.parse(saved)) : defaultProject();
  } catch {
    return defaultProject();
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

function getActiveFormation() {
  return project.formations.find((formation) => formation.id === project.activeFormationId) || project.formations[0];
}

function formatTime(seconds) {
  const totalSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(1).padStart(4, "0")}`;
}

function setActiveFormation(id, options = {}) {
  project.activeFormationId = id;
  activeTransitionKey = null;
  isAddingWaypoint = false;
  if (!options.silent) {
    saveState();
  }
  render();
}

function getTransitionKey(fromFormationId, toFormationId) {
  return `${fromFormationId}:${toFormationId}`;
}

function ensureTransition(fromFormationId, toFormationId) {
  const key = getTransitionKey(fromFormationId, toFormationId);
  if (!project.transitions[key]) {
    project.transitions[key] = {
      fromFormationId,
      toFormationId,
      paths: {}
    };
  }
  return project.transitions[key];
}

function getActiveTransition() {
  return activeTransitionKey ? project.transitions[activeTransitionKey] : null;
}

function openTransitionEditor(fromFormationId, toFormationId) {
  const transition = ensureTransition(fromFormationId, toFormationId);
  activeTransitionKey = getTransitionKey(fromFormationId, toFormationId);
  project.activeFormationId = transition.fromFormationId;
  isAddingWaypoint = false;
  saveState();
  render();
}

function finishTransitionEditor() {
  activeTransitionKey = null;
  isAddingWaypoint = false;
  saveState();
  render();
}

function parseYouTubeVideoId(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url.trim());

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }

    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v");
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    const marker = segments.findIndex((segment) => segment === "embed" || segment === "shorts");
    return marker >= 0 ? segments[marker + 1] || "" : "";
  } catch {
    return "";
  }
}

function ensureYouTubeApi() {
  if (youtubeApiReady || document.querySelector(`script[src="${YOUTUBE_API_URL}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.src = YOUTUBE_API_URL;
  document.head.append(script);
}

window.onYouTubeIframeAPIReady = () => {
  youtubeApiReady = true;
  if (pendingYouTubeVideoId) {
    loadYouTubeVideoById(pendingYouTubeVideoId);
  }
};

function stopPlaybackWatcher() {
  if (playbackTimer) {
    window.cancelAnimationFrame(playbackTimer);
    playbackTimer = null;
  }
}

function getCurrentMediaTime() {
  if (project.mediaType === "youtube") {
    return youtubePlayer && typeof youtubePlayer.getCurrentTime === "function"
      ? Number(youtubePlayer.getCurrentTime() || 0)
      : 0;
  }

  if (project.mediaType === "file") {
    return htmlVideo ? Number(htmlVideo.currentTime || 0) : 0;
  }

  return 0;
}

function seekCurrentMedia(seconds) {
  const target = Math.max(0, Number(seconds) || 0);

  if (project.mediaType === "youtube" && youtubePlayer && typeof youtubePlayer.seekTo === "function") {
    youtubePlayer.seekTo(target, true);
  }

  if (project.mediaType === "file" && htmlVideo) {
    htmlVideo.currentTime = target;
  }

  window.setTimeout(() => {
    const time = getCurrentMediaTime();
    syncFormationToTime(time, true);
    animateFormationToTime(time);
  }, 150);
}

function syncFormationToTime(time, silent) {
  const ordered = [...project.formations].sort((a, b) => a.time - b.time);
  let target = ordered[0];

  for (const formation of ordered) {
    if (formation.time <= time + 0.05) {
      target = formation;
    }
  }

  if (target && (target.id !== project.activeFormationId || activeTransitionKey)) {
    setActiveFormation(target.id, { silent });
  }
}

function getPlaybackSegment(time) {
  const ordered = [...project.formations].sort((a, b) => a.time - b.time);
  if (ordered.length === 0) {
    return null;
  }

  let fromFormation = ordered[0];
  let toFormation = ordered[1] || null;

  for (let index = 0; index < ordered.length; index += 1) {
    if (ordered[index].time <= time + 0.05) {
      fromFormation = ordered[index];
      toFormation = ordered[index + 1] || null;
    }
  }

  if (!toFormation) {
    return { fromFormation, toFormation: null, progress: 1 };
  }

  const duration = Math.max(toFormation.time - fromFormation.time, 0.01);
  return {
    fromFormation,
    toFormation,
    progress: clamp((time - fromFormation.time) / duration, 0, 1)
  };
}

function getPositionAlongPath(points, progress) {
  if (points.length < 2) {
    return points[0] || { x: 50, y: 50 };
  }

  const segments = [];
  let totalLength = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    segments.push({ start, end, length });
    totalLength += length;
  }

  if (totalLength === 0) {
    return { ...points[points.length - 1] };
  }

  let remaining = clamp(progress, 0, 1) * totalLength;
  for (const segment of segments) {
    if (remaining <= segment.length || segment === segments[segments.length - 1]) {
      const segmentProgress = segment.length === 0 ? 1 : remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * segmentProgress,
        y: segment.start.y + (segment.end.y - segment.start.y) * segmentProgress
      };
    }
    remaining -= segment.length;
  }

  return { ...points[points.length - 1] };
}

function animateFormationToTime(time) {
  if (activeTransitionKey || activeDrag) {
    return;
  }

  const segment = getPlaybackSegment(time);
  if (!segment?.toFormation) {
    return;
  }

  const { fromFormation, toFormation, progress } = segment;
  const transition = project.transitions[getTransitionKey(fromFormation.id, toFormation.id)];

  project.dancers.forEach((dancer) => {
    const start = fromFormation.positions.find((position) => position.dancerId === dancer.id);
    const end = toFormation.positions.find((position) => position.dancerId === dancer.id);
    const marker = elements.stageSurface.querySelector(`.dancer-marker[data-dancer-id="${dancer.id}"]`);
    if (!start || !end || !marker) {
      return;
    }

    const route = [start, ...(transition?.paths?.[dancer.id] || []), end];
    const currentPosition = getPositionAlongPath(route, progress);
    const projected = projectStagePosition(currentPosition);
    marker.style.left = `${projected.x}%`;
    marker.style.top = `${projected.y}%`;
    marker.style.setProperty("--marker-scale", projected.scale);
    marker.style.zIndex = String(Math.round(currentPosition.y) + 2);
    marker.title = `${dancer.name} transitioning (${Math.round(progress * 100)}%)`;
    updateLegendPosition(dancer.id, currentPosition);
  });

  elements.activeFormationLabel.textContent =
    `${fromFormation.name} to ${toFormation.name} | ${Math.round(progress * 100)}%`;
}

function startPlaybackWatcher() {
  stopPlaybackWatcher();

  const updatePlayback = () => {
    const time = getCurrentMediaTime();
    elements.currentTimeLabel.textContent = formatTime(time);
    syncFormationToTime(time, true);
    animateFormationToTime(time);
    playbackTimer = window.requestAnimationFrame(updatePlayback);
  };

  playbackTimer = window.requestAnimationFrame(updatePlayback);
}

function handleYouTubeStateChange(event) {
  const states = window.YT.PlayerState;
  if (event.data === states.PLAYING) {
    elements.videoStatus.textContent = "Playing";
    startPlaybackWatcher();
  } else if (event.data === states.PAUSED) {
    elements.videoStatus.textContent = "Paused";
    stopPlaybackWatcher();
    const time = getCurrentMediaTime();
    syncFormationToTime(time, true);
    animateFormationToTime(time);
  } else if (event.data === states.BUFFERING) {
    elements.videoStatus.textContent = "Buffering";
  } else if (event.data === states.ENDED) {
    elements.videoStatus.textContent = "Ended";
    stopPlaybackWatcher();
    const time = getCurrentMediaTime();
    syncFormationToTime(time, true);
    animateFormationToTime(time);
  } else if (event.data === states.CUED) {
    elements.videoStatus.textContent = "Cued";
    animateFormationToTime(getCurrentMediaTime());
  }
}

function clearPlayerFrame() {
  stopPlaybackWatcher();
  if (youtubePlayer && typeof youtubePlayer.destroy === "function") {
    youtubePlayer.destroy();
  }
  youtubePlayer = null;
  htmlVideo = null;
  elements.playerFrame.innerHTML = "";
}

function renderPlayerPlaceholder(message) {
  clearPlayerFrame();
  elements.playerFrame.innerHTML = `<div class="player-placeholder">${message}</div>`;
}

function loadYouTubeVideoById(videoId) {
  project.mediaType = "youtube";
  saveState();

  if (!youtubeApiReady) {
    pendingYouTubeVideoId = videoId;
    elements.videoStatus.textContent = "Loading YouTube player...";
    ensureYouTubeApi();
    return;
  }

  clearPlayerFrame();
  elements.playerFrame.innerHTML = '<div id="youtubePlayer"></div>';
  youtubePlayer = new window.YT.Player("youtubePlayer", {
    width: "100%",
    height: "100%",
    videoId,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      enablejsapi: 1,
      origin: window.location.origin
    },
    events: {
      onReady: () => {
        elements.videoStatus.textContent = "Ready";
      },
      onStateChange: handleYouTubeStateChange,
      onError: () => {
        elements.videoStatus.textContent = "YouTube embed failed. Use Open MP4 if needed.";
      }
    }
  });
}

function loadYouTubeFromInput() {
  const url = elements.youtubeUrlInput.value.trim();
  const videoId = parseYouTubeVideoId(url);

  if (!videoId) {
    elements.videoStatus.textContent = "Invalid YouTube URL";
    return;
  }

  project.youtubeUrl = url;
  project.youtubeVideoId = videoId;
  project.mediaType = "youtube";
  pendingYouTubeVideoId = videoId;
  saveState();
  loadYouTubeVideoById(videoId);
  updateMediaSourceLabel();
}

function wireHtmlVideoEvents(video) {
  video.addEventListener("play", () => {
    elements.videoStatus.textContent = "Playing";
    startPlaybackWatcher();
  });
  video.addEventListener("pause", () => {
    elements.videoStatus.textContent = "Paused";
    stopPlaybackWatcher();
    const time = getCurrentMediaTime();
    syncFormationToTime(time, true);
    animateFormationToTime(time);
  });
  video.addEventListener("ended", () => {
    elements.videoStatus.textContent = "Ended";
    stopPlaybackWatcher();
    syncFormationToTime(video.duration, true);
    animateFormationToTime(video.duration);
  });
  video.addEventListener("loadedmetadata", () => {
    elements.videoStatus.textContent = "Ready";
    elements.currentTimeLabel.textContent = formatTime(video.currentTime);
  });
  video.addEventListener("timeupdate", () => {
    elements.currentTimeLabel.textContent = formatTime(video.currentTime);
    syncFormationToTime(video.currentTime, true);
    animateFormationToTime(video.currentTime);
  });
}

function loadLocalVideo(fileUrl, fileName, filePath) {
  project.mediaType = "file";
  project.localVideoUrl = fileUrl;
  project.localVideoName = fileName;
  project.localVideoPath = filePath;
  saveState();

  clearPlayerFrame();
  const video = document.createElement("video");
  video.controls = true;
  video.preload = "metadata";
  video.src = fileUrl;
  video.playsInline = true;
  elements.playerFrame.append(video);
  htmlVideo = video;
  wireHtmlVideoEvents(video);
  elements.videoStatus.textContent = "Loading local video...";
}

function updateMediaSourceLabel() {
  if (project.mediaType === "youtube" && project.youtubeVideoId) {
    elements.mediaSourceLabel.textContent = `YouTube: ${project.youtubeVideoId}`;
    return;
  }

  if (project.mediaType === "file" && project.localVideoName) {
    elements.mediaSourceLabel.textContent = `MP4: ${project.localVideoName}`;
    return;
  }

  elements.mediaSourceLabel.textContent = "No media selected";
}

function updateLegendPosition(dancerId, position) {
  const row = elements.dancerLegend.querySelector(`[data-dancer-id="${dancerId}"] .legend-subtitle`);
  if (row) {
    row.textContent = `X ${position.x.toFixed(1)}% | Y ${position.y.toFixed(1)}%`;
  }
}

function updateSelectedDancerUi(dancerId) {
  elements.stageSurface.querySelectorAll(".dancer-marker").forEach((node) => {
    node.classList.toggle("selected", Number(node.dataset.dancerId) === dancerId);
  });

  elements.dancerLegend.querySelectorAll(".legend-row").forEach((node) => {
    node.classList.toggle("active", Number(node.dataset.dancerId) === dancerId);
  });
}

function projectStagePosition(position) {
  if (project.stageView !== "3d" || activeTransitionKey) {
    return { x: position.x, y: position.y, scale: 1 };
  }

  const depth = position.y / 100;
  const stageLeft = 18 * (1 - depth);
  const stageWidth = 64 + 36 * depth;

  return {
    x: stageLeft + (position.x / 100) * stageWidth,
    y: 7 + position.y * 0.87,
    scale: 0.68 + depth * 0.38
  };
}

function unprojectStagePointer(clientX, clientY) {
  const bounds = elements.stageSurface.getBoundingClientRect();
  const screenX = ((clientX - bounds.left) / bounds.width) * 100;
  const screenY = ((clientY - bounds.top) / bounds.height) * 100;

  if (project.stageView !== "3d" || activeTransitionKey) {
    return {
      x: clamp(screenX, 4, 96),
      y: clamp(screenY, 6, 94)
    };
  }

  const y = clamp((screenY - 7) / 0.87, 6, 94);
  const depth = y / 100;
  const stageLeft = 18 * (1 - depth);
  const stageWidth = 64 + 36 * depth;

  return {
    x: clamp(((screenX - stageLeft) / stageWidth) * 100, 4, 96),
    y
  };
}

function setStageView(view) {
  project.stageView = view === "3d" ? "3d" : "2d";
  saveState();
  render();
}

function positionStageElement(element, position) {
  const projected = projectStagePosition(position);
  element.style.left = `${projected.x}%`;
  element.style.top = `${projected.y}%`;
  return projected;
}

function updateTransitionPathElement(transition, dancerId) {
  const fromFormation = project.formations.find((formation) => formation.id === transition.fromFormationId);
  const toFormation = project.formations.find((formation) => formation.id === transition.toFormationId);
  const start = fromFormation?.positions.find((position) => position.dancerId === dancerId);
  const end = toFormation?.positions.find((position) => position.dancerId === dancerId);
  const line = elements.stageSurface.querySelector(`[data-path-dancer-id="${dancerId}"]`);

  if (!start || !end || !line) {
    return;
  }

  const points = [start, ...(transition.paths[dancerId] || []), end]
    .map(projectStagePosition)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  line.setAttribute("points", points);
}

function selectDancer(dancerId) {
  project.selectedDancerId = dancerId;
  saveState();
  render();
}

function beginWaypointDrag(event) {
  event.stopPropagation();
  const waypoint = event.currentTarget;
  const dancerId = Number(waypoint.dataset.dancerId);
  const waypointIndex = Number(waypoint.dataset.waypointIndex);
  const transition = getActiveTransition();
  const point = transition?.paths[dancerId]?.[waypointIndex];

  if (!transition || !point) {
    return;
  }

  project.selectedDancerId = dancerId;
  waypoint.classList.add("dragging");
  waypoint.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const nextPoint = unprojectStagePointer(moveEvent.clientX, moveEvent.clientY);
    point.x = Number(nextPoint.x.toFixed(2));
    point.y = Number(nextPoint.y.toFixed(2));
    positionStageElement(waypoint, point);
    updateTransitionPathElement(transition, dancerId);
  };

  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    waypoint.classList.remove("dragging");
    saveState();
    render();
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
  window.addEventListener("pointercancel", stop, { once: true });
}

function renderTransitionStage(transition) {
  const fromFormation = project.formations.find((formation) => formation.id === transition.fromFormationId);
  const toFormation = project.formations.find((formation) => formation.id === transition.toFormationId);

  if (!fromFormation || !toFormation) {
    finishTransitionEditor();
    return;
  }

  elements.stageSurface.classList.remove("view-3d");
  elements.stageSurface.classList.add("view-2d");
  elements.stageSurface.classList.add("transition-mode");
  elements.stageSurface.innerHTML = '<div class="stage-caption">Audience</div><div class="upstage-caption">Transition Map</div>';

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("transition-lines");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  elements.stageSurface.append(svg);

  project.dancers.forEach((dancer) => {
    const start = fromFormation.positions.find((position) => position.dancerId === dancer.id);
    const end = toFormation.positions.find((position) => position.dancerId === dancer.id);
    if (!start || !end) {
      return;
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.dataset.pathDancerId = String(dancer.id);
    line.classList.toggle("selected", dancer.id === project.selectedDancerId);
    line.style.setProperty("--path-color", dancer.color);
    svg.append(line);

    const startNode = document.createElement("button");
    startNode.type = "button";
    startNode.className = `transition-node start-node${dancer.id === project.selectedDancerId ? " selected" : ""}`;
    startNode.dataset.dancerId = String(dancer.id);
    startNode.style.background = dancer.color;
    startNode.textContent = String(dancer.id);
    startNode.title = `${dancer.name} start`;
    positionStageElement(startNode, start);
    startNode.addEventListener("click", () => selectDancer(dancer.id));
    elements.stageSurface.append(startNode);

    const endNode = document.createElement("button");
    endNode.type = "button";
    endNode.className = `transition-node end-node${dancer.id === project.selectedDancerId ? " selected" : ""}`;
    endNode.dataset.dancerId = String(dancer.id);
    endNode.style.setProperty("--dancer-color", dancer.color);
    endNode.textContent = String(dancer.id);
    endNode.title = `${dancer.name} destination`;
    positionStageElement(endNode, end);
    endNode.addEventListener("click", () => selectDancer(dancer.id));
    elements.stageSurface.append(endNode);

    (transition.paths[dancer.id] || []).forEach((point, index) => {
      const waypoint = document.createElement("button");
      waypoint.type = "button";
      waypoint.className = `path-waypoint${dancer.id === project.selectedDancerId ? " selected" : ""}`;
      waypoint.dataset.dancerId = String(dancer.id);
      waypoint.dataset.waypointIndex = String(index);
      waypoint.style.setProperty("--dancer-color", dancer.color);
      waypoint.textContent = String(index + 1);
      waypoint.title = `${dancer.name} waypoint ${index + 1}`;
      positionStageElement(waypoint, point);
      waypoint.addEventListener("pointerdown", beginWaypointDrag);
      waypoint.addEventListener("click", () => selectDancer(dancer.id));
      elements.stageSurface.append(waypoint);
    });

    updateTransitionPathElement(transition, dancer.id);
  });
}

function renderStage(formation) {
  const transition = getActiveTransition();
  if (transition) {
    renderTransitionStage(transition);
    return;
  }

  const is3d = project.stageView === "3d";
  elements.stageSurface.classList.remove("transition-mode");
  elements.stageSurface.classList.toggle("view-3d", is3d);
  elements.stageSurface.classList.toggle("view-2d", !is3d);
  elements.stageSurface.innerHTML = '<div class="stage-caption">Audience</div><div class="upstage-caption">Upstage</div>';

  formation.positions.forEach((position) => {
    const dancer = project.dancers.find((item) => item.id === position.dancerId);
    const projected = projectStagePosition(position);
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = `dancer-marker${project.selectedDancerId === dancer.id ? " selected" : ""}`;
    marker.dataset.dancerId = String(dancer.id);
    marker.style.left = `${projected.x}%`;
    marker.style.top = `${projected.y}%`;
    marker.style.background = dancer.color;
    marker.style.setProperty("--marker-scale", projected.scale);
    marker.style.zIndex = String(Math.round(position.y) + 2);
    if (is3d) {
      const frameIndex = dancer.spriteFrame;
      const frameColumn = frameIndex % 8;
      const frameRow = Math.floor(frameIndex / 8);
      marker.classList.add("sprite-marker");
      marker.style.setProperty("--sprite-x", `${spriteColumns[frameColumn]}px`);
      marker.style.setProperty("--sprite-y", `${spriteRows[frameRow]}px`);
      marker.style.setProperty("--sprite-x-mobile", `${spriteColumns[frameColumn] * 0.8}px`);
      marker.style.setProperty("--sprite-y-mobile", `${spriteRows[frameRow] * 0.8}px`);
      marker.innerHTML = `
        <span class="sprite-avatar" aria-hidden="true"></span>
        <span class="marker-number" style="background:${dancer.color}">${dancer.id}</span>
      `;
    } else {
      marker.textContent = String(dancer.id);
    }
    marker.title = `${dancer.name} (${position.x.toFixed(1)}%, ${position.y.toFixed(1)}%)`;
    marker.addEventListener("pointerdown", beginMarkerDrag);
    marker.addEventListener("click", () => {
      if (activeDrag?.dancerId === dancer.id && activeDrag.dragMoved) {
        return;
      }
      project.selectedDancerId = dancer.id;
      saveState();
      render();
    });
    elements.stageSurface.append(marker);
  });
}

function renderLegend(formation) {
  elements.dancerLegend.innerHTML = "";

  project.dancers.forEach((dancer) => {
    const position = formation.positions.find((item) => item.dancerId === dancer.id);
    const row = document.createElement("div");
    row.className = `legend-row${project.selectedDancerId === dancer.id ? " active" : ""}`;
    row.dataset.dancerId = String(dancer.id);
    row.innerHTML = `
      <div class="swatch" style="background:${dancer.color}">${dancer.id}</div>
      <div>
        <div class="legend-label">${dancer.name}</div>
        <div class="legend-subtitle">X ${position.x.toFixed(1)}% | Y ${position.y.toFixed(1)}%</div>
      </div>
    `;

    if (project.stageView === "3d" && project.selectedDancerId === dancer.id) {
      const poseControl = document.createElement("label");
      poseControl.className = "pose-control";
      poseControl.innerHTML = "<span>Sprite pose</span>";
      const poseSelect = document.createElement("select");
      poseSelect.setAttribute("aria-label", `Sprite pose for ${dancer.name}`);
      spritePoseOptions.forEach((pose) => {
        const option = document.createElement("option");
        option.value = String(pose.frame);
        option.textContent = pose.name;
        option.selected = pose.frame === dancer.spriteFrame;
        poseSelect.append(option);
      });
      poseSelect.addEventListener("click", (event) => event.stopPropagation());
      poseSelect.addEventListener("change", (event) => {
        event.stopPropagation();
        dancer.spriteFrame = Number(event.target.value);
        saveState();
        render();
      });
      poseControl.append(poseSelect);
      row.append(poseControl);
    }

    row.addEventListener("click", () => {
      selectDancer(dancer.id);
    });
    elements.dancerLegend.append(row);
  });
}

function renderTimeline(activeFormationId) {
  elements.timelineList.innerHTML = "";

  const orderedFormations = [...project.formations].sort((a, b) => a.time - b.time);

  orderedFormations.forEach((formation, index) => {
      const card = document.createElement("article");
      card.className = `timeline-card${formation.id === activeFormationId ? " active" : ""}`;
      card.innerHTML = `
        <span class="timeline-card-time">${formatTime(formation.time)}</span>
        <h3>${formation.name}</h3>
        <p>${formation.notes || "No notes yet."}</p>
      `;
      card.addEventListener("click", () => {
        setActiveFormation(formation.id);
        seekCurrentMedia(formation.time);
      });
      elements.timelineList.append(card);

      const nextFormation = orderedFormations[index + 1];
      if (!nextFormation) {
        return;
      }

      const transition = ensureTransition(formation.id, nextFormation.id);
      const mappedDancers = Object.values(transition.paths)
        .filter((path) => Array.isArray(path) && path.length > 0)
        .length;
      const transitionCard = document.createElement("button");
      transitionCard.type = "button";
      transitionCard.className = `transition-card${activeTransitionKey === getTransitionKey(formation.id, nextFormation.id) ? " active" : ""}`;
      transitionCard.innerHTML = `
        <span class="transition-arrow" aria-hidden="true">↓</span>
        <span>
          <strong>Map transition</strong>
          <small>${formation.name} to ${nextFormation.name}</small>
          <small>${mappedDancers} of ${project.dancerCount} paths customized</small>
        </span>
      `;
      transitionCard.addEventListener("click", () => {
        openTransitionEditor(formation.id, nextFormation.id);
      });
      elements.timelineList.append(transitionCard);
    });
}

function render() {
  const activeFormation = getActiveFormation();
  const activeTransition = getActiveTransition();
  elements.projectTitleInput.value = project.title;
  elements.youtubeUrlInput.value = project.youtubeUrl;
  elements.dancerCountInput.value = project.dancerCount;
  elements.formationNameInput.value = activeFormation.name;
  elements.formationTimeInput.value = activeFormation.time.toFixed(1);
  elements.formationNotesInput.value = activeFormation.notes;
  elements.activeFormationLabel.textContent = activeTransition
    ? "Transition paths"
    : activeFormation.name;
  elements.currentTimeLabel.textContent = formatTime(getCurrentMediaTime());
  elements.view2dButton.classList.toggle("active", project.stageView === "2d");
  elements.view3dButton.classList.toggle("active", project.stageView === "3d");
  elements.view2dButton.setAttribute("aria-pressed", String(project.stageView === "2d"));
  elements.view3dButton.setAttribute("aria-pressed", String(project.stageView === "3d"));
  elements.transitionToolbar.classList.toggle("hidden", !activeTransition);
  elements.addWaypointButton.classList.toggle("active", isAddingWaypoint);
  elements.stageSurface.classList.toggle("adding-waypoint", Boolean(activeTransition && isAddingWaypoint));
  elements.addWaypointButton.textContent = isAddingWaypoint ? "Tap Stage to Place" : "Add Waypoint";

  if (activeTransition) {
    const fromFormation = project.formations.find((formation) => formation.id === activeTransition.fromFormationId);
    const toFormation = project.formations.find((formation) => formation.id === activeTransition.toFormationId);
    const selectedDancer = project.dancers.find((dancer) => dancer.id === project.selectedDancerId);
    elements.transitionTitle.textContent = `${fromFormation.name} to ${toFormation.name}`;
    elements.transitionHint.textContent = isAddingWaypoint
      ? `Tap the stage to place a waypoint for ${selectedDancer.name}.`
      : `Selected: ${selectedDancer.name}. Add or drag waypoints to shape their route.`;
  }
  updateMediaSourceLabel();

  renderStage(activeFormation);
  renderLegend(activeFormation);
  renderTimeline(activeFormation.id);
}

function beginMarkerDrag(event) {
  const dancerId = Number(event.currentTarget.dataset.dancerId);
  const marker = event.currentTarget;
  const activeFormation = getActiveFormation();
  const position = activeFormation.positions.find((item) => item.dancerId === dancerId);

  project.selectedDancerId = dancerId;
  updateSelectedDancerUi(dancerId);

  activeDrag = {
    dancerId,
    marker,
    position,
    pointerId: event.pointerId,
    dragMoved: false
  };

  activeDrag.marker.classList.add("dragging");
  activeDrag.marker.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const nextPosition = unprojectStagePointer(moveEvent.clientX, moveEvent.clientY);
    position.x = Number(nextPosition.x.toFixed(2));
    position.y = Number(nextPosition.y.toFixed(2));
    const projected = projectStagePosition(position);
    activeDrag.dragMoved = true;
    activeDrag.marker.style.left = `${projected.x}%`;
    activeDrag.marker.style.top = `${projected.y}%`;
    activeDrag.marker.style.setProperty("--marker-scale", projected.scale);
    activeDrag.marker.style.zIndex = String(Math.round(position.y) + 2);
    activeDrag.marker.title = `${project.dancers[dancerId - 1].name} (${position.x.toFixed(1)}%, ${position.y.toFixed(1)}%)`;
    updateLegendPosition(dancerId, position);
  };

  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    if (activeDrag?.marker) {
      activeDrag.marker.classList.remove("dragging");
    }
    saveState();
    const shouldRerender = Boolean(activeDrag?.dragMoved);
    activeDrag = null;
    if (shouldRerender) {
      render();
    }
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
  window.addEventListener("pointercancel", stop, { once: true });
}

function resizeDancers(newCount) {
  const count = clamp(newCount, 1, 30);
  const existingDancers = project.dancers;
  project.dancerCount = count;
  project.dancers = Array.from({ length: count }, (_, index) => (
    existingDancers[index] || buildDefaultDancers(count)[index]
  ));
  project.formations = project.formations.map((formation) => ({
    ...formation,
    positions: normalizePositions(formation.positions, count)
  }));
  project.selectedDancerId = clamp(project.selectedDancerId, 1, count);
  saveState();
  render();
}

function addFormation() {
  const current = getActiveFormation();
  const formation = {
    id: nextFormationId++,
    name: `Formation ${project.formations.length + 1}`,
    time: Number((current.time + 8).toFixed(1)),
    notes: "",
    positions: current.positions.map((position) => ({ ...position }))
  };

  project.formations.push(formation);
  setActiveFormation(formation.id);
  saveState();
}

function duplicateFormation() {
  const current = getActiveFormation();
  const formation = {
    id: nextFormationId++,
    name: `${current.name} Copy`,
    time: Number((current.time + 0.5).toFixed(1)),
    notes: current.notes,
    positions: current.positions.map((position) => ({ ...position }))
  };

  project.formations.push(formation);
  setActiveFormation(formation.id);
  saveState();
}

function deleteFormation() {
  if (project.formations.length === 1) {
    return;
  }

  const index = project.formations.findIndex((formation) => formation.id === project.activeFormationId);
  const deletedFormationId = project.activeFormationId;
  project.formations.splice(index, 1);
  Object.keys(project.transitions).forEach((key) => {
    const transition = project.transitions[key];
    if (
      transition.fromFormationId === deletedFormationId
      || transition.toFormationId === deletedFormationId
    ) {
      delete project.transitions[key];
    }
  });
  const fallback = project.formations[Math.max(0, index - 1)];
  setActiveFormation(fallback.id);
  saveState();
}

function sortFormations() {
  project.formations.sort((a, b) => a.time - b.time);
  saveState();
  render();
}

function autoArrangeActiveFormation() {
  getActiveFormation().positions = autoPositions(project.dancerCount);
  saveState();
  render();
}

function setCurrentFormationTimeFromMedia() {
  getActiveFormation().time = Number(getCurrentMediaTime().toFixed(1));
  saveState();
  render();
}

async function saveProjectToDisk() {
  const portableProject = JSON.parse(JSON.stringify(project));
  if (portableProject.mediaType === "file") {
    portableProject.mediaType = "none";
    portableProject.localVideoPath = "";
    portableProject.localVideoUrl = "";
  }

  if (!window.desktopApi?.saveProject) {
    const blob = new Blob([JSON.stringify(portableProject, null, 2)], {
      type: "application/json"
    });
    const downloadUrl = URL.createObjectURL(blob);
    const download = document.createElement("a");
    const safeTitle = (project.title || "choreography-chart")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    download.href = downloadUrl;
    download.download = `${safeTitle || "choreography-chart"}.json`;
    document.body.append(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    return;
  }

  const response = await window.desktopApi.saveProject(portableProject);
  if (!response.canceled && response.filePath) {
    elements.videoStatus.textContent = `Saved ${response.filePath.split(/[/\\]/).pop()}`;
  }
}

function applyLoadedProject(data) {
  project = normalizeProject(data);
  saveState();
  render();

  if (project.mediaType === "youtube" && project.youtubeVideoId) {
    pendingYouTubeVideoId = project.youtubeVideoId;
    loadYouTubeVideoById(project.youtubeVideoId);
  } else {
    renderPlayerPlaceholder("Paste a YouTube link or open a local MP4 rehearsal video.");
    if (project.localVideoName) {
      elements.videoStatus.textContent = "Re-select the local video on this device.";
    }
  }
}

async function loadProjectFromDisk() {
  if (!window.desktopApi?.loadProject) {
    elements.projectFileInput.value = "";
    elements.projectFileInput.click();
    return;
  }

  const response = await window.desktopApi.loadProject();
  if (response.canceled || !response.data) {
    return;
  }

  applyLoadedProject(response.data);
}

function createFreshProject() {
  project = defaultProject();
  saveState();
  render();
  renderPlayerPlaceholder("Paste a YouTube link or open a local MP4 rehearsal video.");
  elements.videoStatus.textContent = "No video loaded";
}

elements.projectTitleInput.addEventListener("input", (event) => {
  project.title = event.target.value;
  saveState();
});

elements.youtubeUrlInput.addEventListener("change", (event) => {
  project.youtubeUrl = event.target.value.trim();
  saveState();
});

elements.loadVideoButton.addEventListener("click", loadYouTubeFromInput);
elements.youtubeUrlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadYouTubeFromInput();
  }
});
elements.youtubeUrlInput.addEventListener("paste", () => {
  window.setTimeout(loadYouTubeFromInput, 0);
});

elements.chooseLocalVideoButton.addEventListener("click", async () => {
  if (!window.desktopApi?.pickVideoFile) {
    elements.videoFileInput.value = "";
    elements.videoFileInput.click();
    return;
  }

  const response = await window.desktopApi.pickVideoFile();
  if (response.canceled) {
    return;
  }

  loadLocalVideo(response.fileUrl, response.fileName, response.filePath);
  updateMediaSourceLabel();
});

elements.projectFileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    applyLoadedProject(JSON.parse(await file.text()));
    elements.videoStatus.textContent = `Opened ${file.name}`;
  } catch {
    elements.videoStatus.textContent = "Could not open that JSON project.";
  }
});

elements.videoFileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const fileUrl = URL.createObjectURL(file);
  loadLocalVideo(fileUrl, file.name, "");
  updateMediaSourceLabel();
});

elements.addDancerButton.addEventListener("click", () => resizeDancers(project.dancerCount + 1));
elements.removeDancerButton.addEventListener("click", () => resizeDancers(project.dancerCount - 1));
elements.dancerCountInput.addEventListener("change", (event) => resizeDancers(Number(event.target.value)));

elements.formationNameInput.addEventListener("input", (event) => {
  getActiveFormation().name = event.target.value || "Untitled Formation";
  saveState();
  render();
});

elements.formationTimeInput.addEventListener("change", (event) => {
  getActiveFormation().time = Math.max(0, Number(event.target.value) || 0);
  saveState();
  render();
});

elements.formationNotesInput.addEventListener("input", (event) => {
  getActiveFormation().notes = event.target.value;
  saveState();
  render();
});

elements.addFormationButton.addEventListener("click", addFormation);
elements.view2dButton.addEventListener("click", () => setStageView("2d"));
elements.view3dButton.addEventListener("click", () => setStageView("3d"));
elements.addWaypointButton.addEventListener("click", () => {
  isAddingWaypoint = !isAddingWaypoint;
  render();
});
elements.clearPathButton.addEventListener("click", () => {
  const transition = getActiveTransition();
  if (!transition) {
    return;
  }
  delete transition.paths[project.selectedDancerId];
  isAddingWaypoint = false;
  saveState();
  render();
});
elements.finishTransitionButton.addEventListener("click", finishTransitionEditor);
elements.stageSurface.addEventListener("pointerdown", (event) => {
  const transition = getActiveTransition();
  if (
    !transition
    || !isAddingWaypoint
    || event.button !== 0
    || event.target.closest("button")
  ) {
    return;
  }

  const dancerId = project.selectedDancerId;
  const point = unprojectStagePointer(event.clientX, event.clientY);
  if (!transition.paths[dancerId]) {
    transition.paths[dancerId] = [];
  }
  transition.paths[dancerId].push({
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2))
  });
  isAddingWaypoint = false;
  saveState();
  render();
});
elements.duplicateFormationButton.addEventListener("click", duplicateFormation);
elements.deleteFormationButton.addEventListener("click", deleteFormation);
elements.sortTimelineButton.addEventListener("click", sortFormations);
elements.autoArrangeButton.addEventListener("click", autoArrangeActiveFormation);
elements.captureTimestampButton.addEventListener("click", setCurrentFormationTimeFromMedia);
elements.jumpToFormationButton.addEventListener("click", () => {
  seekCurrentMedia(getActiveFormation().time);
});
elements.saveProjectButton.addEventListener("click", saveProjectToDisk);
elements.loadProjectButton.addEventListener("click", loadProjectFromDisk);
elements.newProjectButton.addEventListener("click", createFreshProject);

render();
ensureYouTubeApi();

if (project.mediaType === "youtube" && project.youtubeVideoId) {
  loadYouTubeVideoById(project.youtubeVideoId);
} else if (project.mediaType === "file" && project.localVideoUrl) {
  loadLocalVideo(project.localVideoUrl, project.localVideoName, project.localVideoPath);
} else {
  renderPlayerPlaceholder("Paste a YouTube link or open a local MP4 rehearsal video.");
}
