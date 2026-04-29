const assert = require("assert");
const data = require("../data.js");

const { voicingUtils, noteValues } = data;

const {
  generateNotesFromChordName,
  normalizePitchClass,
  getTargetUpperIntervals,
  computeShellVoicing,
  computeNormalVoicing,
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
const alteredExtensionChordTypes = [
  "7b5",
  "M7b5",
  "9b5",
  "7#9b5",
  "7b9b5",
  "13b9",
  "13#9",
];

const expectedUpperIntervals = {
  7: { third: 4, seventh: 10, ninth: 2, fifth: 7 },
  m7: { third: 3, seventh: 10, ninth: 2, fifth: 7 },
  M7: { third: 4, seventh: 11, ninth: 2, fifth: 7 },
  mM7: { third: 3, seventh: 11, ninth: 2, fifth: 7 },
  dim7: { third: 3, seventh: 9, ninth: 1, fifth: 6 },
  m7b5: { third: 3, seventh: 10, ninth: 2, fifth: 6 },
  "7b5": { third: 4, seventh: 10, ninth: 2, fifth: 6 },
  M7b5: { third: 4, seventh: 11, ninth: 2, fifth: 6 },
  aug7: { third: 4, seventh: 10, ninth: 2, fifth: 8 },
  augM7: { third: 4, seventh: 11, ninth: 2, fifth: 8 },
  "9b5": { third: 4, seventh: 10, ninth: 2, fifth: 6 },
  "7#9b5": { third: 4, seventh: 10, ninth: 3, fifth: 6 },
  "7b9b5": { third: 4, seventh: 10, ninth: 1, fifth: 6 },
  6: { third: 4, seventh: 9, ninth: 2, fifth: 7 },
  m6: { third: 3, seventh: 9, ninth: 2, fifth: 7 },
  sus4: { third: 4, seventh: 10, ninth: 2, fifth: 7 },
  sus2: { third: 4, seventh: 10, ninth: 2, fifth: 7 },
  "13b9": { third: 4, seventh: 10, ninth: 1, fifth: 7 },
  "13#9": { third: 4, seventh: 10, ninth: 3, fifth: 7 },
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

alteredExtensionChordTypes.forEach((suffix) => {
  const { third, seventh } = expectedUpperIntervals[suffix];
  test(`shell r37 keeps altered extensions for ${suffix}`, () => {
    expectShellR37(suffix, third, seventh);
  });
});

sixthChordTypes.forEach((suffix) => {
  const { third, seventh } = expectedUpperIntervals[suffix];
  test(`shell r37 keeps root/3 for ${suffix}`, () => {
    expectShellR37(suffix, third, seventh);
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

test("fully diminished Type A/B upper voicings use a flat 2", () => {
  assertNormalizedEqual(
    computeUpperVoicingForMode("Cdim7", "upper:typeA"),
    [3, 9, 1, 6],
    "Cdim7 Type A should use b2, not the root",
  );
  assertNormalizedEqual(
    computeUpperVoicingForMode("Cdim7", "upper:typeB"),
    [9, 3, 6, 1],
    "Cdim7 Type B should use b2, not the root",
  );
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

test("normal voicings support root, triad, and noExtensions", () => {
  const dominant13 = ROOT + "13";
  const dominant13Base = generateNotesFromChordName(dominant13);
  assertNormalizedEqual(
    computeNormalVoicing(dominant13Base, dominant13, "root").notes,
    [ROOT_PC],
    `root mismatch for ${dominant13}`,
  );
  assertNormalizedEqual(
    computeNormalVoicing(dominant13Base, dominant13, "triad").notes,
    [ROOT_PC, 4, 7],
    `triad mismatch for ${dominant13}`,
  );
  assertNormalizedEqual(
    computeNormalVoicing(dominant13Base, dominant13, "noExtensions").notes,
    [ROOT_PC, 4, 7, 10],
    `noExtensions mismatch for ${dominant13}`,
  );

  const majorSevenSharpEleven = ROOT + "M7#11";
  const majorSevenSharpElevenBase = generateNotesFromChordName(
    majorSevenSharpEleven,
  );
  assertNormalizedEqual(
    computeNormalVoicing(
      majorSevenSharpElevenBase,
      majorSevenSharpEleven,
      "noExtensions",
    ).notes,
    [ROOT_PC, 4, 7, 11],
    `noExtensions mismatch for ${majorSevenSharpEleven}`,
  );

  const susChord = ROOT + "sus4";
  const susBase = generateNotesFromChordName(susChord);
  assertNormalizedEqual(
    computeNormalVoicing(susBase, susChord, "triad").notes,
    [ROOT_PC, 5, 7],
    `triad mismatch for ${susChord}`,
  );

  const sixChord = ROOT + "6";
  const sixBase = generateNotesFromChordName(sixChord);
  assertNormalizedEqual(
    computeNormalVoicing(sixBase, sixChord, "noExtensions").notes,
    [ROOT_PC, 4, 7, 9],
    `noExtensions mismatch for ${sixChord}`,
  );
});

test("applyVoicingMode proxies to normal voicings", () => {
  const chord = ROOT + "9";
  const result = applyVoicingMode(chord, "normal:noExtensions");
  assertNormalizedEqual(
    result.notes,
    [ROOT_PC, 4, 7, 10],
    `proxy mismatch for ${chord}`,
  );
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
