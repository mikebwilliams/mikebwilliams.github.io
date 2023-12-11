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

function modeIsDegrees() {
	return document.querySelector('input[name="mode"]:checked').value === "tabDegrees";
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
	const triads = ["majorChord", "minorChord", "augmentedChord", "diminishedChord"];
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
		"majorChord", "augmentedChord", "sixthChord", 
		"seventhChord", "majorSeventhChord", "augmentedSeventhChord", 
		"augmentedMajorSeventhChord"
	];
	majors.forEach(id => document.getElementById(id).checked = state);
};

const toggleMinorChords = (state) => {
	const minors = [
		"minorChord", "diminishedChord", "minorSixthChord", 
		"minorSeventhChord", "minorMajorSeventhChord", 
		"halfDiminishedSeventhChord", "diminishedSeventhChord"
	];
	minors.forEach(id => document.getElementById(id).checked = state);
};

function modeChange()
{
	// Three options: chords, progressions, and scale degrees
	if (modeIsDegrees()) {
		// Show the scale degree options
		document.getElementById("degreesOptions").style.display = "block";
		document.getElementById("chordOptions").style.display = "none";
		document.getElementById("progressionOptions").style.display = "block";

		document.getElementById("chordDisplay").style.display = "none";
		document.getElementById("progDisplay").style.display = "block";
	} else if (modeIsChords()) {
		// Show the chord options
		document.getElementById("degreesOptions").style.display = "none";
		document.getElementById("chordOptions").style.display = "block";
		document.getElementById("progressionOptions").style.display = "none";

		document.getElementById("chordDisplay").style.display = "block";
		document.getElementById("progDisplay").style.display = "none";
	} else if (modeIsProgressions()) {
		// Show the progression options
		document.getElementById("degreesOptions").style.display = "none";
		document.getElementById("chordOptions").style.display = "none";
		document.getElementById("progressionOptions").style.display = "block";

		document.getElementById("progDisplay").style.display = "block";
		if ( !document.getElementById("hideProgressionChordNames").checked )
			document.getElementById("chordDisplay").style.display = "block";
		else
			document.getElementById("chordDisplay").style.display = "none";
	}

	nextProgression();
}

// Attach the handlers
document.getElementById("progressionNext").addEventListener("click", () => nextProgression());
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
