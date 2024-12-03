let currentChordName = '';
let currentChordNotes = [];
let activeNotes = [];
let activeKeys = [];
let isIncorrect = false;

let currentProgression = [];
let currentProgressionName = "";
let currentIndex = 0;
let keyIndex = 0;
let keys = [];

const hideProgressionChordNamesCheckbox = document.getElementById('hideProgressionChordNames');
const progressionOptionsDiv = document.getElementById('progressionOptions');
const progressionSelect = document.getElementById('progressionSelect');
const flowSelect = document.getElementById('flowSelect');
const currentKeySpan = document.getElementById('currentKey');

const progressionDisplay = document.getElementById('progressionDisplay');
const cadenceDisplay = document.getElementById('cadenceDisplay');
const chordDisplay = document.getElementById("chordDisplay");

const chordCountCorrect = document.getElementById("chordCountCorrect");
const progCountCorrect = document.getElementById("progCountCorrect");
const degreeCountCorrect = document.getElementById("degreeCountCorrect");
const brickCountCorrect = document.getElementById("brickCountCorrect");
const chordCountIncorrect = document.getElementById("chordCountIncorrect");
const progCountIncorrect = document.getElementById("progCountIncorrect");
const degreeCountIncorrect = document.getElementById("degreeCountIncorrect");
const brickCountIncorrect = document.getElementById("brickCountIncorrect");

let highlightTimer; 


