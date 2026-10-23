const STORAGE_KEY = "dance-tool-project";
const THEME_STORAGE_KEY = "dance-tool-theme";
const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";
const {
  SCHEMA_VERSION,
  HistoryStack,
  applyTemplate,
  countInfo,
  createTemplatePositions,
  deepClone,
  secondsPerBeat,
  snapPosition
} = window.DanceCore;

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

const spriteColumns = ["0%", "33.3333%", "66.6667%", "100%"];
const spriteRows = ["0%", "50%", "100%"];
const spritePoseOptions = [
  { frame: 0, name: "Ready Stance" },
  { frame: 1, name: "Step Left" },
  { frame: 2, name: "Step Right" },
  { frame: 3, name: "Arms Up" },
  { frame: 4, name: "Arms Out" },
  { frame: 5, name: "Hip Left" },
  { frame: 6, name: "Hip Right" },
  { frame: 7, name: "Lunge Left" },
  { frame: 8, name: "Lunge Right" },
  { frame: 9, name: "Low Groove" },
  { frame: 10, name: "Turn" },
  { frame: 11, name: "Jump" }
];

const elements = {
  workspace: document.querySelector("#workspace"),
  playbackPanel: document.querySelector("#playbackPanel"),
  formationPanel: document.querySelector("#formationPanel"),
  cuesPanel: document.querySelector("#cuesPanel"),
  toggleCuesButton: document.querySelector("#toggleCuesButton"),
  cueCountLabel: document.querySelector("#cueCountLabel"),
  fileMenuButton: document.querySelector("#fileMenuButton"),
  fileMenu: document.querySelector("#fileMenu"),
  helpButton: document.querySelector("#helpButton"),
  helpDialog: document.querySelector("#helpDialog"),
  helpCloseButton: document.querySelector("#helpCloseButton"),
  helpStartButton: document.querySelector("#helpStartButton"),
  themeToggleButton: document.querySelector("#themeToggleButton"),
  themeColorMeta: document.querySelector("#themeColorMeta"),
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
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
  formationNoteBanner: document.querySelector("#formationNoteBanner"),
  formationNoteText: document.querySelector("#formationNoteText"),
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
  captureTimestampButton: document.querySelector("#captureTimestampButton"),
  saveProjectButton: document.querySelector("#saveProjectButton"),
  loadProjectButton: document.querySelector("#loadProjectButton"),
  newProjectButton: document.querySelector("#newProjectButton"),
  selectedDancerLabel: document.querySelector("#selectedDancerLabel"),
  deleteSelectedDancerButton: document.querySelector("#deleteSelectedDancerButton"),
  formationTemplateSelect: document.querySelector("#formationTemplateSelect"),
  previewTemplateButton: document.querySelector("#previewTemplateButton"),
  applyTemplateButton: document.querySelector("#applyTemplateButton"),
  showGridInput: document.querySelector("#showGridInput"),
  snapToGridInput: document.querySelector("#snapToGridInput"),
  gridSizeInput: document.querySelector("#gridSizeInput"),
  bpmInput: document.querySelector("#bpmInput"),
  musicOffsetInput: document.querySelector("#musicOffsetInput"),
  sectionLabelSelect: document.querySelector("#sectionLabelSelect"),
  addSectionButton: document.querySelector("#addSectionButton"),
  addFormationAtPlayheadButton: document.querySelector("#addFormationAtPlayheadButton"),
  currentCountLabel: document.querySelector("#currentCountLabel"),
  timelineActiveLabel: document.querySelector("#timelineActiveLabel"),
  timelineNextLabel: document.querySelector("#timelineNextLabel"),
  countTimelineViewport: document.querySelector("#countTimelineViewport"),
  countTimelineTrack: document.querySelector("#countTimelineTrack"),
  countTimelineGroups: document.querySelector("#countTimelineGroups"),
  sectionMarkers: document.querySelector("#sectionMarkers"),
  formationCueMarkers: document.querySelector("#formationCueMarkers"),
  timelinePlayhead: document.querySelector("#timelinePlayhead"),
  projectFileInput: document.querySelector("#projectFileInput"),
  videoFileInput: document.querySelector("#videoFileInput")
};

let nextFormationId = 1;
let project = loadState();
let youtubePlayer = null;
let htmlVideo = null;
let activeVideoObjectUrl = null;
let youtubeApiReady = false;
let pendingYouTubeVideoId = project.youtubeVideoId || "";
let playbackTimer = null;
let playbackPathCache = null;
let orderedFormationsCache = null;
let renderedMarkers = new Map();
let lastPlaybackLabel = "";
let lastTimeLabel = "";
let activeDrag = null;
let activeTransitionKey = null;
let isAddingWaypoint = false;
let templatePreview = null;
let suppressNextMarkerClick = false;
let displayedNoteFormationId = null;
let noteAnimationFrame = null;
let timelineDuration = 60;
let timelineCursorTime = 0;
let timelineBeatCount = 0;
let timelineBeatDuration = 0;
let timelineTrackWidth = 0;
let renderedBeatRange = "";
let beatRenderFrame = null;
const history = new HistoryStack(120);

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

function autoPositions(countOrIds) {
  const dancerIds = Array.isArray(countOrIds)
    ? countOrIds
    : Array.from({ length: countOrIds }, (_, index) => index + 1);
  const count = dancerIds.length;
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
      dancerId: dancerIds[index],
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
    schemaVersion: SCHEMA_VERSION,
    title: "Untitled Choreography",
    mediaType: "none",
    youtubeUrl: "",
    youtubeVideoId: "",
    localVideoPath: "",
    localVideoUrl: "",
    localVideoName: "",
    stageView: "2d",
    dancerCount: 12,
    nextDancerId: 13,
    dancers: buildDefaultDancers(12),
    formations: [createFormation("Formation 1", 0, 12)],
    transitions: {},
    bpm: 120,
    musicStartOffset: 0,
    sections: [],
    editorSettings: {
      showGrid: true,
      snapToGrid: false,
      gridSize: 5
    },
    panelState: {
      playback: false,
      formation: false,
      cues: false
    },
    activeFormationId: 1,
    selectedDancerId: 1
  };
}

function normalizePositions(positions, dancerIds) {
  const ids = Array.isArray(dancerIds)
    ? dancerIds
    : Array.from({ length: dancerIds }, (_, index) => index + 1);
  const fallback = autoPositions(ids);
  const validPositions = Array.isArray(positions)
    ? positions.filter((position) => position && typeof position === "object")
    : [];
  const map = new Map(validPositions.map((position) => [Number(position.dancerId), position]));
  return fallback.map((position) => {
    const existing = map.get(position.dancerId);
    const x = Number(existing?.x);
    const y = Number(existing?.y);
    return {
      dancerId: position.dancerId,
      x: clamp(Number.isFinite(x) ? x : position.x, 4, 96),
      y: clamp(Number.isFinite(y) ? y : position.y, 6, 94)
    };
  });
}

function normalizeTransitions(transitions, formations, dancerIds) {
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
    dancerIds.forEach((dancerId) => {
      const rawPath = transition?.paths?.[dancerId];
      if (!Array.isArray(rawPath)) {
        return;
      }
      paths[dancerId] = rawPath.filter((point) => point && typeof point === "object").map((point) => ({
        x: clamp(Number(point.x) || 0, 4, 96),
        y: clamp(Number(point.y) || 0, 6, 94)
      }));
    });

    normalized[key] = { fromFormationId, toFormationId, paths };
  });

  return normalized;
}

