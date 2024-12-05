const hideProgressionChordNamesCheckbox = document.getElementById('hideProgressionChordNames');
const hideProgressionChordNumeralsCheckbox = document.getElementById('hideProgressionChordNumerals');
const progressionOptionsDiv = document.getElementById('progressionOptions');
const progressionSelect = document.getElementById('progressionSelect');
const flowSelect = document.getElementById('flowSelect');
const currentKeySpan = document.getElementById('currentKey');

const progressionDisplay = document.getElementById('progressionDisplay');
const cadenceDisplay = document.getElementById('cadenceDisplay');
const chordDisplay = document.getElementById("chordDisplay");

const chordCountCorrect = document.getElementById("chordCountCorrect");
const progCountCorrect = document.getElementById("progCountCorrect");
const scalesCountCorrect = document.getElementById("scalesCountCorrect");
const degreeCountCorrect = document.getElementById("degreeCountCorrect");
const brickCountCorrect = document.getElementById("brickCountCorrect");
const chordCountIncorrect = document.getElementById("chordCountIncorrect");
const progCountIncorrect = document.getElementById("progCountIncorrect");
const scalesCountIncorrect = document.getElementById("scalesCountIncorrect");
const degreeCountIncorrect = document.getElementById("degreeCountIncorrect");
const brickCountIncorrect = document.getElementById("brickCountIncorrect");

function noKeys() {
	allNotes.forEach(key => {
		document.getElementById(key).checked = false;
	});
}

function allKeys() {
	allNotes.forEach(key => {
		document.getElementById(key).checked = true;
	});
}

function normalKeys() {
	noKeys();

	normalNotes.forEach(key => {
		document.getElementById(key).checked = true;
	});
}

function flatKeys() {
	noKeys();

	allNotes.filter(key => key.endsWith('b')).forEach(key => {
		document.getElementById(key).checked = true;
	});
}

function sharpKeys() {
	noKeys();

	allNotes.filter(key => key.endsWith('#')).forEach(key => {
		document.getElementById(key).checked = true;
	});
}

function blackKeys() {
	noKeys();

	normalNotes.filter(key => key.endsWith('#') || key.endsWith('b')).forEach(key => {
		document.getElementById(key).checked = true;
	});
}

function whiteKeys() {
	noKeys();

	allNotes.filter(key => !key.endsWith('#') && !key.endsWith('b')).forEach(key => {
		document.getElementById(key).checked = true;
	});
}

function modeIsChords() {
	return document.querySelector('input[name="mode"]:checked').value === "tabChords";
}

function modeIsProgressions() {
	return document.querySelector('input[name="mode"]:checked').value === "tabProgressions";
}

function modeIsScales() {
	return document.querySelector('input[name="mode"]:checked').value === "tabScales";
}

function modeIsDegrees() {
	return document.querySelector('input[name="mode"]:checked').value === "tabDegrees";
}

function modeIsJazz() {
	return document.querySelector('input[name="mode"]:checked').value === "tabJazz";
}



document.getElementById('noKeys').addEventListener('click', noKeys);
document.getElementById('allKeys').addEventListener('click', allKeys);
document.getElementById('normalKeys').addEventListener('click', normalKeys);
document.getElementById('flatKeys').addEventListener('click', flatKeys);
document.getElementById('sharpKeys').addEventListener('click', sharpKeys);
document.getElementById('blackKeys').addEventListener('click', blackKeys);
document.getElementById('whiteKeys').addEventListener('click', whiteKeys);

// Handler functions for preset buttons

const toggleAllChords = (state) => {
	const checkboxes = document.querySelectorAll("#chordOptions input[type='checkbox']");
	checkboxes.forEach(chk => chk.checked = state);
};

const toggleTriadChords = (state) => {
	const triads = ["majorChord", "minorChord", "augmentedChord", "diminishedChord", "suspendedSecondChord", "suspendedFourthChord"];
	triads.forEach(id => document.getElementById(id).checked = state);
};

const toggleSixthChords = (state) => {
	const sixths = ["sixthChord", "minorSixthChord"];
	sixths.forEach(id => document.getElementById(id).checked = state);
};

