const uiRoot =
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : {};
const uiGlobals = uiRoot.appGlobals || {};
var dom = uiGlobals.domElements || uiRoot.domElements || uiRoot.dom || {};
const uiSettingsStore =
  uiGlobals.settingsStore ||
  uiRoot.settingsStore ||
  uiRoot.appSettingsStore ||
  {};
const uiWorkoutStore =
  uiGlobals.workoutStore ||
  uiRoot.workoutStore ||
  (uiRoot.appGlobals ? uiRoot.appGlobals.workoutStore : null) ||
  null;
const uiSongsStore =
  uiGlobals.songsStore ||
  uiRoot.songsStore ||
  (uiRoot.appGlobals ? uiRoot.appGlobals.songsStore : null) ||
  null;

const modeStatCategoryMap = {
  tabChords: "chords",
  tabProgressions: "progressions",
  tabSongs: "songs",
  tabDegrees: "degrees",
  tabScales: "scales",
  tabJazz: "bricks",
};

const statCategoryLabels = {
  chords: "Chords",
  progressions: "Progressions",
  songs: "Songs",
  degrees: "Degrees",
  scales: "Scales",
  bricks: "Bricks",
};

const flowModeLabels = {
  random: "Random keys",
  circleOfFourths: "Circle of Fourths",
  circleOfFifths: "Circle of Fifths",
  ascendingWholeSteps: "Ascending Whole Steps",
  descendingWholeSteps: "Descending Whole Steps",
  ascendingHalfSteps: "Ascending Half Steps",
  descendingHalfSteps: "Descending Half Steps",
  ascendingMinorThirds: "Ascending Minor Thirds",
  descendingMinorThirds: "Descending Minor Thirds",
};

const workoutState = {
  originalName: "",
  draftName: "",
  entries: [],
  activeIndex: -1,
  dirty: false,
};

function syncSettingsStore() {
  if (uiSettingsStore && typeof uiSettingsStore.syncFromDom === "function") {
    uiSettingsStore.syncFromDom();
  }
}

function getChordGroupIds(group) {
  return chordTypeGroups[group] || [];
}

const fourNoteChordIds = chordTypeConfigs
  .filter((config) => {
    const structure = chordStructures[config.type];
    return Array.isArray(structure) && structure.length >= 4;
  })
  .map((config) => config.id);

// Unified voicing selection: one radio group for all modes
function getVoicingMode() {
  const sel = document.querySelector("input[name='voicingMode']:checked");
  return sel ? sel.value : "default";
}

// Backward-compatible helpers used by scripts.js
function getShellMode() {
  const v = getVoicingMode();
  if (v.startsWith("shell:")) return v.split(":")[1];
  return "off";
}
function getUpperMode() {
  const v = getVoicingMode();
  if (v.startsWith("upper:")) return v.split(":")[1];
  return "off";
}

function getUpper1Mode() {
  const v = getVoicingMode();
  if (v.startsWith("upper1:")) return v.split(":")[1];
  return "off";
}

function voicingModeRequiresFourNotes(mode = getVoicingMode()) {
  return (
    typeof mode === "string" &&
    (mode.startsWith("shell:") ||
      mode.startsWith("upper:") ||
      mode.startsWith("upper1:"))
  );
}

// Disable chord types that have fewer than 4 notes (triads/sus)
// only for voicing modes that require a 4-note source chord.
let _prevTriadCheckedState = null;
let _lastVoicingMode = null;
function enforceVoicingChordConstraints() {
  const currentMode = getVoicingMode();
  const restrictTriads = voicingModeRequiresFourNotes(currentMode);
  const lastRestricted = voicingModeRequiresFourNotes(_lastVoicingMode);
  const triadIds = getChordGroupIds("triads");

  // Capture prior checked state when entering a restrictive voicing mode.
  if (!lastRestricted && restrictTriads) {
    _prevTriadCheckedState = {};
    triadIds.forEach((id) => {
      _prevTriadCheckedState[id] = dom.chordCheckboxes[id].checked;
    });
  }

  triadIds.forEach((id) => {
    const el = dom.chordCheckboxes[id];
    if (!restrictTriads) {
      el.disabled = false;
      if (_prevTriadCheckedState && id in _prevTriadCheckedState) {
        el.checked = _prevTriadCheckedState[id];
      }
    } else {
      el.checked = false;
      el.disabled = true;
    }
  });

  if (restrictTriads) {
    const anyChecked = fourNoteChordIds.some(
      (id) => dom.chordCheckboxes[id].checked,
    );
    if (!anyChecked) {
      // Sensible defaults: dominant, minor, major, half-diminished 7ths
      [
        "chkChordSeventh",
        "chkChordMinorSeventh",
        "chkChordMajorSeventh",
        "chkChordHalfDiminishedSeventh",
      ].forEach((id) => {
        dom.chordCheckboxes[id].checked = true;
      });
    }
  }

  _lastVoicingMode = currentMode;
  refreshChordToggleButtons();
}

function noKeys() {
  allNotes.forEach((key) => {
    dom.keyCheckboxes[key].checked = false;
  });
}

function allKeys() {
  allNotes.forEach((key) => {
    dom.keyCheckboxes[key].checked = true;
  });
}

function normalKeys() {
  noKeys();

  normalNotes.forEach((key) => {
    dom.keyCheckboxes[key].checked = true;
  });
}

function flatKeys() {
  noKeys();

  allNotes
    .filter((key) => key.endsWith("b"))
    .forEach((key) => {
      dom.keyCheckboxes[key].checked = true;
    });
}

function sharpKeys() {
  noKeys();

  allNotes
    .filter((key) => key.endsWith("#"))
    .forEach((key) => {
      dom.keyCheckboxes[key].checked = true;
    });
}

function blackKeys() {
  noKeys();

  normalNotes
    .filter((key) => key.endsWith("#") || key.endsWith("b"))
    .forEach((key) => {
      dom.keyCheckboxes[key].checked = true;
    });
}

function whiteKeys() {
  noKeys();

  allNotes
    .filter((key) => !key.endsWith("#") && !key.endsWith("b"))
    .forEach((key) => {
      dom.keyCheckboxes[key].checked = true;
    });
}

function getSelectedMode() {
  const sel = document.querySelector("input[name='mode']:checked");
  return sel ? sel.value : "tabChords";
}

function modeIsChords() {
  return getSelectedMode() === "tabChords";
}

function modeIsProgressions() {
  return getSelectedMode() === "tabProgressions";
}

function modeIsSongs() {
  return getSelectedMode() === "tabSongs";
}

function modeIsScales() {
  return getSelectedMode() === "tabScales";
}

function modeIsDegrees() {
  return getSelectedMode() === "tabDegrees";
}

function modeIsJazz() {
  return getSelectedMode() === "tabJazz";
}

function optionsChange() {
  const selectedTabs = new Set(
    Array.from(
      document.querySelectorAll("input[data-options-tab]:checked"),
    ).map((input) => input.value),
  );

  Object.entries(dom.optionsPanels).forEach(([tabValue, panel]) => {
    panel.style.display = selectedTabs.has(tabValue) ? "block" : "none";
  });
}

[
  { key: "none", handler: noKeys },
  { key: "all", handler: allKeys },
  { key: "normal", handler: normalKeys },
  { key: "flats", handler: flatKeys },
  { key: "sharps", handler: sharpKeys },
  { key: "black", handler: blackKeys },
  { key: "white", handler: whiteKeys },
].forEach(({ key, handler }) => {
  dom.keyPresetButtons[key].addEventListener("click", () => {
    handler();
    syncSettingsStore();
  });
});

// Handler functions for preset buttons

function setChordCheckboxes(ids, state) {
  ids.forEach((id) => {
    const checkbox = dom.chordCheckboxes[id];
    if (checkbox && !checkbox.disabled) {
      checkbox.checked = state;
    }
  });
  refreshChordToggleButtons();
}

const chordToggleConfigs = [
  { key: "all", label: "All", ids: () => chordTypeIds },
  { key: "triads", label: "Triads", ids: () => getChordGroupIds("triads") },
  { key: "sixths", label: "Sixths", ids: () => getChordGroupIds("sixths") },
  {
    key: "sevenths",
    label: "Sevenths",
    ids: () => getChordGroupIds("sevenths"),
  },
  { key: "majors", label: "Major", ids: () => getChordGroupIds("major") },
  { key: "minors", label: "Minor", ids: () => getChordGroupIds("minor") },
];

function getChordToggleState(ids) {
  const checkboxes = ids.map((id) => dom.chordCheckboxes[id]).filter(Boolean);
  const selectableCheckboxes = checkboxes.filter((checkbox) => {
    return !checkbox.disabled;
  });
  const visibleCheckboxes = selectableCheckboxes.length
    ? selectableCheckboxes
    : checkboxes;
  const checkedCount = visibleCheckboxes.filter(
    (checkbox) => checkbox.checked,
  ).length;

  if (checkedCount === 0) return "allOff";
  if (checkedCount === visibleCheckboxes.length) return "allOn";
  return "partial";
}

