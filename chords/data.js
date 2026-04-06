const allNotes = [
  "Cb",
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "E#",
  "Fb",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "B#",
];

const normalNotes = allNotes.filter(
  (item) => ["Cb", "E#", "Fb", "B#"].indexOf(item) === -1,
);

const noteValues = {
  "B#": 0,
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const valuesToNotesSharp = {
  0: "C",
  1: "C#",
  2: "D",
  3: "D#",
  4: "E",
  5: "F",
  6: "F#",
  7: "G",
  8: "G#",
  9: "A",
  10: "A#",
  11: "B",
};

const valuesToNotesFlat = {
  0: "C",
  1: "Db",
  2: "D",
  3: "Eb",
  4: "E",
  5: "F",
  6: "Gb",
  7: "G",
  8: "Ab",
  9: "A",
  10: "Bb",
  11: "B",
};

const globalRoot =
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : {};
const appGlobals = globalRoot.appGlobals || (globalRoot.appGlobals = {});
if (!appGlobals.root) {
  appGlobals.root = globalRoot;
}
const hasDocument = typeof document !== "undefined";
appGlobals.hasDocument = hasDocument;

function createClassListStub() {
  return {
    add() {},
    remove() {},
    toggle() {},
    contains() {
      return false;
    },
  };
}

function createElementStub(id) {
  return {
    id,
    style: {},
    classList: createClassListStub(),
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    dispatchEvent() {
      return false;
    },
    set textContent(value) {
      this._textContent = value;
    },
    get textContent() {
      return this._textContent || "";
    },
    value: "",
    checked: false,
    disabled: false,
    open: true,
  };
}

const elementStubs = {};

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x === 0 ? 1 : x;
}

function buildIntervalFlow(startValue, step, prefer = "sharp", startLabel) {
  const map = prefer === "flat" ? valuesToNotesFlat : valuesToNotesSharp;
  const normalizedStart = ((startValue % 12) + 12) % 12;
  const stepSize = Math.abs(step) % 12;

  if (stepSize === 0) {
    return [startLabel || map[normalizedStart]];
  }

  const cycleLength = 12 / gcd(12, stepSize);
  const sequence = [];
  let current = normalizedStart;

  for (let i = 0; i < cycleLength; i++) {
    if (i === 0 && startLabel) sequence.push(startLabel);
    else sequence.push(map[current]);
    current = (((current + step) % 12) + 12) % 12;
  }

  return sequence;
}

const stepsToNames = {
  0: {
    interval: "Unison",
    numeral: "I",
  },
  1: {
    interval: "Minor 2nd",
    numeral: "bII",
  },
  2: {
    interval: "Major 2nd",
    numeral: "II",
  },
  3: {
    interval: "Minor 3rd",
    numeral: "bIII",
  },
  4: {
    interval: "Major 3rd",
    numeral: "III",
  },
  5: {
    interval: "Perfect 4th",
    numeral: "IV",
  },
  6: {
    interval: "Tritone",
    numeral: "bV",
  },
  7: {
    interval: "Perfect 5th",
    numeral: "V",
  },
  8: {
    interval: "Minor 6th",
    numeral: "bVI",
  },
  9: {
    interval: "Major 6th",
    numeral: "VI",
  },
  10: {
    interval: "Minor 7th",
    numeral: "bVII",
  },
  11: {
    interval: "Major 7th",
    numeral: "VII",
  },
  12: {
    interval: "Octave",
    numeral: "I",
  },
};

const romanNumerals = {
  I: 0,
  II: 2,
  III: 4,
  IV: 5,
  V: 7,
  VI: 9,
  VII: 11,
  VIII: 12,
  // These are upper case since we check by uppercase to ignore
  // major/minor chord quality when getting the scale degree
  BI: -1,
  BII: 1,
  BIII: 3,
  BIV: 4,
  BV: 6,
  BVI: 8,
  BVII: 10,
  // Same as flats, but with sharps '#'
  "#I": 1,
  "#II": 3,
  "#III": 5,
  "#IV": 6,
  "#V": 8,
  "#VI": 10,
  "#VII": 0,
};

// These are separated so we can so one way gives us more flats and the other more sharps,
// e.g. F# in the fifths vs Gb in the fourths.
const circleOfFourths = [
  "C",
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
  "B",
  "E",
  "A",
  "D",
  "G",
];
const circleOfFifths = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "G#",
  "D#",
  "A#",
  "F",
];

const chordTypeConfigs = [
  { id: "chkChordMajor", type: "", groups: ["triads", "major"] },
  { id: "chkChordMinor", type: "m", groups: ["triads", "minor"] },
  { id: "chkChordAugmented", type: "aug", groups: ["triads", "major"] },
  { id: "chkChordDiminished", type: "dim", groups: ["triads", "minor"] },
  {
    id: "chkChordSuspendedFourth",
    type: "sus4",
    groups: ["triads", "major"],
  },
  {
    id: "chkChordSuspendedSecond",
    type: "sus2",
    groups: ["triads", "minor"],
  },
  { id: "chkChordSixth", type: "6", groups: ["sixths", "major"] },
  { id: "chkChordMinorSixth", type: "m6", groups: ["sixths", "minor"] },
  { id: "chkChordSeventh", type: "7", groups: ["sevenths", "major"] },
  { id: "chkChordMinorSeventh", type: "m7", groups: ["sevenths", "minor"] },
  { id: "chkChordMajorSeventh", type: "M7", groups: ["sevenths", "major"] },
  {
    id: "chkChordMinorMajorSeventh",
    type: "mM7",
    groups: ["sevenths", "minor"],
  },
  {
    id: "chkChordAugmentedSeventh",
    type: "aug7",
    groups: ["sevenths", "major"],
  },
  {
    id: "chkChordHalfDiminishedSeventh",
    type: "m7b5",
    groups: ["sevenths", "minor"],
  },
  {
    id: "chkChordAugmentedMajorSeventh",
    type: "augM7",
    groups: ["sevenths", "major"],
  },
  {
    id: "chkChordDiminishedSeventh",
    type: "dim7",
    groups: ["sevenths", "minor"],
  },
];

const chordTypeGroups = chordTypeConfigs.reduce((result, config) => {
  config.groups.forEach((group) => {
    if (!result[group]) result[group] = [];
    result[group].push(config.id);
  });
  return result;
}, {});

const chordTypeIds = chordTypeConfigs.map((config) => config.id);