const toggleSeventhChords = (state) => {
	const sevenths = [
		"seventhChord", "minorSeventhChord", "majorSeventhChord", 
		"minorMajorSeventhChord", "halfDiminishedSeventhChord", 
		"diminishedSeventhChord", "augmentedSeventhChord", 
		"augmentedMajorSeventhChord"
	];
	sevenths.forEach(id => document.getElementById(id).checked = state);
};

const toggleMajorChords = (state) => {
	const majors = [
		"majorChord", "augmentedChord", "suspendedFourthChord", "sixthChord",
		"seventhChord", "majorSeventhChord", "augmentedSeventhChord", 
		"augmentedMajorSeventhChord"
	];
	majors.forEach(id => document.getElementById(id).checked = state);
};

const toggleMinorChords = (state) => {
	const minors = [
		"minorChord", "diminishedChord", "suspendedSecondChord", "minorSixthChord",
		"minorSeventhChord", "minorMajorSeventhChord", 
		"halfDiminishedSeventhChord", "diminishedSeventhChord"
	];
	minors.forEach(id => document.getElementById(id).checked = state);
};

function modeChange()
{
	// Three options: chords, progressions, and scale degrees
	if (modeIsChords()) {
		// Show the chord options
		document.getElementById("chordOptions").style.display = "block";
		document.getElementById("progressionOptions").style.display = "none";
		document.getElementById("degreesOptions").style.display = "none";
		document.getElementById("scalesOptions").style.display = "none";
		document.getElementById("jazzOptions").style.display = "none";
	} else if (modeIsProgressions()) {
		// Show the progression options
		document.getElementById("chordOptions").style.display = "none";
		document.getElementById("progressionOptions").style.display = "block";
		document.getElementById("degreesOptions").style.display = "none";
		document.getElementById("scalesOptions").style.display = "none";
		document.getElementById("jazzOptions").style.display = "none";
	} else if (modeIsDegrees()) {
		// Show the scale degree options
		document.getElementById("chordOptions").style.display = "none";
		document.getElementById("progressionOptions").style.display = "block";
		document.getElementById("degreesOptions").style.display = "block";
		document.getElementById("scalesOptions").style.display = "none";
		document.getElementById("jazzOptions").style.display = "none";
	} else if (modeIsScales()) {
		document.getElementById("chordOptions").style.display = "none";
		document.getElementById("progressionOptions").style.display = "none";
		document.getElementById("degreesOptions").style.display = "none";
		document.getElementById("scalesOptions").style.display = "block";
		document.getElementById("jazzOptions").style.display = "none";
	} else if (modeIsJazz()) {
		document.getElementById("chordOptions").style.display = "none";
		document.getElementById("progressionOptions").style.display = "none";
		document.getElementById("degreesOptions").style.display = "none";
		document.getElementById("scalesOptions").style.display = "none";
		document.getElementById("jazzOptions").style.display = "block";
	}

	nextProgression();
}

// Attach the handlers
document.getElementById("skip").addEventListener("click", () => nextProgression());
document.getElementById("playAnswer").addEventListener("click", () => playAnswerNotes());

document.getElementById("progressionSelect").addEventListener('change', () => nextProgression());

document.getElementById("chordsOn").addEventListener("click", () => toggleAllChords(true));
document.getElementById("chordsOff").addEventListener("click", () => toggleAllChords(false));

document.getElementById("triadChordsOn").addEventListener("click", () => toggleTriadChords(true));
document.getElementById("triadChordsOff").addEventListener("click", () => toggleTriadChords(false));

document.getElementById("sixthChordsOn").addEventListener("click", () => toggleSixthChords(true));
document.getElementById("sixthChordsOff").addEventListener("click", () => toggleSixthChords(false));

document.getElementById("seventhChordsOn").addEventListener("click", () => toggleSeventhChords(true));
document.getElementById("seventhChordsOff").addEventListener("click", () => toggleSeventhChords(false));

document.getElementById("majorChordsOn").addEventListener("click", () => toggleMajorChords(true));
document.getElementById("majorChordsOff").addEventListener("click", () => toggleMajorChords(false));

document.getElementById("minorChordsOn").addEventListener("click", () => toggleMinorChords(true));
document.getElementById("minorChordsOff").addEventListener("click", () => toggleMinorChords(false));

