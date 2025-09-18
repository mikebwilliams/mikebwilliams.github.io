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

let highlightTimer;

/* Unified Spaced Repetition queue */
// Entry: { kind: 'chord'|'brick', key: string, interval: number, counter: number, successStreak: number }
let spacedQueueAll = [];
let scheduledRepeat = null; // { kind, index }

const dom = window.domElements;

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

function generateNotesFromChordName(chordName) {
  let rootNotePattern = /^[A-G](#|b)?/; // Matches the root note
  let rootNoteName = chordName.match(rootNotePattern)[0];

  let rootValue = noteValues[rootNoteName];

  let chordType = chordName.replace(rootNotePattern, ""); // Get everything after the root note

  // Search all chord structure names for a matching type
  for (let key in chordStructureNames) {
    if (chordStructureNames[key].includes(chordType)) {
      return chordStructures[key].map((interval) => rootValue + interval);
    }
  }

  console.error("Unknown chord type:", chordType);
  return [];
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
}) {
  if (wasIncorrect) {
    incrementTextContent(incorrectElement);
  } else if (!skipCorrect) {
    incrementTextContent(correctElement);
  }
}

function recordChordCompletion() {
  spacedRepHandleResult("chord", currentChordInternalName, isIncorrect);
  updateResultCounters({
    wasIncorrect: isIncorrect,
    correctElement: dom.cntChordsCorrect,
    incorrectElement: dom.cntChordsIncorrect,
  });
  isIncorrect = false;
}

function recordDegreeCompletion() {
  updateResultCounters({
    wasIncorrect: isIncorrect,
    correctElement: dom.cntDegreesCorrect,
    incorrectElement: dom.cntDegreesIncorrect,
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
    modeIsDegrees()
  ) {
    let offset = 0;

    // TODO: Make this smarter based on mode later
    if (!modeIsScales()) {
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
          let [name, notes] = getIntervalChordNotesAndName(
            keys[keyIndex],
            chord,
            false,
          );
          // Apply selected voicing to playback as well
          notes = applySelectedVoicing(notes);
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

  if (modeIsChords() || modeIsProgressions() || modeIsJazz()) {
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

  // Check if every element in sortedCurrentChordNotes is in sortedActiveNotes and both arrays have the same length
  // This makes sure we disallow extra notes in the chord
  if (
    sortedCurrentChordNotes.length === sortedActiveNotes.length &&
    sortedCurrentChordNotes.every(
      (chordNote, index) => chordNote === sortedActiveNotes[index],
    )
  ) {
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
  }
}

function highlightCorrectKeys() {
  // Clear previous highlights
  document
    .querySelectorAll(".key.highlight")
    .forEach((key) => key.classList.remove("highlight"));

  highlightTimer = setTimeout(() => {
    // Highlight the keys in the current chord if box is checked
    if (!dom.highlightCorrectKeys.checked) {
      return;
    }

    currentChordNotes.forEach((note) => {
      let keyElement = document.querySelector(`.key[data-note="${note + 48}"]`);
      if (keyElement) keyElement.classList.add("highlight");
    });
  }, 3000); // 3 seconds
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

  if (flow === "circleOfFourths") {
    keys = circleOfFourths;
  } else if (flow === "circleOfFifths") {
    keys = circleOfFifths;
  } else {
    keys = Object.keys(noteValues).filter(
      (root) => dom.keyCheckboxes[root].checked,
    );
    if (keys.length === 0) {
      alert("Please select at least one root key!");
      return null;
    }
  }
}

function nextKey() {
  updateAvailableKeys();
  const flow = dom.flowSelect.value;

  if (flow === "circleOfFourths" || flow === "circleOfFifths") {
    keyIndex++;
  } else {
    keyIndex = Math.floor(Math.random() * keys.length);
  }

  keyIndex %= keys.length;
}

function nextChord(skip = false) {
  if (
    modeIsProgressions() ||
    modeIsScales() ||
    modeIsDegrees() ||
    modeIsJazz()
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
        });
      } else if (modeIsJazz()) {
        // Handle Jazz Brick spaced repetition using unified queue
        spacedRepHandleResult("brick", selectedProgression, isIncorrect);
        updateResultCounters({
          wasIncorrect: isIncorrect,
          skipCorrect: skip,
          correctElement: dom.cntBricksCorrect,
          incorrectElement: dom.cntBricksIncorrect,
        });
      } else if (modeIsScales()) {
        updateResultCounters({
          wasIncorrect: isIncorrect,
          skipCorrect: skip,
          correctElement: dom.cntScalesCorrect,
          incorrectElement: dom.cntScalesIncorrect,
        });
      }

      isIncorrect = false;

      nextKey();
      generateProgression();

      if (dom.sendMidiNotes.checked) {
        setTimeout(playAnswerNotes, 200);
      }
    }

    // Safety: guard against missing progression entries
    if (Array.isArray(currentProgression) && currentProgression[currentIndex]) {
      if (isIntervalChord(currentProgression[currentIndex])) {
        [currentChordName, currentChordNotes] = getIntervalChordNotesAndName(
          keys[keyIndex],
          currentProgression[currentIndex],
        );
        // Voicing for progressions/jazz
        currentChordNotes = applySelectedVoicing(currentChordNotes);
      } else if (isNamedChord(currentProgression[currentIndex])) {
        currentChordName = generateChordName(
          currentProgression[currentIndex],
          "",
        );
        currentChordNotes = generateNotesFromChordName(
          currentProgression[currentIndex],
        );
        currentChordInternalName = currentProgression[currentIndex];
        currentChordNotes = applySelectedVoicing(currentChordNotes);
      } else {
        setRandomChord();
      }
    } else {
      // Fallback for unexpected undefined progression
      setRandomChord();
    }
  } else {
    nextKey();
    setRandomChord();

    if (dom.sendMidiNotes.checked) {
      setTimeout(playAnswerNotes, 200);
    }
  }

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
    if (hideNumerals) {
      dom.progressionDisplay.innerHTML = currentProgression
        .map((chord) => `<span class="chord" title="${chord}">?</span>`)
        .join(" - ");
    } else {
      dom.progressionDisplay.innerHTML = currentProgression
        .map((chord) => `<span class="chord">${chord}</span>`)
        .join(" - ");
    }
  } else {
    dom.progressionDisplay.innerHTML = "";
  }

  if (hideChordName) {
    dom.cadenceDisplay.innerHTML = " ?";
  } else {
    dom.cadenceDisplay.innerHTML = " " + currentProgressionName;
  }

  // Add event listeners to chords to track user input
  document.querySelectorAll(".chord").forEach((chordSpan, index) => {
    if (currentIndex == index) {
      chordSpan.style.color = "#0077ff";
    } else if (currentIndex > index) {
      chordSpan.style.color = "green";
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
      enabledCadences["Regular"] = ["ii", "V7", "IΔ"];
      enabledNames["Regular"] = "Regular";
    }

    selectedProgression =
      Object.keys(enabledCadences)[
        Math.floor(Math.random() * Object.keys(enabledCadences).length)
      ];
    currentProgression = enabledCadences[selectedProgression];
    currentProgressionName = enabledNames[selectedProgression];
  }
}