function normalizeProject(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.formations)
    || data.formations.some((formation) => !formation || typeof formation !== "object")) {
    throw new Error("Invalid choreography project");
  }
  const dancerCount = clamp(Math.round(Number(data.dancerCount) || data.dancers?.length || 12), 1, 30);
  const rawDancers = Array.isArray(data.dancers) ? data.dancers.slice(0, dancerCount) : [];
  const usedDancerIds = new Set();
  let nextDancerId = 1;
  const dancers = Array.from({ length: dancerCount }, (_, index) => {
    const dancer = rawDancers[index] || {};
    let id = Number(dancer.id);
    if (!Number.isInteger(id) || id < 1 || usedDancerIds.has(id)) {
      while (usedDancerIds.has(nextDancerId)) nextDancerId += 1;
      id = nextDancerId;
    }
    usedDancerIds.add(id);
    nextDancerId = Math.max(nextDancerId, id + 1);
    return {
      id,
      name: dancer.name || `Dancer ${id}`,
      color: dancer.color || colorPalette[index % colorPalette.length],
      spriteFrame: normalizeSpriteFrame(dancer.spriteFrame, index)
    };
  });
  const dancerIds = dancers.map((dancer) => dancer.id);
  const maximumDancerId = Math.max(...dancerIds, 0);
  const savedNextDancerId = Number(data.nextDancerId);
  const nextDancerIdValue = Number.isInteger(savedNextDancerId) && savedNextDancerId > maximumDancerId
    ? savedNextDancerId
    : maximumDancerId + 1;

  const usedFormationIds = new Set();
  let fallbackFormationId = 1;
  const formations = data.formations.map((formation, index) => {
    let id = Number(formation.id);
    if (!Number.isSafeInteger(id) || id < 1 || usedFormationIds.has(id)) {
      while (usedFormationIds.has(fallbackFormationId)) fallbackFormationId += 1;
      id = fallbackFormationId;
    }
    usedFormationIds.add(id);
    const time = Number(formation.time);
    return {
      id,
      name: formation.name || `Formation ${index + 1}`,
      time: Number.isFinite(time) ? Math.max(0, time) : 0,
      notes: typeof formation.notes === "string" ? formation.notes : "",
      positions: normalizePositions(formation.positions, dancerIds)
    };
  });

  if (!formations.length) throw new Error("Project has no formations");

  const normalized = {
    schemaVersion: SCHEMA_VERSION,
    title: data.title || "Untitled Choreography",
    mediaType: data.mediaType || (data.youtubeVideoId ? "youtube" : "none"),
    youtubeUrl: data.youtubeUrl || "",
    youtubeVideoId: data.youtubeVideoId || "",
    localVideoPath: data.localVideoPath || "",
    localVideoUrl: data.localVideoUrl || "",
    localVideoName: data.localVideoName || "",
    stageView: data.stageView === "3d" ? "3d" : "2d",
    dancerCount,
    nextDancerId: nextDancerIdValue,
    dancers,
    formations,
    transitions: normalizeTransitions(data.transitions, formations, dancerIds),
    bpm: clamp(Number(data.bpm) || 120, 20, 300),
    musicStartOffset: Number.isFinite(Number(data.musicStartOffset))
      ? Math.max(0, Number(data.musicStartOffset)) : 0,
    sections: Array.isArray(data.sections) ? data.sections.filter((section) => section && typeof section === "object").map((section, index) => ({
      id: Number(section.id) || index + 1,
      label: section.label || "Section",
      time: Number.isFinite(Number(section.time)) ? Math.max(0, Number(section.time)) : 0
    })) : [],
    editorSettings: {
      showGrid: data.editorSettings?.showGrid !== false,
      snapToGrid: Boolean(data.editorSettings?.snapToGrid),
      gridSize: clamp(Number(data.editorSettings?.gridSize) || 5, 2, 20)
    },
    panelState: {
      playback: Boolean(data.panelState?.playback),
      formation: Boolean(data.panelState?.formation),
      cues: Boolean(data.panelState?.cues)
    },
    activeFormationId: formations.some((formation) => formation.id === data.activeFormationId)
      ? data.activeFormationId
      : formations[0].id,
    selectedDancerId: dancerIds.includes(Number(data.selectedDancerId))
      ? Number(data.selectedDancerId)
      : (Array.isArray(data.selectedDancerIds) ? data.selectedDancerIds : [])
        .map(Number).find((id) => dancerIds.includes(id)) || dancerIds[0]
  };

  if (normalized.mediaType === "file") {
    normalized.mediaType = "none";
    normalized.localVideoPath = "";
    normalized.localVideoUrl = "";
  }

  nextFormationId = Math.max(...formations.map((formation) => formation.id), 0) + 1;
  return normalized;
}

