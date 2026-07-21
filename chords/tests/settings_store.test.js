const assert = require("assert");

const storageMock = (() => {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key)
        ? store[key]
        : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
})();

global.localStorage = storageMock;

const data = require("../data.js");

const settingsStore = global.appGlobals.settingsStore;
const dom = global.appGlobals.domElements;

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  tests.forEach(({ name, fn }) => {
    fn();
    console.log(`✓ ${name}`);
  });
  console.log(`${tests.length} tests passed.`);
}

function toggleAlternatingCheckboxes(collection) {
  const keys = Object.keys(collection);
  keys.forEach((key, index) => {
    collection[key].checked = index % 2 === 0;
  });
}

function setRadioGroupValue(collection, value) {
  Object.values(collection).forEach((radio) => {
    radio.checked = radio.value === value;
  });
}

function hostileObject() {
  return {
    toString: "not callable",
    valueOf: "not callable",
  };
}

test("settings store saves and loads presets round-trip", () => {
  settingsStore.resetToDefaults({ apply: false, save: false });
  storageMock.clear();

  dom.flowSelect.value = "ascendingHalfSteps";
  dom.flowStartSelect.value = "F#";
  dom.keyboardDetails.open = false;
  dom.metronomeDetails.open = true;
  dom.dailyStatsDetails.open = true;
  dom.trainingSetupDetails.open = true;
  setRadioGroupValue(dom.themeRadios, "darkClassical");
  dom.metronomeTempoInput.value = "144";
  dom.metronomeTempoNumberInput.value = "144";
  dom.metronomeBeatsInput.value = "7";
  dom.metronomeXMeasuresInput.value = "3";
  dom.metronomeYMeasuresInput.value = "5";
  dom.metronomeCountInMeasuresInput.value = "2";
  dom.metronomeSyncSongs.checked = true;
  dom.highlightCorrectKeys.checked = true;
  dom.highlightDelay.value = "5";
  dom.hideProgressionChordNames.checked = true;
  dom.hideProgressionChordNumerals.checked = false;
  dom.randomizeSpellings.checked = false;
  dom.enableSpacedRepetition.checked = false;
  dom.spacedRepThreshold.value = "4";
  dom.sendMidiNotes.checked = true;
  dom.progressionSelect.value = "custom";
  dom.customProgressionInput.value = "I-IV-V-I";
  dom.randomProgressionCount.value = "8";
  dom.songUseOriginalKey.checked = false;
  dom.songAdvanceKeyOnRepeat.checked = true;
  dom.songAdvanceKeyOnSongChange.checked = true;
  dom.songFinishAction.value = "randomSong";
  dom.songRepeatCount.value = "6";
  dom.songCountGoals.checked = false;
  dom.songDisplayRomanNumerals.checked = true;
  dom.statGoals.chords.correct.value = "7";
  dom.statGoals.chords.total.value = "0";
  dom.statGoals.progressions.correct.value = "5";
  dom.statGoals.progressions.total.value = "0";
  dom.statGoals.songs.correct.value = "4";
  dom.statGoals.songs.total.value = "6";
  toggleAlternatingCheckboxes(dom.chordCheckboxes);
  toggleAlternatingCheckboxes(dom.keyCheckboxes);
  toggleAlternatingCheckboxes(dom.degreeCheckboxes);
  Object.values(dom.modeRadios).forEach((radio) => {
    radio.checked = radio.value === "tabJazz";
  });

  settingsStore.syncFromDom();
  assert.strictEqual(
    settingsStore.getCurrentSnapshot().mode,
    "tabJazz",
    "snapshot should capture current mode",
  );
  assert.strictEqual(
    settingsStore.getCurrentSnapshot().display.theme,
    "darkClassical",
    "snapshot should capture current theme",
  );
  settingsStore.savePreset("Spec");

  dom.flowSelect.value = "descendingWholeSteps";
  dom.flowStartSelect.value = "C";
  dom.keyboardDetails.open = true;
  dom.metronomeDetails.open = false;
  dom.dailyStatsDetails.open = false;
  dom.trainingSetupDetails.open = false;
  setRadioGroupValue(dom.themeRadios, "lightBook");
  dom.metronomeTempoInput.value = "90";
  dom.metronomeTempoNumberInput.value = "90";
  dom.metronomeBeatsInput.value = "4";
  dom.metronomeXMeasuresInput.value = "4";
  dom.metronomeYMeasuresInput.value = "8";
  dom.metronomeCountInMeasuresInput.value = "1";
  dom.metronomeSyncSongs.checked = false;
  dom.highlightCorrectKeys.checked = false;
  dom.highlightDelay.value = "3";
  dom.hideProgressionChordNames.checked = false;
  dom.hideProgressionChordNumerals.checked = true;
  dom.randomizeSpellings.checked = true;
  dom.enableSpacedRepetition.checked = true;
  dom.spacedRepThreshold.value = "2";
  dom.sendMidiNotes.checked = false;
  dom.progressionSelect.value = "random";
  dom.customProgressionInput.value = "ii-V-I";
  dom.randomProgressionCount.value = "2";
  dom.songUseOriginalKey.checked = true;
  dom.songAdvanceKeyOnRepeat.checked = false;
  dom.songAdvanceKeyOnSongChange.checked = false;
  dom.songFinishAction.value = "nothing";
  dom.songRepeatCount.value = "2";
  dom.songCountGoals.checked = true;
  dom.songDisplayRomanNumerals.checked = false;
  dom.statGoals.chords.correct.value = "1";
  dom.statGoals.chords.total.value = "0";
  dom.statGoals.progressions.correct.value = "0";
  dom.statGoals.progressions.total.value = "0";
  dom.statGoals.songs.correct.value = "0";
  dom.statGoals.songs.total.value = "0";
  Object.values(dom.modeRadios).forEach((radio) => {
    radio.checked = radio.value === "tabScales";
  });

  const loaded = settingsStore.loadPreset("Spec");
  assert.strictEqual(loaded, true, "preset should load successfully");
  assert.strictEqual(dom.flowSelect.value, "ascendingHalfSteps");
  assert.strictEqual(dom.flowStartSelect.value, "F#");
  assert.strictEqual(dom.keyboardDetails.open, true);
  assert.strictEqual(dom.metronomeDetails.open, false);
  assert.strictEqual(dom.dailyStatsDetails.open, false);
  assert.strictEqual(dom.trainingSetupDetails.open, false);
  assert.strictEqual(
    dom.themeRadios.lightBook.checked,
    true,
    "theme should stay independent from preset application",
  );
  assert.strictEqual(dom.metronomeTempoInput.value, "144");
  assert.strictEqual(dom.metronomeTempoNumberInput.value, "144");
  assert.strictEqual(dom.metronomeBeatsInput.value, "7");
  assert.strictEqual(dom.metronomeXMeasuresInput.value, "3");
  assert.strictEqual(dom.metronomeYMeasuresInput.value, "5");
  assert.strictEqual(dom.metronomeCountInMeasuresInput.value, "2");
  assert.strictEqual(dom.metronomeSyncSongs.checked, true);
  assert.strictEqual(dom.highlightCorrectKeys.checked, false);
  assert.strictEqual(dom.highlightDelay.value, "3");
  assert.strictEqual(dom.hideProgressionChordNames.checked, false);
  assert.strictEqual(dom.hideProgressionChordNumerals.checked, true);
  assert.strictEqual(dom.randomizeSpellings.checked, true);
  assert.strictEqual(dom.enableSpacedRepetition.checked, true);
  assert.strictEqual(dom.spacedRepThreshold.value, "2");
  assert.strictEqual(dom.sendMidiNotes.checked, false);
  assert.strictEqual(dom.progressionSelect.value, "custom");
  assert.strictEqual(dom.customProgressionInput.value, "I-IV-V-I");
  assert.strictEqual(dom.randomProgressionCount.value, "8");
  assert.strictEqual(dom.songUseOriginalKey.checked, false);
  assert.strictEqual(dom.songAdvanceKeyOnRepeat.checked, true);
  assert.strictEqual(dom.songAdvanceKeyOnSongChange.checked, true);
  assert.strictEqual(dom.songFinishAction.value, "randomSong");
  assert.strictEqual(dom.songRepeatCount.value, "6");
  assert.strictEqual(dom.songCountGoals.checked, false);
  assert.strictEqual(dom.songDisplayRomanNumerals.checked, true);
  assert.strictEqual(dom.statGoals.chords.correct.value, "7");
  assert.strictEqual(dom.statGoals.chords.total.value, "0");
  assert.strictEqual(dom.statGoals.progressions.correct.value, "5");
  assert.strictEqual(dom.statGoals.progressions.total.value, "0");
  assert.strictEqual(dom.statGoals.songs.correct.value, "4");
  assert.strictEqual(dom.statGoals.songs.total.value, "6");
  assert.strictEqual(
    dom.modeRadios.tabJazz.checked,
    true,
    "mode should restore from preset",
  );
});

