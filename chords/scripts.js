let midiAccess = null;
let selectedMidiInputIds = new Set();
let selectedMidiOutputIds = new Set();
let disabledMidiInputIds = new Set();
let midiOutputDefaultsInitialized = false;
let songAnswerTimer = null;

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
let currentSongCompletedPasses = 0;
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
const logicSanitizeMetronomeSettings =
  sharedGlobals.sanitizeMetronomeSettings ||
  runtimeRoot.sanitizeMetronomeSettings ||
  ((source) => ({
    tempo: Math.max(
      30,
      Math.min(240, parseInt(source && source.tempo, 10) || 120),
    ),
    beatsPerMeasure: Math.max(
      1,
      Math.min(16, parseInt(source && source.beatsPerMeasure, 10) || 4),
    ),
    xMeasures: Math.max(
      0,
      Math.min(256, parseInt(source && source.xMeasures, 10) || 4),
    ),
    yMeasures: Math.max(
      0,
      Math.min(256, parseInt(source && source.yMeasures, 10) || 8),
    ),
    countInMeasures: Math.max(
      0,
      Math.min(8, parseInt(source && source.countInMeasures, 10) || 1),
    ),
    syncToSongs: !!(source && source.syncToSongs),
  }));
const logicSanitizeSongsPracticeSettings =
  sharedGlobals.sanitizeSongsPracticeSettings ||
  runtimeRoot.sanitizeSongsPracticeSettings ||
  ((source) => ({
    finishAction:
      source && typeof source.finishAction === "string"
        ? source.finishAction
        : "nothing",
    repeatCount: Math.max(1, parseInt(source && source.repeatCount, 10) || 3),
    countChordsTowardGoals:
      !source ||
      !Object.prototype.hasOwnProperty.call(source, "countChordsTowardGoals")
        ? true
        : !!source.countChordsTowardGoals,
  }));
const logicPickSongIdForFinishAction =
  sharedGlobals.pickSongIdForFinishAction ||
  runtimeRoot.pickSongIdForFinishAction ||
  ((songs, currentSongId) => {
    const currentId = typeof currentSongId === "string" ? currentSongId : "";
    if (!Array.isArray(songs) || !songs.length) return currentId;
    return (
      songs.find((song) => song && song.id === currentId)?.id || songs[0].id
    );
  });
const logicPickSongIdForSongNavigation =
  sharedGlobals.pickSongIdForSongNavigation ||
  runtimeRoot.pickSongIdForSongNavigation ||
  ((songs, currentSongId, direction) => {
    const orderedSongs = Array.isArray(songs)
      ? songs.filter((song) => song && song.id)
      : [];
    if (!orderedSongs.length) return "";
    const step = direction === "previous" ? -1 : 1;
    const currentIndex = orderedSongs.findIndex(
      (song) => song.id === currentSongId,
    );
    if (currentIndex < 0) {
      return step < 0
        ? orderedSongs[orderedSongs.length - 1].id
        : orderedSongs[0].id;
    }
    return orderedSongs[
      (currentIndex + step + orderedSongs.length) % orderedSongs.length
    ].id;
  });
