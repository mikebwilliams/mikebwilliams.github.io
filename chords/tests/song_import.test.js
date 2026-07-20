const assert = require("assert");

const {
  parseIRealProSource,
  buildPlayableSongEntries,
  buildSongPracticeTimeline,
  buildSongDisplayRows,
  formatIRealProChordDisplay,
  formatKeyDisplay,
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

test("formatKeyDisplay uses music symbols for key accidentals", () => {
  assert.strictEqual(formatKeyDisplay("Bb"), "B♭");
  assert.strictEqual(formatKeyDisplay("C#"), "C♯");
  assert.strictEqual(formatKeyDisplay("A-"), "A-");
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
        label: "B♭△7/E♭",
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

test("repeated multi-chord measures keep unique target positions", () => {
  const source =
    "irealb://Repeat Study=Doe John==Medium Swing=C==[*AT44C7,F7 |x Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0]);
  const timeline = buildSongPracticeTimeline(parsed.songs[0]);

  assert.deepStrictEqual(
    entries.map((entry) => `${entry.measureIndex}:${entry.chordIndex}`),
    ["0:0", "0:1", "1:0", "1:1"],
  );
  assert.deepStrictEqual(
    timeline[1].chordTargets.map(
      (target) => `${target.measureIndex}:${target.chordIndex}`,
    ),
    ["1:0", "1:1"],
  );
});

test("buildPlayableSongEntries preserves altered fifths and ninths", () => {
  const source =
    "irealb://Altered Study=Doe John==Medium Swing=Bb==[*AT44Bb7alt |Bb7b5 |Bb9b5 |Bb7#9b5 |Bb7b9b5 |Bb^7b5 |Bb13b9 |Bb13#9 Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0]);

  assert.deepStrictEqual(
    entries.map((entry) => ({
      label: entry.label,
      rawLabel: entry.rawLabel,
      playableChord: entry.playableChord,
    })),
    [
      {
        label: "B♭7alt",
        rawLabel: "Bb7alt",
        playableChord: "Bb7alt",
      },
      {
        label: "B♭7♭5",
        rawLabel: "Bb7b5",
        playableChord: "Bb7b5",
      },
      {
        label: "B♭9♭5",
        rawLabel: "Bb9b5",
        playableChord: "Bb9b5",
      },
      {
        label: "B♭7♯9♭5",
        rawLabel: "Bb7#9b5",
        playableChord: "Bb7#9b5",
      },
      {
        label: "B♭7♭9♭5",
        rawLabel: "Bb7b9b5",
        playableChord: "Bb7b9b5",
      },
      {
        label: "B♭△7♭5",
        rawLabel: "Bb^7b5",
        playableChord: "BbM7b5",
      },
      {
        label: "B♭13♭9",
        rawLabel: "Bb13b9",
        playableChord: "Bb13b9",
      },
      {
        label: "B♭13♯9",
        rawLabel: "Bb13#9",
        playableChord: "Bb13#9",
      },
    ],
  );
});

test("buildPlayableSongEntries expands slash cells into repeated chords", () => {
  const source =
    "irealb://Slash Study=Doe John==Medium Swing=C==[*AT44C7,p,p,Gb7b9 |p,A-7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0]);
  const rows = buildSongDisplayRows(parsed.songs[0]);

  assert.deepStrictEqual(
    entries.map((entry) => ({
      label: entry.label,
      rawLabel: entry.rawLabel,
      playableChord: entry.playableChord,
      measureIndex: entry.measureIndex,
      chordIndex: entry.chordIndex,
    })),
    [
      {
        label: "C7",
        rawLabel: "C7",
        playableChord: "C7",
        measureIndex: 0,
        chordIndex: 0,
      },
      {
        label: "C7",
        rawLabel: "C7",
        playableChord: "C7",
        measureIndex: 0,
        chordIndex: 1,
      },
      {
        label: "C7",
        rawLabel: "C7",
        playableChord: "C7",
        measureIndex: 0,
        chordIndex: 2,
      },
      {
        label: "G♭7♭9",
        rawLabel: "Gb7b9",
        playableChord: "Gb7b9",
        measureIndex: 0,
        chordIndex: 3,
      },
      {
        label: "G♭7♭9",
        rawLabel: "Gb7b9",
        playableChord: "Gb7b9",
        measureIndex: 1,
        chordIndex: 0,
      },
      {
        label: "A-7",
        rawLabel: "A-7",
        playableChord: "Am7",
        measureIndex: 1,
        chordIndex: 1,
      },
    ],
  );

  assert.deepStrictEqual(
    rows[0].map((measure) => measure.chords.map((chord) => chord.label)),
    [
      ["C7", "/", "/", "G♭7♭9"],
      ["/", "A-7"],
    ],
  );
  assert.deepStrictEqual(
    rows[0].map((measure) => measure.chords.map((chord) => chord.rawLabel)),
    [
      ["C7", "C7", "C7", "Gb7b9"],
      ["Gb7b9", "A-7"],
    ],
  );
});

test("buildPlayableSongEntries resolves invisible roots over a bass note", () => {
  const source =
    "irealb://Invisible Root Study=Doe John==Medium Swing=C==[*AT44C7 |W/D |W/E |F7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0]);
  const rows = buildSongDisplayRows(parsed.songs[0]);

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
        label: "C7",
        rawLabel: "C7",
        playableChord: "C7",
        bassNote: "",
        measureIndex: 0,
        chordIndex: 0,
      },
      {
        label: "/D",
        rawLabel: "C7/D",
        playableChord: "C7",
        bassNote: "D",
        measureIndex: 1,
        chordIndex: 0,
      },
      {
        label: "/E",
        rawLabel: "C7/E",
        playableChord: "C7",
        bassNote: "E",
        measureIndex: 2,
        chordIndex: 0,
      },
      {
        label: "F7",
        rawLabel: "F7",
        playableChord: "F7",
        bassNote: "",
        measureIndex: 3,
        chordIndex: 0,
      },
    ],
  );
  assert.deepStrictEqual(
    rows[0].map((measure) => measure.chords.map((chord) => chord.label)),
    [["C7"], ["/D"], ["/E"], ["F7"]],
  );
  assert.deepStrictEqual(
    rows[0].map((measure) => measure.chords.map((chord) => chord.rawLabel)),
    [["C7"], ["C7/D"], ["C7/E"], ["F7"]],
  );
});

