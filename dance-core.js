(function initDanceCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.DanceCore = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const SCHEMA_VERSION = 2;
  const STAGE_BOUNDS = Object.freeze({ minX: 4, maxX: 96, minY: 6, maxY: 94 });

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const deepClone = (value) => JSON.parse(JSON.stringify(value));

  function snapValue(value, step, min, max) {
    const gridStep = Math.max(0.5, Number(step) || 5);
    return clamp(Math.round(value / gridStep) * gridStep, min, max);
  }

  function snapPosition(position, step = 5) {
    return {
      ...position,
      x: snapValue(Number(position.x), step, STAGE_BOUNDS.minX, STAGE_BOUNDS.maxX),
      y: snapValue(Number(position.y), step, STAGE_BOUNDS.minY, STAGE_BOUNDS.maxY)
    };
  }

  function spread(index, count, start, end) {
    return count <= 1 ? (start + end) / 2 : start + ((end - start) * index) / (count - 1);
  }

  function templatePoint(template, index, count) {
    const t = count <= 1 ? 0.5 : index / (count - 1);
    switch (template) {
      case "horizontal-line":
        return { x: spread(index, count, 14, 86), y: 50 };
      case "vertical-line":
        return { x: 50, y: spread(index, count, 14, 86) };
      case "v":
        return { x: spread(index, count, 16, 84), y: 24 + (1 - Math.abs(t * 2 - 1)) * 56 };
      case "inverted-v":
        return { x: spread(index, count, 16, 84), y: 80 - (1 - Math.abs(t * 2 - 1)) * 56 };
      case "circle": {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(count, 1);
        return { x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 34 };
      }
      case "semicircle": {
        const angle = Math.PI + Math.PI * t;
        return { x: 50 + Math.cos(angle) * 36, y: 56 + Math.sin(angle) * 34 };
      }
      case "diagonal-line":
        return { x: spread(index, count, 18, 82), y: spread(index, count, 18, 82) };
      case "staggered-rows": {
        const columns = Math.min(5, Math.ceil(Math.sqrt(count)));
        const rows = Math.ceil(count / columns);
        const row = Math.floor(index / columns);
        const column = index % columns;
        const rowCount = Math.min(columns, count - row * columns);
        const offset = row % 2 === 0 ? -5 : 5;
        return {
          x: clamp(spread(column, rowCount, 20, 80) + offset, 12, 88),
          y: spread(row, rows, 22, 78)
        };
      }
      case "two-lines": {
        const firstLineCount = Math.ceil(count / 2);
        const row = index < firstLineCount ? 0 : 1;
        const column = row === 0 ? index : index - firstLineCount;
        const rowCount = row === 0 ? firstLineCount : count - firstLineCount;
        return { x: spread(column, rowCount, 18, 82), y: row === 0 ? 36 : 64 };
      }
      case "grid":
      default: {
        const columns = Math.min(6, Math.ceil(Math.sqrt(count)));
        const rows = Math.ceil(count / columns);
        const row = Math.floor(index / columns);
        const column = index % columns;
        const rowCount = Math.min(columns, count - row * columns);
        return {
          x: spread(column, rowCount, 18, 82),
          y: spread(row, rows, 20, 80)
        };
      }
    }
  }

  function createTemplatePositions(template, dancerIds) {
    const ids = [...new Set((dancerIds || []).map(Number).filter(Number.isFinite))];
    return ids.map((dancerId, index) => {
      const point = templatePoint(template, index, ids.length);
      return {
        dancerId,
        x: Number(clamp(point.x, STAGE_BOUNDS.minX, STAGE_BOUNDS.maxX).toFixed(2)),
        y: Number(clamp(point.y, STAGE_BOUNDS.minY, STAGE_BOUNDS.maxY).toFixed(2))
      };
    });
  }

  function applyTemplate(positions, dancerIds, template) {
    const generated = new Map(
      createTemplatePositions(template, dancerIds).map((position) => [position.dancerId, position])
    );
    return positions.map((position) => generated.has(position.dancerId)
      ? { ...position, ...generated.get(position.dancerId) }
      : { ...position });
  }

  function alignPositions(positions, dancerIds, mode) {
    const selected = new Set((dancerIds || []).map(Number));
    const next = positions.map((position) => ({ ...position }));
    const targets = next.filter((position) => selected.has(position.dancerId));
    if (targets.length < 2) {
      return next;
    }

    const xs = targets.map((position) => position.x);
    const ys = targets.map((position) => position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const averageX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
    const averageY = ys.reduce((sum, value) => sum + value, 0) / ys.length;

    if (mode === "distribute-horizontal") {
      [...targets].sort((a, b) => a.x - b.x).forEach((position, index, ordered) => {
        position.x = spread(index, ordered.length, minX, maxX);
      });
    } else if (mode === "distribute-vertical") {
      [...targets].sort((a, b) => a.y - b.y).forEach((position, index, ordered) => {
        position.y = spread(index, ordered.length, minY, maxY);
      });
    } else {
      targets.forEach((position) => {
        if (mode === "left") position.x = minX;
        if (mode === "right") position.x = maxX;
        if (mode === "top") position.y = minY;
        if (mode === "bottom") position.y = maxY;
        if (mode === "center-vertical") position.x = averageX;
        if (mode === "center-horizontal") position.y = averageY;
      });
    }

    return next.map((position) => ({
      ...position,
      x: Number(clamp(position.x, STAGE_BOUNDS.minX, STAGE_BOUNDS.maxX).toFixed(2)),
      y: Number(clamp(position.y, STAGE_BOUNDS.minY, STAGE_BOUNDS.maxY).toFixed(2))
    }));
  }

  function secondsPerBeat(bpm) {
    return 60 / clamp(Number(bpm) || 120, 20, 300);
  }

  function countInfo(time, bpm, offset = 0) {
    const elapsed = Number(time) - Number(offset || 0);
    const beatDuration = secondsPerBeat(bpm);
    if (elapsed < 0) {
      return { beatIndex: -1, count: 0, group: 0, label: "Pre-roll" };
    }
    const beatIndex = Math.floor(elapsed / beatDuration);
    const count = (beatIndex % 8) + 1;
    const group = Math.floor(beatIndex / 8) + 1;
    return { beatIndex, count, group, label: `8-count ${group} · ${count}` };
  }

  function dancerInitial(name) {
    const first = Array.from(String(name || "").trim())[0] || "";
    return Array.from(first.toLocaleUpperCase())[0] || "?";
  }

  function transitionTiming(fromTime, toTime, startDelay = 0) {
    const start = Number(fromTime);
    const end = Number(toTime);
    const interval = Math.max(0, end - start);
    const maxDelay = Math.max(0, Math.floor((interval - 0.1) * 10 + 1e-8) / 10);
    const requestedDelay = Number(startDelay);
    const delay = clamp(Number.isFinite(requestedDelay) ? requestedDelay : 0, 0, maxDelay);
    return { delay, maxDelay, startTime: start + delay };
  }

  function transitionProgress(time, fromTime, toTime, startDelay = 0) {
    const { startTime } = transitionTiming(fromTime, toTime, startDelay);
    const duration = Math.max(Number(toTime) - startTime, 0.01);
    return clamp((Number(time) - startTime) / duration, 0, 1);
  }

  class HistoryStack {
    constructor(limit = 100) {
      this.limit = limit;
      this.past = [];
      this.future = [];
    }

    record(snapshot) {
      this.past.push(deepClone(snapshot));
      if (this.past.length > this.limit) this.past.shift();
      this.future = [];
    }

    undo(current) {
      if (!this.past.length) return null;
      this.future.push(deepClone(current));
      return this.past.pop();
    }

    redo(current) {
      if (!this.future.length) return null;
      this.past.push(deepClone(current));
      return this.future.pop();
    }

    clear() {
      this.past = [];
      this.future = [];
    }
  }

  return {
    SCHEMA_VERSION,
    STAGE_BOUNDS,
    HistoryStack,
    alignPositions,
    applyTemplate,
    clamp,
    countInfo,
    createTemplatePositions,
    dancerInitial,
    deepClone,
    secondsPerBeat,
    snapPosition,
    transitionProgress,
    transitionTiming
  };
}));
