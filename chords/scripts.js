const allNotes = ['Cb', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'E#', 'Fb', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'B#'];

const normalNotes = allNotes.filter(item => ['Cb', 'E#', 'Fb', 'B#'].indexOf(item) === -1);

const noteValues = {
	'B#': 0, 'C': 0,
	'C#': 1, 'Db': 1,
	'D': 2,
	'D#': 3, 'Eb': 3,
	'E': 4, 'Fb': 4,
	'E#': 5, 'F': 5,
	'F#': 6, 'Gb': 6,
	'G': 7,
	'G#': 8, 'Ab': 8,
	'A': 9,
	'A#': 10, 'Bb': 10,
	'B': 11, 'Cb': 11
};

const valuesToNotesSharp = {
	0: 'C',
	1: 'C#',
	2: 'D',
	3: 'D#',
	4: 'E',
	5: 'F',
	6: 'F#',
	7: 'G',
	8: 'G#',
	9: 'A',
	10: 'A#',
	11: 'B'
};

const valuesToNotesFlat = {
	0: 'C',
	1: 'Db',
	2: 'D',
	3: 'Eb',
	4: 'E',
	5: 'F',
	6: 'Gb',
	7: 'G',
	8: 'Ab',
	9: 'A',
	10: 'Bb',
	11: 'B'
};

const romanNumerals = {
	'I': 0,
	'II': 2,
	'III': 4,
	'IV': 5,
	'V': 7,
	'VI': 9,
	'VII': 11,
	// These are upper case since we check by uppercase to ignore
	// major/minor chord quality when getting the scale degree
	'BI': -1,
	'BII': 1,
	'BIII': 3,
	'BIV': 4,
	'BV': 6,
	'BVI': 8,
	'BVII': 10
};

const romanNumeralNames = {
	'I': 'Tonic',
	'II': 'Supertonic',
	'III': 'Mediant',
	'IV': 'Subdominant',
	'V': 'Dominant',
	'VI': 'Submediant',
	'VII': 'Leading Tone'
};


// These are separated so we can so one way gives us more flats and the other more sharps,
// e.g. F# in the fifths vs Gb in the fourths.
const circleOfFourths = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "B", "E", "A", "D", "G"];
const circleOfFifths = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];

const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];


const chords = [
	'C', 'Cm', 'C#', 'C#m', 'Db', 'Dbm', 'D', 'Dm', 'D#', 'D#m', 'Eb', 'Ebm', 
	'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'Gb', 'Gbm', 'G', 'Gm', 'G#', 'G#m', 
	'Ab', 'Abm', 'A', 'Am', 'A#', 'A#m', 'Bb', 'Bbm', 'B', 'Bm'
];

const chordStructures = {
	'': [0, 4, 7],       // Major
	'm': [0, 3, 7],     // Minor
	'dim': [0, 3, 6],
	'aug': [0, 4, 8],

	'6': [0, 4, 7, 9],
	'm6': [0, 3, 7, 9],

	'7': [0, 4, 7, 10],
	'm7': [0, 3, 7, 10],
	'M7': [0, 4, 7, 11],
	'mM7': [0, 3, 7, 11],
	'dim7': [0, 3, 6, 9],
	'm7b5': [0, 3, 6, 10],  
	'aug7': [0, 4, 8, 10],
	'augM7': [0, 4, 8, 11],

	'9': [0, 4, 7, 10, 14],
	'm9': [0, 3, 7, 10, 14],
	'M9': [0, 4, 7, 11, 14],

	'11': [0, 4, 7, 10, 14],
	'm11': [0, 3, 7, 10, 14, 17],
	'M11': [0, 4, 7, 11, 14],

	'13': [0, 4, 7, 10, 14, 21],
	'm13': [0, 3, 7, 10, 14, 17, 21],
	'M13': [0, 4, 7, 11, 14, 21],

	'7b9': [0, 4, 7, 10, 13],
	'7#9': [0, 4, 7, 10, 15],
	'7#11': [0, 4, 7, 10, 18],
};


