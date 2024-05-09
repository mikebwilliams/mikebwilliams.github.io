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
	'BVII': 10,
	// Same as flats, but with sharps '#'
	'I#': 1,
	'II#': 3,
	'III#': 5,
	'IV#': 6,
	'V#': 8,
	'VI#': 10,
	'VII#': 0
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

	'sus2': [0, 2, 7],
	'sus4': [0, 5, 7],

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

	'sus2': ['sus2'],
	'sus4': ['sus', 'sus4'],

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


const jazzCadences = [
{ name: "Amen", chords: ['IVΔ', 'IΔ'], enabled: false },
{ name: "Autumnal", chords: ['ii', 'V7', 'viiø', 'III7', 'viΔ'], enabled: false },
{ name: "Body & Soul", chords: ['ii', 'VI7', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Dizzy", chords: ['bvi', 'bII7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Dogleg", chords: ['vi', 'ii7', 'ii', 'V7', 'IΔ'], enabled: false },
{ name: "Dropback", chords: ['ii', 'V7', 'IΔ', 'VI7', 'ii', 'V7', 'IΔ'], enabled: false },
{ name: "Extended", chords: ['vi', 'ii', 'V7', 'IΔ'], enabled: false },
{ name: "Happenstance", chords: ['#iv', 'VII7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Long", chords: ['iii', 'VI7', 'ii', 'V7', 'IΔ'], enabled: false },
{ name: "Overrun", chords: ['ii', 'V7', 'IΔ', 'IVΔ'], enabled: false },
{ name: "Moment’s", chords: ['#i', '#IV7', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Night & Day", chords: ['bVIΔ', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Nobody’s", chords: ['IΔ', 'III7', 'viΔ'], enabled: false },
{ name: "Nowhere", chords: ['bVI7', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Pullback", chords: ['ii', 'V7', 'iii', 'VI7', 'ii', 'V7', 'IΔ'], enabled: false },
{ name: "Rainbow", chords: ['IΔ', 'III7', 'IVΔ', 'IVΔ'], enabled: false },
{ name: "Rainy", chords: ['iii', 'bIIIø', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Satin", chords: ['vi', 'ii7', 'bvi', 'bII7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Spring", chords: ['VIIø', 'III7', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Stablemates", chords: ['biii', 'bVI7', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Starlight", chords: ['#IVø', 'VII7', 'iii', 'VI7', 'ii', 'V7', 'IΔ'], enabled: false },
{ name: "Starlight N&D Variant", chords: ['#IVø', 'vi', 'biiio', 'VI7', 'ii', 'V7', 'IΔ'], enabled: false },
{ name: "Regular", chords: ['ii', 'V7', 'IΔ'], enabled: false },
{ name: "Regular (minor)", chords: ['iiø', 'V7+9', 'IΔ', 'IΔ'], enabled: false },
{ name: "Tension Ending", chords: ['ii', 'V7', 'I7', 'I7'], enabled: false },
{ name: "Tritone Substitution", chords: ['ii', 'bII7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Two-Goes", chords: ['ii', 'V7', 'ii', 'V7', 'IΔ'], enabled: false },
{ name: "Yardbird", chords: ['iv', 'bVII7', 'IΔ', 'IΔ'], enabled: false },
// Turnarounds
{ name: "Foggy", chords: ['IΔ', 'bIII7', 'ii', 'V7'], enabled: false },
{ name: "II ’n’ Back", chords: ['ii', '#iio', 'iii'], enabled: false },
{ name: "Ladybird", chords: ['IΔ', 'bIII7', 'bVIΔ', 'bII7'], enabled: false },
{ name: "Nowhere (turnaround)", chords: ['IΔ', 'VI7', 'bVI7', 'V7'], enabled: false },
{ name: "Pennies", chords: ['IΔ', 'ii', 'iii', 'bIIIø', 'ii', 'V7'], enabled: false },
{ name: "POT", chords: ['IΔ', 'VI7', 'ii', 'V7'], enabled: false },
{ name: "POT (minor)", chords: ['iΔ', 'viø', 'iiø', 'V7+9'], enabled: false },
{ name: "Rhythm", chords: ['IΔ', 'bIIo', 'ii', 'bIIIo'], enabled: false },
{ name: "SPOT", chords: ['iii', 'VI7', 'ii', 'V7'], enabled: false },
{ name: "To IV 'n' Back", chords: ['IΔ', 'I7', 'IVΔ', '#IVo', 'IΔ'], enabled: false },
{ name: "To IV 'n' Hack", chords: ['IΔ', 'I7', 'IVΔ', 'VII7', 'IΔ'], enabled: false },
{ name: "To IV 'n' Mack", chords: ['IΔ', 'I7', 'IVΔ', 'ivΔ', 'IΔ'], enabled: false },
{ name: "To IV 'n' Yak", chords: ['IΔ', 'I7', 'IVΔ', 'bVII7', 'IΔ'], enabled: false },
{ name: "Whoopee", chords: ['IΔ', 'bIIo', 'ii', 'V7'], enabled: false },
// Metabricks
{ name: "Autumn Leaves Opening", chords: ['ii', 'V7', 'IΔ', 'IVΔ', 'viiø', 'III7', 'viΔ', 'VI7'], enabled: false },
{ name: "Four-Star Ending", chords: ['IVΔ', '#iv', 'VII7', 'iii', 'VI7', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Honeysuckle Bridge", chords: ['v', 'I7', 'IVΔ', 'IVΔ', 'vi', 'II7', 'ii', 'V7'], enabled: false },
{ name: "ITCHY Opening", chords: ['IΔ', 'iii', 'VI7', 'ii', '#iv', 'VII7'], enabled: false },
{ name: "On-Off(any dom7)-On + Dropback", chords: ['IΔ', 'III7', 'IΔ', 'VI7'], enabled: false },
{ name: "Pennies Ending", chords: ['IVΔ', '#ivo', 'IΔ', 'iii', 'VI7', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Rhythm Bridge", chords: ['vii', 'III7', 'iii', 'VI7', 'iv', 'II7', 'ii', 'V7'], enabled: false },
{ name: "Sharp Fourpenny Ending", chords: ['#ivø', 'iv', 'bVII7', 'IΔ', 'iii', 'VI7', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "Sixpenny Ending", chords: ['vi', 'iv', 'bVII7', 'IΔ', 'iii', 'VI7', 'ii', 'V7', 'IΔ', 'IΔ'], enabled: false },
{ name: "To IV ’n’ Bird SPOT", chords: ['IΔ', 'I7', 'IVΔ', 'bVII7', 'iii', 'VI7', 'ii', 'V7'], enabled: false },
{ name: "Twopenny Ending", chords: ['ii', 'iv', 'bVII7', 'IΔ', 'iii', 'VI7', 'ii', 'V7', 'IΔ'], enabled: false },
// Miscellaneous
{ name: "Chromatic Dropback", chords: ['IΔ', 'VII7', 'bVII7', 'VI7', 'ii'], enabled: false },
{ name: "Dogleg", chords: ['ii', 'V7', 'v', 'I7', 'i'], enabled: false },
{ name: "Dropback", chords: ['IΔ', 'VI7', 'ii'], enabled: false },
{ name: "Raindrop", chords: ['iii', 'bIIIo', 'ii'], enabled: false },
{ name: "Starlight Dropback", chords: ['#iv', 'VII7', 'iii', 'VI7', 'ii'], enabled: false },
{ name: "TINGLe Dropback", chords: ['IΔ', 'IV7', 'bVII7', 'VI7', 'ii'], enabled: false },
{ name: "TTFA Dropback", chords: ['IΔ', 'IV7', 'iii', 'VI7', 'ii'], enabled: false }
];

const jazzCadencesCommon = [
	"POT", "SPOT",
	"Nowhere (turnaround)",
	"Dropback", "Pullback", "TTFA Dropback",
	"Regular", "Two-Goes", "Long", "Overrun", "Yardbird", "Starlight", "Rainy"
];