function requireElement(id) {
  if (hasDocument) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Expected element with id '${id}'`);
    }
    return el;
  }
  if (!elementStubs[id]) {
    elementStubs[id] = createElementStub(id);
  }
  return elementStubs[id];
}

const chordCheckboxes = chordTypeConfigs.reduce((acc, { id }) => {
  acc[id] = requireElement(id);
  return acc;
}, {});

const keyCheckboxes = allNotes.reduce((acc, note) => {
  acc[note] = requireElement(note);
  return acc;
}, {});

const chordToggleButtons = {
  allOn: requireElement("btnChordsAllOn"),
  allOff: requireElement("btnChordsAllOff"),
  triadsOn: requireElement("btnChordsTriadsOn"),
  triadsOff: requireElement("btnChordsTriadsOff"),
  sixthsOn: requireElement("btnChordsSixthsOn"),
  sixthsOff: requireElement("btnChordsSixthsOff"),
  seventhsOn: requireElement("btnChordsSeventhsOn"),
  seventhsOff: requireElement("btnChordsSeventhsOff"),
  majorsOn: requireElement("btnChordsMajorOn"),
  majorsOff: requireElement("btnChordsMajorOff"),
  minorsOn: requireElement("btnChordsMinorOn"),
  minorsOff: requireElement("btnChordsMinorOff"),
};

const keyPresetButtons = {
  normal: requireElement("btnKeysNormal"),
  white: requireElement("btnKeysWhite"),
  black: requireElement("btnKeysBlack"),
  sharps: requireElement("btnKeysSharps"),
  flats: requireElement("btnKeysFlats"),
  none: requireElement("btnKeysNone"),
  all: requireElement("btnKeysAll"),
};

const optionsPanels = {
  tabKeys: requireElement("panelOptionsKeys"),
  tabDisplay: requireElement("panelOptionsDisplay"),
  tabVoicings: requireElement("panelOptionsVoicings"),
  tabSpacedRep: requireElement("panelOptionsSpacedRep"),
  tabPresets: requireElement("panelOptionsPresets"),
  tabWorkouts: requireElement("panelOptionsWorkouts"),
  tabMidi: requireElement("panelOptionsMidi"),
};

const modeSections = {
  chordOptions: requireElement("panelModeChords"),
  progressionOptions: requireElement("panelModeProgressions"),
  songsOptions: requireElement("panelModeSongs"),
  degreesOptions: requireElement("panelModeDegrees"),
  scalesOptions: requireElement("panelModeScales"),
  jazzOptions: requireElement("panelModeJazz"),
};

const radioGroupSelections = {};

function createRadioGroup(name, specs) {
  const group = {};
  let detected = null;
  specs.forEach(({ id, value, defaultChecked }) => {
    const el = requireElement(id);
    if (typeof value !== "undefined") el.value = value;
    if (el.checked) detected = value;
    group[value] = el;
    if (!hasDocument && typeof el.checked === "boolean") {
      el.checked = !!defaultChecked;
    }
  });
  if (!detected) {
    const fallback =
      specs.find((spec) => spec.defaultChecked) || specs[0] || null;
    detected = fallback ? fallback.value : null;
  }
  if (detected !== null && typeof detected !== "undefined") {
    radioGroupSelections[name] = detected;
  }
  return group;
}

const radioGroups = {
  mode: createRadioGroup("mode", [
    { id: "tabModeChords", value: "tabChords", defaultChecked: true },
    { id: "tabModeProgressions", value: "tabProgressions" },
    { id: "tabModeSongs", value: "tabSongs" },
    { id: "tabModeScales", value: "tabScales" },
    { id: "tabModeDegrees", value: "tabDegrees" },
    { id: "tabModeJazz", value: "tabJazz" },
  ]),
  voicingMode: createRadioGroup("voicingMode", [
    { id: "radVoicingDefault", value: "default", defaultChecked: true },
    { id: "radVoicingShellR37", value: "shell:r37" },
    { id: "radVoicingShellR3Or7", value: "shell:r3or7" },
    { id: "radVoicingShell37", value: "shell:37" },
    { id: "radVoicingUpperTypeA", value: "upper:typeA" },
    { id: "radVoicingUpperTypeB", value: "upper:typeB" },
    { id: "radVoicingUpperEither", value: "upper:either" },
    { id: "radVoicingUpperOneTypeA", value: "upper1:typeA" },
    { id: "radVoicingUpperOneTypeB", value: "upper1:typeB" },
    { id: "radVoicingUpperOneEither", value: "upper1:either" },
  ]),
};

const jazzBrickButtons = {
  basic: requireElement("btnJazzBricksBasic"),
  intermediate: requireElement("btnJazzBricksIntermediate"),
  turnarounds: requireElement("btnJazzBricksTurnarounds"),
  metabricks: requireElement("btnJazzBricksMetabricks"),
  dropbacks: requireElement("btnJazzBricksDropbacks"),
  all: requireElement("btnJazzBricksAll"),
  none: requireElement("btnJazzBricksNone"),
};

const degreeCheckboxes = hasDocument
  ? Array.from(
      document.querySelectorAll("#panelModeDegrees input[type='checkbox']"),
    ).reduce((acc, el) => {
      acc[el.id] = el;
      return acc;
    }, {})
  : {};

const statCategoryKeys = [
  "chords",
  "progressions",
  "degrees",
  "scales",
  "bricks",
];

const statGoalInputIds = {
  chords: {
    correct: "inputChordsGoalCorrect",
    total: "inputChordsGoalTotal",
  },
  progressions: {
    correct: "inputProgressionsGoalCorrect",
    total: "inputProgressionsGoalTotal",
  },
  degrees: {
    correct: "inputDegreesGoalCorrect",
    total: "inputDegreesGoalTotal",
  },
  scales: {
    correct: "inputScalesGoalCorrect",
    total: "inputScalesGoalTotal",
  },
  bricks: {
    correct: "inputBricksGoalCorrect",
    total: "inputBricksGoalTotal",
  },
};

const statCardIds = {
  chords: "statCardChords",
  progressions: "statCardProgressions",
  degrees: "statCardDegrees",
  scales: "statCardScales",
  bricks: "statCardBricks",
};

const statTotalIds = {
  chords: "txtChordsTotal",
  progressions: "txtProgressionsTotal",
  degrees: "txtDegreesTotal",
  scales: "txtScalesTotal",
  bricks: "txtBricksTotal",
};

const statGoalInputs = statCategoryKeys.reduce((acc, key) => {
  const ids = statGoalInputIds[key];
  acc[key] = {
    correct: requireElement(ids.correct),
    total: requireElement(ids.total),
  };
  return acc;
}, {});

const statCardElements = statCategoryKeys.reduce((acc, key) => {
  acc[key] = requireElement(statCardIds[key]);
  return acc;
}, {});

const statTotalElements = statCategoryKeys.reduce((acc, key) => {
  acc[key] = requireElement(statTotalIds[key]);
  return acc;
}, {});

const domElements = {
  hideProgressionChordNames: requireElement("chkDisplayHideProgressionNames"),
  hideProgressionChordNumerals: requireElement(
    "chkDisplayHideProgressionNumerals",
  ),
  progressionOptions: requireElement("panelModeProgressions"),
  progressionSelect: requireElement("selectProgression"),
  songPanel: requireElement("panelModeSongs"),
  songUrlInput: requireElement("inputSongsUrl"),
  songImportButton: requireElement("btnSongsImport"),
  songDeleteButton: requireElement("btnSongsDelete"),
  songClearButton: requireElement("btnSongsClear"),
  songSelect: requireElement("selectSong"),
  songFavoriteToggle: requireElement("chkSongFavorite"),
  songFinishAction: requireElement("selectSongFinishAction"),
  songRepeatCount: requireElement("inputSongRepeatCount"),
  songCountGoals: requireElement("chkSongCountsTowardGoals"),
  songStatus: requireElement("txtSongsStatus"),
  flowSelect: requireElement("selectFlow"),
  flowResetButton: requireElement("btnFlowReset"),
  flowStartSelect: requireElement("selectFlowStart"),
  currentKey: requireElement("txtCurrentKey"),
  progressionDisplay: requireElement("txtProgression"),
  cadenceDisplay: requireElement("txtCadence"),
  chordDisplay: requireElement("txtChord"),
  cntChordsCorrect: requireElement("txtChordsCorrect"),
  cntProgsCorrect: requireElement("txtProgressionsCorrect"),
  cntScalesCorrect: requireElement("txtScalesCorrect"),
  cntDegreesCorrect: requireElement("txtDegreesCorrect"),
  cntBricksCorrect: requireElement("txtBricksCorrect"),
  cntChordsIncorrect: requireElement("txtChordsIncorrect"),
  cntProgsIncorrect: requireElement("txtProgressionsIncorrect"),
  cntScalesIncorrect: requireElement("txtScalesIncorrect"),
  cntDegreesIncorrect: requireElement("txtDegreesIncorrect"),
  cntBricksIncorrect: requireElement("txtBricksIncorrect"),
  cntChordsTotal: statTotalElements.chords,
  cntProgsTotal: statTotalElements.progressions,
  cntScalesTotal: statTotalElements.scales,
  cntDegreesTotal: statTotalElements.degrees,
  cntBricksTotal: statTotalElements.bricks,
  resetStatsButton: requireElement("btnStatsReset"),
  statGoals: statGoalInputs,
  statCards: statCardElements,
  statTotals: statTotalElements,
  optionsPanels,
  modeSections,
  jazzBrickButtons,
  degreeCheckboxes,
  piano: requireElement("panelPiano"),
  keyboardDetails: requireElement("panelKeyboard"),
  skipButton: requireElement("btnSkip"),
  playAnswerButton: requireElement("btnPlayAnswer"),
  spacedRepClearButton: requireElement("btnSpacedRepClear"),
  optionsTabKeys: requireElement("tabOptionsKeys"),
  enableSpacedRepetition: requireElement("chkSpacedRepEnable"),
  spacedRepThreshold: requireElement("inputSpacedRepThreshold"),
  randomizeSpellings: requireElement("chkDisplayRandomizeSpellings"),
  highlightCorrectKeys: requireElement("chkDisplayHighlightKeys"),
  highlightDelay: requireElement("inputDisplayHighlightDelay"),
  spacedRepList: requireElement("panelSpacedRepList"),
  customProgressionInput: requireElement("inputProgressionCustom"),
  randomProgressionCount: requireElement("inputProgressionRandomCount"),
  sendMidiNotes: requireElement("chkEarSendMidi"),
  midiStatusText: requireElement("txtMidiStatus"),
  midiInputs: requireElement("tableMidiInputs"),
  midiOutputs: requireElement("tableMidiOutputs"),
  settingsPresetSelect: requireElement("selectSettingsPreset"),
  settingsPresetName: requireElement("inputSettingsPresetName"),
  settingsSaveButton: requireElement("btnSettingsSave"),
  settingsLoadButton: requireElement("btnSettingsLoad"),
  settingsOverwriteButton: requireElement("btnSettingsOverwrite"),
  settingsDeleteButton: requireElement("btnSettingsDelete"),
  settingsResetButton: requireElement("btnSettingsReset"),
  settingsExportButton: requireElement("btnSettingsExport"),
  settingsDebugPanel: requireElement("panelSettingsDebug"),
  workoutPanel: requireElement("panelOptionsWorkouts"),
  workoutSelect: requireElement("selectWorkout"),
  workoutNameInput: requireElement("inputWorkoutName"),
  workoutNewButton: requireElement("btnWorkoutNew"),
  workoutSaveButton: requireElement("btnWorkoutSave"),
  workoutDeleteButton: requireElement("btnWorkoutDelete"),
  workoutPresetSelect: requireElement("selectWorkoutPreset"),
  workoutGoalInputs: {
    correct: requireElement("inputWorkoutGoalCorrect"),
    total: requireElement("inputWorkoutGoalTotal"),
  },
  workoutAddEntryButton: requireElement("btnWorkoutAddEntry"),
  workoutEntriesPanel: requireElement("panelWorkoutEntries"),
  scalesButtons: requireElement("panelScalesButtons"),
  scalesSelected: requireElement("panelScalesSelected"),
  scaleCheckboxes: {},
  chordCheckboxes,
  chordToggleButtons,
  keyCheckboxes,
  keyPresetButtons,
  modeRadios: radioGroups.mode,
  radioGroups,
  radioSelections: radioGroupSelections,
};

appGlobals.domElements = domElements;
appGlobals.dom = domElements;
if (appGlobals.root) {
  appGlobals.root.domElements = domElements;
  appGlobals.root.dom = domElements;
}

const chordStructures = {
  "": [0, 4, 7], // Major
  m: [0, 3, 7], // Minor
  dim: [0, 3, 6],
  aug: [0, 4, 8],

  sus2: [0, 2, 7],
  sus4: [0, 5, 7],

  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],

  7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  M7: [0, 4, 7, 11],
  mM7: [0, 3, 7, 11],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  "7b5": [0, 4, 6, 10],
  aug7: [0, 4, 8, 10],
  augM7: [0, 4, 8, 11],

  9: [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  M9: [0, 4, 7, 11, 14],

  11: [0, 4, 7, 10, 14],
  m11: [0, 3, 7, 10, 14, 17],
  M11: [0, 4, 7, 11, 14],

  13: [0, 4, 7, 10, 14, 21],
  m13: [0, 3, 7, 10, 14, 17, 21],
  M13: [0, 4, 7, 11, 14, 21],

  "7b9": [0, 4, 7, 10, 13],
  "7#9": [0, 4, 7, 10, 15],
  "7#11": [0, 4, 7, 10, 18],
};

const chordStructureNames = {
  "": [""],
  m: ["m", "mi", "min", "-"],
  dim: ["dim", "o", "º"],
  aug: ["aug", "+"],

  sus2: ["sus2"],
  sus4: ["sus", "sus4"],

  6: ["6"],
  m6: ["m6", "mi6", "min6", "-6"],

  7: ["7"],
  m7: ["m7", "mi7", "min7", "-7"],
  M7: ["M7", "ma7", "maj7", "△7", "△"],
  mM7: ["mM7", "m maj7", "-△7", "-△"],
  dim7: ["dim7", "o7", "º7"],
  m7b5: ["m7b5", "-7b5", "ø", "ø7"],
  aug7: ["7#5", "+7", "aug7"],
  augM7: ["M7#5", "+M7", "augM7"],

  9: ["9"],
  m9: ["m9", "min9", "-9"],
  M9: ["M9", "maj9", "△9"],

  11: ["11"],
  m11: ["m11", "min11", "-11"],
  M11: ["M11", "maj11", "△11"],

  13: ["13"],
  m13: ["m13", "min13", "-13"],
  M13: ["M13", "maj13", "△13"],

  "7b9": ["7b9"],
  "7#9": ["7#9", "7+9"],
  "7#11": ["7#11", "7+11"],
};

function splitChordInternalName(chordInternalName) {
  const match = chordInternalName
    ? chordInternalName.match(/^[A-G](#|b)?/)
    : null;
  const rootName = match ? match[0] : "C";
  const chordType = chordInternalName
    ? chordInternalName.slice(rootName.length)
    : "";
  return { rootName, chordType };
}

function generateNotesFromChordName(chordName) {
  const rootMatch = chordName ? chordName.match(/^[A-G](#|b)?/) : null;
  if (!rootMatch) return [];
  const rootValue = noteValues[rootMatch[0]];
  const chordType = chordName.replace(rootMatch[0], "");
  for (const key in chordStructureNames) {
    if (chordStructureNames[key].includes(chordType)) {
      return chordStructures[key].map((interval) => rootValue + interval);
    }
  }
  if (typeof console !== "undefined" && console.error) {
    console.error("Unknown chord type:", chordType);
  }
  return [];
}

function normalizePitchClass(value) {
  const mod = value % 12;
  return mod < 0 ? mod + 12 : mod;
}

function nextPitchClassAbove(previous, targetPc) {
  const start = previous + 1;
  const offset = (targetPc - (start % 12) + 12) % 12;
  return start + offset;
}

function buildAscendingMidiSequence(order, start = 48) {
  const normalized = order.map(normalizePitchClass);
  const notes = [];
  let prev = start - 1;
  for (let i = 0; i < normalized.length; i++) {
    const next = nextPitchClassAbove(prev, normalized[i]);
    notes.push(next);
    prev = next;
  }
  return notes;
}

function buildAscendingVoicingFromOrder(order) {
  return buildAscendingMidiSequence(order).map((m) => m - 48);
}

function buildVoicingOrders(intervals, requiredLength) {
  if (requiredLength === 3) {
    return {
      orderA: [intervals.third, intervals.seventh, intervals.ninth],
      orderB: [intervals.seventh, intervals.third, intervals.fifth],
    };
  }
  return {
    orderA: [
      intervals.third,
      intervals.seventh,
      intervals.ninth,
      intervals.fifth,
    ],
    orderB: [
      intervals.seventh,
      intervals.third,
      intervals.fifth,
      intervals.ninth,
    ],
  };
}

function getTargetUpperIntervals(chordInternalName) {
  const { rootName, chordType } = splitChordInternalName(chordInternalName);
  const rootVal = noteValues[rootName];
  const isMinorish = /(^m(?!aj)|m(?!aj)|dim|ø)/.test(chordType);
  const third = normalizePitchClass(rootVal + (isMinorish ? 3 : 4));

  let seventhInterval;
  if (/M7/.test(chordType)) seventhInterval = 11;
  else if (/dim7/.test(chordType)) seventhInterval = 9;
  else if (chordType === "6" || chordType === "m6") seventhInterval = 9;
  else if (/7/.test(chordType) || isMinorish) seventhInterval = 10;
  else seventhInterval = 10;
  const seventh = normalizePitchClass(rootVal + seventhInterval);

  let fifthInterval = 7;
  if (/aug/.test(chordType)) fifthInterval = 8;
  if (/m7b5|dim/.test(chordType)) fifthInterval = 6;
  const fifth = normalizePitchClass(rootVal + fifthInterval);

  const hasSharp9 = /(\+9|#9)/.test(chordType);
  const hasFlat9 = /b9/.test(chordType);
  let ninthInterval = 14;
  if (/dim7/.test(chordType)) ninthInterval = 13;
  if (hasSharp9) ninthInterval = 15;
  else if (hasFlat9) ninthInterval = 13;
  const ninth = normalizePitchClass(rootVal + ninthInterval);

  return { third, seventh, ninth, fifth };
}

function resolveUpperVoicing(mode, requiredLength, intervalsOrProvider) {
  if (mode !== "typeA" && mode !== "typeB" && mode !== "either") return null;
  const intervals =
    typeof intervalsOrProvider === "function"
      ? intervalsOrProvider()
      : intervalsOrProvider;
  if (!intervals) return null;
  const { orderA, orderB } = buildVoicingOrders(intervals, requiredLength);
  const renderOrder = mode === "typeB" ? orderB : orderA;
  return buildAscendingVoicingFromOrder(renderOrder);
}

function matchesVoicingOrderSorted(ascendingNotes, order) {
  if (ascendingNotes.length !== order.length) return false;
  const normalizedOrder = order.map(normalizePitchClass);
  const notes = ascendingNotes.map((n) => Number(n));
  if (notes.some(Number.isNaN)) return false;
  if (normalizePitchClass(notes[0]) !== normalizedOrder[0]) return false;

  let prev = notes[0];
  for (let i = 1; i < normalizedOrder.length; i++) {
    const note = notes[i];
    const expectedPc = normalizedOrder[i];
    if (normalizePitchClass(note) !== expectedPc) return false;
    if (note < nextPitchClassAbove(prev, expectedPc)) return false;
    prev = note;
  }
  return true;
}

function computeShellVoicing(notes, chordInternalName, mode) {
  if (!Array.isArray(notes) || !notes.length) {
    return { notes: [], alternates: null };
  }
  if (!mode || mode === "off") {
    return { notes: notes.slice(), alternates: null };
  }

  const { chordType } = splitChordInternalName(chordInternalName || "");
  const isPureSixChord = /^m?6$/.test(chordType);
  const root = notes[0];
  const thirdCandidate = notes.length > 1 ? notes[1] : undefined;
  let seventhCandidate = notes.length > 3 ? notes[3] : undefined;
  let sixthCandidate;

  if (typeof seventhCandidate === "number") {
    const intervalToFourth = normalizePitchClass(seventhCandidate - root);
    if (intervalToFourth === 9 && isPureSixChord) {
      sixthCandidate = seventhCandidate;
      seventhCandidate = undefined;
    } else {
      const qualifiesAsSeventh =
        intervalToFourth === 10 ||
        intervalToFourth === 11 ||
        intervalToFourth === 9;
      if (!qualifiesAsSeventh) seventhCandidate = undefined;
    }
  }

  if (mode === "r37") {
    if (thirdCandidate !== undefined && seventhCandidate !== undefined) {
      return {
        notes: [root, thirdCandidate, seventhCandidate],
        alternates: null,
      };
    }
    if (thirdCandidate !== undefined && sixthCandidate !== undefined) {
      return {
        notes: [root, thirdCandidate, sixthCandidate],
        alternates: null,
      };
    }
    if (thirdCandidate !== undefined) {
      return { notes: [root, thirdCandidate], alternates: null };
    }
    return { notes: [root], alternates: null };
  }

  if (mode === "r3or7") {
    const combos = [];
    if (thirdCandidate !== undefined) combos.push([root, thirdCandidate]);
    if (seventhCandidate !== undefined) combos.push([root, seventhCandidate]);
    if (sixthCandidate !== undefined) combos.push([root, sixthCandidate]);

    if (combos.length === 0) {
      return { notes: [root], alternates: null };
    }
    if (combos.length === 1) {
      return { notes: combos[0], alternates: combos };
    }

    const result = [root];
    if (thirdCandidate !== undefined && !result.includes(thirdCandidate)) {
      result.push(thirdCandidate);
    }
    if (seventhCandidate !== undefined && !result.includes(seventhCandidate)) {
      result.push(seventhCandidate);
    }
    if (sixthCandidate !== undefined && !result.includes(sixthCandidate)) {
      result.push(sixthCandidate);
    }
    return { notes: result, alternates: combos };
  }

  if (mode === "37") {
    if (thirdCandidate !== undefined && seventhCandidate !== undefined) {
      return { notes: [thirdCandidate, seventhCandidate], alternates: null };
    }
    if (thirdCandidate !== undefined) {
      return { notes: [thirdCandidate], alternates: null };
    }
    return { notes: notes.slice(), alternates: null };
  }

  return { notes: notes.slice(), alternates: null };
}

function computeUpperVoicingForMode(chordInternalName, voicingMode) {
  if (!voicingMode) return null;
  const [family, mode] = voicingMode.split(":");
  if (family !== "upper" && family !== "upper1") return null;
  const requiredLength = family === "upper1" ? 3 : 4;
  return resolveUpperVoicing(mode, requiredLength, () =>
    getTargetUpperIntervals(chordInternalName),
  );
}

function applyVoicingToNotes(notes, chordInternalName, voicingMode) {
  if (!Array.isArray(notes)) {
    return { notes: [], alternates: null };
  }
  if (!voicingMode || voicingMode === "default") {
    return { notes: notes.slice(), alternates: null };
  }
  if (voicingMode.startsWith("upper:")) {
    const resolved = computeUpperVoicingForMode(chordInternalName, voicingMode);
    return resolved
      ? { notes: resolved, alternates: null }
      : { notes: notes.slice(), alternates: null };
  }
  if (voicingMode.startsWith("upper1:")) {
    const resolved = computeUpperVoicingForMode(chordInternalName, voicingMode);
    return resolved
      ? { notes: resolved, alternates: null }
      : { notes: notes.slice(), alternates: null };
  }
  if (voicingMode.startsWith("shell:")) {
    return computeShellVoicing(
      notes,
      chordInternalName,
      voicingMode.split(":")[1],
    );
  }
  return { notes: notes.slice(), alternates: null };
}

function applyVoicingMode(chordInternalName, voicingMode) {
  const base = generateNotesFromChordName(chordInternalName);
  return applyVoicingToNotes(base, chordInternalName, voicingMode);
}

const voicingUtils = {
  generateNotesFromChordName,
  normalizePitchClass,
  buildIntervalFlow,
  nextPitchClassAbove,
  buildAscendingMidiSequence,
  buildAscendingVoicingFromOrder,
  buildVoicingOrders,
  getTargetUpperIntervals,
  resolveUpperVoicing,
  matchesVoicingOrderSorted,
  computeShellVoicing,
  computeUpperVoicingForMode,
  applyVoicingToNotes,
  applyVoicingMode,
};

appGlobals.voicingUtils = voicingUtils;
if (appGlobals.root) {
  appGlobals.root.voicingUtils = voicingUtils;
}

const scales = {
  scaleIonian: {
    label: "Ionian",
    steps: [2, 2, 1, 2, 2, 2, 1],
    enabled: true,
  },
  scaleDorian: {
    label: "Dorian",
    steps: [2, 1, 2, 2, 2, 1, 2],
    enabled: false,
  },
  scalePhrygian: {
    label: "Phrygian",
    steps: [1, 2, 2, 2, 1, 2, 2],
    enabled: false,
  },
  scaleLydian: {
    label: "Lydian",
    steps: [2, 2, 2, 1, 2, 2, 1],
    enabled: false,
  },
  scaleMixolydian: {
    label: "Mixolydian",
    steps: [2, 2, 1, 2, 2, 1, 2],
    enabled: false,
  },
  scaleAeolian: {
    label: "Aeolian",
    steps: [2, 1, 2, 2, 1, 2, 2],
    enabled: true,
  },
  scaleLocrian: {
    label: "Locrian",
    steps: [1, 2, 2, 1, 2, 2, 2],
    enabled: false,
  },
  scaleHarmonicMinor: {
    label: "Harmonic Minor Scale",
    steps: [2, 1, 2, 2, 1, 3, 1],
    enabled: false,
  },
  scaleMelodicMinor: {
    label: "Melodic Minor Scale (Ascending)",
    steps: [2, 1, 2, 2, 2, 2, 1],
    enabled: false,
  },
  scalePentatonicMajor: {
    label: "Pentatonic Scale (Major)",
    steps: [2, 2, 3, 2, 3],
    enabled: false,
  },
  scalePentatonicMinor: {
    label: "Pentatonic Scale (Minor)",
    steps: [3, 2, 2, 3, 2],
    enabled: false,
  },
  scaleBlues: {
    label: "Blues Scale",
    steps: [3, 2, 1, 1, 3, 2],
    enabled: false,
  },
  scaleWholeTone: {
    label: "Whole Tone Scale",
    steps: [2, 2, 2, 2, 2, 2],
    enabled: false,
  },
  scaleChromatic: {
    label: "Chromatic Scale",
    steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    enabled: false,
  },
  scaleDiminishedWholeHalf: {
    label: "Diminished Scale (Whole-Half)",
    steps: [2, 1, 2, 1, 2, 1, 2, 1],
    enabled: false,
  },
  scaleDiminishedHalfWhole: {
    label: "Diminished Scale (Half-Whole)",
    steps: [1, 2, 1, 2, 1, 2, 1, 2],
    enabled: false,
  },
  scaleAugmented: {
    label: "Augmented Scale",
    steps: [3, 1, 3, 1, 3, 1],
    enabled: false,
  },
  scaleHungarianMinor: {
    label: "Hungarian Minor Scale",
    steps: [2, 1, 3, 1, 1, 3, 1],
    enabled: false,
  },
  scaleNeapolitanMajor: {
    label: "Neapolitan Major Scale",
    steps: [1, 2, 2, 2, 2, 2, 1],
    enabled: false,
  },
  scaleNeapolitanMinor: {
    label: "Neapolitan Minor Scale",
    steps: [1, 2, 2, 2, 1, 3, 1],
    enabled: false,
  },
};

const scaleGroups = {
  basic: ["scaleIonian", "scaleAeolian"],
  greekModes: [
    "scaleIonian",
    "scaleDorian",
    "scalePhrygian",
    "scaleLydian",
    "scaleMixolydian",
    "scaleAeolian",
    "scaleLocrian",
  ],
  classicalMusic: [
    "scaleIonian",
    "scaleAeolian",
    "scaleHarmonicMinor",
    "scaleMelodicMinor",
    "scaleNeapolitanMajor",
    "scaleNeapolitanMinor",
  ],
  jazzBlues: [
    "scalePentatonicMajor",
    "scalePentatonicMinor",
    "scaleBlues",
    "scaleWholeTone",
    "scaleChromatic",
    "scaleDiminishedWholeHalf",
    "scaleDiminishedHalfWhole",
  ],
  all: Object.keys(scales),
};

const jazzCadences = [
  { name: "Amen", chords: ["IVΔ", "IΔ"], enabled: false },
  {
    name: "Autumnal",
    chords: ["ii7", "V7", "viiø", "III7", "viΔ"],
    enabled: false,
  },
  {
    name: "Body & Soul",
    chords: ["ii7", "VI7", "ii7", "V7", "IΔ", "IΔ"],
    enabled: false,
  },
  { name: "Dizzy", chords: ["bvi7", "bII7", "IΔ", "IΔ"], enabled: false },
  { name: "Dogleg", chords: ["vi7", "II7", "ii7", "V7", "IΔ"], enabled: false },
  {
    name: "(7-chord) Dropback",
    chords: ["ii7", "V7", "IΔ", "VI7", "ii7", "V7", "IΔ"],
    enabled: false,
  },
  { name: "Extended", chords: ["vi7", "ii7", "V7", "IΔ"], enabled: false },
  {
    name: "Happenstance",
    chords: ["#iv7", "VII7", "IΔ", "IΔ"],
    enabled: false,
  },
  { name: "Long", chords: ["iii7", "VI7", "ii7", "V7", "IΔ"], enabled: false },
  { name: "Overrun", chords: ["ii7", "V7", "IΔ", "IVΔ"], enabled: false },
  {
    name: "Moment’s",
    chords: ["#i7", "#IV7", "ii7", "V7", "IΔ", "IΔ"],
    enabled: false,
  },
  { name: "Night & Day", chords: ["bVIΔ", "V7", "IΔ", "IΔ"], enabled: false },
  { name: "Nobody’s", chords: ["IΔ", "III7", "viΔ"], enabled: false },
  { name: "Nowhere", chords: ["bVI7", "V7", "IΔ", "IΔ"], enabled: false },
  {
    name: "(7-chord) Pullback",
    chords: ["ii7", "V7", "iii7", "VI7", "ii7", "V7", "IΔ"],
    enabled: false,
  },
  { name: "Rainbow", chords: ["IΔ", "III7", "IVΔ", "IVΔ"], enabled: false },
  {
    name: "Rainy",
    chords: ["iii7", "bIIIø", "ii7", "V7", "IΔ", "IΔ"],
    enabled: false,
  },
  {
    name: "Satin",
    chords: ["vi7", "ii7", "bvi7", "bII7", "IΔ", "IΔ"],
    enabled: false,
  },
  {
    name: "Spring",
    chords: ["VIIø", "III7", "ii7", "V7", "IΔ", "IΔ"],
    enabled: false,
  },
  {
    name: "Stablemates",
    chords: ["biii7", "bVI7", "ii7", "V7", "IΔ", "IΔ"],
    enabled: false,
  },
  {
    name: "Starlight",
    chords: ["#IVø", "VII7", "iii7", "VI7", "ii7", "V7", "IΔ"],
    enabled: false,
  },
  {
    name: "Starlight N&D Variant",
    chords: ["#IVø", "vi7", "biiio7", "VI7", "ii7", "V7", "IΔ"],
    enabled: false,
  },
  { name: "Regular", chords: ["ii7", "V7", "IΔ"], enabled: false },
  {
    name: "Regular (minor)",
    chords: ["iiø", "V7+9", "IΔ", "IΔ"],
    enabled: false,
  },
  { name: "Tension Ending", chords: ["ii7", "V7", "I7", "I7"], enabled: false },
  {
    name: "Tritone Substitution",
    chords: ["ii7", "bII7", "IΔ", "IΔ"],
    enabled: false,
  },
  {
    name: "Two-Goes",
    chords: ["ii7", "V7", "ii7", "V7", "IΔ"],
    enabled: false,
  },
  { name: "Yardbird", chords: ["iv7", "bVII7", "IΔ", "IΔ"], enabled: false },
  // Turnarounds
  { name: "Foggy", chords: ["IΔ", "bIII7", "ii7", "V7"], enabled: false },
  { name: "II ’n’ Back", chords: ["ii7", "#iio7", "iii7"], enabled: false },
  { name: "Ladybird", chords: ["IΔ", "bIII7", "bVIΔ", "bII7"], enabled: false },
  {
    name: "Nowhere (turnaround)",
    chords: ["IΔ", "VI7", "bVI7", "V7"],
    enabled: false,
  },
  {
    name: "Pennies",
    chords: ["IΔ", "ii7", "iii7", "bIIIø", "ii7", "V7"],
    enabled: false,
  },
  { name: "POT", chords: ["IΔ", "VI7", "ii7", "V7"], enabled: false },
  { name: "POT (minor)", chords: ["iΔ", "viø", "iiø", "V7+9"], enabled: false },
  { name: "Rhythm", chords: ["IΔ", "bIIo7", "ii7", "bIIIo7"], enabled: false },
  { name: "SPOT", chords: ["iii7", "VI7", "ii7", "V7"], enabled: false },
  {
    name: "To IV 'n' Back",
    chords: ["IΔ", "I7", "IVΔ", "#IVo7", "IΔ"],
    enabled: false,
  },
  {
    name: "To IV 'n' Hack",
    chords: ["IΔ", "I7", "IVΔ", "VII7", "IΔ"],
    enabled: false,
  },
  {
    name: "To IV 'n' Mack",
    chords: ["IΔ", "I7", "IVΔ", "ivΔ", "IΔ"],
    enabled: false,
  },
  {
    name: "To IV 'n' Yak",
    chords: ["IΔ", "I7", "IVΔ", "bVII7", "IΔ"],
    enabled: false,
  },
  { name: "Whoopee", chords: ["IΔ", "bIIo7", "ii7", "V7"], enabled: false },
  // Metabricks
  {
    name: "Autumn Leaves Opening",
    chords: ["ii7", "V7", "IΔ", "IVΔ", "viiø", "III7", "viΔ", "VI7"],
    enabled: false,
  },
  {
    name: "Four-Star Ending",
    chords: ["IVΔ", "#iv7", "VII7", "iii7", "VI7", "ii7", "V7", "IΔ", "IΔ"],
    enabled: false,
  },
  {
    name: "Honeysuckle Bridge",
    chords: ["v7", "I7", "IVΔ", "IVΔ", "vi7", "II7", "ii7", "V7"],
    enabled: false,
  },
  {
    name: "ITCHY Opening",
    chords: ["IΔ", "iii7", "VI7", "ii7", "#iv7", "VII7"],
    enabled: false,
  },
  {
    name: "On-Off(any dom7)-On + Dropback",
    chords: ["IΔ", "III7", "IΔ", "VI7"],
    enabled: false,
  },
  {
    name: "Pennies Ending",
    chords: ["IVΔ", "#ivo7", "IΔ", "iii7", "VI7", "ii7", "V7", "IΔ", "IΔ"],
    enabled: false,
  },
  {
    name: "Rhythm Bridge",
    chords: ["vii7", "III7", "iii7", "VI7", "iv7", "II7", "ii7", "V7"],
    enabled: false,
  },
  {
    name: "Sharp Fourpenny Ending",
    chords: [
      "#ivø",
      "iv7",
      "bVII7",
      "IΔ",
      "iii7",
      "VI7",
      "ii7",
      "V7",
      "IΔ",
      "IΔ",
    ],
    enabled: false,
  },
  {
    name: "Sixpenny Ending",
    chords: [
      "vi7",
      "iv7",
      "bVII7",
      "IΔ",
      "iii7",
      "VI7",
      "ii7",
      "V7",
      "IΔ",
      "IΔ",
    ],
    enabled: false,
  },
  {
    name: "To IV ’n’ Bird SPOT",
    chords: ["IΔ", "I7", "IVΔ", "bVII7", "iii7", "VI7", "ii7", "V7"],
    enabled: false,
  },
  {
    name: "Twopenny Ending",
    chords: ["ii7", "iv7", "bVII7", "IΔ", "iii7", "VI7", "ii7", "V7", "IΔ"],
    enabled: false,
  },
  // Miscellaneous
  {
    name: "Chromatic Dropback",
    chords: ["IΔ", "VII7", "bVII7", "VI7", "ii7"],
    enabled: false,
  },
  {
    name: "Dogleg Dropback",
    chords: ["ii7", "V7", "v7", "I7", "i7"],
    enabled: false,
  },
  { name: "Dropback", chords: ["IΔ", "VI7", "ii7"], enabled: false },
  {
    name: "Raindrop Dropback",
    chords: ["iii7", "bIIIo7", "ii7"],
    enabled: false,
  },
  {
    name: "Starlight Dropback",
    chords: ["#iv7", "VII7", "iii7", "VI7", "ii7"],
    enabled: false,
  },
  {
    name: "TINGLe Dropback",
    chords: ["IΔ", "IV7", "bVII7", "VI7", "ii7"],
    enabled: false,
  },
  {
    name: "TTFA Dropback",
    chords: ["IΔ", "IV7", "iii7", "VI7", "ii7"],
    enabled: false,
  },
];

jazzCadences.forEach((cadence) => {
  if (!cadence.element) {
    cadence.element = createElementStub(`jazzCadence:${cadence.name}`);
  }
  cadence.element.checked = !!cadence.enabled;
});

const jazzCadencesBasic = [
  "POT",
  "Dropback",
  "Pullback",
  "Regular",
  "Two-Goes",
  "Long",
  "Overrun",
];

const jazzCadencesIntermediate = [
  "SPOT",
  "Nowhere (turnaround)",
  "TTFA Dropback",
  "Yardbird",
  "Starlight",
  "Rainy",
];

const jazzCadencesTurnarounds = [
  "Foggy",
  "II ’n’ Back",
  "Ladybird",
  "Nowhere (turnaround)",
  "Pennies",
  "POT",
  "POT (minor)",
  "Rhythm",
  "SPOT",
  "To IV 'n' Back",
  "To IV 'n' Hack",
  "To IV 'n' Mack",
  "To IV 'n' Yak",
  "Whoopee",
];

const jazzCadencesMetabricks = [
  "Autumn Leaves Opening",
  "Four-Star Ending",
  "Honeysuckle Bridge",
  "ITCHY Opening",
  "On-Off(any dom7)-On + Dropback",
  "Pennies Ending",
  "Rhythm Bridge",
  "Sharp Fourpenny Ending",
  "Sixpenny Ending",
  "To IV ’n’ Bird SPOT",
  "Twopenny Ending",
];

const jazzCadencesDropbacks = [
  "Chromatic Dropback",
  "Dogleg Dropback",
  "Dropback",
  "Raindrop Dropback",
  "Starlight Dropback",
  "TINGLe Dropback",
  "TTFA Dropback",
];

const SETTINGS_STORAGE_KEY = "chordChallenge.settings";
const SETTINGS_PRESETS_KEY = "chordChallenge.settings.presets";
const WORKOUTS_STORAGE_KEY = "chordChallenge.workouts";
const WORKOUTS_SELECTED_KEY = "chordChallenge.workouts.selected";
const SONGS_STORAGE_KEY = "chordChallenge.songs";
const SONGS_SELECTED_KEY = "chordChallenge.songs.selected";
const SONGS_FINISH_ACTIONS = {
  nothing: "nothing",
  nextFavorite: "nextFavorite",
  randomFavorite: "randomFavorite",
  nextSong: "nextSong",
  randomSong: "randomSong",
};
const SONGS_FINISH_ACTION_VALUES = Object.values(SONGS_FINISH_ACTIONS);
const DEFAULT_SONG_REPEAT_COUNT = 3;
const IREAL_PRO_URI_REGEX = /.*?(irealb(?:ook)?):\/\/([^"]*)/;
const IREAL_PRO_SCRAMBLE_MARKER = "1r34LbKcu7";
const IREAL_PRO_CHORD_REGEX =
  /^([A-G][b#]?)((?:sus|alt|add|[+\-^\dhob#])*)(\*.+?\*)*(\/[A-G][#b]?)?(\(.*?\))?/;
const IREAL_PRO_SPACER_CHORD_REGEX = /^([ Wp])()()(\/[A-G][#b]?)?(\(.*?\))?/;
const IREAL_PRO_TOKEN_PATTERNS = [
  { type: "section", regex: /^\*[a-zA-Z]/ },
  { type: "timeSignature", regex: /^T\d\d/ },
  { type: "ending", regex: /^N./ },
  { type: "comment", regex: /^<.*?>/ },
  { type: "chord", regex: IREAL_PRO_CHORD_REGEX },
  { type: "chord", regex: IREAL_PRO_SPACER_CHORD_REGEX },
];
const IREAL_PRO_TIME_SIGNATURES = {
  T22: "2/2",
  T24: "2/4",
  T32: "3/2",
  T34: "3/4",
  T44: "4/4",
  T54: "5/4",
  T58: "5/8",
  T64: "6/4",
  T68: "6/8",
  T74: "7/4",
  T78: "7/8",
  T98: "9/8",
  T12: "12/8",
};
const IREAL_PRO_QUALITY_TO_INTERNAL = {
  "": "",
  2: "sus2",
  5: "",
  add9: "",
  "+": "aug",
  o: "dim",
  sus: "sus4",
  "^": "",
  "-": "m",
  "^7": "M7",
  "-7": "m7",
  7: "7",
  "7sus": "sus4",
  h7: "m7b5",
  o7: "dim7",
  "^9": "M9",
  "^13": "M13",
  6: "6",
  69: "6",
  "^7#11": "M7",
  "^9#11": "M9",
  "^7#5": "augM7",
  "-6": "m6",
  "-69": "m6",
  "-^7": "mM7",
  "-^9": "mM7",
  "-9": "m9",
  "-11": "m11",
  "-7b5": "m7b5",
  h9: "m7b5",
  "-b6": "m6",
  "-#5": "m",
  9: "9",
  "7b9": "7b9",
  "7#9": "7#9",
  "7#11": "7#11",
  "7b5": "7",
  "7#5": "aug7",
  "9#11": "9",
  "9b5": "9",
  "9#5": "9",
  "7b13": "7",
  "7#9#5": "7#9",
  "7#9b5": "7#9",
  "7#9#11": "7#9",
  "7b9#11": "7b9",
  "7b9b5": "7b9",
  "7b9#5": "7b9",
  "7b9#9": "7b9",
  "7b9b13": "7b9",
  "7alt": "7",
  13: "13",
  "13#11": "13",
  "13b9": "13",
  "13#9": "13",
  "7b9sus": "sus4",
  "7susadd3": "sus4",
  "9sus": "sus4",
  "13sus": "sus4",
  "7b13sus": "sus4",
  "11,min13": "11",
  min13: "m13",
  "min^11": "m11",
  "min^13": "m13",
  "maj13#11": "M13",
  maj7b5: "M7",
  "maj7#9": "M7",
  min7b6: "m7",
  min9b6: "m9",
  "maj(add4)": "",
  "min(add4)": "m",
  "7(add13)": "7",
};

function getStorageHandle() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch (_) {}
  if (globalRoot && globalRoot.localStorage) return globalRoot.localStorage;
  return null;
}

function cloneObject(value) {
  if (Array.isArray(value)) return value.map((item) => cloneObject(item));
  if (value && typeof value === "object") {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = cloneObject(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function mergeSettings(base, extra) {
  if (!extra) return cloneObject(base);
  const result = cloneObject(base);
  Object.keys(extra).forEach((key) => {
    const incoming = extra[key];
    if (
      incoming &&
      typeof incoming === "object" &&
      !Array.isArray(incoming) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergeSettings(result[key], incoming);
    } else {
      result[key] = cloneObject(incoming);
    }
  });
  return result;
}

function normalizeTextValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseIRealProTitle(title) {
  return normalizeTextValue(title).replace(/(.*)(, )(A|The)$/g, "$3 $1");
}

function parseIRealProComposer(composer) {
  const normalized = normalizeTextValue(composer);
  const parts = normalized.split(/(\s+)/);
  if (parts.length === 3) {
    return parts[2] + parts[1] + parts[0];
  }
  return normalized;
}

function normalizeIRealProIdentityPart(value) {
  return normalizeTextValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createIRealProSongId(title, composer) {
  const titlePart = normalizeIRealProIdentityPart(title) || "untitled";
  const composerPart = normalizeIRealProIdentityPart(composer) || "unknown";
  return `${titlePart}--${composerPart}`;
}

function sanitizeSongRepeatCount(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_SONG_REPEAT_COUNT;
  if (parsed > 99) return 99;
  return parsed;
}

function sanitizeSongFinishAction(value) {
  const normalized = normalizeTextValue(value);
  return SONGS_FINISH_ACTION_VALUES.includes(normalized)
    ? normalized
    : SONGS_FINISH_ACTIONS.nothing;
}

function sanitizeSongsPracticeSettings(source) {
  const settings =
    source && typeof source === "object"
      ? source.songs && typeof source.songs === "object"
        ? source.songs
        : source
      : {};
  return {
    finishAction: sanitizeSongFinishAction(settings.finishAction),
    repeatCount: sanitizeSongRepeatCount(settings.repeatCount),
    countChordsTowardGoals:
      !settings ||
      !Object.prototype.hasOwnProperty.call(settings, "countChordsTowardGoals")
        ? true
        : !!settings.countChordsTowardGoals,
  };
}

function pickRandomSongId(songs, currentSongId, randomValue = Math.random()) {
  if (!Array.isArray(songs) || !songs.length) return "";
  const ids = songs
    .map((song) => normalizeTextValue(song && song.id))
    .filter(Boolean);
  if (!ids.length) return "";
  let candidates = ids.slice();
  const currentId = normalizeTextValue(currentSongId);
  if (currentId && candidates.length > 1) {
    candidates = candidates.filter((id) => id !== currentId);
  }
  if (!candidates.length) candidates = ids.slice();
  const bounded =
    typeof randomValue === "number" && Number.isFinite(randomValue)
      ? Math.max(0, Math.min(0.999999, randomValue))
      : 0;
  return candidates[Math.floor(bounded * candidates.length)] || candidates[0];
}

function pickSongIdForFinishAction(
  songs,
  currentSongId,
  finishAction,
  randomValue,
) {
  const orderedSongs = Array.isArray(songs)
    ? songs.filter((song) => song && normalizeTextValue(song.id))
    : [];
  if (!orderedSongs.length) return "";

  const currentId = normalizeTextValue(currentSongId);
  const fallbackId =
    orderedSongs.find((song) => song.id === currentId)?.id ||
    orderedSongs[0].id;
  const action = sanitizeSongFinishAction(finishAction);

  if (action === SONGS_FINISH_ACTIONS.nothing) {
    return fallbackId;
  }

  if (action === SONGS_FINISH_ACTIONS.nextSong) {
    const currentIndex = orderedSongs.findIndex(
      (song) => song.id === currentId,
    );
    if (currentIndex < 0) return orderedSongs[0].id;
    return orderedSongs[(currentIndex + 1) % orderedSongs.length].id;
  }

  if (action === SONGS_FINISH_ACTIONS.randomSong) {
    return pickRandomSongId(orderedSongs, currentId, randomValue);
  }

  const favorites = orderedSongs.filter((song) => !!song.favorite);
  if (!favorites.length) return fallbackId;

  if (action === SONGS_FINISH_ACTIONS.randomFavorite) {
    return pickRandomSongId(favorites, currentId, randomValue);
  }

  const currentIndex = orderedSongs.findIndex((song) => song.id === currentId);
  if (currentIndex < 0) return favorites[0].id;
  for (let offset = 1; offset <= orderedSongs.length; offset += 1) {
    const candidate =
      orderedSongs[(currentIndex + offset) % orderedSongs.length];
    if (candidate && candidate.favorite) return candidate.id;
  }
  return favorites[0].id;
}

function obfuscateIRealPro50Segment(segment) {
  const buffer = segment.split("");
  for (let i = 0; i < 5; i++) {
    buffer[49 - i] = segment[i];
    buffer[i] = segment[49 - i];
  }
  for (let i = 10; i < 24; i++) {
    buffer[49 - i] = segment[i];
    buffer[i] = segment[49 - i];
  }
  return buffer.join("");
}

function decodeIRealProMusic(source) {
  const normalized = normalizeTextValue(source);
  if (!normalized) return "";
  const markerIndex = normalized.indexOf(IREAL_PRO_SCRAMBLE_MARKER);
  if (markerIndex === -1) return normalized;
  let remaining = normalized.slice(
    markerIndex + IREAL_PRO_SCRAMBLE_MARKER.length,
  );
  let decoded = "";
  while (remaining.length > 51) {
    decoded += obfuscateIRealPro50Segment(remaining.slice(0, 50));
    remaining = remaining.slice(50);
  }
  decoded += remaining;
  return decoded
    .replace(/Kcl/g, "| x")
    .replace(/LZ/g, " |")
    .replace(/XyQ/g, "   ");
}

function parseIRealProChordMatch(match) {
  const note = match[1] || " ";
  let quality = match[2] || "";
  const comment = match[3] || "";
  if (comment) quality += comment.slice(1, -1);
  let bass = match[4] || "";
  if (bass.startsWith("/")) {
    bass = bass.slice(1);
  }
  let alternate = match[5] || null;
  if (alternate) {
    const nested = IREAL_PRO_CHORD_REGEX.exec(alternate.slice(1, -1));
    alternate = nested ? parseIRealProChordMatch(nested) : null;
  }
  if (note === " " && !alternate && !bass) return null;
  return {
    raw: match[0],
    kind:
      note === "n"
        ? "noChord"
        : note === "x"
          ? "repeatOne"
          : note === "r"
            ? "repeatTwo"
            : note === "W"
              ? "invisibleRoot"
              : note === "p"
                ? "slash"
                : "chord",
    root: note,
    quality,
    bass: bass
      ? {
          raw: bass,
          kind: "chord",
          root: bass,
          quality: "",
          bass: null,
          alternate: null,
        }
      : null,
    alternate,
    displaySize: "normal",
  };
}

function classifyIRealProSymbolToken(char) {
  switch (char) {
    case "{":
    case "[":
    case "|":
    case "]":
    case "}":
    case "Z":
      return { type: "barline", raw: char, value: char };
    case "S":
      return { type: "annotation", raw: char, value: char };
    case "Q":
      return { type: "annotation", raw: char, value: char };
    case "U":
      return { type: "annotation", raw: char, value: char };
    case "s":
      return { type: "annotation", raw: char, value: char };
    case "l":
      return { type: "annotation", raw: char, value: char };
    case "f":
      return { type: "annotation", raw: char, value: char };
    case "Y":
      return { type: "spacer", raw: char, value: char };
    case "n":
      return {
        type: "chord",
        raw: char,
        value: char,
        chord: parseIRealProChordMatch([char, char, "", "", "", ""]),
      };
    case "x":
      return {
        type: "chord",
        raw: char,
        value: char,
        chord: parseIRealProChordMatch([char, char, "", "", "", ""]),
      };
    case "r":
      return {
        type: "chord",
        raw: char,
        value: char,
        chord: parseIRealProChordMatch([char, char, "", "", "", ""]),
      };
    case ",":
      return { type: "separator", raw: char, value: char };
    default:
      return { type: "unknown", raw: char, value: char };
  }
}

function tokenizeIRealProChart(chartText) {
  let remaining = normalizeTextValue(chartText);
  const tokens = [];
  while (remaining) {
    let matched = false;
    for (const pattern of IREAL_PRO_TOKEN_PATTERNS) {
      const match = pattern.regex.exec(remaining);
      if (!match) continue;
      matched = true;
      if (pattern.type === "comment") {
        tokens.push({
          type: "comment",
          raw: match[0],
          value: match[0].slice(1, -1),
        });
      } else if (pattern.type === "section") {
        tokens.push({
          type: "annotation",
          raw: match[0],
          value: match[0],
        });
      } else if (pattern.type === "timeSignature") {
        tokens.push({
          type: "annotation",
          raw: match[0],
          value: match[0],
        });
      } else if (pattern.type === "ending") {
        tokens.push({
          type: "annotation",
          raw: match[0],
          value: match[0],
        });
      } else if (pattern.type === "chord") {
        tokens.push({
          type: "chord",
          raw: match[0],
          value: match[0],
          chord: parseIRealProChordMatch(match),
        });
      }
      remaining = remaining.slice(match[0].length);
      break;
    }
    if (matched) continue;
    const nextChar = remaining[0];
    tokens.push(classifyIRealProSymbolToken(nextChar));
    remaining = remaining.slice(1);
  }
  return tokens;
}

function createIRealProCell(cells) {
  const cell = {
    index: cells.length,
    bars: "",
    annotations: [],
    comments: [],
    spacer: 0,
    chord: null,
  };
  cells.push(cell);
  return cell;
}

function buildIRealProCells(tokens) {
  const cells = [];
  let currentCell = createIRealProCell(cells);
  let previousCell = null;
  tokens.forEach((token, index) => {
    let advancesCell = false;
    if (token.type === "chord") {
      currentCell.chord = token.chord ? cloneObject(token.chord) : null;
      advancesCell = true;
    } else if (token.type === "barline") {
      switch (token.raw) {
        case "{":
        case "[":
          if (previousCell) {
            previousCell.bars += ")";
            previousCell = null;
          }
          currentCell.bars = token.raw;
          break;
        case "|":
          if (previousCell) {
            previousCell.bars += ")";
            previousCell = null;
          }
          currentCell.bars = "(";
          break;
        case "]":
        case "}":
        case "Z":
          if (previousCell) {
            previousCell.bars += token.raw;
            previousCell = null;
          }
          break;
        default:
      }
    } else if (token.type === "annotation") {
      currentCell.annotations.push(token.value);
    } else if (token.type === "comment") {
      currentCell.comments.push(token.value);
    } else if (token.type === "spacer") {
      currentCell.spacer += 1;
      previousCell = null;
    }
    if (advancesCell && index < tokens.length - 1) {
      previousCell = currentCell;
      currentCell = createIRealProCell(cells);
    }
  });
  return cells;
}

function decodeIRealProTimeSignature(value) {
  return IREAL_PRO_TIME_SIGNATURES[value] || "4/4";
}

function hasIRealProMeasureStart(cell) {
  return /[\(\{\[]/.test(cell.bars);
}

function hasIRealProMeasureContent(cell) {
  return !!(cell.chord || cell.annotations.length || cell.comments.length);
}

function parseIRealProBar(bars, location) {
  if (!bars) return null;
  const marker =
    location === "left"
      ? bars.includes("{")
        ? "{"
        : bars.includes("[")
          ? "["
          : bars.includes("(")
            ? "("
            : ""
      : bars.includes("Z")
        ? "Z"
        : bars.includes("}")
          ? "}"
          : bars.includes("]")
            ? "]"
            : bars.includes(")")
              ? ")"
              : "";
  if (!marker) return null;
  const kind =
    marker === "{"
      ? "repeatStart"
      : marker === "}"
        ? "repeatEnd"
        : marker === "["
          ? "double"
          : marker === "]"
            ? "double"
            : marker === "Z"
              ? "final"
              : "single";
  return {
    raw: marker,
    location,
    kind,
  };
}

function createIRealProMeasure(index, timeSignature, cellIndex) {
  return {
    index,
    timeSignature,
    cells: [],
    chords: [],
    annotations: [],
    comments: [],
    endings: [],
    section: null,
    coda: false,
    segno: false,
    fermata: false,
    spacer: 0,
    startsNewSystem: cellIndex > 0 && cellIndex % 16 === 0,
    leftBar: null,
    rightBar: null,
    finalBar: false,
  };
}

function applyIRealProCellStateToMeasure(cell, measure, state) {
  let displaySize = state.displaySize;
  cell.annotations.forEach((annotation) => {
    measure.annotations.push(annotation);
    if (annotation === "s") {
      displaySize = "small";
    } else if (annotation === "l") {
      displaySize = "normal";
    } else if (annotation === "Q") {
      measure.coda = true;
    } else if (annotation === "S") {
      measure.segno = true;
    } else if (annotation === "f") {
      measure.fermata = true;
    } else if (annotation.startsWith("T")) {
      measure.timeSignature = decodeIRealProTimeSignature(annotation);
      state.timeSignature = measure.timeSignature;
    } else if (annotation.startsWith("N")) {
      measure.endings.push(annotation.slice(1));
    } else if (annotation.startsWith("*")) {
      measure.section = annotation.slice(1);
    }
  });
  state.displaySize = displaySize;
  const cellCopy = cloneObject(cell);
  if (cellCopy.chord) {
    cellCopy.chord.displaySize = displaySize;
    measure.chords.push({
      cellIndex: measure.cells.length,
      ...cloneObject(cellCopy.chord),
    });
  }
  measure.comments = measure.comments.concat(cellCopy.comments);
  measure.spacer += cellCopy.spacer;
  measure.cells.push(cellCopy);
}

function buildIRealProMeasures(cells) {
  const measures = [];
  const state = {
    timeSignature: "4/4",
    displaySize: "normal",
  };
  let currentMeasure = null;
  cells.forEach((cell, cellIndex) => {
    const shouldStartMeasure =
      hasIRealProMeasureStart(cell) ||
      (!currentMeasure && hasIRealProMeasureContent(cell));
    if (shouldStartMeasure) {
      if (currentMeasure) {
        measures.push(currentMeasure);
      }
      currentMeasure = createIRealProMeasure(
        measures.length + 1,
        state.timeSignature,
        cellIndex,
      );
      currentMeasure.leftBar = parseIRealProBar(cell.bars, "left");
    }
    if (!currentMeasure) return;
    applyIRealProCellStateToMeasure(cell, currentMeasure, state);
    const rightBar = parseIRealProBar(cell.bars, "right");
    if (rightBar) {
      currentMeasure.rightBar = rightBar;
      currentMeasure.finalBar = rightBar.kind === "final";
      measures.push(currentMeasure);
      currentMeasure = null;
    }
  });
  if (currentMeasure) {
    measures.push(currentMeasure);
  }
  return measures;
}

function parseIRealProChart(source, options = {}) {
  if (typeof source !== "string" || !source.trim()) {
    throw new Error("iReal Pro chart text is required");
  }
  const decodedMusic = options.alreadyDecoded
    ? normalizeTextValue(source)
    : decodeIRealProMusic(source);
  const tokens = tokenizeIRealProChart(decodedMusic);
  const cells = buildIRealProCells(tokens);
  const measures = buildIRealProMeasures(cells);
  return {
    decodedMusic,
    tokens,
    cells,
    measures,
    timeSignature: measures[0] ? measures[0].timeSignature : "4/4",
    finalBar: measures.some((measure) => measure.finalBar),
  };
}

function parseIRealProSong(recordText, options = {}) {
  const normalized = normalizeTextValue(recordText);
  if (!normalized) {
    throw new Error("iReal Pro song record is required");
  }
  const parts = normalized.split("==");
  if (parts.length !== 4) {
    throw new Error("Invalid iReal Pro song record");
  }
  const headerIndex = parts[0].indexOf("=");
  const styleIndex = parts[1].indexOf("=");
  if (headerIndex === -1 || styleIndex === -1) {
    throw new Error("Invalid iReal Pro song metadata");
  }
  const title = parseIRealProTitle(parts[0].slice(0, headerIndex));
  const composer = parseIRealProComposer(parts[0].slice(headerIndex + 1));
  const style = normalizeTextValue(parts[1].slice(0, styleIndex));
  const key = normalizeTextValue(parts[1].slice(styleIndex + 1));
  const encodedMusic = parts[2];
  const decodedMusic = decodeIRealProMusic(encodedMusic);
  if (!title || !composer || !style || !key || !decodedMusic) {
    throw new Error("Incomplete iReal Pro song record");
  }
  return {
    id: createIRealProSongId(title, composer),
    title,
    composer,
    style,
    key,
    source: {
      type: "irealpro",
      playlistTitle: normalizeTextValue(options.playlistTitle),
    },
    raw: {
      encodedRecord: normalized,
      encodedMusic,
      decodedMusic,
    },
    chart: parseIRealProChart(decodedMusic, { alreadyDecoded: true }),
  };
}

function parseIRealBookSong(recordText, options = {}) {
  const normalized = normalizeTextValue(recordText);
  if (!normalized) {
    throw new Error("iReal Pro song record is required");
  }
  const parts = normalized.split("=");
  if (parts.length < 6) {
    throw new Error("Invalid iRealBook song record");
  }
  const title = parseIRealProTitle(parts[0]);
  const composer = parseIRealProComposer(parts[1]);
  const style = normalizeTextValue(parts[2]);
  const key = normalizeTextValue(parts[3]);
  const encodedMusic = parts[5];
  const decodedMusic = normalizeTextValue(encodedMusic);
  if (!title || !composer || !style || !key || !decodedMusic) {
    throw new Error("Incomplete iRealBook song record");
  }
  return {
    id: createIRealProSongId(title, composer),
    title,
    composer,
    style,
    key,
    source: {
      type: "irealpro",
      playlistTitle: normalizeTextValue(options.playlistTitle),
    },
    raw: {
      encodedRecord: normalized,
      encodedMusic,
      decodedMusic,
    },
    chart: parseIRealProChart(decodedMusic, { alreadyDecoded: true }),
  };
}

function extractIRealProSourceData(sourceText) {
  if (typeof sourceText !== "string" || !sourceText.trim()) {
    throw new Error("iReal Pro playlist text is required");
  }
  const matched = IREAL_PRO_URI_REGEX.exec(sourceText.trim());
  if (!matched) {
    throw new Error("iReal Pro playlist must include an irealb:// URI");
  }
  try {
    return {
      scheme: matched[1],
      payload: decodeURIComponent(matched[2]),
    };
  } catch (_) {
    throw new Error("Invalid iReal Pro URI encoding");
  }
}

function parseIRealProPlaylist(sourceText) {
  const { payload: playlist } = extractIRealProSourceData(sourceText);
  const parts = playlist.split("===");
  const playlistTitle = normalizeTextValue(parts.pop());
  if (!parts.length) {
    throw new Error("iReal Pro playlist contains no song records");
  }
  const songs = parts.map((record) =>
    parseIRealProSong(record, { playlistTitle }),
  );
  return {
    sourceType: "irealpro",
    playlistTitle,
    songs,
    songCount: songs.length,
  };
}

function parseIRealProSource(sourceText) {
  const { scheme, payload } = extractIRealProSourceData(sourceText);
  if (scheme === "irealbook") {
    const song = parseIRealBookSong(payload);
    return {
      sourceType: "irealpro",
      playlistTitle: "",
      songs: [song],
      songCount: 1,
    };
  }
  if (payload.includes("===")) {
    return parseIRealProPlaylist(sourceText);
  }
  const song = parseIRealProSong(payload);
  return {
    sourceType: "irealpro",
    playlistTitle: "",
    songs: [song],
    songCount: 1,
  };
}

function normalizeIRealProQualityToInternal(quality) {
  const normalized = normalizeTextValue(quality);
  if (
    Object.prototype.hasOwnProperty.call(
      IREAL_PRO_QUALITY_TO_INTERNAL,
      normalized,
    )
  ) {
    return IREAL_PRO_QUALITY_TO_INTERNAL[normalized];
  }
  if (!normalized || normalized === "^") return "";
  if (normalized.includes("sus")) return "sus4";
  if (normalized === "h") return "dim";
  if (normalized.startsWith("h")) return "m7b5";
  if (normalized.startsWith("o"))
    return normalized.includes("7") ? "dim7" : "dim";
  if (normalized.startsWith("+")) {
    if (normalized.includes("7")) {
      return normalized.includes("^") ? "augM7" : "aug7";
    }
    return "aug";
  }
  if (normalized.startsWith("-")) {
    if (normalized.includes("7b5")) return "m7b5";
    if (normalized.includes("13")) return "m13";
    if (normalized.includes("11")) return "m11";
    if (normalized.includes("9")) return "m9";
    if (normalized.includes("^7")) return "mM7";
    if (normalized.includes("7")) return "m7";
    if (normalized.includes("6")) return "m6";
    return "m";
  }
  if (normalized.startsWith("^")) {
    if (normalized.includes("13")) return "M13";
    if (normalized.includes("9")) return "M9";
    if (normalized.includes("7")) return "M7";
    return "";
  }
  if (normalized.includes("#11")) return "7#11";
  if (normalized.includes("#9")) return "7#9";
  if (normalized.includes("b9")) return "7b9";
  if (normalized.includes("13")) return "13";
  if (normalized.includes("11")) return "11";
  if (normalized.includes("9")) return "9";
  if (normalized.includes("7")) return "7";
  if (normalized.includes("6")) return "6";
  return "";
}

function cloneSongChordEntry(entry) {
  return {
    kind: "songChord",
    label: entry.label,
    rawLabel: entry.rawLabel,
    playableChord: entry.playableChord,
    bassNote: entry.bassNote,
    measureIndex: entry.measureIndex,
    chordIndex: entry.chordIndex,
    sourceMeasureIndex: entry.sourceMeasureIndex,
    sourceChordIndex: entry.sourceChordIndex,
  };
}

function formatIRealProDisplayNote(note) {
  return normalizeTextValue(note).replace(/b/g, "♭").replace(/#/g, "♯");
}

function formatIRealProDisplayQuality(quality) {
  let formatted = normalizeTextValue(quality);
  if (!formatted) return "";
  if (formatted.startsWith("h")) {
    formatted = "ø" + formatted.slice(1);
  }
  return formatted
    .replace(/maj/g, "Δ")
    .replace(/min/g, "-")
    .replace(/\^/g, "Δ")
    .replace(/o/g, "°")
    .replace(/#/g, "♯")
    .replace(/b/g, "♭");
}

function formatIRealProChordDisplay(chord) {
  if (!chord || typeof chord !== "object") return "";
  if (chord.kind === "noChord") return "N.C.";
  if (chord.kind === "repeatOne") return "%";
  if (chord.kind === "repeatTwo") return "%%";

  const root = formatIRealProDisplayNote(chord.root);
  const quality = formatIRealProDisplayQuality(chord.quality);
  const bass =
    chord.bass && chord.bass.root
      ? `/${formatIRealProDisplayNote(chord.bass.root)}`
      : "";
  const alternate = chord.alternate
    ? ` (${formatIRealProChordDisplay(chord.alternate)})`
    : "";

  if (root && chord.kind !== "invisibleRoot" && chord.kind !== "slash") {
    return `${root}${quality}${bass}${alternate}`;
  }

  const raw = normalizeTextValue(chord.raw);
  return raw.replace(/\^/g, "Δ").replace(/#/g, "♯").replace(/b/g, "♭");
}

function buildPlayableSongEntry(chord, measureIndex, chordIndex) {
  if (!chord || chord.kind !== "chord" || !chord.root) return null;
  return {
    kind: "songChord",
    label: formatIRealProChordDisplay(chord),
    rawLabel: chord.raw || chord.root,
    playableChord:
      chord.root + normalizeIRealProQualityToInternal(chord.quality || ""),
    bassNote: chord.bass && chord.bass.root ? chord.bass.root : "",
    measureIndex,
    chordIndex,
    sourceMeasureIndex: measureIndex,
    sourceChordIndex: chordIndex,
  };
}

function buildPlayableSongEntries(song) {
  if (!song || typeof song !== "object") return [];
  const chart =
    song.chart && Array.isArray(song.chart.measures)
      ? song.chart
      : song.raw && typeof song.raw.decodedMusic === "string"
        ? parseIRealProChart(song.raw.decodedMusic, { alreadyDecoded: true })
        : null;
  if (!chart) return [];
  const resolvedMeasures = [];
  const sequence = [];
  chart.measures.forEach((measure, measureIndex) => {
    let measureEntries = [];
    let hasRepeatOne = false;
    let hasRepeatTwo = false;
    let repeatChordIndex = -1;
    (measure.chords || []).forEach((chord, chordIndex) => {
      if (chord.kind === "repeatOne") {
        hasRepeatOne = true;
        repeatChordIndex = chordIndex;
        return;
      }
      if (chord.kind === "repeatTwo") {
        hasRepeatTwo = true;
        repeatChordIndex = chordIndex;
        return;
      }
      const entry = buildPlayableSongEntry(chord, measureIndex, chordIndex);
      if (entry) measureEntries.push(entry);
    });
    if (!measureEntries.length && hasRepeatTwo && resolvedMeasures.length) {
      measureEntries = resolvedMeasures
        .slice(-2)
        .flat()
        .map((entry) => ({
          ...cloneSongChordEntry(entry),
          measureIndex,
          chordIndex: repeatChordIndex >= 0 ? repeatChordIndex : 0,
        }));
    } else if (
      !measureEntries.length &&
      hasRepeatOne &&
      resolvedMeasures.length
    ) {
      measureEntries = resolvedMeasures[resolvedMeasures.length - 1].map(
        (entry) => ({
          ...cloneSongChordEntry(entry),
          measureIndex,
          chordIndex: repeatChordIndex >= 0 ? repeatChordIndex : 0,
        }),
      );
    }
    resolvedMeasures.push(measureEntries);
    measureEntries.forEach((entry) => {
      sequence.push(cloneSongChordEntry(entry));
    });
  });
  return sequence;
}

function formatSongMeasureChordLabel(chord) {
  return formatIRealProChordDisplay(chord);
}

function buildSongDisplayRows(song, barsPerRow = 4) {
  if (!song || typeof song !== "object") return [];
  const chart =
    song.chart && Array.isArray(song.chart.measures)
      ? song.chart
      : song.raw && typeof song.raw.decodedMusic === "string"
        ? parseIRealProChart(song.raw.decodedMusic, { alreadyDecoded: true })
        : null;
  if (!chart || !Array.isArray(chart.measures) || barsPerRow < 1) {
    return [];
  }

  let previousTimeSignature = "";
  const measures = chart.measures.map((measure, measureIndex) => {
    const timeSignature = normalizeTextValue(measure.timeSignature);
    const result = {
      index: measure.index,
      measureIndex,
      timeSignature,
      showTimeSignature:
        !!timeSignature &&
        (measureIndex === 0 || timeSignature !== previousTimeSignature),
      section: normalizeTextValue(measure.section),
      comments: Array.isArray(measure.comments) ? measure.comments.slice() : [],
      leftBar: measure.leftBar ? cloneObject(measure.leftBar) : null,
      rightBar: measure.rightBar ? cloneObject(measure.rightBar) : null,
      finalBar: !!measure.finalBar,
      chords: Array.isArray(measure.chords)
        ? measure.chords.map((chord, chordIndex) => ({
            measureIndex,
            chordIndex,
            kind: normalizeTextValue(chord.kind),
            rawLabel: normalizeTextValue(chord.raw),
            label: formatSongMeasureChordLabel(chord),
          }))
        : [],
    };
    previousTimeSignature = timeSignature || previousTimeSignature;
    return result;
  });

  const rows = [];
  for (let index = 0; index < measures.length; index += barsPerRow) {
    rows.push(measures.slice(index, index + barsPerRow));
  }
  return rows;
}

function compactIRealProSongForStorage(song) {
  if (!song || typeof song !== "object") return null;
  const title = normalizeTextValue(song.title);
  const composer = normalizeTextValue(song.composer);
  const style = normalizeTextValue(song.style);
  const key = normalizeTextValue(song.key);
  const favorite = !!song.favorite;
  const playlistTitle = normalizeTextValue(
    song.source && song.source.playlistTitle,
  );
  const decodedMusic = normalizeTextValue(
    song.raw && song.raw.decodedMusic
      ? song.raw.decodedMusic
      : song.chart && song.chart.decodedMusic
        ? song.chart.decodedMusic
        : "",
  );
  if (!title || !composer || !style || !key || !decodedMusic) return null;
  return {
    id: createIRealProSongId(title, composer),
    title,
    composer,
    style,
    key,
    favorite,
    source: {
      type: "irealpro",
      playlistTitle,
    },
    raw: {
      decodedMusic,
    },
  };
}

function inflateIRealProSongFromStorage(entry) {
  const compact = compactIRealProSongForStorage(entry);
  if (!compact) return null;
  return {
    ...compact,
    chart: parseIRealProChart(compact.raw.decodedMusic, {
      alreadyDecoded: true,
    }),
  };
}

function sanitizeStoredSongsMap(collection) {
  if (!collection || typeof collection !== "object") return {};
  const sanitized = {};
  Object.keys(collection).forEach((key) => {
    const compact = compactIRealProSongForStorage(collection[key]);
    if (!compact) return;
    sanitized[compact.id] = compact;
  });
  return sanitized;
}

function compareStoredSongs(a, b) {
  const titleCompare = a.title.localeCompare(b.title, "en", {
    sensitivity: "base",
  });
  if (titleCompare !== 0) return titleCompare;
  return a.composer.localeCompare(b.composer, "en", {
    sensitivity: "base",
  });
}

function songsStoreFactory() {
  const store = {
    storage: getStorageHandle(),
    storageKey: SONGS_STORAGE_KEY,
    selectedKey: SONGS_SELECTED_KEY,
    resolveStorage() {
      if (this.storage) return this.storage;
      const handle = getStorageHandle();
      if (handle) this.storage = handle;
      return this.storage;
    },
    loadStoredEntries() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return {};
      try {
        const raw = activeStorage.getItem(this.storageKey);
        if (!raw) return {};
        return sanitizeStoredSongsMap(JSON.parse(raw));
      } catch (_) {
        return {};
      }
    },
    saveStoredEntries(songMap) {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      try {
        activeStorage.setItem(
          this.storageKey,
          JSON.stringify(sanitizeStoredSongsMap(songMap)),
        );
      } catch (_) {}
    },
    getLastSelection() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return "";
      try {
        const raw = activeStorage.getItem(this.selectedKey);
        const songId = normalizeTextValue(raw);
        if (!songId) return "";
        return this.hasSong(songId) ? songId : "";
      } catch (_) {
        return "";
      }
    },
    setLastSelection(id) {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return false;
      const songId = normalizeTextValue(id);
      try {
        if (!songId || !this.hasSong(songId)) {
          activeStorage.removeItem(this.selectedKey);
          return false;
        }
        activeStorage.setItem(this.selectedKey, songId);
        return true;
      } catch (_) {
        return false;
      }
    },
    loadAll() {
      const entries = this.loadStoredEntries();
      return Object.keys(entries).reduce((acc, id) => {
        const inflated = inflateIRealProSongFromStorage(entries[id]);
        if (inflated) acc[id] = inflated;
        return acc;
      }, {});
    },
    saveAll(songMap) {
      this.saveStoredEntries(songMap);
    },
    listSongs() {
      return Object.values(this.loadStoredEntries())
        .sort(compareStoredSongs)
        .map((song) => ({
          id: song.id,
          title: song.title,
          composer: song.composer,
          style: song.style,
          key: song.key,
          favorite: !!song.favorite,
          playlistTitle: song.source.playlistTitle,
        }));
    },
    getSong(id) {
      const songId = normalizeTextValue(id);
      if (!songId) return null;
      const entries = this.loadStoredEntries();
      if (!Object.prototype.hasOwnProperty.call(entries, songId)) return null;
      return inflateIRealProSongFromStorage(entries[songId]);
    },
    hasSong(id) {
      const songId = normalizeTextValue(id);
      if (!songId) return false;
      const entries = this.loadStoredEntries();
      return Object.prototype.hasOwnProperty.call(entries, songId);
    },
    upsertSongs(songs) {
      const entries = this.loadStoredEntries();
      let upserted = 0;
      (Array.isArray(songs) ? songs : []).forEach((song) => {
        const compact = compactIRealProSongForStorage(song);
        if (!compact) return;
        const hasExplicitFavorite =
          !!song &&
          typeof song === "object" &&
          Object.prototype.hasOwnProperty.call(song, "favorite");
        if (!hasExplicitFavorite && entries[compact.id]) {
          compact.favorite = !!entries[compact.id].favorite;
        }
        entries[compact.id] = compact;
        upserted += 1;
      });
      this.saveStoredEntries(entries);
      return upserted;
    },
    importPlaylist(sourceText) {
      const playlist = parseIRealProPlaylist(sourceText);
      const importedCount = this.upsertSongs(playlist.songs);
      const selectedSongId = playlist.songs[0] ? playlist.songs[0].id : "";
      this.setLastSelection(selectedSongId);
      return {
        playlistTitle: playlist.playlistTitle,
        importedCount,
        selectedSongId,
        totalSongs: this.listSongs().length,
      };
    },
    importSource(sourceText) {
      const parsed = parseIRealProSource(sourceText);
      const importedIds = parsed.songs.map((song) => song.id);
      const importedCount = this.upsertSongs(parsed.songs);
      const selectedSongId = importedIds[0] || "";
      this.setLastSelection(selectedSongId);
      return {
        playlistTitle: parsed.playlistTitle,
        importedCount,
        importedIds,
        selectedSongId,
        totalSongs: this.listSongs().length,
      };
    },
    deleteSong(id) {
      const songId = normalizeTextValue(id);
      if (!songId) return false;
      const entries = this.loadStoredEntries();
      const previousSelection = this.getLastSelection();
      if (!Object.prototype.hasOwnProperty.call(entries, songId)) {
        return false;
      }
      delete entries[songId];
      this.saveStoredEntries(entries);
      if (previousSelection === songId) {
        const remainingIds = Object.keys(entries).sort((a, b) =>
          compareStoredSongs(entries[a], entries[b]),
        );
        this.setLastSelection(remainingIds[0] || "");
      }
      return true;
    },
    setFavorite(id, favorite) {
      const songId = normalizeTextValue(id);
      if (!songId) return false;
      const entries = this.loadStoredEntries();
      if (!Object.prototype.hasOwnProperty.call(entries, songId)) {
        return false;
      }
      entries[songId] = {
        ...entries[songId],
        favorite: !!favorite,
      };
      this.saveStoredEntries(entries);
      return true;
    },
    replaceAll(songMap) {
      this.saveStoredEntries(songMap);
      const current = this.getLastSelection();
      if (current) {
        this.setLastSelection(current);
      }
    },
    clearAll() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      try {
        activeStorage.removeItem(this.storageKey);
        activeStorage.removeItem(this.selectedKey);
      } catch (_) {}
    },
  };
  return store;
}

function sanitizeWorkoutName(name) {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  return trimmed;
}

function sanitizeWorkoutGoal(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 999) return 999;
  return parsed;
}

function sanitizeWorkoutCategory(category) {
  if (typeof category !== "string") return null;
  const trimmed = category.trim();
  return statCategoryKeys.includes(trimmed) ? trimmed : null;
}

function sanitizeWorkoutGoals(source) {
  if (!source || typeof source !== "object") {
    return { correct: 0, total: 0 };
  }
  const payload =
    source.goals && typeof source.goals === "object" ? source.goals : source;
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);
  const correct = sanitizeWorkoutGoal(
    has("correct")
      ? payload.correct
      : has("goal")
        ? payload.goal
        : has("target")
          ? payload.target
          : 0,
  );
  const total = sanitizeWorkoutGoal(
    has("total")
      ? payload.total
      : has("overall")
        ? payload.overall
        : has("totalGoal")
          ? payload.totalGoal
          : 0,
  );
  return { correct, total };
}

function sanitizeWorkoutEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const preset = typeof entry.preset === "string" ? entry.preset.trim() : "";
  if (!preset) return null;
  const category = sanitizeWorkoutCategory(entry.category);
  return {
    preset,
    goals: sanitizeWorkoutGoals(entry),
    category,
  };
}

function sanitizeWorkoutEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => sanitizeWorkoutEntry(entry))
    .filter((entry) => entry !== null);
}

function sanitizeWorkoutMap(collection) {
  if (!collection || typeof collection !== "object") return {};
  const sanitized = {};
  Object.keys(collection).forEach((name) => {
    const cleanName = sanitizeWorkoutName(name);
    if (!cleanName) return;
    const source = collection[name];
    const entries = sanitizeWorkoutEntries(
      source && typeof source === "object" ? source.entries : [],
    );
    sanitized[cleanName] = {
      entries,
    };
  });
  return sanitized;
}

function workoutStoreFactory() {
  const store = {
    storage: getStorageHandle(),
    storageKey: WORKOUTS_STORAGE_KEY,
    selectedKey: WORKOUTS_SELECTED_KEY,
    resolveStorage() {
      if (this.storage) return this.storage;
      const handle = getStorageHandle();
      if (handle) this.storage = handle;
      return this.storage;
    },
    loadAll() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return {};
      try {
        const raw = activeStorage.getItem(this.storageKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return sanitizeWorkoutMap(parsed);
      } catch (_) {
        return {};
      }
    },
    saveAll(workouts) {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      const sanitized = sanitizeWorkoutMap(workouts);
      try {
        activeStorage.setItem(this.storageKey, JSON.stringify(sanitized));
      } catch (_) {}
    },
    listWorkouts() {
      return Object.keys(this.loadAll()).sort((a, b) =>
        a.localeCompare(b, "en", { sensitivity: "base" }),
      );
    },
    getWorkout(name) {
      const cleanName = sanitizeWorkoutName(name);
      if (!cleanName) return null;
      const workouts = this.loadAll();
      if (!Object.prototype.hasOwnProperty.call(workouts, cleanName)) {
        return null;
      }
      const entry = workouts[cleanName] || { entries: [] };
      return {
        name: cleanName,
        entries: cloneObject(entry.entries || []),
      };
    },
    saveWorkout(name, entries) {
      const cleanName = sanitizeWorkoutName(name);
      if (!cleanName) return false;
      const workouts = this.loadAll();
      workouts[cleanName] = {
        entries: sanitizeWorkoutEntries(entries),
      };
      this.saveAll(workouts);
      return true;
    },
    deleteWorkout(name) {
      const cleanName = sanitizeWorkoutName(name);
      if (!cleanName) return false;
      const workouts = this.loadAll();
      if (!Object.prototype.hasOwnProperty.call(workouts, cleanName)) {
        return false;
      }
      delete workouts[cleanName];
      this.saveAll(workouts);
      const selection = this.getLastSelection();
      if (selection && selection.workout === cleanName) {
        this.clearLastSelection();
      }
      return true;
    },
    hasWorkout(name) {
      const cleanName = sanitizeWorkoutName(name);
      if (!cleanName) return false;
      const workouts = this.loadAll();
      return Object.prototype.hasOwnProperty.call(workouts, cleanName);
    },
    renameWorkout(oldName, newName) {
      const fromName = sanitizeWorkoutName(oldName);
      const toName = sanitizeWorkoutName(newName);
      if (!fromName || !toName) return false;
      if (fromName === toName) return true;
      const workouts = this.loadAll();
      if (!Object.prototype.hasOwnProperty.call(workouts, fromName)) {
        return false;
      }
      if (Object.prototype.hasOwnProperty.call(workouts, toName)) {
        return false;
      }
      workouts[toName] = workouts[fromName];
      delete workouts[fromName];
      this.saveAll(workouts);
      const selection = this.getLastSelection();
      if (selection && selection.workout === fromName) {
        this.setLastSelection(toName, selection.entryIndex);
      }
      return true;
    },
    replaceAll(workouts) {
      this.saveAll(workouts);
    },
    setLastSelection(workoutName, entryIndex = 0) {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      const cleanName = sanitizeWorkoutName(workoutName);
      if (!cleanName) {
        this.clearLastSelection();
        return;
      }
      const payload = {
        workout: cleanName,
        entryIndex: Number.isFinite(entryIndex) ? entryIndex : 0,
      };
      try {
        activeStorage.setItem(this.selectedKey, JSON.stringify(payload));
      } catch (_) {}
    },
    getLastSelection() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return null;
      try {
        const raw = activeStorage.getItem(this.selectedKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const workout = sanitizeWorkoutName(parsed.workout);
        if (!workout) return null;
        const entryIndex = Number.isFinite(parsed.entryIndex)
          ? parsed.entryIndex
          : 0;
        return { workout, entryIndex };
      } catch (_) {
        return null;
      }
    },
    clearLastSelection() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      try {
        activeStorage.removeItem(this.selectedKey);
      } catch (_) {}
    },
  };
  return store;
}

function captureCheckboxState(collection) {
  const state = {};
  if (!collection) return state;
  Object.keys(collection).forEach((key) => {
    const el = collection[key];
    if (el && Object.prototype.hasOwnProperty.call(el, "checked")) {
      state[key] = !!el.checked;
    }
  });
  return state;
}

function applyCheckboxState(collection, state) {
  if (!collection || !state) return;
  Object.keys(state).forEach((key) => {
    const el = collection[key];
    if (el && Object.prototype.hasOwnProperty.call(el, "checked")) {
      el.checked = !!state[key];
    }
  });
}

function getRadioValue(name, fallback) {
  if (hasDocument) {
    const selected = document.querySelector(`input[name='${name}']:checked`);
    if (selected) return selected.value;
  }
  const groups = domElements.radioGroups || {};
  const selections = domElements.radioSelections || {};
  const group = groups[name] || null;
  if (group) {
    for (const [value, el] of Object.entries(group)) {
      if (el && el.checked) {
        selections[name] = value;
        domElements.radioSelections = selections;
        return value;
      }
    }
    if (name in selections) return selections[name];
  } else if (name in selections) {
    return selections[name];
  }
  domElements.radioSelections = selections;
  return fallback;
}

function setRadioValue(name, targetValue) {
  if (typeof targetValue === "undefined") return;
  const selections = domElements.radioSelections || {};
  if (hasDocument) {
    const radios = document.querySelectorAll(`input[name='${name}']`);
    radios.forEach((radio) => {
      radio.checked = radio.value === targetValue;
    });
  }
  const groups = domElements.radioGroups || {};
  const group = groups[name] || null;
  if (group) {
    Object.entries(group).forEach(([value, el]) => {
      if (el) el.checked = value === targetValue;
    });
    selections[name] = targetValue;
  } else {
    selections[name] = targetValue;
  }
  domElements.radioSelections = selections;
}

function captureJazzCadenceState() {
  const state = {};
  jazzCadences.forEach((cadence) => {
    state[cadence.name] = !!cadence.enabled;
  });
  return state;
}

function applyJazzCadenceState(state) {
  if (!state) return;
  jazzCadences.forEach((cadence) => {
    const enabled = !!state[cadence.name];
    cadence.enabled = enabled;
    if (!cadence.element) {
      cadence.element = createElementStub(`jazzCadence:${cadence.name}`);
    }
    cadence.element.checked = enabled;
  });
}

function captureScaleState() {
  const state = {};
  Object.keys(scales).forEach((key) => {
    const entry = scales[key];
    if (entry && typeof entry.enabled !== "undefined") {
      state[key] = !!entry.enabled;
    }
  });
  return state;
}

function applyScaleState(state) {
  if (!state) return;
  Object.keys(scales).forEach((key) => {
    const enabled = !!state[key];
    const entry = scales[key];
    if (entry) entry.enabled = enabled;
    if (!domElements.scaleCheckboxes[key]) {
      domElements.scaleCheckboxes[key] = createElementStub(key);
    }
    const checkbox = domElements.scaleCheckboxes[key];
    checkbox.checked = enabled;
  });
}

function sanitizeStatsGoalValue(raw) {
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 999) return 999;
  return parsed;
}

function sanitizeStatsGoalPair(source) {
  if (typeof source === "number") {
    return {
      correct: sanitizeStatsGoalValue(source),
      total: 0,
    };
  }
  if (source && typeof source === "object") {
    const correct = sanitizeStatsGoalValue(
      Object.prototype.hasOwnProperty.call(source, "correct")
        ? source.correct
        : Object.prototype.hasOwnProperty.call(source, "goal")
          ? source.goal
          : 0,
    );
    const total = sanitizeStatsGoalValue(
      Object.prototype.hasOwnProperty.call(source, "total")
        ? source.total
        : Object.prototype.hasOwnProperty.call(source, "overall")
          ? source.overall
          : 0,
    );
    return { correct, total };
  }
  return { correct: 0, total: 0 };
}

function captureStatGoalState() {
  const goals = {};
  const inputs = domElements.statGoals || {};
  statCategoryKeys.forEach((key) => {
    const group = inputs[key];
    if (!group) return;
    const correct = sanitizeStatsGoalValue(
      group.correct &&
        Object.prototype.hasOwnProperty.call(group.correct, "value")
        ? group.correct.value
        : 0,
    );
    const total = sanitizeStatsGoalValue(
      group.total && Object.prototype.hasOwnProperty.call(group.total, "value")
        ? group.total.value
        : 0,
    );
    goals[key] = { correct, total };
  });
  return goals;
}

function applyStatGoalState(state) {
  const inputs = domElements.statGoals || {};
  statCategoryKeys.forEach((key) => {
    const group = inputs[key];
    if (!group) return;
    const raw =
      state && Object.prototype.hasOwnProperty.call(state, key)
        ? state[key]
        : { correct: 0, total: 0 };
    const normalized = sanitizeStatsGoalPair(raw);
    if (
      group.correct &&
      Object.prototype.hasOwnProperty.call(group.correct, "value")
    ) {
      group.correct.value = String(normalized.correct);
    }
    if (
      group.total &&
      Object.prototype.hasOwnProperty.call(group.total, "value")
    ) {
      group.total.value = String(normalized.total);
    }
  });
}

function notifyModeChangeApplied() {
  if (!hasDocument) return;
  const candidates = [
    globalRoot && typeof globalRoot.modeChange === "function"
      ? globalRoot.modeChange
      : null,
    appGlobals && typeof appGlobals.modeChange === "function"
      ? appGlobals.modeChange
      : null,
  ];
  const handler = candidates.find((fn) => typeof fn === "function");
  if (handler) {
    try {
      handler();
    } catch (_) {}
  }
}

function notifyStatGoalsChange() {
  const candidates = [
    globalRoot && typeof globalRoot.statGoalsChanged === "function"
      ? globalRoot.statGoalsChanged
      : null,
    appGlobals && typeof appGlobals.statGoalsChanged === "function"
      ? appGlobals.statGoalsChanged
      : null,
  ];
  const handler = candidates.find((fn) => typeof fn === "function");
  if (handler) {
    try {
      handler();
    } catch (_) {}
  }
}

function captureSimpleSettings() {
  return {
    mode: getRadioValue("mode", "tabChords"),
    flow: {
      mode: domElements.flowSelect.value || "random",
      startKey: domElements.flowStartSelect.value || "C",
    },
    display: {
      showKeyboard: domElements.keyboardDetails
        ? !!domElements.keyboardDetails.open
        : true,
      highlightKeys: !!domElements.highlightCorrectKeys.checked,
      highlightDelay: parseFloat(domElements.highlightDelay.value) || 3,
      hideProgressionNames: !!domElements.hideProgressionChordNames.checked,
      hideProgressionNumerals:
        !!domElements.hideProgressionChordNumerals.checked,
      randomizeSpellings: !!domElements.randomizeSpellings.checked,
    },
    spacedRep: {
      enabled: !!domElements.enableSpacedRepetition.checked,
      threshold: parseInt(domElements.spacedRepThreshold.value, 10) || 3,
    },
    midi: {
      sendNotes: !!domElements.sendMidiNotes.checked,
    },
    progression: {
      selection: domElements.progressionSelect.value || "random",
      custom:
        domElements.customProgressionInput.value || "I-II-iii-IV-V-vi-viio-I",
      randomCount: parseInt(domElements.randomProgressionCount.value, 10) || 5,
    },
    songs: sanitizeSongsPracticeSettings({
      finishAction: domElements.songFinishAction.value,
      repeatCount: domElements.songRepeatCount.value,
      countChordsTowardGoals: !!domElements.songCountGoals.checked,
    }),
    voicing: {
      mode: getRadioValue("voicingMode", "default"),
    },
    statsGoals: captureStatGoalState(),
  };
}

function captureSettingsFromDom() {
  return {
    ...captureSimpleSettings(),
    chordTypes: captureCheckboxState(domElements.chordCheckboxes),
    keyToggles: captureCheckboxState(domElements.keyCheckboxes),
    degreeToggles: captureCheckboxState(domElements.degreeCheckboxes),
    scales: captureScaleState(),
    jazzCadences: captureJazzCadenceState(),
  };
}

function createDefaultSettings() {
  const defaults = captureSettingsFromDom();
  Object.keys(chordCheckboxes).forEach((key) => {
    if (typeof defaults.chordTypes[key] === "undefined") {
      defaults.chordTypes[key] = !!chordCheckboxes[key].checked;
    }
  });
  Object.keys(keyCheckboxes).forEach((key) => {
    if (typeof defaults.keyToggles[key] === "undefined") {
      defaults.keyToggles[key] = !!keyCheckboxes[key].checked;
    }
  });
  Object.keys(degreeCheckboxes).forEach((key) => {
    if (typeof defaults.degreeToggles[key] === "undefined") {
      defaults.degreeToggles[key] = !!degreeCheckboxes[key].checked;
    }
  });
  defaults.scales = captureScaleState();
  defaults.jazzCadences = captureJazzCadenceState();
  return defaults;
}

function applySimpleSettings(settings) {
  if (!settings) return;
  let appliedMode = null;
  if (Object.prototype.hasOwnProperty.call(settings, "mode")) {
    setRadioValue("mode", settings.mode);
    appliedMode = settings.mode;
  }
  if (settings.flow) {
    domElements.flowSelect.value = settings.flow.mode;
    domElements.flowStartSelect.value = settings.flow.startKey;
  }
  if (settings.display) {
    const display = settings.display;
    if (domElements.keyboardDetails) {
      if (Object.prototype.hasOwnProperty.call(display, "showKeyboard")) {
        domElements.keyboardDetails.open = !!display.showKeyboard;
      }
    }
    domElements.highlightCorrectKeys.checked = !!display.highlightKeys;
    domElements.highlightDelay.value = String(display.highlightDelay);
    domElements.hideProgressionChordNames.checked =
      !!display.hideProgressionNames;
    domElements.hideProgressionChordNumerals.checked =
      !!display.hideProgressionNumerals;
    domElements.randomizeSpellings.checked = !!display.randomizeSpellings;
  }
  if (settings.spacedRep) {
    domElements.enableSpacedRepetition.checked = !!settings.spacedRep.enabled;
    domElements.spacedRepThreshold.value = String(settings.spacedRep.threshold);
  }
  if (settings.midi) {
    domElements.sendMidiNotes.checked = !!settings.midi.sendNotes;
  }
  if (settings.progression) {
    domElements.progressionSelect.value = settings.progression.selection;
    domElements.customProgressionInput.value = settings.progression.custom;
    domElements.randomProgressionCount.value = String(
      settings.progression.randomCount,
    );
  }
  if (settings.songs) {
    const songSettings = sanitizeSongsPracticeSettings(settings.songs);
    domElements.songFinishAction.value = songSettings.finishAction;
    domElements.songRepeatCount.value = String(songSettings.repeatCount);
    domElements.songCountGoals.checked = !!songSettings.countChordsTowardGoals;
  }
  if (settings.voicing) {
    setRadioValue("voicingMode", settings.voicing.mode);
  }
  applyStatGoalState(settings.statsGoals);
  notifyStatGoalsChange();
  if (appliedMode !== null) {
    notifyModeChangeApplied();
  }
}

function applySettingsToDom(settings) {
  if (!settings) return;
  applySimpleSettings(settings);
  applyCheckboxState(domElements.chordCheckboxes, settings.chordTypes);
  applyCheckboxState(domElements.keyCheckboxes, settings.keyToggles);
  applyCheckboxState(domElements.degreeCheckboxes, settings.degreeToggles);
  applyScaleState(settings.scales);
  applyJazzCadenceState(settings.jazzCadences);
}

function sanitizeSettings(settings, defaults) {
  if (!settings) return cloneObject(defaults);
  return mergeSettings(defaults, settings);
}

function settingsStoreFactory() {
  const defaults = createDefaultSettings();
  const storage = getStorageHandle();

  const store = {
    defaults,
    current: cloneObject(defaults),
    storage,
    storageKey: SETTINGS_STORAGE_KEY,
    presetsKey: SETTINGS_PRESETS_KEY,
    initialized: false,
    attachedElements: new Set(),
    resolveStorage() {
      if (this.storage) return this.storage;
      const handle = getStorageHandle();
      if (handle) this.storage = handle;
      return this.storage;
    },
    load() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return null;
      try {
        const raw = activeStorage.getItem(this.storageKey);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    },
    loadPresets() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return {};
      try {
        const raw = activeStorage.getItem(this.presetsKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed ? parsed : {};
      } catch (_) {
        return {};
      }
    },
    save() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      try {
        activeStorage.setItem(
          this.storageKey,
          JSON.stringify(this.current || this.defaults),
        );
      } catch (_) {}
    },
    savePresets(presets) {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      try {
        activeStorage.setItem(this.presetsKey, JSON.stringify(presets));
      } catch (_) {}
    },
    initialize() {
      const loaded = this.load();
      this.current = sanitizeSettings(loaded, this.defaults);
      this.initialized = true;
    },
    applyToDom(settings) {
      const source = settings
        ? sanitizeSettings(settings, this.defaults)
        : this.current;
      this.current = cloneObject(source);
      applyScaleState(source.scales);
      applyJazzCadenceState(source.jazzCadences);
      applySettingsToDom(source);
    },
    syncFromDom({ save = true } = {}) {
      const snapshot = captureSettingsFromDom();
      this.current = sanitizeSettings(snapshot, this.defaults);
      applyScaleState(this.current.scales);
      applyJazzCadenceState(this.current.jazzCadences);
      notifyStatGoalsChange();
      if (save) this.save();
    },
    savePreset(name) {
      if (!name) return;
      const presets = this.loadPresets();
      presets[name] = cloneObject(this.current);
      this.savePresets(presets);
    },
    loadPreset(name) {
      if (!name) return false;
      const presets = this.loadPresets();
      if (!presets[name]) return false;
      this.applyToDom(presets[name]);
      this.save();
      return true;
    },
    deletePreset(name) {
      if (!name) return;
      const presets = this.loadPresets();
      if (presets[name]) {
        delete presets[name];
        this.savePresets(presets);
      }
    },
    listPresets() {
      const presets = this.loadPresets();
      return Object.keys(presets);
    },
    resetToDefaults({ apply = true, save = true } = {}) {
      this.current = cloneObject(this.defaults);
      if (apply) this.applyToDom(this.current);
      if (save) this.save();
    },
    getCurrentSnapshot() {
      return cloneObject(this.current);
    },
    getCurrentJSON(pretty = true) {
      try {
        return JSON.stringify(this.current, null, pretty ? 2 : 0);
      } catch (_) {
        return "{}";
      }
    },
    watchElement(el, eventName = "change") {
      if (!el || !el.addEventListener) return;
      if (this.attachedElements.has(el)) return;
      el.addEventListener(eventName, () => this.syncFromDom());
      this.attachedElements.add(el);
    },
    attachDomListeners() {
      if (!hasDocument) return;
      this.watchElement(domElements.flowSelect);
      this.watchElement(domElements.flowStartSelect);
      this.watchElement(domElements.keyboardDetails, "toggle");
      this.watchElement(domElements.highlightCorrectKeys);
      this.watchElement(domElements.highlightDelay, "input");
      this.watchElement(domElements.hideProgressionChordNames);
      this.watchElement(domElements.hideProgressionChordNumerals);
      this.watchElement(domElements.randomizeSpellings);
      this.watchElement(domElements.enableSpacedRepetition);
      this.watchElement(domElements.spacedRepThreshold, "input");
      this.watchElement(domElements.sendMidiNotes);
      this.watchElement(domElements.progressionSelect);
      this.watchElement(domElements.customProgressionInput, "input");
      this.watchElement(domElements.randomProgressionCount, "input");
      this.watchElement(domElements.songFinishAction);
      this.watchElement(domElements.songRepeatCount, "input");
      this.watchElement(domElements.songCountGoals);
      Object.values(domElements.statGoals || {}).forEach((group) => {
        if (!group) return;
        this.watchElement(group.correct, "input");
        this.watchElement(group.total, "input");
      });

      Object.values(domElements.chordCheckboxes || {}).forEach((el) =>
        this.watchElement(el),
      );
      Object.values(domElements.keyCheckboxes || {}).forEach((el) =>
        this.watchElement(el),
      );
      Object.values(domElements.degreeCheckboxes || {}).forEach((el) =>
        this.watchElement(el),
      );
      Object.values(domElements.scaleCheckboxes || {}).forEach((el) => {
        this.watchElement(el);
      });
      Object.values(domElements.jazzBrickButtons || {}).forEach((el) => {
        this.watchElement(el, "click");
      });

      const voicingRadios = hasDocument
        ? document.querySelectorAll("input[name='voicingMode']")
        : [];
      voicingRadios.forEach((radio) => this.watchElement(radio));

      jazzCadences.forEach((cadence) => {
        if (cadence.element) {
          this.watchElement(cadence.element);
        }
      });
    },
  };

  store.initialize();
  store.applyToDom(store.current);
  return store;
}

const settingsStore = settingsStoreFactory();
appGlobals.settingsStore = settingsStore;
if (appGlobals.root) {
  appGlobals.root.settingsStore = settingsStore;
}

const workoutStore = workoutStoreFactory();
appGlobals.workoutStore = workoutStore;
if (appGlobals.root) {
  appGlobals.root.workoutStore = workoutStore;
}

const songsStore = songsStoreFactory();
appGlobals.songsStore = songsStore;
if (appGlobals.root) {
  appGlobals.root.songsStore = songsStore;
}
appGlobals.sanitizeSongsPracticeSettings = sanitizeSongsPracticeSettings;
appGlobals.pickSongIdForFinishAction = pickSongIdForFinishAction;
if (appGlobals.root) {
  appGlobals.root.sanitizeSongsPracticeSettings = sanitizeSongsPracticeSettings;
  appGlobals.root.pickSongIdForFinishAction = pickSongIdForFinishAction;
}

const dataExports = {
  allNotes,
  normalNotes,
  circleOfFourths,
  circleOfFifths,
  noteValues,
  valuesToNotesSharp,
  valuesToNotesFlat,
  chordStructures,
  chordStructureNames,
  chordTypeConfigs,
  chordTypeGroups,
  chordTypeIds,
  chordToggleButtons,
  keyPresetButtons,
  chordCheckboxes,
  keyCheckboxes,
  degreeCheckboxes,
  optionsPanels,
  modeSections,
  jazzBrickButtons,
  statCategoryKeys,
  statGoals: statGoalInputs,
  statCards: statCardElements,
  scales,
  scaleGroups,
  jazzCadences,
  jazzCadencesBasic,
  jazzCadencesIntermediate,
  jazzCadencesTurnarounds,
  jazzCadencesMetabricks,
  jazzCadencesDropbacks,
  voicingUtils,
  parseIRealProChart,
  parseIRealProSong,
  parseIRealProPlaylist,
  parseIRealProSource,
  buildPlayableSongEntries,
  buildSongDisplayRows,
  formatIRealProChordDisplay,
  sanitizeSongsPracticeSettings,
  pickSongIdForFinishAction,
  settingsStore,
  workoutStore,
  songsStore,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = dataExports;
}
