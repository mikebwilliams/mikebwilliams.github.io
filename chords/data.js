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
const DEFAULT_THEME = "lightBook";
const themeIds = ["lightBook", "darkBook", "classical", "darkClassical"];

function sanitizeTheme(theme) {
  return themeIds.includes(theme) ? theme : DEFAULT_THEME;
}

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
    dataset: {},
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
  all: requireElement("btnChordsAll"),
  triads: requireElement("btnChordsTriads"),
  sixths: requireElement("btnChordsSixths"),
  sevenths: requireElement("btnChordsSevenths"),
  majors: requireElement("btnChordsMajor"),
  minors: requireElement("btnChordsMinor"),
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
  theme: createRadioGroup("theme", [
    { id: "radThemeLightBook", value: "lightBook", defaultChecked: true },
    { id: "radThemeDarkBook", value: "darkBook" },
    { id: "radThemeClassical", value: "classical" },
    { id: "radThemeDarkClassical", value: "darkClassical" },
  ]),
  voicingMode: createRadioGroup("voicingMode", [
    { id: "radVoicingDefault", value: "default", defaultChecked: true },
    { id: "radVoicingRoot", value: "normal:root" },
    { id: "radVoicingTriad", value: "normal:triad" },
    { id: "radVoicingNoExtensions", value: "normal:noExtensions" },
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
  "songs",
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
  songs: {
    correct: "inputSongsGoalCorrect",
    total: "inputSongsGoalTotal",
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
  songs: "statCardSongs",
  degrees: "statCardDegrees",
  scales: "statCardScales",
  bricks: "statCardBricks",
};

const statTotalIds = {
  chords: "txtChordsTotal",
  progressions: "txtProgressionsTotal",
  songs: "txtSongsTotal",
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
  songUseOriginalKey: requireElement("chkSongUseOriginalKey"),
  songAdvanceKeyOnRepeat: requireElement("chkSongAdvanceKeyOnRepeat"),
  songAdvanceKeyOnSongChange: requireElement("chkSongAdvanceKeyOnSongChange"),
  songCountGoals: requireElement("chkSongCountsTowardGoals"),
  songDisplayRomanNumerals: requireElement("chkSongDisplayRomanNumerals"),
  songStatus: requireElement("txtSongsStatus"),
  dailyStatsDetails: requireElement("panelDailyStats"),
  trainingSetupDetails: requireElement("panelTrainingSetup"),
  metronomeDetails: requireElement("panelMetronome"),
  metronomeToggleButton: requireElement("btnMetronomeToggle"),
  metronomeResetButton: requireElement("btnMetronomeReset"),
  metronomeTempoInput: requireElement("inputMetronomeTempo"),
  metronomeTempoNumberInput: requireElement("inputMetronomeTempoNumber"),
  metronomeBeatsInput: requireElement("inputMetronomeBeatsPerMeasure"),
  metronomeXMeasuresInput: requireElement("inputMetronomeXMeasures"),
  metronomeYMeasuresInput: requireElement("inputMetronomeYMeasures"),
  metronomeCountInMeasuresInput: requireElement(
    "inputMetronomeCountInMeasures",
  ),
  metronomeSyncSongs: requireElement("chkMetronomeSyncSongs"),
  metronomeTempoDisplay: requireElement("txtMetronomeTempo"),
  metronomeSummary: requireElement("txtMetronomeSummary"),
  metronomeMeasureDisplay: requireElement("txtMetronomeMeasure"),
  metronomeBeatDisplay: requireElement("txtMetronomeBeat"),
  metronomeTotalMeasuresDisplay: requireElement("txtMetronomeTotalMeasures"),
  metronomeXRepeatDisplay: requireElement("txtMetronomeXRepeat"),
  metronomeYRepeatDisplay: requireElement("txtMetronomeYRepeat"),
  metronomePulseGrid: requireElement("panelMetronomePulseGrid"),
  metronomeStatus: requireElement("txtMetronomeStatus"),
  flowSelect: requireElement("selectFlow"),
  flowResetButton: requireElement("btnFlowReset"),
  flowStartSelect: requireElement("selectFlowStart"),
  currentKey: requireElement("txtCurrentKey"),
  progressionHeadline: requireElement("txtProgressionHeadline"),
  progressionDisplay: requireElement("txtProgression"),
  cadenceDisplay: requireElement("txtCadence"),
  chordDisplay: requireElement("txtChord"),
  cntChordsCorrect: requireElement("txtChordsCorrect"),
  cntProgsCorrect: requireElement("txtProgressionsCorrect"),
  cntSongsCorrect: requireElement("txtSongsCorrect"),
  cntScalesCorrect: requireElement("txtScalesCorrect"),
  cntDegreesCorrect: requireElement("txtDegreesCorrect"),
  cntBricksCorrect: requireElement("txtBricksCorrect"),
  cntChordsIncorrect: requireElement("txtChordsIncorrect"),
  cntProgsIncorrect: requireElement("txtProgressionsIncorrect"),
  cntSongsIncorrect: requireElement("txtSongsIncorrect"),
  cntScalesIncorrect: requireElement("txtScalesIncorrect"),
  cntDegreesIncorrect: requireElement("txtDegreesIncorrect"),
  cntBricksIncorrect: requireElement("txtBricksIncorrect"),
  cntChordsTotal: statTotalElements.chords,
  cntProgsTotal: statTotalElements.progressions,
  cntSongsTotal: statTotalElements.songs,
  cntScalesTotal: statTotalElements.scales,
  cntDegreesTotal: statTotalElements.degrees,
  cntBricksTotal: statTotalElements.bricks,
  resetStatsButton: requireElement("btnStatsReset"),
  dailyStatsSummary: requireElement("txtDailyStatsSummary"),
  statGoals: statGoalInputs,
  statCards: statCardElements,
  statTotals: statTotalElements,
  themePicker: requireElement("panelThemePicker"),
  themeRadios: radioGroups.theme,
  optionsPanels,
  modeSections,
  jazzBrickButtons,
  degreeCheckboxes,
  piano: requireElement("panelPiano"),
  keyboardDetails: requireElement("panelKeyboard"),
  keyboardSummary: requireElement("txtKeyboardSummary"),
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
  midiRefreshButton: requireElement("btnMidiRefresh"),
  midiInputs: requireElement("tableMidiInputs"),
  midiOutputs: requireElement("tableMidiOutputs"),
  settingsPresetSelect: requireElement("selectSettingsPreset"),
  settingsPresetPrevButton: requireElement("btnSettingsPresetPrev"),
  settingsPresetNextButton: requireElement("btnSettingsPresetNext"),
  settingsPresetName: requireElement("inputSettingsPresetName"),
  settingsNewButton: requireElement("btnSettingsNew"),
  settingsSaveButton: requireElement("btnSettingsSave"),
  settingsLoadButton: requireElement("btnSettingsLoad"),
  settingsDeleteButton: requireElement("btnSettingsDelete"),
  settingsResetButton: requireElement("btnSettingsReset"),
  settingsDownloadButton: requireElement("btnSettingsDownload"),
  settingsUploadButton: requireElement("btnSettingsUpload"),
  settingsUploadInput: requireElement("inputSettingsUpload"),
  settingsFileStatus: requireElement("txtSettingsFileStatus"),
  trainingSetupSummary: requireElement("txtTrainingSetupSummary"),
  workoutPanel: requireElement("panelOptionsWorkouts"),
  workoutSelect: requireElement("selectWorkout"),
  workoutPrevButton: requireElement("btnWorkoutPrev"),
  workoutNextButton: requireElement("btnWorkoutNext"),
  workoutNameInput: requireElement("inputWorkoutName"),
  workoutNewButton: requireElement("btnWorkoutNew"),
  workoutSaveButton: requireElement("btnWorkoutSave"),
  workoutDeleteButton: requireElement("btnWorkoutDelete"),
  workoutDownloadButton: requireElement("btnWorkoutDownload"),
  workoutUploadButton: requireElement("btnWorkoutUpload"),
  workoutUploadInput: requireElement("inputWorkoutUpload"),
  workoutFileStatus: requireElement("txtWorkoutFileStatus"),
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
  M7b5: [0, 4, 6, 11],
  "7b5": [0, 4, 6, 10],
  "M7#11": [0, 4, 7, 11, 18],
  aug7: [0, 4, 8, 10],
  augM7: [0, 4, 8, 11],

  9: [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  M9: [0, 4, 7, 11, 14],
  "9b5": [0, 4, 6, 10, 14],
  "9#11": [0, 4, 7, 10, 14, 18],
  "M9#11": [0, 4, 7, 11, 14, 18],

  11: [0, 4, 7, 10, 14, 17],
  m11: [0, 3, 7, 10, 14, 17],
  M11: [0, 4, 7, 11, 14, 17],

  13: [0, 4, 7, 10, 14, 21],
  m13: [0, 3, 7, 10, 14, 17, 21],
  M13: [0, 4, 7, 11, 14, 21],
  "13b9": [0, 4, 7, 10, 13, 21],
  "13#9": [0, 4, 7, 10, 15, 21],
  "13#11": [0, 4, 7, 10, 14, 18, 21],
  "M13#11": [0, 4, 7, 11, 14, 18, 21],

  "7alt": [0, 4, 6, 10],
  "7b9": [0, 4, 7, 10, 13],
  "7b9b5": [0, 4, 6, 10, 13],
  "7#9": [0, 4, 7, 10, 15],
  "7#9b5": [0, 4, 6, 10, 15],
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
  M7: ["M7", "ma7", "maj7", "△7", "△", "Δ7", "Δ"],
  mM7: ["mM7", "m maj7", "-△7", "-△", "-Δ7", "-Δ"],
  dim7: ["dim7", "o7", "º7"],
  m7b5: ["m7b5", "-7b5", "ø", "ø7"],
  M7b5: ["M7b5", "maj7b5", "ma7b5", "△7b5", "△b5", "Δ7b5", "Δb5"],
  "7b5": ["7b5"],
  "M7#11": ["M7#11", "ma7#11", "maj7#11", "△7#11", "Δ7#11"],
  aug7: ["7#5", "+7", "aug7"],
  augM7: ["M7#5", "+M7", "augM7"],

  9: ["9"],
  m9: ["m9", "min9", "-9"],
  M9: ["M9", "maj9", "△9", "Δ9"],
  "9b5": ["9b5"],
  "9#11": ["9#11"],
  "M9#11": ["M9#11", "maj9#11", "△9#11", "Δ9#11"],

  11: ["11"],
  m11: ["m11", "min11", "-11"],
  M11: ["M11", "maj11", "△11", "Δ11"],

  13: ["13"],
  m13: ["m13", "min13", "-13"],
  M13: ["M13", "maj13", "△13", "Δ13"],
  "13b9": ["13b9"],
  "13#9": ["13#9"],
  "13#11": ["13#11"],
  "M13#11": ["M13#11", "maj13#11", "△13#11", "Δ13#11"],

  "7alt": ["7alt", "alt"],
  "7b9": ["7b9"],
  "7b9b5": ["7b9b5"],
  "7#9": ["7#9", "7+9"],
  "7#9b5": ["7#9b5"],
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

function isAlteredDominantChordType(chordType) {
  return chordType === "7alt";
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
  const isAlteredDominant = isAlteredDominantChordType(chordType);
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
  if (/b5|dim/.test(chordType)) fifthInterval = 6;
  if (isAlteredDominant) fifthInterval = 6;
  const fifth = normalizePitchClass(rootVal + fifthInterval);

  const hasSharp9 = /(\+9|#9)/.test(chordType);
  const hasFlat9 = /b9/.test(chordType);
  let ninthInterval = 14;
  if (/dim7/.test(chordType)) ninthInterval = 13;
  if (isAlteredDominant) ninthInterval = 13;
  if (hasSharp9) ninthInterval = 15;
  else if (hasFlat9) ninthInterval = 13;
  const ninth = normalizePitchClass(rootVal + ninthInterval);

  return { third, seventh, ninth, fifth };
}

function getTargetUpperIntervalVariants(chordInternalName) {
  const intervals = getTargetUpperIntervals(chordInternalName);
  const { rootName, chordType } = splitChordInternalName(chordInternalName);
  const rootVal = noteValues[rootName];
  if (!isAlteredDominantChordType(chordType) || typeof rootVal !== "number") {
    return [intervals];
  }

  const third = normalizePitchClass(rootVal + 4);
  const seventh = normalizePitchClass(rootVal + 10);
  const ninths = [
    normalizePitchClass(rootVal + 13),
    normalizePitchClass(rootVal + 15),
  ];
  const fifths = [
    normalizePitchClass(rootVal + 6),
    normalizePitchClass(rootVal + 8),
  ];
  const variants = [];
  ninths.forEach((ninth) => {
    fifths.forEach((fifth) => {
      variants.push({ third, seventh, ninth, fifth });
    });
  });
  return variants;
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
    if (thirdCandidate !== undefined && sixthCandidate !== undefined) {
      return { notes: [thirdCandidate, sixthCandidate], alternates: null };
    }
    if (thirdCandidate !== undefined) {
      return { notes: [thirdCandidate], alternates: null };
    }
    return { notes: notes.slice(), alternates: null };
  }

  return { notes: notes.slice(), alternates: null };
}

function computeNormalVoicing(notes, chordInternalName, mode) {
  if (!Array.isArray(notes) || !notes.length) {
    return { notes: [], alternates: null };
  }

  if (!mode || mode === "default" || mode === "off") {
    return { notes: notes.slice(), alternates: null };
  }

  if (mode === "root") {
    return { notes: [notes[0]], alternates: null };
  }

  if (mode === "triad") {
    return { notes: notes.slice(0, 3), alternates: null };
  }

  if (mode === "noExtensions") {
    if (notes.length > 4) {
      return { notes: notes.slice(0, 4), alternates: null };
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

function getAlteredDominantVoicingAlternates(chordInternalName, voicingMode) {
  const { rootName, chordType } = splitChordInternalName(
    chordInternalName || "",
  );
  const root = noteValues[rootName];
  if (!isAlteredDominantChordType(chordType) || typeof root !== "number") {
    return null;
  }

  const third = root + 4;
  const flatFifth = root + 6;
  const sharpFifth = root + 8;
  const seventh = root + 10;
  const mode = voicingMode || "default";

  if (mode === "default" || mode === "off" || mode === "normal:noExtensions") {
    return [
      [root, third, flatFifth, seventh],
      [root, third, sharpFifth, seventh],
    ];
  }
  if (mode === "normal:triad") {
    return [
      [root, third, flatFifth],
      [root, third, sharpFifth],
    ];
  }
  return null;
}

function applyVoicingToNotes(notes, chordInternalName, voicingMode) {
  if (!Array.isArray(notes)) {
    return { notes: [], alternates: null };
  }
  const alteredDominantAlternates = getAlteredDominantVoicingAlternates(
    chordInternalName,
    voicingMode,
  );
  if (!voicingMode || voicingMode === "default") {
    if (alteredDominantAlternates) {
      return {
        notes: alteredDominantAlternates[0],
        alternates: alteredDominantAlternates,
      };
    }
    return { notes: notes.slice(), alternates: null };
  }
  if (voicingMode.startsWith("normal:")) {
    const result = computeNormalVoicing(
      notes,
      chordInternalName,
      voicingMode.split(":")[1],
    );
    if (alteredDominantAlternates) {
      return {
        notes: alteredDominantAlternates[0],
        alternates: alteredDominantAlternates,
      };
    }
    return result;
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
  getTargetUpperIntervalVariants,
  resolveUpperVoicing,
  matchesVoicingOrderSorted,
  computeShellVoicing,
  computeNormalVoicing,
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
  { name: "Amen", chords: ["IV△", "I△"], enabled: false },
  {
    name: "Autumnal",
    chords: ["ii7", "V7", "viiø", "III7", "vi△"],
    enabled: false,
  },
  {
    name: "Body & Soul",
    chords: ["ii7", "VI7", "ii7", "V7", "I△", "I△"],
    enabled: false,
  },
  { name: "Dizzy", chords: ["bvi7", "bII7", "I△", "I△"], enabled: false },
  { name: "Dogleg", chords: ["vi7", "II7", "ii7", "V7", "I△"], enabled: false },
  {
    name: "(7-chord) Dropback",
    chords: ["ii7", "V7", "I△", "VI7", "ii7", "V7", "I△"],
    enabled: false,
  },
  { name: "Extended", chords: ["vi7", "ii7", "V7", "I△"], enabled: false },
  {
    name: "Happenstance",
    chords: ["#iv7", "VII7", "I△", "I△"],
    enabled: false,
  },
  { name: "Long", chords: ["iii7", "VI7", "ii7", "V7", "I△"], enabled: false },
  { name: "Overrun", chords: ["ii7", "V7", "I△", "IV△"], enabled: false },
  {
    name: "Moment’s",
    chords: ["#i7", "#IV7", "ii7", "V7", "I△", "I△"],
    enabled: false,
  },
  { name: "Night & Day", chords: ["bVI△", "V7", "I△", "I△"], enabled: false },
  { name: "Nobody’s", chords: ["I△", "III7", "vi△"], enabled: false },
  { name: "Nowhere", chords: ["bVI7", "V7", "I△", "I△"], enabled: false },
  {
    name: "(7-chord) Pullback",
    chords: ["ii7", "V7", "iii7", "VI7", "ii7", "V7", "I△"],
    enabled: false,
  },
  { name: "Rainbow", chords: ["I△", "III7", "IV△", "IV△"], enabled: false },
  {
    name: "Rainy",
    chords: ["iii7", "bIIIø", "ii7", "V7", "I△", "I△"],
    enabled: false,
  },
  {
    name: "Satin",
    chords: ["vi7", "ii7", "bvi7", "bII7", "I△", "I△"],
    enabled: false,
  },
  {
    name: "Spring",
    chords: ["VIIø", "III7", "ii7", "V7", "I△", "I△"],
    enabled: false,
  },
  {
    name: "Stablemates",
    chords: ["biii7", "bVI7", "ii7", "V7", "I△", "I△"],
    enabled: false,
  },
  {
    name: "Starlight",
    chords: ["#IVø", "VII7", "iii7", "VI7", "ii7", "V7", "I△"],
    enabled: false,
  },
  {
    name: "Starlight N&D Variant",
    chords: ["#IVø", "vi7", "biiio7", "VI7", "ii7", "V7", "I△"],
    enabled: false,
  },
  { name: "Regular", chords: ["ii7", "V7", "I△"], enabled: false },
  {
    name: "Regular (minor)",
    chords: ["iiø", "V7+9", "I△", "I△"],
    enabled: false,
  },
  { name: "Tension Ending", chords: ["ii7", "V7", "I7", "I7"], enabled: false },
  {
    name: "Tritone Substitution",
    chords: ["ii7", "bII7", "I△", "I△"],
    enabled: false,
  },
  {
    name: "Two-Goes",
    chords: ["ii7", "V7", "ii7", "V7", "I△"],
    enabled: false,
  },
  { name: "Yardbird", chords: ["iv7", "bVII7", "I△", "I△"], enabled: false },
  // Turnarounds
  { name: "Foggy", chords: ["I△", "bIII7", "ii7", "V7"], enabled: false },
  { name: "II ’n’ Back", chords: ["ii7", "#iio7", "iii7"], enabled: false },
  { name: "Ladybird", chords: ["I△", "bIII7", "bVI△", "bII7"], enabled: false },
  {
    name: "Nowhere (turnaround)",
    chords: ["I△", "VI7", "bVI7", "V7"],
    enabled: false,
  },
  {
    name: "Pennies",
    chords: ["I△", "ii7", "iii7", "bIIIø", "ii7", "V7"],
    enabled: false,
  },
  { name: "POT", chords: ["I△", "VI7", "ii7", "V7"], enabled: false },
  { name: "POT (minor)", chords: ["i△", "viø", "iiø", "V7+9"], enabled: false },
  { name: "Rhythm", chords: ["I△", "bIIo7", "ii7", "bIIIo7"], enabled: false },
  { name: "SPOT", chords: ["iii7", "VI7", "ii7", "V7"], enabled: false },
  {
    name: "To IV 'n' Back",
    chords: ["I△", "I7", "IV△", "#IVo7", "I△"],
    enabled: false,
  },
  {
    name: "To IV 'n' Hack",
    chords: ["I△", "I7", "IV△", "VII7", "I△"],
    enabled: false,
  },
  {
    name: "To IV 'n' Mack",
    chords: ["I△", "I7", "IV△", "iv△", "I△"],
    enabled: false,
  },
  {
    name: "To IV 'n' Yak",
    chords: ["I△", "I7", "IV△", "bVII7", "I△"],
    enabled: false,
  },
  { name: "Whoopee", chords: ["I△", "bIIo7", "ii7", "V7"], enabled: false },
  // Metabricks
  {
    name: "Autumn Leaves Opening",
    chords: ["ii7", "V7", "I△", "IV△", "viiø", "III7", "vi△", "VI7"],
    enabled: false,
  },
  {
    name: "Four-Star Ending",
    chords: ["IV△", "#iv7", "VII7", "iii7", "VI7", "ii7", "V7", "I△", "I△"],
    enabled: false,
  },
  {
    name: "Honeysuckle Bridge",
    chords: ["v7", "I7", "IV△", "IV△", "vi7", "II7", "ii7", "V7"],
    enabled: false,
  },
  {
    name: "ITCHY Opening",
    chords: ["I△", "iii7", "VI7", "ii7", "#iv7", "VII7"],
    enabled: false,
  },
  {
    name: "On-Off(any dom7)-On + Dropback",
    chords: ["I△", "III7", "I△", "VI7"],
    enabled: false,
  },
  {
    name: "Pennies Ending",
    chords: ["IV△", "#ivo7", "I△", "iii7", "VI7", "ii7", "V7", "I△", "I△"],
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
      "I△",
      "iii7",
      "VI7",
      "ii7",
      "V7",
      "I△",
      "I△",
    ],
    enabled: false,
  },
  {
    name: "Sixpenny Ending",
    chords: [
      "vi7",
      "iv7",
      "bVII7",
      "I△",
      "iii7",
      "VI7",
      "ii7",
      "V7",
      "I△",
      "I△",
    ],
    enabled: false,
  },
  {
    name: "To IV ’n’ Bird SPOT",
    chords: ["I△", "I7", "IV△", "bVII7", "iii7", "VI7", "ii7", "V7"],
    enabled: false,
  },
  {
    name: "Twopenny Ending",
    chords: ["ii7", "iv7", "bVII7", "I△", "iii7", "VI7", "ii7", "V7", "I△"],
    enabled: false,
  },
  // Miscellaneous
  {
    name: "Chromatic Dropback",
    chords: ["I△", "VII7", "bVII7", "VI7", "ii7"],
    enabled: false,
  },
  {
    name: "Dogleg Dropback",
    chords: ["ii7", "V7", "v7", "I7", "i7"],
    enabled: false,
  },
  { name: "Dropback", chords: ["I△", "VI7", "ii7"], enabled: false },
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
    chords: ["I△", "IV7", "bVII7", "VI7", "ii7"],
    enabled: false,
  },
  {
    name: "TTFA Dropback",
    chords: ["I△", "IV7", "iii7", "VI7", "ii7"],
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
const SETTINGS_PRESET_SEED_VERSION_KEY =
  "chordChallenge.settings.presets.seedVersion";
const WORKOUTS_STORAGE_KEY = "chordChallenge.workouts";
const WORKOUTS_SELECTED_KEY = "chordChallenge.workouts.selected";
const WORKOUTS_SEED_VERSION_KEY = "chordChallenge.workouts.seedVersion";
const SONGS_STORAGE_KEY = "chordChallenge.songs";
const SONGS_SELECTED_KEY = "chordChallenge.songs.selected";
const STARTER_CONTENT_VERSION = "starter-2026-07-07-short-names";
const STARTER_PRESET_NAMES = {
  chords: "Major & Minor Chords",
  progressions: "I-IV-V Progressions",
  degrees: "Scale Degrees",
  scales: "Major & Minor Scales",
  jazz: "Jazz ii-V-I",
};
const SONGS_FINISH_ACTIONS = {
  nothing: "nothing",
  nextFavorite: "nextFavorite",
  randomFavorite: "randomFavorite",
  nextSong: "nextSong",
  randomSong: "randomSong",
};
const SONGS_FINISH_ACTION_VALUES = Object.values(SONGS_FINISH_ACTIONS);
const DEFAULT_SONG_REPEAT_COUNT = 3;
const DEFAULT_METRONOME_SETTINGS = {
  tempo: 120,
  beatsPerMeasure: 4,
  xMeasures: 4,
  yMeasures: 8,
  countInMeasures: 1,
};
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
  "^11": "M11",
  "^13": "M13",
  6: "6",
  69: "6",
  "^7#11": "M7#11",
  "^9#11": "M9#11",
  "^13#11": "M13#11",
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
  "^7b5": "M7b5",
  9: "9",
  "7b9": "7b9",
  "7#9": "7#9",
  "7#11": "7#11",
  "7b5": "7b5",
  "7#5": "aug7",
  "9#11": "9#11",
  "9b5": "9b5",
  "9#5": "9",
  "7b13": "7",
  "7#9#5": "7#9",
  "7#9b5": "7#9b5",
  "7#9#11": "7#9",
  "7b9#11": "7b9",
  "7b9b5": "7b9b5",
  "7b9#5": "7b9",
  "7b9#9": "7b9",
  "7b9b13": "7b9",
  alt: "7alt",
  "7alt": "7alt",
  13: "13",
  "13#11": "13#11",
  "13b9": "13b9",
  "13#9": "13#9",
  "7b9sus": "sus4",
  "7susadd3": "sus4",
  "9sus": "sus4",
  "13sus": "sus4",
  "7b13sus": "sus4",
  "11,min13": "11",
  min13: "m13",
  "min^11": "m11",
  "min^13": "m13",
  "maj13#11": "M13#11",
  maj7b5: "M7b5",
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

function parseJsonObjectPayload(payload) {
  try {
    const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function sanitizeNamedCollectionName(name) {
  return typeof name === "string" ? name.trim() : "";
}

function normalizeTextValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatKeyDisplay(key) {
  const normalized = normalizeTextValue(key);
  if (!normalized) return "";
  return normalized.replace(/^([A-Ga-g])([b#♭♯]?)/, (_, root, accidental) => {
    const symbol =
      accidental === "b" || accidental === "♭"
        ? "♭"
        : accidental === "#" || accidental === "♯"
          ? "♯"
          : "";
    return `${root.toUpperCase()}${symbol}`;
  });
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

function extractKeyTonic(key) {
  const normalized = normalizeTextValue(key);
  const matched = normalized.match(/[A-G][b#]?/);
  return matched ? matched[0] : normalized;
}

function prefersFlatKeySpelling(key) {
  const normalized = extractKeyTonic(key);
  return (
    normalized.includes("b") ||
    ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"].includes(normalized)
  );
}

function transposeNoteName(note, semitoneOffset, targetKey = "") {
  const normalized = extractKeyTonic(note);
  if (
    !normalized ||
    !Object.prototype.hasOwnProperty.call(noteValues, normalized)
  ) {
    return normalized;
  }
  const transposed = (noteValues[normalized] + semitoneOffset + 1200) % 12;
  return prefersFlatKeySpelling(targetKey)
    ? valuesToNotesFlat[transposed]
    : valuesToNotesSharp[transposed];
}

function sanitizeSongKeySettings(source) {
  const settings =
    source && typeof source === "object"
      ? source.songs && typeof source.songs === "object"
        ? source.songs
        : source
      : {};
  return {
    useOriginalKey:
      !settings ||
      !Object.prototype.hasOwnProperty.call(settings, "useOriginalKey")
        ? true
        : !!settings.useOriginalKey,
    advanceKeyOnRepeat: !!(settings && settings.advanceKeyOnRepeat),
    advanceKeyOnSongChange: !!(settings && settings.advanceKeyOnSongChange),
  };
}

function sanitizeSongRepeatCount(value) {
  let parsed = 0;
  try {
    parsed = parseInt(value, 10);
  } catch (_) {
    return DEFAULT_SONG_REPEAT_COUNT;
  }
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
    ...sanitizeSongKeySettings(settings),
    finishAction: sanitizeSongFinishAction(settings.finishAction),
    repeatCount: sanitizeSongRepeatCount(settings.repeatCount),
    countChordsTowardGoals:
      !settings ||
      !Object.prototype.hasOwnProperty.call(settings, "countChordsTowardGoals")
        ? true
        : !!settings.countChordsTowardGoals,
    displayRomanNumerals: !!(settings && settings.displayRomanNumerals),
  };
}

function sanitizeMetronomeInteger(value, min, max, fallback) {
  let parsed = 0;
  try {
    parsed = parseInt(value, 10);
  } catch (_) {
    return fallback;
  }
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function sanitizeMetronomeSettings(source) {
  const settings =
    source && typeof source === "object"
      ? source.metronome && typeof source.metronome === "object"
        ? source.metronome
        : source
      : {};
  return {
    tempo: sanitizeMetronomeInteger(
      settings.tempo,
      30,
      240,
      DEFAULT_METRONOME_SETTINGS.tempo,
    ),
    beatsPerMeasure: sanitizeMetronomeInteger(
      settings.beatsPerMeasure,
      1,
      16,
      DEFAULT_METRONOME_SETTINGS.beatsPerMeasure,
    ),
    xMeasures: sanitizeMetronomeInteger(
      settings.xMeasures,
      0,
      256,
      DEFAULT_METRONOME_SETTINGS.xMeasures,
    ),
    yMeasures: sanitizeMetronomeInteger(
      settings.yMeasures,
      0,
      256,
      DEFAULT_METRONOME_SETTINGS.yMeasures,
    ),
    countInMeasures: sanitizeMetronomeInteger(
      settings.countInMeasures,
      0,
      8,
      DEFAULT_METRONOME_SETTINGS.countInMeasures,
    ),
    syncToSongs:
      !!settings &&
      Object.prototype.hasOwnProperty.call(settings, "syncToSongs")
        ? !!settings.syncToSongs
        : false,
  };
}

function getMetronomeTickType(beatInMeasure, measureNumber, source) {
  const settings = sanitizeMetronomeSettings(source);
  if (beatInMeasure !== 0) return "normal";
  if (settings.yMeasures > 0 && measureNumber % settings.yMeasures === 0) {
    return "y";
  }
  if (settings.xMeasures > 0 && measureNumber % settings.xMeasures === 0) {
    return "x";
  }
  return "measure";
}

function getSongSyncMetronomeTickType(
  beatInMeasure,
  transportMeasureNumber,
  measure,
  options = {},
) {
  if (beatInMeasure !== 0) return "normal";
  const xMeasures = sanitizeMetronomeInteger(options.xMeasures, 0, 256, 4);
  const yMeasures = sanitizeMetronomeInteger(options.yMeasures, 0, 256, 0);
  const songMeasureNumber = sanitizeMetronomeInteger(
    measure && measure.sectionMeasure,
    1,
    1000000,
    1,
  );
  const countInMeasures = sanitizeMetronomeInteger(
    options.countInMeasures,
    0,
    8,
    0,
  );

  if (!options.hasStarted && countInMeasures > 0) {
    if (yMeasures > 0) return "y";
    if (xMeasures > 0) return "x";
    return "measure";
  }

  if (yMeasures > 0 && (songMeasureNumber - 1) % yMeasures === 0) {
    return "y";
  }
  if (xMeasures > 0 && (songMeasureNumber - 1) % xMeasures === 0) {
    return "x";
  }
  return "measure";
}

function getMetronomeCompletedMeasures(hasPlayedNote, currentMeasure) {
  if (!hasPlayedNote) return 0;
  const measureNumber = sanitizeMetronomeInteger(currentMeasure, 1, 1000000, 1);
  return Math.max(0, measureNumber - 1);
}

function getMetronomeDisplayedMeasure(currentMeasure, xMeasures, yMeasures) {
  const measureNumber = sanitizeMetronomeInteger(currentMeasure, 1, 1000000, 1);
  const xLength = sanitizeMetronomeInteger(xMeasures, 0, 256, 0);
  const yLength = sanitizeMetronomeInteger(yMeasures, 0, 256, 0);
  const lastCompletedMeasure = measureNumber - 1;
  const resetPoints = [0];

  if (xLength > 0) {
    resetPoints.push(Math.floor(lastCompletedMeasure / xLength) * xLength);
  }
  if (yLength > 0) {
    resetPoints.push(Math.floor(lastCompletedMeasure / yLength) * yLength);
  }

  return measureNumber - Math.max.apply(null, resetPoints);
}

function getMetronomeCycleDisplay(currentMeasure, length) {
  const cycleLength = sanitizeMetronomeInteger(length, 0, 256, 0);
  if (cycleLength <= 0) return "Off";
  const measureNumber = sanitizeMetronomeInteger(currentMeasure, 1, 1000000, 1);
  return `${((measureNumber - 1) % cycleLength) + 1} / ${cycleLength}`;
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

function pickSongIdForSongNavigation(songs, currentSongId, direction) {
  const orderedSongs = Array.isArray(songs)
    ? songs.filter((song) => song && normalizeTextValue(song.id))
    : [];
  if (!orderedSongs.length) return "";

  const step = direction === "previous" ? -1 : 1;
  const currentId = normalizeTextValue(currentSongId);
  const currentIndex = orderedSongs.findIndex((song) => song.id === currentId);
  if (currentIndex < 0) {
    return step < 0
      ? orderedSongs[orderedSongs.length - 1].id
      : orderedSongs[0].id;
  }

  return (
    orderedSongs[
      (currentIndex + step + orderedSongs.length) % orderedSongs.length
    ].id || ""
  );
}

function pickSongIdForFavoriteNavigation(songs, currentSongId, direction) {
  const orderedSongs = Array.isArray(songs)
    ? songs.filter((song) => song && normalizeTextValue(song.id))
    : [];
  if (!orderedSongs.length) return "";

  const currentId = normalizeTextValue(currentSongId);
  const fallbackId =
    orderedSongs.find((song) => song.id === currentId)?.id ||
    orderedSongs[0].id;
  const favorites = orderedSongs.filter((song) => !!song.favorite);
  if (!favorites.length) return fallbackId;

  const step = direction === "previous" ? -1 : 1;
  const currentIndex = orderedSongs.findIndex((song) => song.id === currentId);
  if (currentIndex < 0) {
    return step < 0 ? favorites[favorites.length - 1].id : favorites[0].id;
  }

  for (let offset = 1; offset <= orderedSongs.length; offset += 1) {
    const candidate =
      orderedSongs[
        (((currentIndex + step * offset) % orderedSongs.length) +
          orderedSongs.length) %
          orderedSongs.length
      ];
    if (candidate && candidate.favorite) return candidate.id;
  }

  return step < 0 ? favorites[favorites.length - 1].id : favorites[0].id;
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
    return pickSongIdForSongNavigation(orderedSongs, currentId, "next");
  }

  if (action === SONGS_FINISH_ACTIONS.randomSong) {
    return pickRandomSongId(orderedSongs, currentId, randomValue);
  }

  const favorites = orderedSongs.filter((song) => !!song.favorite);
  if (!favorites.length) return fallbackId;

  if (action === SONGS_FINISH_ACTIONS.randomFavorite) {
    return pickRandomSongId(favorites, currentId, randomValue);
  }

  return pickSongIdForFavoriteNavigation(orderedSongs, currentId, "next");
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
            : note === "W" || (note === " " && bass)
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
    if (normalized.includes("b5") && normalized.includes("7")) return "M7b5";
    if (normalized.includes("#11")) {
      if (normalized.includes("13")) return "M13#11";
      if (normalized.includes("9")) return "M9#11";
      if (normalized.includes("7")) return "M7#11";
    }
    if (normalized.includes("11")) return "M11";
    if (normalized.includes("13")) return "M13";
    if (normalized.includes("9")) return "M9";
    if (normalized.includes("7")) return "M7";
    return "";
  }
  if (normalized.includes("alt")) return "7alt";
  if (normalized.includes("b5")) {
    if (normalized.includes("#9")) return "7#9b5";
    if (normalized.includes("b9")) return "7b9b5";
    if (normalized.includes("9")) return "9b5";
    if (normalized.includes("7")) return "7b5";
  }
  if (normalized.includes("#11")) {
    if (normalized.includes("13")) return "13#11";
    if (normalized.includes("9")) return "9#11";
    return "7#11";
  }
  if (normalized.includes("#9"))
    return normalized.includes("13") ? "13#9" : "7#9";
  if (normalized.includes("b9"))
    return normalized.includes("13") ? "13b9" : "7b9";
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

function formatRomanScaleDegree(note, key, lowercase = false) {
  const tonic = extractKeyTonic(key);
  const normalized = extractKeyTonic(note);
  if (
    !tonic ||
    !normalized ||
    !Object.prototype.hasOwnProperty.call(noteValues, tonic) ||
    !Object.prototype.hasOwnProperty.call(noteValues, normalized)
  ) {
    return formatIRealProDisplayNote(note);
  }
  const interval = (noteValues[normalized] - noteValues[tonic] + 12) % 12;
  const mapped = stepsToNames[interval];
  if (!mapped || !mapped.numeral) {
    return formatIRealProDisplayNote(note);
  }
  const accidentalized = mapped.numeral.replace(/b/g, "♭").replace(/#/g, "♯");
  if (!lowercase) return accidentalized;
  return accidentalized.replace(/[IV]+/g, (match) => match.toLowerCase());
}

function formatIRealProDisplayQuality(quality) {
  let formatted = normalizeTextValue(quality);
  if (!formatted) return "";
  if (formatted.startsWith("h")) {
    formatted = "ø" + formatted.slice(1);
  }
  return formatted
    .replace(/maj/g, "△")
    .replace(/min/g, "-")
    .replace(/\^/g, "△")
    .replace(/o/g, "°")
    .replace(/#/g, "♯")
    .replace(/b/g, "♭");
}

function formatIRealProRomanQuality(quality) {
  const internal = normalizeIRealProQualityToInternal(quality || "");
  let formatted = formatIRealProDisplayQuality(quality);
  const isMinorish =
    internal === "m" ||
    internal.startsWith("m") ||
    internal === "dim" ||
    internal === "dim7";

  if (internal === "m7b5") {
    if (formatted.startsWith("ø")) return formatted;
    return /\d/.test(formatted) ? `ø${formatted.replace(/^-?\d*/, "")}` : "ø";
  }
  if (internal === "dim") return formatted.includes("°") ? formatted : "°";
  if (internal === "dim7") return formatted.includes("°") ? formatted : "°7";
  if (isMinorish && formatted.startsWith("-")) {
    return formatted.slice(1);
  }
  return formatted;
}

function formatIRealProRomanChordDisplay(chord, targetKey = "") {
  if (!chord || typeof chord !== "object") return "";
  if (chord.kind === "noChord") return "N.C.";
  if (chord.kind === "repeatOne") return "%";
  if (chord.kind === "repeatTwo") return "%%";
  if (chord.kind === "slash") return "/";

  const internal = normalizeIRealProQualityToInternal(chord.quality || "");
  const isMinorish =
    internal === "m" ||
    internal.startsWith("m") ||
    internal === "dim" ||
    internal === "dim7";
  const root =
    chord.kind === "invisibleRoot"
      ? ""
      : formatRomanScaleDegree(chord.root, targetKey, isMinorish);
  const quality = formatIRealProRomanQuality(chord.quality || "");
  const bass =
    chord.bass && chord.bass.root
      ? `/${formatRomanScaleDegree(chord.bass.root, targetKey)}`
      : "";
  const alternate = chord.alternate
    ? ` (${formatIRealProRomanChordDisplay(chord.alternate, targetKey)})`
    : "";

  if (root && chord.kind !== "invisibleRoot" && chord.kind !== "slash") {
    return `${root}${quality}${bass}${alternate}`;
  }

  const raw = normalizeTextValue(chord.raw);
  return raw.replace(/\^/g, "△").replace(/#/g, "♯").replace(/b/g, "♭");
}

function formatIRealProChordDisplay(chord) {
  if (!chord || typeof chord !== "object") return "";
  if (chord.kind === "noChord") return "N.C.";
  if (chord.kind === "repeatOne") return "%";
  if (chord.kind === "repeatTwo") return "%%";
  if (chord.kind === "slash") return "/";

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
  return raw.replace(/\^/g, "△").replace(/#/g, "♯").replace(/b/g, "♭");
}

function transposeIRealProChord(chord, semitoneOffset, targetKey = "") {
  if (!chord || typeof chord !== "object" || !semitoneOffset) {
    return chord ? cloneObject(chord) : chord;
  }
  const root = normalizeTextValue(chord.root);
  const bassRoot =
    chord.bass && typeof chord.bass === "object"
      ? normalizeTextValue(chord.bass.root)
      : "";
  const alternate =
    chord.alternate && typeof chord.alternate === "object"
      ? transposeIRealProChord(chord.alternate, semitoneOffset, targetKey)
      : chord.alternate
        ? cloneObject(chord.alternate)
        : null;
  return {
    ...cloneObject(chord),
    root: root ? transposeNoteName(root, semitoneOffset, targetKey) : root,
    bass: bassRoot
      ? {
          ...cloneObject(chord.bass),
          root: transposeNoteName(bassRoot, semitoneOffset, targetKey),
          raw: transposeNoteName(bassRoot, semitoneOffset, targetKey),
        }
      : chord.bass
        ? cloneObject(chord.bass)
        : null,
    alternate,
  };
}

function buildAsciiChordLabel(chord) {
  if (!chord || typeof chord !== "object") return "";
  if (chord.kind === "noChord") return "N.C.";
  if (chord.kind === "repeatOne") return "%";
  if (chord.kind === "repeatTwo") return "%%";
  if (chord.kind === "slash") return "/";
  const root = normalizeTextValue(chord.root);
  const quality = normalizeTextValue(chord.quality);
  const bass =
    chord.bass && chord.bass.root
      ? `/${normalizeTextValue(chord.bass.root)}`
      : "";
  const alternate = chord.alternate
    ? `(${buildAsciiChordLabel(chord.alternate)})`
    : "";
  return `${root}${quality}${bass}${alternate}`;
}

function replaceAsciiChordBass(rawLabel, bassNote, fallbackLabel = "") {
  const bass = normalizeTextValue(bassNote);
  const fallback = normalizeTextValue(fallbackLabel);
  let raw = normalizeTextValue(rawLabel);
  if (!bass) return raw || fallback;
  if (!raw || raw.startsWith("/")) raw = fallback;

  const alternateMatch = raw.match(/(\([^()]*\))$/);
  const alternate = alternateMatch ? alternateMatch[1] : "";
  const base = alternate ? raw.slice(0, -alternate.length) : raw;
  const strippedBase = base.replace(/\/[A-G][#b]?$/, "") || fallback;
  return `${strippedBase}/${bass}${alternate}`;
}

function formatInvisibleRootBassLabel(bassNote, options = {}) {
  const bass = normalizeTextValue(bassNote);
  if (!bass) return "";
  if (options.displayRomanNumerals && options.targetKey) {
    return `/${formatRomanScaleDegree(bass, options.targetKey)}`;
  }
  return `/${formatIRealProDisplayNote(bass)}`;
}

function resolvePlayableSongChordReference(
  chord,
  previousReference,
  options = {},
) {
  if (!chord || typeof chord !== "object") return null;
  if (chord.kind === "slash") {
    return previousReference ? cloneObject(previousReference) : null;
  }
  const transposedChord = transposeIRealProChord(
    chord,
    options.semitoneOffset || 0,
    options.targetKey || chord.root,
  );
  if (chord.kind === "invisibleRoot") {
    if (!previousReference || !transposedChord.bass) return null;
    const bassNote = normalizeTextValue(transposedChord.bass.root);
    return {
      ...cloneObject(previousReference),
      label: formatInvisibleRootBassLabel(bassNote, options),
      rawLabel: replaceAsciiChordBass(
        previousReference.rawLabel,
        bassNote,
        previousReference.playableChord,
      ),
      bassNote,
    };
  }
  if (chord.kind !== "chord" || !chord.root) return null;
  return {
    label:
      options.displayRomanNumerals && options.targetKey
        ? formatIRealProRomanChordDisplay(
            transposedChord,
            options.targetKey || chord.root,
          )
        : formatIRealProChordDisplay(transposedChord),
    rawLabel: buildAsciiChordLabel(transposedChord) || chord.raw || chord.root,
    playableChord:
      transposedChord.root +
      normalizeIRealProQualityToInternal(transposedChord.quality || ""),
    bassNote:
      transposedChord.bass && transposedChord.bass.root
        ? transposedChord.bass.root
        : "",
  };
}

function buildPlayableSongEntry(reference, measureIndex, chordIndex) {
  if (!reference || typeof reference !== "object") return null;
  return {
    kind: "songChord",
    label: reference.label,
    rawLabel: reference.rawLabel,
    playableChord: reference.playableChord,
    bassNote: reference.bassNote,
    measureIndex,
    chordIndex,
    sourceMeasureIndex: measureIndex,
    sourceChordIndex: chordIndex,
  };
}

function buildPlayableSongEntries(song, options = {}) {
  if (!song || typeof song !== "object") return [];
  const chart =
    song.chart && Array.isArray(song.chart.measures)
      ? song.chart
      : song.raw && typeof song.raw.decodedMusic === "string"
        ? parseIRealProChart(song.raw.decodedMusic, { alreadyDecoded: true })
        : null;
  if (!chart) return [];
  const targetKey =
    normalizeTextValue(options.targetKey) || normalizeTextValue(song.key);
  const targetTonic = extractKeyTonic(targetKey);
  const songKey = normalizeTextValue(song.key);
  const songTonic = extractKeyTonic(songKey);
  const semitoneOffset =
    targetTonic &&
    songTonic &&
    Object.prototype.hasOwnProperty.call(noteValues, targetTonic) &&
    Object.prototype.hasOwnProperty.call(noteValues, songTonic)
      ? (noteValues[targetTonic] - noteValues[songTonic] + 12) % 12
      : 0;
  const resolvedMeasures = [];
  const sequence = [];
  let previousReference = null;
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
      const reference = resolvePlayableSongChordReference(
        chord,
        previousReference,
        {
          semitoneOffset,
          targetKey,
          displayRomanNumerals: !!options.displayRomanNumerals,
        },
      );
      const entry = buildPlayableSongEntry(reference, measureIndex, chordIndex);
      if (entry) {
        measureEntries.push(entry);
        previousReference = reference;
      }
    });
    if (!measureEntries.length && hasRepeatTwo && resolvedMeasures.length) {
      measureEntries = resolvedMeasures
        .slice(-2)
        .flat()
        .map((entry, repeatedChordIndex) => ({
          ...cloneSongChordEntry(entry),
          measureIndex,
          chordIndex:
            (repeatChordIndex >= 0 ? repeatChordIndex : 0) + repeatedChordIndex,
        }));
    } else if (
      !measureEntries.length &&
      hasRepeatOne &&
      resolvedMeasures.length
    ) {
      measureEntries = resolvedMeasures[resolvedMeasures.length - 1].map(
        (entry, repeatedChordIndex) => ({
          ...cloneSongChordEntry(entry),
          measureIndex,
          chordIndex:
            (repeatChordIndex >= 0 ? repeatChordIndex : 0) + repeatedChordIndex,
        }),
      );
    }
    if (measureEntries.length) {
      const lastEntry = measureEntries[measureEntries.length - 1];
      previousReference = {
        label: lastEntry.label,
        rawLabel: lastEntry.rawLabel,
        playableChord: lastEntry.playableChord,
        bassNote: lastEntry.bassNote,
      };
    }
    resolvedMeasures.push(measureEntries);
    measureEntries.forEach((entry) => {
      sequence.push(cloneSongChordEntry(entry));
    });
  });
  return sequence;
}

function formatSongMeasureChordLabel(chord, options = {}) {
  return options.displayRomanNumerals && options.targetKey
    ? formatIRealProRomanChordDisplay(chord, options.targetKey)
    : formatIRealProChordDisplay(chord);
}

function buildSongDisplayRows(song, barsPerRow = 4, options = {}) {
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
  const targetKey =
    normalizeTextValue(options.targetKey) || normalizeTextValue(song.key);
  const targetTonic = extractKeyTonic(targetKey);
  const songKey = normalizeTextValue(song.key);
  const songTonic = extractKeyTonic(songKey);
  const semitoneOffset =
    targetTonic &&
    songTonic &&
    Object.prototype.hasOwnProperty.call(noteValues, targetTonic) &&
    Object.prototype.hasOwnProperty.call(noteValues, songTonic)
      ? (noteValues[targetTonic] - noteValues[songTonic] + 12) % 12
      : 0;

  let previousTimeSignature = "";
  let previousReference = null;
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
      chords: [],
    };
    if (Array.isArray(measure.chords)) {
      result.chords = measure.chords.map((chord, chordIndex) => {
        const reference = resolvePlayableSongChordReference(
          chord,
          previousReference,
          {
            semitoneOffset,
            targetKey,
            displayRomanNumerals: !!options.displayRomanNumerals,
          },
        );
        const transposedChord = transposeIRealProChord(
          chord,
          semitoneOffset,
          targetKey,
        );
        const isSlash = normalizeTextValue(chord.kind) === "slash";
        const displayChord = {
          measureIndex,
          chordIndex,
          kind: normalizeTextValue(chord.kind),
          rawLabel: reference
            ? reference.rawLabel
            : buildAsciiChordLabel(transposedChord),
          label: isSlash
            ? "/"
            : reference
              ? reference.label
              : formatSongMeasureChordLabel(transposedChord, {
                  targetKey,
                  displayRomanNumerals: !!options.displayRomanNumerals,
                }),
        };
        if (reference) {
          previousReference = cloneObject(reference);
        }
        return displayChord;
      });
    }
    previousTimeSignature = timeSignature || previousTimeSignature;
    return result;
  });

  const rows = [];
  for (let index = 0; index < measures.length; index += barsPerRow) {
    rows.push(measures.slice(index, index + barsPerRow));
  }
  return rows;
}

function parseSongMeasureBeats(timeSignature) {
  const normalized = normalizeTextValue(timeSignature);
  const parts = normalized.split("/");
  const beats = parseInt(parts[0], 10);
  if (!Number.isFinite(beats) || beats < 1) return 4;
  return beats;
}

function buildSongPracticeTimeline(song, options = {}) {
  if (!song || typeof song !== "object") return [];
  const chart =
    song.chart && Array.isArray(song.chart.measures)
      ? song.chart
      : song.raw && typeof song.raw.decodedMusic === "string"
        ? parseIRealProChart(song.raw.decodedMusic, { alreadyDecoded: true })
        : null;
  if (!chart || !Array.isArray(chart.measures)) return [];

  const entries = buildPlayableSongEntries(song, options);
  const entriesByMeasure = new Map();
  entries.forEach((entry, sequenceIndex) => {
    if (!entry || entry.kind !== "songChord") return;
    const measureIndex = parseInt(entry.measureIndex, 10);
    if (!Number.isFinite(measureIndex) || measureIndex < 0) return;
    if (!entriesByMeasure.has(measureIndex)) {
      entriesByMeasure.set(measureIndex, []);
    }
    entriesByMeasure.get(measureIndex).push({
      ...cloneSongChordEntry(entry),
      sequenceIndex,
    });
  });

  let phraseMeasure = 0;
  let sectionMeasure = 0;
  return chart.measures.map((measure, measureIndex) => {
    const section = normalizeTextValue(measure.section);
    if (measureIndex === 0 || section) {
      phraseMeasure = 0;
      sectionMeasure = 0;
    }
    phraseMeasure = (phraseMeasure % 4) + 1;
    sectionMeasure += 1;
    return {
      measureIndex,
      beatsPerMeasure: parseSongMeasureBeats(measure.timeSignature),
      timeSignature: normalizeTextValue(measure.timeSignature) || "4/4",
      section,
      phraseMeasure,
      sectionMeasure,
      phraseLength: 4,
      chordTargets: (entriesByMeasure.get(measureIndex) || []).map((entry) => ({
        ...cloneSongChordEntry(entry),
        progressionIndex: entry.sequenceIndex,
      })),
    };
  });
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
  if (!!a.favorite !== !!b.favorite) {
    return a.favorite ? -1 : 1;
  }
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
  let parsed = 0;
  try {
    parsed = parseInt(value, 10);
  } catch (_) {
    return 0;
  }
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
  const sanitized = {
    preset,
    goals: sanitizeWorkoutGoals(entry),
    category,
  };
  if (
    entry.settings &&
    typeof entry.settings === "object" &&
    !Array.isArray(entry.settings)
  ) {
    sanitized.settings = cloneObject(entry.settings);
  }
  return sanitized;
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

function extractWorkoutPayload(payload) {
  const parsed = parseJsonObjectPayload(payload);
  if (!parsed) return {};
  if (parsed.workouts && typeof parsed.workouts === "object") {
    return parsed.workouts;
  }
  return parsed;
}

function workoutStoreFactory() {
  const store = {
    storage: getStorageHandle(),
    storageKey: WORKOUTS_STORAGE_KEY,
    selectedKey: WORKOUTS_SELECTED_KEY,
    seedVersionKey: WORKOUTS_SEED_VERSION_KEY,
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
    exportWorkouts(pretty = true) {
      try {
        return JSON.stringify(
          { workouts: this.loadAll() },
          null,
          pretty ? 2 : 0,
        );
      } catch (_) {
        return '{"workouts":{}}';
      }
    },
    importWorkouts(payload, { merge = true } = {}) {
      const imported = sanitizeWorkoutMap(extractWorkoutPayload(payload));
      const names = Object.keys(imported);
      if (!names.length) return 0;
      const next = merge ? this.loadAll() : {};
      names.forEach((name) => {
        next[name] = imported[name];
      });
      this.saveAll(next);
      return names.length;
    },
    seedStarterWorkouts() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      try {
        if (
          activeStorage.getItem(this.seedVersionKey) === STARTER_CONTENT_VERSION
        ) {
          return;
        }
        const workouts = this.loadAll();
        const starterPresets =
          typeof settingsStore !== "undefined" &&
          settingsStore &&
          typeof settingsStore.loadPresets === "function"
            ? settingsStore.loadPresets()
            : {};
        const starterWorkouts = createStarterWorkouts(starterPresets);
        Object.keys(starterWorkouts).forEach((name) => {
          if (!Object.prototype.hasOwnProperty.call(workouts, name)) {
            workouts[name] = starterWorkouts[name];
          }
        });
        this.saveAll(workouts);
        activeStorage.setItem(this.seedVersionKey, STARTER_CONTENT_VERSION);
      } catch (_) {}
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
  store.seedStarterWorkouts();
  return store;
}

function captureCheckboxState(collection) {
  const state = {};
  if (!collection) return state;
  Object.keys(collection).forEach((key) => {
    const el = collection[key];
    if (el && "checked" in el) {
      state[key] = !!el.checked;
    }
  });
  return state;
}

function applyCheckboxState(collection, state) {
  if (!collection || !state) return;
  Object.keys(state).forEach((key) => {
    const el = collection[key];
    if (el && "checked" in el) {
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

function applyThemeSelection(theme) {
  const selectedTheme = sanitizeTheme(theme);
  setRadioValue("theme", selectedTheme);
  if (hasDocument && document.documentElement) {
    document.documentElement.dataset.theme = selectedTheme;
  }
  const refreshDisplay =
    appGlobals.refreshDisplayForThemeChange ||
    (appGlobals.root && appGlobals.root.refreshDisplayForThemeChange);
  if (typeof refreshDisplay === "function") {
    refreshDisplay(selectedTheme);
  }
  return selectedTheme;
}

appGlobals.applyThemeSelection = applyThemeSelection;
if (appGlobals.root) {
  appGlobals.root.applyThemeSelection = applyThemeSelection;
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
  let parsed = 0;
  try {
    parsed = parseInt(raw, 10);
  } catch (_) {
    return 0;
  }
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 999) return 999;
  return parsed;
}

function sanitizePositiveIntegerValue(raw, fallback, min = 1, max = 999) {
  let parsed = 0;
  try {
    parsed = parseInt(raw, 10);
  } catch (_) {
    return fallback;
  }
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  if (parsed > max) return max;
  return parsed;
}

function sanitizeRandomProgressionCount(raw) {
  let parsed = 0;
  try {
    parsed = parseInt(raw, 10);
  } catch (_) {
    return 5;
  }
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(10, Math.max(1, parsed));
}

function sanitizeNonNegativeNumberValue(raw, fallback) {
  let parsed = 0;
  try {
    parsed = parseFloat(raw);
  } catch (_) {
    return fallback;
  }
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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

function notifySongsSettingsChange() {
  const candidates = [
    globalRoot && typeof globalRoot.syncSongKeyControls === "function"
      ? globalRoot.syncSongKeyControls
      : null,
    appGlobals && typeof appGlobals.syncSongKeyControls === "function"
      ? appGlobals.syncSongKeyControls
      : null,
    globalRoot && typeof globalRoot.refreshSongPracticeDisplay === "function"
      ? globalRoot.refreshSongPracticeDisplay
      : null,
    appGlobals && typeof appGlobals.refreshSongPracticeDisplay === "function"
      ? appGlobals.refreshSongPracticeDisplay
      : null,
  ];
  const handlers = [
    ...new Set(candidates.filter((fn) => typeof fn === "function")),
  ];
  handlers.forEach((handler) => {
    try {
      handler();
    } catch (_) {}
  });
}

function notifyMetronomeSettingsChange() {
  const candidates = [
    globalRoot && typeof globalRoot.syncMetronomeSettings === "function"
      ? globalRoot.syncMetronomeSettings
      : null,
    appGlobals && typeof appGlobals.syncMetronomeSettings === "function"
      ? appGlobals.syncMetronomeSettings
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
      theme: sanitizeTheme(getRadioValue("theme", DEFAULT_THEME)),
      showKeyboard: domElements.keyboardDetails
        ? !!domElements.keyboardDetails.open
        : true,
      showMetronome: domElements.metronomeDetails
        ? !!domElements.metronomeDetails.open
        : false,
      showDailyStats: domElements.dailyStatsDetails
        ? !!domElements.dailyStatsDetails.open
        : false,
      showTrainingSetup: domElements.trainingSetupDetails
        ? !!domElements.trainingSetupDetails.open
        : false,
      highlightKeys: !!domElements.highlightCorrectKeys.checked,
      highlightDelay: sanitizeNonNegativeNumberValue(
        domElements.highlightDelay.value,
        3,
      ),
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
      randomCount: sanitizeRandomProgressionCount(
        domElements.randomProgressionCount.value,
      ),
    },
    metronome: sanitizeMetronomeSettings({
      tempo: domElements.metronomeTempoInput.value,
      beatsPerMeasure: domElements.metronomeBeatsInput.value,
      xMeasures: domElements.metronomeXMeasuresInput.value,
      yMeasures: domElements.metronomeYMeasuresInput.value,
      countInMeasures: domElements.metronomeCountInMeasuresInput.value,
      syncToSongs: !!domElements.metronomeSyncSongs.checked,
    }),
    songs: sanitizeSongsPracticeSettings({
      useOriginalKey: !!domElements.songUseOriginalKey.checked,
      advanceKeyOnRepeat: !!domElements.songAdvanceKeyOnRepeat.checked,
      advanceKeyOnSongChange: !!domElements.songAdvanceKeyOnSongChange.checked,
      finishAction: domElements.songFinishAction.value,
      repeatCount: domElements.songRepeatCount.value,
      countChordsTowardGoals: !!domElements.songCountGoals.checked,
      displayRomanNumerals: !!domElements.songDisplayRomanNumerals.checked,
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

function buildBooleanState(keys, enabledKeys = []) {
  const enabled = new Set(enabledKeys);
  return keys.reduce((state, key) => {
    state[key] = enabled.has(key);
    return state;
  }, {});
}

function createStarterPreset(baseDefaults, overrides) {
  return sanitizeSettings(mergeSettings(baseDefaults, overrides), baseDefaults);
}

function createStarterPresets(defaults) {
  const normalKeyState = buildBooleanState(allNotes, normalNotes);
  const whiteKeyState = buildBooleanState(allNotes, [
    "C",
    "D",
    "E",
    "F",
    "G",
    "A",
    "B",
  ]);
  const basicChordTypes = buildBooleanState(chordTypeIds, [
    "chkChordMajor",
    "chkChordMinor",
  ]);
  const progressionChordTypes = buildBooleanState(chordTypeIds, [
    "chkChordMajor",
    "chkChordMinor",
    "chkChordSeventh",
    "chkChordMinorSeventh",
    "chkChordMajorSeventh",
  ]);
  const degreeToggles = buildBooleanState(Object.keys(romanNumerals), [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
  ]);
  const basicScales = buildBooleanState(Object.keys(scales), scaleGroups.basic);
  const jazzCadenceState = buildBooleanState(
    jazzCadences.map((cadence) => cadence.name),
    ["Regular", "Two-Goes", "POT"],
  );

  return {
    [STARTER_PRESET_NAMES.chords]: createStarterPreset(defaults, {
      mode: "tabChords",
      flow: { mode: "circleOfFourths", startKey: "C" },
      chordTypes: basicChordTypes,
      keyToggles: normalKeyState,
      voicing: { mode: "default" },
      statsGoals: { chords: { correct: 10, total: 15 } },
    }),
    [STARTER_PRESET_NAMES.progressions]: createStarterPreset(defaults, {
      mode: "tabProgressions",
      flow: { mode: "circleOfFifths", startKey: "C" },
      progression: { selection: "I-IV-V", randomCount: 4 },
      chordTypes: progressionChordTypes,
      keyToggles: whiteKeyState,
      statsGoals: { progressions: { correct: 5, total: 8 } },
    }),
    [STARTER_PRESET_NAMES.degrees]: createStarterPreset(defaults, {
      mode: "tabDegrees",
      flow: { mode: "ascendingWholeSteps", startKey: "C" },
      degreeToggles,
      keyToggles: normalKeyState,
      statsGoals: { degrees: { correct: 8, total: 12 } },
    }),
    [STARTER_PRESET_NAMES.scales]: createStarterPreset(defaults, {
      mode: "tabScales",
      flow: { mode: "circleOfFourths", startKey: "C" },
      scales: basicScales,
      keyToggles: whiteKeyState,
      statsGoals: { scales: { correct: 4, total: 6 } },
    }),
    [STARTER_PRESET_NAMES.jazz]: createStarterPreset(defaults, {
      mode: "tabJazz",
      flow: { mode: "circleOfFourths", startKey: "C" },
      chordTypes: progressionChordTypes,
      keyToggles: normalKeyState,
      jazzCadences: jazzCadenceState,
      statsGoals: { bricks: { correct: 4, total: 6 } },
    }),
  };
}

function createWorkoutEntryFromPreset(preset, goals, category, presets = {}) {
  const entry = { preset, goals, category };
  if (presets[preset]) {
    entry.settings = cloneObject(presets[preset]);
  }
  return entry;
}

function createStarterWorkouts(presets = {}) {
  return {
    "Beginner Warmup": {
      entries: [
        createWorkoutEntryFromPreset(
          STARTER_PRESET_NAMES.chords,
          { correct: 10, total: 15 },
          "chords",
          presets,
        ),
        createWorkoutEntryFromPreset(
          STARTER_PRESET_NAMES.progressions,
          { correct: 5, total: 8 },
          "progressions",
          presets,
        ),
        createWorkoutEntryFromPreset(
          STARTER_PRESET_NAMES.scales,
          { correct: 4, total: 6 },
          "scales",
          presets,
        ),
      ],
    },
    "Beginner Jazz Start": {
      entries: [
        createWorkoutEntryFromPreset(
          STARTER_PRESET_NAMES.jazz,
          { correct: 4, total: 6 },
          "bricks",
          presets,
        ),
        createWorkoutEntryFromPreset(
          STARTER_PRESET_NAMES.degrees,
          { correct: 8, total: 12 },
          "degrees",
          presets,
        ),
        createWorkoutEntryFromPreset(
          STARTER_PRESET_NAMES.progressions,
          { correct: 5, total: 8 },
          "progressions",
          presets,
        ),
      ],
    },
  };
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
    if (domElements.flowStartSelect.dataset) {
      domElements.flowStartSelect.dataset.pendingValue =
        settings.flow.startKey || "";
    }
  }
  if (settings.display) {
    const display = settings.display;
    applyThemeSelection(display.theme);
    if (domElements.keyboardDetails) {
      if (Object.prototype.hasOwnProperty.call(display, "showKeyboard")) {
        domElements.keyboardDetails.open = !!display.showKeyboard;
      }
    }
    if (domElements.metronomeDetails) {
      if (Object.prototype.hasOwnProperty.call(display, "showMetronome")) {
        domElements.metronomeDetails.open = !!display.showMetronome;
      }
    }
    if (domElements.dailyStatsDetails) {
      if (Object.prototype.hasOwnProperty.call(display, "showDailyStats")) {
        domElements.dailyStatsDetails.open = !!display.showDailyStats;
      }
    }
    if (domElements.trainingSetupDetails) {
      if (Object.prototype.hasOwnProperty.call(display, "showTrainingSetup")) {
        domElements.trainingSetupDetails.open = !!display.showTrainingSetup;
      }
    }
    domElements.highlightCorrectKeys.checked = !!display.highlightKeys;
    domElements.highlightDelay.value = String(
      sanitizeNonNegativeNumberValue(display.highlightDelay, 3),
    );
    domElements.hideProgressionChordNames.checked =
      !!display.hideProgressionNames;
    domElements.hideProgressionChordNumerals.checked =
      !!display.hideProgressionNumerals;
    domElements.randomizeSpellings.checked = !!display.randomizeSpellings;
  }
  if (settings.spacedRep) {
    domElements.enableSpacedRepetition.checked = !!settings.spacedRep.enabled;
    domElements.spacedRepThreshold.value = String(
      sanitizePositiveIntegerValue(settings.spacedRep.threshold, 3),
    );
  }
  if (settings.midi) {
    domElements.sendMidiNotes.checked = !!settings.midi.sendNotes;
  }
  if (settings.progression) {
    domElements.progressionSelect.value = normalizeTextValue(
      settings.progression.selection,
    );
    domElements.customProgressionInput.value = normalizeTextValue(
      settings.progression.custom,
    );
    domElements.randomProgressionCount.value = String(
      sanitizeRandomProgressionCount(settings.progression.randomCount),
    );
  }
  if (settings.metronome) {
    const metronome = sanitizeMetronomeSettings(settings.metronome);
    domElements.metronomeTempoInput.value = String(metronome.tempo);
    domElements.metronomeTempoNumberInput.value = String(metronome.tempo);
    domElements.metronomeBeatsInput.value = String(metronome.beatsPerMeasure);
    domElements.metronomeXMeasuresInput.value = String(metronome.xMeasures);
    domElements.metronomeYMeasuresInput.value = String(metronome.yMeasures);
    domElements.metronomeCountInMeasuresInput.value = String(
      metronome.countInMeasures,
    );
    domElements.metronomeSyncSongs.checked = !!metronome.syncToSongs;
    notifyMetronomeSettingsChange();
  }
  if (settings.songs) {
    const songSettings = sanitizeSongsPracticeSettings(settings.songs);
    domElements.songUseOriginalKey.checked = !!songSettings.useOriginalKey;
    domElements.songAdvanceKeyOnRepeat.checked =
      !!songSettings.advanceKeyOnRepeat;
    domElements.songAdvanceKeyOnSongChange.checked =
      !!songSettings.advanceKeyOnSongChange;
    domElements.songFinishAction.value = songSettings.finishAction;
    domElements.songRepeatCount.value = String(songSettings.repeatCount);
    domElements.songCountGoals.checked = !!songSettings.countChordsTowardGoals;
    domElements.songDisplayRomanNumerals.checked =
      !!songSettings.displayRomanNumerals;
    notifySongsSettingsChange();
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

const presetIndependentSettingKeys = ["display", "spacedRep", "midi"];

function mergePresetWithCurrentPreferences(presetSettings, currentSettings) {
  const next = cloneObject(presetSettings || {});
  const current = currentSettings || {};
  presetIndependentSettingKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      next[key] = cloneObject(current[key]);
    }
  });
  return next;
}

function sanitizeSettingsPresetMap(collection, defaults) {
  if (
    !collection ||
    typeof collection !== "object" ||
    Array.isArray(collection)
  ) {
    return {};
  }
  const sanitized = {};
  Object.keys(collection).forEach((name) => {
    const cleanName = sanitizeNamedCollectionName(name);
    const preset = collection[name];
    if (!cleanName || !preset || typeof preset !== "object") return;
    sanitized[cleanName] = sanitizeSettings(preset, defaults);
  });
  return sanitized;
}

function extractSettingsPresetPayload(payload) {
  const parsed = parseJsonObjectPayload(payload);
  if (!parsed) return {};
  if (parsed.presets && typeof parsed.presets === "object") {
    return parsed.presets;
  }
  if (typeof parsed.mode === "string") {
    return { "Imported Preset": parsed };
  }
  return parsed;
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
    presetSeedVersionKey: SETTINGS_PRESET_SEED_VERSION_KEY,
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
        return sanitizeSettingsPresetMap(parsed, this.defaults);
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
      const sanitized = sanitizeSettingsPresetMap(presets, this.defaults);
      try {
        activeStorage.setItem(this.presetsKey, JSON.stringify(sanitized));
      } catch (_) {}
    },
    initialize() {
      const loaded = this.load();
      this.current = sanitizeSettings(loaded, this.defaults);
      this.initialized = true;
      this.seedStarterPresets();
    },
    applyToDom(settings) {
      const source = settings
        ? sanitizeSettings(settings, this.defaults)
        : this.current;
      const flowStartHasOptions =
        domElements.flowStartSelect.options &&
        domElements.flowStartSelect.options.length > 0;
      const pendingFlowStart = flowStartHasOptions
        ? ""
        : normalizeTextValue(source.flow && source.flow.startKey);
      this.current = cloneObject(source);
      applyScaleState(source.scales);
      applyJazzCadenceState(source.jazzCadences);
      applySettingsToDom(source);
      const applied = captureSettingsFromDom();
      if (pendingFlowStart) applied.flow.startKey = pendingFlowStart;
      this.current = sanitizeSettings(applied, this.defaults);
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
      const cleanName = sanitizeNamedCollectionName(name);
      if (!cleanName) return;
      presets[cleanName] = cloneObject(this.current);
      this.savePresets(presets);
    },
    applyPresetSettings(settings, { preservePreferences = true } = {}) {
      if (!settings || typeof settings !== "object") return false;
      const source = preservePreferences
        ? mergePresetWithCurrentPreferences(settings, captureSettingsFromDom())
        : settings;
      this.applyToDom(source);
      this.save();
      return true;
    },
    loadPreset(name, { preservePreferences = true } = {}) {
      if (!name) return false;
      const presets = this.loadPresets();
      if (!presets[name]) return false;
      return this.applyPresetSettings(presets[name], {
        preservePreferences,
      });
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
      return Object.keys(presets).sort((a, b) =>
        a.localeCompare(b, "en", { sensitivity: "base" }),
      );
    },
    exportPresets(pretty = true) {
      try {
        return JSON.stringify(
          { presets: this.loadPresets() },
          null,
          pretty ? 2 : 0,
        );
      } catch (_) {
        return '{"presets":{}}';
      }
    },
    importPresets(payload, { merge = true } = {}) {
      const imported = sanitizeSettingsPresetMap(
        extractSettingsPresetPayload(payload),
        this.defaults,
      );
      const names = Object.keys(imported);
      if (!names.length) return 0;
      const next = merge ? this.loadPresets() : {};
      names.forEach((name) => {
        next[name] = imported[name];
      });
      this.savePresets(next);
      return names.length;
    },
    seedStarterPresets() {
      const activeStorage = this.resolveStorage();
      if (!activeStorage) return;
      try {
        if (
          activeStorage.getItem(this.presetSeedVersionKey) ===
          STARTER_CONTENT_VERSION
        ) {
          return;
        }
        const presets = this.loadPresets();
        const starterPresets = createStarterPresets(this.defaults);
        Object.keys(starterPresets).forEach((name) => {
          if (!Object.prototype.hasOwnProperty.call(presets, name)) {
            presets[name] = starterPresets[name];
          }
        });
        this.savePresets(presets);
        activeStorage.setItem(
          this.presetSeedVersionKey,
          STARTER_CONTENT_VERSION,
        );
      } catch (_) {}
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
      this.watchElement(domElements.metronomeDetails, "toggle");
      this.watchElement(domElements.dailyStatsDetails, "toggle");
      this.watchElement(domElements.trainingSetupDetails, "toggle");
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
      this.watchElement(domElements.metronomeTempoInput, "input");
      this.watchElement(domElements.metronomeTempoNumberInput);
      this.watchElement(domElements.metronomeBeatsInput);
      this.watchElement(domElements.metronomeXMeasuresInput);
      this.watchElement(domElements.metronomeYMeasuresInput);
      this.watchElement(domElements.metronomeCountInMeasuresInput);
      this.watchElement(domElements.metronomeSyncSongs);
      this.watchElement(domElements.songFinishAction);
      this.watchElement(domElements.songRepeatCount, "input");
      this.watchElement(domElements.songUseOriginalKey);
      this.watchElement(domElements.songAdvanceKeyOnRepeat);
      this.watchElement(domElements.songAdvanceKeyOnSongChange);
      this.watchElement(domElements.songCountGoals);
      this.watchElement(domElements.songDisplayRomanNumerals);
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

      Object.values(domElements.themeRadios || {}).forEach((radio) => {
        if (!radio || !radio.addEventListener) return;
        if (this.attachedElements.has(radio)) return;
        radio.addEventListener("change", () => {
          if (radio.checked) {
            applyThemeSelection(radio.value);
            if (domElements.themePicker) {
              domElements.themePicker.open = false;
            }
          }
          this.syncFromDom();
        });
        this.attachedElements.add(radio);
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
appGlobals.sanitizeMetronomeSettings = sanitizeMetronomeSettings;
appGlobals.buildSongPracticeTimeline = buildSongPracticeTimeline;
appGlobals.getMetronomeTickType = getMetronomeTickType;
appGlobals.getSongSyncMetronomeTickType = getSongSyncMetronomeTickType;
appGlobals.getMetronomeCompletedMeasures = getMetronomeCompletedMeasures;
appGlobals.getMetronomeDisplayedMeasure = getMetronomeDisplayedMeasure;
appGlobals.getMetronomeCycleDisplay = getMetronomeCycleDisplay;
appGlobals.sanitizeSongsPracticeSettings = sanitizeSongsPracticeSettings;
appGlobals.formatKeyDisplay = formatKeyDisplay;
appGlobals.pickSongIdForSongNavigation = pickSongIdForSongNavigation;
appGlobals.pickSongIdForFavoriteNavigation = pickSongIdForFavoriteNavigation;
appGlobals.pickSongIdForFinishAction = pickSongIdForFinishAction;
if (appGlobals.root) {
  appGlobals.root.sanitizeMetronomeSettings = sanitizeMetronomeSettings;
  appGlobals.root.buildSongPracticeTimeline = buildSongPracticeTimeline;
  appGlobals.root.getMetronomeTickType = getMetronomeTickType;
  appGlobals.root.getSongSyncMetronomeTickType = getSongSyncMetronomeTickType;
  appGlobals.root.getMetronomeCompletedMeasures = getMetronomeCompletedMeasures;
  appGlobals.root.getMetronomeDisplayedMeasure = getMetronomeDisplayedMeasure;
  appGlobals.root.getMetronomeCycleDisplay = getMetronomeCycleDisplay;
  appGlobals.root.sanitizeSongsPracticeSettings = sanitizeSongsPracticeSettings;
  appGlobals.root.formatKeyDisplay = formatKeyDisplay;
  appGlobals.root.pickSongIdForSongNavigation = pickSongIdForSongNavigation;
  appGlobals.root.pickSongIdForFavoriteNavigation =
    pickSongIdForFavoriteNavigation;
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
  generateNotesFromChordName,
  parseIRealProChart,
  parseIRealProSong,
  parseIRealProPlaylist,
  parseIRealProSource,
  buildPlayableSongEntries,
  buildSongPracticeTimeline,
  buildSongDisplayRows,
  formatIRealProChordDisplay,
  formatKeyDisplay,
  transposeNoteName,
  sanitizeMetronomeSettings,
  getMetronomeTickType,
  getSongSyncMetronomeTickType,
  getMetronomeCompletedMeasures,
  getMetronomeDisplayedMeasure,
  getMetronomeCycleDisplay,
  sanitizeSongsPracticeSettings,
  pickSongIdForSongNavigation,
  pickSongIdForFavoriteNavigation,
  pickSongIdForFinishAction,
  settingsStore,
  workoutStore,
  songsStore,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = dataExports;
}
