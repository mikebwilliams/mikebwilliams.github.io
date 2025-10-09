const assert = require("assert");
const data = require("../data.js");

const { voicingUtils, noteValues } = data;

const {
  generateNotesFromChordName,
  normalizePitchClass,
  getTargetUpperIntervals,
  computeShellVoicing,
  computeUpperVoicingForMode,
  applyVoicingMode,
} = voicingUtils;

const ROOT = "C";
const ROOT_PC = normalizePitchClass(noteValues[ROOT]);

const seventhChordTypes = [
  "7",
  "m7",
  "M7",
  "mM7",
  "dim7",
  "m7b5",
  "aug7",
  "augM7",
];

const sixthChordTypes = ["6", "m6"];
const susChordTypes = ["sus4", "sus2"];

const expectedUpperIntervals = {
  7: { third: 4, seventh: 10, ninth: 2, fifth: 7 },
  m7: { third: 3, seventh: 10, ninth: 2, fifth: 7 },
  M7: { third: 4, seventh: 11, ninth: 2, fifth: 7 },
  mM7: { third: 3, seventh: 11, ninth: 2, fifth: 7 },
  dim7: { third: 3, seventh: 9, ninth: 0, fifth: 6 },
  m7b5: { third: 3, seventh: 10, ninth: 2, fifth: 6 },
  aug7: { third: 4, seventh: 10, ninth: 2, fifth: 8 },
  augM7: { third: 4, seventh: 11, ninth: 2, fifth: 8 },
  6: { third: 4, seventh: 9, ninth: 2, fifth: 7 },
  m6: { third: 3, seventh: 9, ninth: 2, fifth: 7 },
  sus4: { third: 4, seventh: 10, ninth: 2, fifth: 7 },
  sus2: { third: 4, seventh: 10, ninth: 2, fifth: 7 },
};

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function normalized(notes) {
  return notes.map((n) => normalizePitchClass(n));
}

function assertNormalizedEqual(actual, expected, message) {
  assert.deepStrictEqual(normalized(actual), expected, message);
}

test("upper interval helpers cover supported chord types", () => {
  Object.entries(expectedUpperIntervals).forEach(([suffix, expected]) => {
    const chord = ROOT + suffix;
    const intervals = getTargetUpperIntervals(chord);
    assert.deepStrictEqual(
      intervals,
      expected,
      `interval mismatch for ${chord}`,
    );
  });
});

function expectShellR37(chordSuffix, expectedThird, expectedSeventh) {
  const chord = ROOT + chordSuffix;
  const base = generateNotesFromChordName(chord);
  const result = computeShellVoicing(base, chord, "r37");
  const expected = [ROOT_PC, expectedThird];
  if (typeof expectedSeventh === "number") {
    expected.push(expectedSeventh);
  }
  assertNormalizedEqual(result.notes, expected, `r37 mismatch for ${chord}`);
}

seventhChordTypes.forEach((suffix) => {
  const { third, seventh } = expectedUpperIntervals[suffix];
  test(`shell r37 keeps root/3/7 for ${suffix}`, () => {
    expectShellR37(suffix, third, seventh);
  });
});

sixthChordTypes.forEach((suffix) => {
  const { third } = expectedUpperIntervals[suffix];
  test(`shell r37 keeps root/3 for ${suffix}`, () => {
    expectShellR37(suffix, third);
  });
});

susChordTypes.forEach((suffix) => {
  test(`shell r37 pairs root with sus tone for ${suffix}`, () => {
    const chord = ROOT + suffix;
    const base = generateNotesFromChordName(chord);
    const result = computeShellVoicing(base, chord, "r37");
    const expected = [ROOT_PC, normalizePitchClass(base[1])];
    assertNormalizedEqual(result.notes, expected, `sus mismatch ${chord}`);
  });
});

function expectR3Or7(chordSuffix, expectedThird, expectedSeventh) {
  const chord = ROOT + chordSuffix;
  const base = generateNotesFromChordName(chord);
  const result = computeShellVoicing(base, chord, "r3or7");
  const normalizedNotes = normalized(result.notes);
  const combos = (result.alternates || []).map(normalized);
  if (typeof expectedSeventh === "number") {
    assert.deepStrictEqual(
      normalizedNotes,
      [ROOT_PC, expectedThird, expectedSeventh],
      `r3or7 expanded voicing mismatch for ${chord}`,
    );
    assert.deepStrictEqual(
      combos,
      [
        [ROOT_PC, expectedThird],
        [ROOT_PC, expectedSeventh],
      ],
      `r3or7 alternates mismatch for ${chord}`,
    );
  } else {
    assert.deepStrictEqual(
      normalizedNotes,
      [ROOT_PC, expectedThird],
      `r3or7 chord mismatch for ${chord}`,
    );
    assert.deepStrictEqual(
      combos,
      [[ROOT_PC, expectedThird]],
      `r3or7 single alternate mismatch for ${chord}`,
    );
  }
}

seventhChordTypes.forEach((suffix) => {
  const { third, seventh } = expectedUpperIntervals[suffix];
  test(`shell r3or7 alternates cover ${suffix}`, () => {
    expectR3Or7(suffix, third, seventh);
  });
});

sixthChordTypes.forEach((suffix) => {
  const { third, seventh } = expectedUpperIntervals[suffix];
  test(`shell r3or7 handles ${suffix}`, () => {
    expectR3Or7(suffix, third, seventh);
  });
});

