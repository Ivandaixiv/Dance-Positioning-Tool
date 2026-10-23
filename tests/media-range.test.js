const assert = require("node:assert/strict");
const test = require("node:test");
const { parseByteRange } = require("../media-range.js");

test("video ranges support open-ended and suffix requests", () => {
  assert.deepEqual(parseByteRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(parseByteRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange("bytes=-200", 100), { start: 0, end: 99 });
  assert.deepEqual(parseByteRange("bytes=90-200", 100), { start: 90, end: 99 });
});

test("invalid video ranges are rejected", () => {
  for (const header of ["bytes=", "bytes=100-", "bytes=20-10", "bytes=-0", "bytes=0-1,4-5", "items=0-1"]) {
    assert.equal(parseByteRange(header, 100), null, header);
  }
  assert.equal(parseByteRange("bytes=0-", 0), null);
});
