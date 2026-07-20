const assert = require("assert");

require("../data.js");
const { formatDateKey, normalizeDailyStats } = require("../scripts.js");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function hostileObject() {
  return {
    toString: "not callable",
    valueOf: "not callable",
  };
}

test("normalizeDailyStats carries forward provided values", () => {
  const sample = {
    date: "2025-10-11",
    counts: {
      chords: { correct: 3, incorrect: 1 },
      progressions: { correct: 2, incorrect: 5 },
    },
  };
  const normalized = normalizeDailyStats(sample, "2024-01-01");
  assert.strictEqual(normalized.date, "2025-10-11");
  assert.deepStrictEqual(normalized.counts.chords, {
    correct: 3,
    incorrect: 1,
  });
  assert.deepStrictEqual(normalized.counts.progressions, {
    correct: 2,
    incorrect: 5,
  });
  assert.deepStrictEqual(normalized.counts.songs, {
    correct: 0,
    incorrect: 0,
  });
  assert.deepStrictEqual(normalized.counts.degrees, {
    correct: 0,
    incorrect: 0,
  });
});

test("normalizeDailyStats falls back to fresh date and sanitizes values", () => {
  const normalized = normalizeDailyStats(
    {
      date: "",
      counts: { chords: { correct: -5, incorrect: "bad" } },
    },
    "2026-02-03",
  );
  assert.strictEqual(normalized.date, "2026-02-03");
  assert.deepStrictEqual(normalized.counts.chords, {
    correct: 0,
    incorrect: 0,
  });
});

test("normalizeDailyStats handles hostile counter values", () => {
  const normalized = normalizeDailyStats(
    {
      date: "2026-04-05",
      counts: {
        chords: {
          correct: hostileObject(),
          incorrect: hostileObject(),
        },
      },
    },
    "2026-02-03",
  );
  assert.strictEqual(normalized.date, "2026-04-05");
  assert.deepStrictEqual(normalized.counts.chords, {
    correct: 0,
    incorrect: 0,
  });
});

test("formatDateKey formats provided dates", () => {
  const date = new Date(2025, 0, 5); // Jan 5 2025 local time
  assert.strictEqual(formatDateKey(date), "2025-01-05");
});

let passed = 0;
let failed = 0;
tests.forEach(({ name, fn }) => {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
});

if (failed) {
  throw new Error(`${failed} test${failed === 1 ? "" : "s"} failed.`);
} else {
  console.log(`${passed} tests passed.`);
}
