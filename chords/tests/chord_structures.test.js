const assert = require("assert");
const data = require("../data.js");

const {
  chordStructures,
  chordStructureNames,
  allNotes,
  noteValues,
  voicingUtils,
} = data;

const { generateNotesFromChordName } = voicingUtils;

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function expectChordMatches(root, chordSuffix, expectedStructure) {
  const name = `${root}${chordSuffix}`;
  const generated = generateNotesFromChordName(name);
  const rootVal = noteValues[root];
  const expected = expectedStructure.map((interval) => rootVal + interval);
  assert.deepStrictEqual(
    generated,
    expected,
    `Generated notes mismatch for ${name}`,
  );
}

test("every alias in chordStructureNames round-trips correctly", () => {
  Object.entries(chordStructureNames).forEach(([type, aliases]) => {
    const structure = chordStructures[type];
    assert(
      Array.isArray(structure),
      `Missing chord structure for type ${type}`,
    );
    aliases.forEach((alias) => {
      allNotes.forEach((root) => {
        expectChordMatches(root, alias, structure);
      });
    });
  });
});

test("11th and 13th structures include their named tensions", () => {
  expectChordMatches("C", "11", [0, 4, 7, 10, 14, 17]);
  expectChordMatches("C", "M11", [0, 4, 7, 11, 14, 17]);
  expectChordMatches("C", "M7#11", [0, 4, 7, 11, 18]);
  expectChordMatches("C", "9#11", [0, 4, 7, 10, 14, 18]);
  expectChordMatches("C", "M9#11", [0, 4, 7, 11, 14, 18]);
  expectChordMatches("C", "13#11", [0, 4, 7, 10, 14, 18, 21]);
  expectChordMatches("C", "M13#11", [0, 4, 7, 11, 14, 18, 21]);
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
