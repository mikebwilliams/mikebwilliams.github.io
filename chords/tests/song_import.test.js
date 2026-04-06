const assert = require("assert");

const {
  parseIRealProSource,
  buildPlayableSongEntries,
  buildSongDisplayRows,
  formatIRealProChordDisplay,
} = require("../data.js");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("parseIRealProSource parses a single irealbook song url", () => {
  const source =
    "irealbook://Practice Song=Doe John=Medium Swing=C=n=[*AT44C7 |A-7 |D-7 |G7 Z";
  const parsed = parseIRealProSource(source);

  assert.strictEqual(parsed.songCount, 1);
  assert.strictEqual(parsed.songs[0].title, "Practice Song");
  assert.strictEqual(parsed.songs[0].composer, "John Doe");
  assert.strictEqual(parsed.songs[0].key, "C");
});

test("buildPlayableSongEntries normalizes iReal qualities and repeats", () => {
  const source =
    "irealb://Practice Song=Doe John==Medium Swing=Bb==[*AT44Bb^7/Eb |A-7 |x |G7sus Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0]);

  assert.deepStrictEqual(
    entries.map((entry) => ({
      label: entry.label,
      rawLabel: entry.rawLabel,
      playableChord: entry.playableChord,
      bassNote: entry.bassNote,
      measureIndex: entry.measureIndex,
      chordIndex: entry.chordIndex,
    })),
    [
      {
        label: "B♭Δ7/E♭",
        rawLabel: "Bb^7/Eb",
        playableChord: "BbM7",
        bassNote: "Eb",
        measureIndex: 0,
        chordIndex: 0,
      },
      {
        label: "A-7",
        rawLabel: "A-7",
        playableChord: "Am7",
        bassNote: "",
        measureIndex: 1,
        chordIndex: 0,
      },
      {
        label: "A-7",
        rawLabel: "A-7",
        playableChord: "Am7",
        bassNote: "",
        measureIndex: 2,
        chordIndex: 0,
      },
      {
        label: "G7sus",
        rawLabel: "G7sus",
        playableChord: "Gsus4",
        bassNote: "",
        measureIndex: 3,
        chordIndex: 0,
      },
    ],
  );
});

test("buildPlayableSongEntries transposes songs into a requested target key", () => {
  const source =
    "irealb://Practice Song=Doe John==Medium Swing=Bb==[*AT44Bb^7/Eb |G-7 |C7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0], {
    targetKey: "C",
  });

  assert.deepStrictEqual(
    entries.map((entry) => ({
      label: entry.label,
      rawLabel: entry.rawLabel,
      playableChord: entry.playableChord,
      bassNote: entry.bassNote,
    })),
    [
      {
        label: "CΔ7/F",
        rawLabel: "C^7/F",
        playableChord: "CM7",
        bassNote: "F",
      },
      {
        label: "A-7",
        rawLabel: "A-7",
        playableChord: "Am7",
        bassNote: "",
      },
      {
        label: "D7",
        rawLabel: "D7",
        playableChord: "D7",
        bassNote: "",
      },
    ],
  );
});

test("buildSongDisplayRows groups measures into four-bar rows", () => {
  const source =
    "irealb://Practice Song=Doe John==Medium Swing=C==[*AT44C7 |A-7 |D-7 |G7 |C7 |A-7 |D-7 |G7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const rows = buildSongDisplayRows(parsed.songs[0]);

  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].length, 4);
  assert.strictEqual(rows[1].length, 4);
  assert.deepStrictEqual(
    rows[0].map((measure) =>
      measure.chords.map((chord) => chord.label).join(" "),
    ),
    ["C7", "A-7", "D-7", "G7"],
  );
  assert.strictEqual(rows[1][3].finalBar, true);
});

test("buildSongDisplayRows transposes displayed chord labels when requested", () => {
  const source =
    "irealb://Practice Song=Doe John==Medium Swing=Bb==[*AT44Bb^7 |G-7 |C7 |F7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const rows = buildSongDisplayRows(parsed.songs[0], 4, { targetKey: "C" });

  assert.deepStrictEqual(
    rows[0].map((measure) =>
      measure.chords.map((chord) => chord.label).join(" "),
    ),
    ["CΔ7", "A-7", "D7", "G7"],
  );
});

test("song transposition uses the tonic from minor key names", () => {
  const source =
    "irealb://Minor Study=Doe John==Medium Swing=A-==[*AT44A-7 |D7 |G^7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0], {
    targetKey: "C",
  });

  assert.deepStrictEqual(
    entries.map((entry) => entry.label),
    ["C-7", "F7", "A♯Δ7"],
  );
});

test("formatIRealProChordDisplay uses jazz symbols for accidentals and major chords", () => {
  const parsed = parseIRealProSource(
    "irealb://Practice Song=Doe John==Medium Swing=Bb==[*AT44Bb^7(E7#9) |Eh7 |Ab7b9 Z==0=0",
  );
  const [firstMeasure, secondMeasure, thirdMeasure] =
    parsed.songs[0].chart.measures;

  assert.strictEqual(
    formatIRealProChordDisplay(firstMeasure.chords[0]),
    "B♭Δ7 (E7♯9)",
  );
  assert.strictEqual(
    formatIRealProChordDisplay(secondMeasure.chords[0]),
    "Eø7",
  );
  assert.strictEqual(
    formatIRealProChordDisplay(thirdMeasure.chords[0]),
    "A♭7♭9",
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
