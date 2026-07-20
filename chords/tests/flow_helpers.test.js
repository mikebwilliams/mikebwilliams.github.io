const assert = require("assert");
const data = require("../data.js");

const {
  noteValues,
  normalNotes,
  circleOfFourths,
  circleOfFifths,
  voicingUtils,
} = data;

// Provide globals expected by scripts.js when running in Node
global.noteValues = noteValues;
global.normalNotes = normalNotes;
global.circleOfFourths = circleOfFourths;
global.circleOfFifths = circleOfFifths;
Object.assign(global, voicingUtils);

const {
  resolveStartValue,
  rotateSequenceToStart,
  flowPresetMap,
} = require("../scripts.js");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assertArrayEqual(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
}

test("resolveStartValue returns explicit note value when key known", () => {
  assert.strictEqual(
    resolveStartValue("Eb"),
    noteValues.Eb,
    "expected value for Eb root",
  );
});

test("resolveStartValue falls back to default when key missing", () => {
  assert.strictEqual(
    resolveStartValue("H"),
    noteValues.C,
    "unknown key should default to C",
  );
});

test("rotateSequenceToStart rotates sequence when exact match found", () => {
  const sequence = ["C", "D", "E", "F"];
  const rotated = rotateSequenceToStart(sequence, "E");
  assertArrayEqual(rotated, ["E", "F", "C", "D"]);
  assert.notStrictEqual(rotated, sequence, "rotation should return new array");
});

test("rotateSequenceToStart uses enharmonic match when exact spelling missing", () => {
  const sequence = ["C", "C#", "D", "D#"];
  const rotated = rotateSequenceToStart(sequence, "Db");
  assertArrayEqual(rotated, ["C#", "D", "D#", "C"]);
});

test("rotateSequenceToStart returns clone when key not in sequence", () => {
  const sequence = ["C", "D", "E"];
  const rotated = rotateSequenceToStart(sequence, "Gb");
  assertArrayEqual(rotated, sequence);
  assert.notStrictEqual(rotated, sequence, "should return new copy");
});

test("flowPresetMap circleOfFourths rotates sequence to requested start", () => {
  const flow = flowPresetMap.circleOfFourths("Eb");
  const expected = rotateSequenceToStart(circleOfFourths, "Eb");
  assertArrayEqual(flow, expected);
});

test("flowPresetMap circleOfFifths rotates sequence to requested start", () => {
  const flow = flowPresetMap.circleOfFifths("F#");
  const expected = rotateSequenceToStart(circleOfFifths, "F#");
  assertArrayEqual(flow, expected);
});

test("flowPresetMap ascending whole steps prefers sharps", () => {
  const flow = flowPresetMap.ascendingWholeSteps("C");
  const expected = voicingUtils.buildIntervalFlow(
    noteValues.C,
    2,
    "sharp",
    "C",
  );
  assertArrayEqual(flow, expected);
});

test("flowPresetMap descending whole steps prefers flats", () => {
  const flow = flowPresetMap.descendingWholeSteps("C");
  const expected = voicingUtils.buildIntervalFlow(
    noteValues.C,
    -2,
    "flat",
    "C",
  );
  assertArrayEqual(flow, expected);
});

test("flowPresetMap ascending half steps honors sharp preference", () => {
  const flow = flowPresetMap.ascendingHalfSteps("F#");
  const expected = voicingUtils.buildIntervalFlow(
    noteValues["F#"],
    1,
    "sharp",
    "F#",
  );
  assertArrayEqual(flow, expected);
});

test("flowPresetMap descending minor thirds honors flat preference", () => {
  const flow = flowPresetMap.descendingMinorThirds("Eb");
  const expected = voicingUtils.buildIntervalFlow(
    noteValues.Eb,
    -3,
    "flat",
    "Eb",
  );
  assertArrayEqual(flow, expected);
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