test("settings store JSON export reflects current snapshot", () => {
  settingsStore.resetToDefaults({ apply: false, save: false });
  dom.flowSelect.value = "random";
  dom.keyboardDetails.open = true;
  settingsStore.syncFromDom();
  const snapshot = settingsStore.getCurrentSnapshot();
  const json = settingsStore.getCurrentJSON(true);
  const parsed = JSON.parse(json);
  assert.deepStrictEqual(parsed, snapshot, "JSON output should match snapshot");
});

test("settings store imports and exports preset JSON", () => {
  storageMock.clear();
  settingsStore.resetToDefaults({ apply: false, save: false });
  dom.flowSelect.value = "circleOfFourths";
  settingsStore.syncFromDom();
  settingsStore.savePreset("Stored Preset");

  const exported = JSON.parse(settingsStore.exportPresets(true));
  assert(
    exported.presets["Stored Preset"],
    "export should include saved preset",
  );

  const parsedImport = settingsStore.parsePresetImport({
    presets: {
      "  Trimmed Preset  ": {
        ...settingsStore.getCurrentSnapshot(),
        flow: { mode: "ascendingHalfSteps", startKey: "D" },
      },
    },
  });
  assert.deepStrictEqual(Object.keys(parsedImport), ["Trimmed Preset"]);
  assert.strictEqual(
    parsedImport["Trimmed Preset"].flow.mode,
    "ascendingHalfSteps",
  );

  const importedCount = settingsStore.importPresets({
    presets: {
      "Imported Preset": {
        ...settingsStore.getCurrentSnapshot(),
        flow: { mode: "descendingWholeSteps", startKey: "F" },
      },
    },
  });

  assert.strictEqual(importedCount, 1, "one preset should import");
  assert(
    settingsStore.listPresets().includes("Imported Preset"),
    "imported preset should be listed",
  );
  assert.strictEqual(settingsStore.loadPreset("Imported Preset"), true);
  assert.strictEqual(dom.flowSelect.value, "descendingWholeSteps");
});

