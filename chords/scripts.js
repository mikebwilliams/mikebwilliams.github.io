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

let highlightTimer;

/* Spaced repetition support for failed chords */
let spacedQueue = [];
let scheduledRepeatFlag = false;
let scheduledEntryIndex = null;

/* Spaced repetition support for Jazz Bricks (chord progressions) */
let spacedQueueBricks = [];
let scheduledRepeatFlagBricks = false;
let scheduledEntryIndexBricks = null;

function isSpacedRepetitionEnabled() {
  return document.getElementById("enableSpacedRepetition").checked;
}

function getMasteryThreshold() {
  const t = parseInt(document.getElementById("spacedRepThreshold").value, 10);
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
  if (document.getElementById("randomizeSpellings").checked) {
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

  if (isSpacedRepetitionEnabled() && spacedQueue.length) {
    let idx = spacedQueue.reduce(
      (best, entry, i) =>
        entry.counter <= 0 &&
        (best < 0 || entry.counter < spacedQueue[best].counter)
          ? i
          : best,
      -1,
    );
    if (idx >= 0) {
      let entry = spacedQueue[idx];
      let rootMatch = entry.chord.match(/^[A-G](#|b)?/);
      let root = rootMatch[0];
      let chordType = entry.chord.slice(root.length);
      currentChordInternalName = entry.chord;
      currentChordNotes = generateNotesFromChordName(entry.chord);
      currentChordName = generateChordName(root, chordType);
      scheduledRepeatFlag = true;
      scheduledEntryIndex = idx;
      return;
    }
    spacedQueue.forEach((entry) => entry.counter--);
  }

  // Grab the selected chord types
  let selectedChordTypes = [];
  if (document.getElementById("majorChord").checked)
    selectedChordTypes.push("");
  if (document.getElementById("minorChord").checked)
    selectedChordTypes.push("m");
  if (document.getElementById("augmentedChord").checked)
    selectedChordTypes.push("aug");
  if (document.getElementById("diminishedChord").checked)
    selectedChordTypes.push("dim");
  if (document.getElementById("suspendedSecondChord").checked)
    selectedChordTypes.push("sus2");
  if (document.getElementById("suspendedFourthChord").checked)
    selectedChordTypes.push("sus4");

  if (document.getElementById("sixthChord").checked)
    selectedChordTypes.push("6");
  if (document.getElementById("minorSixthChord").checked)
    selectedChordTypes.push("m6");

  if (document.getElementById("seventhChord").checked)
    selectedChordTypes.push("7");
  if (document.getElementById("minorSeventhChord").checked)
    selectedChordTypes.push("m7");
  if (document.getElementById("majorSeventhChord").checked)
    selectedChordTypes.push("M7");
  if (document.getElementById("minorMajorSeventhChord").checked)
    selectedChordTypes.push("mM7");

  if (document.getElementById("diminishedSeventhChord").checked)
    selectedChordTypes.push("dim7");
  if (document.getElementById("halfDiminishedSeventhChord").checked)
    selectedChordTypes.push("m7b5");
  if (document.getElementById("augmentedSeventhChord").checked)
    selectedChordTypes.push("aug7");
  if (document.getElementById("augmentedMajorSeventhChord").checked)
    selectedChordTypes.push("augM7");

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
  if (activeKeys.includes(key)) {
    handleKeyReleased(key);
  } else {
    handleKeyPressed(key);
  }

  checkChord();
}

function handleKeyPressed(key) {
  let keyElement = document.querySelector(`.key[data-note="${key}"]`);

  activeKeys.push(key);

  if (getSortedAnswerNotes().includes(key % 12)) {
    keyElement.classList.add("correct");
  } else {
    keyElement.classList.add("incorrect");
    isIncorrect = true;
    updateDisplay();
  }
}

function handleKeyReleased(key) {
  let keyElement = document.querySelector(`.key[data-note="${key}"]`);

  activeKeys.splice(activeKeys.indexOf(key), 1);

  keyElement.classList.remove("correct", "incorrect");
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
  return [...new Set(currentChordNotes.map((key) => key % 12))].sort(
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
    document.getElementById("chordDisplay").classList.remove("correct");
    document.getElementById("chordDisplay").classList.remove("incorrect");
    nextChord();
  }

  let sortedCurrentChordNotes = getSortedAnswerNotes();
  // Turn keys into notes 0-11, remove duplicates, sort for matching
  let sortedActiveNotes = [...new Set(activeKeys.map((key) => key % 12))].sort(
    (a, b) => a - b,
  );

  // If Type A/B upper voicing is selected (any chord-based mode), enforce voicing set and keyboard order
  try {
    if (
      typeof getUpperMode === "function" &&
      (modeIsChords() || modeIsProgressions() || modeIsJazz())
    ) {
      const upperMode = getUpperMode();
      if (upperMode === "typeA" || upperMode === "typeB") {
        // Require exactly 4 notes pressed
        if (activeKeys.length !== 4) return;

        const { third, seventh, ninth, fifth } = getTargetUpperIntervals(
          currentChordInternalName,
        );
        const targetSet = [third % 12, seventh % 12, ninth % 12, fifth % 12]
          .sort((a, b) => a - b)
          .join(",");
        const playedSet = [...new Set(activeKeys.map((n) => n % 12))]
          .sort((a, b) => a - b)
          .join(",");
        if (targetSet !== playedSet) return; // wrong pitch classes

        const asc = [...activeKeys].sort((a, b) => a - b);
        const order =
          upperMode === "typeA"
            ? [third, seventh, ninth, fifth]
            : [seventh, third, fifth, ninth];
        for (let i = 0; i < 4; i++) {
          if (asc[i] % 12 !== order[i] % 12) return; // wrong keyboard order
        }
        // If we got here, the voicing is correct
        awaitingKeyRelease = true;
        document.getElementById("chordDisplay").classList.remove("incorrect");
        document.getElementById("chordDisplay").classList.add("correct");
        if (modeIsChords()) {
          if (scheduledRepeatFlag) {
            let entry = spacedQueue[scheduledEntryIndex];
            if (isIncorrect) {
              entry.interval = 1;
              entry.successStreak = 0;
            } else {
              entry.successStreak++;
              entry.interval *= 2;
            }
            entry.counter = entry.interval;
            if (entry.successStreak >= getMasteryThreshold()) {
              spacedQueue.splice(scheduledEntryIndex, 1);
            }
            scheduledRepeatFlag = false;
            scheduledEntryIndex = null;
          } else if (isIncorrect) {
            if (
              !spacedQueue.find((e) => e.chord === currentChordInternalName)
            ) {
              spacedQueue.push({
                chord: currentChordInternalName,
                interval: 1,
                counter: 1,
                successStreak: 0,
              });
            }
          }

          if (isIncorrect) {
            cntChordsIncorrect.textContent =
              parseInt(cntChordsIncorrect.textContent) + 1;
          } else {
            cntChordsCorrect.textContent =
              parseInt(cntChordsCorrect.textContent) + 1;
          }

          isIncorrect = false;
        }
        clearTimeout(highlightTimer);
        highlightCorrectKeys();
        return;
      }
    }
  } catch (_) {}

  // Check if every element in sortedCurrentChordNotes is in sortedActiveNotes and both arrays have the same length
  // This makes sure we disallow extra notes in the chord
  if (
    sortedCurrentChordNotes.length === sortedActiveNotes.length &&
    sortedCurrentChordNotes.every(
      (chordNote, index) => chordNote === sortedActiveNotes[index],
    )
  ) {
    awaitingKeyRelease = true;
    document.getElementById("chordDisplay").classList.remove("incorrect");
    document.getElementById("chordDisplay").classList.add("correct");

    if (modeIsChords()) {
      if (scheduledRepeatFlag) {
        let entry = spacedQueue[scheduledEntryIndex];
        if (isIncorrect) {
          entry.interval = 1;
          entry.successStreak = 0;
        } else {
          entry.successStreak++;
          entry.interval *= 2;
        }
        entry.counter = entry.interval;
        if (entry.successStreak >= getMasteryThreshold()) {
          spacedQueue.splice(scheduledEntryIndex, 1);
        }
        scheduledRepeatFlag = false;
        scheduledEntryIndex = null;
      } else if (isIncorrect) {
        if (!spacedQueue.find((e) => e.chord === currentChordInternalName)) {
          spacedQueue.push({
            chord: currentChordInternalName,
            interval: 1,
            counter: 1,
            successStreak: 0,
          });
        }
      }

      if (isIncorrect) {
        cntChordsIncorrect.textContent =
          parseInt(cntChordsIncorrect.textContent) + 1;
      } else {
        cntChordsCorrect.textContent =
          parseInt(cntChordsCorrect.textContent) + 1;
      }

      isIncorrect = false;
    } else if (modeIsDegrees()) {
      if (isIncorrect) {
        cntDegreesIncorrect.textContent =
          parseInt(cntDegreesIncorrect.textContent) + 1;
      } else {
        cntDegreesCorrect.textContent =
          parseInt(cntDegreesCorrect.textContent) + 1;
      }

      isIncorrect = false;
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
    if (!document.getElementById("highlightCorrectKeys").checked) {
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
    document.getElementById("midiStatusText").textContent =
      "No MIDI inputs detected. Please connect a MIDI device.";
    return;
  }

  document.getElementById("midiStatusText").textContent = "MIDI connected.";

  renderMidiDeviceTables();
  refreshMidiListeners();
}

function onMIDIFailure(error) {
  document.getElementById("midiStatusText").textContent =
    "Failed to get MIDI access. Error: " + error;
}

function initMIDI() {
  // Initialize MIDI access
  if (navigator.requestMIDIAccess)
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  else
    document.getElementById("midiStatusText").textContent =
      "Your browser does not support MIDI access. Please ensure you are using a browser that supports WebMIDI, and that you are accessing this site from HTTPS, as some browsers require secure connections for WebMIDI.";
}

function renderMidiDeviceTables() {
  if (!midiAccess) return;
  const inputsTable = document.getElementById("midiInputs");
  const outputsTable = document.getElementById("midiOutputs");
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
  const flow = flowSelect.value;

  if (flow === "circleOfFourths") {
    keys = circleOfFourths;
  } else if (flow === "circleOfFifths") {
    keys = circleOfFifths;
  } else {
    keys = Object.keys(noteValues).filter(
      (root) => document.getElementById(root).checked,
    );
    if (keys.length === 0) {
      alert("Please select at least one root key!");
      return null;
    }
  }
}

function nextKey() {
  updateAvailableKeys();
  const flow = flowSelect.value;

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
        if (isIncorrect) {
          cntProgsIncorrect.textContent =
            parseInt(cntProgsIncorrect.textContent) + 1;
        } else if (!skip) {
          cntProgsCorrect.textContent =
            parseInt(cntProgsCorrect.textContent) + 1;
        }
      } else if (modeIsJazz()) {
        // handle scheduled repetition entries for Jazz Bricks
        if (scheduledRepeatFlagBricks) {
          let entry = spacedQueueBricks[scheduledEntryIndexBricks];
          if (isIncorrect) {
            entry.interval = 1;
            entry.successStreak = 0;
          } else {
            entry.successStreak++;
            entry.interval *= 2;
          }
          entry.counter = entry.interval;
          if (entry.successStreak >= getMasteryThreshold()) {
            spacedQueueBricks.splice(scheduledEntryIndexBricks, 1);
          }
          scheduledRepeatFlagBricks = false;
          scheduledEntryIndexBricks = null;
        } else if (isIncorrect) {
          // schedule failed Jazz Brick cadence for spaced repetition
          if (!spacedQueueBricks.find((e) => e.chord === selectedProgression)) {
            spacedQueueBricks.push({
              chord: selectedProgression,
              interval: 1,
              counter: 1,
              successStreak: 0,
            });
          }
        }
        if (isIncorrect) {
          cntBricksIncorrect.textContent =
            parseInt(cntBricksIncorrect.textContent) + 1;
        } else if (!skip) {
          cntBricksCorrect.textContent =
            parseInt(cntBricksCorrect.textContent) + 1;
        }
      } else if (modeIsScales()) {
        if (isIncorrect) {
          cntScalesIncorrect.textContent =
            parseInt(cntScalesIncorrect.textContent) + 1;
        } else if (!skip) {
          cntScalesCorrect.textContent =
            parseInt(cntScalesCorrect.textContent) + 1;
        }
      }

      isIncorrect = false;

      nextKey();
      generateProgression();

      if (document.getElementById("sendMidiNotes").checked) {
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

    if (document.getElementById("sendMidiNotes").checked) {
      setTimeout(playAnswerNotes, 200);
    }
  }

  updateDisplay();
}

function updateDisplay() {
  let hideChordName = hideProgressionChordNamesCheckbox.checked;
  let hideNumerals = hideProgressionChordNumeralsCheckbox.checked;

  if (modeIsChords()) {
    // When we are in chord mode with hidden chords we are probably doing ear training
    // for chord quality so at least show the key
    if (hideChordName) {
      document.getElementById("currentKey").style.display = "block";
      document.getElementById("chordDisplay").style.display = "none";
    } else {
      document.getElementById("currentKey").style.display = "none";
      document.getElementById("chordDisplay").style.display = "block";
    }
    document.getElementById("progressionDisplay").style.display = "none";
    document.getElementById("cadenceDisplay").style.display = "none";
  } else {
    document.getElementById("chordDisplay").style.display = "none";
    document.getElementById("currentKey").style.display = "inline";
    document.getElementById("cadenceDisplay").style.display = "inline";
    document.getElementById("progressionDisplay").style.display = "block";
  }

  let text = currentChordName;

  // Turn # and b into sharp and flat symbols
  text = text.replace(/#/g, "♯");
  text = text.replace(/b/g, "♭");

  chordDisplay.textContent = text;
  chordDisplay.title = "";

  if (isIncorrect) {
    chordDisplay.classList.add("incorrect");
  } else {
    chordDisplay.classList.remove("incorrect");
  }

  currentKeySpan.textContent = keys[keyIndex];

  if (Array.isArray(currentProgression)) {
    if (hideNumerals) {
      progressionDisplay.innerHTML = currentProgression
        .map((chord) => `<span class="chord" title="${chord}">?</span>`)
        .join(" - ");
    } else {
      progressionDisplay.innerHTML = currentProgression
        .map((chord) => `<span class="chord">${chord}</span>`)
        .join(" - ");
    }
  } else {
    progressionDisplay.innerHTML = "";
  }

  if (hideChordName) {
    cadenceDisplay.innerHTML = " ?";
  } else {
    cadenceDisplay.innerHTML = " " + currentProgressionName;
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
  const hasSharp9 = /(\+9|#9)/.test(currentProgression[currentIndex]);
  const hasFlat9 = /b9/.test(currentProgression[currentIndex]);
  const hasSharp11 = /(\+11|#11)/.test(currentProgression[currentIndex]);

  // Get the augmented — but only if '+' is NOT part of +9/+11/+13
  let augmented = /\+(?!9|11|13)/.test(currentProgression[currentIndex]);

  // Get the diminished
  let diminished = currentProgression[currentIndex].match(/o/);

  // Get half-diminished
  let halfDiminished = currentProgression[currentIndex].match(/ø/);

  // Get minor status, by checking for lower case or a dash
  let minor =
    bareDegree === bareDegree.toLowerCase() ||
    currentProgression[currentIndex].match(/-/);

  // Convert the degree to a number using romanNumerals
  let degreeValue = romanNumerals[bareDegree.toUpperCase()];

  // Then add the interval to get the new degree
  let noteValue = (keyValue + degreeValue) % (wrap ? 12 : 127);

  // Get sevenths
  let majorSeventh =
    currentProgression[currentIndex].match(/M7/) ||
    currentProgression[currentIndex].match(/Δ/);
  let domSeventh =
    !majorSeventh &&
    (halfDiminished || currentProgression[currentIndex].match(/7/));

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
  currentKeySpan.textContent = keys[keyIndex];

  currentIndex = 0;

  if (modeIsProgressions() || modeIsDegrees()) {
    if (progressionSelect.value === "custom") {
      currentProgression = document
        .getElementById("customProgression")
        .value.split("-");
    } else if (progressionSelect.value === "random") {
      // Get count from randomProgression input
      let count = document.getElementById("randomProgression").value;

      enabledNumerals = {};
      if (modeIsDegrees()) {
        Object.keys(romanNumerals).forEach((numeral) => {
          const checkbox = document.getElementById(numeral); // Adjust the ID retrieval method if necessary
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
      currentProgression = progressionSelect.value.split("-");
    }

    currentProgressionName = progressionSelect.value;
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
    if (isSpacedRepetitionEnabled() && spacedQueueBricks.length) {
      let idx = spacedQueueBricks.reduce(
        (best, entry, i) =>
          entry.counter <= 0 &&
          (best < 0 || entry.counter < spacedQueueBricks[best].counter)
            ? i
            : best,
        -1,
      );
      if (idx >= 0) {
        let entry = spacedQueueBricks[idx];
        const scheduled = enabledCadences[entry.chord];
        if (scheduled) {
          currentProgression = scheduled;
          currentProgressionName = enabledNames[entry.chord] || entry.chord;
          scheduledRepeatFlagBricks = true;
          scheduledEntryIndexBricks = idx;
          return;
        }
      }
      spacedQueueBricks.forEach((e) => e.counter--);
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

hideProgressionChordNamesCheckbox.addEventListener("change", updateDisplay);
hideProgressionChordNumeralsCheckbox.addEventListener("change", updateDisplay);

function nextProgression() {
  nextChord(true);
}

flowSelect.addEventListener("change", generateProgression);

nextKey();
setRandomChord();
highlightCorrectKeys();
updateDisplay();
modeChange();
// Apply shell voicing according to selected mode (chords tab only)
function applyShellVoicing(notes) {
  // Only alter notes in chord practice mode
  try {
    if (!Array.isArray(notes)) return notes;
    if (typeof getShellMode !== "function" || !modeIsChords()) return notes;
    const mode = getShellMode();
    if (mode === "off") return notes;

    const root = notes[0];
    // Prefer actual 3rds if present, otherwise take first non-root tone
    let third = notes.find((n) => n === 3 || n === 4);
    if (third === undefined) third = notes.find((n) => n !== root);

    // Detect 7th (dom=10, maj=11, dim=9)
    let seventh = notes.find((n) => n === 10 || n === 11 || n === 9);

    if (mode === "r37") {
      if (third !== undefined && seventh !== undefined)
        return [root, third, seventh];
      if (third !== undefined) return [root, third];
      return [root];
    } else if (mode === "37") {
      if (third !== undefined && seventh !== undefined) return [third, seventh];
      if (third !== undefined) return [third];
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
  const third = (rootVal + (isMinorish ? 3 : 4)) % 12;

  // Seventh: major for M7/mM7, diminished for dim7, flat7 by default (infer b7) or when minorish/dom present
  let seventhInterval;
  if (/M7/.test(chordType)) seventhInterval = 11;
  else if (/dim7/.test(chordType)) seventhInterval = 9;
  else if (chordType === "6" || chordType === "m6")
    seventhInterval = 9; // use 6th in place of 7th for 6/m6
  else if (/7/.test(chordType) || isMinorish) seventhInterval = 10;
  else seventhInterval = 10; // infer b7 for chords without explicit 7th
  const seventh = (rootVal + seventhInterval) % 12;

  // Fifth: adjust for diminished/augmented
  let fifthInterval = 7;
  if (/aug/.test(chordType)) fifthInterval = 8;
  if (/m7b5|dim/.test(chordType)) fifthInterval = 6; // handles dim and half-diminished
  const fifth = (rootVal + fifthInterval) % 12;

  // Ninth: honor b9/#9 if present in internal name; otherwise natural 9
  const hasSharp9 = /(\+9|#9)/.test(chordType);
  const hasFlat9 = /b9/.test(chordType);
  let ninthInterval = 14; // natural 9
  // For diminished 7th chords, use the root instead of the 9th
  if (/dim7/.test(chordType)) ninthInterval = 0;
  if (hasSharp9)
    ninthInterval = 15; // #9
  else if (hasFlat9) ninthInterval = 13; // b9
  const ninth = (rootVal + ninthInterval) % 12;

  return { third, seventh, ninth, fifth };
}

// Build an ascending keyboard voicing inside the displayed keyboard for highlighting/playback
function buildAscendingVoicingMidi({ third, seventh, ninth, fifth }, type) {
  const order =
    type === "typeA"
      ? [third, seventh, ninth, fifth]
      : [seventh, third, fifth, ninth];
  const start = 48; // C3
  const end = 72; // up to C5 inclusive (keys available up to 72)
  const notes = [];
  let prev = start - 1;
  for (let i = 0; i < order.length; i++) {
    const pc = order[i] % 12;
    // Find the smallest midi > prev with this pc
    let midi = prev + 1;
    while (midi % 12 !== pc) midi++;
    // If too low (first tone), ensure at least start
    if (midi < start) {
      midi += Math.ceil((start - midi) / 12) * 12;
    }
    // Ensure strictly ascending
    if (midi <= prev) midi += Math.ceil((prev + 1 - midi) / 12) * 12;
    // Clamp within keyboard; if exceeds, still store (will just not highlight if out-of-range)
    notes.push(midi);
    prev = midi;
  }
  // Convert to offsets used by the UI (absolute midi minus 48)
  return notes.map((m) => m - 48);
}

// Apply selected voicing (Upper Type A/B takes precedence over Shell)
function applySelectedVoicing(notes) {
  try {
    if (typeof getUpperMode === "function") {
      const upperMode = getUpperMode();
      if (upperMode === "typeA" || upperMode === "typeB") {
        const intervals = getTargetUpperIntervals(currentChordInternalName);
        return buildAscendingVoicingMidi(intervals, upperMode);
      }
    }
    return applyShellVoicing(notes);
  } catch (_) {
    return notes;
  }
}

// React to voicing mode changes immediately
document.querySelectorAll("input[name='voicingMode']").forEach((r) => {
  r.addEventListener("change", () => {
    if (currentChordInternalName) {
      const base = generateNotesFromChordName(currentChordInternalName);
      currentChordNotes = applySelectedVoicing(base);
      updateDisplay();
    }
  });
});
