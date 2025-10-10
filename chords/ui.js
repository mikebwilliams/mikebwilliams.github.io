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

dom.showKeyboardToggle.addEventListener("click", () => {
  dom.piano.style.display = dom.showKeyboardToggle.checked ? "block" : "none";
});

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

function getEnabledScales() {
  const enabledScales = [];

  for (let key in scales) {
    if (scales.hasOwnProperty(key)) {
      if (dom.scaleCheckboxes[key].checked) {
        enabledScales.push(key);
      }
    }
  }

  return enabledScales;
}

function getEnabledScaleDetails() {
  const enabledScaleDetails = [];

  for (let key in scales) {
    if (scales.hasOwnProperty(key)) {
      if (dom.scaleCheckboxes[key].checked) {
        enabledScaleDetails.push(scales[key]);
      }
    }
  }

  return enabledScaleDetails;
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

  dom.spacedRepClearButton.addEventListener("click", () => {
    if (typeof spacedRepClearAll === "function") spacedRepClearAll();
  });
  if (typeof spacedRepRenderList === "function") spacedRepRenderList();

  dom.optionsTabKeys.checked = true;
  optionsChange();
});

dom.resetStatsButton.addEventListener("click", () => {
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
});
