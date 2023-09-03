const noteValues = {
    'C': 0,
    'C♯': 1, 'D♭': 1,
    'D': 2,
    'D♯': 3, 'E♭': 3,
    'E': 4,
    'F': 5,
    'F♯': 6, 'G♭': 6,
    'G': 7,
    'G♯': 8, 'A♭': 8,
    'A': 9,
    'A♯': 10, 'B♭': 10,
    'B': 11
};


const chords = [
    'C', 'Cm', 'C♯', 'C♯m', 'D♭', 'D♭m', 'D', 'Dm', 'D♯', 'D♯m', 'E♭', 'E♭m', 
    'E', 'Em', 'F', 'Fm', 'F♯', 'F♯m', 'G♭', 'G♭m', 'G', 'Gm', 'G♯', 'G♯m', 
    'A♭', 'A♭m', 'A', 'Am', 'A♯', 'A♯m', 'B♭', 'B♭m', 'B', 'Bm'
];


const chordToNotes = {
	'C': [0, 4, 7],
	'Cm': [0, 3, 7],
	'C♯': [1, 5, 8], 
	'C♯m': [1, 4, 8], 
	'D♭': [1, 5, 8], // Same as C♯
	'D♭m': [1, 4, 8], 
	'D': [2, 6, 9],
	'Dm': [2, 5, 9],
	'D♯': [3, 7, 10],
	'D♯m': [3, 6, 10],
	'E♭': [3, 7, 10], // Same as D♯
	'E♭m': [3, 6, 10],
	'E': [4, 8, 11],
	'Em': [4, 7, 11],
	'F': [5, 9, 0],
	'Fm': [5, 8, 0],
	'F♯': [6, 10, 1],
	'F♯m': [6, 9, 1],
	'G♭': [6, 10, 1], // Same as F♯
	'G♭m': [6, 9, 1],
	'G': [7, 11, 2],
	'Gm': [7, 10, 2],
	'G♯': [8, 0, 3],
	'G♯m': [8, 11, 3],
	'A♭': [8, 0, 3], // Same as G♯
	'A♭m': [8, 11, 3],
	'A': [9, 1, 4],
	'Am': [9, 0, 4],
	'A♯': [10, 2, 5],
	'A♯m': [10, 1, 5],
	'B♭': [10, 2, 5], // Same as A♯
	'B♭m': [10, 1, 5],
	'B': [11, 3, 6],
	'Bm': [11, 2, 6]
};

let lastChord = '';
let currentChordNotes = [];
let activeNotes = [];
const chordDisplay = document.getElementById("chordDisplay");


function getRandomChord() {
    let chordBase = chords[Math.floor(Math.random() * chords.length)];
    let seventh = Math.random() < 0.5 ? '7' : '';
    
    // Ensure the new chord isn't the same as the last
    while (`${chordBase}${seventh}` === lastChord) {
        chordBase = chords[Math.floor(Math.random() * chords.length)];
        seventh = Math.random() < 0.5 ? '7' : '';
    }
    
    lastChord = `${chordBase}${seventh}`;

    let selectedChord = chordBase + seventh;
    currentChordNotes = [...chordToNotes[chordBase]];  // Use a copy of the array
    
    // If the chord includes a 7th, calculate the 7th note and add it
    if (seventh === '7') {
        let seventhNote = (currentChordNotes[0] + 10) % 12;  // Normalize to 0-11 range
        currentChordNotes.push(seventhNote);
    }

    return selectedChord;
}

let highlightTimer;  // Store the current timer reference

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
        chordDisplay.textContent = getRandomChord();
        clearTimeout(highlightTimer);
        highlightCorrectKeys();
    }
}


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

// Initialize MIDI access
navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

// Set initial chord
chordDisplay.textContent = getRandomChord();
highlightCorrectKeys();
