

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
document.addEventListener("DOMContentLoaded", function() {

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

});

