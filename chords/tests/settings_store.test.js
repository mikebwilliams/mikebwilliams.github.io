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

test("settings store saves and loads presets round-trip", () => {
  settingsStore.resetToDefaults({ apply: false, save: false });
  storageMock.clear();

  dom.flowSelect.value = "ascendingHalfSteps";
  dom.flowStartSelect.value = "F#";
  dom.keyboardDetails.open = false;
  dom.metronomeDetails.open = true;
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
  Object.values(dom.modeRadios).forEach((radio) => {
    radio.checked = radio.value === "tabScales";
  });

  const loaded = settingsStore.loadPreset("Spec");
  assert.strictEqual(loaded, true, "preset should load successfully");
  assert.strictEqual(dom.flowSelect.value, "ascendingHalfSteps");
  assert.strictEqual(dom.flowStartSelect.value, "F#");
  assert.strictEqual(dom.keyboardDetails.open, false);
  assert.strictEqual(dom.metronomeDetails.open, true);
  assert.strictEqual(
    dom.themeRadios.darkClassical.checked,
    true,
    "theme should restore from preset",
  );
  assert.strictEqual(dom.metronomeTempoInput.value, "144");
  assert.strictEqual(dom.metronomeTempoNumberInput.value, "144");
  assert.strictEqual(dom.metronomeBeatsInput.value, "7");
  assert.strictEqual(dom.metronomeXMeasuresInput.value, "3");
  assert.strictEqual(dom.metronomeYMeasuresInput.value, "5");
  assert.strictEqual(dom.metronomeCountInMeasuresInput.value, "2");
  assert.strictEqual(dom.metronomeSyncSongs.checked, true);
  assert.strictEqual(dom.highlightCorrectKeys.checked, true);
  assert.strictEqual(dom.highlightDelay.value, "5");
  assert.strictEqual(dom.randomizeSpellings.checked, false);
  assert.strictEqual(dom.enableSpacedRepetition.checked, false);
  assert.strictEqual(dom.spacedRepThreshold.value, "4");
  assert.strictEqual(dom.sendMidiNotes.checked, true);
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

run();
