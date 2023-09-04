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


const chords = [
	'C', 'Cm', 'C#', 'C#m', 'Db', 'Dbm', 'D', 'Dm', 'D#', 'D#m', 'Eb', 'Ebm', 
	'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'Gb', 'Gbm', 'G', 'Gm', 'G#', 'G#m', 
	'Ab', 'Abm', 'A', 'Am', 'A#', 'A#m', 'Bb', 'Bbm', 'B', 'Bm'
];

const chordStructures = {
	'': [0, 4, 7],       // Major
	'm': [0, 3, 7],     // Minor

	'maj7': [0, 4, 7, 11],
	'6': [0, 4, 7, 9],
	'maj9': [0, 4, 7, 11, 14],  // You can reduce these numbers mod 12 if you prefer
	'maj13': [0, 4, 7, 11, 14, 21],

	'm6': [0, 3, 7, 9],
	'm7': [0, 3, 7, 10],
	'm9': [0, 3, 7, 10, 14],
	'm11': [0, 3, 7, 10, 14, 17],
	'm13': [0, 3, 7, 10, 14, 17, 21],

	'7': [0, 4, 7, 10],
	'M7': [0, 4, 7, 11],
	'9': [0, 4, 7, 10, 14],
	'13': [0, 4, 7, 10, 14, 21],
	'7b9': [0, 4, 7, 10, 13],
	'7#9': [0, 4, 7, 10, 15],
	'7#11': [0, 4, 7, 10, 18],

	'dim': [0, 3, 6],
	'°7': [0, 3, 6, 9],  // Alternative to dim7
	'aug': [0, 4, 8],
	'7#5': [0, 4, 8, 10],  // Alternative to 7+5
};

let lastChord = '';
let currentChordNotes = [];
let activeNotes = [];
const chordDisplay = document.getElementById("chordDisplay");


function generateNotesFromChordName(chordName) {
	let rootNotePattern = /^[A-G](#|b)?/; // Matches the root note
	let rootNoteName = chordName.match(rootNotePattern)[0];

	let rootValue = noteValues[rootNoteName];

	let chordType = chordName.replace(rootNotePattern, ''); // Get everything after the root note

	if (!chordStructures[chordType]) {
		console.error("Unknown chord type:", chordType);
		return [];
	}

	return chordStructures[chordType].map(interval => (rootValue + interval) % 12);
}


function getRandomChord() {
	let selectedRoots = Object.keys(noteValues).filter(root => document.getElementById(root).checked);

	// Grab the selected chord types
	let selectedChordTypes = [];
	if (document.getElementById('majorChord').checked) selectedChordTypes.push('');
	if (document.getElementById('minorChord').checked) selectedChordTypes.push('m');
	if (document.getElementById('seventhChord').checked) selectedChordTypes.push('7');
	if (document.getElementById('minorSeventhChord').checked) selectedChordTypes.push('m7');
	if (document.getElementById('sixthChord').checked) selectedChordTypes.push('6');

	if (selectedRoots.length === 0 || selectedChordTypes.length === 0) {
		alert("Please select at least one root key and one chord type!");
		return null;
	}

	let randomRoot = selectedRoots[Math.floor(Math.random() * selectedRoots.length)];
	let randomChordType = selectedChordTypes[Math.floor(Math.random() * selectedChordTypes.length)];

	currentChordNotes = generateNotesFromChordName(randomRoot + randomChordType);

	return randomRoot + randomChordType;
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
			keyElement.classList.remove('active', 'correct', 'incorrect');
			let index = activeNotes.indexOf(note);
			if (index > -1) {
				activeNotes.splice(index, 1);  // Remove note from active list
			}
		}

	if (currentChordNotes.every(chordNote => activeNotes.includes(chordNote))) {
		nextRandomChord();
		clearTimeout(highlightTimer);
		highlightCorrectKeys();
	}
}


let highlightTimer;  // Store the current timer reference

function highlightCorrectKeys() {
	// Clear previous highlights
	document.querySelectorAll('.key.highlight').forEach(key => key.classList.remove('highlight'));

	highlightTimer = setTimeout(() => {
		currentChordNotes.forEach(note => {
			let keyElement = document.querySelector(`.key[data-note="${note}"]`);
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

function nextRandomChord() {
	text = getRandomChord();
	// Turn # and b into sharp and flat symbols
	text = text.replace(/#/g, '♯');
	text = text.replace(/b/g, '♭');
	chordDisplay.textContent = text;
}

// Initialize MIDI access
navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

// Set initial chord
nextRandomChord();
highlightCorrectKeys();


document.getElementById('whiteKeys').addEventListener('click', () => {
    ['C', 'D', 'E', 'F', 'G', 'A', 'B'].forEach(key => {
        document.getElementById(key).checked = true;
    });
    ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb'].forEach(key => {
        document.getElementById(key).checked = false;
    });
});

document.getElementById('blackKeys').addEventListener('click', () => {
    ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb'].forEach(key => {
        document.getElementById(key).checked = true;
    });
    ['C', 'D', 'E', 'F', 'G', 'A', 'B'].forEach(key => {
        document.getElementById(key).checked = false;
    });
});

document.getElementById('sharpKeys').addEventListener('click', () => {
    ['C#', 'D#', 'F#', 'G#', 'A#'].forEach(key => {
        document.getElementById(key).checked = true;
    });
    ['Db', 'Eb', 'Gb', 'Ab', 'Bb'].forEach(key => {
        document.getElementById(key).checked = false;
    });
});

document.getElementById('flatKeys').addEventListener('click', () => {
    ['Db', 'Eb', 'Gb', 'Ab', 'Bb'].forEach(key => {
        document.getElementById(key).checked = true;
    });
    ['C#', 'D#', 'F#', 'G#', 'A#'].forEach(key => {
        document.getElementById(key).checked = false;
    });
});

document.getElementById('noKeys').addEventListener('click', () => {
    ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'].forEach(key => {
        document.getElementById(key).checked = false;
    });
});

document.getElementById('allKeys').addEventListener('click', () => {
    ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'].forEach(key => {
        document.getElementById(key).checked = true;
    });
});