const chordStructureNames = {
	'': [''],
	'm': ['m', 'mi', 'min', '-'],
	'dim': ['dim', 'o', 'º'],
	'aug': ['aug', '+'],

	'6': ['6'],
	'm6': ['m6', 'mi6', 'min6', '-6'],

	'7': ['7'],
	'm7': ['m7', 'mi7', 'min7', '-7'],
	'M7': [ 'M7', 'ma7', 'maj7', '△7', '△'],
	'mM7': ['mM7', 'm maj7', '-△7', '-△'],
	'dim7': ['dim7', 'o7', 'º7'],
	'm7b5': ['m7b5', '-7b5', 'ø', 'ø7'],
	'aug7': ['7#5', '+7', 'aug7', ],
	'augM7': ['M7#5', '+M7', 'augM7', ],

	'9': ['9'],
	'm9': ['m9', 'min9', '-9'],
	'M9': ['M9', 'maj9', '△9'],

	'11': ['11'],
	'm11': ['m11', 'min11', '-11'],
	'M11': ['M11', 'maj11', '△11'],

	'13': ['13'],
	'm13': ['m13', 'min13', '-13'],
	'M13': ['M13', 'maj13', '△13'],

	'7b9': ['7b9'],
	'7#9': ['7#9'],
	'7#11': ['7#11'],
};


