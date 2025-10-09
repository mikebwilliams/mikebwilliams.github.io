const assert = require("assert");
const data = require("../data.js");

const { voicingUtils, noteValues } = data;
const {
  buildIntervalFlow,
  buildAscendingMidiSequence,
  buildVoicingOrders,
  matchesVoicingOrderSorted,
  computeShellVoicing,
  generateNotesFromChordName,
  normalizePitchClass,
} = voicingUtils;

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assertSequenceEqual(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
}

test("buildIntervalFlow returns mapped note when step is zero", () => {
  const flow = buildIntervalFlow(noteValues.C, 0, "sharp");
  assertSequenceEqual(flow, ["C"], "zero-step flow should return mapped pitch");

  const flowWithLabel = buildIntervalFlow(noteValues.C, 0, "sharp", "Start");
  assertSequenceEqual(flowWithLabel, ["Start"], "start label should override");
});

test("buildIntervalFlow honors sharp preference for ascending whole steps", () => {
  const flow = buildIntervalFlow(noteValues.C, 2, "sharp", "C");
  assertSequenceEqual(
    flow,
    ["C", "D", "E", "F#", "G#", "A#"],
    "ascending whole-step cycle should prefer sharps",
  );
});

test("buildIntervalFlow honors flat preference and negative steps", () => {
  const flow = buildIntervalFlow(noteValues.C, -2, "flat", "C");
  assertSequenceEqual(
    flow,
    ["C", "Bb", "Ab", "Gb", "E", "D"],
    "descending whole steps should wrap and prefer flats",
  );
});

test("buildIntervalFlow normalizes oversized start values", () => {
  const start = noteValues.C + 25; // wraps around twice + 1 semitone
  const flow = buildIntervalFlow(start, 3, "sharp");
  assertSequenceEqual(
    flow,
    ["C#", "E", "G", "A#"],
    "flow should normalize oversized start values and complete the cycle",
  );
});

test("buildAscendingMidiSequence produces ascending pitches from pitch classes", () => {
  const seq = buildAscendingMidiSequence([0, 4, 7]);
  assertSequenceEqual(
    seq,
    [48, 52, 55],
    "C major triad should ascend from the default starting point",
  );
});

test("buildAscendingMidiSequence handles repeated pitch classes by stacking octaves", () => {
  const seq = buildAscendingMidiSequence([0, 0, 0]);
  assertSequenceEqual(
    seq,
    [48, 60, 72],
    "identical pitch classes should advance by octaves",
  );
});

test("buildAscendingMidiSequence respects custom starting midi value", () => {
  const seq = buildAscendingMidiSequence([2, 11, 5], 50);
  assertSequenceEqual(
    seq,
    [50, 59, 65],
    "custom start should seed the run before voicing expansion",
  );
});

test("buildVoicingOrders yields three-note orders when requested", () => {
  const intervals = { third: 4, seventh: 10, ninth: 2, fifth: 7 };
  const orders = buildVoicingOrders(intervals, 3);
  assertSequenceEqual(
    orders.orderA,
    [intervals.third, intervals.seventh, intervals.ninth],
    "orderA should be third-seventh-ninth for three-note voicings",
  );
  assertSequenceEqual(
    orders.orderB,
    [intervals.seventh, intervals.third, intervals.fifth],
    "orderB should be seventh-third-fifth for three-note voicings",
  );
});

test("buildVoicingOrders yields four-note orders when requested", () => {
  const intervals = { third: 4, seventh: 10, ninth: 2, fifth: 7 };
  const orders = buildVoicingOrders(intervals, 4);
  assertSequenceEqual(
    orders.orderA,
    [intervals.third, intervals.seventh, intervals.ninth, intervals.fifth],
    "orderA should include the fifth as the final voice",
  );
  assertSequenceEqual(
    orders.orderB,
    [intervals.seventh, intervals.third, intervals.fifth, intervals.ninth],
    "orderB should shift to seventh-first ordering for four-note voicings",
  );
});

test("matchesVoicingOrderSorted validates a correctly spaced type A voicing", () => {
  const order = [4, 10, 2, 7];
  const ascending = buildAscendingMidiSequence(order);
  assert(
    matchesVoicingOrderSorted(ascending, order),
    "matching ascending voicing should pass for orderA",
  );
});

test("matchesVoicingOrderSorted rejects mismatched lengths", () => {
  const order = [4, 10, 2, 7];
  const ascending = buildAscendingMidiSequence(order);
  assert.strictEqual(
    matchesVoicingOrderSorted(ascending.slice(0, 3), order),
    false,
    "shorter ascending list should fail",
  );
});

test("matchesVoicingOrderSorted enforces proper spacing for repeated pitch classes", () => {
  const order = [0, 0, 0];
  const valid = buildAscendingMidiSequence(order);
  assert(
    matchesVoicingOrderSorted(valid, order),
    "stacked voicing should pass when octaves ascend",
  );

  const invalid = [48, 57, 60]; // middle tone too low for the next C
  assert.strictEqual(
    matchesVoicingOrderSorted(invalid, order),
    false,
    "insufficient spacing between repeated pitch classes should fail",
  );
});

function normalizeNotes(notes) {
  return notes.map((n) => normalizePitchClass(n));
}

test("computeShellVoicing promotes sixths in pure 6 chords for r3or7 mode", () => {
  const base = generateNotesFromChordName("C6");
  const result = computeShellVoicing(base, "C6", "r3or7");
  assertSequenceEqual(
    normalizeNotes(result.notes),
    [0, 4, 9],
    "result should include root, third, and sixth pitch classes",
  );
  assertSequenceEqual(
    result.alternates.map(normalizeNotes),
    [
      [0, 4],
      [0, 9],
    ],
    "alternates should include both R-3 and R-6 pairs",
  );
});

test("computeShellVoicing keeps sixths out of r37 mode", () => {
  const base = generateNotesFromChordName("C6");
  const result = computeShellVoicing(base, "C6", "r37");
  assertSequenceEqual(
    normalizeNotes(result.notes),
    [0, 4],
    "r37 mode should ignore the sixth when no seventh is present",
  );
});

test("computeShellVoicing handles minor sixth chords", () => {
  const base = generateNotesFromChordName("Cm6");
  const result = computeShellVoicing(base, "Cm6", "r3or7");
  assertSequenceEqual(
    normalizeNotes(result.notes),
    [0, 3, 9],
    "minor sixth shell should include the minor third and sixth",
  );
  assertSequenceEqual(
    result.alternates.map(normalizeNotes),
    [
      [0, 3],
      [0, 9],
    ],
    "minor sixth alternates should provide R-3 and R-6",
  );
});

test("computeShellVoicing respects sus chords in r3or7 mode", () => {
  const base = generateNotesFromChordName("Csus4");
  const result = computeShellVoicing(base, "Csus4", "r3or7");
  assertSequenceEqual(
    normalizeNotes(result.notes),
    [0, 5],
    "sus voicing should include root and suspension tone",
  );
  assertSequenceEqual(
    result.alternates.map(normalizeNotes),
    [[0, 5]],
    "sus voicing should expose a single alternate pair",
  );
});

test("computeShellVoicing 37 mode preserves third when seventh absent", () => {
  const base = generateNotesFromChordName("C6");
  const result = computeShellVoicing(base, "C6", "37");
  assertSequenceEqual(
    normalizeNotes(result.notes),
    [4],
    "37 mode should fall back to the third alone when no seventh present",
  );
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
  process.exitCode = 1;
} else {
  console.log(`${passed} tests passed.`);
}