test("settings store tracks active and modified preset state", () => {
  storageMock.clear();
  settingsStore.resetToDefaults({ apply: true, save: true });

  dom.flowSelect.value = "ascendingWholeSteps";
  settingsStore.syncFromDom();
  assert.strictEqual(settingsStore.savePreset("Active Spec"), true);
  assert.strictEqual(settingsStore.loadPreset("Active Spec"), true);
  assert.deepStrictEqual(settingsStore.getActivePresetState(), {
    name: "Active Spec",
    modified: false,
  });
  assert.strictEqual(
    storageMock.getItem(settingsStore.activePresetKey),
    "Active Spec",
  );

  dom.highlightCorrectKeys.checked = !dom.highlightCorrectKeys.checked;
  settingsStore.syncFromDom();
  assert.strictEqual(
    settingsStore.getActivePresetState().modified,
    false,
    "display preferences should not mark a preset as modified",
  );

  dom.flowSelect.value = "random";
  settingsStore.syncFromDom();
  assert.deepStrictEqual(settingsStore.getActivePresetState(), {
    name: "Active Spec",
    modified: true,
  });

  settingsStore.activePresetName = "";
  settingsStore.initialize();
  assert.deepStrictEqual(
    settingsStore.getActivePresetState(),
    { name: "Active Spec", modified: true },
    "active preset identity should survive initialization",
  );

  assert.strictEqual(settingsStore.loadPreset("Active Spec"), true);
  assert.strictEqual(settingsStore.getActivePresetState().modified, false);
  assert.strictEqual(settingsStore.deletePreset("Active Spec"), true);
  assert.deepStrictEqual(settingsStore.getActivePresetState(), {
    name: "",
    modified: true,
  });
  assert.strictEqual(storageMock.getItem(settingsStore.activePresetKey), null);
});

