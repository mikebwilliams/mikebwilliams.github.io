let midiAccess = null;
let selectedMidiInputIds = new Set();
let selectedMidiOutputIds = new Set();

// This string is the name of the chord, with possible alternative spellings
let currentChordName = "";
// This is the name of the chord using the internal chord type string mappings
let currentChordInternalName = "";
let currentChordNotes = [];
let activeKeys = [];
let isIncorrect = false;
let awaitingKeyRelease = false;

let currentProgression = [];
let currentProgressionName = "";
let currentIndex = 0;
let keyIndex = 0;
let keys = [];
let selectedProgression = "";
let currentSongId = "";
let currentSong = null;
let currentShellVoicingAlternates = null;

const DEFAULT_START_KEY = "C";
const runtimeRoot =
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : {};
const sharedGlobals = runtimeRoot.appGlobals || {};
var dom =
  sharedGlobals.domElements || sharedGlobals.dom || runtimeRoot.dom || {};
const logicSettingsStore =
  sharedGlobals.settingsStore || runtimeRoot.settingsStore || null;
const logicSongsStore =
  sharedGlobals.songsStore || runtimeRoot.songsStore || null;
const documentAvailable =
  "hasDocument" in sharedGlobals
    ? !!sharedGlobals.hasDocument
    : typeof document !== "undefined";

const statCategoryConfig = {
  chords: {
    correctElement: () => dom.cntChordsCorrect,
    incorrectElement: () => dom.cntChordsIncorrect,
    totalElement: () => dom.cntChordsTotal,
    correctGoalInput: () =>
      dom.statGoals && dom.statGoals.chords
        ? dom.statGoals.chords.correct
        : null,
    totalGoalInput: () =>
      dom.statGoals && dom.statGoals.chords ? dom.statGoals.chords.total : null,
    cardElement: () => (dom.statCards ? dom.statCards.chords : null),
  },
  progressions: {
    correctElement: () => dom.cntProgsCorrect,
    incorrectElement: () => dom.cntProgsIncorrect,
    totalElement: () => dom.cntProgsTotal,
    correctGoalInput: () =>
      dom.statGoals && dom.statGoals.progressions
        ? dom.statGoals.progressions.correct
        : null,
    totalGoalInput: () =>
      dom.statGoals && dom.statGoals.progressions
        ? dom.statGoals.progressions.total
        : null,
    cardElement: () => (dom.statCards ? dom.statCards.progressions : null),
  },
  degrees: {
    correctElement: () => dom.cntDegreesCorrect,
    incorrectElement: () => dom.cntDegreesIncorrect,
    totalElement: () => dom.cntDegreesTotal,
    correctGoalInput: () =>
      dom.statGoals && dom.statGoals.degrees
        ? dom.statGoals.degrees.correct
        : null,
    totalGoalInput: () =>
      dom.statGoals && dom.statGoals.degrees
        ? dom.statGoals.degrees.total
        : null,
    cardElement: () => (dom.statCards ? dom.statCards.degrees : null),
  },
  scales: {
    correctElement: () => dom.cntScalesCorrect,
    incorrectElement: () => dom.cntScalesIncorrect,
    totalElement: () => dom.cntScalesTotal,
    correctGoalInput: () =>
      dom.statGoals && dom.statGoals.scales
        ? dom.statGoals.scales.correct
        : null,
    totalGoalInput: () =>
      dom.statGoals && dom.statGoals.scales ? dom.statGoals.scales.total : null,
    cardElement: () => (dom.statCards ? dom.statCards.scales : null),
  },
  bricks: {
    correctElement: () => dom.cntBricksCorrect,
    incorrectElement: () => dom.cntBricksIncorrect,
    totalElement: () => dom.cntBricksTotal,
    correctGoalInput: () =>
      dom.statGoals && dom.statGoals.bricks
        ? dom.statGoals.bricks.correct
        : null,
    totalGoalInput: () =>
      dom.statGoals && dom.statGoals.bricks ? dom.statGoals.bricks.total : null,
    cardElement: () => (dom.statCards ? dom.statCards.bricks : null),
  },
};