function loadState() {
  try {
    let saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const legacyKey = Object.keys(window.localStorage)
        .find((key) => key.endsWith("-dance-tool-project"));
      if (legacyKey) {
        saved = window.localStorage.getItem(legacyKey);
        if (saved) window.localStorage.setItem(STORAGE_KEY, saved);
        window.localStorage.removeItem(legacyKey);
      }
    }
    return saved ? normalizeProject(JSON.parse(saved)) : defaultProject();
  } catch {
    return defaultProject();
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

function updateHistoryButtons() {
  elements.undoButton.disabled = history.past.length === 0;
  elements.redoButton.disabled = history.future.length === 0;
}

function commitHistory(before) {
  if (JSON.stringify(before) === JSON.stringify(project)) {
    return false;
  }
  history.record(before);
  saveState();
  updateHistoryButtons();
  return true;
}

function restoreProjectSnapshot(snapshot) {
  project = deepClone(snapshot);
  nextFormationId = Math.max(...project.formations.map((formation) => formation.id), 0) + 1;
  activeTransitionKey = null;
  activeDrag = null;
  isAddingWaypoint = false;
  templatePreview = null;
  saveState();
  render();
}

function undo() {
  const snapshot = history.undo(project);
  if (snapshot) restoreProjectSnapshot(snapshot);
  updateHistoryButtons();
}

function redo() {
  const snapshot = history.redo(project);
  if (snapshot) restoreProjectSnapshot(snapshot);
  updateHistoryButtons();
}

function selectDancer(dancerId, shouldRender = true) {
  if (!project.dancers.some((dancer) => dancer.id === dancerId)) return;
  project.selectedDancerId = dancerId;
  saveState();
  if (shouldRender) render();
  else updateSelectedDancerUi();
}

function applyPanelState() {
  const timelineExpanded = Boolean(project.panelState.cues);
  elements.cuesPanel.classList.toggle("expanded", timelineExpanded);
  elements.toggleCuesButton.textContent = timelineExpanded ? "Show row" : "Show all";
  elements.toggleCuesButton.setAttribute("aria-expanded", String(timelineExpanded));
  elements.toggleCuesButton.setAttribute(
    "aria-label",
    `${timelineExpanded ? "Show row of" : "Show all"} formation cues`
  );
}

function togglePanel(name) {
  project.panelState[name] = !project.panelState[name];
  saveState();
  applyPanelState();
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
  templatePreview = null;
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
  templatePreview = null;
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
  elements.stageSurface.classList.remove("playing");
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

  return timelineCursorTime;
}

function seekCurrentMedia(seconds) {
  const target = Math.max(0, Number(seconds) || 0);
  timelineCursorTime = target;

  if (project.mediaType === "youtube" && youtubePlayer && typeof youtubePlayer.seekTo === "function") {
    youtubePlayer.seekTo(target, true);
  }

  if (project.mediaType === "file" && htmlVideo) {
    htmlVideo.currentTime = target;
  }

  if (project.mediaType === "none") {
    updateCountTimelinePlayhead(target);
  }

  window.setTimeout(() => {
    const time = getCurrentMediaTime();
    syncFormationToTime(time, true);
    animateFormationToTime(time);
    updateCountTimelinePlayhead(project.mediaType === "none" ? target : time);
  }, 150);
}

function syncFormationToTime(time, silent) {
  const ordered = getOrderedFormations();
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
  const ordered = getOrderedFormations();
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

function getOrderedFormations() {
  if (!orderedFormationsCache) {
    orderedFormationsCache = [...project.formations].sort((a, b) => a.time - b.time);
  }
  return orderedFormationsCache;
}

function preparePath(points) {
  if (points.length < 2) {
    return {
      fallback: points[0] || { x: 50, y: 50 },
      segments: [],
      totalLength: 0
    };
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

  return {
    fallback: points[points.length - 1],
    segments,
    totalLength
  };
}

function getPositionAlongPath(path, progress) {
  if (path.totalLength === 0) {
    return path.fallback;
  }

  let remaining = clamp(progress, 0, 1) * path.totalLength;
  for (const segment of path.segments) {
    if (remaining <= segment.length || segment === path.segments[path.segments.length - 1]) {
      const segmentProgress = segment.length === 0 ? 1 : remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * segmentProgress,
        y: segment.start.y + (segment.end.y - segment.start.y) * segmentProgress
      };
    }
    remaining -= segment.length;
  }

  return path.fallback;
}

function getPlaybackPaths(fromFormation, toFormation, transition) {
  const key = getTransitionKey(fromFormation.id, toFormation.id);
  if (playbackPathCache?.key === key) {
    return playbackPathCache.paths;
  }

  const startPositions = new Map(fromFormation.positions.map((position) => [position.dancerId, position]));
  const endPositions = new Map(toFormation.positions.map((position) => [position.dancerId, position]));
  const paths = [];

  project.dancers.forEach((dancer) => {
    const start = startPositions.get(dancer.id);
    const end = endPositions.get(dancer.id);
    const marker = renderedMarkers.get(dancer.id);
    if (!start || !end || !marker) {
      return;
    }

    paths.push({
      dancerId: dancer.id,
      marker,
      base: projectStagePosition(start),
      path: preparePath([start, ...(transition?.paths?.[dancer.id] || []), end])
    });
  });

  playbackPathCache = { key, paths };
  return paths;
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

  const stageWidth = elements.stageSurface.clientWidth;
  const stageHeight = elements.stageSurface.clientHeight;
  getPlaybackPaths(fromFormation, toFormation, transition).forEach((entry) => {
    const currentPosition = getPositionAlongPath(entry.path, progress);
    const projected = projectStagePosition(currentPosition);
    const translateX = ((projected.x - entry.base.x) / 100) * stageWidth;
    const translateY = ((projected.y - entry.base.y) / 100) * stageHeight;
    entry.marker.style.transform = `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0) scale(${projected.scale})`;
    const nextDepth = String(Math.round(currentPosition.y) + 2);
    if (entry.marker.style.zIndex !== nextDepth) {
      entry.marker.style.zIndex = nextDepth;
    }
  });

  const playbackLabel = `${fromFormation.name} to ${toFormation.name} | ${Math.round(progress * 100)}%`;
  if (playbackLabel !== lastPlaybackLabel) {
    elements.activeFormationLabel.textContent = playbackLabel;
    lastPlaybackLabel = playbackLabel;
  }
}

function startPlaybackWatcher() {
  stopPlaybackWatcher();
  elements.stageSurface.classList.add("playing");

  const updatePlayback = () => {
    const time = getCurrentMediaTime();
    const timeLabel = formatTime(time);
    if (timeLabel !== lastTimeLabel) {
      elements.currentTimeLabel.textContent = timeLabel;
      lastTimeLabel = timeLabel;
    }
    syncFormationToTime(time, true);
    animateFormationToTime(time);
    updateCountTimelinePlayhead(time);
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
  const previousVideo = htmlVideo;
  htmlVideo = null;
  if (previousVideo) {
    previousVideo.pause();
    previousVideo.removeAttribute("src");
    previousVideo.load();
  }
  if (activeVideoObjectUrl) {
    URL.revokeObjectURL(activeVideoObjectUrl);
    activeVideoObjectUrl = null;
  }
  elements.playerFrame.innerHTML = "";
}

function renderPlayerPlaceholder(message) {
  clearPlayerFrame();
  elements.playerFrame.innerHTML = `<div class="player-placeholder">${message}</div>`;
}

function loadYouTubeVideoById(videoId) {
  project.mediaType = "youtube";
  project.localVideoPath = "";
  project.localVideoUrl = "";
  project.localVideoName = "";
  saveState();
  clearPlayerFrame();

  if (!youtubeApiReady) {
    pendingYouTubeVideoId = videoId;
    elements.videoStatus.textContent = "Loading YouTube player...";
    elements.playerFrame.innerHTML = '<div class="player-placeholder">Loading YouTube player...</div>';
    ensureYouTubeApi();
    return;
  }

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
        renderCountTimeline();
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
    if (video !== htmlVideo) return;
    elements.videoStatus.textContent = "Playing";
    startPlaybackWatcher();
  });
  video.addEventListener("pause", () => {
    if (video !== htmlVideo) return;
    elements.videoStatus.textContent = "Paused";
    stopPlaybackWatcher();
    const time = getCurrentMediaTime();
    syncFormationToTime(time, true);
    animateFormationToTime(time);
  });
  video.addEventListener("ended", () => {
    if (video !== htmlVideo) return;
    elements.videoStatus.textContent = "Ended";
    stopPlaybackWatcher();
    syncFormationToTime(video.duration, true);
    animateFormationToTime(video.duration);
  });
  video.addEventListener("loadedmetadata", () => {
    if (video !== htmlVideo) return;
    elements.videoStatus.textContent = "Ready";
    elements.currentTimeLabel.textContent = formatTime(video.currentTime);
    renderCountTimeline();
  });
  video.addEventListener("timeupdate", () => {
    if (video !== htmlVideo) return;
    if (playbackTimer) {
      return;
    }
    elements.currentTimeLabel.textContent = formatTime(video.currentTime);
    syncFormationToTime(video.currentTime, true);
    animateFormationToTime(video.currentTime);
    updateCountTimelinePlayhead(video.currentTime);
  });
  video.addEventListener("error", () => {
    if (video === htmlVideo) elements.videoStatus.textContent = "Could not play that video file.";
  });
}

function loadLocalVideo(fileUrl, fileName, filePath) {
  pendingYouTubeVideoId = "";
  project.mediaType = "file";
  project.localVideoUrl = fileUrl;
  project.localVideoName = fileName;
  project.localVideoPath = filePath;
  saveState();

  clearPlayerFrame();
  activeVideoObjectUrl = fileUrl.startsWith("blob:") ? fileUrl : null;
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

function updateSelectedDancerUi() {
  const selectedId = project.selectedDancerId;
  elements.stageSurface.querySelectorAll(".dancer-marker, .transition-node, .path-waypoint").forEach((node) => {
    node.classList.toggle("selected", selectedId === Number(node.dataset.dancerId));
  });

  elements.stageSurface.querySelectorAll(".transition-lines polyline").forEach((node) => {
    node.classList.toggle("selected", selectedId === Number(node.dataset.pathDancerId));
  });

  elements.dancerLegend.querySelectorAll(".legend-row").forEach((node) => {
    node.classList.toggle("active", selectedId === Number(node.dataset.dancerId));
  });
  const dancer = project.dancers.find((item) => item.id === selectedId);
  elements.selectedDancerLabel.textContent = dancer ? `${dancer.name} selected` : "Dancer selected";
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

  selectDancer(dancerId, false);
  const before = deepClone(project);
  let moved = false;
  waypoint.classList.add("dragging");
  waypoint.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    let nextPoint = unprojectStagePointer(moveEvent.clientX, moveEvent.clientY);
    if (project.editorSettings.snapToGrid) nextPoint = snapPosition(nextPoint, project.editorSettings.gridSize);
    point.x = Number(nextPoint.x.toFixed(2));
    point.y = Number(nextPoint.y.toFixed(2));
    moved = true;
    positionStageElement(waypoint, point);
    updateTransitionPathElement(transition, dancerId);
  };

  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    waypoint.classList.remove("dragging");
    if (moved) commitHistory(before);
    else saveState();
    render();
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
  window.addEventListener("pointercancel", stop, { once: true });
}

function beginTransitionEndpointDrag(event) {
  if (event.button !== 0) {
    return;
  }

  event.stopPropagation();
  const node = event.currentTarget;
  const dancerId = Number(node.dataset.dancerId);
  const endpoint = node.dataset.endpoint;
  const transition = getActiveTransition();
  const formationId = endpoint === "start"
    ? transition?.fromFormationId
    : transition?.toFormationId;
  const formation = project.formations.find((item) => item.id === formationId);
  const position = formation?.positions.find((item) => item.dancerId === dancerId);

  if (!transition || !position) {
    return;
  }

  selectDancer(dancerId, false);
  const before = deepClone(project);
  let moved = false;
  node.classList.add("dragging");
  node.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    let nextPosition = unprojectStagePointer(moveEvent.clientX, moveEvent.clientY);
    if (project.editorSettings.snapToGrid) nextPosition = snapPosition(nextPosition, project.editorSettings.gridSize);
    position.x = Number(nextPosition.x.toFixed(2));
    position.y = Number(nextPosition.y.toFixed(2));
    moved = true;
    positionStageElement(node, position);
    updateTransitionPathElement(transition, dancerId);
  };

  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    node.classList.remove("dragging");
    if (moved) commitHistory(before);
    else saveState();
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

  const selectedId = project.selectedDancerId;
  project.dancers.forEach((dancer) => {
    const start = fromFormation.positions.find((position) => position.dancerId === dancer.id);
    const end = toFormation.positions.find((position) => position.dancerId === dancer.id);
    if (!start || !end) {
      return;
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.dataset.pathDancerId = String(dancer.id);
    line.classList.toggle("selected", selectedId === dancer.id);
    line.style.setProperty("--path-color", dancer.color);
    svg.append(line);

    const startNode = document.createElement("button");
    startNode.type = "button";
    startNode.className = `transition-node start-node${selectedId === dancer.id ? " selected" : ""}`;
    startNode.dataset.dancerId = String(dancer.id);
    startNode.dataset.endpoint = "start";
    startNode.style.background = dancer.color;
    startNode.textContent = String(dancer.id);
    startNode.title = `${dancer.name} start`;
    positionStageElement(startNode, start);
    startNode.addEventListener("pointerdown", beginTransitionEndpointDrag);
    startNode.addEventListener("click", () => selectDancer(dancer.id));
    elements.stageSurface.append(startNode);

    const endNode = document.createElement("button");
    endNode.type = "button";
    endNode.className = `transition-node end-node${selectedId === dancer.id ? " selected" : ""}`;
    endNode.dataset.dancerId = String(dancer.id);
    endNode.dataset.endpoint = "end";
    endNode.style.setProperty("--dancer-color", dancer.color);
    endNode.textContent = String(dancer.id);
    endNode.title = `${dancer.name} destination`;
    positionStageElement(endNode, end);
    endNode.addEventListener("pointerdown", beginTransitionEndpointDrag);
    endNode.addEventListener("click", () => selectDancer(dancer.id));
    elements.stageSurface.append(endNode);

    (transition.paths[dancer.id] || []).forEach((point, index) => {
      const waypoint = document.createElement("button");
      waypoint.type = "button";
      waypoint.className = `path-waypoint${selectedId === dancer.id ? " selected" : ""}`;
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
  renderedMarkers = new Map();
  playbackPathCache = null;
  const transition = getActiveTransition();
  if (transition) {
    renderTransitionStage(transition);
    return;
  }

  const is3d = project.stageView === "3d";
  elements.stageSurface.classList.remove("transition-mode");
  elements.stageSurface.classList.toggle("view-3d", is3d);
  elements.stageSurface.classList.toggle("view-2d", !is3d);
  elements.stageSurface.classList.toggle("grid-hidden", !project.editorSettings.showGrid);
  elements.stageSurface.style.setProperty("--editor-grid-size", `${project.editorSettings.gridSize}%`);
  elements.stageSurface.innerHTML = '<div class="stage-caption">Audience</div><div class="upstage-caption">Upstage</div>';

  if (templatePreview) {
    templatePreview.forEach((position) => {
      const marker = document.createElement("span");
      const projected = projectStagePosition(position);
      marker.className = "template-preview-marker";
      marker.style.left = `${projected.x}%`;
      marker.style.top = `${projected.y}%`;
      marker.textContent = String(position.dancerId);
      elements.stageSurface.append(marker);
    });
  }

  const selectedId = project.selectedDancerId;
  formation.positions.forEach((position) => {
    const dancer = project.dancers.find((item) => item.id === position.dancerId);
    const projected = projectStagePosition(position);
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = `dancer-marker${selectedId === dancer.id ? " selected" : ""}`;
    marker.dataset.dancerId = String(dancer.id);
    marker.style.left = `${projected.x}%`;
    marker.style.top = `${projected.y}%`;
    marker.style.background = dancer.color;
    marker.style.setProperty("--marker-scale", projected.scale);
    marker.style.zIndex = String(Math.round(position.y) + 2);
    if (is3d) {
      const frameIndex = dancer.spriteFrame;
      const frameColumn = frameIndex % 4;
      const frameRow = Math.floor(frameIndex / 4);
      marker.classList.add("sprite-marker");
      marker.style.setProperty("--sprite-x", spriteColumns[frameColumn]);
      marker.style.setProperty("--sprite-y", spriteRows[frameRow]);
      const avatar = document.createElement("span");
      avatar.className = "sprite-avatar";
      avatar.setAttribute("aria-hidden", "true");
      const number = document.createElement("span");
      number.className = "marker-number";
      number.style.background = dancer.color;
      number.textContent = String(dancer.id);
      marker.append(avatar, number);
    } else {
      marker.textContent = String(dancer.id);
    }
    marker.title = dancer.name;
    marker.addEventListener("pointerdown", beginMarkerDrag);
    marker.addEventListener("click", (event) => {
      if (suppressNextMarkerClick) {
        suppressNextMarkerClick = false;
        return;
      }
      selectDancer(dancer.id);
    });
    elements.stageSurface.append(marker);
    renderedMarkers.set(dancer.id, marker);
  });
}

function renderLegend() {
  elements.dancerLegend.innerHTML = "";

  project.dancers.forEach((dancer) => {
    const row = document.createElement("div");
    row.className = `legend-row${project.selectedDancerId === dancer.id ? " active" : ""}`;
    row.dataset.dancerId = String(dancer.id);

    const swatch = document.createElement("label");
    swatch.className = "swatch";
    swatch.style.background = dancer.color;
    swatch.title = `Change ${dancer.name}'s color`;
    swatch.addEventListener("pointerdown", (event) => event.stopPropagation());
    swatch.addEventListener("click", (event) => event.stopPropagation());
    const swatchNumber = document.createElement("span");
    swatchNumber.textContent = String(dancer.id);
    const colorInput = document.createElement("input");
    colorInput.className = "dancer-color-input";
    colorInput.type = "color";
    colorInput.value = dancer.color;
    colorInput.setAttribute("aria-label", `Color for ${dancer.name}`);
    colorInput.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      selectDancer(dancer.id, false);
    });
    colorInput.addEventListener("click", (event) => event.stopPropagation());
    colorInput.addEventListener("change", (event) => {
      event.stopPropagation();
      const before = deepClone(project);
      dancer.color = event.target.value.toUpperCase();
      commitHistory(before);
      render();
    });
    swatch.append(swatchNumber, colorInput);

    const details = document.createElement("div");
    details.className = "legend-details";
    const nameInput = document.createElement("input");
    nameInput.className = "dancer-name-input";
    nameInput.type = "text";
    nameInput.maxLength = 40;
    nameInput.value = dancer.name;
    nameInput.setAttribute("aria-label", `Name for dancer ${dancer.id}`);
    nameInput.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      selectDancer(dancer.id, false);
    });
    nameInput.addEventListener("click", (event) => event.stopPropagation());
    nameInput.addEventListener("input", (event) => {
      dancer.name = event.target.value;
      const marker = elements.stageSurface.querySelector(`.dancer-marker[data-dancer-id="${dancer.id}"]`);
      if (marker) {
        marker.title = dancer.name;
      }
      if (project.selectedDancerId === dancer.id) updateSelectedDancerUi();
      saveState();
    });
    nameInput.addEventListener("blur", (event) => {
      const fallbackName = `Dancer ${dancer.id}`;
      dancer.name = event.target.value.trim() || fallbackName;
      event.target.value = dancer.name;
      const marker = elements.stageSurface.querySelector(`.dancer-marker[data-dancer-id="${dancer.id}"]`);
      if (marker) {
        marker.title = dancer.name;
      }
      if (project.selectedDancerId === dancer.id) updateSelectedDancerUi();
      saveState();
    });
    nameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      }
    });

    details.append(nameInput);
    row.append(swatch, details);

    if (project.stageView === "3d") {
      const poseControl = document.createElement("div");
      poseControl.className = "pose-control";
      const poseSelect = document.createElement("select");
      poseSelect.setAttribute("aria-label", `Sprite pose for ${dancer.name}`);
      spritePoseOptions.forEach((pose) => {
        const option = document.createElement("option");
        option.value = String(pose.frame);
        option.textContent = pose.name;
        option.selected = pose.frame === dancer.spriteFrame;
        poseSelect.append(option);
      });
      poseSelect.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        selectDancer(dancer.id, false);
      });
      poseSelect.addEventListener("click", (event) => event.stopPropagation());
      poseSelect.addEventListener("change", (event) => {
        event.stopPropagation();
        const before = deepClone(project);
        dancer.spriteFrame = Number(event.target.value);
        commitHistory(before);
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
  elements.cueCountLabel.textContent = `${orderedFormations.length} ${orderedFormations.length === 1 ? "formation" : "formations"}`;

  orderedFormations.forEach((formation, index) => {
      const card = document.createElement("article");
      card.className = `timeline-card${formation.id === activeFormationId ? " active" : ""}`;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-current", formation.id === activeFormationId ? "true" : "false");
      const time = document.createElement("span");
      time.className = "timeline-card-time";
      time.textContent = formatTime(formation.time);
      const heading = document.createElement("h3");
      heading.textContent = formation.name;
      const note = document.createElement("p");
      note.textContent = formation.notes || "No notes yet.";
      card.append(time, heading, note);
      const activateFormation = () => {
        setActiveFormation(formation.id);
        seekCurrentMedia(formation.time);
      };
      card.addEventListener("click", activateFormation);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateFormation();
        }
      });
      elements.timelineList.append(card);

      const nextFormation = orderedFormations[index + 1];
      if (!nextFormation) {
        return;
      }

      const transition = project.transitions[getTransitionKey(formation.id, nextFormation.id)];
      const mappedDancers = Object.values(transition?.paths || {})
        .filter((path) => Array.isArray(path) && path.length > 0)
        .length;
      const transitionCard = document.createElement("button");
      transitionCard.type = "button";
      transitionCard.className = `transition-card${activeTransitionKey === getTransitionKey(formation.id, nextFormation.id) ? " active" : ""}`;
      const arrow = document.createElement("span");
      arrow.className = "transition-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      const details = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = "Map transition";
      const names = document.createElement("small");
      names.textContent = `${formation.name} to ${nextFormation.name}`;
      const pathCount = document.createElement("small");
      pathCount.textContent = `${mappedDancers} of ${project.dancerCount} paths customized`;
      details.append(title, names, pathCount);
      transitionCard.append(arrow, details);
      transitionCard.addEventListener("click", () => {
        openTransitionEditor(formation.id, nextFormation.id);
      });
      elements.timelineList.append(transitionCard);
    });
}

