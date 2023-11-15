const noteValues = {
	'C': 0,
	'C#': 1, 'Db': 1,
	'D': 2,
	'D#': 3, 'Eb': 3,
	'E': 4,
	'F': 5,
	'F#': 6, 'Gb': 6,
	'G': 7,
	'G#': 8, 'Ab': 8,
	'A': 9,
	'A#': 10, 'Bb': 10,
	'B': 11
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
	'VII': 11
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

let currentProgression = [];
let currentIndex = 0;
let keyIndex = 0;
let keys = [];

const chordDisplay = document.getElementById("chordDisplay");
const chordCount = document.getElementById("chordCount");
const progCount = document.getElementById("progCount");
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
	let selectedRoots = Object.keys(noteValues).filter(root => document.getElementById(root).checked);

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

	if (selectedRoots.length === 0 || selectedChordTypes.length === 0) {
		alert("Please select at least one root key and one chord type!");
		return null;
	}

	let randomRoot = selectedRoots[Math.floor(Math.random() * selectedRoots.length)];
	let randomChordType = selectedChordTypes[Math.floor(Math.random() * selectedChordTypes.length)];

	currentChordNotes = generateNotesFromChordName(randomRoot + randomChordType);
	setChordName(randomRoot, randomChordType);
}


function checkChord(midiMessage) {
	let pressedNotes = midiMessage.data;
	let note = pressedNotes[1] % 12; // Normalize note to range 0-11
	let velocity = pressedNotes[2];

	let keyElement = document.querySelector(`.key[data-note="${pressedNotes[1]}"]`);

	// Check for MIDI message type to determine if the key is pressed or released.
	if (pressedNotes[0] === 144 && velocity > 0) {
		if (currentChordNotes.includes(note)) {
			keyElement.classList.remove('highlight');
			keyElement.classList.add('correct');
			activeNotes.push(note);  // Add note to active list
		} else {
			keyElement.classList.add('incorrect');
		}
	} else if (pressedNotes[0] === 128 || (pressedNotes[0] === 144 && velocity === 0)) {
		keyElement.classList.remove('correct', 'incorrect');
		let index = activeNotes.indexOf(note);
		if (index > -1) {
			activeNotes.splice(index, 1);  // Remove note from active list
		}
	}

	if (currentChordNotes.every(chordNote => activeNotes.includes(chordNote))) {
		chordCount.textContent = parseInt(chordCount.textContent) + 1;
		nextChord();
		clearTimeout(highlightTimer);
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


function onMIDISuccess(midiAccess) {
	// If there are no inputs, notify the user.
		if (!midiAccess.inputs.size) {
			console.error("No MIDI inputs detected. Please connect a MIDI device.");
			return;
		}

	// Attach a listener for 'midimessage' events to all input devices
	const inputs = Array.from(midiAccess.inputs.values());
	inputs.forEach(input => {
		console.log(`Listening to MIDI input: ${input.name}`);
		input.onmidimessage = checkChord;
	});
}


function onMIDIFailure(error) {
	console.error("Failed to get MIDI access:", error);
	// You could also notify the user with a user-friendly message here.
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
	let progression = enableChordProgressionsCheckbox.checked;

	if (progression) {
		currentIndex++;

		if (currentIndex >= currentProgression.length) {
			progCount.textContent = parseInt(progCount.textContent) + 1;
			nextKey();
			generateProgression();
			currentIndex = 0;
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

	let progression = enableChordProgressionsCheckbox.checked;
	let hideChords = progression && hideProgressionChordNamesCheckbox.checked;

	// If the progression chord is hidden, hide the chord name
	// and give it a tooltip with the chord name
	if (hideChords) {
		chordDisplay.textContent = "Hidden"
		chordDisplay.title = text;
	}
	else {
		chordDisplay.textContent = text;
		chordDisplay.title = '';
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
	let bareDegree = degree.match(/[iIvV]{1,3}/)[0];

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

	currentIndex = -1;
	if (progressionSelect.value === "custom") {
		currentProgression = document.getElementById('customProgression').value.split('-');
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
			chordSpan.style.color = "blue";
		} else if (currentIndex > index) {
			chordSpan.style.color = "green";
		}
	});
}

// Initialize MIDI access
navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

const enableChordProgressionsCheckbox = document.getElementById('enableChordProgressions');
const hideProgressionChordNamesCheckbox = document.getElementById('hideProgressionChordNames');
const progressionOptionsDiv = document.getElementById('progressionOptions');
const progressionSelect = document.getElementById('progressionSelect');
const flowSelect = document.getElementById('flowSelect');
const currentKeySpan = document.getElementById('currentKey').querySelector('span');
const progressionDisplay = document.getElementById('progressionDisplay');


enableChordProgressionsCheckbox.addEventListener('change', function() {
	progressionOptionsDiv.style.display = this.checked ? 'block' : 'none';
	if (this.checked) {
		nextProgression();
	}
});

hideProgressionChordNamesCheckbox.addEventListener('change', function() {
	displayChord();
});

function nextProgression()
{
	nextKey();
	generateProgression();
	nextChord();
}

flowSelect.addEventListener('change', generateProgression);

// Set initial chord
updateAvailableKeys();
nextKey();
setRandomChord();
highlightCorrectKeys();
displayChord();