test("buildPlayableSongEntries resolves spaced slash bass over previous harmony", () => {
  const source =
    "irealb://Descending Bass Study=Doe John==Medium Swing=C==[*AT44C- /B |C-7/Bb Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0]);
  const rows = buildSongDisplayRows(parsed.songs[0]);

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
        label: "C-",
        rawLabel: "C-",
        playableChord: "Cm",
        bassNote: "",
        measureIndex: 0,
        chordIndex: 0,
      },
      {
        label: "/B",
        rawLabel: "C-/B",
        playableChord: "Cm",
        bassNote: "B",
        measureIndex: 0,
        chordIndex: 1,
      },
      {
        label: "C-7/B♭",
        rawLabel: "C-7/Bb",
        playableChord: "Cm7",
        bassNote: "Bb",
        measureIndex: 1,
        chordIndex: 0,
      },
    ],
  );
  assert.deepStrictEqual(
    rows[0].map((measure) => measure.chords.map((chord) => chord.label)),
    [["C-", "/B"], ["C-7/B♭"]],
  );
});

test("buildPlayableSongEntries transposes invisible-root bass notes", () => {
  const source =
    "irealb://Invisible Root Transpose=Doe John==Medium Swing=C==[*AT44C7 |W/D Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0], { targetKey: "D" });

  assert.deepStrictEqual(
    entries.map((entry) => ({
      label: entry.label,
      rawLabel: entry.rawLabel,
      playableChord: entry.playableChord,
      bassNote: entry.bassNote,
    })),
    [
      {
        label: "D7",
        rawLabel: "D7",
        playableChord: "D7",
        bassNote: "",
      },
      {
        label: "/E",
        rawLabel: "D7/E",
        playableChord: "D7",
        bassNote: "E",
      },
    ],
  );
});

