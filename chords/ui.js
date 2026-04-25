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
  tabSongs: "progressions",
  tabDegrees: "degrees",
  tabScales: "scales",
  tabJazz: "bricks",
};

const statCategoryLabels = {
  chords: "Chords",
  progressions: "Progressions",
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

// Disable chord types that have fewer than 4 notes (triads/sus)
// whenever a non-default voicing is selected. Re-enable for default,
// restoring their prior checked state.
let _prevTriadCheckedState = null;
let _lastVoicingMode = null;
function enforceVoicingChordConstraints() {
  const currentMode = getVoicingMode();
  const isDefault = currentMode === "default";
  const triadIds = getChordGroupIds("triads");

  // Capture prior checked state when leaving default mode
  if (_lastVoicingMode === "default" && !isDefault) {
    _prevTriadCheckedState = {};
    triadIds.forEach((id) => {
      _prevTriadCheckedState[id] = dom.chordCheckboxes[id].checked;
    });
  }

  triadIds.forEach((id) => {
    const el = dom.chordCheckboxes[id];
    if (isDefault) {
      el.disabled = false;
      // Restore previous checked state if we have it
      if (_prevTriadCheckedState && id in _prevTriadCheckedState) {
        el.checked = _prevTriadCheckedState[id];
      }
    } else {
      el.checked = false; // exclude from selection pool
      el.disabled = true; // visually disable
    }
  });

  if (!isDefault) {
    // Ensure at least one 4+ note chord type is selected
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

function getSelectedOptionsTab() {
  const sel = document.querySelector("input[name='options']:checked");
  return sel ? sel.value : null;
}

function optionsIs(tabValue) {
  return getSelectedOptionsTab() === tabValue;
}

function optionsChange() {
  Object.entries(dom.optionsPanels).forEach(([tabValue, panel]) => {
    panel.style.display = optionsIs(tabValue) ? "block" : "none";
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
  dom.keyPresetButtons[key].addEventListener("click", handler);
});

// Handler functions for preset buttons

function setChordCheckboxes(ids, state) {
  ids.forEach((id) => {
    dom.chordCheckboxes[id].checked = state;
  });
}

const toggleAllChords = (state) => setChordCheckboxes(chordTypeIds, state);
const toggleTriadChords = (state) =>
  setChordCheckboxes(getChordGroupIds("triads"), state);
const toggleSixthChords = (state) =>
  setChordCheckboxes(getChordGroupIds("sixths"), state);
const toggleSeventhChords = (state) =>
  setChordCheckboxes(getChordGroupIds("sevenths"), state);
const toggleMajorChords = (state) =>
  setChordCheckboxes(getChordGroupIds("major"), state);
const toggleMinorChords = (state) =>
  setChordCheckboxes(getChordGroupIds("minor"), state);

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
}

// Attach the handlers
dom.skipButton.addEventListener("click", () => nextProgression());
dom.playAnswerButton.addEventListener("click", () => playAnswerNotes());

dom.progressionSelect.addEventListener("change", () => nextProgression());

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
    if (dom.songClearButton) dom.songClearButton.disabled = true;
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
  if (dom.songClearButton) dom.songClearButton.disabled = false;
  syncSongFavoriteToggle();
}

uiGlobals.refreshSongSelect = refreshSongSelect;
uiGlobals.syncSongFavoriteToggle = syncSongFavoriteToggle;
uiGlobals.syncSongKeyControls = syncSongKeyControls;

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

function handleSongClear() {
  if (!uiSongsStore) return;
  uiSongsStore.clearAll();
  refreshSongSelect();
  setSongsStatus("Cleared imported songs.");
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
if (dom.songClearButton) {
  dom.songClearButton.addEventListener("click", handleSongClear);
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
refreshSongSelect();
syncSongKeyControls();

[
  { key: "allOn", handler: () => toggleAllChords(true) },
  { key: "allOff", handler: () => toggleAllChords(false) },
  { key: "triadsOn", handler: () => toggleTriadChords(true) },
  { key: "triadsOff", handler: () => toggleTriadChords(false) },
  { key: "sixthsOn", handler: () => toggleSixthChords(true) },
  { key: "sixthsOff", handler: () => toggleSixthChords(false) },
  { key: "seventhsOn", handler: () => toggleSeventhChords(true) },
  { key: "seventhsOff", handler: () => toggleSeventhChords(false) },
  { key: "majorsOn", handler: () => toggleMajorChords(true) },
  { key: "majorsOff", handler: () => toggleMajorChords(false) },
  { key: "minorsOn", handler: () => toggleMinorChords(true) },
  { key: "minorsOff", handler: () => toggleMinorChords(false) },
].forEach(({ key, handler }) => {
  dom.chordToggleButtons[key].addEventListener("click", handler);
});

document.querySelectorAll("input[name='mode']").forEach((input) => {
  input.addEventListener("change", modeChange);
});

// Options tab listeners
document.querySelectorAll("input[name='options']").forEach((input) => {
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

function refreshSettingsPresetOptions() {
  if (!uiSettingsStore) return;
  const select = dom.settingsPresetSelect;
  const currentValue = select.value;
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
}

function handleSettingsSave() {
  if (!uiSettingsStore) return;
  const name = dom.settingsPresetName.value.trim();
  if (!name) {
    alert("Please enter a preset name before saving.");
    return;
  }
  uiSettingsStore.syncFromDom();
  uiSettingsStore.savePreset(name);
  refreshSettingsPresetOptions();
  dom.settingsPresetSelect.value = name;
}

function handleSettingsLoad() {
  if (!uiSettingsStore) return;
  const name = dom.settingsPresetSelect.value;
  if (!name) {
    alert("Select a preset to load.");
    return;
  }
  const loaded = uiSettingsStore.loadPreset(name);
  if (!loaded) {
    alert("Preset could not be loaded.");
    return;
  }
  refreshSettingsPresetOptions();
  dom.settingsPresetSelect.value = name;
}

function handleSettingsOverwrite() {
  if (!uiSettingsStore) return;
  const name = dom.settingsPresetSelect.value;
  if (!name) {
    alert("Select a preset to overwrite.");
    return;
  }
  if (!confirm(`Overwrite preset "${name}" with current settings?`)) return;
  uiSettingsStore.syncFromDom();
  uiSettingsStore.savePreset(name);
  refreshSettingsPresetOptions();
  dom.settingsPresetSelect.value = name;
  if (dom.settingsPresetName) {
    dom.settingsPresetName.value = name;
  }
}

function handleSettingsDelete() {
  if (!uiSettingsStore) return;
  const name = dom.settingsPresetSelect.value;
  if (!name) {
    alert("Select a preset to delete.");
    return;
  }
  if (!confirm(`Delete preset "${name}"?`)) return;
  uiSettingsStore.deletePreset(name);
  refreshSettingsPresetOptions();
  dom.settingsPresetSelect.value = "";
}

function handleSettingsReset() {
  if (!uiSettingsStore) return;
  if (!confirm("Reset all settings to their default values?")) return;
  uiSettingsStore.resetToDefaults();
  refreshSettingsPresetOptions();
  dom.settingsPresetSelect.value = "";
  dom.settingsPresetName.value = "";
  dom.settingsDebugPanel.textContent = "";
}

function handleSettingsExport() {
  if (!uiSettingsStore) return;
  uiSettingsStore.syncFromDom();
  dom.settingsDebugPanel.textContent = uiSettingsStore.getCurrentJSON(true);
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

function cloneWorkoutEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return {
      preset: "",
      goals: { correct: 0, total: 0 },
      category: null,
    };
  }
  const preset = typeof entry.preset === "string" ? entry.preset.trim() : "";
  return {
    preset,
    goals: normalizeWorkoutGoals(entry),
    category:
      typeof entry.category === "string" && statCategoryLabels[entry.category]
        ? entry.category
        : null,
  };
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
    const preset = presets[entry.preset] || null;
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
    actions.appendChild(createWorkoutEntryButton("Load", "load"));
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
}

function handleWorkoutNameInput(event) {
  workoutState.draftName = event.target.value;
  workoutState.dirty = true;
  updateWorkoutControls();
}

function handleWorkoutNew() {
  resetWorkoutState();
  renderWorkoutEditor();
  refreshWorkoutSelect("");
  if (dom.workoutSelect) {
    dom.workoutSelect.value = "";
  }
  if (
    uiWorkoutStore &&
    typeof uiWorkoutStore.clearLastSelection === "function"
  ) {
    uiWorkoutStore.clearLastSelection();
  }
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
    const preset = presets[entry.preset] || null;
    const category = resolveEntryCategory(entry, preset);
    return {
      preset: entry.preset,
      goals: normalizeWorkoutGoals(entry),
      category,
    };
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
  resetWorkoutState();
  renderWorkoutEditor();
  refreshWorkoutSelect("");
  if (
    uiWorkoutStore &&
    typeof uiWorkoutStore.clearLastSelection === "function"
  ) {
    uiWorkoutStore.clearLastSelection();
  }
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
  workoutState.entries.push({
    preset: presetName,
    goals,
    category,
  });
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
  if (action === "load") {
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
  if (!uiSettingsStore || typeof uiSettingsStore.loadPreset !== "function") {
    return;
  }
  const entry = workoutState.entries[index];
  if (!entry) return;
  const presetName = entry.preset;
  if (!presetName) return;
  const loaded = uiSettingsStore.loadPreset(presetName);
  if (!loaded) {
    alert(`Preset "${presetName}" could not be loaded.`);
    return;
  }
  const presets = getPresetSnapshots();
  const presetSnapshot = presets[presetName] || null;
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
  } else if (workouts.length) {
    initialName = workouts[0];
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
  initMIDI();
  if (dom.midiRefreshButton) {
    dom.midiRefreshButton.addEventListener("click", () => {
      if (typeof refreshMIDIDevices === "function") {
        refreshMIDIDevices();
      }
    });
  }

  dom.spacedRepClearButton.addEventListener("click", () => {
    if (typeof spacedRepClearAll === "function") spacedRepClearAll();
  });
  if (typeof spacedRepRenderList === "function") spacedRepRenderList();

  dom.optionsTabKeys.checked = true;
  optionsChange();

  refreshSettingsPresetOptions();
  initWorkoutsPanel();
  dom.settingsSaveButton.addEventListener("click", handleSettingsSave);
  dom.settingsLoadButton.addEventListener("click", handleSettingsLoad);
  dom.settingsOverwriteButton.addEventListener(
    "click",
    handleSettingsOverwrite,
  );
  dom.settingsDeleteButton.addEventListener("click", handleSettingsDelete);
  dom.settingsResetButton.addEventListener("click", handleSettingsReset);
  dom.settingsExportButton.addEventListener("click", handleSettingsExport);
});

dom.resetStatsButton.addEventListener("click", () => {
  if (typeof uiGlobals.resetDailyStats === "function") {
    uiGlobals.resetDailyStats();
    return;
  }
  dom.cntChordsCorrect.textContent = "0";
  dom.cntProgsCorrect.textContent = "0";
  dom.cntScalesCorrect.textContent = "0";
  dom.cntDegreesCorrect.textContent = "0";
  dom.cntBricksCorrect.textContent = "0";
  dom.cntChordsIncorrect.textContent = "0";
  dom.cntProgsIncorrect.textContent = "0";
  dom.cntScalesIncorrect.textContent = "0";
  dom.cntDegreesIncorrect.textContent = "0";
  dom.cntBricksIncorrect.textContent = "0";
  dom.cntChordsTotal.textContent = "0";
  dom.cntProgsTotal.textContent = "0";
  dom.cntScalesTotal.textContent = "0";
  dom.cntDegreesTotal.textContent = "0";
  dom.cntBricksTotal.textContent = "0";
  if (typeof uiGlobals.updateStatTotals === "function") {
    uiGlobals.updateStatTotals();
  }
  if (typeof uiGlobals.updateStatGoalStatuses === "function") {
    uiGlobals.updateStatGoalStatuses();
  }
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