document.querySelectorAll("input[name='mode']").forEach((input) => {
	input.addEventListener('change', modeChange);
});

// Get every div that has a data-note element form 48 to 70 and add a click handler
document.querySelectorAll("div[data-note]").forEach((div) => {
	div.addEventListener('click', () => {
		// Send the key from the data-note to the handleKeyClick function
		handleKeyClick(div.dataset.note);
	});
});

document.getElementById("showKeyboard").addEventListener('click', () => {
	// Show the keyboard if checked, otherwise hide
	if (document.getElementById("showKeyboard").checked)
		document.getElementById("piano").style.display = "block";
	else
		document.getElementById("piano").style.display = "none";
});


function generateScalesTable() {
    const container = document.getElementById("scalesSelected");

    let tableHtml = '<table><tr><td><label>Scales</label></td></tr>';

    for (let key in scales) {
        if (scales.hasOwnProperty(key)) {
            const isChecked = scales[key].enabled ? 'checked' : '';
            tableHtml += `<tr><td><label><input type="checkbox" id="${key}" ${isChecked}> ${scales[key].label}</label></td></tr>`;
        }
    }

    tableHtml += '</table>';
    container.innerHTML += tableHtml;
}


function toggleScales(category) {
    const selectedScales = scaleGroups[category];

    for (let key in scales) {
        if (scales.hasOwnProperty(key)) {
            const checkbox = document.getElementById(key);
            checkbox.checked = selectedScales.includes(key);
        }
    }
}


function generateScalesButtons() {
    const buttonContainer = document.getElementById("scalesButtons");

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
            const checkbox = document.getElementById(key);
            if (checkbox && checkbox.checked) {
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
            const checkbox = document.getElementById(key);
            if (checkbox && checkbox.checked) {
                enabledScaleDetails.push(scales[key]);
            }
        }
    }
    
    return enabledScaleDetails;
}


function initScales()
{
	generateScalesTable();
	generateScalesButtons();
}


function initJazzBricks() {
	const tbody = document.querySelector('#jazzBricks tbody');

	// Enable every jazzCadence in jazzCadencesBasic by default
	jazzCadencesBasic.forEach(cadence => { 
		const jazzCadence = jazzCadences.find(c => c.name === cadence);
		if (jazzCadence) jazzCadence.enabled = true;
	} );

	jazzCadences.forEach(cadence => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${cadence.name}</td>
			<td>${cadence.chords.join(' ')}</td>
			<td><input type="checkbox" ${cadence.enabled ? 'checked' : ''}></td>
			`;
		tbody.appendChild(tr);

		cadence.element = tr.querySelector('input[type="checkbox"]');

		// Event listener to handle changes in checkbox
		cadence.element.addEventListener('change', function() {
			cadence.enabled = this.checked;
			cadence.element = tr.querySelector('input[type="checkbox"]');
			console.log(`${cadence.name} enabled state is now ${cadence.enabled}`);
		});
	});
}

document.getElementById("btnJazzBricksNone").addEventListener('click', () => {
	jazzCadences.forEach(cadence => {
		cadence.enabled = false;
		cadence.element.checked = false;
	});
} );

document.getElementById("btnJazzBricksAll").addEventListener('click', () => {
	jazzCadences.forEach(cadence => {
		cadence.enabled = true;
		cadence.element.checked = true;
	});
} );

document.getElementById("btnJazzBricksBasic").addEventListener('click', () => {
	jazzCadences.forEach(cadence => {
		if (jazzCadencesBasic.includes(cadence.name)) {
			cadence.enabled = true;
			cadence.element.checked = true;
		} else {
			cadence.enabled = false;
			cadence.element.checked = false;
		}
	});
} );

document.getElementById("btnJazzBricksIntermediate").addEventListener('click', () => {
	jazzCadences.forEach(cadence => {
		if (jazzCadencesIntermediate.includes(cadence.name)) {
			cadence.enabled = true;
			cadence.element.checked = true;
		} else {
			cadence.enabled = false;
			cadence.element.checked = false;
		}
	});
} );

document.addEventListener('DOMContentLoaded', () => {
	initScales();
	initJazzBricks();
	initMIDI();
});