test("buildPlayableSongEntries preserves 11th and sharp-11 qualities", () => {
  const source =
    "irealb://Extension Study=Doe John==Medium Swing=C==[*AT44C11 |C^11 |C^7#11 |C9#11 |C^9#11 |C13#11 |C^13#11 Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0]);

  assert.deepStrictEqual(
    entries.map((entry) => ({
      label: entry.label,
      rawLabel: entry.rawLabel,
      playableChord: entry.playableChord,
    })),
    [
      {
        label: "C11",
        rawLabel: "C11",
        playableChord: "C11",
      },
      {
        label: "C△11",
        rawLabel: "C^11",
        playableChord: "CM11",
      },
      {
        label: "C△7♯11",
        rawLabel: "C^7#11",
        playableChord: "CM7#11",
      },
      {
        label: "C9♯11",
        rawLabel: "C9#11",
        playableChord: "C9#11",
      },
      {
        label: "C△9♯11",
        rawLabel: "C^9#11",
        playableChord: "CM9#11",
      },
      {
        label: "C13♯11",
        rawLabel: "C13#11",
        playableChord: "C13#11",
      },
      {
        label: "C△13♯11",
        rawLabel: "C^13#11",
        playableChord: "CM13#11",
      },
    ],
  );
});

test("buildPlayableSongEntries can label songs with roman numerals", () => {
  const source =
    "irealb://Roman Study=Doe John==Medium Swing=C==[*AT44C^7/E |A-7 |D7 |G7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const entries = buildPlayableSongEntries(parsed.songs[0], {
    displayRomanNumerals: true,
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
        label: "I△7/III",
        rawLabel: "C^7/E",
        playableChord: "CM7",
        bassNote: "E",
      },
      {
        label: "vi7",
        rawLabel: "A-7",
        playableChord: "Am7",
        bassNote: "",
      },
      {
        label: "II7",
        rawLabel: "D7",
        playableChord: "D7",
        bassNote: "",
      },
      {
        label: "V7",
        rawLabel: "G7",
        playableChord: "G7",
        bassNote: "",
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
        label: "C△7/F",
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
    ["C△7", "A-7", "D7", "G7"],
  );
});

test("buildSongDisplayRows can render roman numeral labels", () => {
  const source =
    "irealb://Practice Song=Doe John==Medium Swing=Bb==[*AT44Bb^7 |G-7 |C7 |F7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const rows = buildSongDisplayRows(parsed.songs[0], 4, {
    targetKey: "C",
    displayRomanNumerals: true,
  });

  assert.deepStrictEqual(
    rows[0].map((measure) =>
      measure.chords.map((chord) => chord.label).join(" "),
    ),
    ["I△7", "vi7", "II7", "V7"],
  );
});

test("buildSongPracticeTimeline tracks time signatures, phrases, and ordered chord targets", () => {
  const source =
    "irealb://Timeline Study=Doe Jane==Medium Swing=C==[*A T44C7,G7 |F7 |Bb7 |E7 |*B T34A-7,D7 |G7 Z==0=0";
  const parsed = parseIRealProSource(source);
  const timeline = buildSongPracticeTimeline(parsed.songs[0]);

  assert.deepStrictEqual(
    timeline.map((measure) => ({
      measureIndex: measure.measureIndex,
      beatsPerMeasure: measure.beatsPerMeasure,
      section: measure.section,
      phraseMeasure: measure.phraseMeasure,
      chordLabels: measure.chordTargets.map((entry) => entry.label),
    })),
    [
      {
        measureIndex: 0,
        beatsPerMeasure: 4,
        section: "A",
        phraseMeasure: 1,
        chordLabels: ["C7", "G7"],
      },
      {
        measureIndex: 1,
        beatsPerMeasure: 4,
        section: "",
        phraseMeasure: 2,
        chordLabels: ["F7"],
      },
      {
        measureIndex: 2,
        beatsPerMeasure: 4,
        section: "",
        phraseMeasure: 3,
        chordLabels: ["B♭7"],
      },
      {
        measureIndex: 3,
        beatsPerMeasure: 4,
        section: "",
        phraseMeasure: 4,
        chordLabels: ["E7"],
      },
      {
        measureIndex: 4,
        beatsPerMeasure: 3,
        section: "B",
        phraseMeasure: 1,
        chordLabels: ["A-7", "D7"],
      },
      {
        measureIndex: 5,
        beatsPerMeasure: 3,
        section: "",
        phraseMeasure: 2,
        chordLabels: ["G7"],
      },
    ],
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
    ["C-7", "F7", "A♯△7"],
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
    "B♭△7 (E7♯9)",
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