function updateChordToggleButton(config) {
  const button = dom.chordToggleButtons[config.key];
  if (!button) return;

  const ids = config.ids();
  const state = getChordToggleState(ids);
  const stateLabels = {
    allOn: "All on",
    allOff: "All off",
    partial: "Partial",
  };
  const stateIcons = {
    allOn: "✓",
    allOff: "×",
    partial: "−",
  };
  const ariaPressed = {
    allOn: "true",
    allOff: "false",
    partial: "mixed",
  };
  const allDisabled = ids.every((id) => dom.chordCheckboxes[id]?.disabled);
  const stateClass = `is-${state.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;

  const accessibleLabel = config.label
    ? `${config.label}: ${stateLabels[state]}`
    : stateLabels[state];

  button.textContent = stateIcons[state];
  button.setAttribute("aria-label", accessibleLabel);
  button.title = accessibleLabel;
  button.dataset.state = state;
  button.setAttribute("aria-pressed", ariaPressed[state]);
  button.classList.remove("is-all-on", "is-all-off", "is-partial");
  button.classList.add(stateClass);
  button.disabled = allDisabled;
}

function refreshChordToggleButtons() {
  chordToggleConfigs.forEach(updateChordToggleButton);
}

function cycleChordToggle(config) {
  const ids = config.ids();
  const state = getChordToggleState(ids);
  setChordCheckboxes(ids, state !== "allOn");
  syncSettingsStore();
}

function getSelectableOptionValues(select) {
  if (!select || !select.options) return [];
  return Array.from(select.options)
    .filter((option) => !option.disabled && option.value)
    .map((option) => option.value);
}

function updateSelectStepperButtons(select, prevButton, nextButton) {
  const canStep =
    !!select &&
    !select.disabled &&
    getSelectableOptionValues(select).length > 1;
  [prevButton, nextButton].forEach((button) => {
    if (button) button.disabled = !canStep;
  });
}

function stepSelectValue(select, direction) {
  const values = getSelectableOptionValues(select);
  if (!select || !values.length) return;
  const currentIndex = values.indexOf(select.value);
  const startIndex =
    currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : values.length;
  const nextIndex = (startIndex + direction + values.length) % values.length;
  select.value = values[nextIndex];
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function updatePresetActionButtons() {
  const selectedName = dom.settingsPresetSelect
    ? dom.settingsPresetSelect.value
    : "";
  const hasSelection = !!selectedName;
  [
    dom.settingsActivateButton,
    dom.settingsUpdateButton,
    dom.settingsDeleteButton,
  ].forEach((button) => {
    if (button) button.disabled = !hasSelection;
  });
  if (dom.settingsCreateButton) {
    const draftName = dom.settingsPresetName
      ? dom.settingsPresetName.value.trim()
      : "";
    dom.settingsCreateButton.disabled = !draftName;
  }
}

function stepActiveSettingsPreset(direction) {
  const select = dom.settingsPresetSelect;
  const presetNames = getSelectableOptionValues(select);
  if (!select || !presetNames.length) return;
  const activeState =
    uiSettingsStore &&
    typeof uiSettingsStore.getActivePresetState === "function"
      ? uiSettingsStore.getActivePresetState()
      : null;
  if (activeState && presetNames.includes(activeState.name)) {
    select.value = activeState.name;
  }
  stepSelectValue(select, direction);
  handleSettingsActivate();
}

function updateTrainingSetupSummary() {
  const presetState =
    uiSettingsStore &&
    typeof uiSettingsStore.getActivePresetState === "function"
      ? uiSettingsStore.getActivePresetState()
      : { name: "", modified: false };
  const preset = presetState.name
    ? `${presetState.name}${presetState.modified ? " (modified)" : ""}`
    : presetState.modified
      ? "Custom"
      : "None";
  const workout =
    workoutState.draftName ||
    (dom.workoutSelect && dom.workoutSelect.value) ||
    "None";

  if (dom.trainingSetupSummary) {
    dom.trainingSetupSummary.textContent = `Preset: ${preset} · Workout: ${workout}`;
  }

  updateSelectStepperButtons(
    dom.settingsPresetSelect,
    dom.settingsPresetPrevButton,
    dom.settingsPresetNextButton,
  );
  updateSelectStepperButtons(
    dom.workoutSelect,
    dom.workoutPrevButton,
    dom.workoutNextButton,
  );
}

const modeSectionsByTab = {
  tabChords: ["chordOptions"],
  tabProgressions: ["progressionOptions"],
  tabSongs: ["songsOptions"],
  tabDegrees: ["progressionOptions", "degreesOptions"],
  tabScales: ["scalesOptions"],
  tabJazz: ["jazzOptions"],
};

const modeSectionIds = Array.from(
  Object.values(modeSectionsByTab).reduce((acc, ids) => {
    ids.forEach((id) => acc.add(id));
    return acc;
  }, new Set()),
);

function applyModeVisibility(selectedTab) {
  const visibleSections = modeSectionsByTab[selectedTab] || [];
  modeSectionIds.forEach((id) => {
    const el = dom.modeSections[id];
    if (!el) return;
    el.style.display = visibleSections.includes(id) ? "block" : "none";
  });
}

function modeChange() {
  applyModeVisibility(getSelectedMode());
  resetFlow();
  const updateStatsSummary =
    typeof uiGlobals.updateDailyStatsSummary === "function"
      ? uiGlobals.updateDailyStatsSummary
      : typeof uiRoot.updateDailyStatsSummary === "function"
        ? uiRoot.updateDailyStatsSummary
        : null;
  if (updateStatsSummary) {
    updateStatsSummary();
  }
}

function syncProgressionParameterControls() {
  if (!dom.progressionSelect) return;
  if (dom.customProgressionInput) {
    dom.customProgressionInput.disabled =
      dom.progressionSelect.value !== "custom";
  }
  if (dom.randomProgressionCount) {
    dom.randomProgressionCount.disabled =
      dom.progressionSelect.value !== "random";
  }
}

function openKeyboardShortcutsDialog() {
  if (
    !dom.keyboardShortcutsDialog ||
    typeof dom.keyboardShortcutsDialog.showModal !== "function"
  ) {
    return;
  }
  if (dom.themePicker) dom.themePicker.open = false;
  dom.keyboardShortcutsDialog.showModal();
  if (dom.keyboardShortcutsCloseButton) {
    dom.keyboardShortcutsCloseButton.focus();
  }
}

function handleKeyboardShortcutsLauncherKeydown(event) {
  if (["Space", "Enter", "NumpadEnter"].includes(event.code)) {
    event.stopPropagation();
  }
}

// Attach the handlers
dom.skipButton.addEventListener("click", () => nextProgression());
dom.playAnswerButton.addEventListener("click", () => playAnswerNotes());
dom.keyboardShortcutsButton.addEventListener(
  "click",
  openKeyboardShortcutsDialog,
);
dom.keyboardShortcutsButton.addEventListener(
  "keydown",
  handleKeyboardShortcutsLauncherKeydown,
);
dom.keyboardShortcutsDialog.addEventListener("keydown", (event) => {
  event.stopPropagation();
});
dom.keyboardShortcutsDialog.addEventListener("close", () => {
  dom.keyboardShortcutsButton.focus();
});

dom.progressionSelect.addEventListener("change", () => {
  syncProgressionParameterControls();
  nextProgression();
});

function setSongsStatus(message) {
  if (!dom.songStatus) return;
  dom.songStatus.textContent = message;
}

function syncSongFavoriteToggle() {
  if (!dom.songFavoriteToggle || !uiSongsStore || !dom.songSelect) return;
  const songId = dom.songSelect.value || "";
  const song = songId ? uiSongsStore.getSong(songId) : null;
  dom.songFavoriteToggle.disabled = !song;
  dom.songFavoriteToggle.checked = !!(song && song.favorite);
}

function syncSongKeyControls() {
  if (
    !dom.songUseOriginalKey ||
    !dom.songAdvanceKeyOnRepeat ||
    !dom.songAdvanceKeyOnSongChange
  ) {
    return;
  }
  const useOriginalKey = !!dom.songUseOriginalKey.checked;
  dom.songAdvanceKeyOnRepeat.disabled = useOriginalKey;
  dom.songAdvanceKeyOnSongChange.disabled = useOriginalKey;
}

function refreshSongPracticeDisplay() {
  if (modeIsSongs() && typeof resetFlow === "function") {
    resetFlow();
  }
}

function refreshSongSelect(selectedId = "") {
  if (!dom.songSelect || !uiSongsStore) return;
  const songs = uiSongsStore.listSongs();
  const fallbackId = songs[0] ? songs[0].id : "";
  const storedId =
    typeof uiSongsStore.getLastSelection === "function"
      ? uiSongsStore.getLastSelection()
      : "";
  const targetId = selectedId || storedId || dom.songSelect.value || fallbackId;
  dom.songSelect.innerHTML = "";

  if (!songs.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No songs imported";
    dom.songSelect.appendChild(option);
    dom.songSelect.value = "";
    if (typeof uiSongsStore.setLastSelection === "function") {
      uiSongsStore.setLastSelection("");
    }
    if (dom.songFavoriteToggle) {
      dom.songFavoriteToggle.checked = false;
      dom.songFavoriteToggle.disabled = true;
    }
    if (dom.songDeleteButton) dom.songDeleteButton.disabled = true;
    return;
  }

  songs.forEach((song) => {
    const option = document.createElement("option");
    option.value = song.id;
    option.textContent = `${song.favorite ? "★ " : ""}${song.title} - ${song.composer}`;
    dom.songSelect.appendChild(option);
  });

  dom.songSelect.value = songs.some((song) => song.id === targetId)
    ? targetId
    : fallbackId;
  if (typeof uiSongsStore.setLastSelection === "function") {
    uiSongsStore.setLastSelection(dom.songSelect.value);
  }

  if (dom.songDeleteButton) dom.songDeleteButton.disabled = false;
  syncSongFavoriteToggle();
}

uiGlobals.refreshSongSelect = refreshSongSelect;
uiGlobals.syncSongFavoriteToggle = syncSongFavoriteToggle;
uiGlobals.syncSongKeyControls = syncSongKeyControls;
uiGlobals.refreshSongPracticeDisplay = refreshSongPracticeDisplay;

function handleSongImport() {
  if (!dom.songUrlInput || !uiSongsStore) return;
  const source = dom.songUrlInput.value.trim();
  if (!source) {
    setSongsStatus("Paste an iReal Pro URL to import.");
    return;
  }
  try {
    const result = uiSongsStore.importSource(source);
    refreshSongSelect(result.selectedSongId);
    dom.songUrlInput.value = "";
    if (dom.modeRadios.tabSongs) {
      dom.modeRadios.tabSongs.checked = true;
    }
    setSongsStatus(
      result.importedCount === 1
        ? "Imported 1 song."
        : `Imported ${result.importedCount} songs.`,
    );
    modeChange();
  } catch (error) {
    setSongsStatus(error && error.message ? error.message : "Import failed.");
  }
}

function handleSongDelete() {
  if (!dom.songSelect || !uiSongsStore) return;
  const songId = dom.songSelect.value;
  if (!songId) return;
  uiSongsStore.deleteSong(songId);
  refreshSongSelect();
  setSongsStatus("Deleted selected song.");
  if (modeIsSongs()) {
    resetFlow();
  }
}

if (dom.songImportButton) {
  dom.songImportButton.addEventListener("click", handleSongImport);
}
if (dom.songDeleteButton) {
  dom.songDeleteButton.addEventListener("click", handleSongDelete);
}
if (dom.songSelect) {
  dom.songSelect.addEventListener("change", () => {
    if (uiSongsStore && typeof uiSongsStore.setLastSelection === "function") {
      uiSongsStore.setLastSelection(dom.songSelect.value);
    }
    syncSongFavoriteToggle();
    if (modeIsSongs()) {
      resetFlow();
    }
  });
}
if (dom.songFavoriteToggle) {
  dom.songFavoriteToggle.addEventListener("change", () => {
    if (!uiSongsStore || !dom.songSelect) return;
    const songId = dom.songSelect.value || "";
    if (!songId) {
      dom.songFavoriteToggle.checked = false;
      return;
    }
    uiSongsStore.setFavorite(songId, dom.songFavoriteToggle.checked);
    refreshSongSelect(songId);
  });
}
if (dom.songUseOriginalKey) {
  dom.songUseOriginalKey.addEventListener("change", () => {
    syncSongKeyControls();
    syncSettingsStore();
    if (modeIsSongs()) {
      resetFlow();
    }
  });
}
if (dom.songAdvanceKeyOnRepeat) {
  dom.songAdvanceKeyOnRepeat.addEventListener("change", syncSettingsStore);
}
if (dom.songAdvanceKeyOnSongChange) {
  dom.songAdvanceKeyOnSongChange.addEventListener("change", syncSettingsStore);
}
if (dom.songDisplayRomanNumerals) {
  dom.songDisplayRomanNumerals.addEventListener("change", () => {
    syncSettingsStore();
    if (modeIsSongs() && typeof resetFlow === "function") {
      resetFlow();
    }
  });
}
refreshSongSelect();
syncSongKeyControls();

chordToggleConfigs.forEach((config) => {
  dom.chordToggleButtons[config.key].addEventListener("click", () => {
    cycleChordToggle(config);
  });
});
Object.values(dom.chordCheckboxes).forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    refreshChordToggleButtons();
  });
});
refreshChordToggleButtons();

document.querySelectorAll("input[name='mode']").forEach((input) => {
  input.addEventListener("change", modeChange);
});

// Options tab listeners
document.querySelectorAll("input[data-options-tab]").forEach((input) => {
  input.addEventListener("change", optionsChange);
});
// Initialize options tab visibility
optionsChange();

// Apply constraints based on current voicing selection on load
_lastVoicingMode = getVoicingMode();
enforceVoicingChordConstraints();

// Update constraints whenever voicing mode changes
document
  .querySelectorAll("input[name='voicingMode']")
  .forEach((r) => r.addEventListener("change", enforceVoicingChordConstraints));

// Get every div that has a data-note element form 48 to 70 and add a click handler
document.querySelectorAll("div[data-note]").forEach((div) => {
  div.addEventListener("click", () => {
    // Send the key from the data-note to the handleKeyClick function
    handleKeyClick(div.dataset.note);
  });
});

if (
  dom.keyboardDetails &&
  typeof dom.keyboardDetails.addEventListener === "function"
) {
  dom.keyboardDetails.addEventListener("toggle", () => {
    syncSettingsStore();
  });
}

dom.highlightCorrectKeys.addEventListener("change", () => {
  highlightCorrectKeys();
});

dom.highlightDelay.addEventListener("input", () => {
  highlightCorrectKeys();
});

function generateScalesTable() {
  const container = dom.scalesSelected;

  let tableHtml = "<table><tr><td><label>Scales</label></td></tr>";

  for (let key in scales) {
    if (scales.hasOwnProperty(key)) {
      const isChecked = scales[key].enabled ? "checked" : "";
      tableHtml += `<tr><td><label><input type="checkbox" id="${key}" ${isChecked}> ${scales[key].label}</label></td></tr>`;
    }
  }

  tableHtml += "</table>";
  container.innerHTML += tableHtml;

  Object.keys(scales).forEach((key) => {
    const checkbox = container.querySelector(`#${key}`);
    if (checkbox) {
      dom.scaleCheckboxes[key] = checkbox;
      scales[key].enabled = checkbox.checked;
      checkbox.addEventListener("change", () => {
        scales[key].enabled = checkbox.checked;
        syncSettingsStore();
      });
    }
  });
}