test("active random-flow presets ignore the runtime resume key", () => {
  storageMock.clear();
  settingsStore.resetToDefaults({ apply: true, save: true });

  dom.flowSelect.value = "random";
  dom.flowStartSelect.value = "C";
  settingsStore.syncFromDom();
  assert.strictEqual(settingsStore.savePreset("Random Spec"), true);
  assert.strictEqual(settingsStore.loadPreset("Random Spec"), true);

  dom.flowStartSelect.value = "F#";
  settingsStore.syncFromDom();
  assert.deepStrictEqual(settingsStore.getActivePresetState(), {
    name: "Random Spec",
    modified: false,
  });
});

test("activating an imported preset stores its canonical settings", () => {
  storageMock.clear();
  settingsStore.resetToDefaults({ apply: true, save: true });
  const imported = settingsStore.getCurrentSnapshot();
  imported.mode = "not-a-mode";
  imported.progression.randomCount = 999;
  imported.metronome.tempo = 999;

  assert.strictEqual(
    settingsStore.importPresets({ presets: { "Imported Spec": imported } }),
    1,
  );
  assert.strictEqual(settingsStore.loadPreset("Imported Spec"), true);
  assert.strictEqual(dom.modeRadios.tabChords.checked, true);
  assert.strictEqual(dom.randomProgressionCount.value, "10");
  assert.strictEqual(dom.metronomeTempoInput.value, "240");
  assert.deepStrictEqual(settingsStore.getActivePresetState(), {
    name: "Imported Spec",
    modified: false,
  });

  const canonical = settingsStore.loadPresets()["Imported Spec"];
  assert.strictEqual(canonical.mode, "tabChords");
  assert.strictEqual(canonical.progression.randomCount, 10);
  assert.strictEqual(canonical.metronome.tempo, 240);
});

test("preset mutations report storage failures", () => {
  const originalStorage = settingsStore.storage;
  const existingPreset = settingsStore.getCurrentSnapshot();
  settingsStore.storage = {
    getItem(key) {
      if (key === settingsStore.presetsKey) {
        return JSON.stringify({ Existing: existingPreset });
      }
      return null;
    },
    setItem() {
      throw new Error("storage unavailable");
    },
    removeItem() {},
  };

  try {
    assert.strictEqual(settingsStore.savePreset("New Preset"), false);
    assert.strictEqual(settingsStore.deletePreset("Existing"), false);
  } finally {
    settingsStore.storage = originalStorage;
  }
});