function isIntervalChord(chord) {
	return chord.match(/^(#|b)?[iIvV]{1,3}.*/);
}


function isNamedChord(chord) {
	return chord.match(/^[A-G](#|b)?/);
}


function generateNotesFromChordName(chordName) {
	let rootNotePattern = /^[A-G](#|b)?/; // Matches the root note
	let rootNoteName = chordName.match(rootNotePattern)[0];

	let rootValue = noteValues[rootNoteName];

	let chordType = chordName.replace(rootNotePattern, ''); // Get everything after the root note

	// Search all chord structure names for a matching type
	for (let key in chordStructureNames) {
		if (chordStructureNames[key].includes(chordType)) {
			return chordStructures[key].map(interval => (rootValue + interval) % 12);
		}
	}

	console.error("Unknown chord type:", chordType);
	return [];
}

function setChordName(root, chordType)
{
	if (document.getElementById('randomizeSpellings').checked) {
		if( chordStructureNames.hasOwnProperty(chordType) ) {
			chordType = chordStructureNames[chordType][Math.floor(Math.random() * chordStructureNames[chordType].length)];
		}

	}

	currentChordName = root + chordType;
}

function setRandomChord()
{
	let lastChordName = currentChordName;

	// Grab the selected chord types
	let selectedChordTypes = [];
	if (document.getElementById('majorChord').checked) selectedChordTypes.push('');
	if (document.getElementById('minorChord').checked) selectedChordTypes.push('m');
	if (document.getElementById('augmentedChord').checked) selectedChordTypes.push('aug');
	if (document.getElementById('diminishedChord').checked) selectedChordTypes.push('dim');
	if (document.getElementById('suspendedSecondChord').checked) selectedChordTypes.push('sus2');
	if (document.getElementById('suspendedFourthChord').checked) selectedChordTypes.push('sus4');

	if (document.getElementById('sixthChord').checked) selectedChordTypes.push('6');
	if (document.getElementById('minorSixthChord').checked) selectedChordTypes.push('m6');

	if (document.getElementById('seventhChord').checked) selectedChordTypes.push('7');
	if (document.getElementById('minorSeventhChord').checked) selectedChordTypes.push('m7');
	if (document.getElementById('majorSeventhChord').checked) selectedChordTypes.push('M7');
	if (document.getElementById('minorMajorSeventhChord').checked) selectedChordTypes.push('mM7');

	if (document.getElementById('diminishedSeventhChord').checked) selectedChordTypes.push('dim7');
	if (document.getElementById('halfDiminishedSeventhChord').checked) selectedChordTypes.push('m7b5');
	if (document.getElementById('augmentedSeventhChord').checked) selectedChordTypes.push('aug7');
	if (document.getElementById('augmentedMajorSeventhChord').checked) selectedChordTypes.push('augM7');

	if (selectedChordTypes.length === 0) {
		alert("Please select at least one chord type!");
		return null;
	}

	do {
		// 'Random' root may actually be circle of fourths/fifths, and is generated in the nextKey function
		let randomRoot = keys[keyIndex];
		let randomChordType = selectedChordTypes[Math.floor(Math.random() * selectedChordTypes.length)];

		currentChordNotes = generateNotesFromChordName(randomRoot + randomChordType);
		setChordName(randomRoot, randomChordType);
	// Loop until we get a new chord, or the user has only selected one chord type
	} while (currentChordName === lastChordName && selectedChordTypes.length > 1 && keys.length > 1);
}


function handleKeyClick(key)
{
	let note = key % 12; // Normalize note to range 0-11
	let keyElement = document.querySelector(`.key[data-note="${key}"]`);

	if (activeKeys.includes(key)) {
		handleKeyReleased(key);
	} else {
		handleKeyPressed(key);
	}

	checkChord();
}


function handleKeyPressed(key)
{
	let note = key % 12; // Normalize note to range 0-11
	let keyElement = document.querySelector(`.key[data-note="${key}"]`);

	activeKeys.push(key);
	activeNotes.push(note);

	if (currentChordNotes.includes(note)) {
		keyElement.classList.add('correct');
	} else {
		keyElement.classList.add('incorrect');
		isIncorrect = true;
		updateDisplay();
	}
}


function handleKeyReleased(key)
{
	let note = key % 12; // Normalize note to range 0-11
	let keyElement = document.querySelector(`.key[data-note="${key}"]`);

	activeKeys.splice(activeKeys.indexOf(key), 1);

	let index = activeNotes.indexOf(note);

	if (index > -1) {
		activeNotes.splice(index, 1);  // Remove note from active list
	}

	keyElement.classList.remove('correct', 'incorrect');
}


function handleMidiMessage(midiMessage)
{
	let pressedNotes = midiMessage.data;
	let velocity = pressedNotes[2];
	let keyEvent = false;

	// Check for MIDI message type to determine if the key is pressed or released.
	if (pressedNotes[0] === 144 && velocity > 0) {
		handleKeyPressed(pressedNotes[1]);
		keyEvent = true;
	} else if (pressedNotes[0] === 128 || (pressedNotes[0] === 144 && velocity === 0)) {
		handleKeyReleased(pressedNotes[1]);
		keyEvent = true;
	}

	if (keyEvent) {
		checkChord();
	}
}


function checkChord() {
	// Sort both arrays to ensure they are in the same order
	let sortedCurrentChordNotes = [...currentChordNotes].sort();
	let sortedActiveNotes = [...activeNotes].sort();

	// Check if every element in sortedCurrentChordNotes is in sortedActiveNotes and both arrays have the same length
	// This makes sure we disallow extra notes in the chord
	if (sortedCurrentChordNotes.length === sortedActiveNotes.length &&
		sortedCurrentChordNotes.every((chordNote, index) => chordNote === sortedActiveNotes[index])) {

		if (modeIsChords()) {
			if (isIncorrect) {
				chordCountIncorrect.textContent = parseInt(chordCountIncorrect.textContent) + 1;
			} else {
				chordCountCorrect.textContent = parseInt(chordCountCorrect.textContent) + 1;
			}

			isIncorrect = false;
		} else if (modeIsDegrees()) {
			if (isIncorrect) {
				degreeCountIncorrect.textContent = parseInt(degreeCountIncorrect.textContent) + 1;
			} else {
				degreeCountCorrect.textContent = parseInt(degreeCountCorrect.textContent) + 1;
			}

			isIncorrect = false;
		}

		nextChord();
		clearTimeout(highlightTimer);

		// Make the user re-press the keys
		keysToRelease = activeKeys.slice();
		for (let key of keysToRelease) {
			handleKeyReleased(key);
		}

		highlightCorrectKeys();
	}
}


function highlightCorrectKeys() {
	// Clear previous highlights
	document.querySelectorAll('.key.highlight').forEach(key => key.classList.remove('highlight'));

	highlightTimer = setTimeout(() => {
		// Highlight the keys in the current chord if box is checked
		if ( !document.getElementById('highlightCorrectKeys').checked ) {
			return;
		}

		currentChordNotes.forEach(note => {
			let keyElement = document.querySelector(`.key[data-note="${note+48}"]`);
			keyElement.classList.add('highlight');
		});
	}, 3000);  // 3 seconds
}


function onMIDISuccess(midiAccess)
{
	// If there are no inputs, notify the user.
	if (!midiAccess.inputs.size) {
		document.getElementById("midiStatusText").textContent = "No MIDI inputs detected. Please connect a MIDI device.";
		return;
	}

	document.getElementById("midiStatusText").textContent = "MIDI inputs connected.";

	// Attach a listener for 'midimessage' events to all input devices
	const inputs = Array.from(midiAccess.inputs.values());
	inputs.forEach(input => {
		if (input.name.includes("Output connection") ||
		    input.name.includes("Midi Through") ) {
			console.log(`Skipping MIDI loopback input: ${input.name}`);
			return;
		}
		console.log(`Listening to MIDI input: ${input.name}`);
		input.onmidimessage = handleMidiMessage;
	});
}


function onMIDIFailure(error)
{
	document.getElementById("midiStatusText").textContent = "Failed to get MIDI access. Error: " + error;
}

	
function initMIDI()
{
	// Initialize MIDI access
	if( navigator.requestMIDIAccess )
		navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
	else
		document.getElementById("midiStatusText").textContent = "Your browser does not support MIDI access. Please ensure you are using a browser that supports WebMIDI, and that you are accessing this site from HTTPS, as some browsers require secure connections for WebMIDI."

}


function updateAvailableKeys()
{
	const flow = flowSelect.value;

	if (flow === "circleOfFourths") {
		keys = circleOfFourths;
	} else if (flow === "circleOfFifths") {
		keys = circleOfFifths;
	} else {
		keys = Object.keys(noteValues).filter(root => document.getElementById(root).checked);
		if (keys.length === 0) {
			alert("Please select at least one root key!");
			return null;
		}
	}
}


function nextKey()
{
	updateAvailableKeys();
	const flow = flowSelect.value;

	if (flow === "circleOfFourths" || flow === "circleOfFifths") {
		keyIndex++;
	} else {
		keyIndex = Math.floor(Math.random() * keys.length);
	}

	keyIndex %= keys.length;
}

function nextChord(skip = false)
{
	if (skip || modeIsProgressions() || modeIsScales() || modeIsDegrees() || modeIsJazz()) {
		currentIndex++;

		if (skip || currentIndex >= currentProgression.length) {
			if (modeIsProgressions()) {
				if (isIncorrect) {
					progCountIncorrect.textContent = parseInt(progCountIncorrect.textContent) + 1;
				} else if (!skip) {
					progCountCorrect.textContent = parseInt(progCountCorrect.textContent) + 1;
				}
			} else if (modeIsJazz()) {
				if (isIncorrect) {
					brickCountIncorrect.textContent = parseInt(brickCountIncorrect.textContent) + 1;
				} else if (!skip) {
					brickCountCorrect.textContent = parseInt(brickCountCorrect.textContent) + 1;
				}
			}

			isIncorrect = false;

			nextKey();
			generateProgression();
		}

		if (isIntervalChord(currentProgression[currentIndex]) ) {
			setIntervalChord();
		} else if (isNamedChord(currentProgression[currentIndex]) ) {
			setChordName(currentProgression[currentIndex], '');
			currentChordNotes = generateNotesFromChordName(currentProgression[currentIndex]);
		} else {
			setRandomChord();
		}
	} else {
		nextKey();
		setRandomChord();
	}

	playChordNotes(currentChordNotes);
	updateDisplay();
}

function updateDisplay()
{
	text = currentChordName;

	// Turn # and b into sharp and flat symbols
	text = text.replace(/#/g, '♯');
	text = text.replace(/b/g, '♭');

	chordDisplay.textContent = text;
	chordDisplay.title = '';

	if (isIncorrect) {
		chordDisplay.classList.add('incorrect');
	} else {
		chordDisplay.classList.remove('incorrect');
	}

	let hideNumerals = document.getElementById('hideProgressionChordNumerals').checked;
	currentKeySpan.textContent = keys[keyIndex];

	if (modeIsJazz() && hideNumerals) {
		progressionDisplay.innerHTML = currentProgression.map(chord => `<span class="chord">?</span>`).join(' - ');
	} else {
		progressionDisplay.innerHTML = currentProgression.map(chord => `<span class="chord">${chord}</span>`).join(' - ');
	}

	cadenceDisplay.innerHTML = " " + currentProgressionName;

	// Add event listeners to chords to track user input
	document.querySelectorAll('.chord').forEach((chordSpan, index) => {
		if (currentIndex == index) {
			chordSpan.style.color = "#0077ff";
		} else if (currentIndex > index) {
			chordSpan.style.color = "green";
		}
	});
}

function setIntervalChord()
{
	let keyValue = noteValues[keys[keyIndex]];

	// Degree will get us something like 'I', 'II', 'III', etc.
	let degree = currentProgression[currentIndex];

	// We need to split the interval into three parts
	// the degree, which is all letters that are either I or V
	// the augmented or diminished, which is all letters that are + or o
	// and the 7th, 9th, etc. which is all arabic numerals at the end
	
	// Get the degree
	let bareDegree = degree.match(/[b#iIvV]{1,4}/)[0];

	// We only need the degree if we're in scale degree mode since
	// we only need the first note of the chord
	if( modeIsDegrees() ) {
		currentChordNotes = [(keyValue + romanNumerals[bareDegree.toUpperCase()]) % 12];
		setChordName(bareDegree, '');
		return;
	}

	// Get the extension (7th, 9th, etc.)
	let extension = currentProgression[currentIndex].match(/(7,9,11,13)/);

	// Get the augmented
	let augmented = currentProgression[currentIndex].match(/\+/);

	// Get the diminished
	let diminished = currentProgression[currentIndex].match(/o/);

	// Get half-diminished
	let halfDiminished = currentProgression[currentIndex].match(/ø/);

	// Get minor status, by checking for lower case or a dash
	let minor = bareDegree === bareDegree.toLowerCase() || currentProgression[currentIndex].match(/-/);

	// Convert the degree to a number using romanNumerals
	let degreeValue = romanNumerals[bareDegree.toUpperCase()];

	// Then add the interval to get the new degree
	let noteValue = (keyValue + degreeValue) % 12;

	// Get sevenths
	let majorSeventh = currentProgression[currentIndex].match(/M7/) || currentProgression[currentIndex].match(/Δ/) ||
		        (diminished && currentProgression[currentIndex].match(/7/));

	let domSeventh = !majorSeventh && (halfDiminished || currentProgression[currentIndex].match(/7/));

	// Later fix this to handle key signatures with flats
	if( keys[keyIndex] === 'F' || keys[keyIndex] === 'Bb' || keys[keyIndex] === 'Eb' || keys[keyIndex] === 'Ab' || keys[keyIndex] === 'Db' || keys[keyIndex] === 'Gb' ) {
		var valuesToNotes = valuesToNotesFlat;
	} else {
		var valuesToNotes = valuesToNotesSharp;
	}

	const degreeChordRoot = valuesToNotes[noteValue];
	let   chordQuality = '';
	let   chord7th = '';
	let   ext = '';

	if (diminished) {
		chordQuality = 'dim';
	} else if (augmented) {
		chordQuality = 'aug';
	} else if (minor || halfDiminished) {
		chordQuality = 'm';
	} else {
		chordQuality = '';
	}

	if (domSeventh) {
		chord7th = '7';
	} else if (majorSeventh) {
		chord7th = 'M7';
	} else {
		chord7th = '';
	}

	if (halfDiminished) {
		ext += 'b5';
	}

	currentChordNotes = generateNotesFromChordName(degreeChordRoot + chordQuality + chord7th + ext);
	setChordName(degreeChordRoot, chordQuality + chord7th + ext);
}


function generateProgression()
{
	currentKeySpan.textContent = keys[keyIndex];

	currentIndex = 0;

	if (modeIsProgressions() || modeIsDegrees() ) {

		if (progressionSelect.value === "custom") {
			currentProgression = document.getElementById('customProgression').value.split('-');
		} else if (progressionSelect.value === "random") {
			// Get count from randomProgression input
			let count = document.getElementById('randomProgression').value;

			enabledNumerals = {};
			if (modeIsDegrees()) {
				Object.keys(romanNumerals).forEach(numeral => {
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
				currentProgression.push(Object.keys(enabledNumerals)[Math.floor(Math.random() * Object.keys(enabledNumerals).length)]);
			}
		} else {
			currentProgression = progressionSelect.value.split('-');
		}

		currentProgressionName = progressionSelect.value;
	} else if (modeIsScales()) {
		// Get list of all enabled scales
		enabledScales = {};
		enabledNames = {};
		Object.keys(jazzCadences).forEach(cadence => {
			if (jazzCadences[cadence].enabled) {
				enabledCadences[cadence] = jazzCadences[cadence].chords;
				enabledNames[cadence] = jazzCadences[cadence].name;
			}
		} );

		// Select a random cadence from the enabled list
		if (Object.keys(enabledCadences).length === 0) {
			enabledCadences['Regular'] =['ii', 'V7', 'IΔ'];
			enabledNames['Regular'] = 'Regular';
		}

		selectedProgression = Object.keys(enabledCadences)[Math.floor(Math.random() * Object.keys(enabledCadences).length)];
		currentProgression = enabledCadences[selectedProgression];
		currentProgressionName = enabledNames[selectedProgression];
	} else if (modeIsJazz()) {

		// Get list of all enabled Jazz cadences
		enabledCadences = {};
		enabledNames = {};
		Object.keys(jazzCadences).forEach(cadence => {
			if (jazzCadences[cadence].enabled) {
				enabledCadences[cadence] = jazzCadences[cadence].chords;
				enabledNames[cadence] = jazzCadences[cadence].name;
			}
		} );

		// Select a random cadence from the enabled list
		if (Object.keys(enabledCadences).length === 0) {
			enabledCadences['Regular'] =['ii', 'V7', 'IΔ'];
			enabledNames['Regular'] = 'Regular';
		}

		selectedProgression = Object.keys(enabledCadences)[Math.floor(Math.random() * Object.keys(enabledCadences).length)];
		currentProgression = enabledCadences[selectedProgression];
		currentProgressionName = enabledNames[selectedProgression];
	}
}


hideProgressionChordNamesCheckbox.addEventListener('change', function() {
	if ( !document.getElementById("hideProgressionChordNames").checked )
		document.getElementById("chordDisplay").style.display = "block";
	else
		document.getElementById("chordDisplay").style.display = "none";
});


function nextProgression()
{
	nextChord(true);
}

flowSelect.addEventListener('change', generateProgression);

nextKey();
setRandomChord();
highlightCorrectKeys();
updateDisplay();
modeChange();