function toggleScales(category) {
  const selectedScales = scaleGroups[category];

  for (let key in scales) {
    if (scales.hasOwnProperty(key)) {
      const checkbox = dom.scaleCheckboxes[key];
      const shouldEnable = selectedScales.includes(key);
      if (checkbox) checkbox.checked = shouldEnable;
      if (scales[key]) {
        scales[key].enabled = shouldEnable;
      }
    }
  }
  syncSettingsStore();
}

function generateScalesButtons() {
  const buttonContainer = dom.scalesButtons;

  const buttonsHtml = `
        <button onclick="toggleScales('basic')">Basic</button>
        <button onclick="toggleScales('greekModes')">Greek Modes</button>
        <button onclick="toggleScales('classicalMusic')">Classical Music</button>
        <button onclick="toggleScales('jazzBlues')">Jazz/Blues</button>
        <button onclick="toggleScales('all')">All</button>
    `;

  buttonContainer.innerHTML = buttonsHtml;
}

function initScales() {
  generateScalesTable();
  generateScalesButtons();
}

function initJazzBricks() {
  const tbody = document.querySelector("#tableJazzBricks tbody");

  jazzCadences.forEach((cadence) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
			<td>${cadence.name}</td>
			<td>${cadence.chords.join(" ")}</td>
			<td><input type="checkbox" ${cadence.enabled ? "checked" : ""}></td>
			`;
    tbody.appendChild(tr);

    cadence.element = tr.querySelector('input[type="checkbox"]');
    cadence.element.checked = cadence.enabled;
    cadence.element.addEventListener("change", function () {
      cadence.enabled = this.checked;
      syncSettingsStore();
    });
  });
}

// Basic group toggle: turns on/off all basic cadences
dom.jazzBrickButtons.basic.addEventListener("click", () => {
  const anyOn = jazzCadences.some(
    (c) => jazzCadencesBasic.includes(c.name) && c.enabled,
  );
  jazzCadences.forEach((c) => {
    if (jazzCadencesBasic.includes(c.name)) {
      c.enabled = !anyOn;
      c.element.checked = !anyOn;
    }
  });
  syncSettingsStore();
});

// Intermediate group toggle: excludes basic group, toggles intermediate-only cadences
dom.jazzBrickButtons.intermediate.addEventListener("click", () => {
  const anyOn = jazzCadences.some(
    (c) => jazzCadencesIntermediate.includes(c.name) && c.enabled,
  );
  jazzCadences.forEach((c) => {
    if (jazzCadencesIntermediate.includes(c.name)) {
      c.enabled = !anyOn;
      c.element.checked = !anyOn;
    }
  });
  syncSettingsStore();
});

// 'All' button: enable all cadences
dom.jazzBrickButtons.all.addEventListener("click", () => {
  jazzCadences.forEach((c) => {
    c.enabled = true;
    c.element.checked = true;
  });
  syncSettingsStore();
});

// 'None' button: disable all cadences
dom.jazzBrickButtons.none.addEventListener("click", () => {
  jazzCadences.forEach((c) => {
    c.enabled = false;
    c.element.checked = false;
  });
  syncSettingsStore();
});

dom.jazzBrickButtons.turnarounds.addEventListener("click", () => {
  const anyOn = jazzCadences.some(
    (c) => jazzCadencesTurnarounds.includes(c.name) && c.enabled,
  );
  jazzCadences.forEach((c) => {
    if (jazzCadencesTurnarounds.includes(c.name)) {
      c.enabled = !anyOn;
      c.element.checked = !anyOn;
    }
  });
  syncSettingsStore();
});

dom.jazzBrickButtons.metabricks.addEventListener("click", () => {
  const anyOn = jazzCadences.some(
    (c) => jazzCadencesMetabricks.includes(c.name) && c.enabled,
  );
  jazzCadences.forEach((c) => {
    if (jazzCadencesMetabricks.includes(c.name)) {
      c.enabled = !anyOn;
      c.element.checked = !anyOn;
    }
  });
  syncSettingsStore();
});

dom.jazzBrickButtons.dropbacks.addEventListener("click", () => {
  const anyOn = jazzCadences.some(
    (c) => jazzCadencesDropbacks.includes(c.name) && c.enabled,
  );
  jazzCadences.forEach((c) => {
    if (jazzCadencesDropbacks.includes(c.name)) {
      c.enabled = !anyOn;
      c.element.checked = !anyOn;
    }
  });
  syncSettingsStore();
});

function refreshSettingsPresetOptions(preferredValue) {
  if (!uiSettingsStore) return;
  const select = dom.settingsPresetSelect;
  const currentValue =
    typeof preferredValue === "string" ? preferredValue : select.value;
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
  const presets = uiSettingsStore.listPresets();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = presets.length
    ? "Select a preset"
    : "No presets saved";
  placeholder.disabled = !presets.length;
  placeholder.selected = true;
  select.appendChild(placeholder);
  presets.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  if (presets.includes(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "";
  }
  refreshWorkoutPresetOptions();
  updatePresetActionButtons();
  updateTrainingSetupSummary();
}

function setFileStatus(target, message) {
  if (target) target.textContent = message || "";
}

function downloadJsonFile(filename, jsonText) {
  if (typeof document === "undefined" || typeof Blob === "undefined") return;
  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function readJsonFileInput(input, onText, onError) {
  const file = input && input.files && input.files[0] ? input.files[0] : null;
  if (!file) return;
  const clearInput = () => {
    input.value = "";
  };
  if (typeof file.text === "function") {
    file.text().then(onText).catch(onError).finally(clearInput);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    clearInput();
    onText(String(reader.result || ""));
  };
  reader.onerror = () => {
    clearInput();
    onError(reader.error || new Error("File could not be read."));
  };
  reader.readAsText(file);
}

function handleSettingsPresetSelectChange() {
  setFileStatus(dom.settingsFileStatus, "");
  updatePresetActionButtons();
}

function handleSettingsPresetNameInput() {
  setFileStatus(dom.settingsFileStatus, "");
  updatePresetActionButtons();
}

function handleSettingsCreate() {
  if (!uiSettingsStore) return;
  const name = dom.settingsPresetName.value.trim();
  if (!name) {
    setFileStatus(dom.settingsFileStatus, "Enter a name for the new preset.");
    return;
  }
  const existingNames =
    typeof uiSettingsStore.listPresets === "function" &&
    uiSettingsStore.listPresets();
  if (existingNames && existingNames.includes(name)) {
    setFileStatus(
      dom.settingsFileStatus,
      `Preset "${name}" already exists. Select it and use Update instead.`,
    );
    return;
  }
  uiSettingsStore.syncFromDom();
  if (!uiSettingsStore.savePreset(name)) {
    setFileStatus(dom.settingsFileStatus, "Preset could not be created.");
    return;
  }
  refreshSettingsPresetOptions(name);
  dom.settingsPresetName.value = "";
  updatePresetActionButtons();
  setFileStatus(dom.settingsFileStatus, `Created preset "${name}".`);
}

function handleSettingsUpdate() {
  if (!uiSettingsStore) return;
  const name = dom.settingsPresetSelect.value;
  if (!name) {
    alert("Select a preset to update.");
    return;
  }
  if (!confirm(`Replace preset "${name}" with the current settings?`)) return;
  uiSettingsStore.syncFromDom();
  if (!uiSettingsStore.savePreset(name)) {
    alert("Preset could not be updated.");
    return;
  }
  refreshSettingsPresetOptions(name);
  setFileStatus(dom.settingsFileStatus, `Updated preset "${name}".`);
}

function handleSettingsActivate() {
  if (!uiSettingsStore) return;
  const name = dom.settingsPresetSelect.value;
  if (!name) {
    alert("Select a preset to activate.");
    return;
  }
  const loaded = uiSettingsStore.loadPreset(name);
  if (!loaded) {
    alert("Preset could not be activated.");
    return;
  }
  syncProgressionParameterControls();
  refreshSettingsPresetOptions(name);
  setFileStatus(dom.settingsFileStatus, `Activated preset "${name}".`);
}

function handleSettingsDelete() {
  if (!uiSettingsStore) return;
  const name = dom.settingsPresetSelect.value;
  if (!name) {
    alert("Select a preset to delete.");
    return;
  }
  if (!confirm(`Delete preset "${name}"?`)) return;
  if (!uiSettingsStore.deletePreset(name)) {
    setFileStatus(dom.settingsFileStatus, "Preset could not be deleted.");
    return;
  }
  refreshSettingsPresetOptions();
  setFileStatus(dom.settingsFileStatus, `Deleted preset "${name}".`);
}

function requestDataResetConfirmation({
  title,
  message,
  confirmLabel,
  launcher,
}) {
  const dialog = dom.dataResetDialog;
  if (!dialog || typeof dialog.showModal !== "function") {
    return Promise.resolve(false);
  }

  dom.dataResetDialogTitle.textContent = title;
  dom.dataResetDialogMessage.textContent = message;
  dom.dataResetConfirmButton.textContent = confirmLabel;
  dialog.returnValue = "";

  return new Promise((resolve) => {
    const handleClose = () => {
      dialog.removeEventListener("cancel", handleCancel);
      const confirmed = dialog.returnValue === "confirm";
      if (launcher && typeof launcher.focus === "function") launcher.focus();
      resolve(confirmed);
    };
    const handleCancel = (event) => {
      event.preventDefault();
      dialog.close("cancel");
    };

    dialog.addEventListener("close", handleClose, { once: true });
    dialog.addEventListener("cancel", handleCancel);
    dialog.showModal();
    if (dom.dataResetCancelButton) dom.dataResetCancelButton.focus();
  });
}

async function runDataResetAction({
  launcher,
  title,
  message,
  confirmLabel,
  successMessage,
  action,
}) {
  const statusRow =
    launcher && typeof launcher.closest === "function"
      ? launcher.closest(".dataResetRow")
      : null;
  if (
    statusRow &&
    typeof statusRow.appendChild === "function" &&
    dom.dataResetStatus
  ) {
    statusRow.appendChild(dom.dataResetStatus);
  }
  setFileStatus(dom.dataResetStatus, "");
  const confirmed = await requestDataResetConfirmation({
    title,
    message,
    confirmLabel,
    launcher,
  });
  if (!confirmed) {
    setFileStatus(dom.dataResetStatus, "Canceled. No data was changed.");
    return;
  }

  let succeeded = false;
  try {
    succeeded = action() !== false;
  } catch (_) {
    succeeded = false;
  }
  setFileStatus(
    dom.dataResetStatus,
    succeeded ? successMessage : "Data could not be reset.",
  );
}

function restoreAppDefaults() {
  if (
    !uiSettingsStore ||
    typeof uiSettingsStore.resetToDefaults !== "function"
  ) {
    return false;
  }
  const reset = uiSettingsStore.resetToDefaults();
  if (reset === false) return false;
  syncProgressionParameterControls();
  refreshSettingsPresetOptions("");
  return true;
}

function resetTodayStats() {
  if (typeof uiGlobals.resetDailyStats !== "function") return false;
  return uiGlobals.resetDailyStats() !== false;
}

function clearFailedItems() {
  if (typeof spacedRepClearAll !== "function") return false;
  spacedRepClearAll();
  return true;
}

function initQuickResetActions() {
  if (
    dom.resetStatsButton &&
    typeof dom.resetStatsButton.addEventListener === "function"
  ) {
    dom.resetStatsButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetTodayStats();
    });
  }
  if (
    dom.spacedRepClearButton &&
    typeof dom.spacedRepClearButton.addEventListener === "function"
  ) {
    dom.spacedRepClearButton.addEventListener("click", clearFailedItems);
  }
}

function deleteAllPresets() {
  if (
    !uiSettingsStore ||
    typeof uiSettingsStore.clearPresets !== "function" ||
    !uiSettingsStore.clearPresets()
  ) {
    return false;
  }
  refreshSettingsPresetOptions("");
  setFileStatus(dom.settingsFileStatus, "Deleted all presets.");
  return true;
}

function deleteAllWorkouts() {
  if (
    !uiWorkoutStore ||
    typeof uiWorkoutStore.clearAll !== "function" ||
    !uiWorkoutStore.clearAll()
  ) {
    return false;
  }
  resetWorkoutState();
  refreshWorkoutSelect("");
  renderWorkoutEditor();
  resetWorkoutGoalInputs();
  setFileStatus(dom.workoutFileStatus, "Deleted all workouts.");
  updateTrainingSetupSummary();
  return true;
}

function deleteAllSongs() {
  if (
    !uiSongsStore ||
    typeof uiSongsStore.clearAll !== "function" ||
    !uiSongsStore.clearAll()
  ) {
    return false;
  }
  refreshSongSelect();
  setSongsStatus("Deleted all songs.");
  if (modeIsSongs() && typeof resetFlow === "function") resetFlow();
  return true;
}

function resetAllAppData() {
  if (
    !uiSettingsStore ||
    typeof uiSettingsStore.resetToDefaults !== "function" ||
    typeof uiGlobals.clearAllAppStorage !== "function" ||
    !uiGlobals.clearAllAppStorage()
  ) {
    return false;
  }
  uiSettingsStore.resetToDefaults({ save: false });
  uiRoot.location.reload();
  return true;
}

function initDataResetActions() {
  const actions = [
    {
      launcher: dom.dataResetSettingsButton,
      title: "Restore app defaults?",
      message:
        "This restores the built-in current settings. Presets, workouts, songs, and today's stats will be kept.",
      confirmLabel: "Restore App Defaults",
      successMessage: "Restored app defaults. Saved data was kept.",
      action: restoreAppDefaults,
    },
    {
      launcher: dom.dataResetStatsButton,
      title: "Reset today's stats?",
      message:
        "This clears today's correct and incorrect counts. Settings and saved content will be kept.",
      confirmLabel: "Reset Daily Stats",
      successMessage: "Reset today's stats.",
      action: resetTodayStats,
    },
    {
      launcher: dom.dataClearFailedItemsButton,
      title: "Clear failed items?",
      message:
        "This clears the current spaced-repetition queue. Other settings and saved data will be kept.",
      confirmLabel: "Clear Failed Items",
      successMessage: "Cleared failed items.",
      action: clearFailedItems,
    },
    {
      launcher: dom.dataDeletePresetsButton,
      title: "Delete all presets?",
      message:
        "This deletes every saved preset, including starter presets. Current settings, workouts, songs, and stats will be kept.",
      confirmLabel: "Delete All Presets",
      successMessage: "Deleted all presets.",
      action: deleteAllPresets,
    },
    {
      launcher: dom.dataDeleteWorkoutsButton,
      title: "Delete all workouts?",
      message:
        "This deletes every saved workout, including starter workouts. Presets, songs, settings, and stats will be kept.",
      confirmLabel: "Delete All Workouts",
      successMessage: "Deleted all workouts.",
      action: deleteAllWorkouts,
    },
    {
      launcher: dom.dataDeleteSongsButton,
      title: "Delete all songs?",
      message:
        "This deletes every imported song and its favorite status. Settings, presets, workouts, and stats will be kept.",
      confirmLabel: "Delete All Songs",
      successMessage: "Deleted all songs.",
      action: deleteAllSongs,
    },
    {
      launcher: dom.dataResetAllButton,
      title: "Reset all Chord Challenge data?",
      message:
        "This deletes current settings, presets, workouts, imported songs, favorites, today's stats, and failed items from this browser. Starter presets and workouts will be restored after reload. This cannot be undone.",
      confirmLabel: "Reset All App Data",
      successMessage: "Reset all Chord Challenge data.",
      action: resetAllAppData,
    },
  ];

  actions.forEach((config) => {
    if (!config.launcher) return;
    config.launcher.addEventListener("click", () => {
      runDataResetAction(config);
    });
  });
}

function handleSettingsDownload() {
  if (!uiSettingsStore) return;
  downloadJsonFile("chord.presets", uiSettingsStore.exportPresets(true));
  setFileStatus(dom.settingsFileStatus, "Exported presets.");
}

function handleSettingsUpload() {
  if (dom.settingsUploadInput) dom.settingsUploadInput.click();
}

function requestSettingsPresetImportConflict(name) {
  const dialog = dom.settingsImportConflictDialog;
  if (!dialog || typeof dialog.showModal !== "function") {
    return Promise.resolve("cancel");
  }

  dom.settingsImportConflictMessage.textContent =
    `A preset named "${name}" already exists. Choose OK to overwrite it, ` +
    "Skip to keep the existing preset and continue, or Cancel to stop the import.";
  dialog.returnValue = "";

  return new Promise((resolve) => {
    const handleClose = () => {
      dialog.removeEventListener("cancel", handleCancel);
      const choice = ["overwrite", "skip"].includes(dialog.returnValue)
        ? dialog.returnValue
        : "cancel";
      resolve(choice);
    };
    const handleCancel = (event) => {
      event.preventDefault();
      dialog.close("cancel");
    };

    dialog.addEventListener("close", handleClose, { once: true });
    dialog.addEventListener("cancel", handleCancel);
    dialog.showModal();
    if (dom.settingsImportConflictSkipButton) {
      dom.settingsImportConflictSkipButton.focus();
    }
  });
}

function formatPresetImportCount(count) {
  return `${count} preset${count === 1 ? "" : "s"}`;
}

async function importSettingsPresets(text) {
  const candidates = uiSettingsStore.parsePresetImport(text);
  const names = Object.keys(candidates);
  if (!names.length) {
    setFileStatus(dom.settingsFileStatus, "No presets found in file.");
    return;
  }

  const existingNames = new Set(uiSettingsStore.listPresets());
  const accepted = {};
  let overwritten = 0;
  let skipped = 0;

  for (const name of names) {
    if (existingNames.has(name)) {
      const choice = await requestSettingsPresetImportConflict(name);
      if (choice === "cancel") {
        setFileStatus(
          dom.settingsFileStatus,
          "Import canceled. No presets were changed.",
        );
        return;
      }
      if (choice === "skip") {
        skipped += 1;
        continue;
      }
      overwritten += 1;
    }
    accepted[name] = candidates[name];
  }

  const acceptedCount = Object.keys(accepted).length;
  if (!acceptedCount) {
    setFileStatus(
      dom.settingsFileStatus,
      `No presets imported. Skipped ${skipped} existing preset${
        skipped === 1 ? "" : "s"
      }.`,
    );
    return;
  }

  const imported = uiSettingsStore.importPresets({ presets: accepted });
  if (!imported) {
    setFileStatus(dom.settingsFileStatus, "Presets could not be imported.");
    return;
  }

  refreshSettingsPresetOptions();
  const details = [];
  if (overwritten) details.push(`${overwritten} overwritten`);
  if (skipped) details.push(`${skipped} skipped`);
  setFileStatus(
    dom.settingsFileStatus,
    `Imported ${formatPresetImportCount(imported)}${
      details.length ? ` (${details.join(", ")})` : ""
    }.`,
  );
}

function handleSettingsUploadFile(event) {
  if (!uiSettingsStore) return;
  readJsonFileInput(
    event.target,
    async (text) => {
      try {
        await importSettingsPresets(text);
      } finally {
        if (dom.settingsUploadButton) dom.settingsUploadButton.focus();
      }
    },
    () => {
      setFileStatus(dom.settingsFileStatus, "Preset file could not be read.");
    },
  );
}

function normalizeGoalValue(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 999) return 999;
  return parsed;
}

function normalizeWorkoutGoals(source) {
  if (!source || typeof source !== "object") {
    return { correct: 0, total: 0 };
  }
  const payload =
    source.goals && typeof source.goals === "object" ? source.goals : source;
  const has = (key) =>
    payload && Object.prototype.hasOwnProperty.call(payload, key);
  const correct = normalizeGoalValue(
    has("correct")
      ? payload.correct
      : has("goal")
        ? payload.goal
        : has("target")
          ? payload.target
          : 0,
  );
  const total = normalizeGoalValue(
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

function readWorkoutGoalInputs() {
  const inputs = dom.workoutGoalInputs || {};
  const correct =
    inputs.correct && "value" in inputs.correct ? inputs.correct.value : 0;
  const total =
    inputs.total && "value" in inputs.total ? inputs.total.value : 0;
  return {
    correct: normalizeGoalValue(correct),
    total: normalizeGoalValue(total),
  };
}

function resetWorkoutGoalInputs() {
  const inputs = dom.workoutGoalInputs || {};
  if (inputs.correct && "value" in inputs.correct) {
    inputs.correct.value = "0";
  }
  if (inputs.total && "value" in inputs.total) {
    inputs.total.value = "0";
  }
}

function clonePlainValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => clonePlainValue(item));
  }
  if (value && typeof value === "object") {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = clonePlainValue(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function getEmbeddedWorkoutSettings(entry) {
  return entry && entry.settings && typeof entry.settings === "object"
    ? entry.settings
    : null;
}

function getWorkoutEntryPresetSnapshot(entry, presets = getPresetSnapshots()) {
  const embedded = getEmbeddedWorkoutSettings(entry);
  if (embedded) return embedded;
  const presetName =
    entry && typeof entry.preset === "string" ? entry.preset : "";
  return presetName && presets[presetName] ? presets[presetName] : null;
}

function createWorkoutEntrySnapshot(entry, presetSnapshot) {
  const snapshot = {
    preset: entry.preset,
    goals: normalizeWorkoutGoals(entry),
    category: resolveEntryCategory(entry, presetSnapshot),
  };
  if (presetSnapshot && typeof presetSnapshot === "object") {
    snapshot.settings = clonePlainValue(presetSnapshot);
  }
  return snapshot;
}

function cloneWorkoutEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return {
      preset: "",
      goals: { correct: 0, total: 0 },
      category: null,
    };
  }
  const preset = typeof entry.preset === "string" ? entry.preset.trim() : "";
  const cloned = {
    preset,
    goals: normalizeWorkoutGoals(entry),
    category:
      typeof entry.category === "string" && statCategoryLabels[entry.category]
        ? entry.category
        : null,
  };
  const settings = getEmbeddedWorkoutSettings(entry);
  if (settings) {
    cloned.settings = clonePlainValue(settings);
  }
  return cloned;
}

function getPresetSnapshots() {
  if (!uiSettingsStore || typeof uiSettingsStore.loadPresets !== "function") {
    return {};
  }
  return uiSettingsStore.loadPresets() || {};
}

function inferCategoryFromPresetSnapshot(preset) {
  if (!preset || typeof preset !== "object") return null;
  const mode =
    typeof preset.mode === "string" ? preset.mode : preset.selectedMode;
  if (typeof mode !== "string") return null;
  return modeStatCategoryMap[mode] || null;
}

function resolveEntryCategory(entry, preset) {
  const inferred = inferCategoryFromPresetSnapshot(preset);
  if (inferred) return inferred;
  if (
    entry &&
    typeof entry.category === "string" &&
    statCategoryLabels[entry.category]
  ) {
    return entry.category;
  }
  return null;
}

function describeFlow(preset) {
  if (!preset || typeof preset !== "object" || !preset.flow) return null;
  const flow = preset.flow;
  const mode = typeof flow.mode === "string" ? flow.mode : null;
  let label = null;
  if (mode && Object.prototype.hasOwnProperty.call(flowModeLabels, mode)) {
    label = flowModeLabels[mode];
  } else if (mode) {
    label = mode.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
  if (!label) return null;
  if (mode === "random") return label;
  const startKey =
    typeof flow.startKey === "string" && flow.startKey ? flow.startKey : null;
  return startKey ? `${label} (start ${startKey})` : label;
}

function buildWorkoutEntryMeta(entry, preset) {
  const parts = [];
  const category = resolveEntryCategory(entry, preset);
  const label = category ? statCategoryLabels[category] : null;
  const goals = normalizeWorkoutGoals(entry);
  const segments = [];
  if (goals.correct > 0) {
    segments.push(`${goals.correct} correct`);
  }
  if (goals.total > 0) {
    segments.push(`${goals.total} total`);
  }
  const hasGoals = segments.length > 0;
  const goalText = hasGoals
    ? `${segments.length > 1 ? "Goals" : "Goal"} ${segments.join(" / ")}`
    : "Goal 0";
  parts.push(label ? `${goalText} ${label}` : goalText);
  const flowText = describeFlow(preset);
  if (flowText) parts.push(flowText);
  return parts.join(" · ");
}

function createWorkoutEntryButton(label, action, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  if (disabled) button.disabled = true;
  return button;
}

function refreshWorkoutSelect(selectedName) {
  const select = dom.workoutSelect;
  if (
    !select ||
    typeof select.appendChild !== "function" ||
    typeof document === "undefined"
  ) {
    return;
  }
  const currentValue =
    typeof selectedName === "string" ? selectedName : select.value;
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
  const workouts =
    uiWorkoutStore && typeof uiWorkoutStore.listWorkouts === "function"
      ? uiWorkoutStore.listWorkouts()
      : [];
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = workouts.length
    ? "Select a workout"
    : "No workouts saved";
  placeholder.disabled = !workouts.length;
  placeholder.selected = true;
  select.appendChild(placeholder);
  workouts.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  if (workouts.includes(currentValue)) {
    select.value = currentValue;
  } else if (workouts.includes(workoutState.originalName)) {
    select.value = workoutState.originalName;
  } else {
    select.value = "";
  }
  select.disabled = !workouts.length;
  updateTrainingSetupSummary();
}

function updateWorkoutControls() {
  if (dom.workoutSaveButton) {
    const hasName = !!workoutState.draftName.trim();
    const hasEntries = workoutState.entries.length > 0;
    dom.workoutSaveButton.disabled = !(hasName && hasEntries);
  }
  if (dom.workoutDeleteButton) {
    dom.workoutDeleteButton.disabled = !workoutState.originalName;
  }
}

function renderWorkoutEntries() {
  const container = dom.workoutEntriesPanel;
  if (
    !container ||
    typeof container.appendChild !== "function" ||
    typeof document === "undefined"
  ) {
    return;
  }
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  if (!workoutState.entries.length) {
    const empty = document.createElement("div");
    empty.className = "workoutEmpty";
    empty.textContent = "No entries added yet.";
    container.appendChild(empty);
    return;
  }
  const presets = getPresetSnapshots();
  workoutState.entries.forEach((entry, index) => {
    const preset = getWorkoutEntryPresetSnapshot(entry, presets);
    const row = document.createElement("div");
    row.className = "workoutEntry";
    if (index === workoutState.activeIndex) {
      row.classList.add("active");
    }
    row.dataset.index = String(index);
    const info = document.createElement("div");
    info.className = "workoutEntryInfo";
    const title = document.createElement("p");
    title.className = "workoutEntryTitle";
    if (preset) {
      title.textContent = entry.preset;
    } else {
      title.textContent = `${entry.preset} (missing preset)`;
      title.classList.add("workoutPresetMissing");
    }
    info.appendChild(title);
    const meta = document.createElement("p");
    meta.className = "workoutEntryMeta";
    meta.textContent = buildWorkoutEntryMeta(entry, preset);
    info.appendChild(meta);
    row.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "workoutEntryActions";
    actions.appendChild(createWorkoutEntryButton("Apply", "apply"));
    actions.appendChild(createWorkoutEntryButton("Up", "up", index === 0));
    actions.appendChild(
      createWorkoutEntryButton(
        "Down",
        "down",
        index === workoutState.entries.length - 1,
      ),
    );
    actions.appendChild(createWorkoutEntryButton("Remove", "remove"));
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function renderWorkoutEditor() {
  if (
    dom.workoutNameInput &&
    dom.workoutNameInput.value !== workoutState.draftName
  ) {
    dom.workoutNameInput.value = workoutState.draftName;
  }
  renderWorkoutEntries();
  updateWorkoutControls();
  updateTrainingSetupSummary();
}

function setWorkoutStateFromRecord(record) {
  workoutState.originalName = record && record.name ? record.name : "";
  workoutState.draftName = workoutState.originalName;
  workoutState.entries =
    record && Array.isArray(record.entries)
      ? record.entries.map((entry) => cloneWorkoutEntry(entry))
      : [];
  workoutState.activeIndex = -1;
  workoutState.dirty = false;
}

function resetWorkoutState() {
  workoutState.originalName = "";
  workoutState.draftName = "";
  workoutState.entries = [];
  workoutState.activeIndex = -1;
  workoutState.dirty = false;
}

function refreshWorkoutPresetOptions() {
  const select = dom.workoutPresetSelect;
  if (
    !select ||
    typeof select.appendChild !== "function" ||
    typeof document === "undefined"
  ) {
    return;
  }
  const current = select.value;
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
  const presets =
    uiSettingsStore && typeof uiSettingsStore.listPresets === "function"
      ? uiSettingsStore.listPresets()
      : [];
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = presets.length
    ? "Select a preset"
    : "No presets saved";
  placeholder.disabled = !presets.length;
  placeholder.selected = true;
  select.appendChild(placeholder);
  presets.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  if (presets.includes(current)) {
    select.value = current;
  } else {
    select.value = "";
  }
  select.disabled = !presets.length;
  if (
    dom.workoutAddEntryButton &&
    typeof dom.workoutAddEntryButton.disabled !== "undefined"
  ) {
    dom.workoutAddEntryButton.disabled = !presets.length;
  }
}

function handleWorkoutSelectChange() {
  if (!dom.workoutSelect) return;
  const name = dom.workoutSelect.value;
  if (!name) {
    resetWorkoutState();
    renderWorkoutEditor();
    if (
      uiWorkoutStore &&
      typeof uiWorkoutStore.clearLastSelection === "function"
    ) {
      uiWorkoutStore.clearLastSelection();
    }
    updateTrainingSetupSummary();
    return;
  }
  if (!uiWorkoutStore || typeof uiWorkoutStore.getWorkout !== "function") {
    return;
  }
  const record = uiWorkoutStore.getWorkout(name);
  if (!record) {
    alert("Workout could not be loaded.");
    refreshWorkoutSelect("");
    resetWorkoutState();
    renderWorkoutEditor();
    return;
  }
  setWorkoutStateFromRecord(record);
  const selection =
    uiWorkoutStore && typeof uiWorkoutStore.getLastSelection === "function"
      ? uiWorkoutStore.getLastSelection()
      : null;
  if (
    selection &&
    selection.workout === record.name &&
    Number.isFinite(selection.entryIndex) &&
    selection.entryIndex >= 0 &&
    selection.entryIndex < workoutState.entries.length
  ) {
    workoutState.activeIndex = selection.entryIndex;
  }
  renderWorkoutEditor();
  refreshWorkoutSelect(record.name);
  dom.workoutSelect.value = record.name;
  updateTrainingSetupSummary();
}

function handleWorkoutNameInput(event) {
  workoutState.draftName = event.target.value;
  workoutState.dirty = true;
  updateWorkoutControls();
  updateTrainingSetupSummary();
}

function handleWorkoutNew() {
  resetWorkoutState();
  renderWorkoutEditor();
  refreshWorkoutSelect("");
  if (dom.workoutSelect) {
    dom.workoutSelect.value = "";
  }
  setFileStatus(dom.workoutFileStatus, "");
  if (
    uiWorkoutStore &&
    typeof uiWorkoutStore.clearLastSelection === "function"
  ) {
    uiWorkoutStore.clearLastSelection();
  }
  updateTrainingSetupSummary();
}

function handleWorkoutSave() {
  if (!uiWorkoutStore || typeof uiWorkoutStore.saveWorkout !== "function") {
    return;
  }
  const name = workoutState.draftName.trim();
  if (!name) {
    alert("Enter a workout name before saving.");
    return;
  }
  if (!workoutState.entries.length) {
    alert("Add at least one entry to the workout before saving.");
    return;
  }
  const overwriting =
    workoutState.originalName !== name &&
    typeof uiWorkoutStore.hasWorkout === "function" &&
    uiWorkoutStore.hasWorkout(name);
  if (overwriting) {
    const confirmed = confirm(`Overwrite existing workout "${name}"?`);
    if (!confirmed) return;
  }
  const presets = getPresetSnapshots();
  const entriesToSave = workoutState.entries.map((entry) => {
    const preset =
      presets[entry.preset] || getWorkoutEntryPresetSnapshot(entry);
    return createWorkoutEntrySnapshot(entry, preset);
  });
  const saved = uiWorkoutStore.saveWorkout(name, entriesToSave);
  if (!saved) {
    alert("Workout could not be saved.");
    return;
  }
  if (
    workoutState.originalName &&
    workoutState.originalName !== name &&
    typeof uiWorkoutStore.deleteWorkout === "function"
  ) {
    uiWorkoutStore.deleteWorkout(workoutState.originalName);
  }
  workoutState.originalName = name;
  workoutState.draftName = name;
  workoutState.entries = entriesToSave.map((entry) => cloneWorkoutEntry(entry));
  workoutState.dirty = false;
  refreshWorkoutSelect(name);
  renderWorkoutEditor();
  if (dom.workoutSelect) {
    dom.workoutSelect.value = name;
  }
  if (uiWorkoutStore && typeof uiWorkoutStore.setLastSelection === "function") {
    const active =
      workoutState.activeIndex >= 0 &&
      workoutState.activeIndex < workoutState.entries.length
        ? workoutState.activeIndex
        : 0;
    uiWorkoutStore.setLastSelection(name, active);
  }
  setFileStatus(dom.workoutFileStatus, `Saved workout "${name}".`);
  updateTrainingSetupSummary();
}

function handleWorkoutDelete() {
  if (!uiWorkoutStore || typeof uiWorkoutStore.deleteWorkout !== "function") {
    resetWorkoutState();
    renderWorkoutEditor();
    refreshWorkoutSelect("");
    return;
  }
  if (!workoutState.originalName) {
    resetWorkoutState();
    renderWorkoutEditor();
    refreshWorkoutSelect("");
    return;
  }
  const confirmed = confirm(`Delete workout "${workoutState.originalName}"?`);
  if (!confirmed) return;
  uiWorkoutStore.deleteWorkout(workoutState.originalName);
  const deletedName = workoutState.originalName;
  resetWorkoutState();
  renderWorkoutEditor();
  refreshWorkoutSelect("");
  if (
    uiWorkoutStore &&
    typeof uiWorkoutStore.clearLastSelection === "function"
  ) {
    uiWorkoutStore.clearLastSelection();
  }
  setFileStatus(dom.workoutFileStatus, `Deleted workout "${deletedName}".`);
  updateTrainingSetupSummary();
}

function handleWorkoutDownload() {
  if (!uiWorkoutStore || typeof uiWorkoutStore.exportWorkouts !== "function") {
    return;
  }
  downloadJsonFile("chord.workouts", uiWorkoutStore.exportWorkouts(true));
  setFileStatus(dom.workoutFileStatus, "Exported workouts.");
}

function handleWorkoutUpload() {
  if (dom.workoutUploadInput) dom.workoutUploadInput.click();
}

function handleWorkoutUploadFile(event) {
  if (!uiWorkoutStore || typeof uiWorkoutStore.importWorkouts !== "function") {
    return;
  }
  readJsonFileInput(
    event.target,
    (text) => {
      const imported = uiWorkoutStore.importWorkouts(text);
      if (!imported) {
        setFileStatus(dom.workoutFileStatus, "No workouts found in file.");
        return;
      }
      initWorkoutsPanel();
      setFileStatus(
        dom.workoutFileStatus,
        `Imported ${imported} workout${imported === 1 ? "" : "s"}.`,
      );
    },
    () => {
      setFileStatus(dom.workoutFileStatus, "Workout file could not be read.");
    },
  );
}

function handleWorkoutAddEntry() {
  if (!dom.workoutPresetSelect) return;
  const presetName = dom.workoutPresetSelect.value
    ? dom.workoutPresetSelect.value.trim()
    : "";
  if (!presetName) {
    alert("Select a preset before adding an entry.");
    return;
  }
  const presets = getPresetSnapshots();
  const preset = presets[presetName] || null;
  const category = inferCategoryFromPresetSnapshot(preset);
  const goals = readWorkoutGoalInputs();
  workoutState.entries.push(
    createWorkoutEntrySnapshot(
      {
        preset: presetName,
        goals,
        category,
      },
      preset,
    ),
  );
  workoutState.dirty = true;
  if (dom.workoutPresetSelect) {
    dom.workoutPresetSelect.value = "";
  }
  resetWorkoutGoalInputs();
  renderWorkoutEditor();
}

function handleWorkoutEntryClick(event) {
  const button = event.target && event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  if (!action) return;
  const row = button.closest(".workoutEntry");
  if (!row) return;
  const index = parseInt(row.dataset.index, 10);
  if (!Number.isFinite(index)) return;
  if (action === "apply") {
    applyWorkoutEntry(index);
    return;
  }
  if (action === "remove") {
    workoutState.entries.splice(index, 1);
    if (workoutState.activeIndex === index) {
      workoutState.activeIndex = -1;
    } else if (workoutState.activeIndex > index) {
      workoutState.activeIndex -= 1;
    }
    workoutState.dirty = true;
    renderWorkoutEditor();
    return;
  }
  if (action === "up" && index > 0) {
    const [entry] = workoutState.entries.splice(index, 1);
    workoutState.entries.splice(index - 1, 0, entry);
    if (workoutState.activeIndex === index) {
      workoutState.activeIndex = index - 1;
    } else if (workoutState.activeIndex === index - 1) {
      workoutState.activeIndex = index;
    }
    workoutState.dirty = true;
    renderWorkoutEditor();
    return;
  }
  if (
    action === "down" &&
    index >= 0 &&
    index < workoutState.entries.length - 1
  ) {
    const [entry] = workoutState.entries.splice(index, 1);
    workoutState.entries.splice(index + 1, 0, entry);
    if (workoutState.activeIndex === index) {
      workoutState.activeIndex = index + 1;
    } else if (workoutState.activeIndex === index + 1) {
      workoutState.activeIndex = index;
    }
    workoutState.dirty = true;
    renderWorkoutEditor();
  }
}

function applyWorkoutEntry(index) {
  if (!uiSettingsStore) {
    return;
  }
  const entry = workoutState.entries[index];
  if (!entry) return;
  const presetName = entry.preset;
  const presets = getPresetSnapshots();
  const embeddedSettings = getEmbeddedWorkoutSettings(entry);
  const presetSnapshot = getWorkoutEntryPresetSnapshot(entry, presets);
  if (!presetName && !presetSnapshot) return;
  const loaded =
    embeddedSettings &&
    typeof uiSettingsStore.applyPresetSettings === "function"
      ? uiSettingsStore.applyPresetSettings(embeddedSettings)
      : typeof uiSettingsStore.loadPreset === "function"
        ? uiSettingsStore.loadPreset(presetName)
        : false;
  if (!loaded) {
    alert(`Preset "${presetName}" could not be loaded.`);
    return;
  }
  if (
    dom.settingsPresetSelect &&
    getSelectableOptionValues(dom.settingsPresetSelect).includes(presetName)
  ) {
    dom.settingsPresetSelect.value = presetName;
  }
  updatePresetActionButtons();
  syncProgressionParameterControls();
  let category = resolveEntryCategory(entry, presetSnapshot);
  if (!category && typeof uiSettingsStore.getCurrentSnapshot === "function") {
    const snapshot = uiSettingsStore.getCurrentSnapshot();
    if (snapshot && typeof snapshot.mode === "string") {
      category = modeStatCategoryMap[snapshot.mode] || null;
    }
  }
  if (!category) {
    category = "chords";
  }
  const goals = normalizeWorkoutGoals(entry);
  const goalInputs =
    dom.statGoals && dom.statGoals[category] ? dom.statGoals[category] : null;
  if (goalInputs) {
    if (goalInputs.correct && "value" in goalInputs.correct) {
      goalInputs.correct.value = String(goals.correct);
    }
    if (goalInputs.total && "value" in goalInputs.total) {
      goalInputs.total.value = String(goals.total);
    }
  }
  syncSettingsStore();
  workoutState.activeIndex = index;
  renderWorkoutEntries();
  if (
    uiWorkoutStore &&
    typeof uiWorkoutStore.setLastSelection === "function" &&
    workoutState.originalName
  ) {
    uiWorkoutStore.setLastSelection(workoutState.originalName, index);
  }
  updateTrainingSetupSummary();
}

function initWorkoutsPanel() {
  if (typeof document === "undefined") return;
  refreshWorkoutPresetOptions();
  refreshWorkoutSelect(workoutState.originalName);
  const workouts =
    uiWorkoutStore && typeof uiWorkoutStore.listWorkouts === "function"
      ? uiWorkoutStore.listWorkouts()
      : [];
  let initialName = null;
  const selection =
    uiWorkoutStore && typeof uiWorkoutStore.getLastSelection === "function"
      ? uiWorkoutStore.getLastSelection()
      : null;
  if (selection && workouts.includes(selection.workout)) {
    initialName = selection.workout;
  }
  if (initialName) {
    const record = uiWorkoutStore.getWorkout(initialName);
    if (record) {
      setWorkoutStateFromRecord(record);
      if (
        selection &&
        selection.workout === initialName &&
        Number.isFinite(selection.entryIndex) &&
        selection.entryIndex >= 0 &&
        selection.entryIndex < workoutState.entries.length
      ) {
        workoutState.activeIndex = selection.entryIndex;
      }
    } else {
      resetWorkoutState();
    }
    refreshWorkoutSelect(initialName);
    if (dom.workoutSelect) {
      dom.workoutSelect.value = initialName;
    }
  } else {
    resetWorkoutState();
    refreshWorkoutSelect("");
    if (dom.workoutSelect) {
      dom.workoutSelect.value = "";
    }
  }
  renderWorkoutEditor();
  resetWorkoutGoalInputs();
}

if (
  dom.workoutSelect &&
  typeof dom.workoutSelect.addEventListener === "function"
) {
  dom.workoutSelect.addEventListener("change", handleWorkoutSelectChange);
}

if (
  dom.settingsPresetSelect &&
  typeof dom.settingsPresetSelect.addEventListener === "function"
) {
  dom.settingsPresetSelect.addEventListener(
    "change",
    handleSettingsPresetSelectChange,
  );
}

if (
  dom.settingsPresetPrevButton &&
  typeof dom.settingsPresetPrevButton.addEventListener === "function"
) {
  dom.settingsPresetPrevButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stepActiveSettingsPreset(-1);
  });
}

if (
  dom.settingsPresetNextButton &&
  typeof dom.settingsPresetNextButton.addEventListener === "function"
) {
  dom.settingsPresetNextButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stepActiveSettingsPreset(1);
  });
}

if (
  dom.workoutPrevButton &&
  typeof dom.workoutPrevButton.addEventListener === "function"
) {
  dom.workoutPrevButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stepSelectValue(dom.workoutSelect, -1);
  });
}

if (
  dom.workoutNextButton &&
  typeof dom.workoutNextButton.addEventListener === "function"
) {
  dom.workoutNextButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stepSelectValue(dom.workoutSelect, 1);
  });
}

if (
  dom.workoutNameInput &&
  typeof dom.workoutNameInput.addEventListener === "function"
) {
  dom.workoutNameInput.addEventListener("input", handleWorkoutNameInput);
}

if (
  dom.workoutNewButton &&
  typeof dom.workoutNewButton.addEventListener === "function"
) {
  dom.workoutNewButton.addEventListener("click", handleWorkoutNew);
}

if (
  dom.workoutSaveButton &&
  typeof dom.workoutSaveButton.addEventListener === "function"
) {
  dom.workoutSaveButton.addEventListener("click", handleWorkoutSave);
}

if (
  dom.workoutDeleteButton &&
  typeof dom.workoutDeleteButton.addEventListener === "function"
) {
  dom.workoutDeleteButton.addEventListener("click", handleWorkoutDelete);
}

if (
  dom.workoutDownloadButton &&
  typeof dom.workoutDownloadButton.addEventListener === "function"
) {
  dom.workoutDownloadButton.addEventListener("click", handleWorkoutDownload);
}

if (
  dom.workoutUploadButton &&
  typeof dom.workoutUploadButton.addEventListener === "function"
) {
  dom.workoutUploadButton.addEventListener("click", handleWorkoutUpload);
}

if (
  dom.workoutUploadInput &&
  typeof dom.workoutUploadInput.addEventListener === "function"
) {
  dom.workoutUploadInput.addEventListener("change", handleWorkoutUploadFile);
}

if (
  dom.workoutAddEntryButton &&
  typeof dom.workoutAddEntryButton.addEventListener === "function"
) {
  dom.workoutAddEntryButton.addEventListener("click", handleWorkoutAddEntry);
}

if (
  dom.workoutEntriesPanel &&
  typeof dom.workoutEntriesPanel.addEventListener === "function"
) {
  dom.workoutEntriesPanel.addEventListener("click", handleWorkoutEntryClick);
}

document.addEventListener("DOMContentLoaded", () => {
  initJazzBricks();
  initScales();
  if (uiSettingsStore && typeof uiSettingsStore.subscribe === "function") {
    uiSettingsStore.subscribe(updateTrainingSetupSummary);
  }
  if (uiSettingsStore && typeof uiSettingsStore.applyToDom === "function") {
    uiSettingsStore.applyToDom(uiSettingsStore.current);
  }
  if (
    uiSettingsStore &&
    typeof uiSettingsStore.attachDomListeners === "function"
  ) {
    uiSettingsStore.attachDomListeners();
  }
  if (uiSettingsStore && typeof uiSettingsStore.syncFromDom === "function") {
    uiSettingsStore.syncFromDom();
  }
  syncProgressionParameterControls();
  initMIDI();
  if (dom.midiRefreshButton) {
    dom.midiRefreshButton.addEventListener("click", () => {
      if (typeof refreshMIDIDevices === "function") {
        refreshMIDIDevices();
      }
    });
  }

  if (typeof spacedRepRenderList === "function") spacedRepRenderList();

  dom.optionsTabKeys.checked = true;
  optionsChange();

  refreshSettingsPresetOptions();
  initWorkoutsPanel();
  dom.settingsPresetName.addEventListener(
    "input",
    handleSettingsPresetNameInput,
  );
  dom.settingsCreateButton.addEventListener("click", handleSettingsCreate);
  dom.settingsUpdateButton.addEventListener("click", handleSettingsUpdate);
  dom.settingsActivateButton.addEventListener("click", handleSettingsActivate);
  dom.settingsDeleteButton.addEventListener("click", handleSettingsDelete);
  dom.settingsDownloadButton.addEventListener("click", handleSettingsDownload);
  dom.settingsUploadButton.addEventListener("click", handleSettingsUpload);
  dom.settingsUploadInput.addEventListener("change", handleSettingsUploadFile);
  initQuickResetActions();
  initDataResetActions();
});

Object.entries(dom.statGoals || {}).forEach(([category, inputs]) => {
  if (!inputs) return;
  ["correct", "total"].forEach((key) => {
    const input = inputs[key];
    if (!input || typeof input.addEventListener !== "function") return;
    input.addEventListener("input", () => {
      if (typeof uiGlobals.updateStatGoalStatus === "function") {
        uiGlobals.updateStatGoalStatus(category);
      } else if (typeof uiGlobals.updateStatGoalStatuses === "function") {
        uiGlobals.updateStatGoalStatuses();
      }
    });
  });
});
