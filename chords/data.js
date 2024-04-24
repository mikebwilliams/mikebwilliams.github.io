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