function parseCountFromElement(element) {
  if (!element || typeof element.textContent !== "string") return 0;
  const parsed = parseInt(element.textContent, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseGoalValue(input) {
  if (!input || typeof input.value === "undefined") return 0;
  const parsed = parseInt(input.value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 999) return 999;
  return parsed;
}

function updateStatTotal(category) {
  const resolve = statCategoryConfig[category];
  if (!resolve || typeof resolve.totalElement !== "function") return;
  const totalEl = resolve.totalElement();
  if (!totalEl) return;
  const correctValue = parseCountFromElement(resolve.correctElement());
  const incorrectValue = parseCountFromElement(resolve.incorrectElement());
  totalEl.textContent = String(correctValue + incorrectValue);
}

function updateStatGoalStatus(category) {
  const resolve = statCategoryConfig[category];
  if (!resolve) return;
  const card = resolve.cardElement();
  if (!card || !card.classList || typeof card.classList.add !== "function") {
    return;
  }
  const correctGoal = parseGoalValue(resolve.correctGoalInput());
  const totalGoal = parseGoalValue(resolve.totalGoalInput());
  const correctValue = parseCountFromElement(resolve.correctElement());
  const incorrectValue = parseCountFromElement(resolve.incorrectElement());
  const totalValue = correctValue + incorrectValue;
  const meetsCorrect = correctGoal === 0 || correctValue >= correctGoal;
  const meetsTotal = totalGoal === 0 || totalValue >= totalGoal;
  if (meetsCorrect && meetsTotal && (correctGoal > 0 || totalGoal > 0)) {
    card.classList.add("goalMet");
  } else {
    card.classList.remove("goalMet");
  }
}

function updateAllStatGoalStatuses() {
  updateAllStatTotals();
  Object.keys(statCategoryConfig).forEach(updateStatGoalStatus);
}

function updateAllStatTotals() {
  Object.keys(statCategoryConfig).forEach(updateStatTotal);
}

sharedGlobals.updateStatGoalStatus = updateStatGoalStatus;
sharedGlobals.updateStatGoalStatuses = updateAllStatGoalStatuses;
sharedGlobals.updateStatTotals = updateAllStatTotals;
sharedGlobals.statGoalsChanged = updateAllStatGoalStatuses;

if (runtimeRoot && !runtimeRoot.statGoalsChanged) {
  runtimeRoot.statGoalsChanged = updateAllStatGoalStatuses;
}
if (runtimeRoot && !runtimeRoot.updateStatTotals) {
  runtimeRoot.updateStatTotals = updateAllStatTotals;
}

updateAllStatGoalStatuses();

const STATS_STORAGE_KEY = "chordChallenge.dailyStats";
let statsStorageHandle = null;
let dailyStatsState = null;

function resolveStatsStorageHandle() {
  if (statsStorageHandle) return statsStorageHandle;
  try {
    if (typeof localStorage !== "undefined") {
      statsStorageHandle = localStorage;
      return statsStorageHandle;
    }
  } catch (_) {}
  if (runtimeRoot && runtimeRoot.localStorage) {
    statsStorageHandle = runtimeRoot.localStorage;
  }
  return statsStorageHandle;
}

function formatDateKey(sourceDate) {
  const date =
    sourceDate instanceof Date ||
    (sourceDate && typeof sourceDate.getTime === "function")
      ? sourceDate
      : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeStatCounterValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 1000000) return 1000000;
  return Math.floor(parsed);
}

function createEmptyStatCounts() {
  return Object.keys(statCategoryConfig).reduce((acc, category) => {
    acc[category] = { correct: 0, incorrect: 0 };
    return acc;
  }, {});
}

function createDefaultDailyStats(dateKey = formatDateKey()) {
  return {
    date: dateKey,
    counts: createEmptyStatCounts(),
  };
}

function normalizeDailyStats(raw, fallbackDate = formatDateKey()) {
  const normalized = createDefaultDailyStats(fallbackDate);
  if (raw && typeof raw.date === "string" && raw.date.trim()) {
    normalized.date = raw.date;
  }
  if (raw && raw.counts && typeof raw.counts === "object") {
    Object.keys(normalized.counts).forEach((category) => {
      const entry = raw.counts[category];
      if (entry && typeof entry === "object") {
        normalized.counts[category] = {
          correct: sanitizeStatCounterValue(entry.correct),
          incorrect: sanitizeStatCounterValue(entry.incorrect),
        };
      }
    });
  }
  return normalized;
}

function loadDailyStatsFromStorage() {
  const todayKey = formatDateKey();
  const storage = resolveStatsStorageHandle();
  if (!storage) return createDefaultDailyStats(todayKey);
  try {
    const raw = storage.getItem(STATS_STORAGE_KEY);
    if (!raw) return createDefaultDailyStats(todayKey);
    const parsed = JSON.parse(raw);
    const normalized = normalizeDailyStats(parsed, todayKey);
    if (normalized.date !== todayKey) {
      const fresh = createDefaultDailyStats(todayKey);
      storage.setItem(STATS_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return normalized;
  } catch (_) {
    return createDefaultDailyStats(todayKey);
  }
}

function saveDailyStatsState(state = dailyStatsState) {
  const storage = resolveStatsStorageHandle();
  if (!storage || !state) return;
  try {
    storage.setItem(STATS_STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function applyDailyStatsToDom(state) {
  if (!state || !state.counts) return;
  Object.keys(statCategoryConfig).forEach((category) => {
    const counts =
      state.counts[category] && typeof state.counts[category] === "object"
        ? state.counts[category]
        : { correct: 0, incorrect: 0 };
    const correctEl = statCategoryConfig[category].correctElement();
    const incorrectEl = statCategoryConfig[category].incorrectElement();
    if (correctEl && typeof correctEl.textContent !== "undefined") {
      correctEl.textContent = String(counts.correct);
    }
    if (incorrectEl && typeof incorrectEl.textContent !== "undefined") {
      incorrectEl.textContent = String(counts.incorrect);
    }
  });
  updateAllStatGoalStatuses();
}

function ensureDailyStatsCurrent() {
  const todayKey = formatDateKey();
  if (!dailyStatsState) {
    dailyStatsState = createDefaultDailyStats(todayKey);
    return;
  }
  if (dailyStatsState.date !== todayKey) {
    dailyStatsState = createDefaultDailyStats(todayKey);
    saveDailyStatsState();
    applyDailyStatsToDom(dailyStatsState);
  }
}

function bumpDailyStat(category, { wasIncorrect, skipCorrect }) {
  if (!category) return;
  if (!dailyStatsState) {
    dailyStatsState = loadDailyStatsFromStorage();
  }
  ensureDailyStatsCurrent();
  if (!dailyStatsState.counts) {
    dailyStatsState.counts = createEmptyStatCounts();
  }
  if (!dailyStatsState.counts[category]) {
    dailyStatsState.counts[category] = { correct: 0, incorrect: 0 };
  }
  if (wasIncorrect) {
    dailyStatsState.counts[category].incorrect += 1;
  } else if (!skipCorrect) {
    dailyStatsState.counts[category].correct += 1;
  }
  saveDailyStatsState();
}

function resetDailyStats({ keepDate = true } = {}) {
  const targetDate =
    keepDate && dailyStatsState && dailyStatsState.date
      ? dailyStatsState.date
      : formatDateKey();
  dailyStatsState = createDefaultDailyStats(targetDate);
  saveDailyStatsState();
  applyDailyStatsToDom(dailyStatsState);
}

function initializeDailyStats() {
  dailyStatsState = loadDailyStatsFromStorage();
  applyDailyStatsToDom(dailyStatsState);
}

initializeDailyStats();

sharedGlobals.resetDailyStats = resetDailyStats;
if (runtimeRoot && !runtimeRoot.resetDailyStats) {
  runtimeRoot.resetDailyStats = resetDailyStats;
}

function syncSettingsStore() {
  if (
    logicSettingsStore &&
    typeof logicSettingsStore.syncFromDom === "function"
  ) {
    logicSettingsStore.syncFromDom();
  }
}

function resolveStartValue(startKey) {
  if (startKey && Object.prototype.hasOwnProperty.call(noteValues, startKey)) {
    return noteValues[startKey];
  }
  return noteValues[DEFAULT_START_KEY];
}

function preferAccidentalFor(startKey, fallback) {
  if (startKey && startKey.includes("b")) return "flat";
  if (startKey && startKey.includes("#")) return "sharp";
  return fallback;
}

function rotateSequenceToStart(sequence, startKey) {
  if (!Array.isArray(sequence) || !sequence.length) return [];
  if (!startKey) return sequence.slice();
  let idx = sequence.indexOf(startKey);
  if (idx < 0 && Object.prototype.hasOwnProperty.call(noteValues, startKey)) {
    const target = noteValues[startKey];
    idx = sequence.findIndex((name) => noteValues[name] === target);
  }
  if (idx <= 0) return sequence.slice();
  return sequence.slice(idx).concat(sequence.slice(0, idx));
}

const flowPresetMap = {
  circleOfFourths: (startKey) =>
    rotateSequenceToStart(circleOfFourths, startKey),
  circleOfFifths: (startKey) => rotateSequenceToStart(circleOfFifths, startKey),
  ascendingWholeSteps: (startKey) =>
    buildIntervalFlow(
      resolveStartValue(startKey),
      2,
      preferAccidentalFor(startKey, "sharp"),
      startKey,
    ),
  descendingWholeSteps: (startKey) =>
    buildIntervalFlow(
      resolveStartValue(startKey),
      -2,
      preferAccidentalFor(startKey, "flat"),
      startKey,
    ),
  ascendingHalfSteps: (startKey) =>
    buildIntervalFlow(
      resolveStartValue(startKey),
      1,
      preferAccidentalFor(startKey, "sharp"),
      startKey,
    ),
  descendingHalfSteps: (startKey) =>
    buildIntervalFlow(
      resolveStartValue(startKey),
      -1,
      preferAccidentalFor(startKey, "flat"),
      startKey,
    ),
  ascendingMinorThirds: (startKey) =>
    buildIntervalFlow(
      resolveStartValue(startKey),
      3,
      preferAccidentalFor(startKey, "sharp"),
      startKey,
    ),
  descendingMinorThirds: (startKey) =>
    buildIntervalFlow(
      resolveStartValue(startKey),
      -3,
      preferAccidentalFor(startKey, "flat"),
      startKey,
    ),
};

let highlightTimer;
const DEFAULT_HIGHLIGHT_DELAY_MS = 3000;

/* Unified Spaced Repetition queue */
// Entry: { kind: 'chord'|'brick', key: string, interval: number, counter: number, successStreak: number }
let spacedQueueAll = [];
let scheduledRepeat = null; // { kind, index }

function isSpacedRepetitionEnabled() {
  return dom.enableSpacedRepetition.checked;
}

function getMasteryThreshold() {
  const t = parseInt(dom.spacedRepThreshold.value, 10);
  return isNaN(t) || t < 1 ? 1 : t;
}

function isIntervalChord(chord) {
  return chord.match(/^(#|b|B)?[iIvV]{1,3}.*/);
}

function isNamedChord(chord) {
  return chord.match(/^[A-G](#|b)?/);
}

function generateChordName(root, chordType) {
  if (dom.randomizeSpellings.checked) {
    if (chordStructureNames.hasOwnProperty(chordType)) {
      chordType =
        chordStructureNames[chordType][
          Math.floor(Math.random() * chordStructureNames[chordType].length)
        ];
    }
  }

  return root + chordType;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSongChordEntry(entry) {
  return (
    !!entry &&
    typeof entry === "object" &&
    entry.kind === "songChord" &&
    typeof entry.playableChord === "string"
  );
}

function getSongChordPositionKey(measureIndex, chordIndex) {
  return `${measureIndex}:${chordIndex}`;
}

function getSongMeasureBarLabel(bar, location) {
  if (!bar || typeof bar !== "object") return "";
  if (bar.kind === "repeatStart") {
    return location === "left" ? "|:" : ":|";
  }
  if (bar.kind === "repeatEnd") return ":|";
  if (bar.kind === "double" || bar.kind === "final") return "||";
  return "";
}

function buildSongTimeSignatureHtml(measure) {
  if (!measure || !measure.showTimeSignature || !measure.timeSignature)
    return "";
  const parts = measure.timeSignature.split("/");
  if (parts.length !== 2) return "";
  return `<div class="songMeasureTimeSignature" aria-label="${escapeHtml(measure.timeSignature)}">
    <span class="songMeasureTimeSignaturePart">${escapeHtml(parts[0])}</span>
    <span class="songMeasureTimeSignatureDivider"></span>
    <span class="songMeasureTimeSignaturePart">${escapeHtml(parts[1])}</span>
  </div>`;
}

function buildSongBarHtml(bar, location) {
  if (!bar || typeof bar !== "object") return "";
  const baseClass = `songMeasureBar songMeasureBar--${escapeHtml(location)}`;

  if (bar.kind === "repeatStart" || bar.kind === "repeatEnd") {
    const dots =
      '<span class="songMeasureBarDots"><span></span><span></span></span>';
    const lines = `
      <span class="songMeasureBarLine songMeasureBarLine--thin"></span>
      <span class="songMeasureBarLine songMeasureBarLine--thick"></span>
    `;
    return `<div class="${baseClass} songMeasureBar--repeat songMeasureBar--${escapeHtml(bar.kind)}">
      ${bar.kind === "repeatEnd" ? dots : ""}
      ${lines}
      ${bar.kind === "repeatStart" ? dots : ""}
    </div>`;
  }

  if (bar.kind === "double") {
    return `<div class="${baseClass} songMeasureBar songMeasureBar--double">
      <span class="songMeasureBarLine songMeasureBarLine--thin"></span>
      <span class="songMeasureBarLine songMeasureBarLine--thin"></span>
    </div>`;
  }

  if (bar.kind === "final") {
    return `<div class="${baseClass} songMeasureBar songMeasureBar--final">
      <span class="songMeasureBarLine songMeasureBarLine--thin"></span>
      <span class="songMeasureBarLine songMeasureBarLine--thick"></span>
    </div>`;
  }

  return "";
}

function renderSongChordLabelHtml(label) {
  return escapeHtml(label).replace(
    /[♭♯]/g,
    (symbol) => `<span class="songMeasureAccidental">${symbol}</span>`,
  );
}

function buildSongChartHtml(song, activeEntry, completedEntries, hideLabels) {
  const rows = buildSongDisplayRows(song);
  if (!rows.length) return "";

  const completedKeys = new Set(
    (Array.isArray(completedEntries) ? completedEntries : [])
      .filter(isSongChordEntry)
      .map((entry) =>
        getSongChordPositionKey(entry.measureIndex, entry.chordIndex),
      ),
  );
  const activeKey = isSongChordEntry(activeEntry)
    ? getSongChordPositionKey(activeEntry.measureIndex, activeEntry.chordIndex)
    : "";

  return `<table class="songChart"><tbody>${rows
    .map(
      (row) =>
        `<tr class="songChartRow">${row
          .map((measure) => {
            const section = measure.section
              ? `<div class="songMeasureSection">${escapeHtml(measure.section)}</div>`
              : "";
            const leftRail =
              section ||
              measure.leftBar ||
              (measure.showTimeSignature && measure.timeSignature)
                ? `<div class="songMeasureLeftMeta">
                    ${section}
                    <div class="songMeasureLeftLower">
                      ${buildSongTimeSignatureHtml(measure)}
                      ${buildSongBarHtml(measure.leftBar, "left")}
                    </div>
                  </div>`
                : "";
            const rightRail = buildSongBarHtml(measure.rightBar, "right");
            const comments = measure.comments.length
              ? `<div class="songMeasureComments">${measure.comments
                  .map((comment) => escapeHtml(comment))
                  .join(" / ")}</div>`
              : "";
            const chords = measure.chords.length
              ? measure.chords
                  .map((chord) => {
                    const key = getSongChordPositionKey(
                      chord.measureIndex,
                      chord.chordIndex,
                    );
                    const classes = ["chord", "songMeasureChord"];
                    if (key === activeKey) {
                      classes.push("songMeasureChord--current");
                    } else if (completedKeys.has(key)) {
                      classes.push("songMeasureChord--complete");
                    }
                    const label = hideLabels ? "?" : chord.label || "";
                    return `<span class="${classes.join(" ")}" title="${escapeHtml(chord.rawLabel || chord.label || "")}">${hideLabels ? escapeHtml(label) : renderSongChordLabelHtml(label)}</span>`;
                  })
                  .join("")
              : '<span class="songMeasurePlaceholder">&nbsp;</span>';

            return `<td class="songMeasure">
              <div class="songMeasureFrame">
                <div class="songMeasureRail songMeasureRail--left">${leftRail}</div>
                <div class="songMeasureContent">
                  <div class="songMeasureChords">${chords}</div>
                  ${comments}
                </div>
                <div class="songMeasureRail songMeasureRail--right">${rightRail}</div>
              </div>
            </td>`;
          })
          .join("")}</tr>`,
    )
    .join("")}</tbody></table>`;
}

function addBassNoteToNotes(notes, bassNote) {
  if (
    !bassNote ||
    !Object.prototype.hasOwnProperty.call(noteValues, bassNote)
  ) {
    return notes.slice();
  }
  const bassValue = noteValues[bassNote];
  if (notes.some((note) => normalizePitchClass(note) === bassValue)) {
    return notes.slice();
  }
  return [bassValue].concat(notes);
}

function resolveProgressionEntry(entry, options = {}) {
  const wrap = options.wrap !== false;
  const shouldApplyVoicing = !!options.applyVoicing;

  if (isSongChordEntry(entry)) {
    let notes = generateNotesFromChordName(entry.playableChord);
    notes = addBassNoteToNotes(notes, entry.bassNote);
    if (shouldApplyVoicing) {
      notes = applySelectedVoicing(notes);
    }
    return {
      name: entry.label,
      notes,
      internalName: entry.playableChord,
    };
  }

  if (typeof entry !== "string") return null;

  if (isIntervalChord(entry)) {
    let [name, notes] = getIntervalChordNotesAndName(
      keys[keyIndex],
      entry,
      wrap,
    );
    if (shouldApplyVoicing) {
      notes = applySelectedVoicing(notes);
    }
    return {
      name,
      notes,
      internalName: currentChordInternalName,
    };
  }

  if (isNamedChord(entry)) {
    let notes = generateNotesFromChordName(entry);
    if (shouldApplyVoicing) {
      notes = applySelectedVoicing(notes);
    }
    return {
      name: generateChordName(entry, ""),
      notes,
      internalName: entry,
    };
  }

  return null;
}

function setRandomChord() {
  let lastChordInternalName = currentChordInternalName;

  if (isSpacedRepetitionEnabled() && spacedQueueAll.length) {
    // Find due chord entry with smallest counter
    let idx = spacedQueueAll.reduce((best, entry, i) => {
      if (entry.kind !== "chord") return best;
      if (
        entry.counter <= 0 &&
        (best < 0 || entry.counter < spacedQueueAll[best].counter)
      )
        return i;
      return best;
    }, -1);
    if (idx >= 0) {
      let entry = spacedQueueAll[idx];
      let rootMatch = entry.chord.match(/^[A-G](#|b)?/);
      let root = rootMatch[0];
      let chordType = entry.chord.slice(root.length);
      currentChordInternalName = entry.chord;
      const baseNotes = generateNotesFromChordName(entry.chord);
      currentChordNotes = applySelectedVoicing(baseNotes);
      currentChordName = generateChordName(root, chordType);
      // Prevent immediate reselection if user skips; push next due by at least one step
      entry.counter = Math.max(entry.interval, 1);
      scheduledRepeat = { kind: "chord", index: idx };
      return;
    }
    // Tick down only chord entries
    spacedQueueAll.forEach((entry) => {
      if (entry.kind === "chord") entry.counter--;
    });
  }

  const selectedChordTypes = chordTypeConfigs
    .filter(({ id }) => dom.chordCheckboxes[id].checked)
    .map(({ type }) => type);

  if (selectedChordTypes.length === 0) {
    alert("Please select at least one chord type!");
    return null;
  }

  do {
    // 'Random' root may actually be circle of fourths/fifths, and is generated in the nextKey function
    let randomRoot = keys[keyIndex];
    let randomChordType =
      selectedChordTypes[Math.floor(Math.random() * selectedChordTypes.length)];

    currentChordInternalName = randomRoot + randomChordType;
    const baseNotes = generateNotesFromChordName(currentChordInternalName);
    currentChordNotes = applySelectedVoicing(baseNotes);
    currentChordName = generateChordName(randomRoot, randomChordType);
    // Loop until we get a new chord, or the user has only selected one chord type
  } while (
    currentChordInternalName === lastChordInternalName &&
    (selectedChordTypes.length > 1 || keys.length > 1)
  );
}

function handleKeyClick(key) {
  const midiKey = Number(key);
  if (Number.isNaN(midiKey)) return;

  if (activeKeys.includes(midiKey)) {
    handleKeyReleased(midiKey);
  } else {
    handleKeyPressed(midiKey);
  }

  checkChord();
}

function handleKeyPressed(midiKey) {
  if (!Number.isFinite(midiKey)) return;

  const keyElement = document.querySelector(`.key[data-note="${midiKey}"]`);

  activeKeys.push(midiKey);

  if (getSortedAnswerNotes().includes(normalizePitchClass(midiKey))) {
    if (keyElement) keyElement.classList.add("correct");
  } else {
    if (keyElement) keyElement.classList.add("incorrect");
    isIncorrect = true;
    updateDisplay();
  }
}

function handleKeyReleased(midiKey) {
  if (!Number.isFinite(midiKey)) return;

  const keyElement = document.querySelector(`.key[data-note="${midiKey}"]`);

  const idx = activeKeys.indexOf(midiKey);
  if (idx !== -1) {
    activeKeys.splice(idx, 1);
  }

  if (keyElement) keyElement.classList.remove("correct", "incorrect");
}

function incrementTextContent(element) {
  const current = parseInt(element.textContent, 10);
  const base = Number.isNaN(current) ? 0 : current;
  element.textContent = String(base + 1);
}

function updateResultCounters({
  wasIncorrect,
  skipCorrect = false,
  correctElement,
  incorrectElement,
  category,
}) {
  if (wasIncorrect) {
    incrementTextContent(incorrectElement);
  } else if (!skipCorrect) {
    incrementTextContent(correctElement);
  }
  if (category) {
    bumpDailyStat(category, { wasIncorrect, skipCorrect });
    updateStatTotal(category);
    updateStatGoalStatus(category);
  }
}

function recordChordCompletion() {
  spacedRepHandleResult("chord", currentChordInternalName, isIncorrect);
  updateResultCounters({
    wasIncorrect: isIncorrect,
    correctElement: dom.cntChordsCorrect,
    incorrectElement: dom.cntChordsIncorrect,
    category: "chords",
  });
  isIncorrect = false;
}

function recordDegreeCompletion() {
  updateResultCounters({
    wasIncorrect: isIncorrect,
    correctElement: dom.cntDegreesCorrect,
    incorrectElement: dom.cntDegreesIncorrect,
    category: "degrees",
  });
  isIncorrect = false;
}

function handleMidiMessage(midiMessage) {
  let pressedNotes = midiMessage.data;
  let velocity = pressedNotes[2];
  let keyEvent = false;

  // Check for MIDI message type to determine if the key is pressed or released.
  if (pressedNotes[0] === 144 && velocity > 0) {
    handleKeyPressed(pressedNotes[1]);
    keyEvent = true;
  } else if (
    pressedNotes[0] === 128 ||
    (pressedNotes[0] === 144 && velocity === 0)
  ) {
    handleKeyReleased(pressedNotes[1]);
    keyEvent = true;
  }

  if (keyEvent) {
    checkChord();
  }
}

function sendMidiNote(note, velocity, time) {
  // Send a MIDI message to the first available MIDI output
  if (!midiAccess) return;
  const outputs = Array.from(midiAccess.outputs.values());
  const selected = outputs.filter((o) => selectedMidiOutputIds.has(o.id));
  const targets = selected.length ? selected : outputs.slice(0, 1);
  targets.forEach((out) => {
    out.send([0x90, note, velocity]);
    setTimeout(() => {
      out.send([0x80, note, 0]);
    }, time);
  });
}

// Returns the current chord notes wrapped around the octave and sorted
function getSortedAnswerNotes() {
  return [...new Set(currentChordNotes.map(normalizePitchClass))].sort(
    (a, b) => a - b,
  );
}

function playAnswerNotes() {
  if (modeIsChords()) {
    currentChordNotes.forEach((note) => {
      sendMidiNote(note + 48, 70, 1000);
    });
  } else if (
    modeIsScales() ||
    modeIsJazz() ||
    modeIsProgressions() ||
    modeIsDegrees() ||
    modeIsSongs()
  ) {
    let offset = 0;

    // TODO: Make this smarter based on mode later
    if (!modeIsScales() && !modeIsSongs()) {
      offset = 2;

      // Play the tonic of the key first
      let [name, notes] = getIntervalChordNotesAndName(
        keys[keyIndex],
        "I",
        false,
      );
      sendMidiNote(notes[0] + 48, 70, 1000);
    }

    // Play each chord in the progression with 500ms spacing
    currentProgression.forEach((chord, index) => {
      setTimeout(
        () => {
          const resolved = resolveProgressionEntry(chord, {
            wrap: false,
            applyVoicing: true,
          });
          if (!resolved) return;
          const notes = resolved.notes;
          notes.forEach((note) => {
            sendMidiNote(note + 48, 70, 500);
          });
        },
        (index + offset) * 600,
      );
    });
  }
}

function checkChord() {
  if (awaitingKeyRelease) {
    if (activeKeys.length > 0) {
      return;
    }

    awaitingKeyRelease = false;
    dom.chordDisplay.classList.remove("correct");
    dom.chordDisplay.classList.remove("incorrect");
    nextChord();
  }

  let sortedCurrentChordNotes = getSortedAnswerNotes();
  // Turn keys into notes 0-11, remove duplicates, sort for matching
  let sortedActiveNotes = [
    ...new Set(activeKeys.map(normalizePitchClass)),
  ].sort((a, b) => a - b);
  const markChordCorrect = () => {
    awaitingKeyRelease = true;
    dom.chordDisplay.classList.remove("incorrect");
    dom.chordDisplay.classList.add("correct");

    if (modeIsChords()) {
      recordChordCompletion();
    } else if (modeIsDegrees()) {
      recordDegreeCompletion();
    }

    clearTimeout(highlightTimer);

    highlightCorrectKeys();
  };

  if (modeIsChords() || modeIsProgressions() || modeIsJazz() || modeIsSongs()) {
    let cachedIntervals = null;
    const ensureIntervals = () => {
      if (!cachedIntervals) {
        cachedIntervals = getTargetUpperIntervals(currentChordInternalName);
      }
      return cachedIntervals;
    };

    if (typeof getUpper1Mode === "function") {
      const upper1Mode = getUpper1Mode();
      if (
        upper1Mode === "typeA" ||
        upper1Mode === "typeB" ||
        upper1Mode === "either"
      ) {
        const outcome = enforceTypedVoicing(
          activeKeys,
          upper1Mode,
          3,
          ensureIntervals(),
        );
        if (outcome === "waiting" || outcome === "handled") return;
      }
    }

    if (typeof getUpperMode === "function") {
      const upperMode = getUpperMode();
      if (
        upperMode === "typeA" ||
        upperMode === "typeB" ||
        upperMode === "either"
      ) {
        const outcome = enforceTypedVoicing(
          activeKeys,
          upperMode,
          4,
          ensureIntervals(),
        );
        if (outcome === "waiting" || outcome === "handled") return;
      }
    }
  }

  if (
    Array.isArray(currentShellVoicingAlternates) &&
    currentShellVoicingAlternates.length > 0
  ) {
    const matchesAlternate = currentShellVoicingAlternates.some((combo) => {
      if (!Array.isArray(combo)) return false;
      const normalizedCombo = [...new Set(combo.map(normalizePitchClass))].sort(
        (a, b) => a - b,
      );
      if (normalizedCombo.length !== sortedActiveNotes.length) return false;
      return normalizedCombo.every(
        (note, index) => note === sortedActiveNotes[index],
      );
    });
    if (matchesAlternate) {
      markChordCorrect();
      return;
    }
  }

  // Check if every element in sortedCurrentChordNotes is in sortedActiveNotes and both arrays have the same length
  // This makes sure we disallow extra notes in the chord
  if (
    sortedCurrentChordNotes.length === sortedActiveNotes.length &&
    sortedCurrentChordNotes.every(
      (chordNote, index) => chordNote === sortedActiveNotes[index],
    )
  ) {
    markChordCorrect();
  }
}

function getHighlightDelayMs() {
  if (!dom.highlightDelay) return DEFAULT_HIGHLIGHT_DELAY_MS;
  const rawSeconds = parseFloat(dom.highlightDelay.value);
  if (Number.isNaN(rawSeconds)) {
    dom.highlightDelay.value = DEFAULT_HIGHLIGHT_DELAY_MS / 1000;
    syncSettingsStore();
    return DEFAULT_HIGHLIGHT_DELAY_MS;
  }
  const clamped = Math.max(0, rawSeconds);
  if (clamped !== rawSeconds) {
    dom.highlightDelay.value = clamped;
    syncSettingsStore();
  }
  return clamped * 1000;
}

function highlightCorrectKeys() {
  clearTimeout(highlightTimer);

  // Clear previous highlights
  document
    .querySelectorAll(".key.highlight")
    .forEach((key) => key.classList.remove("highlight"));

  if (!dom.highlightCorrectKeys.checked) {
    return;
  }

  const applyHighlight = () => {
    if (!dom.highlightCorrectKeys.checked) {
      return;
    }

    currentChordNotes.forEach((note) => {
      const keyElement = document.querySelector(
        `.key[data-note="${note + 48}"]`,
      );
      if (keyElement) keyElement.classList.add("highlight");
    });
  };

  const delay = getHighlightDelayMs();
  if (delay <= 0) {
    applyHighlight();
    highlightTimer = null;
    return;
  }

  highlightTimer = setTimeout(applyHighlight, delay);
}

function onMIDISuccess(midiAccessResult) {
  midiAccess = midiAccessResult;

  // If there are no inputs, notify the user.
  if (!midiAccess.inputs.size) {
    dom.midiStatusText.textContent =
      "No MIDI inputs detected. Please connect a MIDI device.";
    return;
  }

  dom.midiStatusText.textContent = "MIDI connected.";

  renderMidiDeviceTables();
  refreshMidiListeners();
}

// Spaced Repetition helpers
function spacedRepHandleResult(kind, key, wasIncorrect) {
  // Only handle spaced repetition when chords or jazz bricks are in play
  const idx =
    scheduledRepeat && scheduledRepeat.kind === kind
      ? scheduledRepeat.index
      : -1;
  if (idx >= 0) {
    const entry = spacedQueueAll[idx];
    if (wasIncorrect) {
      entry.interval = 1;
      entry.successStreak = 0;
    } else {
      entry.successStreak++;
      entry.interval *= 2;
    }
    entry.counter = entry.interval;
    if (entry.successStreak >= getMasteryThreshold()) {
      spacedQueueAll.splice(idx, 1);
    }
    scheduledRepeat = null;
    spacedRepRenderList();
  } else if (wasIncorrect) {
    // Add new entry if not present
    if (
      !spacedQueueAll.find((e) => e.kind === kind && (e.key || e.chord) === key)
    ) {
      spacedQueueAll.push({
        kind,
        key,
        chord: key, // for backward compatibility with earlier code
        interval: 1,
        counter: 1,
        successStreak: 0,
      });
      spacedRepRenderList();
    }
  }
}

function spacedRepRenderList() {
  const container = dom.spacedRepList;
  if (!container) return;
  if (!spacedQueueAll.length) {
    container.innerHTML = "<em>No failed items scheduled.</em>";
    return;
  }
  const rows = spacedQueueAll.map((e) => {
    const type = e.kind === "brick" ? "Brick" : "Chord";
    const name = e.key || e.chord;
    return `<tr><td>${type}</td><td>${name}</td><td>${e.successStreak}/${getMasteryThreshold()}</td></tr>`;
  });
  container.innerHTML = `<table><thead><tr><th>Type</th><th>Item</th><th>Streak</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function spacedRepClearAll() {
  spacedQueueAll = [];
  scheduledRepeat = null;
  spacedRepRenderList();
}

function onMIDIFailure(error) {
  dom.midiStatusText.textContent = "Failed to get MIDI access. Error: " + error;
}

function initMIDI() {
  // Initialize MIDI access
  if (navigator.requestMIDIAccess)
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  else
    dom.midiStatusText.textContent =
      "Your browser does not support MIDI access. Please ensure you are using a browser that supports WebMIDI, and that you are accessing this site from HTTPS, as some browsers require secure connections for WebMIDI.";
}

function renderMidiDeviceTables() {
  if (!midiAccess) return;
  const inputsTable = dom.midiInputs;
  const outputsTable = dom.midiOutputs;
  if (!inputsTable || !outputsTable) return;

  const inputs = Array.from(midiAccess.inputs.values()).filter(
    (i) =>
      !i.name.includes("Output connection") && !i.name.includes("Midi Through"),
  );
  const outputs = Array.from(midiAccess.outputs.values());

  // Initialize defaults if none selected yet
  if (selectedMidiInputIds.size === 0)
    inputs.forEach((i) => selectedMidiInputIds.add(i.id));
  if (selectedMidiOutputIds.size === 0 && outputs[0])
    selectedMidiOutputIds.add(outputs[0].id);

  // Render inputs table
  let iHtml = "<thead><tr><th>Inputs</th><th>Use</th></tr></thead><tbody>";
  inputs.forEach((inp) => {
    const checked = selectedMidiInputIds.has(inp.id) ? "checked" : "";
    iHtml += `<tr><td>${inp.name}</td><td><input type="checkbox" data-midi-in="${inp.id}" ${checked}></td></tr>`;
  });
  iHtml += "</tbody>";
  inputsTable.innerHTML = iHtml;

  // Render outputs table
  let oHtml = "<thead><tr><th>Outputs</th><th>Send</th></tr></thead><tbody>";
  outputs.forEach((out) => {
    const checked = selectedMidiOutputIds.has(out.id) ? "checked" : "";
    oHtml += `<tr><td>${out.name}</td><td><input type="checkbox" data-midi-out="${out.id}" ${checked}></td></tr>`;
  });
  oHtml += "</tbody>";
  outputsTable.innerHTML = oHtml;

  // Wire input checkbox changes
  inputsTable
    .querySelectorAll("input[type='checkbox'][data-midi-in]")
    .forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.getAttribute("data-midi-in");
        if (e.target.checked) selectedMidiInputIds.add(id);
        else selectedMidiInputIds.delete(id);
        refreshMidiListeners();
      });
    });

  // Wire output checkbox changes
  outputsTable
    .querySelectorAll("input[type='checkbox'][data-midi-out]")
    .forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.getAttribute("data-midi-out");
        if (e.target.checked) selectedMidiOutputIds.add(id);
        else selectedMidiOutputIds.delete(id);
      });
    });
}

function refreshMidiListeners() {
  if (!midiAccess) return;
  const inputs = Array.from(midiAccess.inputs.values());
  inputs.forEach((input) => {
    // Skip loopback-ish inputs
    if (
      input.name.includes("Output connection") ||
      input.name.includes("Midi Through")
    ) {
      input.onmidimessage = null;
      return;
    }
    if (selectedMidiInputIds.has(input.id))
      input.onmidimessage = handleMidiMessage;
    else input.onmidimessage = null;
  });
}

function updateAvailableKeys() {
  const flow = dom.flowSelect.value;
  const startKey = dom.flowStartSelect
    ? dom.flowStartSelect.value || DEFAULT_START_KEY
    : DEFAULT_START_KEY;

  if (typeof flowPresetMap[flow] === "function") {
    const generated = flowPresetMap[flow](startKey);
    keys = Array.isArray(generated) ? generated.slice() : [];
    if (!keys.length) {
      alert("This flow does not have any keys to practice.");
      return null;
    }
    return keys;
  }

  keys = Object.keys(noteValues).filter(
    (root) => dom.keyCheckboxes[root].checked,
  );
  if (keys.length === 0) {
    alert("Please select at least one root key!");
    return null;
  }
  return keys;
}

function nextKey() {
  const available = updateAvailableKeys();
  if (!available || !available.length) return;
  const flow = dom.flowSelect.value;

  if (typeof flowPresetMap[flow] === "function") {
    keyIndex++;
  } else {
    keyIndex = Math.floor(Math.random() * keys.length);
  }

  keyIndex %= keys.length;
}

function loadCurrentProgressionChord() {
  if (!Array.isArray(currentProgression) || !currentProgression.length) {
    if (modeIsSongs()) {
      currentChordName = "";
      currentChordInternalName = "";
      currentChordNotes = [];
      return;
    }
    setRandomChord();
    return;
  }

  if (!keys.length && !modeIsSongs()) {
    const available = updateAvailableKeys();
    if (!available || !available.length) {
      setRandomChord();
      return;
    }
  }

  if (currentIndex < 0) currentIndex = 0;
  if (currentIndex >= currentProgression.length) {
    currentIndex = currentProgression.length - 1;
  }

  const entry = currentProgression[currentIndex];
  if (!entry) {
    if (modeIsSongs()) {
      currentChordName = "";
      currentChordInternalName = "";
      currentChordNotes = [];
      return;
    }
    setRandomChord();
    return;
  }

  const resolved = resolveProgressionEntry(entry, {
    wrap: true,
    applyVoicing: true,
  });
  if (resolved) {
    currentChordName = resolved.name;
    currentChordNotes = resolved.notes;
    currentChordInternalName = resolved.internalName;
    return;
  }

  setRandomChord();
}

function resetFlow() {
  clearTimeout(highlightTimer);
  highlightTimer = null;
  awaitingKeyRelease = false;
  isIncorrect = false;
  activeKeys = [];

  if (dom.chordDisplay) {
    dom.chordDisplay.classList.remove("correct");
    dom.chordDisplay.classList.remove("incorrect");
  }

  const available = updateAvailableKeys();
  if (!available || !available.length) return;

  const flow = dom.flowSelect.value;
  const startKey = dom.flowStartSelect
    ? dom.flowStartSelect.value || DEFAULT_START_KEY
    : DEFAULT_START_KEY;

  if (typeof flowPresetMap[flow] === "function") {
    keyIndex = 0;
  } else {
    let startIndex = available.indexOf(startKey);
    if (startIndex < 0) startIndex = 0;
    keyIndex = startIndex;
  }

  if (!Number.isFinite(keyIndex) || keyIndex < 0 || keyIndex >= keys.length) {
    keyIndex = 0;
  }

  currentIndex = 0;
  currentProgression = [];
  currentProgressionName = "";
  selectedProgression = "";
  currentSongId = "";
  currentSong = null;
  scheduledRepeat = null;
  isIncorrect = false;

  if (
    modeIsProgressions() ||
    modeIsScales() ||
    modeIsDegrees() ||
    modeIsJazz() ||
    modeIsSongs()
  ) {
    generateProgression();
    loadCurrentProgressionChord();
  } else {
    setRandomChord();
  }

  highlightCorrectKeys();
  updateDisplay();
}

function populateStartingKeyOptions() {
  const select = dom.flowStartSelect;
  if (!select || typeof normalNotes === "undefined") return;

  const previous = select.value;
  const seen = new Set();
  select.innerHTML = "";

  normalNotes.forEach((note) => {
    if (seen.has(note)) return;
    seen.add(note);
    const option = document.createElement("option");
    option.value = note;
    option.textContent = note;
    select.appendChild(option);
  });

  const preferred =
    previous && seen.has(previous) ? previous : DEFAULT_START_KEY;
  if (seen.has(preferred)) select.value = preferred;
  else if (select.options.length) select.value = select.options[0].value;
}

function nextChord(skip = false) {
  if (
    modeIsProgressions() ||
    modeIsScales() ||
    modeIsDegrees() ||
    modeIsJazz() ||
    modeIsSongs()
  ) {
    currentIndex++;

    // Ensure progression exists before using it
    if (!Array.isArray(currentProgression)) {
      generateProgression();
    }

    if (
      skip ||
      currentIndex >= (currentProgression ? currentProgression.length : 0)
    ) {
      if (modeIsProgressions()) {
        updateResultCounters({
          wasIncorrect: isIncorrect,
          skipCorrect: skip,
          correctElement: dom.cntProgsCorrect,
          incorrectElement: dom.cntProgsIncorrect,
          category: "progressions",
        });
      } else if (modeIsSongs()) {
        updateResultCounters({
          wasIncorrect: isIncorrect,
          skipCorrect: skip,
          correctElement: dom.cntProgsCorrect,
          incorrectElement: dom.cntProgsIncorrect,
          category: "progressions",
        });
      } else if (modeIsJazz()) {
        // Handle Jazz Brick spaced repetition using unified queue
        spacedRepHandleResult("brick", selectedProgression, isIncorrect);
        updateResultCounters({
          wasIncorrect: isIncorrect,
          skipCorrect: skip,
          correctElement: dom.cntBricksCorrect,
          incorrectElement: dom.cntBricksIncorrect,
          category: "bricks",
        });
      } else if (modeIsScales()) {
        updateResultCounters({
          wasIncorrect: isIncorrect,
          skipCorrect: skip,
          correctElement: dom.cntScalesCorrect,
          incorrectElement: dom.cntScalesIncorrect,
          category: "scales",
        });
      }

      isIncorrect = false;

      nextKey();
      generateProgression();

      if (dom.sendMidiNotes.checked) {
        setTimeout(playAnswerNotes, 200);
      }
    }

    loadCurrentProgressionChord();
  } else {
    nextKey();
    setRandomChord();

    if (dom.sendMidiNotes.checked) {
      setTimeout(playAnswerNotes, 200);
    }
  }

  highlightCorrectKeys();
  updateDisplay();
}

function updateDisplay() {
  let hideChordName = dom.hideProgressionChordNames.checked;
  let hideNumerals = dom.hideProgressionChordNumerals.checked;

  if (modeIsChords()) {
    // When we are in chord mode with hidden chords we are probably doing ear training
    // for chord quality so at least show the key
    if (hideChordName) {
      dom.currentKey.style.display = "block";
      dom.chordDisplay.style.display = "none";
    } else {
      dom.currentKey.style.display = "none";
      dom.chordDisplay.style.display = "block";
    }
    dom.progressionDisplay.style.display = "none";
    dom.cadenceDisplay.style.display = "none";
  } else {
    dom.chordDisplay.style.display = "none";
    dom.currentKey.style.display = "inline";
    dom.cadenceDisplay.style.display = "inline";
    dom.progressionDisplay.style.display = "block";
  }

  let text = currentChordName;

  // Turn # and b into sharp and flat symbols
  text = text.replace(/#/g, "♯");
  text = text.replace(/b/g, "♭");

  dom.chordDisplay.textContent = text;
  dom.chordDisplay.title = "";

  if (isIncorrect) {
    dom.chordDisplay.classList.add("incorrect");
  } else {
    dom.chordDisplay.classList.remove("incorrect");
  }

  dom.currentKey.textContent = keys[keyIndex];

  if (Array.isArray(currentProgression)) {
    const progressionLabel = (entry) =>
      typeof entry === "string"
        ? entry
        : entry && typeof entry.label === "string"
          ? entry.label
          : "";
    if (modeIsSongs() && currentSong) {
      dom.progressionDisplay.innerHTML = buildSongChartHtml(
        currentSong,
        currentProgression[currentIndex],
        currentProgression.slice(0, currentIndex),
        hideNumerals,
      );
    } else if (hideNumerals) {
      dom.progressionDisplay.innerHTML = currentProgression
        .map((chord) => {
          const label = progressionLabel(chord);
          return `<span class="chord" title="${escapeHtml(label)}">?</span>`;
        })
        .join(" - ");
    } else {
      dom.progressionDisplay.innerHTML = currentProgression
        .map(
          (chord) =>
            `<span class="chord">${escapeHtml(progressionLabel(chord))}</span>`,
        )
        .join(" - ");
    }
  } else {
    dom.progressionDisplay.innerHTML = "";
  }

  if (hideChordName) {
    dom.cadenceDisplay.textContent = " ?";
  } else {
    dom.cadenceDisplay.textContent = " " + currentProgressionName;
  }

  // Add event listeners to chords to track user input
  document.querySelectorAll(".chord").forEach((chordSpan, index) => {
    chordSpan.style.color = "";
    if (!modeIsSongs()) {
      if (currentIndex == index) {
        chordSpan.style.color = "#0077ff";
      } else if (currentIndex > index) {
        chordSpan.style.color = "green";
      }
    }
  });
}

function getIntervalChordNotesAndName(key, degree, wrap = true) {
  let keyValue = noteValues[key];

  // Degree must be something like 'I', 'II', 'III', etc.

  // We need to split the interval into three parts
  // the degree, which is all letters that are either I or V
  // the augmented or diminished, which is all letters that are + or o
  // and the 7th, 9th, etc. which is all arabic numerals at the end

  // Get the degree
  let bareDegree = degree.match(/[bB#iIvV]{1,4}/)[0];

  // We only need the degree if we're in scale degree mode since
  // we only need the first note of the chord
  if (modeIsDegrees() || modeIsScales()) {
    return [
      generateChordName(bareDegree, ""),
      [
        (keyValue + romanNumerals[bareDegree.toUpperCase()]) %
          (wrap ? 12 : 127),
      ],
    ];
  }

  // Get the extension (7th, 9th, etc.) — capture selected alterations
  // Note: extension variable was unused; instead, detect specific alterations.
  const hasSharp9 = /(\+9|#9)/.test(degree);
  const hasFlat9 = /b9/.test(degree);
  const hasSharp11 = /(\+11|#11)/.test(degree);

  // Get the augmented — but only if '+' is NOT part of +9/+11/+13
  let augmented = /\+(?!9|11|13)/.test(degree);

  // Get the diminished
  let diminished = degree.match(/o/);

  // Get half-diminished
  let halfDiminished = degree.match(/ø/);

  // Get minor status, by checking for lower case or a dash
  let minor = bareDegree === bareDegree.toLowerCase() || degree.match(/-/);

  // Convert the degree to a number using romanNumerals
  let degreeValue = romanNumerals[bareDegree.toUpperCase()];

  // Then add the interval to get the new degree
  let noteValue = (keyValue + degreeValue) % (wrap ? 12 : 127);

  // Get sevenths
  let majorSeventh = degree.match(/M7/) || degree.match(/Δ/);
  let domSeventh = !majorSeventh && (halfDiminished || degree.match(/7/));

  // Later fix this to handle key signatures with flats
  if (
    keys[keyIndex] === "F" ||
    keys[keyIndex] === "Bb" ||
    keys[keyIndex] === "Eb" ||
    keys[keyIndex] === "Ab" ||
    keys[keyIndex] === "Db" ||
    keys[keyIndex] === "Gb"
  ) {
    var valuesToNotes = valuesToNotesFlat;
  } else {
    var valuesToNotes = valuesToNotesSharp;
  }

  const degreeChordRoot = valuesToNotes[noteValue];
  let chordQuality = "";
  let chord7th = "";
  let ext = "";

  if (diminished) {
    chordQuality = "dim";
  } else if (augmented) {
    chordQuality = "aug";
  } else if (minor || halfDiminished) {
    chordQuality = "m";
  } else {
    chordQuality = "";
  }

  if (domSeventh) {
    chord7th = "7";
  } else if (majorSeventh) {
    chord7th = "M7";
  } else {
    chord7th = "";
  }

  if (halfDiminished) {
    ext += "b5";
  } else if (hasSharp9) {
    ext += "#9";
  } else if (hasFlat9) {
    ext += "b9";
  } else if (hasSharp11) {
    ext += "#11";
  }

  // Track internal chord for voicing/validation
  currentChordInternalName = degreeChordRoot + chordQuality + chord7th + ext;

  return [
    generateChordName(degreeChordRoot, chordQuality + chord7th + ext),
    generateNotesFromChordName(currentChordInternalName),
  ];
}

function generateProgression() {
  dom.currentKey.textContent = keys[keyIndex];

  currentIndex = 0;

  if (modeIsProgressions() || modeIsDegrees()) {
    if (dom.progressionSelect.value === "custom") {
      currentProgression = dom.customProgressionInput.value.split("-");
    } else if (dom.progressionSelect.value === "random") {
      // Get count from randomProgression input
      let count = dom.randomProgressionCount.value;

      enabledNumerals = {};
      if (modeIsDegrees()) {
        Object.keys(romanNumerals).forEach((numeral) => {
          const checkbox = dom.degreeCheckboxes[numeral];
          if (checkbox && checkbox.checked) {
            enabledNumerals[numeral] = romanNumerals[numeral];
          }
        });
      } else {
        enabledNumerals = romanNumerals;
      }

      // Select that many scale degrees from the roman numeral list
      currentProgression = [];
      for (let i = 0; i < count; i++) {
        currentProgression.push(
          Object.keys(enabledNumerals)[
            Math.floor(Math.random() * Object.keys(enabledNumerals).length)
          ],
        );
      }
    } else {
      currentProgression = dom.progressionSelect.value.split("-");
    }

    currentProgressionName = dom.progressionSelect.value;
  } else if (modeIsScales()) {
    // Get list of all enabled scales
    enabledScales = {};
    enabledNames = {};
    Object.keys(scales).forEach((s) => {
      if (scales[s].enabled) {
        enabledScales[s] = scales[s].steps;
        enabledNames[s] = scales[s].label;
      }
    });

    // If no scales are enabled, default to major
    if (Object.keys(enabledScales).length === 0) {
      let major = Scales[0];
      enabledScales[major.name] = major.steps;
      enabledNames[major.name] = major.label;
    }

    // Select a random cadence from the enabled list
    selectedScale =
      Object.keys(enabledScales)[
        Math.floor(Math.random() * Object.keys(enabledScales).length)
      ];
    let currentScale = enabledScales[selectedScale];
    let currentScaleName = enabledNames[selectedScale];

    // We use roman numerals for the scale notes so generate one for each note of the scale
    let totalSteps = 0;
    currentProgression = currentScale.map((stepSize) => {
      let note = stepsToNames[totalSteps].numeral;
      totalSteps += stepSize;
      return note;
    });

    // Always add the octave, scale practice always ends on the octave
    currentProgression.push("VIII");
    currentProgressionName = currentScaleName;
  } else if (modeIsJazz()) {
    // Get list of all enabled Jazz cadences keyed by cadence name
    enabledCadences = {};
    enabledNames = {};
    Object.keys(jazzCadences).forEach((idx) => {
      const c = jazzCadences[idx];
      if (c.enabled) {
        enabledCadences[c.name] = c.chords;
        enabledNames[c.name] = c.name;
      }
    });

    // Spaced repetition: schedule due Jazz Brick cadences before random selection
    if (isSpacedRepetitionEnabled() && spacedQueueAll.length) {
      let idx = spacedQueueAll.reduce((best, entry, i) => {
        if (entry.kind !== "brick") return best;
        if (
          entry.counter <= 0 &&
          (best < 0 || entry.counter < spacedQueueAll[best].counter)
        )
          return i;
        return best;
      }, -1);
      if (idx >= 0) {
        let entry = spacedQueueAll[idx];
        const key = entry.key || entry.chord;
        const scheduled = enabledCadences[key];
        if (scheduled) {
          currentProgression = scheduled;
          currentProgressionName = enabledNames[key] || key;
          // Prevent immediate reselection if user skips; push next due by at least one step
          entry.counter = Math.max(entry.interval, 1);
          scheduledRepeat = { kind: "brick", index: idx };
          return;
        }
      }
      // Tick down only brick entries
      spacedQueueAll.forEach((e) => {
        if (e.kind === "brick") e.counter--;
      });
    }

    // Select a random cadence from the enabled list
    if (Object.keys(enabledCadences).length === 0) {
      enabledCadences["Regular"] = ["ii7", "V7", "IΔ"];
      enabledNames["Regular"] = "Regular";
    }

    selectedProgression =
      Object.keys(enabledCadences)[
        Math.floor(Math.random() * Object.keys(enabledCadences).length)
      ];
    currentProgression = enabledCadences[selectedProgression];
    currentProgressionName = enabledNames[selectedProgression];
  } else if (modeIsSongs()) {
    currentSongId = dom.songSelect ? dom.songSelect.value || "" : "";
    if (!currentSongId || !logicSongsStore) {
      currentProgression = [];
      currentProgressionName = "";
      currentSong = null;
      currentChordName = "";
      currentChordInternalName = "";
      currentChordNotes = [];
      keys = [];
      return;
    }
    const song = logicSongsStore.getSong(currentSongId);
    if (!song) {
      currentProgression = [];
      currentProgressionName = "";
      currentSong = null;
      currentChordName = "";
      currentChordInternalName = "";
      currentChordNotes = [];
      keys = [];
      return;
    }
    currentSong = song;
    currentProgression = buildPlayableSongEntries(song);
    currentProgressionName = song.title;
    keys = [song.key];
    keyIndex = 0;
  }
}

dom.hideProgressionChordNames.addEventListener("change", updateDisplay);
dom.hideProgressionChordNumerals.addEventListener("change", updateDisplay);

function nextProgression() {
  nextChord(true);
}

dom.flowSelect.addEventListener("change", resetFlow);
dom.flowStartSelect.addEventListener("change", resetFlow);
dom.flowResetButton.addEventListener("click", resetFlow);

if (documentAvailable) {
  populateStartingKeyOptions();
  modeChange();
}
// Apply shell voicing according to selected mode (all chord-based modes)
function applyShellVoicing(notes) {
  try {
    if (!Array.isArray(notes)) return notes;
    if (typeof getShellMode !== "function") return notes;
    if (
      !(modeIsChords() || modeIsProgressions() || modeIsJazz() || modeIsSongs())
    ) {
      return notes;
    }
    const mode = getShellMode();
    if (mode === "off") return notes;
    const result = computeShellVoicing(notes, currentChordInternalName, mode);
    currentShellVoicingAlternates = result.alternates;
    return Array.isArray(result.notes) ? result.notes : notes;
  } catch (_) {
    return notes;
  }
}

function handleTypedVoicingSuccess() {
  awaitingKeyRelease = true;
  dom.chordDisplay.classList.remove("incorrect");
  dom.chordDisplay.classList.add("correct");
  if (modeIsChords()) {
    recordChordCompletion();
  }
  clearTimeout(highlightTimer);
  highlightCorrectKeys();
}

function enforceTypedVoicing(activeNotes, mode, requiredLength, intervals) {
  if (mode !== "typeA" && mode !== "typeB" && mode !== "either") return "none";
  const { orderA, orderB } = buildVoicingOrders(intervals, requiredLength);
  if (!checkTypedVoicing(activeNotes, requiredLength, orderA, orderB, mode)) {
    return "waiting";
  }
  handleTypedVoicingSuccess();
  return "handled";
}

function checkTypedVoicing(activeNotes, requiredLength, orderA, orderB, mode) {
  if (activeNotes.length !== requiredLength) return false;
  const sorted = activeNotes.map(Number).sort((a, b) => a - b);
  const matchesA = matchesVoicingOrderSorted(sorted, orderA);
  const matchesB = matchesVoicingOrderSorted(sorted, orderB);

  if (mode === "typeA") return matchesA;
  if (mode === "typeB") return matchesB;
  if (mode === "either") return matchesA || matchesB;
  return false;
}

// Apply selected voicing (Upper Type A/B takes precedence over Shell)
function applySelectedVoicing(notes) {
  try {
    currentShellVoicingAlternates = null;
    let intervalsCache = null;
    const ensureIntervals = () => {
      if (!intervalsCache)
        intervalsCache = getTargetUpperIntervals(currentChordInternalName);
      return intervalsCache;
    };

    if (typeof getUpper1Mode === "function") {
      const upper1Mode = getUpper1Mode();
      const resolved = resolveUpperVoicing(upper1Mode, 3, ensureIntervals);
      if (resolved) return resolved;
    }
    if (typeof getUpperMode === "function") {
      const upperMode = getUpperMode();
      const resolved = resolveUpperVoicing(upperMode, 4, ensureIntervals);
      if (resolved) return resolved;
    }
    return applyShellVoicing(notes);
  } catch (_) {
    return notes;
  }
}

// React to voicing mode changes immediately
if (documentAvailable) {
  document.querySelectorAll("input[name='voicingMode']").forEach((r) => {
    r.addEventListener("change", () => {
      // Ensure UI has disabled/enabled chord-type checkboxes before logic runs
      try {
        if (typeof enforceVoicingChordConstraints === "function")
          enforceVoicingChordConstraints();
      } catch (_) {}

      if (!currentChordInternalName) return;
      const base = generateNotesFromChordName(currentChordInternalName);
      // If switching to any non-default voicing and current chord lacks a 4th tone, skip it
      try {
        const voicingMode =
          typeof getVoicingMode === "function" ? getVoicingMode() : "default";
        const requiresFour = voicingMode !== "default";
        if (requiresFour && base.length < 4) {
          nextChord(true);
          return;
        }
      } catch (_) {}
      currentChordNotes = applySelectedVoicing(base);
      updateDisplay();
    });
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    resolveStartValue,
    rotateSequenceToStart,
    flowPresetMap,
    formatDateKey,
    normalizeDailyStats,
  };
}
