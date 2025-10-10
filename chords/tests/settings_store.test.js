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

test("settings store saves and loads presets round-trip", () => {
  settingsStore.resetToDefaults({ apply: false, save: false });
  storageMock.clear();

  dom.flowSelect.value = "ascendingHalfSteps";
  dom.flowStartSelect.value = "F#";
  dom.showKeyboardToggle.checked = false;
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
  toggleAlternatingCheckboxes(dom.chordCheckboxes);
  toggleAlternatingCheckboxes(dom.keyCheckboxes);
  toggleAlternatingCheckboxes(dom.degreeCheckboxes);

  settingsStore.syncFromDom();
  settingsStore.savePreset("Spec");

  dom.flowSelect.value = "descendingWholeSteps";
  dom.flowStartSelect.value = "C";
  dom.showKeyboardToggle.checked = true;
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

  const loaded = settingsStore.loadPreset("Spec");
  assert.strictEqual(loaded, true, "preset should load successfully");
  assert.strictEqual(dom.flowSelect.value, "ascendingHalfSteps");
  assert.strictEqual(dom.flowStartSelect.value, "F#");
  assert.strictEqual(dom.showKeyboardToggle.checked, false);
  assert.strictEqual(dom.highlightCorrectKeys.checked, true);
  assert.strictEqual(dom.highlightDelay.value, "5");
  assert.strictEqual(dom.randomizeSpellings.checked, false);
  assert.strictEqual(dom.enableSpacedRepetition.checked, false);
  assert.strictEqual(dom.spacedRepThreshold.value, "4");
  assert.strictEqual(dom.sendMidiNotes.checked, true);
  assert.strictEqual(dom.progressionSelect.value, "custom");
  assert.strictEqual(dom.customProgressionInput.value, "I-IV-V-I");
  assert.strictEqual(dom.randomProgressionCount.value, "8");
});

test("settings store JSON export reflects current snapshot", () => {
  settingsStore.resetToDefaults({ apply: false, save: false });
  dom.flowSelect.value = "random";
  dom.showKeyboardToggle.checked = true;
  settingsStore.syncFromDom();
  const snapshot = settingsStore.getCurrentSnapshot();
  const json = settingsStore.getCurrentJSON(true);
  const parsed = JSON.parse(json);
  assert.deepStrictEqual(parsed, snapshot, "JSON output should match snapshot");
});

run();