function updateFormationNote(formation) {
  const note = formation.notes.trim();
  if (noteAnimationFrame) {
    window.cancelAnimationFrame(noteAnimationFrame);
    noteAnimationFrame = null;
  }

  if (!note) {
    displayedNoteFormationId = null;
    elements.formationNoteBanner.classList.remove("visible");
    elements.formationNoteBanner.setAttribute("aria-hidden", "true");
    elements.formationNoteText.textContent = "";
    return;
  }

  const formationChanged = displayedNoteFormationId !== formation.id;
  displayedNoteFormationId = formation.id;
  elements.formationNoteText.textContent = note;
  elements.formationNoteBanner.setAttribute("aria-hidden", "false");

  if (formationChanged) {
    elements.formationNoteBanner.classList.remove("visible");
    noteAnimationFrame = window.requestAnimationFrame(() => {
      if (displayedNoteFormationId === formation.id) {
        elements.formationNoteBanner.classList.add("visible");
      }
      noteAnimationFrame = null;
    });
    return;
  }

  elements.formationNoteBanner.classList.add("visible");
}

function render() {
  orderedFormationsCache = null;
  lastPlaybackLabel = "";
  const activeFormation = getActiveFormation();
  const activeTransition = getActiveTransition();
  elements.projectTitleInput.value = project.title;
  elements.youtubeUrlInput.value = project.youtubeUrl;
  elements.dancerCountInput.value = project.dancerCount;
  elements.formationNameInput.value = activeFormation.name;
  elements.formationTimeInput.value = activeFormation.time.toFixed(1);
  elements.formationNotesInput.value = activeFormation.notes;
  elements.deleteFormationButton.disabled = project.formations.length <= 1;
  elements.deleteFormationButton.title = project.formations.length <= 1
    ? "Keep at least one formation" : "Delete the selected formation";
  elements.bpmInput.value = project.bpm;
  elements.musicOffsetInput.value = project.musicStartOffset;
  elements.showGridInput.checked = project.editorSettings.showGrid;
  elements.snapToGridInput.checked = project.editorSettings.snapToGrid;
  elements.gridSizeInput.value = project.editorSettings.gridSize;
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
  applyPanelState();

  if (activeTransition) {
    const fromFormation = project.formations.find((formation) => formation.id === activeTransition.fromFormationId);
    const toFormation = project.formations.find((formation) => formation.id === activeTransition.toFormationId);
    const selectedDancer = project.dancers.find((dancer) => dancer.id === project.selectedDancerId);
    elements.transitionTitle.textContent = `${fromFormation.name} to ${toFormation.name}`;
    elements.transitionHint.textContent = isAddingWaypoint
      ? `Tap the stage to place a waypoint for ${selectedDancer.name}.`
      : `Selected: ${selectedDancer.name}. Drag the solid start, outlined destination, or any waypoint.`;
  }
  updateMediaSourceLabel();

  renderStage(activeFormation);
  renderLegend();
  renderTimeline(activeFormation.id);
  renderCountTimeline();
  updateFormationNote(activeTransition ? { id: null, notes: "" } : activeFormation);
  updateSelectedDancerUi();
  updateHistoryButtons();
}