dom.hideProgressionChordNames.addEventListener("change", updateDisplay);
dom.hideProgressionChordNumerals.addEventListener("change", updateDisplay);

function nextProgression() {
  nextChord(true);
}

dom.flowSelect.addEventListener("change", generateProgression);

nextKey();
setRandomChord();
highlightCorrectKeys();
updateDisplay();
modeChange();
// Apply shell voicing according to selected mode (all chord-based modes)
function applyShellVoicing(notes) {
  // Only alter notes in chord practice mode
  try {
    if (!Array.isArray(notes)) return notes;
    if (typeof getShellMode !== "function") return notes;
    // Apply in chords, progressions, and jazz modes
    if (!(modeIsChords() || modeIsProgressions() || modeIsJazz())) return notes;
    const mode = getShellMode();
    if (mode === "off") return notes;

    // New simplified indexing approach to support sus/6th/etc.
    // Use the 2nd and 4th elements when present.
    const root = notes[0];
    const second = notes.length > 1 ? notes[1] : undefined;
    const fourth = notes.length > 3 ? notes[3] : undefined;

    if (mode === "r37") {
      if (second !== undefined && fourth !== undefined)
        return [root, second, fourth];
      if (second !== undefined) return [root, second];
      return [root];
    } else if (mode === "37") {
      if (second !== undefined && fourth !== undefined) return [second, fourth];
      if (second !== undefined) return [second];
      return notes; // fallback
    }
    return notes;
  } catch (_) {
    return notes;
  }
}

// Compute 3rd/7th/9th/5th for current chord type
function getTargetUpperIntervals(chordInternalName) {
  // Parse root and chord type
  const m = chordInternalName.match(/^[A-G](#|b)?/);
  const rootName = m ? m[0] : "C";
  const rootVal = noteValues[rootName];
  const chordType = chordInternalName.slice(rootName.length);

  // Third: major unless minor/diminished
  const isMinorish = /(^m(?!aj)|m(?!aj)|dim|ø)/.test(chordType);
  const third = normalizePitchClass(rootVal + (isMinorish ? 3 : 4));

  // Seventh: major for M7/mM7, diminished for dim7, flat7 by default (infer b7) or when minorish/dom present
  let seventhInterval;
  if (/M7/.test(chordType)) seventhInterval = 11;
  else if (/dim7/.test(chordType)) seventhInterval = 9;
  else if (chordType === "6" || chordType === "m6")
    seventhInterval = 9; // use 6th in place of 7th for 6/m6
  else if (/7/.test(chordType) || isMinorish) seventhInterval = 10;
  else seventhInterval = 10; // infer b7 for chords without explicit 7th
  const seventh = normalizePitchClass(rootVal + seventhInterval);

  // Fifth: adjust for diminished/augmented
  let fifthInterval = 7;
  if (/aug/.test(chordType)) fifthInterval = 8;
  if (/m7b5|dim/.test(chordType)) fifthInterval = 6; // handles dim and half-diminished
  const fifth = normalizePitchClass(rootVal + fifthInterval);

  // Ninth: honor b9/#9 if present in internal name; otherwise natural 9
  const hasSharp9 = /(\+9|#9)/.test(chordType);
  const hasFlat9 = /b9/.test(chordType);
  let ninthInterval = 14; // natural 9
  // For diminished 7th chords, use the root instead of the 9th
  if (/dim7/.test(chordType)) ninthInterval = 0;
  if (hasSharp9)
    ninthInterval = 15; // #9
  else if (hasFlat9) ninthInterval = 13; // b9
  const ninth = normalizePitchClass(rootVal + ninthInterval);

  return { third, seventh, ninth, fifth };
}

// Build an ascending keyboard voicing inside the displayed keyboard for highlighting/playback
// Build ascending voicing from explicit pitch-class order (0–11)
function buildAscendingVoicingFromOrder(order) {
  return buildAscendingMidiSequence(order).map((m) => m - 48);
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

function normalizePitchClass(value) {
  const mod = value % 12;
  return mod < 0 ? mod + 12 : mod;
}

function nextPitchClassAbove(previous, targetPc) {
  const start = previous + 1;
  const offset = (targetPc - (start % 12) + 12) % 12;
  return start + offset;
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