susChordTypes.forEach((suffix) => {
  test(`shell r3or7 handles ${suffix}`, () => {
    const chord = ROOT + suffix;
    const base = generateNotesFromChordName(chord);
    const result = computeShellVoicing(base, chord, "r3or7");
    assert.deepStrictEqual(result.alternates, [[base[0], base[1]]]);
    assertNormalizedEqual(result.notes, [
      ROOT_PC,
      normalizePitchClass(base[1]),
    ]);
  });
});

function expect37(chordSuffix, expectedThird, expectedSeventh) {
  const chord = ROOT + chordSuffix;
  const base = generateNotesFromChordName(chord);
  const result = computeShellVoicing(base, chord, "37");
  if (typeof expectedSeventh === "number") {
    assertNormalizedEqual(
      result.notes,
      [expectedThird, expectedSeventh],
      `37 rootless mismatch for ${chord}`,
    );
  } else {
    assertNormalizedEqual(
      result.notes,
      [expectedThird],
      `37 fallback mismatch for ${chord}`,
    );
  }
}

seventhChordTypes.forEach((suffix) => {
  const { third, seventh } = expectedUpperIntervals[suffix];
  test(`shell 3-7 rootless for ${suffix}`, () => {
    expect37(suffix, third, seventh);
  });
});

sixthChordTypes.forEach((suffix) => {
  const { third } = expectedUpperIntervals[suffix];
  test(`shell 3-7 rootless defaults for ${suffix}`, () => {
    expect37(suffix, third);
  });
});

susChordTypes.forEach((suffix) => {
  test(`shell 3-7 rootless handles ${suffix}`, () => {
    const chord = ROOT + suffix;
    const base = generateNotesFromChordName(chord);
    const result = computeShellVoicing(base, chord, "37");
    assertNormalizedEqual(result.notes, [normalizePitchClass(base[1])]);
  });
});

function expectUpper(voicingMode, chordSuffix, orderBuilder) {
  const chord = ROOT + chordSuffix;
  const result = computeUpperVoicingForMode(chord, voicingMode);
  assert(result, `upper voicing missing for ${voicingMode} ${chord}`);
  const expectedOrder = orderBuilder(expectedUpperIntervals[chordSuffix]);
  assertNormalizedEqual(result, expectedOrder);
}

const upperTypeOrders = {
  typeA: (intervals) => [
    intervals.third,
    intervals.seventh,
    intervals.ninth,
    intervals.fifth,
  ],
  typeB: (intervals) => [
    intervals.seventh,
    intervals.third,
    intervals.fifth,
    intervals.ninth,
  ],
};

const upperOneOrders = {
  typeA: (intervals) => [intervals.third, intervals.seventh, intervals.ninth],
  typeB: (intervals) => [intervals.seventh, intervals.third, intervals.fifth],
};

["upper:typeA", "upper:typeB", "upper:either"].forEach((mode) => {
  const suffix = mode.split(":")[1];
  const builder = upperTypeOrders[suffix === "typeB" ? "typeB" : "typeA"];
  seventhChordTypes.forEach((chordSuffix) => {
    test(`${mode} covers ${chordSuffix}`, () => {
      expectUpper(mode, chordSuffix, builder);
    });
  });
  sixthChordTypes.forEach((chordSuffix) => {
    test(`${mode} covers ${chordSuffix}`, () => {
      expectUpper(mode, chordSuffix, builder);
    });
  });
  susChordTypes.forEach((chordSuffix) => {
    test(`${mode} covers ${chordSuffix}`, () => {
      expectUpper(mode, chordSuffix, builder);
    });
  });
});

["upper1:typeA", "upper1:typeB", "upper1:either"].forEach((mode) => {
  const suffix = mode.split(":")[1];
  const builder = upperOneOrders[suffix === "typeB" ? "typeB" : "typeA"];
  seventhChordTypes.forEach((chordSuffix) => {
    test(`${mode} covers ${chordSuffix}`, () => {
      expectUpper(mode, chordSuffix, builder);
    });
  });
  sixthChordTypes.forEach((chordSuffix) => {
    test(`${mode} covers ${chordSuffix}`, () => {
      expectUpper(mode, chordSuffix, builder);
    });
  });
  susChordTypes.forEach((chordSuffix) => {
    test(`${mode} covers ${chordSuffix}`, () => {
      expectUpper(mode, chordSuffix, builder);
    });
  });
});

test("default voicing returns base notes", () => {
  seventhChordTypes.forEach((suffix) => {
    const chord = ROOT + suffix;
    const base = generateNotesFromChordName(chord);
    const { notes } = applyVoicingMode(chord, "default");
    assert.deepStrictEqual(notes, base);
  });
});

test("applyVoicingMode proxies to shell", () => {
  const chord = ROOT + "7";
  const base = generateNotesFromChordName(chord);
  const result = applyVoicingMode(chord, "shell:r37");
  const expected = computeShellVoicing(base, chord, "r37");
  assert.deepStrictEqual(result.notes, expected.notes);
});

test("applyVoicingMode proxies to upper", () => {
  const chord = ROOT + "m7";
  const result = applyVoicingMode(chord, "upper:typeA");
  const expected = computeUpperVoicingForMode(chord, "upper:typeA");
  assert.deepStrictEqual(result.notes, expected);
});

let passed = 0;
let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`${passed} tests passed.`);
}