test("settings store applies hostile numeric preset fields safely", () => {
  storageMock.clear();
  settingsStore.resetToDefaults({ apply: true, save: false });
  const hostile = hostileObject();

  assert.strictEqual(
    settingsStore.applyPresetSettings(
      {
        mode: "tabProgressions",
        display: {
          highlightDelay: hostile,
        },
        spacedRep: {
          threshold: hostile,
        },
        progression: {
          selection: hostile,
          custom: hostile,
          randomCount: hostile,
        },
        metronome: {
          tempo: hostile,
          beatsPerMeasure: hostile,
          xMeasures: hostile,
          yMeasures: hostile,
          countInMeasures: hostile,
          syncToSongs: hostile,
        },
        songs: {
          finishAction: hostile,
          repeatCount: hostile,
          countChordsTowardGoals: false,
          displayRomanNumerals: true,
        },
        statsGoals: {
          chords: {
            correct: hostile,
            total: hostile,
          },
          progressions: {
            correct: "1000",
            total: "5",
          },
        },
      },
      { preservePreferences: false },
    ),
    true,
  );

  assert.strictEqual(dom.highlightDelay.value, "3");
  assert.strictEqual(dom.spacedRepThreshold.value, "3");
  assert.strictEqual(dom.progressionSelect.value, "");
  assert.strictEqual(dom.customProgressionInput.value, "");
  assert.strictEqual(dom.randomProgressionCount.value, "5");
  assert.strictEqual(dom.metronomeTempoInput.value, "120");
  assert.strictEqual(dom.metronomeTempoNumberInput.value, "120");
  assert.strictEqual(dom.metronomeBeatsInput.value, "4");
  assert.strictEqual(dom.metronomeXMeasuresInput.value, "4");
  assert.strictEqual(dom.metronomeYMeasuresInput.value, "8");
  assert.strictEqual(dom.metronomeCountInMeasuresInput.value, "1");
  assert.strictEqual(dom.songFinishAction.value, "nothing");
  assert.strictEqual(dom.songRepeatCount.value, "3");
  assert.strictEqual(dom.statGoals.chords.correct.value, "0");
  assert.strictEqual(dom.statGoals.chords.total.value, "0");
  assert.strictEqual(dom.statGoals.progressions.correct.value, "999");
  assert.strictEqual(dom.statGoals.progressions.total.value, "5");
});

test("settings store persists the canonical values applied to the DOM", () => {
  storageMock.clear();
  settingsStore.resetToDefaults({ apply: true, save: false });

  assert.strictEqual(
    settingsStore.applyPresetSettings(
      {
        mode: "not-a-mode",
        flow: { mode: "not-a-flow", startKey: "H" },
        display: { highlightDelay: 0 },
        progression: { randomCount: 999 },
        metronome: { tempo: 999 },
        voicing: { mode: "not-a-voicing" },
      },
      { preservePreferences: false },
    ),
    true,
  );

  assert.strictEqual(dom.highlightDelay.value, "0");
  assert.strictEqual(dom.modeRadios.tabChords.checked, true);
  assert.strictEqual(dom.flowSelect.value, "random");
  assert.strictEqual(dom.flowStartSelect.value, "C");
  assert.strictEqual(dom.radioGroups.voicingMode.default.checked, true);
  assert.strictEqual(dom.randomProgressionCount.value, "10");
  assert.strictEqual(dom.metronomeTempoInput.value, "240");

  const snapshot = settingsStore.getCurrentSnapshot();
  assert.strictEqual(snapshot.mode, "tabChords");
  assert.deepStrictEqual(snapshot.flow, { mode: "random", startKey: "C" });
  assert.strictEqual(snapshot.display.highlightDelay, 0);
  assert.strictEqual(snapshot.progression.randomCount, 10);
  assert.strictEqual(snapshot.metronome.tempo, 240);
  assert.strictEqual(snapshot.voicing.mode, "default");

  const persisted = JSON.parse(storageMock.getItem(settingsStore.storageKey));
  assert.strictEqual(persisted.mode, "tabChords");
  assert.deepStrictEqual(persisted.flow, { mode: "random", startKey: "C" });
  assert.strictEqual(persisted.display.highlightDelay, 0);
  assert.strictEqual(persisted.progression.randomCount, 10);
  assert.strictEqual(persisted.metronome.tempo, 240);
  assert.strictEqual(persisted.voicing.mode, "default");
});

run();