function beginMarkerDrag(event) {
  if (event.button !== 0) return;
  event.stopPropagation();
  const dancerId = Number(event.currentTarget.dataset.dancerId);
  const marker = event.currentTarget;
  const activeFormation = getActiveFormation();
  const selectionChanged = project.selectedDancerId !== dancerId;
  selectDancer(dancerId, false);
  const startPointer = unprojectStagePointer(event.clientX, event.clientY);
  const position = activeFormation.positions.find((item) => item.dancerId === dancerId);
  if (!position) return;
  const startPosition = { ...position };
  const before = deepClone(project);

  activeDrag = {
    dancerId,
    marker,
    pointerId: event.pointerId,
    dragMoved: false
  };

  marker.classList.add("dragging");
  activeDrag.marker.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const nextPosition = unprojectStagePointer(moveEvent.clientX, moveEvent.clientY);
    let deltaX = nextPosition.x - startPointer.x;
    let deltaY = nextPosition.y - startPointer.y;
    deltaX = clamp(deltaX, 4 - startPosition.x, 96 - startPosition.x);
    deltaY = clamp(deltaY, 6 - startPosition.y, 94 - startPosition.y);
    let updated = { ...position, x: startPosition.x + deltaX, y: startPosition.y + deltaY };
    if (project.editorSettings.snapToGrid) {
      updated = snapPosition(updated, project.editorSettings.gridSize);
    }
    position.x = Number(updated.x.toFixed(2));
    position.y = Number(updated.y.toFixed(2));
    const projected = projectStagePosition(position);
    marker.style.transform = "";
    marker.style.left = `${projected.x}%`;
    marker.style.top = `${projected.y}%`;
    marker.style.setProperty("--marker-scale", projected.scale);
    marker.style.zIndex = String(Math.round(position.y) + 2);
    activeDrag.dragMoved = Math.hypot(deltaX, deltaY) > 0.15;
  };

  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    const shouldRerender = Boolean(activeDrag?.dragMoved);
    marker.classList.remove("dragging");
    if (shouldRerender) {
      commitHistory(before);
      suppressNextMarkerClick = true;
    } else {
      saveState();
      suppressNextMarkerClick = selectionChanged;
    }
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
  const count = clamp(Math.round(Number(newCount) || 1), 1, 30);
  if (count === project.dancerCount) return;
  const before = deepClone(project);
  const existingDancers = [...project.dancers];
  const nextDancerId = project.nextDancerId;
  const addedDancers = Array.from({ length: Math.max(0, count - existingDancers.length) }, (_, index) => ({
    id: nextDancerId + index,
    name: `Dancer ${nextDancerId + index}`,
    color: colorPalette[(existingDancers.length + index) % colorPalette.length],
    spriteFrame: spritePoseOptions[(existingDancers.length + index) % spritePoseOptions.length].frame
  }));
  project.dancerCount = count;
  project.dancers = [...existingDancers, ...addedDancers].slice(0, count);
  project.nextDancerId += addedDancers.length;
  const dancerIds = project.dancers.map((dancer) => dancer.id);
  project.formations = project.formations.map((formation) => ({
    ...formation,
    positions: normalizePositions(formation.positions, dancerIds)
  }));
  Object.values(project.transitions).forEach((transition) => {
    Object.keys(transition.paths).forEach((id) => {
      if (!dancerIds.includes(Number(id))) delete transition.paths[id];
    });
  });
  if (!dancerIds.includes(project.selectedDancerId)) project.selectedDancerId = dancerIds[0];
  commitHistory(before);
  render();
}