function isIntervalChord(chord) {
	return chord.match(/^(#|b)?[iIvV]{1,3}(o|\+)?(7|9|11|13)?$/);
}


function isNamedChord(chord) {
	return chord.match(/^[A-G](#|b)?/);
}


let currentChordName = '';
let currentChordNotes = [];
let activeNotes = [];
let activeKeys = [];
let isIncorrect = false;

let currentProgression = [];
let currentIndex = 0;
let keyIndex = 0;
let keys = [];

const chordDisplay = document.getElementById("chordDisplay");
const chordCountCorrect = document.getElementById("chordCountCorrect");
const progCountCorrect = document.getElementById("progCountCorrect");
const degreeCountCorrect = document.getElementById("degreeCountCorrect");
const chordCountIncorrect = document.getElementById("chordCountIncorrect");
const progCountIncorrect = document.getElementById("progCountIncorrect");
const degreeCountIncorrect = document.getElementById("degreeCountIncorrect");
let highlightTimer; 


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
	// Grab the selected chord types
	let selectedChordTypes = [];
	if (document.getElementById('majorChord').checked) selectedChordTypes.push('');
	if (document.getElementById('minorChord').checked) selectedChordTypes.push('m');
	if (document.getElementById('augmentedChord').checked) selectedChordTypes.push('aug');
	if (document.getElementById('diminishedChord').checked) selectedChordTypes.push('dim');

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

	// 'Random' root may actually be circle of fourths/fifths, and is generated in the nextKey function
	let randomRoot = keys[keyIndex];
	let randomChordType = selectedChordTypes[Math.floor(Math.random() * selectedChordTypes.length)];

	currentChordNotes = generateNotesFromChordName(randomRoot + randomChordType);
	setChordName(randomRoot, randomChordType);
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
		displayChord();
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

	// Check for MIDI message type to determine if the key is pressed or released.
	if (pressedNotes[0] === 144 && velocity > 0) {
		handleKeyPressed(pressedNotes[1]);
	} else if (pressedNotes[0] === 128 || (pressedNotes[0] === 144 && velocity === 0)) {
		handleKeyReleased(pressedNotes[1]);
	}

	checkChord();
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
		console.log(`Listening to MIDI input: ${input.name}`);
		input.onmidimessage = handleMidiMessage;
	});
}


function onMIDIFailure(error)
{
	document.getElementById("midiStatusText").textContent = "Failed to get MIDI access. Error: " + error;
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

function nextChord()
{
	if (modeIsProgressions() || modeIsDegrees()) {
		currentIndex++;

		if (currentIndex >= currentProgression.length) {
			if (modeIsProgressions()) {
				if (isIncorrect) {
					progCountIncorrect.textContent = parseInt(progCountIncorrect.textContent) + 1;
				} else {
					progCountCorrect.textContent = parseInt(progCountCorrect.textContent) + 1;
				}

				isIncorrect = false;
			}
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

		displayProgression();
	} else {
		nextKey();
		setRandomChord();
	}

	displayChord();
}

function displayChord()
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
	let bareDegree = degree.match(/[biIvV]{1,4}/)[0];

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

	// Get minor status, by checking for lower case
	let minor = bareDegree === bareDegree.toLowerCase();

	// Convert the degree to a number using romanNumerals
	let degreeValue = romanNumerals[bareDegree.toUpperCase()];

	// Then add the interval to get the new degree
	let noteValue = (keyValue + degreeValue) % 12;

	// Later fix this to handle key signatures with flats
	if( keys[keyIndex] === 'F' || keys[keyIndex] === 'Bb' || keys[keyIndex] === 'Eb' || keys[keyIndex] === 'Ab' || keys[keyIndex] === 'Db' || keys[keyIndex] === 'Gb' ) {
		var valuesToNotes = valuesToNotesFlat;
	} else {
		var valuesToNotes = valuesToNotesSharp;
	}

	const degreeChordRoot = valuesToNotes[noteValue];

	if (diminished) {
		currentChordNotes = generateNotesFromChordName(degreeChordRoot + 'dim');
		setChordName(degreeChordRoot, 'dim');
	} else if (augmented) {
		currentChordNotes = generateNotesFromChordName(degreeChordRoot + 'aug');
		setChordName(degreeChordRoot, 'aug');
	} else if (minor) {
		currentChordNotes = generateNotesFromChordName(degreeChordRoot + 'm');
		setChordName(degreeChordRoot, 'm');
	} else {
		currentChordNotes = generateNotesFromChordName(degreeChordRoot);
		setChordName(degreeChordRoot, '');
	}
}


function generateProgression()
{
	currentKeySpan.textContent = keys[keyIndex];

	currentIndex = 0;

	if (progressionSelect.value === "custom") {
		currentProgression = document.getElementById('customProgression').value.split('-');
	} else if (progressionSelect.value === "random") {
		// Get count from randomProgression input
		let count = document.getElementById('randomProgression').value;

		// Select that many scale degrees from the roman numeral list
		currentProgression = [];
		for (let i = 0; i < count; i++) {
			currentProgression.push(Object.keys(romanNumerals)[Math.floor(Math.random() * Object.keys(romanNumerals).length)]);
		}
	} else {
		currentProgression = progressionSelect.value.split('-');
	}

	displayProgression();
}

function displayProgression() {
	currentKeySpan.textContent = keys[keyIndex];
	progressionDisplay.innerHTML = currentProgression.map(chord => `<span class="chord">${chord}</span>`).join(' - ');

	// Add event listeners to chords to track user input
	document.querySelectorAll('.chord').forEach((chordSpan, index) => {
		if (currentIndex == index) {
			chordSpan.style.color = "#0077ff";
		} else if (currentIndex > index) {
			chordSpan.style.color = "green";
		}
	});
}

// Initialize MIDI access
if( navigator.requestMIDIAccess )
	navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
else
	document.getElementById("midiStatusText").textContent = "Your browser does not support MIDI access. Please ensure you are using a browser that supports WebMIDI, and that you are accessing this site from HTTPS, as some browsers require secure connections for WebMIDI."

const hideProgressionChordNamesCheckbox = document.getElementById('hideProgressionChordNames');
const progressionOptionsDiv = document.getElementById('progressionOptions');
const progressionSelect = document.getElementById('progressionSelect');
const flowSelect = document.getElementById('flowSelect');
const currentKeySpan = document.getElementById('currentKey');
const progressionDisplay = document.getElementById('progressionDisplay');


hideProgressionChordNamesCheckbox.addEventListener('change', function() {
	if ( !document.getElementById("hideProgressionChordNames").checked )
		document.getElementById("chordDisplay").style.display = "block";
	else
		document.getElementById("chordDisplay").style.display = "none";
});

function nextProgression()
{
	// This will cause the progression to start at the beginning of the
	// next one
	currentIndex = currentProgression.length;
	nextChord();
	generateProgression();
}

flowSelect.addEventListener('change', generateProgression);

// Set initial chord
updateAvailableKeys();
nextKey();
setRandomChord();
highlightCorrectKeys();
displayChord();
modeChange();