const logicFormatKeyDisplay =
  sharedGlobals.formatKeyDisplay ||
  runtimeRoot.formatKeyDisplay ||
  ((key) =>
    typeof key === "string"
      ? key
          .trim()
          .replace(
            /^([A-Ga-g])([b#♭♯]?)/,
            (_, root, accidental) =>
              root.toUpperCase() +
              (accidental === "b" || accidental === "♭"
                ? "♭"
                : accidental === "#" || accidental === "♯"
                  ? "♯"
                  : ""),
          )
      : "");
const logicBuildSongPracticeTimeline =
  sharedGlobals.buildSongPracticeTimeline ||
  runtimeRoot.buildSongPracticeTimeline ||
  ((song) => {
    if (!song || !Array.isArray(song.chart && song.chart.measures)) return [];
    const groupedEntries = new Map();
    (Array.isArray(currentProgression) ? currentProgression : []).forEach(
      (entry, sequenceIndex) => {
        if (!entry || entry.kind !== "songChord") return;
        const measureIndex = parseInt(entry.measureIndex, 10);
        if (!Number.isFinite(measureIndex) || measureIndex < 0) return;
        if (!groupedEntries.has(measureIndex)) {
          groupedEntries.set(measureIndex, []);
        }
        groupedEntries.get(measureIndex).push({
          ...entry,
          progressionIndex: sequenceIndex,
        });
      },
    );
    let phraseMeasure = 0;
    return song.chart.measures.map((measure, measureIndex) => {
      const section =
        measure && typeof measure.section === "string"
          ? measure.section.trim()
          : "";
      if (measureIndex === 0 || section) {
        phraseMeasure = 0;
      }
      phraseMeasure = (phraseMeasure % 4) + 1;
      const timeSignature =
        measure && typeof measure.timeSignature === "string"
          ? measure.timeSignature.trim()
          : "4/4";
      const beatsPerMeasure = Math.max(
        1,
        parseInt(timeSignature.split("/")[0], 10) || 4,
      );
      return {
        measureIndex,
        beatsPerMeasure,
        timeSignature,
        section,
        phraseMeasure,
        phraseLength: 4,
        chordTargets: (groupedEntries.get(measureIndex) || []).map((entry) => ({
          ...entry,
        })),
      };
    });
  });
const documentAvailable =
  "hasDocument" in sharedGlobals
    ? !!sharedGlobals.hasDocument
    : typeof document !== "undefined";
const logicGetMetronomeTickType =
  sharedGlobals.getMetronomeTickType ||
  runtimeRoot.getMetronomeTickType ||
  ((beatInMeasure, measureNumber, settings) => {
    if (beatInMeasure !== 0) return "normal";
    if (
      settings &&
      settings.yMeasures > 0 &&
      measureNumber % settings.yMeasures === 0
    ) {
      return "y";
    }
    if (
      settings &&
      settings.xMeasures > 0 &&
      measureNumber % settings.xMeasures === 0
    ) {
      return "x";
    }
    return "measure";
  });
const logicGetSongSyncMetronomeTickType =
  sharedGlobals.getSongSyncMetronomeTickType ||
  runtimeRoot.getSongSyncMetronomeTickType ||
  ((beatInMeasure, transportMeasureNumber, measure, options = {}) => {
    if (beatInMeasure !== 0) return "normal";
    const xMeasures = Math.max(
      0,
      Math.min(256, parseInt(options && options.xMeasures, 10) || 4),
    );
    const yMeasures = Math.max(
      0,
      Math.min(256, parseInt(options && options.yMeasures, 10) || 0),
    );
    const sectionMeasure = Math.max(
      1,
      parseInt(measure && measure.sectionMeasure, 10) || 1,
    );
    const countInMeasures = Math.max(
      0,
      Math.min(8, parseInt(options && options.countInMeasures, 10) || 0),
    );
    if (!options.hasStarted && countInMeasures > 0) {
      if (yMeasures > 0) return "y";
      if (xMeasures > 0) return "x";
      return "measure";
    }
    if (yMeasures > 0 && (sectionMeasure - 1) % yMeasures === 0) return "y";
    if (xMeasures > 0 && (sectionMeasure - 1) % xMeasures === 0) return "x";
    return "measure";
  });
const logicGetMetronomeCompletedMeasures =
  sharedGlobals.getMetronomeCompletedMeasures ||
  runtimeRoot.getMetronomeCompletedMeasures ||
  ((hasPlayedNote, currentMeasure) =>
    hasPlayedNote ? Math.max(0, (parseInt(currentMeasure, 10) || 1) - 1) : 0);
const logicGetMetronomeDisplayedMeasure =
  sharedGlobals.getMetronomeDisplayedMeasure ||
  runtimeRoot.getMetronomeDisplayedMeasure ||
  ((currentMeasure, xMeasures, yMeasures) => {
    const measureNumber = Math.max(1, parseInt(currentMeasure, 10) || 1);
    const lastCompletedMeasure = measureNumber - 1;
    const resetPoints = [0];
    const x = Math.max(0, parseInt(xMeasures, 10) || 0);
    const y = Math.max(0, parseInt(yMeasures, 10) || 0);
    if (x > 0) resetPoints.push(Math.floor(lastCompletedMeasure / x) * x);
    if (y > 0) resetPoints.push(Math.floor(lastCompletedMeasure / y) * y);
    return measureNumber - Math.max.apply(null, resetPoints);
  });
const logicGetMetronomeCycleDisplay =
  sharedGlobals.getMetronomeCycleDisplay ||
  runtimeRoot.getMetronomeCycleDisplay ||
  ((currentMeasure, length) => {
    const cycleLength = Math.max(0, parseInt(length, 10) || 0);
    if (cycleLength <= 0) return "Off";
    const measureNumber = Math.max(1, parseInt(currentMeasure, 10) || 1);
    return `${((measureNumber - 1) % cycleLength) + 1} / ${cycleLength}`;
  });

const metronomeState = {
  tempo: 120,
  beatsPerMeasure: 4,
  xMeasures: 4,
  yMeasures: 8,
  isRunning: false,
  hasPlayedNote: false,
  currentBeatInMeasure: 0,
  currentMeasure: 1,
  nextMeasure: 1,
  nextBeatInMeasure: 0,
  nextNoteTime: 0,
  schedulerTimer: null,
  audioContext: null,
  lookaheadMs: 25,
  scheduleAheadTime: 0.1,
  lastPulseTimeout: null,
  visualTimeouts: new Set(),
  tempoEntryBuffer: "",
  tempoEntryTimeoutId: null,
};

const songMetronomeState = {
  timeline: [],
  currentMeasureIndex: 0,
  currentChordIndexInMeasure: 0,
  chordStatuses: {},
  hasStarted: false,
  transportMeasureOffset: 0,
  countInMeasuresTotal: 0,
  countInMeasuresCompleted: 0,
};

let pendingSuccessAdvanceAction = null;

const summaryStatModeCategoryMap = {
  tabChords: "chords",
  tabProgressions: "progressions",
  tabSongs: "songs",
  tabDegrees: "degrees",
  tabScales: "scales",
  tabJazz: "bricks",
};

const summaryStatCategoryLabels = {
  chords: "Chords",
  progressions: "Progressions",
  songs: "Songs",
  degrees: "Degrees",
  scales: "Scales",
  bricks: "Bricks",
};

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
  songs: {
    correctElement: () => dom.cntSongsCorrect,
    incorrectElement: () => dom.cntSongsIncorrect,
    totalElement: () => dom.cntSongsTotal,
    correctGoalInput: () =>
      dom.statGoals && dom.statGoals.songs ? dom.statGoals.songs.correct : null,
    totalGoalInput: () =>
      dom.statGoals && dom.statGoals.songs ? dom.statGoals.songs.total : null,
    cardElement: () => (dom.statCards ? dom.statCards.songs : null),
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

function getSelectedStatCategory() {
  const selectedMode =
    typeof getSelectedMode === "function" ? getSelectedMode() : "tabChords";
  return summaryStatModeCategoryMap[selectedMode] || "chords";
}

function updateDailyStatsSummary() {
  if (!dom.dailyStatsSummary) return;
  const category = getSelectedStatCategory();
  const resolve = statCategoryConfig[category];
  if (!resolve) return;
  const correctValue = parseCountFromElement(resolve.correctElement());
  const incorrectValue = parseCountFromElement(resolve.incorrectElement());
  const totalValue = correctValue + incorrectValue;
  const correctGoal = parseGoalValue(resolve.correctGoalInput());
  const totalGoal = parseGoalValue(resolve.totalGoalInput());
  const label = summaryStatCategoryLabels[category] || "Stats";
  const goalSegments = [];
  if (correctGoal > 0) {
    goalSegments.push(`${correctGoal} correct`);
  }
  if (totalGoal > 0) {
    goalSegments.push(`${totalGoal} total`);
  }
  const goalText = goalSegments.length
    ? `, Goal${goalSegments.length > 1 ? "s" : ""}: ${goalSegments.join(" / ")}`
    : "";
  dom.dailyStatsSummary.textContent = `${label}: ${correctValue} / ${totalValue}${goalText}`;
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
  const shouldUpdateSummary = category === getSelectedStatCategory();
  const card = resolve.cardElement();
  if (!card || !card.classList || typeof card.classList.add !== "function") {
    if (shouldUpdateSummary) {
      updateDailyStatsSummary();
    }
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
  if (shouldUpdateSummary) {
    updateDailyStatsSummary();
  }
}

function updateAllStatGoalStatuses() {
  updateAllStatTotals();
  Object.keys(statCategoryConfig).forEach(updateStatGoalStatus);
}

function updateAllStatTotals() {
  Object.keys(statCategoryConfig).forEach(updateStatTotal);
  updateDailyStatsSummary();
}

sharedGlobals.updateStatGoalStatus = updateStatGoalStatus;
sharedGlobals.updateStatGoalStatuses = updateAllStatGoalStatuses;
sharedGlobals.updateStatTotals = updateAllStatTotals;
sharedGlobals.updateDailyStatsSummary = updateDailyStatsSummary;
sharedGlobals.statGoalsChanged = updateAllStatGoalStatuses;

if (runtimeRoot && !runtimeRoot.statGoalsChanged) {
  runtimeRoot.statGoalsChanged = updateAllStatGoalStatuses;
}
if (runtimeRoot && !runtimeRoot.updateStatTotals) {
  runtimeRoot.updateStatTotals = updateAllStatTotals;
}
if (runtimeRoot && !runtimeRoot.updateDailyStatsSummary) {
  runtimeRoot.updateDailyStatsSummary = updateDailyStatsSummary;
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
  let parsed = 0;
  try {
    parsed = Number(value);
  } catch (_) {
    return 0;
  }
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
sharedGlobals.syncMetronomeSettings = syncMetronomeSettings;
if (runtimeRoot && !runtimeRoot.resetDailyStats) {
  runtimeRoot.resetDailyStats = resetDailyStats;
}
if (runtimeRoot && !runtimeRoot.syncMetronomeSettings) {
  runtimeRoot.syncMetronomeSettings = syncMetronomeSettings;
}

function syncSettingsStore() {
  if (
    logicSettingsStore &&
    typeof logicSettingsStore.syncFromDom === "function"
  ) {
    logicSettingsStore.syncFromDom();
  }
}

function getMetronomeSettingsFromDom() {
  return logicSanitizeMetronomeSettings({
    tempo: dom.metronomeTempoInput ? dom.metronomeTempoInput.value : 120,
    beatsPerMeasure: dom.metronomeBeatsInput
      ? dom.metronomeBeatsInput.value
      : 4,
    xMeasures: dom.metronomeXMeasuresInput
      ? dom.metronomeXMeasuresInput.value
      : 4,
    yMeasures: dom.metronomeYMeasuresInput
      ? dom.metronomeYMeasuresInput.value
      : 8,
    countInMeasures: dom.metronomeCountInMeasuresInput
      ? dom.metronomeCountInMeasuresInput.value
      : 1,
    syncToSongs:
      dom.metronomeSyncSongs && dom.metronomeSyncSongs.checked ? true : false,
  });
}

function getSongMetronomeMeasureForTransport(measureNumber) {
  if (
    !Array.isArray(songMetronomeState.timeline) ||
    !songMetronomeState.timeline.length
  ) {
    return null;
  }
  if (
    !songMetronomeState.hasStarted &&
    songMetronomeState.countInMeasuresTotal
  ) {
    return songMetronomeState.timeline[0] || null;
  }
  const transportIndex =
    Math.max(1, parseInt(measureNumber, 10) || 1) -
    1 -
    songMetronomeState.transportMeasureOffset;
  return (
    songMetronomeState.timeline[
      ((transportIndex % songMetronomeState.timeline.length) +
        songMetronomeState.timeline.length) %
        songMetronomeState.timeline.length
    ] || null
  );
}

function isSongMetronomeCountInActive() {
  return (
    isSongMetronomeSyncActive() &&
    metronomeState.hasPlayedNote &&
    !songMetronomeState.hasStarted &&
    songMetronomeState.countInMeasuresCompleted > 0 &&
    songMetronomeState.countInMeasuresCompleted <=
      songMetronomeState.countInMeasuresTotal
  );
}

function getMetronomeBeatCountForMeasure(measureNumber) {
  if (isSongMetronomeSyncActive()) {
    const measure = getSongMetronomeMeasureForTransport(measureNumber);
    if (measure && measure.beatsPerMeasure) {
      return Math.max(1, parseInt(measure.beatsPerMeasure, 10) || 4);
    }
  }
  return Math.max(1, parseInt(metronomeState.beatsPerMeasure, 10) || 4);
}

function getMetronomeTickTypeForBeat(beatInMeasure, measureNumber) {
  if (isSongMetronomeSyncActive()) {
    const measure = getSongMetronomeMeasureForTransport(measureNumber);
    return logicGetSongSyncMetronomeTickType(
      beatInMeasure,
      measureNumber,
      measure,
      {
        hasStarted: songMetronomeState.hasStarted,
        countInMeasures: songMetronomeState.countInMeasuresTotal,
        xMeasures: metronomeState.xMeasures,
        yMeasures: metronomeState.yMeasures,
      },
    );
  }
  return logicGetMetronomeTickType(beatInMeasure, measureNumber, {
    xMeasures: metronomeState.xMeasures,
    yMeasures: metronomeState.yMeasures,
  });
}

function updateMetronomeControlAvailability() {
  const synced = isSongMetronomeSyncActive();
  if (dom.metronomeBeatsInput) {
    dom.metronomeBeatsInput.disabled = synced;
  }
}

function isMetronomeTypingTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

function isMetronomeEnterKey(event) {
  return (
    event.key === "Enter" ||
    event.code === "Enter" ||
    event.code === "NumpadEnter"
  );
}

function getMetronomeDigitFromKeyEvent(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const numpadCodeMatch = event.code.match(/^Numpad(\d)$/);
  if (numpadCodeMatch) return numpadCodeMatch[1];

  const digitCodeMatch = event.code.match(/^Digit(\d)$/);
  if (digitCodeMatch) return digitCodeMatch[1];

  return /^\d$/.test(event.key) ? event.key : null;
}

function renderMetronomePulseGrid() {
  if (!dom.metronomePulseGrid || !documentAvailable) return;

  dom.metronomePulseGrid.style.setProperty(
    "--beats-per-measure",
    String(metronomeState.beatsPerMeasure),
  );
  dom.metronomePulseGrid.innerHTML = "";

  for (let index = 0; index < metronomeState.beatsPerMeasure; index += 1) {
    const pulse = document.createElement("div");
    pulse.className = "metronomePulse";
    pulse.dataset.beat = String(index);

    const label = document.createElement("span");
    label.textContent = String(index + 1);
    pulse.appendChild(label);

    dom.metronomePulseGrid.appendChild(pulse);
  }
}

function getMetronomeSummaryTimeSignature() {
  if (isSongMetronomeSyncActive()) {
    const measure = getSongMetronomeMeasure();
    if (measure && measure.timeSignature) return measure.timeSignature;
  }
  return `${metronomeState.beatsPerMeasure}/4`;
}

function updateMetronomeSummary() {
  if (!dom.metronomeSummary) return;
  dom.metronomeSummary.textContent = `${getMetronomeSummaryTimeSignature()} at ${metronomeState.tempo} BPM`;
}

function updateMetronomeStatus() {
  if (!dom.metronomeStatus) return;
  if (isSongMetronomeSyncActive()) {
    const measure = getSongMetronomeMeasure();
    const timeSignature = measure ? measure.timeSignature || "4/4" : "4/4";
    const xText =
      metronomeState.xMeasures > 0
        ? `every ${metronomeState.xMeasures} measures`
        : "disabled";
    const yText =
      metronomeState.yMeasures > 0
        ? `every ${metronomeState.yMeasures} measures`
        : "disabled";
    const countInText =
      songMetronomeState.countInMeasuresTotal > 0
        ? ` Count-in: ${songMetronomeState.countInMeasuresTotal} measure${songMetronomeState.countInMeasuresTotal === 1 ? "" : "s"}.`
        : "";
    let message =
      `Song sync active. Time signature follows the chart (${timeSignature}). ` +
      `X marker: ${xText}. Y marker: ${yText}. ` +
      "Markers reset at section labels when present." +
      countInText;
    if (isSongMetronomeCountInActive()) {
      message += ` Waiting through count-in ${songMetronomeState.countInMeasuresCompleted} / ${songMetronomeState.countInMeasuresTotal}.`;
    }
    if (metronomeState.tempoEntryBuffer) {
      message += ` Pending tempo: ${metronomeState.tempoEntryBuffer}. Press Enter to apply, Backspace to edit, Escape to clear.`;
    }
    dom.metronomeStatus.textContent = message;
    return;
  }
  const xText =
    metronomeState.xMeasures > 0
      ? `every ${metronomeState.xMeasures} measures`
      : "disabled";
  const yText =
    metronomeState.yMeasures > 0
      ? `every ${metronomeState.yMeasures} measures`
      : "disabled";
  let message =
    `Downbeat on beat 1. X marker: ${xText}. Y marker: ${yText}. ` +
    "Priority when markers overlap: Y, then X, then downbeat, then regular beats.";

  if (metronomeState.tempoEntryBuffer) {
    message += ` Pending tempo: ${metronomeState.tempoEntryBuffer}. Press Enter to apply, Backspace to edit, Escape to clear.`;
  }

  dom.metronomeStatus.textContent = message;
}

function updateMetronomeReadout() {
  if (dom.metronomeTempoDisplay) {
    dom.metronomeTempoDisplay.textContent = String(metronomeState.tempo);
  }
  if (dom.metronomeMeasureDisplay) {
    dom.metronomeMeasureDisplay.textContent = isSongMetronomeSyncActive()
      ? isSongMetronomeCountInActive()
        ? `In ${songMetronomeState.countInMeasuresCompleted} / ${songMetronomeState.countInMeasuresTotal}`
        : String(songMetronomeState.currentMeasureIndex + 1)
      : String(
          logicGetMetronomeDisplayedMeasure(
            metronomeState.currentMeasure,
            metronomeState.xMeasures,
            metronomeState.yMeasures,
          ),
        );
  }
  if (dom.metronomeBeatDisplay) {
    dom.metronomeBeatDisplay.textContent = String(
      metronomeState.currentBeatInMeasure + 1,
    );
  }
  if (dom.metronomeTotalMeasuresDisplay) {
    dom.metronomeTotalMeasuresDisplay.textContent = String(
      logicGetMetronomeCompletedMeasures(
        metronomeState.hasPlayedNote,
        metronomeState.currentMeasure,
      ),
    );
  }
  if (dom.metronomeXRepeatDisplay) {
    if (isSongMetronomeSyncActive()) {
      const measure = getSongMetronomeMeasure();
      dom.metronomeXRepeatDisplay.textContent = isSongMetronomeCountInActive()
        ? "Count-in"
        : metronomeState.xMeasures > 0
          ? measure
            ? `${((measure.sectionMeasure - 1) % metronomeState.xMeasures) + 1} / ${metronomeState.xMeasures}`
            : `1 / ${metronomeState.xMeasures}`
          : "Off";
    } else {
      dom.metronomeXRepeatDisplay.textContent = logicGetMetronomeCycleDisplay(
        metronomeState.currentMeasure,
        metronomeState.xMeasures,
      );
    }
  }
  if (dom.metronomeYRepeatDisplay) {
    if (isSongMetronomeSyncActive()) {
      const measure = getSongMetronomeMeasure();
      dom.metronomeYRepeatDisplay.textContent = isSongMetronomeCountInActive()
        ? "Count-in"
        : metronomeState.yMeasures > 0
          ? measure
            ? `${((measure.sectionMeasure - 1) % metronomeState.yMeasures) + 1} / ${metronomeState.yMeasures}`
            : `1 / ${metronomeState.yMeasures}`
          : "Off";
    } else {
      dom.metronomeYRepeatDisplay.textContent = logicGetMetronomeCycleDisplay(
        metronomeState.currentMeasure,
        metronomeState.yMeasures,
      );
    }
  }
  updateMetronomeControlAvailability();
  updateMetronomeSummary();
  updateMetronomeStatus();
}

function clearMetronomePulseHighlights() {
  if (metronomeState.lastPulseTimeout) {
    clearTimeout(metronomeState.lastPulseTimeout);
    metronomeState.lastPulseTimeout = null;
  }
  if (!dom.metronomePulseGrid || !documentAvailable) return;
  dom.metronomePulseGrid
    .querySelectorAll(".metronomePulse")
    .forEach((pulse) => {
      pulse.className = "metronomePulse";
    });
}

function clearMetronomeScheduledVisuals() {
  metronomeState.visualTimeouts.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  metronomeState.visualTimeouts.clear();
}

function flashMetronomePulse(beatInMeasure, tickType) {
  clearMetronomePulseHighlights();
  if (!dom.metronomePulseGrid || !documentAvailable) return;
  const pulse = dom.metronomePulseGrid.querySelector(
    `[data-beat="${beatInMeasure}"]`,
  );
  if (!pulse) return;

  pulse.classList.add(`metronomePulse--${tickType}`, "is-active");
  metronomeState.lastPulseTimeout = window.setTimeout(() => {
    pulse.className = "metronomePulse";
  }, 180);
}

function playMetronomeTick(time, tickType) {
  const ctx = metronomeState.audioContext;
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const config = {
    normal: { frequency: 1200, duration: 0.03, volume: 0.11, type: "square" },
    measure: {
      frequency: 1600,
      duration: 0.05,
      volume: 0.14,
      type: "triangle",
    },
    x: { frequency: 950, duration: 0.07, volume: 0.17, type: "sawtooth" },
    y: { frequency: 720, duration: 0.09, volume: 0.19, type: "sawtooth" },
  }[tickType];

  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(config.frequency, time);
  gainNode.gain.setValueAtTime(0.0001, time);
  gainNode.gain.exponentialRampToValueAtTime(config.volume, time + 0.002);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + config.duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(time);
  oscillator.stop(time + config.duration + 0.01);
}

function scheduleMetronomeVisual(beatInMeasure, measureNumber, tickType, time) {
  const ctx = metronomeState.audioContext;
  if (!ctx) return;

  const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
  const timeoutId = window.setTimeout(() => {
    metronomeState.visualTimeouts.delete(timeoutId);
    if (!metronomeState.isRunning) return;
    const beatsForMeasure = getMetronomeBeatCountForMeasure(measureNumber);
    if (metronomeState.beatsPerMeasure !== beatsForMeasure) {
      metronomeState.beatsPerMeasure = beatsForMeasure;
      renderMetronomePulseGrid();
    }
    metronomeState.currentBeatInMeasure = beatInMeasure;
    metronomeState.currentMeasure = measureNumber;
    metronomeState.hasPlayedNote = true;
    handleSongMetronomeBeat(beatInMeasure);
    updateMetronomeReadout();
    flashMetronomePulse(beatInMeasure, tickType);
  }, delayMs);
  metronomeState.visualTimeouts.add(timeoutId);
}

function queueNextMetronomeBeatFromCurrentPosition() {
  if (!metronomeState.hasPlayedNote) {
    metronomeState.nextBeatInMeasure = 0;
    metronomeState.nextMeasure = 1;
    return;
  }

  metronomeState.nextBeatInMeasure = metronomeState.currentBeatInMeasure + 1;
  metronomeState.nextMeasure = metronomeState.currentMeasure;

  if (
    metronomeState.nextBeatInMeasure >=
    getMetronomeBeatCountForMeasure(metronomeState.currentMeasure)
  ) {
    metronomeState.nextBeatInMeasure = 0;
    metronomeState.nextMeasure += 1;
  }
}

function scheduleMetronomeNote() {
  const beatInMeasure = metronomeState.nextBeatInMeasure;
  const measureNumber = metronomeState.nextMeasure;
  const tickType = getMetronomeTickTypeForBeat(beatInMeasure, measureNumber);
  const beatsForMeasure = getMetronomeBeatCountForMeasure(measureNumber);

  playMetronomeTick(metronomeState.nextNoteTime, tickType);
  scheduleMetronomeVisual(
    beatInMeasure,
    measureNumber,
    tickType,
    metronomeState.nextNoteTime,
  );

  metronomeState.nextNoteTime += 60 / metronomeState.tempo;
  metronomeState.nextBeatInMeasure += 1;
  if (metronomeState.nextBeatInMeasure >= beatsForMeasure) {
    metronomeState.nextBeatInMeasure = 0;
    metronomeState.nextMeasure += 1;
  }
}

function runMetronomeScheduler() {
  if (!metronomeState.audioContext) return;
  while (
    metronomeState.nextNoteTime <
    metronomeState.audioContext.currentTime + metronomeState.scheduleAheadTime
  ) {
    scheduleMetronomeNote();
  }
}

async function ensureMetronomeAudioContext() {
  if (!metronomeState.audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("This browser does not support Web Audio.");
    }
    metronomeState.audioContext = new AudioContextCtor();
  }
  if (metronomeState.audioContext.state === "suspended") {
    await metronomeState.audioContext.resume();
  }
}

function clearPendingMetronomeTempoEntry() {
  if (metronomeState.tempoEntryTimeoutId) {
    clearTimeout(metronomeState.tempoEntryTimeoutId);
    metronomeState.tempoEntryTimeoutId = null;
  }
  if (!metronomeState.tempoEntryBuffer) return;
  metronomeState.tempoEntryBuffer = "";
  updateMetronomeStatus();
}

function setMetronomeTempo(value, options = {}) {
  const settings = logicSanitizeMetronomeSettings({ tempo: value });
  if (options.clearPending !== false) {
    clearPendingMetronomeTempoEntry();
  }
  metronomeState.tempo = settings.tempo;
  if (dom.metronomeTempoInput) {
    dom.metronomeTempoInput.value = String(settings.tempo);
  }
  if (dom.metronomeTempoNumberInput) {
    dom.metronomeTempoNumberInput.value = String(settings.tempo);
  }
  updateMetronomeReadout();
  if (options.save) {
    syncSettingsStore();
  }
}

function syncMetronomeSettings(options = {}) {
  const settings = getMetronomeSettingsFromDom();
  metronomeState.tempo = settings.tempo;
  songMetronomeState.countInMeasuresTotal = settings.countInMeasures;
  if (isSongMetronomeSyncActive()) {
    const currentMeasure = getSongMetronomeMeasure();
    metronomeState.beatsPerMeasure = currentMeasure
      ? currentMeasure.beatsPerMeasure
      : 4;
    metronomeState.xMeasures = settings.xMeasures;
    metronomeState.yMeasures = settings.yMeasures;
  } else {
    metronomeState.beatsPerMeasure = settings.beatsPerMeasure;
    metronomeState.xMeasures = settings.xMeasures;
    metronomeState.yMeasures = settings.yMeasures;
  }

  if (dom.metronomeTempoInput) {
    dom.metronomeTempoInput.value = String(settings.tempo);
  }
  if (dom.metronomeTempoNumberInput) {
    dom.metronomeTempoNumberInput.value = String(settings.tempo);
  }
  if (dom.metronomeBeatsInput && !isSongMetronomeSyncActive()) {
    dom.metronomeBeatsInput.value = String(settings.beatsPerMeasure);
  }
  if (dom.metronomeXMeasuresInput && !isSongMetronomeSyncActive()) {
    dom.metronomeXMeasuresInput.value = String(settings.xMeasures);
  }
  if (dom.metronomeYMeasuresInput && !isSongMetronomeSyncActive()) {
    dom.metronomeYMeasuresInput.value = String(settings.yMeasures);
  }
  if (dom.metronomeCountInMeasuresInput) {
    dom.metronomeCountInMeasuresInput.value = String(settings.countInMeasures);
  }

  if (
    metronomeState.currentBeatInMeasure >=
    getMetronomeBeatCountForMeasure(metronomeState.currentMeasure)
  ) {
    metronomeState.currentBeatInMeasure = 0;
  }
  if (
    metronomeState.nextBeatInMeasure >=
    getMetronomeBeatCountForMeasure(metronomeState.nextMeasure)
  ) {
    metronomeState.nextBeatInMeasure = 0;
    metronomeState.nextMeasure += 1;
  }

  renderMetronomePulseGrid();
  updateMetronomeReadout();
  if (options.save) {
    syncSettingsStore();
  }
}

function refreshMetronomeTempoEntryTimeout() {
  if (metronomeState.tempoEntryTimeoutId) {
    clearTimeout(metronomeState.tempoEntryTimeoutId);
  }
  metronomeState.tempoEntryTimeoutId = window.setTimeout(() => {
    metronomeState.tempoEntryTimeoutId = null;
    if (!metronomeState.tempoEntryBuffer) return;
    metronomeState.tempoEntryBuffer = "";
    updateMetronomeStatus();
  }, 3000);
}

function appendMetronomeTempoDigit(digit) {
  if (metronomeState.tempoEntryBuffer.length >= 3) {
    metronomeState.tempoEntryBuffer = digit;
  } else {
    metronomeState.tempoEntryBuffer += digit;
  }
  updateMetronomeStatus();
  refreshMetronomeTempoEntryTimeout();
}

function removeMetronomeTempoDigit() {
  if (!metronomeState.tempoEntryBuffer) return;
  metronomeState.tempoEntryBuffer = metronomeState.tempoEntryBuffer.slice(
    0,
    -1,
  );
  updateMetronomeStatus();
  if (metronomeState.tempoEntryBuffer) {
    refreshMetronomeTempoEntryTimeout();
    return;
  }
  clearPendingMetronomeTempoEntry();
}

function applyPendingMetronomeTempoEntry() {
  if (!metronomeState.tempoEntryBuffer) return;
  setMetronomeTempo(Number(metronomeState.tempoEntryBuffer), { save: true });
}

function adjustMetronomeTempoBy(step) {
  setMetronomeTempo(metronomeState.tempo + step, { save: true });
}

async function startMetronome() {
  try {
    await ensureMetronomeAudioContext();
  } catch (error) {
    if (dom.metronomeStatus) {
      dom.metronomeStatus.textContent =
        error && error.message
          ? error.message
          : "Unable to start metronome audio.";
    }
    return;
  }

  syncMetronomeSettings();
  metronomeState.isRunning = true;
  metronomeState.nextNoteTime = metronomeState.audioContext.currentTime + 0.05;
  queueNextMetronomeBeatFromCurrentPosition();
  metronomeState.schedulerTimer = window.setInterval(
    runMetronomeScheduler,
    metronomeState.lookaheadMs,
  );
  if (dom.metronomeToggleButton) {
    dom.metronomeToggleButton.textContent = "Stop";
  }
  runMetronomeScheduler();
}

function stopMetronome() {
  metronomeState.isRunning = false;
  clearSongAnswerTimer();
  if (metronomeState.schedulerTimer) {
    clearInterval(metronomeState.schedulerTimer);
    metronomeState.schedulerTimer = null;
  }
  clearMetronomeScheduledVisuals();
  clearMetronomePulseHighlights();
  if (dom.metronomeToggleButton) {
    dom.metronomeToggleButton.textContent = "Start";
  }
}

async function toggleMetronome() {
  if (metronomeState.isRunning) {
    stopMetronome();
    return;
  }
  await startMetronome();
}

async function resetMetronomeCount() {
  const wasRunning = metronomeState.isRunning;
  stopMetronome();
  metronomeState.hasPlayedNote = false;
  metronomeState.currentBeatInMeasure = 0;
  metronomeState.currentMeasure = 1;
  metronomeState.nextBeatInMeasure = 0;
  metronomeState.nextMeasure = 1;
  if (isSongMetronomeSyncEnabled()) {
    songMetronomeState.currentMeasureIndex = 0;
    songMetronomeState.currentChordIndexInMeasure = 0;
    songMetronomeState.chordStatuses = {};
    songMetronomeState.hasStarted = false;
    songMetronomeState.transportMeasureOffset = 0;
    songMetronomeState.countInMeasuresTotal =
      getMetronomeSettingsFromDom().countInMeasures;
    songMetronomeState.countInMeasuresCompleted = 0;
    loadCurrentProgressionChord();
    updateDisplay();
  }
  updateMetronomeReadout();
  clearMetronomePulseHighlights();
  if (wasRunning) {
    await startMetronome();
  }
}

async function handleMetronomeShortcut(event) {
  if (isMetronomeTypingTarget(event.target)) return;

  if (event.code === "Space") {
    event.preventDefault();
    await toggleMetronome();
    return;
  }

  const digit = getMetronomeDigitFromKeyEvent(event);
  if (digit !== null) {
    event.preventDefault();
    appendMetronomeTempoDigit(digit);
    return;
  }

  if (isMetronomeEnterKey(event) && metronomeState.tempoEntryBuffer) {
    event.preventDefault();
    applyPendingMetronomeTempoEntry();
    return;
  }

  if (event.key === "Backspace" && metronomeState.tempoEntryBuffer) {
    event.preventDefault();
    removeMetronomeTempoDigit();
    return;
  }

  if (event.key === "Escape" && metronomeState.tempoEntryBuffer) {
    event.preventDefault();
    clearPendingMetronomeTempoEntry();
    return;
  }

  const increase =
    event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
  const decrease =
    event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";

  if (!increase && !decrease) return;

  event.preventDefault();
  const step = event.shiftKey ? 5 : 1;
  adjustMetronomeTempoBy(increase ? step : -step);
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

function chordDisplayUsesRealbookGlyphs() {
  if (!documentAvailable || !document.documentElement) return false;
  const theme = document.documentElement.dataset.theme;
  return theme === "lightBook" || theme === "darkBook";
}

const REALBOOK_FLAT = "ь";
const REALBOOK_SUFFIX_FLAT = "β";
const REALBOOK_MINOR = "Μ";
const REALBOOK_MAJOR = "ª";
const REALBOOK_SEVENTH = "ί";
const REALBOOK_SIXTH = "ή";
const REALBOOK_NINTH = "α";
const REALBOOK_PLUS = "δ";
const REALBOOK_HALF_DIMINISHED = "Ø";
const REALBOOK_DIMINISHED = "°";

function formatStandardChordDisplayText(chordName) {
  return String(chordName || "")
    .replace(/#/g, "♯")
    .replace(/b/g, "♭")
    .replace(/Δ/g, "△");
}

function formatRealbookRootAccidental(accidental) {
  if (accidental === "b" || accidental === "♭" || accidental === REALBOOK_FLAT)
    return REALBOOK_FLAT;
  if (accidental === "♯" || accidental === "#") return "#";
  return "";
}

function formatRealbookChordSuffix(suffix) {
  let text = String(suffix || "")
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
    .replace(/Δ/g, "△");
  const compact = text.replace(/\s+/g, "");

  if (/^(?:m|-)?7?b5$/.test(compact) || /^ø7?$/i.test(compact)) {
    return REALBOOK_HALF_DIMINISHED;
  }
  if (/^(?:m|-)(?:M7?|ma7?|maj7?|△7?)$/.test(compact)) {
    return REALBOOK_MINOR + REALBOOK_MAJOR;
  }

  text = text.replace(/^(?:maj|ma|M|△)7?/, REALBOOK_MAJOR);
  text = text.replace(/^(?:min|mi|m)(?!aj)/, REALBOOK_MINOR);
  text = text.replace(/^-/, REALBOOK_MINOR);
  text = text.replace(/^dim/, REALBOOK_DIMINISHED);
  text = text.replace(/^[oº°]/, REALBOOK_DIMINISHED);
  text = text.replace(/^aug/, REALBOOK_PLUS);

  return text
    .replace(/ø/g, REALBOOK_HALF_DIMINISHED)
    .replace(/Ø/g, REALBOOK_HALF_DIMINISHED)
    .replace(/△/g, REALBOOK_MAJOR)
    .replace(/7/g, REALBOOK_SEVENTH)
    .replace(/6/g, REALBOOK_SIXTH)
    .replace(/9/g, REALBOOK_NINTH)
    .replace(/b/g, REALBOOK_SUFFIX_FLAT)
    .replace(/\+/g, REALBOOK_PLUS);
}

function formatRealbookNoteName(noteName) {
  const match = String(noteName || "").match(/^([A-G])([#b♯♭ь]?)$/);
  if (!match) return noteName;
  return match[1] + formatRealbookRootAccidental(match[2]);
}

function formatRealbookChordToken(token) {
  const match = String(token || "").match(/^([A-G])([#b♯♭ь]?)(.*)$/);
  if (!match) return token;

  const root = match[1] + formatRealbookRootAccidental(match[2]);
  const slashMatch = match[3].match(/^([^/]*)(\/[A-G][#b♯♭ь]?)(.*)$/);
  if (slashMatch) {
    const bass = slashMatch[2].slice(1);
    return (
      root +
      formatRealbookChordSuffix(slashMatch[1]) +
      "/" +
      formatRealbookNoteName(bass) +
      slashMatch[3]
    );
  }

  return root + formatRealbookChordSuffix(match[3]);
}

function formatRealbookFallbackSymbols(text) {
  return text
    .replace(/(^|[\s(/|,-])b(?=[ivIV]+)/g, `$1${REALBOOK_FLAT}`)
    .replace(/(?:maj|ma|M)7/g, REALBOOK_MAJOR)
    .replace(/△7?|Δ7?/g, REALBOOK_MAJOR)
    .replace(/ø7?/gi, REALBOOK_HALF_DIMINISHED)
    .replace(/[♭ь]/g, REALBOOK_FLAT)
    .replace(/♯/g, "#")
    .replace(/o(?=7|$)/g, REALBOOK_DIMINISHED)
    .replace(/º|°/g, REALBOOK_DIMINISHED)
    .replace(/\+/g, REALBOOK_PLUS)
    .replace(/7/g, REALBOOK_SEVENTH)
    .replace(/6/g, REALBOOK_SIXTH)
    .replace(/9/g, REALBOOK_NINTH);
}

function formatRealbookChordDisplayText(chordName) {
  const text = String(chordName || "");
  const withChordTokens = text.replace(
    /[A-G][#b♯♭ь]?[^\s()[\]{}|,;:]*/g,
    formatRealbookChordToken,
  );
  return formatRealbookFallbackSymbols(withChordTokens);
}

function formatChordDisplayText(chordName) {
  return chordDisplayUsesRealbookGlyphs()
    ? formatRealbookChordDisplayText(chordName)
    : formatStandardChordDisplayText(chordName);
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

function isSongMetronomeSyncEnabled() {
  return !!(dom.metronomeSyncSongs && dom.metronomeSyncSongs.checked);
}

function isSongMetronomeSyncActive() {
  return (
    isSongMetronomeSyncEnabled() &&
    modeIsSongs() &&
    !!currentSong &&
    Array.isArray(songMetronomeState.timeline) &&
    songMetronomeState.timeline.length > 0
  );
}

function resetSongMetronomeState() {
  songMetronomeState.timeline = [];
  songMetronomeState.currentMeasureIndex = 0;
  songMetronomeState.currentChordIndexInMeasure = 0;
  songMetronomeState.chordStatuses = {};
  songMetronomeState.hasStarted = false;
  songMetronomeState.transportMeasureOffset = 0;
  songMetronomeState.countInMeasuresTotal = 0;
  songMetronomeState.countInMeasuresCompleted = 0;
}

function rebuildSongMetronomeTimeline() {
  resetSongMetronomeState();
  if (!modeIsSongs() || !currentSong) return;
  const metronomeSettings = getMetronomeSettingsFromDom();
  const songSettings = getSongPracticeSettings();
  songMetronomeState.timeline = logicBuildSongPracticeTimeline(currentSong, {
    targetKey: getCurrentSongTargetKey(currentSong),
    displayRomanNumerals: !!songSettings.displayRomanNumerals,
  });
  songMetronomeState.countInMeasuresTotal = metronomeSettings.countInMeasures;
}

function getSongMetronomeMeasure(
  index = songMetronomeState.currentMeasureIndex,
) {
  if (
    !Array.isArray(songMetronomeState.timeline) ||
    index < 0 ||
    index >= songMetronomeState.timeline.length
  ) {
    return null;
  }
  return songMetronomeState.timeline[index];
}

function getSongMetronomeCurrentTarget() {
  const measure = getSongMetronomeMeasure();
  if (!measure || !Array.isArray(measure.chordTargets)) return null;
  if (
    songMetronomeState.currentChordIndexInMeasure < 0 ||
    songMetronomeState.currentChordIndexInMeasure >= measure.chordTargets.length
  ) {
    return null;
  }
  return measure.chordTargets[songMetronomeState.currentChordIndexInMeasure];
}

function getSongMetronomeActiveChordKey() {
  if (!songMetronomeState.hasStarted) return "";
  const target = getSongMetronomeCurrentTarget();
  if (!target) return "";
  const key = getSongChordPositionKey(target.measureIndex, target.chordIndex);
  return songMetronomeState.chordStatuses[key] === "complete" ? "" : key;
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
  const displayLabel = chordDisplayUsesRealbookGlyphs()
    ? formatChordDisplayText(label)
    : label;
  return escapeHtml(displayLabel).replace(
    /[♭♯]/g,
    (symbol) => `<span class="songMeasureAccidental">${symbol}</span>`,
  );
}

function buildSongChartHtml(
  song,
  activeEntry,
  completedEntries,
  hideLabels,
  songSyncState = null,
) {
  const songSettings = getSongPracticeSettings();
  const rows = buildSongDisplayRows(song, 4, {
    targetKey: getCurrentSongTargetKey(song),
    displayRomanNumerals: !!songSettings.displayRomanNumerals,
  });
  if (!rows.length) return "";

  const isSyncedSongChart =
    !!songSyncState &&
    Array.isArray(songSyncState.timeline) &&
    songSyncState.timeline.length > 0;
  const completedKeys = isSyncedSongChart
    ? new Set()
    : new Set(
        (Array.isArray(completedEntries) ? completedEntries : [])
          .filter(isSongChordEntry)
          .map((entry) =>
            getSongChordPositionKey(entry.measureIndex, entry.chordIndex),
          ),
      );
  const activeKey = isSyncedSongChart
    ? getSongMetronomeActiveChordKey()
    : isSongChordEntry(activeEntry)
      ? getSongChordPositionKey(
          activeEntry.measureIndex,
          activeEntry.chordIndex,
        )
      : "";
  const syncedStatuses = isSyncedSongChart
    ? songSyncState.chordStatuses || {}
    : null;

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
                    } else if (
                      syncedStatuses &&
                      syncedStatuses[key] === "missed"
                    ) {
                      classes.push("songMeasureChord--missed");
                    } else if (
                      syncedStatuses &&
                      syncedStatuses[key] === "complete"
                    ) {
                      classes.push("songMeasureChord--complete");
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
  return [bassValue].concat(
    notes.filter((note) => normalizePitchClass(note) !== bassValue),
  );
}

function resolveProgressionEntry(entry, options = {}) {
  const wrap = options.wrap !== false;
  const shouldApplyVoicing = !!options.applyVoicing;

  if (isSongChordEntry(entry)) {
    const internalName = entry.playableChord;
    let notes = generateNotesFromChordName(entry.playableChord);
    notes = addBassNoteToNotes(notes, entry.bassNote);
    if (shouldApplyVoicing) {
      notes = applySelectedVoicing(notes, internalName);
    }
    return {
      name: entry.label,
      notes,
      internalName,
    };
  }

  if (typeof entry !== "string") return null;

  if (isIntervalChord(entry)) {
    let [name, notes, resolvedInternalName] = getIntervalChordNotesAndName(
      keys[keyIndex],
      entry,
      wrap,
    );
    const internalName = resolvedInternalName || currentChordInternalName;
    if (shouldApplyVoicing) {
      notes = applySelectedVoicing(notes, internalName);
    }
    return {
      name,
      notes,
      internalName,
    };
  }

  if (isNamedChord(entry)) {
    const internalName = entry;
    let notes = generateNotesFromChordName(entry);
    if (shouldApplyVoicing) {
      notes = applySelectedVoicing(notes, internalName);
    }
    return {
      name: generateChordName(entry, ""),
      notes,
      internalName,
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

  // 'Random' root may actually be circle of fourths/fifths, and is generated
  // in nextKey(). Avoid repeating the previous chord when another chord type
  // is available without retrying indefinitely when the root cannot change.
  const randomRoot = keys[keyIndex];
  const alternateChordTypes = selectedChordTypes.filter(
    (type) => randomRoot + type !== lastChordInternalName,
  );
  const chordTypePool = alternateChordTypes.length
    ? alternateChordTypes
    : selectedChordTypes;
  const randomChordType =
    chordTypePool[Math.floor(Math.random() * chordTypePool.length)];

  currentChordInternalName = randomRoot + randomChordType;
  const baseNotes = generateNotesFromChordName(currentChordInternalName);
  currentChordNotes = applySelectedVoicing(baseNotes);
  currentChordName = generateChordName(randomRoot, randomChordType);
}

function handleKeyClick(key) {
  const midiKey = Number(key);
  if (Number.isNaN(midiKey)) return;

  if (activeKeys.includes(midiKey)) {
    handleKeyReleased(midiKey);
  } else {
    handleKeyPressed(midiKey);
  }

  checkChord({ advanceOnMatch: true });
}

function clearActiveKeys() {
  activeKeys.slice().forEach((midiKey) => {
    handleKeyReleased(midiKey);
  });
  activeKeys = [];
}

function handleKeyPressed(midiKey) {
  if (!Number.isFinite(midiKey)) return;

  const keyElement = document.querySelector(`.key[data-note="${midiKey}"]`);

  if (activeKeys.includes(midiKey)) {
    logVoicingDebug("key press ignored: already active", { midiKey });
    return;
  }
  activeKeys.push(midiKey);
  logVoicingDebug("key pressed", { midiKey });

  if (getSortedAnswerNotes().includes(normalizePitchClass(midiKey))) {
    if (keyElement) keyElement.classList.add("correct");
  } else {
    if (keyElement) keyElement.classList.add("incorrect");
    if (!(modeIsSongs() && isSongMetronomeSyncActive())) {
      isIncorrect = true;
      updateDisplay();
    }
  }
}

function handleKeyReleased(midiKey) {
  if (!Number.isFinite(midiKey)) return;

  const keyElement = document.querySelector(`.key[data-note="${midiKey}"]`);

  const idx = activeKeys.indexOf(midiKey);
  if (idx !== -1) {
    activeKeys.splice(idx, 1);
  }
  logVoicingDebug("key released", { midiKey, removed: idx !== -1 });

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
    updateDailyStatsSummary();
  }
}

function getSongPracticeSettings() {
  return logicSanitizeSongsPracticeSettings({
    useOriginalKey: dom.songUseOriginalKey
      ? !!dom.songUseOriginalKey.checked
      : true,
    advanceKeyOnRepeat: dom.songAdvanceKeyOnRepeat
      ? !!dom.songAdvanceKeyOnRepeat.checked
      : false,
    advanceKeyOnSongChange: dom.songAdvanceKeyOnSongChange
      ? !!dom.songAdvanceKeyOnSongChange.checked
      : false,
    finishAction: dom.songFinishAction ? dom.songFinishAction.value : "nothing",
    repeatCount: dom.songRepeatCount ? dom.songRepeatCount.value : 3,
    countChordsTowardGoals: dom.songCountGoals
      ? !!dom.songCountGoals.checked
      : true,
    displayRomanNumerals: dom.songDisplayRomanNumerals
      ? !!dom.songDisplayRomanNumerals.checked
      : false,
  });
}

function getCurrentSongTargetKey(song = currentSong) {
  if (!song || typeof song !== "object") return "";
  const settings = getSongPracticeSettings();
  if (settings.useOriginalKey) return song.key || "";
  return (Array.isArray(keys) && keys[keyIndex]) || song.key || "";
}

function shouldAdvanceSongKey(settingName) {
  const settings = getSongPracticeSettings();
  if (settings.useOriginalKey) return false;
  return !!settings[settingName];
}

function recordSongChordCompletion() {
  if (!modeIsSongs()) return;
  const songSettings = getSongPracticeSettings();
  if (!songSettings.countChordsTowardGoals) return;
  updateResultCounters({
    wasIncorrect: isIncorrect,
    correctElement: dom.cntChordsCorrect,
    incorrectElement: dom.cntChordsIncorrect,
    category: "chords",
  });
}

function recordSongPassCompletion() {
  if (!modeIsSongs()) return;
  updateResultCounters({
    wasIncorrect: isIncorrect,
    correctElement: dom.cntSongsCorrect,
    incorrectElement: dom.cntSongsIncorrect,
    category: "songs",
  });
}

function syncSelectedSongControls(songId) {
  if (
    logicSongsStore &&
    typeof logicSongsStore.setLastSelection === "function"
  ) {
    logicSongsStore.setLastSelection(songId);
  }
  if (dom.songFavoriteToggle && logicSongsStore) {
    const song = songId ? logicSongsStore.getSong(songId) : null;
    dom.songFavoriteToggle.checked = !!(song && song.favorite);
    dom.songFavoriteToggle.disabled = !song;
  }
}

function applySelectedSong(songId) {
  if (!dom.songSelect) return "";
  const targetId = typeof songId === "string" ? songId.trim() : "";
  if (!targetId) return dom.songSelect.value || "";
  dom.songSelect.value = targetId;
  syncSelectedSongControls(dom.songSelect.value || "");
  return dom.songSelect.value || "";
}

function chooseSongAfterFinish() {
  const songs = logicSongsStore ? logicSongsStore.listSongs() : [];
  const settings = getSongPracticeSettings();
  return logicPickSongIdForFinishAction(
    songs,
    currentSongId,
    settings.finishAction,
    Math.random(),
  );
}

function getSongShortcutAction(event) {
  if (!modeIsSongs() || isMetronomeTypingTarget(event.target)) return "";
  if (event.ctrlKey || event.metaKey || event.altKey) return "";

  const key = event && typeof event.key === "string" ? event.key : "";
  const code = event && typeof event.code === "string" ? event.code : "";
  if (key === "[" || key === "{" || code === "BracketLeft") {
    return "previous";
  }
  if (key === "]" || key === "}" || code === "BracketRight") {
    return "next";
  }
  return "";
}

function selectAdjacentSong(direction) {
  if (!modeIsSongs() || !logicSongsStore) return false;
  const songs = logicSongsStore.listSongs();
  if (!songs.length) return false;

  const currentId = (dom.songSelect && dom.songSelect.value) || currentSongId;
  const targetSongId = logicPickSongIdForSongNavigation(
    songs,
    currentId,
    direction,
  );
  if (!targetSongId) return false;

  applySelectedSong(targetSongId);
  resetFlow();
  return true;
}

function handleSongShortcut(event) {
  const action = getSongShortcutAction(event);
  if (!action) return false;
  event.preventDefault();
  return selectAdjacentSong(action);
}

function clearChordFeedbackState() {
  awaitingKeyRelease = false;
  pendingSuccessAdvanceAction = null;
  if (dom.chordDisplay) {
    dom.chordDisplay.classList.remove("correct");
    dom.chordDisplay.classList.remove("incorrect");
  }
}

function isVoicingDebugEnabled() {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("chordsDebugVoicing") === "1"
    );
  } catch (_) {
    return false;
  }
}

function formatDebugNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map((note) => ({
    midi: note,
    pitchClass:
      typeof normalizePitchClass === "function"
        ? normalizePitchClass(note)
        : note,
  }));
}

function logVoicingDebug(label, details = {}) {
  if (!isVoicingDebugEnabled()) return;
  console.log(`[voicing-debug] ${label}`, {
    key: Array.isArray(keys) ? keys[keyIndex] : undefined,
    keyIndex,
    currentIndex,
    currentChordName,
    currentChordInternalName,
    voicingMode:
      typeof getVoicingMode === "function" ? getVoicingMode() : undefined,
    upperMode: typeof getUpperMode === "function" ? getUpperMode() : undefined,
    upper1Mode:
      typeof getUpper1Mode === "function" ? getUpper1Mode() : undefined,
    awaitingKeyRelease,
    activeKeys: formatDebugNotes(activeKeys),
    currentChordNotes: formatDebugNotes(currentChordNotes),
    ...details,
  });
}

function advanceSongWithinCurrentMeasure() {
  const measure = getSongMetronomeMeasure();
  if (!measure) return;
  songMetronomeState.currentChordIndexInMeasure += 1;
  if (
    songMetronomeState.currentChordIndexInMeasure >=
    (measure.chordTargets || []).length
  ) {
    songMetronomeState.currentChordIndexInMeasure = Math.max(
      0,
      (measure.chordTargets || []).length - 1,
    );
  }
  loadCurrentProgressionChord();
  updateDisplay();
}

function handleSongMetronomeCorrectChord() {
  const target = getSongMetronomeCurrentTarget();
  if (!target) return;
  const key = getSongChordPositionKey(target.measureIndex, target.chordIndex);
  songMetronomeState.chordStatuses[key] = "complete";
  recordSongChordCompletion();

  const measure = getSongMetronomeMeasure();
  const hasMoreChords =
    !!measure &&
    songMetronomeState.currentChordIndexInMeasure <
      (measure.chordTargets || []).length - 1;
  if (!hasMoreChords && measure) {
    songMetronomeState.currentChordIndexInMeasure = (
      measure.chordTargets || []
    ).length;
  }
  pendingSuccessAdvanceAction = hasMoreChords
    ? advanceSongWithinCurrentMeasure
    : null;
}

function finalizeSongMeasureFromMetronome() {
  const measure = getSongMetronomeMeasure();
  if (!measure) return;
  const chordTargets = Array.isArray(measure.chordTargets)
    ? measure.chordTargets
    : [];
  let missedAny = false;
  chordTargets.forEach((target) => {
    const key = getSongChordPositionKey(target.measureIndex, target.chordIndex);
    if (songMetronomeState.chordStatuses[key] === "complete") return;
    songMetronomeState.chordStatuses[key] = "missed";
    missedAny = true;
  });
  if (missedAny) {
    isIncorrect = true;
  }
}

function completeSongPass(skip = false) {
  let shouldFinishSong = !!skip;
  let shouldAdvanceSongKeyOnRepeat = false;
  let shouldResetIncorrect = true;
  let selectedSongChanged = false;

  if (skip) {
    currentSongCompletedPasses = 0;
  } else {
    currentSongCompletedPasses += 1;
    recordSongPassCompletion();
    const songSettings = getSongPracticeSettings();
    if (currentSongCompletedPasses >= songSettings.repeatCount) {
      currentSongCompletedPasses = 0;
      shouldFinishSong = true;
    } else {
      shouldAdvanceSongKeyOnRepeat = shouldAdvanceSongKey("advanceKeyOnRepeat");
    }
  }

  if (shouldAdvanceSongKeyOnRepeat) {
    nextKey();
  }
  if (shouldFinishSong) {
    const previousSongId = currentSongId;
    const nextSongId = chooseSongAfterFinish();
    selectedSongChanged = !!nextSongId && nextSongId !== previousSongId;
    const shouldAdvanceSongKeyOnChange =
      selectedSongChanged && shouldAdvanceSongKey("advanceKeyOnSongChange");
    if (shouldAdvanceSongKeyOnChange) {
      nextKey();
    }
    applySelectedSong(nextSongId);
  }
  return { shouldResetIncorrect, selectedSongChanged };
}

function prepareSongChangeCountInFromCurrentBeat() {
  songMetronomeState.currentMeasureIndex = 0;
  songMetronomeState.currentChordIndexInMeasure = 0;
  songMetronomeState.hasStarted = false;
  songMetronomeState.transportMeasureOffset = metronomeState.currentMeasure - 1;
  songMetronomeState.countInMeasuresTotal =
    getMetronomeSettingsFromDom().countInMeasures;
  songMetronomeState.countInMeasuresCompleted =
    songMetronomeState.countInMeasuresTotal > 0 ? 1 : 0;
  loadCurrentProgressionChord();
  updateDisplay();
  updateMetronomeReadout();
}

function startSongMeasureFromMetronome() {
  if (!songMetronomeState.hasStarted) {
    songMetronomeState.transportMeasureOffset =
      metronomeState.currentMeasure - 1;
  }
  songMetronomeState.currentChordIndexInMeasure = 0;
  songMetronomeState.hasStarted = true;
  loadCurrentProgressionChord();
  updateDisplay();
  if (activeKeys.length) {
    checkChord();
  }
}

function advanceSongMeasureFromMetronome() {
  if (!isSongMetronomeSyncActive()) return;
  clearChordFeedbackState();
  finalizeSongMeasureFromMetronome();
  if (
    songMetronomeState.currentMeasureIndex >=
    songMetronomeState.timeline.length - 1
  ) {
    const { shouldResetIncorrect, selectedSongChanged } =
      completeSongPass(false);
    if (shouldResetIncorrect) {
      isIncorrect = false;
    }
    generateProgression();
    if (
      selectedSongChanged &&
      getMetronomeSettingsFromDom().countInMeasures > 0
    ) {
      prepareSongChangeCountInFromCurrentBeat();
      return;
    }
    songMetronomeState.currentMeasureIndex = 0;
    songMetronomeState.currentChordIndexInMeasure = 0;
    songMetronomeState.hasStarted = false;
    songMetronomeState.transportMeasureOffset =
      metronomeState.currentMeasure - 1;
    startSongMeasureFromMetronome();
    return;
  }

  songMetronomeState.currentMeasureIndex += 1;
  songMetronomeState.currentChordIndexInMeasure = 0;
  startSongMeasureFromMetronome();
}

function handleSongMetronomeBeat(beatInMeasure) {
  if (!isSongMetronomeSyncActive() || beatInMeasure !== 0) return;
  if (!songMetronomeState.hasStarted) {
    if (
      songMetronomeState.countInMeasuresCompleted <
      songMetronomeState.countInMeasuresTotal
    ) {
      songMetronomeState.countInMeasuresCompleted += 1;
      updateDisplay();
      return;
    }
    startSongMeasureFromMetronome();
    return;
  }
  advanceSongMeasureFromMetronome();
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
  const outputs = getAvailableMidiOutputs();
  const selected = outputs.filter((o) => selectedMidiOutputIds.has(o.id));
  const targets = selected.length ? selected : outputs.slice(0, 1);
  targets.forEach((out) => {
    out.send([0x90, note, velocity]);
    setTimeout(() => {
      out.send([0x80, note, 0]);
    }, time);
  });
}

function clearSongAnswerTimer() {
  if (!songAnswerTimer) return;
  clearTimeout(songAnswerTimer);
  songAnswerTimer = null;
}

function playAnswerNoteSet(notes, duration = 1000) {
  if (!Array.isArray(notes) || !notes.length) return;
  notes.forEach((note) => {
    sendMidiNote(note + 48, 70, duration);
  });
}

// Returns the current chord notes wrapped around the octave and sorted
function getSortedAnswerNotes() {
  return [...new Set(currentChordNotes.map(normalizePitchClass))].sort(
    (a, b) => a - b,
  );
}

function playAnswerNotes() {
  if (modeIsSongs() && isSongMetronomeSyncActive()) {
    playAnswerNoteSet(currentChordNotes);
    return;
  }

  if (modeIsChords()) {
    playAnswerNoteSet(currentChordNotes);
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

function shouldAllowLegatoChordOverlap() {
  return modeIsSongs();
}

function handleSuccessfulChordMatch(options = {}) {
  const advanceOnMatch = !!options.advanceOnMatch;
  const advanceImmediately =
    advanceOnMatch || modeIsProgressions() || modeIsJazz();
  const waitForRelease = !modeIsSongs() && !advanceImmediately;
  awaitingKeyRelease = waitForRelease;
  dom.chordDisplay.classList.remove("incorrect");
  dom.chordDisplay.classList.add("correct");

  if (modeIsChords()) {
    recordChordCompletion();
  } else if (modeIsDegrees()) {
    recordDegreeCompletion();
  } else if (modeIsSongs()) {
    if (isSongMetronomeSyncActive()) {
      handleSongMetronomeCorrectChord();
    } else {
      recordSongChordCompletion();
    }
  }

  clearTimeout(highlightTimer);
  highlightCorrectKeys();

  if (advanceImmediately) {
    clearActiveKeys();
  }

  if (waitForRelease) {
    updateDisplay();
    return;
  }

  const advanceAction = pendingSuccessAdvanceAction;
  clearChordFeedbackState();
  if (typeof advanceAction === "function") {
    advanceAction();
  } else if (!(modeIsSongs() && isSongMetronomeSyncActive())) {
    nextChord();
  } else {
    loadCurrentProgressionChord();
    updateDisplay();
  }
}

function checkChord(options = {}) {
  logVoicingDebug("checkChord start");
  if (awaitingKeyRelease) {
    if (activeKeys.length > 0) {
      logVoicingDebug("checkChord awaiting release: active keys remain");
      return;
    }

    const advanceAction = pendingSuccessAdvanceAction;
    clearChordFeedbackState();
    if (typeof advanceAction === "function") {
      advanceAction();
    } else if (!(modeIsSongs() && isSongMetronomeSyncActive())) {
      nextChord();
    } else {
      loadCurrentProgressionChord();
      updateDisplay();
    }
    return;
  }

  let sortedCurrentChordNotes = getSortedAnswerNotes();
  // Turn keys into notes 0-11, remove duplicates, sort for matching
  let sortedActiveNotes = [
    ...new Set(activeKeys.map(normalizePitchClass)),
  ].sort((a, b) => a - b);
  const allowLegatoOverlap = shouldAllowLegatoChordOverlap();
  const markChordCorrect = () => {
    handleSuccessfulChordMatch(options);
  };

  if (modeIsChords() || modeIsProgressions() || modeIsJazz() || modeIsSongs()) {
    let cachedIntervals = null;
    let cachedIntervalVariants = null;
    const ensureIntervals = () => {
      if (!cachedIntervals) {
        cachedIntervals = getTargetUpperIntervals(currentChordInternalName);
      }
      return cachedIntervals;
    };
    const ensureIntervalVariants = () => {
      if (!cachedIntervalVariants) {
        cachedIntervalVariants =
          typeof getTargetUpperIntervalVariants === "function"
            ? getTargetUpperIntervalVariants(currentChordInternalName)
            : [ensureIntervals()];
      }
      return cachedIntervalVariants;
    };

    if (typeof getUpper1Mode === "function") {
      const upper1Mode = getUpper1Mode();
      if (
        upper1Mode === "typeA" ||
        upper1Mode === "typeB" ||
        upper1Mode === "either"
      ) {
        logVoicingDebug("checking upper1 voicing", {
          mode: upper1Mode,
          intervalVariants: ensureIntervalVariants(),
        });
        const outcome = enforceTypedVoicing(
          activeKeys,
          upper1Mode,
          3,
          ensureIntervalVariants(),
          options,
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
        logVoicingDebug("checking upper voicing", {
          mode: upperMode,
          intervalVariants: ensureIntervalVariants(),
        });
        const outcome = enforceTypedVoicing(
          activeKeys,
          upperMode,
          4,
          ensureIntervalVariants(),
          options,
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
      if (allowLegatoOverlap) {
        return normalizedCombo.every((note) =>
          sortedActiveNotes.includes(note),
        );
      }
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
  const matchesExactChord =
    sortedCurrentChordNotes.length === sortedActiveNotes.length &&
    sortedCurrentChordNotes.every(
      (chordNote, index) => chordNote === sortedActiveNotes[index],
    );
  const matchesLegatoOverlap =
    allowLegatoOverlap &&
    sortedCurrentChordNotes.every((chordNote) =>
      sortedActiveNotes.includes(chordNote),
    );

  if (matchesExactChord || matchesLegatoOverlap) {
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

function highlightCorrectKeys(options = {}) {
  const immediate = !!options.immediate;
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
  if (immediate || delay <= 0) {
    applyHighlight();
    highlightTimer = null;
    return;
  }

  highlightTimer = setTimeout(applyHighlight, delay);
}

function isKeyboardAnswerShowing() {
  return documentAvailable && !!document.querySelector(".key.highlight");
}

function refreshSyncedSongKeyboardFeedback(options = {}) {
  clearSongAnswerTimer();
  highlightCorrectKeys({ immediate: !!options.immediateHighlight });

  if (
    !(
      modeIsSongs() &&
      isSongMetronomeSyncActive() &&
      metronomeState.isRunning &&
      dom.sendMidiNotes &&
      dom.sendMidiNotes.checked &&
      currentChordNotes.length
    )
  ) {
    return;
  }

  const notesToPlay = currentChordNotes.slice();
  songAnswerTimer = setTimeout(() => {
    songAnswerTimer = null;
    if (
      !(
        modeIsSongs() &&
        isSongMetronomeSyncActive() &&
        metronomeState.isRunning
      )
    ) {
      return;
    }
    playAnswerNoteSet(notesToPlay, 500);
  }, 200);
}

function refreshKeyboardAnswerFeedback(options = {}) {
  if (modeIsSongs() && isSongMetronomeSyncActive()) {
    refreshSyncedSongKeyboardFeedback(options);
    return;
  }
  highlightCorrectKeys({ immediate: !!options.immediateHighlight });
}

function onMIDISuccess(midiAccessResult) {
  midiAccess = midiAccessResult;
  midiAccess.onstatechange = handleMidiStateChange;

  refreshMidiDeviceState();
}

function handleMidiStateChange() {
  refreshMidiDeviceState();
}

function setMidiStatusText(statusText, keyboardStatusText = statusText) {
  if (dom.midiStatusText) {
    dom.midiStatusText.textContent = statusText;
  }
  if (dom.keyboardSummary) {
    dom.keyboardSummary.textContent = keyboardStatusText;
  }
}

function updateMidiKeyboardSummary(
  inputs = getAvailableMidiInputs(),
  outputs = getAvailableMidiOutputs(),
) {
  if (!dom.keyboardSummary) return;
  if (!midiAccess) {
    dom.keyboardSummary.textContent = "MIDI: not connected";
    return;
  }
  if (!inputs.length) {
    dom.keyboardSummary.textContent = "MIDI: no inputs";
    return;
  }

  const activeInputs = inputs.filter((input) =>
    selectedMidiInputIds.has(input.id),
  ).length;
  dom.keyboardSummary.textContent = `MIDI: ${activeInputs} in / ${outputs.length} out`;
}

function refreshMidiDeviceState() {
  if (!midiAccess) return;

  const inputs = getAvailableMidiInputs();
  const outputs = getAvailableMidiOutputs();

  initializeDefaultMidiSelections(inputs, outputs);

  // If there are no inputs, notify the user.
  if (!inputs.length) {
    setMidiStatusText(
      "No MIDI inputs detected. Please connect a MIDI device.",
      "MIDI: no inputs",
    );
  } else {
    setMidiStatusText("MIDI connected.");
    updateMidiKeyboardSummary(inputs, outputs);
  }

  renderMidiDeviceTables(inputs, outputs);
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
  setMidiStatusText(
    "Failed to get MIDI access. Error: " + error,
    "MIDI: access failed",
  );
}

function requestMIDIDeviceAccess() {
  if (!navigator.requestMIDIAccess) {
    setMidiStatusText(
      "Your browser does not support MIDI access. Please ensure you are using a browser that supports WebMIDI, and that you are accessing this site from HTTPS, as some browsers require secure connections for WebMIDI.",
      "MIDI: unsupported",
    );
    return;
  }
  navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
}

function initMIDI() {
  // Initialize MIDI access
  requestMIDIDeviceAccess();
}

function refreshMIDIDevices() {
  setMidiStatusText("Refreshing MIDI devices...", "MIDI: refreshing");
  requestMIDIDeviceAccess();
}

function getMidiPortName(port) {
  return port && typeof port.name === "string" ? port.name : "";
}

function midiPortIsConnected(port) {
  return !port || port.state !== "disconnected";
}

function midiInputIsIgnored(input) {
  const name = getMidiPortName(input);
  return name.includes("Output connection") || name.includes("Midi Through");
}

function getAvailableMidiInputs() {
  if (!midiAccess) return [];
  return Array.from(midiAccess.inputs.values()).filter(
    (input) => midiPortIsConnected(input) && !midiInputIsIgnored(input),
  );
}

function getAvailableMidiOutputs() {
  if (!midiAccess) return [];
  return Array.from(midiAccess.outputs.values()).filter(midiPortIsConnected);
}

function initializeDefaultMidiSelections(inputs, outputs) {
  inputs.forEach((input) => {
    if (!disabledMidiInputIds.has(input.id)) {
      selectedMidiInputIds.add(input.id);
    }
  });
  if (!midiOutputDefaultsInitialized && outputs[0]) {
    selectedMidiOutputIds.add(outputs[0].id);
    midiOutputDefaultsInitialized = true;
  }
}

function renderMidiDeviceTables(
  inputs = getAvailableMidiInputs(),
  outputs = getAvailableMidiOutputs(),
) {
  if (!midiAccess) return;
  const inputsTable = dom.midiInputs;
  const outputsTable = dom.midiOutputs;
  if (!inputsTable || !outputsTable) return;

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
        if (e.target.checked) {
          disabledMidiInputIds.delete(id);
          selectedMidiInputIds.add(id);
        } else {
          disabledMidiInputIds.add(id);
          selectedMidiInputIds.delete(id);
        }
        updateMidiKeyboardSummary(inputs, outputs);
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
        updateMidiKeyboardSummary(inputs, outputs);
      });
    });
}

function refreshMidiListeners() {
  if (!midiAccess) return;
  const inputs = Array.from(midiAccess.inputs.values());
  inputs.forEach((input) => {
    // Skip loopback-ish inputs
    if (!midiPortIsConnected(input) || midiInputIsIgnored(input)) {
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

function syncRandomFlowStartKey({ save = true } = {}) {
  if (!dom.flowSelect || !dom.flowStartSelect) return;
  if (dom.flowSelect.value !== "random") return;
  if (!Array.isArray(keys) || !keys.length) return;
  if (!Number.isFinite(keyIndex) || keyIndex < 0 || keyIndex >= keys.length) {
    return;
  }

  const currentKey = keys[keyIndex];
  if (typeof currentKey !== "string" || !currentKey) return;

  dom.flowStartSelect.value = currentKey;
  if (save) {
    syncSettingsStore();
  }
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
  syncRandomFlowStartKey();
}

function loadCurrentProgressionChord() {
  if (!Array.isArray(currentProgression) || !currentProgression.length) {
    if (modeIsSongs()) {
      currentChordName = "";
      currentChordInternalName = "";
      currentChordNotes = [];
      refreshSyncedSongKeyboardFeedback();
      return;
    }
    setRandomChord();
    return;
  }

  if (modeIsSongs() && isSongMetronomeSyncActive()) {
    const target = getSongMetronomeCurrentTarget();
    if (target && Number.isFinite(target.progressionIndex)) {
      currentIndex = target.progressionIndex;
    } else {
      currentChordName = "";
      currentChordInternalName = "";
      currentChordNotes = [];
      refreshSyncedSongKeyboardFeedback();
      return;
    }
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
      refreshSyncedSongKeyboardFeedback();
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
    refreshSyncedSongKeyboardFeedback();
    return;
  }

  setRandomChord();
}

function resetFlow() {
  clearTimeout(highlightTimer);
  highlightTimer = null;
  clearSongAnswerTimer();
  clearChordFeedbackState();
  isIncorrect = false;
  activeKeys = [];

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

  syncRandomFlowStartKey();

  currentIndex = 0;
  currentProgression = [];
  currentProgressionName = "";
  selectedProgression = "";
  currentSongId = "";
  currentSong = null;
  currentSongCompletedPasses = 0;
  scheduledRepeat = null;
  isIncorrect = false;
  resetSongMetronomeState();

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

  syncMetronomeSettings();
  if (modeIsSongs() && isSongMetronomeSyncEnabled()) {
    resetMetronomeCount();
  }
  highlightCorrectKeys();
  updateDisplay();
}

function populateStartingKeyOptions() {
  const select = dom.flowStartSelect;
  if (!select || typeof normalNotes === "undefined") return;

  const previous =
    (select.dataset && select.dataset.pendingValue) || select.value;
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
  if (
    select.dataset &&
    Object.prototype.hasOwnProperty.call(select.dataset, "pendingValue")
  ) {
    delete select.dataset.pendingValue;
  }
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
      let shouldAdvanceKey = true;
      let shouldResetIncorrect = true;
      if (modeIsProgressions()) {
        updateResultCounters({
          wasIncorrect: isIncorrect,
          skipCorrect: skip,
          correctElement: dom.cntProgsCorrect,
          incorrectElement: dom.cntProgsIncorrect,
          category: "progressions",
        });
      } else if (modeIsSongs()) {
        shouldAdvanceKey = false;
        shouldResetIncorrect = completeSongPass(skip).shouldResetIncorrect;
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

      if (shouldResetIncorrect) {
        isIncorrect = false;
      }

      if (shouldAdvanceKey) {
        nextKey();
      }
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

function progressionNameIsChordList(name) {
  const text = String(name || "").trim();
  if (!text.includes("-")) return false;

  const chordNamePattern =
    /^(?:[#b♯♭]?[ivIV]+|[A-G][#b♯♭]?)(?:[a-zA-Z0-9#b♯♭+\-°ºø△Δ]*)$/;
  const parts = text.split("-").map((part) => part.trim());
  return parts.length > 1 && parts.every((part) => chordNamePattern.test(part));
}

function shouldHideCurrentProgressionName(hideChordName) {
  return hideChordName && progressionNameIsChordList(currentProgressionName);
}

function getProgressionEntryLabel(entry) {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry.label === "string") return entry.label;
  return "";
}

function normalizeProgressionTitle(value) {
  return String(value || "")
    .trim()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, "");
}

function progressionNameMatchesChordSeries(name, progression) {
  if (!Array.isArray(progression) || !progression.length) return false;
  const chordSeries = progression.map(getProgressionEntryLabel).join("-");
  return (
    normalizeProgressionTitle(name) === normalizeProgressionTitle(chordSeries)
  );
}

function buildProgressionSequenceHtml(progression, hideNumerals) {
  return progression
    .map((entry, index) => {
      const label = getProgressionEntryLabel(entry);
      const stateClass =
        currentIndex === index
          ? " chord--current"
          : currentIndex > index
            ? " chord--complete"
            : "";
      const title = hideNumerals ? ` title="${escapeHtml(label)}"` : "";
      const text = hideNumerals ? "?" : formatChordDisplayText(label);
      return `<span class="chord${stateClass}"${title}>${escapeHtml(text)}</span>`;
    })
    .join(" - ");
}

function updateDisplay() {
  let hideChordName = dom.hideProgressionChordNames.checked;
  let hideNumerals = dom.hideProgressionChordNumerals.checked;
  const showProgressionHeadline =
    !modeIsChords() &&
    !modeIsSongs() &&
    progressionNameMatchesChordSeries(
      currentProgressionName,
      currentProgression,
    );

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
    dom.progressionHeadline.style.display = "none";
    dom.progressionDisplay.style.display = "none";
    dom.cadenceDisplay.style.display = "none";
  } else {
    dom.chordDisplay.style.display = "none";
    dom.currentKey.style.display = "inline";
    dom.cadenceDisplay.style.display = showProgressionHeadline
      ? "none"
      : "inline";
    dom.progressionHeadline.style.display = showProgressionHeadline
      ? "inline"
      : "none";
    dom.progressionDisplay.style.display = showProgressionHeadline
      ? "none"
      : "block";
  }

  let text = formatChordDisplayText(currentChordName);

  dom.chordDisplay.textContent = text;
  dom.chordDisplay.title = "";

  if (isIncorrect) {
    dom.chordDisplay.classList.add("incorrect");
  } else {
    dom.chordDisplay.classList.remove("incorrect");
  }

  const currentKeyText =
    modeIsSongs() && currentSong
      ? logicFormatKeyDisplay(getCurrentSongTargetKey(currentSong))
      : logicFormatKeyDisplay(keys[keyIndex]);
  dom.currentKey.textContent = formatChordDisplayText(currentKeyText);

  if (Array.isArray(currentProgression)) {
    if (modeIsSongs() && currentSong) {
      dom.progressionHeadline.innerHTML = "";
      dom.progressionDisplay.innerHTML = buildSongChartHtml(
        currentSong,
        currentProgression[currentIndex],
        currentProgression.slice(0, currentIndex),
        hideNumerals,
        isSongMetronomeSyncActive() ? songMetronomeState : null,
      );
    } else {
      const sequenceHtml = buildProgressionSequenceHtml(
        currentProgression,
        hideNumerals,
      );
      dom.progressionHeadline.innerHTML = showProgressionHeadline
        ? sequenceHtml
        : "";
      dom.progressionDisplay.innerHTML = showProgressionHeadline
        ? ""
        : sequenceHtml;
    }
  } else {
    dom.progressionHeadline.innerHTML = "";
    dom.progressionDisplay.innerHTML = "";
  }

  if (shouldHideCurrentProgressionName(hideChordName)) {
    dom.cadenceDisplay.textContent = " ?";
  } else {
    dom.cadenceDisplay.textContent = " " + currentProgressionName;
  }
}

function refreshDisplayForThemeChange() {
  if (!documentAvailable || typeof modeIsChords !== "function") return;
  updateDisplay();
}

sharedGlobals.refreshDisplayForThemeChange = refreshDisplayForThemeChange;
if (runtimeRoot) {
  runtimeRoot.refreshDisplayForThemeChange = refreshDisplayForThemeChange;
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
  let majorSeventh = degree.match(/M7/) || degree.match(/[Δ△]/);
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

  const internalName = degreeChordRoot + chordQuality + chord7th + ext;

  return [
    generateChordName(degreeChordRoot, chordQuality + chord7th + ext),
    generateNotesFromChordName(internalName),
    internalName,
  ];
}

function generateProgression() {
  dom.currentKey.textContent = logicFormatKeyDisplay(keys[keyIndex]);

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

    const selectedOption =
      dom.progressionSelect.options[dom.progressionSelect.selectedIndex];
    currentProgressionName = selectedOption
      ? selectedOption.textContent.trim()
      : dom.progressionSelect.value;
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
      enabledCadences["Regular"] = ["ii7", "V7", "I△"];
      enabledNames["Regular"] = "Regular";
    }

    selectedProgression =
      Object.keys(enabledCadences)[
        Math.floor(Math.random() * Object.keys(enabledCadences).length)
      ];
    currentProgression = enabledCadences[selectedProgression];
    currentProgressionName = enabledNames[selectedProgression];
  } else if (modeIsSongs()) {
    const selectedSongId = dom.songSelect ? dom.songSelect.value || "" : "";
    if (selectedSongId !== currentSongId) {
      currentSongCompletedPasses = 0;
    }
    currentSongId = selectedSongId;
    if (!currentSongId || !logicSongsStore) {
      currentProgression = [];
      currentProgressionName = "";
      currentSong = null;
      currentChordName = "";
      currentChordInternalName = "";
      currentChordNotes = [];
      keys = [];
      resetSongMetronomeState();
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
      resetSongMetronomeState();
      return;
    }
    const songSettings = getSongPracticeSettings();
    currentSong = song;
    if (songSettings.useOriginalKey) {
      keys = [song.key];
      keyIndex = 0;
    } else if (!Array.isArray(keys) || !keys.length) {
      keys = [song.key];
      keyIndex = 0;
    } else if (keyIndex < 0 || keyIndex >= keys.length) {
      keyIndex = 0;
    }
    currentProgression = buildPlayableSongEntries(song, {
      targetKey: getCurrentSongTargetKey(song),
      displayRomanNumerals: !!songSettings.displayRomanNumerals,
    });
    currentProgressionName = song.title;
    rebuildSongMetronomeTimeline();
  }
}

dom.hideProgressionChordNames.addEventListener("change", updateDisplay);
dom.hideProgressionChordNumerals.addEventListener("change", updateDisplay);

if (
  dom.metronomeToggleButton &&
  typeof dom.metronomeToggleButton.addEventListener === "function"
) {
  dom.metronomeToggleButton.addEventListener("click", () => {
    toggleMetronome();
  });
}

if (
  dom.metronomeResetButton &&
  typeof dom.metronomeResetButton.addEventListener === "function"
) {
  dom.metronomeResetButton.addEventListener("click", () => {
    resetMetronomeCount();
  });
}

if (
  dom.metronomeTempoInput &&
  typeof dom.metronomeTempoInput.addEventListener === "function"
) {
  dom.metronomeTempoInput.addEventListener("input", () => {
    setMetronomeTempo(dom.metronomeTempoInput.value, { save: true });
  });
}

if (
  dom.metronomeTempoNumberInput &&
  typeof dom.metronomeTempoNumberInput.addEventListener === "function"
) {
  dom.metronomeTempoNumberInput.addEventListener("change", () => {
    setMetronomeTempo(dom.metronomeTempoNumberInput.value, { save: true });
  });
  dom.metronomeTempoNumberInput.addEventListener("keydown", (event) => {
    if (!isMetronomeEnterKey(event)) return;
    event.preventDefault();
    setMetronomeTempo(dom.metronomeTempoNumberInput.value, { save: true });
  });
}

[
  dom.metronomeBeatsInput,
  dom.metronomeXMeasuresInput,
  dom.metronomeYMeasuresInput,
  dom.metronomeCountInMeasuresInput,
].forEach((input) => {
  if (!input || typeof input.addEventListener !== "function") return;
  input.addEventListener("change", () => {
    syncMetronomeSettings({ save: true });
  });
});

if (
  dom.metronomeSyncSongs &&
  typeof dom.metronomeSyncSongs.addEventListener === "function"
) {
  dom.metronomeSyncSongs.addEventListener("change", () => {
    syncMetronomeSettings({ save: true });
    if (modeIsSongs()) {
      resetFlow();
      return;
    }
    resetMetronomeCount();
  });
}

if (documentAvailable && typeof document.addEventListener === "function") {
  document.addEventListener("keydown", async (event) => {
    if (handleSongShortcut(event)) return;
    await handleMetronomeShortcut(event);
  });
}

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
syncMetronomeSettings();
// Apply shell voicing according to selected mode (all chord-based modes)
function applyShellVoicing(
  notes,
  chordInternalName = currentChordInternalName,
) {
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
    const result = computeShellVoicing(notes, chordInternalName, mode);
    currentShellVoicingAlternates = result.alternates;
    return Array.isArray(result.notes) ? result.notes : notes;
  } catch (_) {
    return notes;
  }
}

function handleTypedVoicingSuccess(options = {}) {
  handleSuccessfulChordMatch(options);
}

function enforceTypedVoicing(
  activeNotes,
  mode,
  requiredLength,
  intervals,
  options = {},
) {
  if (mode !== "typeA" && mode !== "typeB" && mode !== "either") return "none";
  const variants = Array.isArray(intervals) ? intervals : [intervals];
  const matchesVariant = variants.some((intervalSet) => {
    if (!intervalSet) return false;
    const { orderA, orderB } = buildVoicingOrders(intervalSet, requiredLength);
    return checkTypedVoicing(activeNotes, requiredLength, orderA, orderB, mode);
  });
  logVoicingDebug("typed voicing result", {
    mode,
    requiredLength,
    intervalVariants: variants,
    matched: matchesVariant,
  });
  if (!matchesVariant) {
    return "waiting";
  }
  handleTypedVoicingSuccess(options);
  return "handled";
}

function checkTypedVoicing(activeNotes, requiredLength, orderA, orderB, mode) {
  const sorted = [...new Set(activeNotes.map(Number))].sort((a, b) => a - b);
  if (sorted.length !== requiredLength) {
    logVoicingDebug("typed voicing length mismatch", {
      mode,
      requiredLength,
      rawActiveNotes: formatDebugNotes(activeNotes),
      uniqueSortedNotes: formatDebugNotes(sorted),
      orderA,
      orderB,
    });
    return false;
  }
  const matchesA = matchesVoicingOrderSorted(sorted, orderA);
  const matchesB = matchesVoicingOrderSorted(sorted, orderB);
  logVoicingDebug("typed voicing order check", {
    mode,
    requiredLength,
    rawActiveNotes: formatDebugNotes(activeNotes),
    uniqueSortedNotes: formatDebugNotes(sorted),
    orderA,
    orderB,
    orderAPitchClasses: orderA.map(normalizePitchClass),
    orderBPitchClasses: orderB.map(normalizePitchClass),
    matchesA,
    matchesB,
  });

  if (mode === "typeA") return matchesA;
  if (mode === "typeB") return matchesB;
  if (mode === "either") return matchesA || matchesB;
  return false;
}

// Apply selected voicing (typed upper voicings take precedence).
function applySelectedVoicing(
  notes,
  chordInternalName = currentChordInternalName,
) {
  try {
    currentShellVoicingAlternates = null;
    let intervalsCache = null;
    const ensureIntervals = () => {
      if (!intervalsCache) {
        intervalsCache = getTargetUpperIntervals(chordInternalName);
      }
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
    if (
      typeof applyVoicingToNotes === "function" &&
      typeof getVoicingMode === "function"
    ) {
      const result = applyVoicingToNotes(
        notes,
        chordInternalName,
        getVoicingMode(),
      );
      currentShellVoicingAlternates = result.alternates;
      return Array.isArray(result.notes) ? result.notes : notes;
    }
    return applyShellVoicing(notes, chordInternalName);
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
      const wasShowingKeyboardAnswer = isKeyboardAnswerShowing();
      const base = generateNotesFromChordName(currentChordInternalName);
      // If switching to any non-default voicing and current chord lacks a 4th tone, skip it
      try {
        const voicingMode =
          typeof getVoicingMode === "function" ? getVoicingMode() : "default";
        const requiresFour =
          typeof voicingModeRequiresFourNotes === "function"
            ? voicingModeRequiresFourNotes(voicingMode)
            : voicingMode.startsWith("shell:") ||
              voicingMode.startsWith("upper:") ||
              voicingMode.startsWith("upper1:");
        if (requiresFour && base.length < 4) {
          nextChord(true);
          return;
        }
      } catch (_) {}
      currentChordNotes = applySelectedVoicing(base);
      refreshKeyboardAnswerFeedback({
        immediateHighlight: wasShowingKeyboardAnswer,
      });
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