function addFormation() {
  const before = deepClone(project);
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
  commitHistory(before);
  render();
}

function duplicateFormation() {
  const before = deepClone(project);
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
  commitHistory(before);
  render();
}

function deleteFormation() {
  if (project.formations.length === 1) {
    return;
  }

  const before = deepClone(project);
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
  commitHistory(before);
  render();
}

function setCurrentFormationTimeFromMedia() {
  const before = deepClone(project);
  getActiveFormation().time = Number(getCurrentMediaTime().toFixed(1));
  commitHistory(before);
  render();
}

function deleteSelectedDancer() {
  const dancerId = project.selectedDancerId;
  if (project.dancers.length <= 1) {
    window.alert("A project must keep at least one dancer.");
    return;
  }
  const dancer = project.dancers.find((item) => item.id === dancerId);
  if (!window.confirm(`Delete ${dancer.name} from every formation?`)) return;
  const before = deepClone(project);
  project.dancers = project.dancers.filter((item) => item.id !== dancerId);
  project.dancerCount = project.dancers.length;
  project.formations.forEach((formation) => {
    formation.positions = formation.positions.filter((position) => position.dancerId !== dancerId);
  });
  Object.values(project.transitions).forEach((transition) => {
    delete transition.paths[dancerId];
  });
  project.selectedDancerId = project.dancers[0].id;
  commitHistory(before);
  render();
}

function previewFormationTemplate() {
  const dancerIds = project.dancers.map((dancer) => dancer.id);
  templatePreview = createTemplatePositions(elements.formationTemplateSelect.value, dancerIds);
  renderStage(getActiveFormation());
}

function applyFormationTemplate() {
  const dancerIds = project.dancers.map((dancer) => dancer.id);
  const before = deepClone(project);
  getActiveFormation().positions = applyTemplate(
    getActiveFormation().positions,
    dancerIds,
    elements.formationTemplateSelect.value
  );
  templatePreview = null;
  commitHistory(before);
  render();
}

function getMediaDuration() {
  const mediaDuration = project.mediaType === "file"
    ? Number(htmlVideo?.duration)
    : Number(youtubePlayer?.getDuration?.());
  const lastCue = Math.max(...project.formations.map((formation) => formation.time), 0);
  const lastSection = Math.max(...project.sections.map((section) => section.time), 0);
  const musicalTail = secondsPerBeat(project.bpm) * 8;
  return Math.max(
    Number.isFinite(mediaDuration) ? mediaDuration : 0,
    lastCue + musicalTail,
    lastSection + musicalTail,
    project.musicStartOffset + musicalTail,
    60
  );
}

