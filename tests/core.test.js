const assert = require("node:assert/strict");
const test = require("node:test");
const {
  HistoryStack,
  alignPositions,
  applyTemplate,
  countInfo,
  createTemplatePositions,
  dancerInitial,
  secondsPerBeat,
  snapPosition,
  transitionProgress,
  transitionTiming
} = require("../dance-core.js");

const ids = Array.from({ length: 30 }, (_, index) => index + 1);

test("all formation templates support 30 stable dancer IDs within stage bounds", () => {
  const templates = [
    "horizontal-line", "vertical-line", "v", "inverted-v", "circle",
    "semicircle", "diagonal-line", "grid", "staggered-rows", "two-lines"
  ];
  templates.forEach((template) => {
    const positions = createTemplatePositions(template, ids);
    assert.equal(positions.length, 30);
    assert.deepEqual(positions.map((position) => position.dancerId), ids);
    positions.forEach(({ x, y }) => {
      assert.ok(x >= 4 && x <= 96);
      assert.ok(y >= 6 && y <= 94);
    });
  });
});

test("templates modify only selected dancers", () => {
  const positions = ids.slice(0, 4).map((dancerId) => ({ dancerId, x: 10, y: 10 }));
  const result = applyTemplate(positions, [2, 4], "vertical-line");
  assert.deepEqual(result.find(({ dancerId }) => dancerId === 1), positions[0]);
  assert.equal(result.find(({ dancerId }) => dancerId === 2).x, 50);
  assert.equal(result.find(({ dancerId }) => dancerId === 4).x, 50);
});

test("alignment and distribution preserve IDs and boundaries", () => {
  const positions = [
    { dancerId: 4, x: 20, y: 15 },
    { dancerId: 9, x: 65, y: 50 },
    { dancerId: 12, x: 90, y: 80 }
  ];
  const aligned = alignPositions(positions, [4, 9, 12], "center-horizontal");
  assert.ok(aligned.every((position) => position.y === aligned[0].y));
  const distributed = alignPositions(positions, [4, 9, 12], "distribute-horizontal");
  assert.deepEqual(distributed.map(({ dancerId }) => dancerId), [4, 9, 12]);
  assert.deepEqual(distributed.map(({ x }) => x), [20, 55, 90]);
});

test("grid snapping clamps coordinates to the valid stage", () => {
  assert.deepEqual(snapPosition({ dancerId: 7, x: 98, y: 2 }, 5), { dancerId: 7, x: 96, y: 6 });
  assert.deepEqual(snapPosition({ x: 43, y: 57 }, 5), { x: 45, y: 55 });
});

test("8-count math respects BPM and music offset", () => {
  assert.equal(secondsPerBeat(120), 0.5);
  assert.equal(countInfo(2, 120, 2).label, "8-count 1 · 1");
  assert.equal(countInfo(5.5, 120, 2).label, "8-count 1 · 8");
  assert.equal(countInfo(6, 120, 2).label, "8-count 2 · 1");
  assert.equal(countInfo(1, 120, 2).label, "Pre-roll");
});

test("dancer labels use first and last name initials when separated by whitespace", () => {
  assert.equal(dancerInitial("John Smith"), "JS");
  assert.equal(dancerInitial("  Maya   Chen  "), "MC");
  assert.equal(dancerInitial("Ana Maria Lopez"), "AL");
  assert.equal(dancerInitial("john\tsmith"), "JS");
  assert.equal(dancerInitial("élise"), "É");
  assert.equal(dancerInitial("ßeta"), "S");
  assert.equal(dancerInitial(""), "?");
  assert.equal(dancerInitial("   "), "?");
});

test("transition delay holds the first formation and still arrives at the next cue", () => {
  assert.equal(transitionProgress(4, 0, 8), 0.5);
  assert.equal(transitionProgress(4, 0, 8, 4), 0);
  assert.equal(transitionProgress(6, 0, 8, 4), 0.5);
  assert.equal(transitionProgress(8, 0, 8, 4), 1);
  assert.equal(transitionTiming(0, 8, 20).delay, 7.9);
  assert.equal(transitionTiming(0, 8.05, 20).delay, 7.9);
  assert.equal(transitionProgress(8, 0, 8, 20), 1);
});

test("history undo and redo restore immutable snapshots", () => {
  const history = new HistoryStack();
  const first = { formations: [{ time: 0 }] };
  const second = { formations: [{ time: 4 }] };
  history.record(first);
  const undone = history.undo(second);
  assert.deepEqual(undone, first);
  undone.formations[0].time = 99;
  assert.deepEqual(history.redo(first), second);
});