function updateCountTimelinePlayhead(time) {
  const safeTime = clamp(Number(time) || 0, 0, timelineDuration);
  elements.timelinePlayhead.style.left = `${(safeTime / timelineDuration) * 100}%`;
  elements.currentCountLabel.textContent = countInfo(safeTime, project.bpm, project.musicStartOffset).label;
  const segment = getPlaybackSegment(safeTime);
  elements.timelineActiveLabel.textContent = `Active: ${segment?.fromFormation?.name || "none"}`;
  elements.timelineNextLabel.textContent = `Next: ${segment?.toFormation?.name || "none"}`;
}

function beginCueDrag(event, formation) {
  if (event.button !== 0) return;
  event.stopPropagation();
  const before = deepClone(project);
  const bounds = elements.countTimelineTrack.getBoundingClientRect();
  let moved = false;
  const move = (moveEvent) => {
    const ratio = clamp((moveEvent.clientX - bounds.left) / bounds.width, 0, 1);
    formation.time = Number((ratio * timelineDuration).toFixed(2));
    moved = true;
    renderCountTimeline();
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    if (moved) {
      project.activeFormationId = formation.id;
      commitHistory(before);
      seekCurrentMedia(formation.time);
      render();
    }
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
  window.addEventListener("pointercancel", stop, { once: true });
}

function renderCountTimeline() {
  timelineDuration = getMediaDuration();
  timelineBeatDuration = secondsPerBeat(project.bpm);
  timelineBeatCount = Math.max(8, Math.ceil((timelineDuration - project.musicStartOffset) / timelineBeatDuration));
  timelineTrackWidth = Math.max(elements.countTimelineViewport.clientWidth || 720, timelineBeatCount * 26);
  elements.countTimelineTrack.style.width = `${timelineTrackWidth}px`;
  renderedBeatRange = "";
  renderVisibleCountBeats();
  elements.sectionMarkers.innerHTML = "";
  elements.formationCueMarkers.innerHTML = "";

  project.sections.forEach((section) => {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "section-marker";
    marker.style.left = `${(section.time / timelineDuration) * 100}%`;
    marker.textContent = section.label;
    marker.title = `${section.label} at ${formatTime(section.time)}`;
    marker.addEventListener("click", (event) => {
      event.stopPropagation();
      seekCurrentMedia(section.time);
    });
    elements.sectionMarkers.append(marker);
  });

  getOrderedFormations().forEach((formation) => {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = `formation-cue-marker${formation.id === project.activeFormationId ? " active" : ""}`;
    marker.style.left = `${(formation.time / timelineDuration) * 100}%`;
    marker.textContent = formation.name;
    marker.title = `${formation.name} · ${formatTime(formation.time)} · drag to retime`;
    marker.addEventListener("pointerdown", (event) => beginCueDrag(event, formation));
    marker.addEventListener("click", (event) => {
      event.stopPropagation();
      project.activeFormationId = formation.id;
      seekCurrentMedia(formation.time);
      render();
    });
    elements.formationCueMarkers.append(marker);
  });
  updateCountTimelinePlayhead(getCurrentMediaTime());
}

function renderVisibleCountBeats() {
  const viewport = elements.countTimelineViewport;
  const startTime = (viewport.scrollLeft / timelineTrackWidth) * timelineDuration;
  const endTime = ((viewport.scrollLeft + viewport.clientWidth) / timelineTrackWidth) * timelineDuration;
  const firstBeat = clamp(Math.floor((startTime - project.musicStartOffset) / timelineBeatDuration) - 2, 0, timelineBeatCount);
  const lastBeat = clamp(Math.ceil((endTime - project.musicStartOffset) / timelineBeatDuration) + 2, 0, timelineBeatCount);
  const range = `${firstBeat}:${lastBeat}`;
  if (range === renderedBeatRange) return;
  renderedBeatRange = range;

  const cells = document.createDocumentFragment();
  for (let beat = firstBeat; beat < lastBeat; beat += 1) {
    const cell = document.createElement("span");
    cell.className = `count-beat${beat % 8 === 0 ? " group-start" : ""}`;
    cell.style.left = `${((project.musicStartOffset + beat * timelineBeatDuration) / timelineDuration) * 100}%`;
    cell.style.width = `${(timelineBeatDuration / timelineDuration) * 100}%`;
    cell.textContent = String((beat % 8) + 1);
    cell.title = `8-count ${Math.floor(beat / 8) + 1}, count ${(beat % 8) + 1}`;
    cells.append(cell);
  }
  elements.countTimelineGroups.replaceChildren(cells);
}

function addFormationAtPlayhead() {
  const before = deepClone(project);
  const current = getActiveFormation();
  const formation = {
    id: nextFormationId++,
    name: `Formation ${project.formations.length + 1}`,
    time: Number(getCurrentMediaTime().toFixed(2)),
    notes: "",
    positions: current.positions.map((position) => ({ ...position }))
  };
  project.formations.push(formation);
  project.activeFormationId = formation.id;
  commitHistory(before);
  render();
}

async function saveProjectToDisk() {
  const portableProject = JSON.parse(JSON.stringify(project));
  if (portableProject.mediaType === "file") {
    portableProject.mediaType = "none";
    portableProject.localVideoPath = "";
    portableProject.localVideoUrl = "";
    portableProject.localVideoName = "";
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

  try {
    const response = await window.desktopApi.saveProject(portableProject);
    if (!response.canceled && response.filePath) {
      elements.videoStatus.textContent = `Saved ${response.filePath.split(/[/\\]/).pop()}`;
    }
  } catch {
    elements.videoStatus.textContent = "Could not save that JSON project.";
  }
}

function applyLoadedProject(data) {
  const loadedProject = normalizeProject(data);
  renderPlayerPlaceholder("Paste a YouTube link or open a local MP4 rehearsal video.");
  project = loadedProject;
  pendingYouTubeVideoId = "";
  history.clear();
  timelineCursorTime = 0;
  saveState();
  render();

  if (project.mediaType === "youtube" && project.youtubeVideoId) {
    pendingYouTubeVideoId = project.youtubeVideoId;
    loadYouTubeVideoById(project.youtubeVideoId);
  } else if (project.localVideoName) {
    elements.videoStatus.textContent = "Re-select the local video on this device.";
  }
}

async function loadProjectFromDisk() {
  if (!window.desktopApi?.loadProject) {
    elements.projectFileInput.value = "";
    elements.projectFileInput.click();
    return;
  }

  try {
    const response = await window.desktopApi.loadProject();
    if (response.canceled || !response.data) return;
    applyLoadedProject(response.data);
  } catch {
    elements.videoStatus.textContent = "Could not open that JSON project.";
  }
}

function createFreshProject() {
  renderPlayerPlaceholder("Paste a YouTube link or open a local MP4 rehearsal video.");
  project = defaultProject();
  pendingYouTubeVideoId = "";
  history.clear();
  timelineCursorTime = 0;
  saveState();
  render();
  elements.videoStatus.textContent = "No video loaded";
}

function setFileMenuOpen(open) {
  elements.fileMenu.classList.toggle("hidden", !open);
  elements.fileMenuButton.setAttribute("aria-expanded", String(open));
}

function openHelpDialog() {
  setFileMenuOpen(false);
  document.body.classList.add("help-open");
  if (typeof elements.helpDialog.showModal === "function") {
    elements.helpDialog.showModal();
  } else {
    elements.helpDialog.setAttribute("open", "");
  }
}

function closeHelpDialog() {
  if (typeof elements.helpDialog.close === "function") {
    elements.helpDialog.close();
  } else {
    elements.helpDialog.removeAttribute("open");
    document.body.classList.remove("help-open");
    elements.helpButton.focus();
  }
}

function applyTheme(theme, persist = true) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalizedTheme;
  const isDark = normalizedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  elements.themeToggleButton.setAttribute("aria-checked", String(isDark));
  elements.themeToggleButton.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
  elements.themeToggleButton.title = `Switch to ${nextTheme} mode`;
  elements.themeColorMeta.setAttribute("content", isDark ? "#0D111A" : "#F3F5F9");
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    } catch {}
  }
}

elements.projectTitleInput.addEventListener("input", (event) => {
  project.title = event.target.value;
  saveState();
});

elements.toggleCuesButton.addEventListener("click", () => togglePanel("cues"));
elements.helpButton.addEventListener("click", openHelpDialog);
elements.helpCloseButton.addEventListener("click", closeHelpDialog);
elements.helpStartButton.addEventListener("click", closeHelpDialog);
elements.helpDialog.addEventListener("click", (event) => {
  if (event.target === elements.helpDialog) closeHelpDialog();
});
elements.helpDialog.addEventListener("close", () => {
  document.body.classList.remove("help-open");
  elements.helpButton.focus();
});
elements.themeToggleButton.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});
elements.fileMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  setFileMenuOpen(elements.fileMenu.classList.contains("hidden"));
});
elements.fileMenu.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", () => setFileMenuOpen(false));
document.addEventListener("keydown", (event) => {
  if (elements.helpDialog.open) return;
  if (event.key === "Escape" && !elements.fileMenu.classList.contains("hidden")) {
    setFileMenuOpen(false);
    elements.fileMenuButton.focus();
  }
  const isTyping = event.target.matches?.("input, textarea, select, [contenteditable='true']");
  const modifier = event.metaKey || event.ctrlKey;
  if (!isTyping && modifier && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  } else if (!isTyping && event.ctrlKey && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
  } else if (!isTyping && (event.key === "Delete" || event.key === "Backspace")) {
    event.preventDefault();
    deleteSelectedDancer();
  }
});

elements.undoButton.addEventListener("click", undo);
elements.redoButton.addEventListener("click", redo);

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

  try {
    const response = await window.desktopApi.pickVideoFile();
    if (response.canceled) return;
    loadLocalVideo(response.fileUrl, response.fileName, response.filePath);
    updateMediaSourceLabel();
  } catch {
    elements.videoStatus.textContent = "Could not open that video file.";
  }
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
  const before = deepClone(project);
  getActiveFormation().time = Math.max(0, Number(event.target.value) || 0);
  commitHistory(before);
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
  const before = deepClone(project);
  delete transition.paths[project.selectedDancerId];
  isAddingWaypoint = false;
  commitHistory(before);
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
  const before = deepClone(project);
  const point = unprojectStagePointer(event.clientX, event.clientY);
  const snappedPoint = project.editorSettings.snapToGrid
    ? snapPosition(point, project.editorSettings.gridSize)
    : point;
  if (!transition.paths[dancerId]) {
    transition.paths[dancerId] = [];
  }
  transition.paths[dancerId].push({
    x: Number(snappedPoint.x.toFixed(2)),
    y: Number(snappedPoint.y.toFixed(2))
  });
  isAddingWaypoint = false;
  commitHistory(before);
  render();
});

elements.deleteSelectedDancerButton.addEventListener("click", deleteSelectedDancer);
elements.previewTemplateButton.addEventListener("click", previewFormationTemplate);
elements.applyTemplateButton.addEventListener("click", applyFormationTemplate);
elements.formationTemplateSelect.addEventListener("change", () => {
  if (templatePreview) previewFormationTemplate();
});
elements.showGridInput.addEventListener("change", (event) => {
  project.editorSettings.showGrid = event.target.checked;
  saveState();
  renderStage(getActiveFormation());
});
elements.snapToGridInput.addEventListener("change", (event) => {
  project.editorSettings.snapToGrid = event.target.checked;
  saveState();
});
elements.gridSizeInput.addEventListener("change", (event) => {
  project.editorSettings.gridSize = clamp(Number(event.target.value) || 5, 2, 20);
  saveState();
  render();
});

elements.bpmInput.addEventListener("change", (event) => {
  const before = deepClone(project);
  project.bpm = clamp(Number(event.target.value) || 120, 20, 300);
  commitHistory(before);
  render();
});
elements.musicOffsetInput.addEventListener("change", (event) => {
  const before = deepClone(project);
  project.musicStartOffset = Math.max(0, Number(event.target.value) || 0);
  commitHistory(before);
  render();
});
elements.addSectionButton.addEventListener("click", () => {
  const before = deepClone(project);
  project.sections.push({
    id: Math.max(...project.sections.map((section) => section.id), 0) + 1,
    label: elements.sectionLabelSelect.value,
    time: Number(getCurrentMediaTime().toFixed(2))
  });
  commitHistory(before);
  render();
});
elements.addFormationAtPlayheadButton.addEventListener("click", addFormationAtPlayhead);
elements.countTimelineViewport.addEventListener("scroll", () => {
  if (beatRenderFrame !== null) return;
  beatRenderFrame = window.requestAnimationFrame(() => {
    beatRenderFrame = null;
    renderVisibleCountBeats();
  });
});
window.addEventListener("resize", renderCountTimeline);
elements.countTimelineTrack.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest("button")) return;
  const bounds = elements.countTimelineTrack.getBoundingClientRect();
  const scrub = (scrubEvent) => {
    const ratio = clamp((scrubEvent.clientX - bounds.left) / bounds.width, 0, 1);
    seekCurrentMedia(ratio * timelineDuration);
  };
  scrub(event);
  window.addEventListener("pointermove", scrub);
  window.addEventListener("pointerup", () => window.removeEventListener("pointermove", scrub), { once: true });
});
elements.duplicateFormationButton.addEventListener("click", duplicateFormation);
elements.deleteFormationButton.addEventListener("click", deleteFormation);
elements.captureTimestampButton.addEventListener("click", setCurrentFormationTimeFromMedia);
elements.saveProjectButton.addEventListener("click", () => {
  setFileMenuOpen(false);
  saveProjectToDisk();
});
elements.loadProjectButton.addEventListener("click", () => {
  setFileMenuOpen(false);
  loadProjectFromDisk();
});
elements.newProjectButton.addEventListener("click", () => {
  setFileMenuOpen(false);
  createFreshProject();
});

applyTheme(document.documentElement.dataset.theme, false);
render();

if (project.mediaType === "youtube" && project.youtubeVideoId) {
  loadYouTubeVideoById(project.youtubeVideoId);
} else if (project.mediaType === "file" && project.localVideoUrl) {
  loadLocalVideo(project.localVideoUrl, project.localVideoName, project.localVideoPath);
} else {
  renderPlayerPlaceholder("Paste a YouTube link or open a local MP4 rehearsal video.");
}
